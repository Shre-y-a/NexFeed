#!/bin/bash

# News Recommender Web Application Startup Script

echo "=========================================="
echo "News Recommender Web Application"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if model file exists
if [ ! -f "backend/ai_models/news_classifier_model.pkl" ]; then
    echo ""
    echo "⚠️  WARNING: news_classifier_model.pkl not found!"
    echo "   The app will work but won't be able to classify new articles."
    echo ""
fi

# Start the application
echo ""
echo "Starting Flask application..."
echo "Open your browser and navigate to: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
python app.py

