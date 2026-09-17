"""
Example usage of the News Recommender Database System
This script demonstrates how to use both databases
"""

from database import NewsDatabase
from database_integration import fetch_and_save_news
from user_interaction_helper import UserInteractionManager
import pandas as pd


def example_news_items_database():
    """Example: Working with news items database"""
    print("\n" + "="*80)
    print("EXAMPLE 1: NEWS ITEMS DATABASE")
    print("="*80)
    
    # Initialize database
    db = NewsDatabase("news_recommender.db")
    
    # Fetch and save news from API
    API_KEY = "172285a1b5b6f981c517e59461b31a9a"  # Replace with your API key
    
    print("\n1. Fetching and saving news from API...")
    fetch_and_save_news(
        api_key=API_KEY,
        query="technology",
        max_results=5,
        db_path="news_recommender.db"
    )
    
    # Get all news items
    print("\n2. Retrieving all news items from database...")
    all_news = db.get_all_news_items(limit=10)
    print(f"   Found {len(all_news)} news items")
    if not all_news.empty:
        print("\n   Sample news items:")
        for idx, row in all_news.head(3).iterrows():
            print(f"   - {row['title'][:60]}...")
            print(f"     Categories: {row['top_3_labels']}")
    
    # Get news by category
    print("\n3. Retrieving sports news...")
    sports_news = db.get_news_by_category("sports")
    print(f"   Found {len(sports_news)} sports articles")
    
    # Get popular news
    print("\n4. Getting popular news...")
    popular = db.get_popular_news(limit=5)
    print(f"   Top {len(popular)} popular news items")
    
    # Database statistics
    print("\n5. Database statistics:")
    stats = db.get_database_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    db.close()


def example_user_interactions_database():
    """Example: Working with user interactions database"""
    print("\n" + "="*80)
    print("EXAMPLE 2: USER INTERACTIONS DATABASE")
    print("="*80)
    
    db = NewsDatabase("news_recommender.db")
    
    # Get some news IDs to work with
    all_news = db.get_all_news_items(limit=5)
    if all_news.empty:
        print("⚠️ No news items in database. Please fetch some news first.")
        return
    
    news_ids = all_news['news_id'].tolist()
    
    # Record user interactions
    print("\n1. Recording user clicks...")
    user_id = "user_123"
    
    for news_id in news_ids[:3]:  # Click on first 3 news items
        success = db.record_user_interaction(user_id, news_id, "click")
        if success:
            print(f"   ✓ Recorded click: user={user_id}, news_id={news_id}")
    
    # Get user's interaction history
    print("\n2. Retrieving user interaction history...")
    user_history = db.get_user_interactions(user_id)
    print(f"   User {user_id} has {len(user_history)} interactions")
    
    if not user_history.empty:
        print("\n   Clicked news:")
        for idx, row in user_history.iterrows():
            print(f"   - {row['title'][:50]}...")
            print(f"     Clicked at: {row['timestamp']}")
    
    # Get user statistics
    print("\n3. User statistics:")
    user_stats = db.get_user_statistics(user_id)
    for key, value in user_stats.items():
        print(f"   {key}: {value}")
    
    # Get clicked news IDs
    print("\n4. User's clicked news IDs:")
    clicked_ids = db.get_user_clicked_news_ids(user_id)
    print(f"   {clicked_ids}")
    
    db.close()


def example_recommendation_system():
    """Example: Using the recommendation system"""
    print("\n" + "="*80)
    print("EXAMPLE 3: RECOMMENDATION SYSTEM")
    print("="*80)
    
    manager = UserInteractionManager("news_recommender.db")
    
    # Get some news to click on
    db = NewsDatabase("news_recommender.db")
    all_news = db.get_all_news_items(limit=10)
    db.close()
    
    if all_news.empty:
        print("⚠️ No news items in database. Please fetch some news first.")
        return
    
    user_id = "user_456"
    
    # Simulate user clicking on different categories
    print("\n1. Simulating user clicks on various news items...")
    for idx, row in all_news.head(5).iterrows():
        manager.record_click(user_id, row['news_id'])
        print(f"   ✓ User clicked: {row['title'][:50]}...")
    
    # Get user preferences
    print("\n2. Analyzing user preferences...")
    preferences = manager.get_user_preferences(user_id)
    print(f"   Total clicks: {preferences['total_clicks']}")
    print(f"   Unique news clicked: {preferences['unique_news_clicked']}")
    print(f"   Preferred categories: {preferences['preferred_categories']}")
    print(f"   Top categories: {preferences['most_clicked_categories']}")
    
    # Get recommendations
    print("\n3. Getting recommendations for user...")
    recommendations = manager.get_recommendations_for_user(user_id, limit=5)
    
    if not recommendations.empty:
        print(f"   Found {len(recommendations)} recommendations:")
        for idx, row in recommendations.iterrows():
            print(f"   - {row['title'][:50]}...")
            print(f"     Categories: {row['top_3_labels']}")
    else:
        print("   No recommendations available")
    
    manager.close()


def main():
    """Run all examples"""
    print("\n" + "="*80)
    print("NEWS RECOMMENDER DATABASE SYSTEM - EXAMPLE USAGE")
    print("="*80)
    
    # Example 1: News Items Database
    example_news_items_database()
    
    # Example 2: User Interactions Database
    example_user_interactions_database()
    
    # Example 3: Recommendation System
    example_recommendation_system()
    
    print("\n" + "="*80)
    print("ALL EXAMPLES COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()

