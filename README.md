# NewsSphere — AI-Powered News Recommender

NewsSphere is a modern news reading web app that learns what you like. It serves real-time news across multiple topics and recommends articles tailored specifically to your reading habits over time.

🔗 **Live Demo**: `https://nexfeed-front.onrender.com`

---

## 🌟 Key Features

* **Personalized Recommendations** — A smart "For You" feed that adapts to the articles you click and read.
* **Live News Feed** — Up-to-date stories across Technology, Science, Sports, Business, and Health.
* **Social & Secure Login** — Quick sign-in using Google, GitHub, or standard email.
* **Bookmarks & Collections** — Save your favorite articles into custom reading lists.
* **Reading Analytics** — Visual charts showing your top categories, sources, and reading activity.
* **Full-Text Search & Filters** — Easily search topics or filter news by category.

---

## 🛠️ Tech Stack

**Frontend**

* React
* Vite
* Vanilla CSS / Tailwind (Dark theme)

**Backend**

* Python
* Flask
* SQLite
* Gunicorn

**Machine Learning & Data**

* scikit-learn (TF-IDF + Random Forest Classifier)
* External News API

**Deployment**

* Render (Static Site + Web Service)

---

## 🚀 Getting Started Locally

### 1. Backend Setup

```bash
# Clone the repository
git clone ____
cd ____

# Set up virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
cd backend
python app.py

```

### 2. Frontend Setup

```bash
# In a new terminal window
cd client

# Install packages
npm install

# Start the dev server
npm run dev

```
