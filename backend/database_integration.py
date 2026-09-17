"""
Integration script for saving news from API to database
This script can be used to periodically fetch news and save to database
"""

import requests
import pandas as pd
import joblib
import numpy as np
import scipy.sparse as sp
from database import NewsDatabase, save_news_from_dataframe
from datetime import datetime
import hashlib


def fetch_news_from_api(api_key: str, query: str = "technology", 
                       max_results: int = 10, lang: str = "en", 
                       country: str = "us") -> pd.DataFrame:
    """
    Fetch news from GNews API
    
    Args:
        api_key: GNews API key
        query: Search query
        max_results: Maximum number of results
        lang: Language code
        country: Country code
    
    Returns:
        DataFrame with news articles
    """
    url = f"https://gnews.io/api/v4/search?q={query}&lang={lang}&country={country}&max={max_results}&apikey={api_key}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching news from API: {e}")
        return pd.DataFrame()
    
    articles = []
    for item in data.get("articles", []):
        source = item.get("source", {})
        
        # Generate unique news_id from URL
        url = item.get("url", "")
        news_id = hashlib.md5(url.encode()).hexdigest()[:16] if url else None
        
        articles.append({
            "news_id": news_id,
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "content": item.get("content", ""),
            "url": url,
            "image": item.get("image", ""),
            "publishedAt": item.get("publishedAt", ""),
            "source_name": source.get("name", ""),
            "source_url": source.get("url", ""),
            "language": item.get("language", lang),
            "country": item.get("country", country),
        })
    
    df = pd.DataFrame(articles)
    print(f"✅ Retrieved {len(df)} articles for query: {query}")
    return df


def classify_news_articles(df: pd.DataFrame, model_path: str = "ai_models/news_classifier_model.pkl") -> pd.DataFrame:
    """
    Classify news articles using the trained model
    
    Args:
        df: DataFrame with news articles
        model_path: Path to the trained model file
    
    Returns:
        DataFrame with predictions added
    """
    if df.empty:
        return df
    
    # Load model
    try:
        bundle = joblib.load(model_path)
        model, mlb, vectorizer = bundle[0], bundle[1], bundle[2]
        print("✅ Model bundle loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return df
    
    # Prepare text for vectorization
    df["text"] = (
        df["title"].fillna("") + ". " +
        df["description"].fillna("") + ". " +
        df["content"].fillna("")
    )
    
    # Transform text
    X = vectorizer.transform(df["text"])
    
    # Fix feature size mismatch
    expected_features = model.n_features_in_
    current_features = X.shape[1]
    
    if current_features < expected_features:
        diff = expected_features - current_features
        print(f"⚙️ Padding {diff} missing features...")
        X = sp.hstack([X, sp.csr_matrix((X.shape[0], diff))])
    elif current_features > expected_features:
        diff = current_features - expected_features
        print(f"⚙️ Trimming {diff} extra features...")
        X = X[:, :expected_features]
    
    print(f"✅ Feature alignment done: {X.shape[1]} features match model input.")
    
    # Predict labels
    try:
        probs_list = [est.predict_proba(X)[:, 1] for est in model.estimators_]
        probs = np.column_stack(probs_list)
    except AttributeError:
        probs = model.predict_proba(X)
    
    threshold = 0.3
    pred_labels = mlb.inverse_transform(probs > threshold)
    
    # Add predictions
    df["predicted_labels"] = pred_labels
    df["top_3_labels"] = [
        [mlb.classes_[i] for i in np.argsort(p)[::-1][:3]]
        for p in probs
    ]
    
    print(f"✅ Classified {len(df)} articles")
    return df


def save_news_to_database(df: pd.DataFrame, db_path: str = "news_recommender.db") -> int:
    """
    Save classified news articles to database
    
    Args:
        df: DataFrame with classified news articles
        db_path: Path to database file
    
    Returns:
        Number of items saved
    """
    db = NewsDatabase(db_path)
    
    count = save_news_from_dataframe(df, db)
    
    print(f"✅ Saved {count} news items to database")
    
    db.close()
    return count


def fetch_and_save_news(api_key: str, query: str = "technology", 
                       max_results: int = 10, model_path: str = "ai_models/news_classifier_model.pkl",
                       db_path: str = "news_recommender.db") -> int:
    """
    Complete pipeline: Fetch news from API, classify, and save to database
    
    Args:
        api_key: GNews API key
        query: Search query
        max_results: Maximum number of results
        model_path: Path to trained model
        db_path: Path to database file
    
    Returns:
        Number of items saved
    """
    print("="*80)
    print("NEWS FETCHING AND CLASSIFICATION PIPELINE")
    print("="*80)
    
    # Step 1: Fetch news from API
    print(f"\n[1/3] Fetching news from API (query: '{query}')...")
    df = fetch_news_from_api(api_key, query, max_results)
    
    if df.empty:
        print("⚠️ No articles found. Aborting.")
        return 0
    
    # Step 2: Classify articles
    print(f"\n[2/3] Classifying articles...")
    df = classify_news_articles(df, model_path)
    
    # Step 3: Save to database
    print(f"\n[3/3] Saving to database...")
    count = save_news_to_database(df, db_path)
    
    print("\n" + "="*80)
    print("PIPELINE COMPLETE")
    print("="*80)
    
    return count


if __name__ == "__main__":
    # Example usage
    API_KEY = "172285a1b5b6f981c517e59461b31a9a"  # Replace with your API key
    
    # Fetch and save news for different topics
    topics = ["technology", "sports", "finance"]
    
    for topic in topics:
        print(f"\n{'='*80}")
        print(f"Processing topic: {topic}")
        print('='*80)
        fetch_and_save_news(API_KEY, query=topic, max_results=10)

