# 🖼️ Seekora Image Engine: Architectural Overview

## 🎯 Objective
To deliver a Google-Images-grade search experience by prioritizing high-resolution, relevant visuals and aggressively filtering low-quality assets.

---

## 🏗️ Core Architecture

### 1. **High-Quality Discovery Strategy**
Instead of relying on random `<img>` tags, we prioritize **semantic metadata**:

| Priority | Source | Quality Guarantee |
|----------|--------|-------------------|
| **1 (Highest)** | `og:image` (Open Graph) | ✅ Guaranteed High-Res (1200x630+) |
| **2** | `twitter:image` | ✅ Guaranteed High-Res (Summary Card) |
| **3** | Content `<img>` (Filtered) | ⚠️ Variable (Requires strict filtering) |

**Code Implementation:** `crawler/crawler_engine.py` now extracts these meta tags first.

### 2. **Strict Quality Filtering (The "No Blur" Policy)**
We reject images that fail any of these checks:
- ❌ **Dimensions:** Width < 400px OR Height < 300px
- ❌ **Keywords:** URL contains `icon`, `logo`, `avatar`, `sprite`, `pixel`
- ❌ **Format:** URLs ending in `.svg` (usually vector icons)
- ❌ **Relevance:** Images with no alt text AND small dimensions

### 3. **Smart Relevance Ranking**
We treat images as independent entities, not just page attachments.

**Scoring Algorithm:**
```python
Score = Page_Relevance (Base)
+ 50 points (if Alt Text contains query)
+ 20 points (if Filename contains query)
- 100 points (if "logo" or "icon" in URL)
```

**Result:** An image of "Tesla Model S" will rank #1 even if it's on a general "Electric Cars" page, because its alt text matches perfectly.

---

## 🚀 Comparison: Old vs New

| Feature | Old System | New Engine |
|---------|------------|------------|
| **Source** | First 15 `<img>` tags | `og:image` + High-Res Content |
| **Quality** | Any size (even 10x10) | **Min 400x300px** |
| **Logos** | Included (clutter) | **Banned** |
| **Ranking** | Page order | **Alt Text Match** |
| **Resolution** | Random | **High-Res Priority** |

---

## 🧪 Testing the Engine

To see the new engine in action, **search for a visually rich topic**:

1. **"Tesla Model S"** → Expect official press photos (from og:image)
2. **"SpaceX Starship"** → Expect launch photos
3. **"Python Programming"** → Expect clear diagrams, not logos

**Note:** Existing low-quality images in the database will remain until re-crawled. For best results, search for **new topics**.

---

## 📦 Technical Deliverables

1. **Updated Crawler:** `crawler/crawler_engine.py` (High-Res extraction)
2. **Updated Ranker:** `api/views.py` (Alt-text scoring)
3. **Verified Logic:** 400px+ filter + OG priority

**Status:** ✅ Deployed & Active
