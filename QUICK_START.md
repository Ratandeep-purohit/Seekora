# 🚀 Seekora Quick Start Guide

**Get your production-grade search engine running in 5 minutes!**

---

## ⚡ Prerequisites

- Python 3.10+ installed
- Node.js 18+ installed
- MySQL 8.0+ running
- Git (optional)

---

## 📦 Step 1: Backend Setup

### 1.1 Navigate to Project
```bash
cd d:/projects/Seekora
```

### 1.2 Activate Virtual Environment
```bash
# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

### 1.3 Install Dependencies
```bash
pip install django djangorestframework mysqlclient beautifulsoup4 requests django-cors-headers
```

### 1.4 Configure Database
Edit `Seekora/settings.py` (if needed):
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'seekora_db',
        'USER': 'your_mysql_user',
        'PASSWORD': 'your_mysql_password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

### 1.5 Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 1.6 Start Django Server
```bash
python manage.py runserver
```

**✅ Backend running at:** http://localhost:8000

---

## 🎨 Step 2: Frontend Setup

### 2.1 Open New Terminal
```bash
cd d:/projects/Seekora/client
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Start Development Server
```bash
npm run dev
```

**✅ Frontend running at:** http://localhost:5173

---

## 🧪 Step 3: Test the System

### Test 1: Open Browser
Navigate to: **http://localhost:5173**

### Test 2: Search for Something New
Try searching for: **"quantum computing breakthroughs 2026"**

**What happens:**
1. Query is processed (spell check, stemming)
2. Local index is searched (likely 0 results)
3. Live crawler is triggered automatically
4. DuckDuckGo discovers 20 URLs
5. Robots.txt is checked for each domain
6. Pages are crawled with rate limiting
7. Content is extracted and indexed
8. Results are returned with real stats

**Watch the Django console for live logs:**
```
🔍 Discovered 20 URLs for query: quantum computing breakthroughs 2026
🌐 Triggering live crawl (local results: 0)
✅ Loaded robots.txt from https://example.com
⏳ Rate limiting example.com: waiting 0.95s
✅ Crawled: https://example.com/quantum-computing
📊 Crawl Stats: {'urls_discovered': 20, 'urls_crawled': 18, ...}
```

### Test 3: Search Again
Search for the same query again.

**What happens:**
- Results are instant (from local index)
- No live crawling needed
- Query time: ~50ms vs ~2.5s

**This is how Seekora learns!**

---

## 🎯 What to Look For

### In the Browser
1. **Real Statistics:**
   - "About 18 results (2.341 seconds)"
   - "• Live crawled 18 pages"

2. **Federated Results:**
   - Web pages with snippets
   - Featured images
   - Videos (if found)

3. **Tab Switching:**
   - All / Images / Videos tabs work

### In Django Console
1. **Query Processing:**
   ```
   🔧 Spell corrections: {'pyhton': 'python'}
   🗑️ Removed stopwords: ['the', 'best']
   ```

2. **Crawler Activity:**
   ```
   🔍 Discovered 20 URLs
   ✅ Crawled: https://...
   🚫 Blocked by robots.txt: https://...
   ⏱️ Timeout: https://...
   ```

3. **Statistics:**
   ```
   📊 Crawl Stats: {
     'urls_discovered': 20,
     'urls_crawled': 18,
     'urls_blocked': 1,
     'urls_failed': 1
   }
   ```

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'crawler.robots_parser'"
**Solution:**
```bash
# Make sure you're in the project root
cd d:/projects/Seekora
# Restart Django server
python manage.py runserver
```

### Issue: "No module named 'MySQLdb'"
**Solution:**
```bash
pip install mysqlclient
# If that fails on Windows:
pip install pymysql
# Then add to Seekora/__init__.py:
import pymysql
pymysql.install_as_MySQLdb()
```

### Issue: Frontend shows "Neural Link Interrupt"
**Solution:**
- Check Django server is running on port 8000
- Check CORS is enabled in Django settings
- Check browser console for errors

### Issue: No results found
**Solution:**
- This is normal for first searches!
- The system will automatically crawl the internet
- Wait 2-5 seconds for live crawling to complete
- Check Django console for crawl activity

### Issue: Crawling is slow
**Solution:**
- This is expected (respecting rate limits)
- Each domain is limited to 1 request/second
- This is ethical and legal behavior
- Results are cached for future searches

---

## 🎓 Understanding the System

### First Search (Cold Query)
```
User searches "quantum computing"
↓
Query processing (5ms)
↓
Local search: 0 results
↓
Live crawl triggered:
  - DuckDuckGo discovery (500ms)
  - Robots.txt checks (200ms)
  - Rate-limited crawling (1500ms)
  - Indexing (100ms)
↓
Results returned (2.3s total)
```

### Second Search (Hot Query)
```
User searches "quantum computing" again
↓
Query processing (5ms)
↓
Local search: 18 results
↓
No live crawl needed
↓
Results returned (50ms total)
```

**This is how real search engines work!**

---

## 📚 Next Steps

### Learn More
1. Read `README.md` for full documentation
2. Read `TECHNICAL_DEEP_DIVE.md` for architecture details
3. Read `IMPLEMENTATION_SUMMARY.md` for testing guide

### Customize
1. Edit `crawler/query_processor.py` to add more spell corrections
2. Edit `crawler/rate_limiter.py` to adjust rate limits
3. Edit `api/views.py` to customize ranking weights

### Extend
1. Add Redis caching (see roadmap)
2. Implement SimHash deduplication
3. Add PageRank calculation
4. Integrate machine learning ranking

---

## 🎉 You're Ready!

Your production-grade search engine is now running!

**Key Features:**
- ✅ Learns from every search
- ✅ Respects robots.txt
- ✅ Rate-limited crawling
- ✅ Intelligent query processing
- ✅ Real-time statistics
- ✅ No fake data

**Start searching and watch it learn! 🚀**

---

## 💡 Pro Tips

1. **Search for niche topics** to see live crawling in action
2. **Search again** to see instant results from cache
3. **Watch the Django console** for detailed logs
4. **Try misspelled queries** to see spell correction
5. **Use the Images/Videos tabs** to see federated search

**Enjoy your production-grade search engine!**
