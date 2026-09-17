"""
Flask Web Application for News Recommender System
MERN-compatible: CORS enabled, JWT auth + Google OAuth for React frontend
"""

import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=True)

from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from database import NewsDatabase
from database_integration import fetch_news_from_api, classify_news_articles, save_news_to_database
from user_interaction_helper import UserInteractionManager
import json
import sqlite3
import requests as http_requests
from datetime import datetime, timedelta

app = Flask(__name__)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow both local dev and production frontend
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.environ.get('FRONTEND_URL', ''),  # production frontend from env
]
# Filter empty strings
_allowed_origins = [o for o in _allowed_origins if o]

CORS(app, resources={r"/api/*": {"origins": _allowed_origins}},
     supports_credentials=True)

# ── Config ────────────────────────────────────────────────────────────────────
app.secret_key          = os.environ.get('SECRET_KEY',      'ns-secret-key-change-in-prod')
app.config["JWT_SECRET_KEY"]             = os.environ.get('JWT_SECRET_KEY', 'ns-jwt-secret-change-in-prod')
app.config["JWT_ACCESS_TOKEN_EXPIRES"]   = timedelta(days=7)

# Google OAuth — populated from env or placeholder until user adds credentials
GOOGLE_CLIENT_ID     = os.environ.get('GOOGLE_CLIENT_ID',     'YOUR_GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', 'YOUR_GOOGLE_CLIENT_SECRET')
GOOGLE_REDIRECT_URI  = os.environ.get('GOOGLE_REDIRECT_URI',  'http://localhost:5001/api/auth/google/callback')
FRONTEND_URL         = os.environ.get('FRONTEND_URL',         'http://localhost:5173')

# GitHub OAuth
GITHUB_CLIENT_ID     = os.environ.get('GITHUB_CLIENT_ID',     'YOUR_GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'YOUR_GITHUB_CLIENT_SECRET')
GITHUB_REDIRECT_URI  = os.environ.get('GITHUB_REDIRECT_URI',  'http://localhost:5001/api/auth/github/callback')

jwt = JWTManager(app)

DB_PATH    = os.path.join(os.path.dirname(__file__), "news_recommender.db")
API_KEY    = os.environ.get('GNEWS_API_KEY', "172285a1b5b6f981c517e59461b31a9a")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "ai_models/news_classifier_model.pkl")


# ── Health check ──────────────────────────────────────────────────────────────
@app.route('/')
@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'NewsSphere API'})


# ── DB initialise ─────────────────────────────────────────────────────────────
def init_user_db():
    try:
        conn = sqlite3.connect(DB_PATH, timeout=20.0)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id       TEXT PRIMARY KEY,
                username      TEXT UNIQUE NOT NULL,
                email         TEXT UNIQUE,
                password_hash TEXT,
                google_id     TEXT UNIQUE,
                avatar_url    TEXT,
                auth_provider TEXT DEFAULT 'local',
                created_at    TEXT NOT NULL,
                last_login    TEXT
            )
        """)
        # Migrate existing DB — add columns if missing
        existing = {row[1] for row in cursor.execute("PRAGMA table_info(users)")}
        for col, defn in [
            ('google_id',     'TEXT'),
            ('github_id',     'TEXT'),
            ('avatar_url',    'TEXT'),
            ('auth_provider', "TEXT DEFAULT 'local'"),
        ]:
            if col not in existing:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {defn}")
        conn.commit()
        conn.close()
        print("✅ User database initialised")
    except Exception as e:
        print(f"❌ DB init error: {e}")


def init_bookmarks_db():
    """Create bookmarks and collections tables."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=20.0)
        cursor = conn.cursor()

        # Collections (user-defined lists like "Read Later", "AI Research")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookmark_collections (
                collection_id TEXT PRIMARY KEY,
                user_id       TEXT NOT NULL,
                name          TEXT NOT NULL,
                icon          TEXT DEFAULT '📚',
                created_at    TEXT NOT NULL
            )
        """)

        # Bookmarks (article saved to a collection)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                bookmark_id   INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       TEXT NOT NULL,
                collection_id TEXT NOT NULL,
                news_id       TEXT NOT NULL,
                title         TEXT,
                description   TEXT,
                url           TEXT,
                image_url     TEXT,
                source_name   TEXT,
                published_at  TEXT,
                top_3_labels  TEXT DEFAULT '[]',
                saved_at      TEXT NOT NULL,
                UNIQUE(user_id, collection_id, news_id)
            )
        """)

        # Default "All Bookmarks" virtual — not stored; derived at query time
        # Seed a "Read Later" collection for every new user on first use (handled in endpoint)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bm_user ON bookmarks(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bm_col ON bookmarks(collection_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bm_col_user ON bookmark_collections(user_id)")

        conn.commit()
        conn.close()
        print("✅ Bookmarks DB initialised")
    except Exception as e:
        print(f"❌ Bookmarks DB init error: {e}")


init_user_db()
init_bookmarks_db()


# ── Auto-seed news on startup if DB is empty ─────────────────────────────────
def auto_seed_news():
    """Fetch a batch of news from GNews on first run if DB is empty."""
    try:
        db = NewsDatabase(DB_PATH)
        df = db.get_all_news_items(limit=1)
        db.close()
        if not df.empty:
            print("✅ News DB already has articles, skipping auto-seed")
            return
        print("📰 News DB is empty — auto-seeding from GNews API...")
        topics = ['technology', 'science', 'sports', 'finance', 'health']
        for topic in topics:
            try:
                df_topic = fetch_news_from_api(API_KEY, topic, max_results=10)
                if df_topic.empty:
                    continue
                df_topic = classify_news_articles(df_topic, MODEL_PATH)
                count = save_news_to_database(df_topic, DB_PATH)
                print(f"  ✅ Seeded {count} articles for '{topic}'")
            except Exception as e:
                print(f"  ⚠️  Seed failed for '{topic}': {e}")
    except Exception as e:
        print(f"⚠️  Auto-seed error: {e}")

auto_seed_news()


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH  ── /api/auth/*
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    email    = (data.get('email') or '').strip() or None
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    try:
        conn = sqlite3.connect(DB_PATH, timeout=20.0)
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username already taken'}), 409

        if email:
            cursor.execute("SELECT user_id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Email already registered'}), 409

        user_id = f"user_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        cursor.execute(
            "INSERT INTO users (user_id, username, email, password_hash, created_at) VALUES (?,?,?,?,?)",
            (user_id, username, email, generate_password_hash(password), datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        access_token = create_access_token(identity=user_id)
        return jsonify({
            'message': 'Registration successful',
            'token': access_token,
            'user': {'user_id': user_id, 'username': username, 'email': email}
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or data.get('email') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': 'Credentials required'}), 400

    try:
        conn = sqlite3.connect(DB_PATH, timeout=20.0)
        cursor = conn.cursor()

        # Allow login by username OR email
        cursor.execute(
            "SELECT user_id, username, password_hash, email FROM users WHERE username=? OR email=?",
            (username, username)
        )
        user = cursor.fetchone()

        if not user or not check_password_hash(user[2], password):
            conn.close()
            return jsonify({'error': 'Invalid credentials'}), 401

        cursor.execute("UPDATE users SET last_login=? WHERE user_id=?",
                       (datetime.now().isoformat(), user[0]))
        conn.commit()
        conn.close()

        access_token = create_access_token(identity=user[0])
        return jsonify({
            'token': access_token,
            'user': {'user_id': user[0], 'username': user[1], 'email': user[3]}
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def api_me():
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, email, avatar_url, auth_provider FROM users WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': {
        'user_id':       row[0],
        'username':      row[1],
        'email':         row[2],
        'avatar_url':    row[3],
        'auth_provider': row[4],
    }})


# ── Google OAuth ──────────────────────────────────────────────────────────────

@app.route('/api/auth/google', methods=['GET'])
def google_oauth_init():
    """Returns the Google OAuth URL for the frontend to redirect to."""
    if GOOGLE_CLIENT_ID == 'YOUR_GOOGLE_CLIENT_ID':
        return jsonify({'error': 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment.'}), 503

    import urllib.parse
    params = {
        'client_id':     GOOGLE_CLIENT_ID,
        'redirect_uri':  GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope':         'openid email profile',
        'access_type':   'offline',
        'prompt':        'select_account',
    }
    url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params)
    return jsonify({'url': url})


@app.route('/api/auth/google/callback', methods=['GET'])
def google_oauth_callback():
    """
    Google redirects here with ?code=...
    Exchange code → access_token → user info → create/login user → redirect to frontend.
    """
    code  = request.args.get('code')
    error = request.args.get('error')

    if error or not code:
        return redirect(f"{FRONTEND_URL}/login?error=google_denied")

    # 1. Exchange code for tokens
    try:
        token_resp = http_requests.post('https://oauth2.googleapis.com/token', data={
            'code':          code,
            'client_id':     GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri':  GOOGLE_REDIRECT_URI,
            'grant_type':    'authorization_code',
        }, timeout=10)
        token_resp.raise_for_status()
        tokens = token_resp.json()
    except Exception as e:
        print(f"Google token exchange error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=google_token_failed")

    # 2. Get user info
    try:
        userinfo_resp = http_requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f"Bearer {tokens['access_token']}"},
            timeout=10
        )
        userinfo_resp.raise_for_status()
        guser = userinfo_resp.json()
    except Exception as e:
        print(f"Google userinfo error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=google_userinfo_failed")

    google_id  = guser.get('id')
    email      = guser.get('email', '')
    name       = guser.get('name', email.split('@')[0] if email else 'user')
    avatar_url = guser.get('picture', '')

    # 3. Upsert user in DB
    try:
        conn = sqlite3.connect(DB_PATH, timeout=20.0)
        cursor = conn.cursor()

        # Check if user exists by google_id or email
        cursor.execute("SELECT user_id, username FROM users WHERE google_id=? OR email=?", (google_id, email))
        existing = cursor.fetchone()

        if existing:
            user_id  = existing[0]
            username = existing[1]
            # Update google fields
            cursor.execute(
                "UPDATE users SET google_id=?, avatar_url=?, auth_provider='google', last_login=? WHERE user_id=?",
                (google_id, avatar_url, datetime.now().isoformat(), user_id)
            )
        else:
            # Create new user — ensure unique username
            base_username = name.replace(' ', '_').lower()[:20]
            username      = base_username
            suffix        = 1
            while True:
                cursor.execute("SELECT 1 FROM users WHERE username=?", (username,))
                if not cursor.fetchone():
                    break
                username = f"{base_username}_{suffix}"
                suffix  += 1

            user_id = f"user_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            cursor.execute(
                """INSERT INTO users (user_id, username, email, password_hash, google_id, avatar_url, auth_provider, created_at, last_login)
                   VALUES (?, ?, ?, '', ?, ?, 'google', ?, ?)""",
                (user_id, username, email, google_id, avatar_url,
                 datetime.now().isoformat(), datetime.now().isoformat())
            )

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Google DB upsert error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=google_db_error")

    # 4. Issue JWT and redirect to frontend with token in query param
    access_token = create_access_token(identity=user_id)
    return redirect(
        f"{FRONTEND_URL}/auth/callback"
        f"?token={access_token}"
        f"&user_id={user_id}"
        f"&username={username}"
        f"&email={email}"
        f"&avatar_url={avatar_url}"
    )


# ══════════════════════════════════════════════════════════════════════════════
#  NEWS FEED  ── /api/news/*
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/news/feed', methods=['GET'])
@jwt_required()
def news_feed():
    category = request.args.get('category', 'all')
    limit    = min(int(request.args.get('limit', 20)), 100)

    db = NewsDatabase(DB_PATH)
    if category == 'all':
        news_df = db.get_all_news_items(limit=limit)
    else:
        news_df = db.get_news_by_category(category)
        news_df = news_df.head(limit)
    db.close()

    return jsonify({'news': _df_to_list(news_df)})


@app.route('/api/news/recommendations', methods=['GET'])
@jwt_required()
def recommendations():
    user_id = get_jwt_identity()
    limit   = min(int(request.args.get('limit', 20)), 50)

    manager = UserInteractionManager(DB_PATH)
    prefs   = manager.get_user_preferences(user_id)
    manager.close()

    db = NewsDatabase(DB_PATH)

    preferred_cats = prefs.get('most_clicked_categories', [])

    if preferred_cats:
        # User has history → recommend from their top categories, exclude already-read
        clicked_ids = db.get_user_clicked_news_ids(user_id)
        news_list = []
        seen = set(clicked_ids)
        for cat in preferred_cats[:3]:
            cat_df = db.get_news_by_category(cat)
            for _, row in cat_df.iterrows():
                if row['news_id'] not in seen:
                    seen.add(row['news_id'])
                    news_list.append(row)
                if len(news_list) >= limit:
                    break
            if len(news_list) >= limit:
                break
        # pad with general popular news if not enough
        if len(news_list) < limit:
            pop_df = db.get_popular_news(limit=limit)
            for _, row in pop_df.iterrows():
                if row['news_id'] not in seen:
                    seen.add(row['news_id'])
                    news_list.append(row)
                if len(news_list) >= limit:
                    break

        import pandas as pd
        result_df = pd.DataFrame(news_list) if news_list else pd.DataFrame()
    else:
        # No history yet → return latest popular news
        result_df = db.get_popular_news(limit=limit)
        if result_df.empty:
            result_df = db.get_all_news_items(limit=limit)

    db.close()
    return jsonify({'news': _df_to_list(result_df), 'has_personalization': bool(preferred_cats)})


@app.route('/api/news/trending', methods=['GET'])
@jwt_required()
def trending_news():
    limit = min(int(request.args.get('limit', 10)), 50)
    db = NewsDatabase(DB_PATH)
    df = db.get_popular_news(limit=limit)
    db.close()
    return jsonify({'news': _df_to_list(df)})


@app.route('/api/news/search', methods=['GET'])
@jwt_required()
def search_news():
    q     = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 20)), 100)

    if not q:
        return jsonify({'news': []})

    db = NewsDatabase(DB_PATH)
    conn = db._get_connection()
    pattern = f'%{q}%'
    df = __import__('pandas').read_sql_query(
        "SELECT * FROM news_items WHERE title LIKE ? OR description LIKE ? ORDER BY published_at DESC LIMIT ?",
        conn, params=(pattern, pattern, limit)
    )
    db.close()
    return jsonify({'news': _df_to_list(df)})


@app.route('/api/news/live', methods=['GET'])
@jwt_required()
def live_news():
    """
    Fetch FRESH news directly from GNews API — used by category tabs and
    Explore page filters so users always get up-to-date articles.
    Also classifies and saves to DB (for recommendation training).
    """
    category    = request.args.get('category', 'general').strip()
    limit       = min(int(request.args.get('limit', 20)), 50)
    save_to_db  = request.args.get('save', 'true').lower() == 'true'

    # Map frontend category names → GNews query terms
    CAT_QUERIES = {
        'all':           'world',
        'general':       'world',
        'technology':    'technology',
        'tech':          'technology',
        'science':       'science',
        'sports':        'sports',
        'finance':       'finance',
        'business':      'business',
        'health':        'health',
        'entertainment': 'entertainment',
        'news':          'breaking news',
        'trending':      'trending',
        'latest':        'world',
        'politics':      'politics',
        'travel':        'travel',
        'lifestyle':     'lifestyle',
    }

    query = CAT_QUERIES.get(category.lower(), category)

    try:
        df = fetch_news_from_api(API_KEY, query=query, max_results=limit)
        if df.empty:
            return jsonify({'news': [], 'source': 'live'})

        if save_to_db:
            try:
                df = classify_news_articles(df, MODEL_PATH)
                save_news_to_database(df, DB_PATH)
            except Exception as e:
                print(f"⚠️  Classification/save failed (non-fatal): {e}")

        # Build response directly from GNews data (even if classification failed)
        news_list = []
        for _, row in df.iterrows():
            desc = str(row.get('description') or '')
            labels = []
            if hasattr(row, 'top_3_labels') and row.get('top_3_labels') is not None:
                labels = list(row['top_3_labels']) if not isinstance(row['top_3_labels'], float) else []

            news_list.append({
                'news_id':          row.get('news_id', ''),
                'title':            row.get('title', ''),
                'description':      desc[:300] + '…' if len(desc) > 300 else desc,
                'url':              row.get('url', ''),
                'image_url':        row.get('image') or row.get('image_url', ''),
                'published_at':     row.get('publishedAt') or row.get('published_at', ''),
                'source_name':      row.get('source_name', '') or '',
                'top_3_labels':     labels or [category],
                'predicted_labels': labels or [category],
            })

        return jsonify({'news': news_list, 'source': 'live', 'query': query})

    except Exception as e:
        print(f"Live news fetch error: {e}")
        # Graceful fallback: return DB articles for this category
        try:
            db = NewsDatabase(DB_PATH)
            df_db = db.get_news_by_category(category) if category != 'all' else db.get_all_news_items(limit=limit)
            db.close()
            return jsonify({'news': _df_to_list(df_db), 'source': 'db_fallback'})
        except Exception:
            return jsonify({'news': [], 'error': str(e)}), 500


@app.route('/api/news/click', methods=['POST'])
@jwt_required()
def record_click():
    user_id = get_jwt_identity()
    data    = request.get_json(silent=True) or {}
    news_id = data.get('news_id')

    if not news_id:
        return jsonify({'error': 'news_id required'}), 400

    db = NewsDatabase(DB_PATH)
    ok = db.record_user_interaction(user_id, news_id, 'click')
    db.close()

    return jsonify({'success': ok})


@app.route('/api/news/categories', methods=['GET'])
@jwt_required()
def get_categories():
    categories = [
        'all', 'technology', 'sports', 'finance', 'health',
        'entertainment', 'news', 'science', 'business', 'politics'
    ]
    return jsonify({'categories': categories})


# ══════════════════════════════════════════════════════════════════════════════
#  GITHUB OAUTH  ── /api/auth/github/*
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/auth/github', methods=['GET'])
def github_oauth_init():
    """Returns the GitHub OAuth URL for the frontend to redirect to."""
    if GITHUB_CLIENT_ID == 'YOUR_GITHUB_CLIENT_ID':
        return jsonify({'error': 'GitHub OAuth not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env'}), 503

    import urllib.parse
    params = {
        'client_id':    GITHUB_CLIENT_ID,
        'redirect_uri': GITHUB_REDIRECT_URI,
        'scope':        'user:email read:user',
        'allow_signup': 'true',
    }
    url = 'https://github.com/login/oauth/authorize?' + urllib.parse.urlencode(params)
    return jsonify({'url': url})


@app.route('/api/auth/github/callback', methods=['GET'])
def github_oauth_callback():
    """
    GitHub redirects here with ?code=...
    Exchange code → access_token → user info → create/login user → redirect to frontend.
    """
    code  = request.args.get('code')
    error = request.args.get('error')

    if error or not code:
        return redirect(f"{FRONTEND_URL}/login?error=github_denied")

    # 1. Exchange code for access token
    try:
        token_resp = http_requests.post(
            'https://github.com/login/oauth/access_token',
            headers={'Accept': 'application/json'},
            data={
                'client_id':     GITHUB_CLIENT_ID,
                'client_secret': GITHUB_CLIENT_SECRET,
                'code':          code,
                'redirect_uri':  GITHUB_REDIRECT_URI,
            },
            timeout=10
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        access_token = token_data.get('access_token')
        if not access_token:
            raise ValueError(f"No access_token in response: {token_data}")
    except Exception as e:
        print(f"GitHub token exchange error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=github_token_failed")

    # 2. Get user profile
    try:
        profile_resp = http_requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'},
            timeout=10
        )
        profile_resp.raise_for_status()
        guser = profile_resp.json()
    except Exception as e:
        print(f"GitHub profile error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=github_userinfo_failed")

    # 3. Get primary email (GitHub may not expose it in profile if set to private)
    email = guser.get('email') or ''
    if not email:
        try:
            emails_resp = http_requests.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'},
                timeout=10
            )
            emails_resp.raise_for_status()
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get('primary') and e.get('verified')), None)
            if primary:
                email = primary.get('email', '')
        except Exception:
            pass  # non-fatal — proceed without email

    github_id  = str(guser.get('id', ''))
    name       = guser.get('name') or guser.get('login') or 'githubuser'
    login      = guser.get('login', '')
    avatar_url = guser.get('avatar_url', '')

    # 4. Upsert user in DB
    try:
        conn = sqlite3.connect(DB_PATH, timeout=20.0)
        cursor = conn.cursor()

        # Check by github_id OR email
        if email:
            cursor.execute("SELECT user_id, username FROM users WHERE github_id=? OR email=?", (github_id, email))
        else:
            cursor.execute("SELECT user_id, username FROM users WHERE github_id=?", (github_id,))
        existing = cursor.fetchone()

        if existing:
            user_id  = existing[0]
            username = existing[1]
            cursor.execute(
                "UPDATE users SET github_id=?, avatar_url=?, auth_provider='github', last_login=? WHERE user_id=?",
                (github_id, avatar_url, datetime.now().isoformat(), user_id)
            )
        else:
            # Build unique username from GitHub login
            base_username = login.lower()[:20] or name.replace(' ', '_').lower()[:20]
            username = base_username
            suffix = 1
            while True:
                cursor.execute("SELECT 1 FROM users WHERE username=?", (username,))
                if not cursor.fetchone():
                    break
                username = f"{base_username}_{suffix}"
                suffix += 1

            user_id = f"user_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            cursor.execute(
                """INSERT INTO users
                   (user_id, username, email, password_hash, github_id, avatar_url, auth_provider, created_at, last_login)
                   VALUES (?,?,?,'',?,?,'github',?,?)""",
                (user_id, username, email or None, github_id, avatar_url,
                 datetime.now().isoformat(), datetime.now().isoformat())
            )

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"GitHub DB upsert error: {e}")
        return redirect(f"{FRONTEND_URL}/login?error=github_db_error")

    # 5. Issue JWT and redirect to frontend
    jwt_token = create_access_token(identity=user_id)
    import urllib.parse
    params = urllib.parse.urlencode({
        'token':      jwt_token,
        'user_id':    user_id,
        'username':   username,
        'email':      email,
        'avatar_url': avatar_url,
    })
    return redirect(f"{FRONTEND_URL}/auth/callback?{params}")


# ══════════════════════════════════════════════════════════════════════════════
#  USER  ── /api/user/*
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, username, email, avatar_url, auth_provider, created_at, last_login FROM users WHERE user_id=?",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': {
        'user_id':       row[0],
        'username':      row[1],
        'email':         row[2],
        'avatar_url':    row[3],
        'auth_provider': row[4],
        'created_at':    row[5],
        'last_login':    row[6],
    }})


@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data     = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    email    = (data.get('email') or '').strip() or None

    if not username:
        return jsonify({'error': 'Username cannot be empty'}), 400

    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    # Check username uniqueness (excluding self)
    cursor.execute("SELECT user_id FROM users WHERE username=? AND user_id!=?", (username, user_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username already taken'}), 409
    if email:
        cursor.execute("SELECT user_id FROM users WHERE email=? AND user_id!=?", (email, user_id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Email already in use'}), 409
    try:
        cursor.execute(
            "UPDATE users SET username=?, email=? WHERE user_id=?",
            (username, email, user_id)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Profile updated'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/user/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data        = request.get_json(silent=True) or {}
    current_pw  = data.get('current_password', '')
    new_pw      = data.get('new_password', '')

    if not current_pw or not new_pw:
        return jsonify({'error': 'Both current and new password are required'}), 400
    if len(new_pw) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash, auth_provider FROM users WHERE user_id=?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    # Google users have no password
    if row[1] == 'google':
        conn.close()
        return jsonify({'error': 'Google accounts do not use a password'}), 400

    if not check_password_hash(row[0], current_pw):
        conn.close()
        return jsonify({'error': 'Current password is incorrect'}), 401

    cursor.execute(
        "UPDATE users SET password_hash=? WHERE user_id=?",
        (generate_password_hash(new_pw), user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Password changed successfully'})


@app.route('/api/user/analytics', methods=['GET'])
@jwt_required()
def user_analytics():
    """
    Full analytics for the logged-in user.
    Returns only real data derived from interactions + bookmarks.
    """
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()

    # ── 1. Total clicks ───────────────────────────────────────────────────
    cursor.execute("SELECT COUNT(*) FROM user_interactions WHERE user_id=?", (user_id,))
    total_clicks = cursor.fetchone()[0]

    # ── 2. Unique articles read ───────────────────────────────────────────
    cursor.execute("SELECT COUNT(DISTINCT news_id) FROM user_interactions WHERE user_id=?", (user_id,))
    unique_articles = cursor.fetchone()[0]

    # ── 3. Daily activity — last 30 days ─────────────────────────────────
    cursor.execute("""
        SELECT DATE(timestamp) as day, COUNT(*) as cnt
        FROM user_interactions WHERE user_id=?
        GROUP BY day ORDER BY day ASC
    """, (user_id,))
    daily_raw = cursor.fetchall()
    daily_activity = [{'date': r[0], 'articles': r[1]} for r in daily_raw]

    # ── 4. Reading streak (consecutive days up to today) ─────────────────
    days_read = {r[0] for r in daily_raw}
    from datetime import date, timedelta
    streak = 0
    check = date.today()
    while str(check) in days_read:
        streak += 1
        check -= timedelta(days=1)
    # Also try from yesterday in case user hasn't read today
    if streak == 0:
        check = date.today() - timedelta(days=1)
        while str(check) in days_read:
            streak += 1
            check -= timedelta(days=1)

    # ── 5. Category distribution ──────────────────────────────────────────
    cursor.execute("""
        SELECT ni.top_3_labels, COUNT(*) as cnt
        FROM user_interactions ui
        JOIN news_items ni ON ui.news_id = ni.news_id
        WHERE ui.user_id=? AND ni.top_3_labels IS NOT NULL AND ni.top_3_labels != ''
        GROUP BY ni.top_3_labels ORDER BY cnt DESC
    """, (user_id,))
    cat_rows = cursor.fetchall()

    # Flatten labels → aggregate counts per individual category
    cat_counts = {}
    for labels_str, cnt in cat_rows:
        try:
            labels = json.loads(labels_str) if labels_str else []
            for lab in labels[:1]:  # use only top label per article
                cat_counts[lab] = cat_counts.get(lab, 0) + cnt
        except Exception:
            pass

    top_categories = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    category_dist = [{'category': k, 'count': v} for k, v in top_categories]
    favourite_category = top_categories[0][0] if top_categories else None

    # ── 6. Top sources read ───────────────────────────────────────────────
    cursor.execute("""
        SELECT ni.source_name, COUNT(*) as cnt
        FROM user_interactions ui
        JOIN news_items ni ON ui.news_id = ni.news_id
        WHERE ui.user_id=? AND ni.source_name IS NOT NULL AND ni.source_name != ''
        GROUP BY ni.source_name ORDER BY cnt DESC LIMIT 5
    """, (user_id,))
    top_sources = [{'source': r[0], 'count': r[1]} for r in cursor.fetchall()]

    # ── 7. Bookmarks stats ────────────────────────────────────────────────
    cursor.execute("SELECT COUNT(*) FROM bookmarks WHERE user_id=?", (user_id,))
    total_bookmarks = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookmark_collections WHERE user_id=?", (user_id,))
    total_collections = cursor.fetchone()[0]

    # Bookmark category dist
    cursor.execute("SELECT top_3_labels, COUNT(*) FROM bookmarks WHERE user_id=? GROUP BY top_3_labels", (user_id,))
    bm_cat_raw = cursor.fetchall()
    bm_cats = {}
    for labels_str, cnt in bm_cat_raw:
        try:
            labels = json.loads(labels_str) if labels_str else []
            for lab in labels[:1]:
                bm_cats[lab] = bm_cats.get(lab, 0) + cnt
        except Exception:
            pass
    bookmark_categories = [{'category': k, 'count': v}
                            for k, v in sorted(bm_cats.items(), key=lambda x: x[1], reverse=True)[:5]]

    # ── 8. Most active reading day ────────────────────────────────────────
    best_day = max(daily_raw, key=lambda x: x[1], default=None)

    # ── 9. First read date ────────────────────────────────────────────────
    cursor.execute("SELECT MIN(timestamp) FROM user_interactions WHERE user_id=?", (user_id,))
    first_read = cursor.fetchone()[0]

    # ── 10. Recently read articles ────────────────────────────────────────
    cursor.execute("""
        SELECT ni.title, ni.source_name, ui.timestamp, ni.url
        FROM user_interactions ui
        JOIN news_items ni ON ui.news_id = ni.news_id
        WHERE ui.user_id=?
        ORDER BY ui.timestamp DESC LIMIT 5
    """, (user_id,))
    recent = [{'title': r[0], 'source': r[1], 'timestamp': r[2], 'url': r[3]}
              for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        'summary': {
            'total_clicks':       total_clicks,
            'unique_articles':    unique_articles,
            'reading_streak':     streak,
            'total_bookmarks':    total_bookmarks,
            'total_collections':  total_collections,
            'favourite_category': favourite_category,
            'first_read_date':    first_read,
            'best_day':           {'date': best_day[0], 'count': best_day[1]} if best_day else None,
        },
        'daily_activity':     daily_activity,
        'category_dist':      category_dist,
        'top_sources':        top_sources,
        'bookmark_categories': bookmark_categories,
        'recent_reads':       recent,
    })


@app.route('/api/user/stats', methods=['GET'])
@jwt_required()
def user_stats():
    user_id = get_jwt_identity()
    manager = UserInteractionManager(DB_PATH)
    stats       = manager.get_user_statistics(user_id)
    preferences = manager.get_user_preferences(user_id)
    manager.close()
    return jsonify({'stats': stats, 'preferences': preferences})


@app.route('/api/user/history', methods=['GET'])
@jwt_required()
def user_history():
    user_id = get_jwt_identity()
    limit   = min(int(request.args.get('limit', 50)), 200)

    db      = NewsDatabase(DB_PATH)
    df      = db.get_user_interactions(user_id, limit=limit)
    db.close()
    return jsonify({'history': _df_to_list(df)})


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN  ── /api/admin/*
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/admin/fetch-news', methods=['POST'])
@jwt_required()
def admin_fetch_news():
    data        = request.get_json(silent=True) or {}
    query       = data.get('query', 'technology')
    max_results = int(data.get('max_results', 10))

    try:
        df = fetch_news_from_api(API_KEY, query, max_results)
        if df.empty:
            return jsonify({'error': 'No articles found from API'}), 404

        df    = classify_news_articles(df, MODEL_PATH)
        count = save_news_to_database(df, DB_PATH)
        return jsonify({'success': True, 'count': count, 'message': f'Saved {count} articles'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  BOOKMARKS  ── /api/bookmarks/*
# ══════════════════════════════════════════════════════════════════════════════

def _ensure_default_collection(user_id, cursor):
    """Create a 'Read Later' collection for a user if they have none."""
    cursor.execute("SELECT COUNT(*) FROM bookmark_collections WHERE user_id=?", (user_id,))
    if cursor.fetchone()[0] == 0:
        col_id = f"col_{user_id}_default"
        cursor.execute(
            "INSERT OR IGNORE INTO bookmark_collections (collection_id, user_id, name, icon, created_at) VALUES (?,?,?,?,?)",
            (col_id, user_id, 'Read Later', '⏱', datetime.now().isoformat())
        )


@app.route('/api/bookmarks/collections', methods=['GET'])
@jwt_required()
def get_collections():
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    _ensure_default_collection(user_id, cursor)
    conn.commit()
    cursor.execute("""
        SELECT bc.collection_id, bc.name, bc.icon, bc.created_at,
               COUNT(b.bookmark_id) as count
        FROM bookmark_collections bc
        LEFT JOIN bookmarks b ON bc.collection_id = b.collection_id
        WHERE bc.user_id = ?
        GROUP BY bc.collection_id
        ORDER BY bc.created_at ASC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    collections = [{'collection_id': r[0], 'name': r[1], 'icon': r[2],
                    'created_at': r[3], 'count': r[4]} for r in rows]
    return jsonify({'collections': collections})


@app.route('/api/bookmarks/collections', methods=['POST'])
@jwt_required()
def create_collection():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    icon = data.get('icon', '📁')
    if not name:
        return jsonify({'error': 'Collection name required'}), 400
    col_id = f"col_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO bookmark_collections (collection_id, user_id, name, icon, created_at) VALUES (?,?,?,?,?)",
        (col_id, user_id, name, icon, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({'collection': {'collection_id': col_id, 'name': name, 'icon': icon, 'count': 0}}), 201


@app.route('/api/bookmarks/collections/<collection_id>', methods=['DELETE'])
@jwt_required()
def delete_collection(collection_id):
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bookmark_collections WHERE collection_id=? AND user_id=?", (collection_id, user_id))
    cursor.execute("DELETE FROM bookmarks WHERE collection_id=? AND user_id=?", (collection_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/bookmarks', methods=['GET'])
@jwt_required()
def get_bookmarks():
    user_id       = get_jwt_identity()
    collection_id = request.args.get('collection_id')  # optional filter
    limit         = min(int(request.args.get('limit', 100)), 200)

    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()

    if collection_id:
        cursor.execute("""
            SELECT bookmark_id, collection_id, news_id, title, description, url,
                   image_url, source_name, published_at, top_3_labels, saved_at
            FROM bookmarks WHERE user_id=? AND collection_id=?
            ORDER BY saved_at DESC LIMIT ?
        """, (user_id, collection_id, limit))
    else:
        cursor.execute("""
            SELECT bookmark_id, collection_id, news_id, title, description, url,
                   image_url, source_name, published_at, top_3_labels, saved_at
            FROM bookmarks WHERE user_id=?
            ORDER BY saved_at DESC LIMIT ?
        """, (user_id, limit))

    rows = cursor.fetchall()
    conn.close()

    bookmarks = []
    for r in rows:
        try:
            labels = json.loads(r[9]) if r[9] else []
        except Exception:
            labels = []
        bookmarks.append({
            'bookmark_id':   r[0], 'collection_id': r[1], 'news_id':     r[2],
            'title':         r[3], 'description':   r[4], 'url':         r[5],
            'image_url':     r[6], 'source_name':   r[7], 'published_at':r[8],
            'top_3_labels':  labels, 'saved_at':     r[10],
        })
    return jsonify({'bookmarks': bookmarks})


@app.route('/api/bookmarks', methods=['POST'])
@jwt_required()
def add_bookmark():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    collection_id = data.get('collection_id', '').strip()
    article = data.get('article', {})

    if not collection_id or not article.get('news_id'):
        return jsonify({'error': 'collection_id and article.news_id required'}), 400

    # Verify collection belongs to this user
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM bookmark_collections WHERE collection_id=? AND user_id=?",
                   (collection_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Collection not found'}), 404

    labels = article.get('top_3_labels', [])
    labels_str = json.dumps(labels) if isinstance(labels, list) else '[]'

    try:
        cursor.execute("""
            INSERT INTO bookmarks
              (user_id, collection_id, news_id, title, description, url,
               image_url, source_name, published_at, top_3_labels, saved_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            user_id, collection_id,
            article.get('news_id', ''),
            article.get('title', ''),
            (article.get('description') or '')[:300],
            article.get('url', ''),
            article.get('image_url', ''),
            article.get('source_name', ''),
            article.get('published_at', ''),
            labels_str,
            datetime.now().isoformat()
        ))
        conn.commit()
        bookmark_id = cursor.lastrowid
        conn.close()
        return jsonify({'success': True, 'bookmark_id': bookmark_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Already bookmarked in this collection'}), 409
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/bookmarks/<int:bookmark_id>', methods=['DELETE'])
@jwt_required()
def remove_bookmark(bookmark_id):
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bookmarks WHERE bookmark_id=? AND user_id=?", (bookmark_id, user_id))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted:
        return jsonify({'success': True})
    return jsonify({'error': 'Bookmark not found'}), 404


@app.route('/api/bookmarks/check/<news_id>', methods=['GET'])
@jwt_required()
def check_bookmark(news_id):
    """Check if an article is bookmarked, return which collections it's in."""
    user_id = get_jwt_identity()
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.bookmark_id, b.collection_id, bc.name
        FROM bookmarks b
        JOIN bookmark_collections bc ON b.collection_id = bc.collection_id
        WHERE b.user_id=? AND b.news_id=?
    """, (user_id, news_id))
    rows = cursor.fetchall()
    conn.close()
    return jsonify({
        'is_bookmarked': len(rows) > 0,
        'in_collections': [{'bookmark_id': r[0], 'collection_id': r[1], 'name': r[2]} for r in rows]
    })


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _df_to_list(df):
    """Convert a DataFrame of news items to a JSON-safe list."""
    if df is None or df.empty:
        return []

    news_list = []
    for _, row in df.iterrows():
        # Parse JSON label columns safely
        def parse_labels(val):
            if isinstance(val, list):
                return val
            if isinstance(val, str) and val:
                try:
                    return json.loads(val)
                except Exception:
                    return []
            return []

        desc = str(row.get('description') or '')
        news_list.append({
            'news_id':          row.get('news_id', ''),
            'title':            row.get('title', ''),
            'description':      desc[:300] + '…' if len(desc) > 300 else desc,
            'url':              row.get('url', ''),
            'image_url':        row.get('image_url') or row.get('image', ''),
            'published_at':     row.get('published_at', ''),
            'source_name':      row.get('source_name', 'Unknown'),
            'top_3_labels':     parse_labels(row.get('top_3_labels')),
            'predicted_labels': parse_labels(row.get('predicted_labels')),
        })
    return news_list


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
