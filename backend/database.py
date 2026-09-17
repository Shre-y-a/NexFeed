"""
Database module for News Recommender System
Handles two main databases:
1. news_items - Stores news articles fetched from API
2. user_interactions - Stores user clicks and interactions with news items
"""

import sqlite3
import pandas as pd
from datetime import datetime
from typing import Optional, List, Dict, Any
import json


class NewsDatabase:
    """Database handler for news recommender system"""
    
    def __init__(self, db_path: str = "news_recommender.db"):
        """
        Initialize database connection
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.conn = None
        self._initialize_database()
    
    def _get_connection(self):
        """Get database connection"""
        if self.conn is None:
            self.conn = sqlite3.connect(self.db_path, timeout=20.0)
            self.conn.row_factory = sqlite3.Row  # Enable column access by name
        return self.conn
    
    def _initialize_database(self):
        """Create tables if they don't exist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Create news_items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS news_items (
                news_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                url TEXT NOT NULL,
                image_url TEXT,
                published_at TEXT,
                source_name TEXT,
                source_url TEXT,
                language TEXT DEFAULT 'en',
                country TEXT DEFAULT 'us',
                predicted_labels TEXT,
                top_3_labels TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Create user_interactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_interactions (
                interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                news_id TEXT NOT NULL,
                interaction_type TEXT DEFAULT 'click',
                timestamp TEXT NOT NULL,
                FOREIGN KEY (news_id) REFERENCES news_items(news_id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id 
            ON user_interactions(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_interactions_news_id 
            ON user_interactions(news_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp 
            ON user_interactions(timestamp)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_news_items_published_at 
            ON news_items(published_at)
        """)
        
        conn.commit()
        print("✅ Database initialized successfully")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            self.conn = None
    
    # ==================== NEWS ITEMS OPERATIONS ====================
    
    def insert_news_item(self, news_data: Dict[str, Any]) -> bool:
        """
        Insert a single news item into the database
        
        Args:
            news_data: Dictionary containing news item data with keys:
                - news_id (required): Unique identifier for the news item
                - title (required)
                - description, content, url, image_url, published_at
                - source_name, source_url, language, country
                - predicted_labels, top_3_labels
        
        Returns:
            True if successful, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Generate news_id if not provided
        if 'news_id' not in news_data or not news_data['news_id']:
            # Generate ID from URL or title hash
            import hashlib
            identifier = news_data.get('url', news_data.get('title', str(datetime.now())))
            news_data['news_id'] = hashlib.md5(identifier.encode()).hexdigest()[:16]
        
        now = datetime.now().isoformat()
        
        # Convert lists to JSON strings if needed
        predicted_labels = news_data.get('predicted_labels', '')
        if isinstance(predicted_labels, (list, tuple)):
            predicted_labels = json.dumps(list(predicted_labels))
        elif predicted_labels is None:
            predicted_labels = ''
        
        top_3_labels = news_data.get('top_3_labels', '')
        if isinstance(top_3_labels, (list, tuple)):
            top_3_labels = json.dumps(list(top_3_labels))
        elif top_3_labels is None:
            top_3_labels = ''
        
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO news_items 
                (news_id, title, description, content, url, image_url, 
                 published_at, source_name, source_url, language, country,
                 predicted_labels, top_3_labels, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                news_data.get('news_id'),
                news_data.get('title', ''),
                news_data.get('description', ''),
                news_data.get('content', ''),
                news_data.get('url', ''),
                news_data.get('image_url', '') or news_data.get('image', ''),
                news_data.get('published_at', '') or news_data.get('publishedAt', ''),
                news_data.get('source_name', '') or news_data.get('source', {}).get('name', ''),
                news_data.get('source_url', '') or news_data.get('source', {}).get('url', ''),
                news_data.get('language', 'en'),
                news_data.get('country', 'us'),
                predicted_labels,
                top_3_labels,
                now,
                now
            ))
            conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"❌ Error inserting news item: {e}")
            return False
    
    def insert_news_items_batch(self, news_items: List[Dict[str, Any]]) -> int:
        """
        Insert multiple news items in batch
        
        Args:
            news_items: List of dictionaries containing news item data
        
        Returns:
            Number of successfully inserted items
        """
        count = 0
        for item in news_items:
            if self.insert_news_item(item):
                count += 1
        return count
    
    def get_news_item(self, news_id: str) -> Optional[Dict[str, Any]]:
        """Get a single news item by ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM news_items WHERE news_id = ?", (news_id,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None
    
    def get_all_news_items(self, limit: Optional[int] = None, 
                           order_by: str = "published_at DESC") -> pd.DataFrame:
        """
        Get all news items as DataFrame
        
        Args:
            limit: Maximum number of items to return
            order_by: SQL ORDER BY clause
        
        Returns:
            DataFrame with news items
        """
        conn = self._get_connection()
        
        query = f"SELECT * FROM news_items ORDER BY {order_by}"
        if limit:
            query += f" LIMIT {limit}"
        
        df = pd.read_sql_query(query, conn)
        
        # Parse JSON strings back to lists
        if 'predicted_labels' in df.columns:
            df['predicted_labels'] = df['predicted_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        if 'top_3_labels' in df.columns:
            df['top_3_labels'] = df['top_3_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        
        return df
    
    def get_news_by_category(self, category: str) -> pd.DataFrame:
        """Get news items that have a specific category in their labels"""
        conn = self._get_connection()
        
        query = """
            SELECT * FROM news_items 
            WHERE predicted_labels LIKE ? OR top_3_labels LIKE ?
            ORDER BY published_at DESC
        """
        
        pattern = f'%"{category}"%'
        df = pd.read_sql_query(query, conn, params=(pattern, pattern))
        
        # Parse JSON strings
        if 'predicted_labels' in df.columns:
            df['predicted_labels'] = df['predicted_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        if 'top_3_labels' in df.columns:
            df['top_3_labels'] = df['top_3_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        
        return df
    
    def news_item_exists(self, news_id: str) -> bool:
        """Check if a news item already exists"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT 1 FROM news_items WHERE news_id = ?", (news_id,))
        return cursor.fetchone() is not None
    
    # ==================== USER INTERACTIONS OPERATIONS ====================
    
    def record_user_interaction(self, user_id: str, news_id: str, 
                               interaction_type: str = "click") -> bool:
        """
        Record a user interaction (click) with a news item
        
        Args:
            user_id: Unique identifier for the user
            news_id: ID of the news item that was clicked
            interaction_type: Type of interaction (default: 'click')
        
        Returns:
            True if successful, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Verify news item exists
        if not self.news_item_exists(news_id):
            print(f"⚠️ Warning: News item {news_id} does not exist in database")
            # Still allow recording, but log the warning
        
        timestamp = datetime.now().isoformat()
        
        try:
            cursor.execute("""
                INSERT INTO user_interactions 
                (user_id, news_id, interaction_type, timestamp)
                VALUES (?, ?, ?, ?)
            """, (user_id, news_id, interaction_type, timestamp))
            conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"❌ Error recording interaction: {e}")
            return False
    
    def get_user_interactions(self, user_id: str, 
                             limit: Optional[int] = None) -> pd.DataFrame:
        """
        Get all interactions for a specific user
        
        Args:
            user_id: User identifier
            limit: Maximum number of interactions to return
        
        Returns:
            DataFrame with user interactions
        """
        conn = self._get_connection()
        
        query = """
            SELECT ui.*, ni.title, ni.url, ni.predicted_labels, ni.top_3_labels
            FROM user_interactions ui
            LEFT JOIN news_items ni ON ui.news_id = ni.news_id
            WHERE ui.user_id = ?
            ORDER BY ui.timestamp DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        df = pd.read_sql_query(query, conn, params=(user_id,))
        
        # Parse JSON strings
        if 'predicted_labels' in df.columns:
            df['predicted_labels'] = df['predicted_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        if 'top_3_labels' in df.columns:
            df['top_3_labels'] = df['top_3_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        
        return df
    
    def get_user_clicked_news_ids(self, user_id: str) -> List[str]:
        """Get list of news IDs that a user has clicked on"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT news_id 
            FROM user_interactions 
            WHERE user_id = ? AND interaction_type = 'click'
            ORDER BY timestamp DESC
        """, (user_id,))
        
        return [row[0] for row in cursor.fetchall()]
    
    def get_news_interaction_count(self, news_id: str) -> int:
        """Get total number of interactions (clicks) for a news item"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM user_interactions 
            WHERE news_id = ?
        """, (news_id,))
        
        return cursor.fetchone()[0]
    
    def get_popular_news(self, limit: int = 10) -> pd.DataFrame:
        """
        Get most popular news items based on interaction count
        
        Args:
            limit: Number of items to return
        
        Returns:
            DataFrame with popular news items
        """
        conn = self._get_connection()
        
        query = """
            SELECT ni.*, COUNT(ui.interaction_id) as click_count
            FROM news_items ni
            LEFT JOIN user_interactions ui ON ni.news_id = ui.news_id
            GROUP BY ni.news_id
            ORDER BY click_count DESC, ni.published_at DESC
            LIMIT ?
        """
        
        df = pd.read_sql_query(query, conn, params=(limit,))
        
        # Parse JSON strings
        if 'predicted_labels' in df.columns:
            df['predicted_labels'] = df['predicted_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        if 'top_3_labels' in df.columns:
            df['top_3_labels'] = df['top_3_labels'].apply(
                lambda x: json.loads(x) if x and x != '' else []
            )
        
        return df
    
    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get statistics about a user's interactions"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Total clicks
        cursor.execute("""
            SELECT COUNT(*) 
            FROM user_interactions 
            WHERE user_id = ?
        """, (user_id,))
        total_clicks = cursor.fetchone()[0]
        
        # Unique news items clicked
        cursor.execute("""
            SELECT COUNT(DISTINCT news_id) 
            FROM user_interactions 
            WHERE user_id = ?
        """, (user_id,))
        unique_news = cursor.fetchone()[0]
        
        # Most clicked category
        cursor.execute("""
            SELECT ni.top_3_labels, COUNT(*) as count
            FROM user_interactions ui
            JOIN news_items ni ON ui.news_id = ni.news_id
            WHERE ui.user_id = ? AND ni.top_3_labels != ''
            GROUP BY ni.top_3_labels
            ORDER BY count DESC
            LIMIT 1
        """, (user_id,))
        result = cursor.fetchone()
        favorite_category = json.loads(result[0])[0] if result and result[0] else None
        
        return {
            'user_id': user_id,
            'total_clicks': total_clicks,
            'unique_news_items': unique_news,
            'favorite_category': favorite_category
        }
    
    # ==================== UTILITY METHODS ====================
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get overall database statistics"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Count news items
        cursor.execute("SELECT COUNT(*) FROM news_items")
        news_count = cursor.fetchone()[0]
        
        # Count user interactions
        cursor.execute("SELECT COUNT(*) FROM user_interactions")
        interactions_count = cursor.fetchone()[0]
        
        # Count unique users
        cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_interactions")
        unique_users = cursor.fetchone()[0]
        
        # Latest news item
        cursor.execute("SELECT MAX(published_at) FROM news_items")
        latest_news = cursor.fetchone()[0]
        
        return {
            'total_news_items': news_count,
            'total_interactions': interactions_count,
            'unique_users': unique_users,
            'latest_news_date': latest_news
        }
    
    def clear_old_news(self, days: int = 30) -> int:
        """
        Delete news items older than specified days
        
        Args:
            days: Number of days to keep
        
        Returns:
            Number of items deleted
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cutoff_date = (datetime.now() - pd.Timedelta(days=days)).isoformat()
        
        cursor.execute("""
            DELETE FROM news_items 
            WHERE published_at < ? OR (published_at IS NULL AND created_at < ?)
        """, (cutoff_date, cutoff_date))
        
        deleted = cursor.rowcount
        conn.commit()
        
        return deleted


# ==================== HELPER FUNCTIONS ====================

def save_news_from_dataframe(df: pd.DataFrame, db: NewsDatabase) -> int:
    """
    Save news items from a pandas DataFrame to the database
    
    Args:
        df: DataFrame with news articles (should have columns matching news_items schema)
        db: NewsDatabase instance
    
    Returns:
        Number of items saved
    """
    news_items = []
    
    for _, row in df.iterrows():
        news_data = {
            'news_id': row.get('news_id') or row.get('newsId', ''),
            'title': row.get('title', ''),
            'description': row.get('description', ''),
            'content': row.get('content', ''),
            'url': row.get('url', ''),
            'image_url': row.get('image') or row.get('image_url', ''),
            'published_at': row.get('publishedAt') or row.get('published_at', ''),
            'source_name': row.get('source_name', ''),
            'source_url': row.get('source_url', ''),
            'language': row.get('language', 'en'),
            'country': row.get('country', 'us'),
            'predicted_labels': row.get('predicted_labels', []),
            'top_3_labels': row.get('top_3_labels') or row.get('top_k_labels', [])
        }
        news_items.append(news_data)
    
    return db.insert_news_items_batch(news_items)


if __name__ == "__main__":
    # Example usage
    db = NewsDatabase()
    
    # Example: Insert a news item
    sample_news = {
        'news_id': 'test_001',
        'title': 'Sample News Article',
        'description': 'This is a sample description',
        'url': 'https://example.com/news/1',
        'predicted_labels': ['sports', 'news'],
        'top_3_labels': ['sports', 'news', 'entertainment']
    }
    
    db.insert_news_item(sample_news)
    
    # Example: Record user interaction
    db.record_user_interaction('user_123', 'test_001', 'click')
    
    # Get statistics
    stats = db.get_database_stats()
    print("\n📊 Database Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    db.close()

