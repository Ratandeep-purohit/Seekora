# System Architecture Document
**Project:** Seekora – Scalable Web Search Engine  
**Version:** 1.0  
**Date:** 2026-02-14  

---

## 1. Architectural Overview

Seekora is designed as a **distributed, event-driven microservices system**. Unlike a monolithic application where crawling, indexing, and serving happen in a single process, Seekora decouples these heavy operations to ensure scalability, fault tolerance, and independent deployment.

### 1.1 Architectural Style: Microservices
We chose a microservices architecture to handle the distinct resource profiles of search engine components:
*   **Crawlers** are I/O bound (network heavy).
*   **Indexers** are CPU/Disk bound (parsing & writing).
*   **Search/Ranking** is Memory/CPU bound (fast retrieval & matrix math).

Decoupling allows us to scale the *Crawler* fleet to 100+ nodes without affecting the *Search API* latency.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph "Client Layer"
        User[User Browser]
        Dev[Developer API]
    end

    subgraph "API Gateway / Load Balancer"
        LB[Nginx / API Gateway]
    end

    subgraph "Service Layer"
        QS[Query Service]
        CS[Crawler Service]
        IS[Indexer Service]
        RS[Ranking Service]
    end

    subgraph "Message Broker"
        Kafka[Apache Kafka / RabbitMQ]
        Topic_URL[Topic: new_urls]
        Topic_Content[Topic: raw_content]
    end

    subgraph "Data Storage Layer"
        Redis[Redis (Cache/Frontier)]
        ES[Elasticsearch (Inverted Index)]
        PG[PostgreSQL (Metadata/Analytics)]
        S3[Object Storage (Raw HTML)]
    end

    User --> LB
    Dev --> LB
    LB --> QS
    
    QS --> Redis
    QS --> RS
    RS --> ES
    
    CS --> Redis
    CS --> Topic_Content
    CS --> Topic_URL
    
    Topic_Content --> IS
    IS --> ES
    IS --> PG
    IS --> S3
```

---

## 3. Core Components

### 3.1 Web Crawler (The "Spider")
*   **Role:** Autonomous discovery and downloading of web pages.
*   **Key Responsibilities:**
    *   **URL Frontier:** Manages the priority queue of URLs (BFS/DFS strategies).
    *   **Politeness:** Enforces per-domain rate limits (e.g., 1 request/sec per host).
    *   **Fetcher:** Async HTTP client to download HTML.
    *   **Robots.txt Parser:** Ensures legal compliance.
*   **Tech:** Python (Scrapy/Aiohttp), Redis (Frontier).

### 3.2 Indexer Service
*   **Role:** Transforms raw HTML into searchable data structures.
*   **Key Responsibilities:**
    *   **Parsing:** Extracts text, title, metadata, and outlinks.
    *   **Analysis:** Tokenization, stemming (Porter Stemmer), stop-word removal.
    *   **Inversion:** Maps terms to document IDs (Inverted Index).
    *   **Duplicate Detection:** Uses SimHash to discard near-duplicate content.
*   **Tech:** Python, Apache Tika (Extraction), Elasticsearch.

### 3.3 Ranking Engine
*   **Role:** Sorts results by relevance to the user's query.
*   **Key Responsibilities:**
    *   **Retrieval:** Fetches candidate documents using BM25.
    *   **Re-Ranking:** Applies ML models (Learning to Rank) based on features like PageRank, click-through rate, and domain authority.
*   **Tech:** Scikit-Learn (ML Models), NumPy.

### 3.4 Query Processor
*   **Role:** Understands and enriches user queries before search.
*   **Key Responsibilities:**
    *   **Spell Check:** Corrects "pyhton" -> "python".
    *   **Query Expansion:** Adds synonyms (e.g., "car" -> "automobile").
    *   **Result Highlighting:** Generates snippets with bolded keywords.
*   **Tech:** NLTK, spaCy.

---

## 4. Technology Stack & Justification

| Component | Technology | Justification |
| :--- | :--- | :--- |
| **Backend Language** | **Python** | Unrivaled ecosystem for NLP (NLTK, spaCy), crawling (Scrapy), and AI. Ideal for rapid iteration in search logic. |
| **Search Engine** | **Elasticsearch** (Lucene) | Industry standard. Handles sharding, replication, and BM25 scoring out-of-the-box. Writing a distributed index from scratch is anti-pattern for this scope. |
| **Message Broker** | **Kafka / RabbitMQ** | Decouples the high-speed crawler from the slower indexer. Prevents system backpressure crashes. |
| **Caching** | **Redis** | Sub-millisecond latency for the URL Frontier and caching hot search results. Essential for performance. |
| **Database** | **PostgreSQL** | ACID compliance for critical data like user accounts, API keys, and crawler analytics. |
| **Raw Storage** | **MinIO / S3** | Storing the full raw HTML body is cheaper in object storage than in a database or search index. |
| **Frontend** | **React / Next.js** | Server-Side Rendering (SEO friendly) and fast, interactive UI for search results. |

---

## 5. Data Flow Strategies

### 5.1 Ingestion Pipeline (Write Path)
1.  **Seed Injection:** Admin inputs seeds (e.g., `mit.edu`) into Redis.
2.  **Fetch:** Crawler pops URL from Redis, downloads HTML.
3.  **Publish:** Raw HTML is pushed to Kafka topic `raw_content`.
4.  **Process:** Indexer subscribes to `raw_content`.
    *   Saves HTML to Object Storage.
    *   Extracts Text & Metadata.
    *   Calculates SimHash.
5.  **Index:** Clean JSON document is sent to Elasticsearch.

### 5.2 Query Pipeline (Read Path)
1.  **Request:** User types "Quantum Computing papers".
2.  **Cache Check:** Query Service checks Redis for exact match key.
3.  **Analysis:** NLP pipeline standardizes query (remove stopwords, fix spelling).
4.  **Search:** Elasticsearch executes boolean query with BM25 scoring.
5.  **Enrichment:** Ranker adjusts scores based on PageRank (static score).
6.  **Response:** JSON response returned to UI (< 200ms target).

---

## 6. Scalability & Constraints

### 6.1 Scaling
*   **Horizontal Scaling:** We can add more Crawler nodes to increase throughput (Pages/Second).
*   **Sharding:** Elasticsearch index is sharded (e.g., 5 primary shards) to distribute data across nodes.

### 6.2 Constraints
*   **Storage:** Index size grows linearly with web data. We implement strict storage quotas and "Hot/Warm" architecture.
*   **Network:** Crawlers consume significant bandwidth. We implement strict domain-level concurrency limits to be good internet citizens.
