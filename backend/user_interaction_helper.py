"""
Helper functions for managing user interactions with news items
"""

from database import NewsDatabase
from typing import List, Dict, Any
import pandas as pd


class UserInteractionManager:
    """Manager class for user interactions"""
    
    def __init__(self, db_path: str = "news_recommender.db"):
        """
        Initialize user interaction manager
        
        Args:
            db_path: Path to database file
        """
        self.db = NewsDatabase(db_path)
    
    def record_click(self, user_id: str, news_id: str) -> bool:
        """
        Record a user click on a news item
        
        Args:
            user_id: User identifier
            news_id: News item identifier
        
        Returns:
            True if successful
        """
        return self.db.record_user_interaction(user_id, news_id, interaction_type="click")
    
    def get_user_history(self, user_id: str, limit: int = 50) -> pd.DataFrame:
        """
        Get user's click history
        
        Args:
            user_id: User identifier
            limit: Maximum number of items to return
        
        Returns:
            DataFrame with user's interaction history
        """
        return self.db.get_user_interactions(user_id, limit=limit)
    
    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        Analyze user preferences based on their click history
        
        Args:
            user_id: User identifier
        
        Returns:
            Dictionary with user preference statistics
        """
        interactions = self.get_user_history(user_id)
        
        if interactions.empty:
            return {
                'user_id': user_id,
                'total_clicks': 0,
                'preferred_categories': {},
                'most_clicked_categories': []
            }
        
        # Extract categories from clicked news
        all_categories = []
        for labels in interactions['top_3_labels']:
            if isinstance(labels, list):
                all_categories.extend(labels)
            elif isinstance(labels, str):
                # Try to parse if it's a JSON string
                try:
                    import json
                    parsed = json.loads(labels)
                    if isinstance(parsed, list):
                        all_categories.extend(parsed)
                except:
                    pass
        
        # Count category preferences
        category_counts = pd.Series(all_categories).value_counts()
        
        return {
            'user_id': user_id,
            'total_clicks': len(interactions),
            'unique_news_clicked': interactions['news_id'].nunique(),
            'preferred_categories': category_counts.to_dict(),
            'most_clicked_categories': category_counts.head(5).index.tolist()
        }
    
    def get_recommendations_for_user(self, user_id: str, limit: int = 10) -> pd.DataFrame:
        """
        Get news recommendations for a user based on their click history
        
        Args:
            user_id: User identifier
            limit: Number of recommendations to return
        
        Returns:
            DataFrame with recommended news items
        """
        # Get user preferences
        preferences = self.get_user_preferences(user_id)
        
        if not preferences['preferred_categories']:
            # If no preferences, return popular news
            return self.db.get_popular_news(limit=limit)
        
        # Get user's clicked news IDs to exclude them
        clicked_ids = self.db.get_user_clicked_news_ids(user_id)
        
        # Get news from preferred categories
        top_category = preferences['most_clicked_categories'][0] if preferences['most_clicked_categories'] else None
        
        if top_category:
            recommendations = self.db.get_news_by_category(top_category)
            # Exclude already clicked items
            if not clicked_ids:
                return recommendations.head(limit)
            recommendations = recommendations[~recommendations['news_id'].isin(clicked_ids)]
            return recommendations.head(limit)
        
        # Fallback to popular news
        return self.db.get_popular_news(limit=limit)
    
    def get_user_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a user"""
        return self.db.get_user_statistics(user_id)
    
    def close(self):
        """Close database connection"""
        self.db.close()


# ==================== CONVENIENCE FUNCTIONS ====================

def record_user_click(user_id: str, news_id: str, db_path: str = "news_recommender.db") -> bool:
    """
    Convenience function to record a user click
    
    Args:
        user_id: User identifier
        news_id: News item identifier
        db_path: Path to database file
    
    Returns:
        True if successful
    """
    manager = UserInteractionManager(db_path)
    result = manager.record_click(user_id, news_id)
    manager.close()
    return result


def get_user_recommendations(user_id: str, limit: int = 10, 
                            db_path: str = "news_recommender.db") -> pd.DataFrame:
    """
    Convenience function to get recommendations for a user
    
    Args:
        user_id: User identifier
        limit: Number of recommendations
        db_path: Path to database file
    
    Returns:
        DataFrame with recommendations
    """
    manager = UserInteractionManager(db_path)
    recommendations = manager.get_recommendations_for_user(user_id, limit)
    manager.close()
    return recommendations


if __name__ == "__main__":
    # Example usage
    manager = UserInteractionManager()
    
    # Record some clicks
    print("Recording user clicks...")
    manager.record_click("user_001", "test_001")
    manager.record_click("user_001", "test_002")
    
    # Get user preferences
    print("\nUser preferences:")
    preferences = manager.get_user_preferences("user_001")
    for key, value in preferences.items():
        print(f"  {key}: {value}")
    
    # Get recommendations
    print("\nRecommendations for user:")
    recommendations = manager.get_recommendations_for_user("user_001", limit=5)
    print(recommendations[['title', 'top_3_labels']].head())
    
    manager.close()

