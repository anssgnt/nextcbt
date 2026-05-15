# Design Document: CBT Scalable 1000 Siswa Concurrent

## Overview

Sistem CBT dirancang untuk mendukung 1000 siswa concurrent dengan infrastruktur terbatas (Supabase Free + Vercel Free). Strategi utama:
- **Offline-First**: Semua data soal di-sync H-1, ujian berjalan offline
- **Minimal API Calls**: Max 1 call per 5 menit, batch submission saat selesai
- **Smart Caching**: Service Worker + IndexedDB + stale-while-revalidate
- **Rate Limiting**: 12 req/min per user, sliding window algorithm
- **Batch Processing**: Semua jawaban submit dalam 1 request
- **Progressive Sync**: Staggered sync untuk prevent spike

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Browser)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │Service Worker│  │  IndexedDB   │      │
│  │              │  │  (Caching)   │  │  (Offline)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  Sync Manager  │                        │
│                    │  (Conflict Res)│                        │
│                    └───────┬────────┘                        │
└─────────────────────────────┼──────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Rate Limiter     │
                    │  (12 req/min)     │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  Vercel Edge   │  │  Supabase API   │  │  Supabase DB    │
│  (Rate Limit)  │  │  (Batch Ops)    │  │  (Optimized)    │
└────────────────┘  └─────────────────┘  └─────────────────┘
```

## 1. Architecture Diagram (Offline-First + Sync Strategy)

### Data Flow Architecture

```
SYNC PHASE (H-1):
┌─────────────┐
│   Student   │
│   Login     │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Check Sync Window (24h before exam) │
└──────┬───────────────────────────────┘
       │
       ├─ YES ──▶ Trigger Pre-Sync
       │         ├─ Fetch Questions (with JOIN)
       │         ├─ Compress (gzip)
       │         ├─ Store to IndexedDB
       │         └─ Mark as "Ready Offline"
       │
       └─ NO ──▶ Continue to Dashboard

EXAM PHASE (Offline):
┌──────────────────────────────────────┐
│  Student Opens Exam                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Load from IndexedDB (instant)       │
│  - Questions                         │
│  - Options                           │
│  - Metadata                          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Student Works Offline               │
│  - Save answers to IndexedDB         │
│  - Local timer (device time)         │
│  - No API calls                      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Student Clicks "Selesai Ujian"      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Batch Submission                    │
│  - Collect all answers               │
│  - Compress payload                  │
│  - Add checksum                      │
│  - Send 1 request                    │
└──────┬───────────────────────────────┘
       │
       ├─ SUCCESS ──▶ Show Confirmation
       │
       └─ FAIL ──▶ Save to IndexedDB
                  Auto-retry when online

SYNC PHASE (After Exam):
┌──────────────────────────────────────┐
│  Background Sync                     │
│  - Retry failed submissions          │
│  - Sync new data                     │
│  - Update cache                      │
│  - Stale-while-revalidate            │
└──────────────────────────────────────┘
```

### Caching Layers

```
LAYER 1: Service Worker Cache
├─ Static Assets (JS, CSS, images)
├─ Strategy: Cache-first, 30 day expiry
└─ Size: ~5MB

LAYER 2: IndexedDB (Structured)
├─ Questions (indexed by exam_id, question_id)
├─ Answers (indexed by student_id, exam_id)
├─ Metadata (indexed by created_at)
├─ Strategy: LRU eviction at 50MB
└─ Size: ~50MB per device

LAYER 3: Memory Cache (Runtime)
├─ Current exam session
├─ Active questions
├─ User preferences
└─ Size: ~5MB

LAYER 4: Server Cache (Supabase)
├─ Materialized views for reports
├─ Aggregated statistics
├─ Strategy: 1 hour TTL
└─ Size: Unlimited (Supabase)
```



## 2. Database Schema (Optimized untuk Batch Operations)

### Table Structure

```sql
-- EXAMS TABLE
CREATE TABLE exams (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_minutes INT NOT NULL,
  total_questions INT NOT NULL,
  passing_score INT,
  enable_presync BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_start_time (start_time),
  INDEX idx_enable_presync (enable_presync)
);

-- QUESTIONS TABLE (Denormalized untuk fast fetch)
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id),
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50), -- multiple_choice, essay, true_false
  image_url VARCHAR(500),
  image_webp_url VARCHAR(500),
  explanation TEXT,
  difficulty_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_exam_id (exam_id),
  INDEX idx_exam_question (exam_id, question_number),
  UNIQUE KEY unique_exam_question (exam_id, question_number)
);

-- OPTIONS TABLE (Denormalized untuk fast fetch)
CREATE TABLE options (
  id UUID PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id),
  option_number INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_question_id (question_id),
  UNIQUE KEY unique_question_option (question_id, option_number)
);

-- ANSWERS TABLE (Partitioned by exam_id for scalability)
CREATE TABLE answers (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_option_id UUID,
  answer_text TEXT,
  time_spent_seconds INT,
  is_flagged BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes (CRITICAL for batch queries)
  INDEX idx_exam_student (exam_id, student_id),
  INDEX idx_student_exam (student_id, exam_id),
  INDEX idx_submitted_at (submitted_at),
  INDEX idx_exam_submitted (exam_id, submitted_at),
  
  -- Partition by exam_id (if supported)
  PARTITION BY LIST (exam_id)
);

-- EXAM_SESSIONS TABLE (Track student exam sessions)
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id),
  student_id UUID NOT NULL,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  status VARCHAR(50), -- in_progress, submitted, abandoned
  total_answered INT DEFAULT 0,
  sync_status VARCHAR(50), -- pending, synced, failed
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_exam_student (exam_id, student_id),
  INDEX idx_status (status),
  INDEX idx_sync_status (sync_status),
  UNIQUE KEY unique_exam_student (exam_id, student_id)
);

-- SYNC_QUEUE TABLE (For failed submissions)
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL,
  exam_id UUID NOT NULL,
  payload JSONB NOT NULL, -- Compressed batch data
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  status VARCHAR(50), -- pending, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_status (status),
  INDEX idx_student_exam (student_id, exam_id),
  INDEX idx_created_at (created_at)
);

-- RATE_LIMIT_TRACKER TABLE
CREATE TABLE rate_limit_tracker (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint VARCHAR(255),
  request_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  window_end TIMESTAMP,
  is_blocked BOOLEAN DEFAULT false,
  block_until TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_endpoint (user_id, endpoint),
  INDEX idx_window (window_start, window_end),
  UNIQUE KEY unique_user_window (user_id, endpoint, window_start)
);

-- MATERIALIZED VIEW untuk Reports (Updated hourly)
CREATE MATERIALIZED VIEW exam_statistics AS
SELECT 
  exam_id,
  COUNT(DISTINCT student_id) as total_students,
  COUNT(*) as total_answers,
  AVG(time_spent_seconds) as avg_time_spent,
  COUNT(CASE WHEN is_flagged THEN 1 END) as flagged_count,
  MAX(submitted_at) as last_submission,
  CURRENT_TIMESTAMP as updated_at
FROM answers
GROUP BY exam_id;

-- Index on materialized view
CREATE INDEX idx_exam_stats_exam_id ON exam_statistics(exam_id);
```

### Indexing Strategy

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| questions | exam_id | B-tree | Fast fetch all questions for exam |
| questions | exam_id, question_number | Composite | Unique constraint + fast lookup |
| options | question_id | B-tree | Fast fetch options for question |
| answers | exam_id, student_id | Composite | Batch query for student answers |
| answers | student_id, exam_id | Composite | Query by student |
| answers | submitted_at | B-tree | Time-based queries |
| exam_sessions | exam_id, student_id | Composite | Session lookup |
| sync_queue | status | B-tree | Find pending syncs |
| rate_limit_tracker | user_id, endpoint | Composite | Rate limit checks |

### Data Compression Strategy

```
QUESTION PAYLOAD (Before):
{
  "id": "uuid",
  "exam_id": "uuid",
  "question_number": 1,
  "question_text": "...",
  "image_url": "...",
  "options": [
    {"id": "uuid", "option_text": "...", "is_correct": true}
  ]
}
Size: ~2KB per question

QUESTION PAYLOAD (After - Compact):
{
  "id": "q1",
  "e": "e1",
  "n": 1,
  "t": "...",
  "i": "...",
  "o": [
    {"id": "o1", "t": "...", "c": true}
  ]
}
Size: ~1.2KB per question (40% reduction)

GZIP COMPRESSION:
1000 questions × 1.2KB = 1.2MB
After gzip: ~300KB (75% reduction)
```



## 3. API Endpoints (Minimal Calls, Batch Submission)

### Endpoint Design Principles

1. **Batch Operations**: Semua data dalam 1 request
2. **Compression**: Request/response di-gzip
3. **Caching**: Leverage HTTP caching headers
4. **Rate Limiting**: Per-endpoint limits

### Core Endpoints

#### 1. Pre-Sync Endpoint
```
GET /api/v1/exams/{examId}/questions
Query Params:
  - format=compact (optional, default: true)
  - include_images=true|false (default: true)

Response (200 OK):
{
  "exam": {
    "id": "e1",
    "title": "Math Test",
    "duration": 120,
    "total_questions": 50
  },
  "questions": [
    {
      "id": "q1",
      "n": 1,
      "t": "Question text...",
      "i": "image_url",
      "o": [
        {"id": "o1", "t": "Option A", "c": false},
        {"id": "o2", "t": "Option B", "c": true}
      ]
    }
  ],
  "checksum": "abc123def456"
}

Headers:
  Content-Encoding: gzip
  Cache-Control: public, max-age=86400
  ETag: "abc123def456"

Rate Limit: 1 req per student per exam
Expected Size: ~300KB (gzipped)
```

#### 2. Batch Submit Endpoint
```
POST /api/v1/exams/{examId}/submit
Content-Type: application/json
Content-Encoding: gzip

Request Body:
{
  "student_id": "s1",
  "session_id": "sess1",
  "answers": [
    {
      "q_id": "q1",
      "a": "o1",  // option_id or text
      "t": 45     // time_spent_seconds
    },
    {
      "q_id": "q2",
      "a": "Essay answer text...",
      "t": 120
    }
  ],
  "metadata": {
    "device": "mobile",
    "browser": "Chrome",
    "offline_duration": 1800
  },
  "checksum": "xyz789"
}

Response (200 OK):
{
  "success": true,
  "submission_id": "sub1",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Jawaban berhasil disimpan"
}

Response (409 Conflict):
{
  "success": false,
  "error": "duplicate_submission",
  "message": "Submission sudah pernah dikirim"
}

Rate Limit: 1 req per student per exam
Expected Size: ~50KB (gzipped for 50 questions)
```

#### 3. Auto-Save Endpoint (Optional, max 1 per 5 min)
```
POST /api/v1/exams/{examId}/autosave
Content-Type: application/json

Request Body:
{
  "student_id": "s1",
  "session_id": "sess1",
  "answers": [
    {"q_id": "q1", "a": "o1", "t": 45}
  ]
}

Response (200 OK):
{
  "success": true,
  "saved_count": 1,
  "timestamp": "2024-01-15T10:30:00Z"
}

Rate Limit: 1 req per 5 minutes per student
```

#### 4. Sync Status Endpoint
```
GET /api/v1/sync-queue/status
Query Params:
  - student_id=s1

Response (200 OK):
{
  "pending_syncs": 0,
  "last_sync": "2024-01-15T10:30:00Z",
  "status": "synced"
}

Rate Limit: 1 req per minute per student
```

#### 5. Exam Session Endpoint
```
POST /api/v1/exams/{examId}/session/start
Request Body:
{
  "student_id": "s1"
}

Response (200 OK):
{
  "session_id": "sess1",
  "exam": {
    "id": "e1",
    "title": "Math Test",
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T12:00:00Z"
  },
  "cached": true  // true if loaded from cache
}

Rate Limit: 1 req per student per exam
```

### Rate Limiting Strategy

```
SLIDING WINDOW ALGORITHM:

User: student_1
Endpoint: /api/v1/exams/{examId}/submit
Limit: 12 requests per 60 seconds

Timeline:
T=0s:   req1 ✓ (1/12)
T=2s:   req2 ✓ (2/12)
T=4s:   req3 ✓ (3/12)
...
T=50s:  req12 ✓ (12/12)
T=52s:  req13 ✗ (Rate limited)
        Response: 429 Too Many Requests
        Retry-After: 8 seconds

T=60s:  Window slides, req1 expires
        req13 ✓ (1/12)

BLOCKING MECHANISM:
- If user exceeds limit 3 times in 5 minutes
- Block user for 15 minutes
- Log attempt for admin review
```

### Batch Submission Format

```
COMPACT FORMAT (Optimized):
{
  "sid": "student_id",
  "eid": "exam_id",
  "a": [
    {"q": "q1", "v": "o1", "t": 45},
    {"q": "q2", "v": "essay text", "t": 120}
  ],
  "m": {
    "d": "mobile",
    "b": "Chrome",
    "od": 1800
  },
  "cs": "checksum"
}

Size: ~30KB for 50 questions
After gzip: ~8KB (73% reduction)

DECOMPRESSION ON SERVER:
1. Decompress gzip
2. Expand compact keys to full names
3. Validate checksum
4. Insert to answers table (batch insert)
5. Update exam_sessions
6. Return success
```



## 4. Service Worker Strategy (Caching & Sync)

### Service Worker Lifecycle

```
INSTALLATION PHASE:
1. Cache static assets (JS, CSS, images)
2. Pre-cache critical files
3. Set cache version

ACTIVATION PHASE:
1. Clean up old caches
2. Update cache version
3. Activate new service worker

FETCH PHASE:
1. Intercept all requests
2. Apply caching strategy
3. Handle offline scenarios
```

### Caching Strategies

```javascript
// STRATEGY 1: Cache-First (Static Assets)
// Used for: JS, CSS, images, fonts
// Fallback: Network
// TTL: 30 days

GET /static/app.js
├─ Check Service Worker Cache
│  ├─ HIT: Return cached version
│  └─ MISS: Fetch from network
├─ Store in cache
└─ Return response

// STRATEGY 2: Network-First (API Calls)
// Used for: API endpoints
// Fallback: Cache
// TTL: 5 minutes

GET /api/v1/exams/{examId}/questions
├─ Try network request
│  ├─ SUCCESS: Cache response + return
│  └─ FAIL: Check cache
├─ If cached: Return cached version
└─ If not cached: Return offline error

// STRATEGY 3: Stale-While-Revalidate (Dashboard)
// Used for: Dashboard data
// Fallback: Cache
// TTL: 1 hour

GET /api/v1/dashboard
├─ Return cached version immediately
├─ Fetch fresh data in background
├─ Update cache when fresh data arrives
└─ Notify UI of update (optional)
```

### Service Worker Implementation

```javascript
// sw.js - Service Worker

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/manifest.json'
];

// INSTALL: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ACTIVATE: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// FETCH: Apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Static assets: Cache-first
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
  
  // API calls: Network-first
  else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
  }
  
  // HTML: Stale-while-revalidate
  else if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
  
  // Default: Network-first
  else {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// BACKGROUND SYNC: Retry failed submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-answers') {
    event.waitUntil(syncAnswers());
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });
  
  return cached || fetchPromise;
}

async function syncAnswers() {
  const db = await openIndexedDB();
  const syncQueue = await db.getAll('syncQueue');
  
  for (const item of syncQueue) {
    try {
      const response = await fetch('/api/v1/exams/submit', {
        method: 'POST',
        body: JSON.stringify(item.payload),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await db.delete('syncQueue', item.id);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

## 5. IndexedDB Structure

### Database Schema

```javascript
// IndexedDB Database: cbt_offline_db
// Version: 1

const DB_NAME = 'cbt_offline_db';
const DB_VERSION = 1;

const STORES = {
  exams: {
    keyPath: 'id',
    indexes: [
      { name: 'start_time', keyPath: 'start_time' }
    ]
  },
  
  questions: {
    keyPath: 'id',
    indexes: [
      { name: 'exam_id', keyPath: 'exam_id' },
      { name: 'exam_question', keyPath: ['exam_id', 'question_number'] }
    ]
  },
  
  options: {
    keyPath: 'id',
    indexes: [
      { name: 'question_id', keyPath: 'question_id' }
    ]
  },
  
  answers: {
    keyPath: 'id',
    indexes: [
      { name: 'exam_student', keyPath: ['exam_id', 'student_id'] },
      { name: 'student_exam', keyPath: ['student_id', 'exam_id'] },
      { name: 'created_at', keyPath: 'created_at' }
    ]
  },
  
  syncQueue: {
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'created_at', keyPath: 'created_at' }
    ]
  },
  
  metadata: {
    keyPath: 'key'
  }
};

// INITIALIZATION
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      Object.entries(STORES).forEach(([storeName, config]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: config.keyPath
          });
          
          config.indexes.forEach((index) => {
            store.createIndex(index.name, index.keyPath);
          });
        }
      });
    };
  });
}

// STORAGE MANAGEMENT
class IndexedDBManager {
  constructor(db) {
    this.db = db;
    this.maxSize = 50 * 1024 * 1024; // 50MB
  }
  
  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100
      };
    }
    return null;
  }
  
  async ensureSpace(requiredSize) {
    const usage = await this.getStorageUsage();
    
    if (usage && (usage.usage + requiredSize) > this.maxSize) {
      await this.evictOldData();
    }
  }
  
  async evictOldData() {
    // LRU Eviction: Delete oldest answers first
    const tx = this.db.transaction('answers', 'readwrite');
    const store = tx.objectStore('answers');
    const index = store.index('created_at');
    
    const range = IDBKeyRange.upperBound(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
    );
    
    const request = index.openCursor(range);
    let deleted = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && deleted < 1000) {
        cursor.delete();
        deleted++;
        cursor.continue();
      }
    };
  }
  
  async saveQuestions(examId, questions) {
    await this.ensureSpace(questions.length * 2000);
    
    const tx = this.db.transaction('questions', 'readwrite');
    const store = tx.objectStore('questions');
    
    questions.forEach((q) => {
      store.put({
        ...q,
        exam_id: examId,
        cached_at: new Date()
      });
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async getQuestions(examId) {
    const tx = this.db.transaction('questions', 'readonly');
    const store = tx.objectStore('questions');
    const index = store.index('exam_id');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(examId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async saveAnswer(answer) {
    const tx = this.db.transaction('answers', 'readwrite');
    const store = tx.objectStore('answers');
    
    store.put({
      ...answer,
      created_at: new Date()
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  async getAnswers(examId, studentId) {
    const tx = this.db.transaction('answers', 'readonly');
    const store = tx.objectStore('answers');
    const index = store.index('exam_student');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll([examId, studentId]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async addToSyncQueue(payload) {
    const tx = this.db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    store.put({
      id: crypto.randomUUID(),
      payload,
      status: 'pending',
      created_at: new Date(),
      retry_count: 0
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```



## 6. Rate Limiting Implementation

### Sliding Window Algorithm

```javascript
// Rate Limiter Service (Server-side)

class RateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
    this.limits = {
      'submit': { requests: 1, window: 3600 }, // 1 per hour
      'autosave': { requests: 12, window: 60 }, // 12 per minute
      'sync': { requests: 5, window: 300 }, // 5 per 5 minutes
      'general': { requests: 100, window: 3600 } // 100 per hour
    };
  }
  
  async checkLimit(userId, endpoint) {
    const limit = this.limits[endpoint] || this.limits['general'];
    const key = `rate_limit:${userId}:${endpoint}`;
    
    // Get current count
    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit.requests) {
      // Get TTL for retry-after
      const ttl = await this.redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl > 0 ? ttl : limit.window,
        remaining: 0
      };
    }
    
    // Increment counter
    const newCount = count + 1;
    await this.redis.setex(key, limit.window, newCount);
    
    return {
      allowed: true,
      remaining: limit.requests - newCount,
      resetAt: new Date(Date.now() + limit.window * 1000)
    };
  }
  
  async blockUser(userId, duration = 900) {
    const key = `blocked:${userId}`;
    await this.redis.setex(key, duration, '1');
  }
  
  async isBlocked(userId) {
    const key = `blocked:${userId}`;
    const blocked = await this.redis.get(key);
    return blocked === '1';
  }
}

// Middleware untuk Express
async function rateLimitMiddleware(req, res, next) {
  const userId = req.user.id;
  const endpoint = req.path;
  
  // Check if user is blocked
  if (await limiter.isBlocked(userId)) {
    return res.status(429).json({
      error: 'too_many_requests',
      message: 'Akun Anda sementara diblokir karena terlalu banyak request'
    });
  }
  
  // Check rate limit
  const result = await limiter.checkLimit(userId, endpoint);
  
  res.set('X-RateLimit-Limit', result.limit);
  res.set('X-RateLimit-Remaining', result.remaining);
  res.set('X-RateLimit-Reset', result.resetAt);
  
  if (!result.allowed) {
    res.set('Retry-After', result.retryAfter);
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `Terlalu banyak request. Coba lagi dalam ${result.retryAfter} detik`,
      retryAfter: result.retryAfter
    });
  }
  
  next();
}
```

### Client-Side Rate Limiting

```javascript
// Client-side rate limiter (prevent unnecessary requests)

class ClientRateLimiter {
  constructor() {
    this.requests = new Map();
    this.limits = {
      'submit': 1,
      'autosave': 12,
      'sync': 5
    };
    this.windows = {
      'submit': 3600,
      'autosave': 60,
      'sync': 300
    };
  }
  
  canMakeRequest(endpoint) {
    const key = endpoint;
    const limit = this.limits[endpoint] || 100;
    const window = this.windows[endpoint] || 3600;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const timestamps = this.requests.get(key);
    const now = Date.now();
    const windowStart = now - (window * 1000);
    
    // Remove old timestamps
    const filtered = timestamps.filter(t => t > windowStart);
    this.requests.set(key, filtered);
    
    if (filtered.length >= limit) {
      const oldestTime = filtered[0];
      const retryAfter = Math.ceil((oldestTime + (window * 1000) - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        message: `Coba lagi dalam ${retryAfter} detik`
      };
    }
    
    filtered.push(now);
    this.requests.set(key, filtered);
    
    return {
      allowed: true,
      remaining: limit - filtered.length
    };
  }
}

// Usage
const clientLimiter = new ClientRateLimiter();

async function submitAnswers(answers) {
  const check = clientLimiter.canMakeRequest('submit');
  
  if (!check.allowed) {
    showToast(`${check.message}`, 'warning');
    return;
  }
  
  try {
    const response = await fetch('/api/v1/exams/submit', {
      method: 'POST',
      body: JSON.stringify(answers)
    });
    
    if (response.status === 429) {
      const data = await response.json();
      showToast(data.message, 'error');
    }
  } catch (error) {
    console.error('Submit failed:', error);
  }
}
```

## 7. Error Handling Flow

### Error Handling Architecture

```
ERROR DETECTION
    │
    ├─ Network Error
    │  ├─ Offline: Save to IndexedDB, retry when online
    │  ├─ Timeout: Retry with exponential backoff
    │  └─ Connection refused: Show offline message
    │
    ├─ API Error (4xx)
    │  ├─ 400 Bad Request: Show validation error
    │  ├─ 401 Unauthorized: Redirect to login
    │  ├─ 403 Forbidden: Show permission error
    │  ├─ 404 Not Found: Show not found error
    │  └─ 429 Too Many Requests: Show rate limit message
    │
    ├─ API Error (5xx)
    │  ├─ 500 Server Error: Retry with backoff
    │  ├─ 503 Service Unavailable: Show maintenance message
    │  └─ 504 Gateway Timeout: Retry with backoff
    │
    ├─ Data Error
    │  ├─ Checksum mismatch: Retry sync
    │  ├─ Duplicate submission: Show confirmation
    │  └─ Data corruption: Recover from backup
    │
    └─ Storage Error
       ├─ IndexedDB full: Clear old data
       ├─ Quota exceeded: Show storage warning
       └─ Storage unavailable: Fallback to memory
```

### Error Handling Implementation

```javascript
// Error Handler Service

class ErrorHandler {
  constructor() {
    this.retryConfig = {
      maxRetries: 5,
      initialDelay: 1000, // 1 second
      maxDelay: 32000, // 32 seconds
      backoffMultiplier: 2
    };
  }
  
  async handleError(error, context) {
    if (error.name === 'NetworkError' || !navigator.onLine) {
      return this.handleNetworkError(error, context);
    }
    
    if (error.response) {
      return this.handleAPIError(error.response, context);
    }
    
    if (error.name === 'QuotaExceededError') {
      return this.handleStorageError(error, context);
    }
    
    return this.handleUnknownError(error, context);
  }
  
  async handleNetworkError(error, context) {
    console.error('Network error:', error);
    
    // Save to sync queue
    if (context.data) {
      const db = await openIndexedDB();
      await db.addToSyncQueue({
        endpoint: context.endpoint,
        data: context.data,
        timestamp: new Date()
      });
    }
    
    // Show offline message
    showToast('Anda sedang offline. Data akan disimpan dan disync saat online.', 'info');
    
    // Retry when online
    window.addEventListener('online', () => {
      this.retrySync();
    });
  }
  
  async handleAPIError(response, context) {
    const status = response.status;
    const data = await response.json();
    
    switch (status) {
      case 400:
        showToast(`Validasi error: ${data.message}`, 'error');
        break;
      
      case 401:
        showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
        window.location.href = '/login';
        break;
      
      case 403:
        showToast('Anda tidak memiliki akses ke resource ini.', 'error');
        break;
      
      case 404:
        showToast('Resource tidak ditemukan.', 'error');
        break;
      
      case 429:
        const retryAfter = response.headers.get('Retry-After') || 60;
        showToast(`Terlalu banyak request. Coba lagi dalam ${retryAfter} detik.`, 'warning');
        break;
      
      case 500:
      case 503:
        showToast('Server sedang mengalami gangguan. Coba lagi nanti.', 'error');
        // Retry with backoff
        await this.retryWithBackoff(context, 0);
        break;
      
      case 504:
        showToast('Request timeout. Coba lagi.', 'error');
        await this.retryWithBackoff(context, 0);
        break;
      
      default:
        showToast(`Error: ${data.message || 'Unknown error'}`, 'error');
    }
  }
  
  async handleStorageError(error, context) {
    console.error('Storage error:', error);
    
    // Try to free up space
    const db = await openIndexedDB();
    await db.evictOldData();
    
    showToast('Penyimpanan lokal penuh. Beberapa data lama telah dihapus.', 'warning');
  }
  
  async handleUnknownError(error, context) {
    console.error('Unknown error:', error);
    showToast('Terjadi kesalahan yang tidak terduga. Silakan coba lagi.', 'error');
  }
  
  async retryWithBackoff(context, attempt) {
    if (attempt >= this.retryConfig.maxRetries) {
      showToast('Gagal setelah beberapa kali percobaan. Silakan coba lagi nanti.', 'error');
      return;
    }
    
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelay
    );
    
    console.log(`Retry attempt ${attempt + 1} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await fetch(context.endpoint, {
        method: context.method,
        body: JSON.stringify(context.data)
      });
    } catch (error) {
      await this.retryWithBackoff(context, attempt + 1);
    }
  }
  
  async retrySync() {
    const db = await openIndexedDB();
    const syncQueue = await db.getAllFromSyncQueue();
    
    for (const item of syncQueue) {
      try {
        const response = await fetch(item.endpoint, {
          method: 'POST',
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          await db.removeFromSyncQueue(item.id);
          showToast('Data berhasil disync', 'success');
        }
      } catch (error) {
        console.error('Sync retry failed:', error);
      }
    }
  }
}

const errorHandler = new ErrorHandler();
```



## 8. Monitoring Architecture

### Metrics Collection

```javascript
// Metrics Collector Service

class MetricsCollector {
  constructor() {
    this.metrics = {
      api_calls: [],
      cache_hits: 0,
      cache_misses: 0,
      sync_success: 0,
      sync_failures: 0,
      errors: [],
      performance: []
    };
    this.batchSize = 100;
    this.flushInterval = 60000; // 1 minute
    
    this.startFlushTimer();
  }
  
  recordAPICall(endpoint, method, duration, status) {
    this.metrics.api_calls.push({
      endpoint,
      method,
      duration,
      status,
      timestamp: new Date()
    });
    
    if (this.metrics.api_calls.length >= this.batchSize) {
      this.flush();
    }
  }
  
  recordCacheHit(key) {
    this.metrics.cache_hits++;
  }
  
  recordCacheMiss(key) {
    this.metrics.cache_misses++;
  }
  
  recordSyncSuccess(duration) {
    this.metrics.sync_success++;
    this.recordPerformance('sync', duration);
  }
  
  recordSyncFailure(error) {
    this.metrics.sync_failures++;
    this.recordError('sync_failure', error);
  }
  
  recordError(type, error) {
    this.metrics.errors.push({
      type,
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
  }
  
  recordPerformance(operation, duration) {
    this.metrics.performance.push({
      operation,
      duration,
      timestamp: new Date()
    });
  }
  
  getCacheHitRate() {
    const total = this.metrics.cache_hits + this.metrics.cache_misses;
    return total > 0 ? (this.metrics.cache_hits / total) * 100 : 0;
  }
  
  getSyncSuccessRate() {
    const total = this.metrics.sync_success + this.metrics.sync_failures;
    return total > 0 ? (this.metrics.sync_success / total) * 100 : 0;
  }
  
  getAverageAPIResponseTime() {
    if (this.metrics.api_calls.length === 0) return 0;
    const sum = this.metrics.api_calls.reduce((acc, call) => acc + call.duration, 0);
    return sum / this.metrics.api_calls.length;
  }
  
  startFlushTimer() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
  
  async flush() {
    if (this.metrics.api_calls.length === 0 && this.metrics.errors.length === 0) {
      return;
    }
    
    const payload = {
      timestamp: new Date(),
      metrics: {
        api_calls: this.metrics.api_calls.slice(0, this.batchSize),
        cache_hit_rate: this.getCacheHitRate(),
        sync_success_rate: this.getSyncSuccessRate(),
        avg_response_time: this.getAverageAPIResponseTime(),
        errors: this.metrics.errors.slice(0, 50)
      }
    };
    
    try {
      await fetch('/api/v1/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Clear sent metrics
      this.metrics.api_calls = [];
      this.metrics.errors = [];
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }
}

const metricsCollector = new MetricsCollector();

// Wrap fetch to collect metrics
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const startTime = performance.now();
  
  try {
    const response = await originalFetch.apply(this, args);
    const duration = performance.now() - startTime;
    
    const url = new URL(args[0]);
    metricsCollector.recordAPICall(
      url.pathname,
      args[1]?.method || 'GET',
      duration,
      response.status
    );
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    metricsCollector.recordError('fetch_error', error);
    throw error;
  }
};
```

### Monitoring Dashboard Endpoints

```
GET /api/v1/admin/monitoring/dashboard
Response:
{
  "active_users": 847,
  "concurrent_exams": 12,
  "api_quota_usage": {
    "used": 45000,
    "limit": 500000,
    "percentage": 9
  },
  "database_stats": {
    "total_answers": 125000,
    "total_submissions": 847,
    "avg_response_time": 245,
    "p95_response_time": 1200,
    "p99_response_time": 2500
  },
  "cache_stats": {
    "hit_rate": 87.5,
    "miss_rate": 12.5,
    "size_mb": 245
  },
  "sync_stats": {
    "success_rate": 99.2,
    "failure_rate": 0.8,
    "pending_syncs": 3,
    "avg_sync_time": 1200
  },
  "error_stats": {
    "total_errors": 12,
    "error_rate": 0.1,
    "top_errors": [
      {
        "type": "network_error",
        "count": 5,
        "percentage": 41.7
      },
      {
        "type": "timeout",
        "count": 4,
        "percentage": 33.3
      }
    ]
  },
  "alerts": [
    {
      "severity": "warning",
      "message": "API response time > 3s detected",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}

GET /api/v1/admin/monitoring/exams/{examId}
Response:
{
  "exam_id": "e1",
  "exam_title": "Math Test",
  "total_students": 847,
  "submitted": 823,
  "in_progress": 24,
  "abandoned": 0,
  "avg_score": 78.5,
  "avg_time_spent": 3600,
  "submission_timeline": [
    {
      "time": "2024-01-15T10:00:00Z",
      "submissions": 0
    },
    {
      "time": "2024-01-15T10:05:00Z",
      "submissions": 45
    },
    ...
  ],
  "performance_metrics": {
    "avg_response_time": 245,
    "p95_response_time": 1200,
    "cache_hit_rate": 87.5,
    "sync_success_rate": 99.2
  }
}

GET /api/v1/admin/monitoring/quota
Response:
{
  "supabase": {
    "storage_used_mb": 245,
    "storage_limit_mb": 500,
    "storage_percentage": 49,
    "api_calls_used": 45000,
    "api_calls_limit": 500000,
    "api_calls_percentage": 9,
    "monthly_active_users": 1200,
    "monthly_active_users_limit": 2000000
  },
  "vercel": {
    "bandwidth_used_gb": 25,
    "bandwidth_limit_gb": 100,
    "bandwidth_percentage": 25,
    "function_invocations": 450000,
    "function_invocations_limit": 1000000
  },
  "estimated_for_1000_concurrent": {
    "api_calls_per_hour": 12000,
    "storage_needed_mb": 500,
    "bandwidth_needed_gb": 50
  },
  "warnings": [
    {
      "type": "quota_warning",
      "message": "API quota usage at 45%. Estimated to reach 80% in 2 hours.",
      "recommendation": "Consider enabling pre-sync to distribute load"
    }
  ]
}
```

### Real-Time Monitoring

```javascript
// Real-time monitoring using WebSocket

class RealtimeMonitor {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws/monitoring`);
    
    this.ws.onopen = () => {
      console.log('Connected to monitoring');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMonitoringUpdate(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      this.reconnect();
    };
  }
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`Reconnecting in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    }
  }
  
  handleMonitoringUpdate(data) {
    // Update dashboard in real-time
    if (data.type === 'metrics_update') {
      updateDashboard(data.metrics);
    }
    
    if (data.type === 'alert') {
      showAlert(data.alert);
    }
    
    if (data.type === 'quota_warning') {
      showQuotaWarning(data.warning);
    }
  }
}

const realtimeMonitor = new RealtimeMonitor();
realtimeMonitor.connect();
```

### Alert System

```javascript
// Alert Configuration

const ALERT_RULES = [
  {
    name: 'High API Response Time',
    condition: (metrics) => metrics.avg_response_time > 3000,
    severity: 'warning',
    message: 'API response time > 3s',
    action: 'notify_admin'
  },
  {
    name: 'Low Cache Hit Rate',
    condition: (metrics) => metrics.cache_hit_rate < 70,
    severity: 'warning',
    message: 'Cache hit rate < 70%',
    action: 'suggest_optimization'
  },
  {
    name: 'High Sync Failure Rate',
    condition: (metrics) => metrics.sync_failure_rate > 5,
    severity: 'critical',
    message: 'Sync failure rate > 5%',
    action: 'notify_admin_immediately'
  },
  {
    name: 'Quota Usage High',
    condition: (metrics) => metrics.quota_percentage > 80,
    severity: 'critical',
    message: 'API quota usage > 80%',
    action: 'disable_non_essential_features'
  },
  {
    name: 'Database Connection Pool Full',
    condition: (metrics) => metrics.db_connection_pool_usage > 95,
    severity: 'critical',
    message: 'Database connection pool > 95%',
    action: 'queue_requests'
  }
];

class AlertManager {
  async checkAlerts(metrics) {
    for (const rule of ALERT_RULES) {
      if (rule.condition(metrics)) {
        await this.triggerAlert(rule);
      }
    }
  }
  
  async triggerAlert(rule) {
    console.warn(`ALERT: ${rule.name} - ${rule.message}`);
    
    // Send to admin
    await fetch('/api/v1/admin/alerts', {
      method: 'POST',
      body: JSON.stringify({
        name: rule.name,
        severity: rule.severity,
        message: rule.message,
        timestamp: new Date()
      })
    });
    
    // Execute action
    if (rule.action === 'disable_non_essential_features') {
      disableNonEssentialFeatures();
    }
    
    if (rule.action === 'queue_requests') {
      enableRequestQueuing();
    }
  }
}

const alertManager = new AlertManager();
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Offline-First Data Consistency

*For any* exam session, if a student answers questions offline and then syncs, the answers stored on the server SHALL match the answers stored locally before sync.

**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: Batch Submission Integrity

*For any* batch of answers submitted by a student, all answers in the batch SHALL be stored in the database exactly once, with no duplicates or missing answers.

**Validates: Requirements 7.1, 7.2, 7.3, 12.1**

### Property 3: Rate Limit Enforcement

*For any* user making API requests, the number of requests within a sliding window SHALL never exceed the configured limit for that endpoint.

**Validates: Requirements 6.1, 6.2, 6.6**

### Property 4: Cache Invalidation

*For any* cached data, if the server data is updated, subsequent requests SHALL return the updated data (either from cache if still valid, or from server if stale).

**Validates: Requirements 4.3, 4.4, 4.6**

### Property 5: Sync Conflict Resolution

*For any* sync conflict where local and server data differ, the system SHALL use the server timestamp to determine which version is authoritative, and the final state SHALL match the server version.

**Validates: Requirements 1.4, 9.6**

### Property 6: Concurrent User Handling

*For any* number of concurrent users up to 1000, the system SHALL maintain response times under 2 seconds for all API calls, with no request timeouts or connection pool exhaustion.

**Validates: Requirements 8.1, 8.6**

### Property 7: Error Recovery

*For any* failed API request, if the system retries with exponential backoff, the request SHALL eventually succeed (if the server recovers) or fail with a user-friendly error message after max retries.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 8: Storage Quota Management

*For any* IndexedDB storage, if the storage approaches capacity, the system SHALL evict old data using LRU strategy without losing current exam session data.

**Validates: Requirements 4.4, 13.4**

### Property 9: Timer Accuracy Offline

*For any* exam session running offline, the timer displayed to the student SHALL remain accurate within ±5 seconds compared to the actual elapsed time, regardless of device clock adjustments.

**Validates: Requirements 1.6, 15.1**

### Property 10: Pre-Sync Distribution

*For any* pre-sync window of 24 hours, if multiple students trigger sync, the system SHALL distribute the load such that no single minute receives more than 10% of total sync requests.

**Validates: Requirements 2.3, 8.1**

## Testing Strategy

### Test Coverage Approach

The system uses a dual testing approach:

1. **Property-Based Tests (PBT)**: Verify universal properties across many generated inputs
2. **Unit Tests**: Verify specific examples, edge cases, and error conditions
3. **Integration Tests**: Verify end-to-end flows with real services

### Property-Based Tests

Each correctness property SHALL be implemented as a property-based test using Hypothesis (Python) or fast-check (JavaScript):

```javascript
// Example: Property 1 - Offline-First Data Consistency
import fc from 'fast-check';

describe('Property 1: Offline-First Data Consistency', () => {
  it('should maintain data consistency between local and server', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          question_id: fc.uuid(),
          answer: fc.string(),
          time_spent: fc.integer({ min: 0, max: 3600 })
        }), { minLength: 1, maxLength: 100 }),
        async (answers) => {
          // Setup
          const db = await initIndexedDB();
          const examId = 'test-exam-1';
          const studentId = 'test-student-1';
          
          // Save answers locally
          for (const answer of answers) {
            await db.saveAnswer({
              exam_id: examId,
              student_id: studentId,
              ...answer
            });
          }
          
          // Sync to server
          const syncResult = await syncAnswers(examId, studentId);
          
          // Verify: Server answers match local answers
          const serverAnswers = await fetchAnswersFromServer(examId, studentId);
          
          expect(serverAnswers.length).toBe(answers.length);
          serverAnswers.forEach((serverAnswer, index) => {
            expect(serverAnswer.question_id).toBe(answers[index].question_id);
            expect(serverAnswer.answer).toBe(answers[index].answer);
            expect(serverAnswer.time_spent).toBe(answers[index].time_spent);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Example: Property 3 - Rate Limit Enforcement
describe('Property 3: Rate Limit Enforcement', () => {
  it('should never exceed rate limit for any user', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        async (userId, requestCount) => {
          const limiter = new RateLimiter();
          const endpoint = 'submit';
          const limit = 12; // 12 requests per minute
          
          let successCount = 0;
          let blockedCount = 0;
          
          for (let i = 0; i < requestCount; i++) {
            const result = await limiter.checkLimit(userId, endpoint);
            if (result.allowed) {
              successCount++;
            } else {
              blockedCount++;
            }
          }
          
          // Verify: Success count never exceeds limit
          expect(successCount).toBeLessThanOrEqual(limit);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Example: Property 5 - Sync Conflict Resolution
describe('Property 5: Sync Conflict Resolution', () => {
  it('should resolve conflicts using server timestamp', () => {
    fc.assert(
      fc.property(
        fc.record({
          local_answer: fc.string(),
          local_timestamp: fc.integer({ min: 0, max: 1000000 }),
          server_answer: fc.string(),
          server_timestamp: fc.integer({ min: 0, max: 1000000 })
        }),
        async (data) => {
          const conflictResolver = new ConflictResolver();
          
          const result = conflictResolver.resolve({
            local: {
              answer: data.local_answer,
              timestamp: data.local_timestamp
            },
            server: {
              answer: data.server_answer,
              timestamp: data.server_timestamp
            }
          });
          
          // Verify: Result matches server version (server is source of truth)
          if (data.server_timestamp >= data.local_timestamp) {
            expect(result.answer).toBe(data.server_answer);
          } else {
            expect(result.answer).toBe(data.local_answer);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Tests

Unit tests focus on specific examples and edge cases:

```javascript
// Example: Batch Submission Validation
describe('Batch Submission', () => {
  it('should reject empty batch', async () => {
    const result = await submitBatch({
      exam_id: 'e1',
      student_id: 's1',
      answers: []
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('empty_batch');
  });
  
  it('should reject duplicate submission', async () => {
    const batch = {
      exam_id: 'e1',
      student_id: 's1',
      answers: [{ q_id: 'q1', a: 'o1', t: 45 }]
    };
    
    const result1 = await submitBatch(batch);
    expect(result1.success).toBe(true);
    
    const result2 = await submitBatch(batch);
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('duplicate_submission');
  });
  
  it('should handle large batch (100 questions)', async () => {
    const answers = Array.from({ length: 100 }, (_, i) => ({
      q_id: `q${i}`,
      a: `o${i}`,
      t: Math.random() * 3600
    }));
    
    const result = await submitBatch({
      exam_id: 'e1',
      student_id: 's1',
      answers
    });
    
    expect(result.success).toBe(true);
    expect(result.submission_id).toBeDefined();
  });
});

// Example: Rate Limiter Edge Cases
describe('Rate Limiter', () => {
  it('should allow exactly N requests within window', async () => {
    const limiter = new RateLimiter();
    const userId = 'user1';
    const endpoint = 'submit';
    
    for (let i = 0; i < 12; i++) {
      const result = await limiter.checkLimit(userId, endpoint);
      expect(result.allowed).toBe(true);
    }
    
    const result13 = await limiter.checkLimit(userId, endpoint);
    expect(result13.allowed).toBe(false);
  });
  
  it('should reset counter after window expires', async () => {
    const limiter = new RateLimiter();
    const userId = 'user1';
    const endpoint = 'submit';
    
    // Make 12 requests
    for (let i = 0; i < 12; i++) {
      await limiter.checkLimit(userId, endpoint);
    }
    
    // Wait for window to expire (mocked)
    await new Promise(resolve => setTimeout(resolve, 61000));
    
    const result = await limiter.checkLimit(userId, endpoint);
    expect(result.allowed).toBe(true);
  });
});

// Example: Cache Eviction
describe('IndexedDB Cache Eviction', () => {
  it('should evict oldest data when storage full', async () => {
    const db = new IndexedDBManager();
    
    // Fill storage with old data
    const oldAnswers = Array.from({ length: 1000 }, (_, i) => ({
      id: `old-${i}`,
      exam_id: 'e1',
      student_id: 's1',
      answer: 'old answer',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
    }));
    
    for (const answer of oldAnswers) {
      await db.saveAnswer(answer);
    }
    
    // Try to save new data
    const newAnswers = Array.from({ length: 100 }, (_, i) => ({
      id: `new-${i}`,
      exam_id: 'e1',
      student_id: 's1',
      answer: 'new answer',
      created_at: new Date()
    }));
    
    for (const answer of newAnswers) {
      await db.saveAnswer(answer);
    }
    
    // Verify: Old data was evicted, new data is present
    const stored = await db.getAnswers('e1', 's1');
    expect(stored.some(a => a.id.startsWith('new-'))).toBe(true);
    expect(stored.some(a => a.id.startsWith('old-'))).toBe(false);
  });
});
```

### Integration Tests

Integration tests verify end-to-end flows:

```javascript
// Example: Complete Exam Flow
describe('Complete Exam Flow', () => {
  it('should handle full exam lifecycle offline', async () => {
    // 1. Pre-sync
    const syncResult = await syncExamQuestions('exam-1');
    expect(syncResult.success).toBe(true);
    expect(syncResult.questions_count).toBe(50);
    
    // 2. Start exam
    const sessionResult = await startExamSession('exam-1', 'student-1');
    expect(sessionResult.success).toBe(true);
    const sessionId = sessionResult.session_id;
    
    // 3. Go offline
    simulateOffline();
    
    // 4. Answer questions
    for (let i = 0; i < 50; i++) {
      const answerResult = await saveAnswer({
        session_id: sessionId,
        question_id: `q${i}`,
        answer: `o${i}`,
        time_spent: 60
      });
      expect(answerResult.success).toBe(true);
    }
    
    // 5. Submit offline
    const submitResult = await submitAnswers(sessionId);
    expect(submitResult.success).toBe(true);
    expect(submitResult.status).toBe('pending_sync');
    
    // 6. Go online
    simulateOnline();
    
    // 7. Verify sync
    await waitForSync();
    const finalResult = await getSubmissionStatus(sessionId);
    expect(finalResult.status).toBe('synced');
  });
});

// Example: Concurrent Load Test
describe('Concurrent Load', () => {
  it('should handle 1000 concurrent users', async () => {
    const users = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
    const startTime = Date.now();
    
    const results = await Promise.all(
      users.map(userId =>
        submitAnswers({
          exam_id: 'exam-1',
          student_id: userId,
          answers: generateRandomAnswers(50)
        })
      )
    );
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const avgResponseTime = duration / 1000;
    
    expect(successCount).toBe(1000);
    expect(avgResponseTime).toBeLessThan(2000); // < 2 seconds
  });
});
```

### Test Configuration

- **Property-Based Tests**: Minimum 100 iterations per property
- **Unit Tests**: Run on every commit
- **Integration Tests**: Run before deployment
- **Load Tests**: Run weekly with 1000 concurrent users

### Test Execution

```bash
# Run all tests
npm test

# Run property-based tests only
npm run test:properties

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run load tests
npm run test:load

# Generate coverage report
npm run test:coverage
```



## Implementation Notes

### Technology Stack

```
Frontend:
- React 18+ (UI framework)
- Vite (build tool)
- Service Worker API (caching)
- IndexedDB (offline storage)
- fast-check (property-based testing)

Backend:
- Node.js + Express (API server)
- Supabase (PostgreSQL + Auth)
- Redis (rate limiting, caching)
- Vercel (hosting)

Database:
- PostgreSQL (Supabase)
- Materialized views for reports
- Partitioning for answers table

Monitoring:
- Custom metrics collector
- WebSocket for real-time updates
- Admin dashboard
```

### Key Implementation Decisions

1. **Offline-First**: All exam data synced H-1, exam runs completely offline
2. **Batch Submission**: Single request for all answers, not per-question
3. **Compression**: gzip for all payloads, compact JSON format
4. **Caching**: 3-layer strategy (Service Worker, IndexedDB, Memory)
5. **Rate Limiting**: Sliding window algorithm, 12 req/min per user
6. **Error Handling**: Exponential backoff, automatic retry, sync queue
7. **Monitoring**: Real-time metrics, alerts, quota tracking

### Supabase Free Tier Optimization

```
LIMITS:
- Storage: 500MB
- Monthly Active Users: 2M
- API Calls: Unlimited (but rate limited)
- Bandwidth: Unlimited

OPTIMIZATION STRATEGIES:
1. Compress all payloads (gzip)
2. Use batch operations (1 request instead of N)
3. Leverage caching (reduce API calls)
4. Partition answers table (faster queries)
5. Use materialized views (pre-computed reports)
6. Archive old data (keep storage under 500MB)
```

### Vercel Free Tier Optimization

```
LIMITS:
- Bandwidth: 100GB/month
- Function invocations: 1M/month
- Concurrent connections: Limited

OPTIMIZATION STRATEGIES:
1. Use Edge Functions for rate limiting
2. Implement request queuing
3. Cache responses at edge
4. Compress responses
5. Minimize function execution time
```

### Database Optimization Checklist

- [ ] Create indexes on frequently queried columns
- [ ] Use composite indexes for multi-column queries
- [ ] Partition answers table by exam_id
- [ ] Create materialized views for reports
- [ ] Set up connection pooling
- [ ] Enable query caching
- [ ] Monitor slow queries
- [ ] Archive old data regularly

### Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| API Response Time (p95) | < 1.2s | TBD |
| Cache Hit Rate | > 85% | TBD |
| Sync Success Rate | > 99% | TBD |
| Concurrent Users | 1000 | TBD |
| Batch Submission Size | < 50KB | TBD |
| Pre-Sync Time | < 30s | TBD |

## Deployment Considerations

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, property-based)
- [ ] Load testing with 1000 concurrent users
- [ ] Database indexes created
- [ ] Rate limiting configured
- [ ] Monitoring dashboard set up
- [ ] Error handling tested
- [ ] Offline functionality verified
- [ ] Compression working
- [ ] Cache strategies validated
- [ ] Security review completed

### Deployment Steps

1. **Database Setup**
   - Create tables with indexes
   - Set up materialized views
   - Configure partitioning
   - Enable connection pooling

2. **Backend Deployment**
   - Deploy to Vercel
   - Configure environment variables
   - Set up Redis for rate limiting
   - Enable monitoring

3. **Frontend Deployment**
   - Build optimized bundle
   - Deploy to Vercel
   - Register Service Worker
   - Test offline functionality

4. **Monitoring Setup**
   - Configure metrics collection
   - Set up alerts
   - Create admin dashboard
   - Test monitoring endpoints

### Rollback Plan

If issues occur:
1. Revert to previous version
2. Investigate root cause
3. Fix and test thoroughly
4. Deploy again

### Scaling Strategy

If system reaches capacity:
1. Enable caching at edge (Vercel)
2. Increase database connection pool
3. Archive old data
4. Upgrade Supabase tier
5. Implement request queuing
6. Add more Edge Functions

## Security Considerations

### Authentication & Authorization

```javascript
// Verify student can only access their own exam
async function verifyExamAccess(studentId, examId) {
  const session = await getExamSession(examId, studentId);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return true;
}

// Verify admin can only access admin endpoints
async function verifyAdminAccess(userId) {
  const user = await getUser(userId);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return true;
}
```

### Data Validation

```javascript
// Validate batch submission
function validateBatchSubmission(batch) {
  if (!batch.exam_id || !batch.student_id) {
    throw new Error('Missing required fields');
  }
  
  if (!Array.isArray(batch.answers) || batch.answers.length === 0) {
    throw new Error('Empty answers');
  }
  
  batch.answers.forEach((answer) => {
    if (!answer.q_id || answer.a === undefined) {
      throw new Error('Invalid answer format');
    }
  });
  
  return true;
}
```

### Checksum Verification

```javascript
// Verify data integrity
function verifyChecksum(data, checksum) {
  const computed = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  
  return computed === checksum;
}
```

### Rate Limiting

- Prevent brute force attacks
- Prevent quota exhaustion
- Prevent DDoS attacks
- Block suspicious patterns

## Conclusion

This design provides a scalable, resilient CBT system for 1000 concurrent students using Supabase Free + Vercel Free. Key features:

1. **Offline-First**: Exam works completely offline
2. **Minimal API Calls**: Batch operations reduce load
3. **Smart Caching**: 3-layer caching strategy
4. **Rate Limiting**: Protects against overload
5. **Error Handling**: Automatic retry and recovery
6. **Monitoring**: Real-time metrics and alerts
7. **Security**: Authentication, validation, checksums
8. **Performance**: < 2s response time for 1000 concurrent users

The system is designed to be cost-effective, reliable, and user-friendly for both students and administrators.

