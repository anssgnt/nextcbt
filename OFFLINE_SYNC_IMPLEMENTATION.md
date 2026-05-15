# CBT Scalable System - PHASE 1 & 2 Implementation

## Overview
Implementasi offline-first architecture untuk CBT system yang mendukung 1000+ concurrent users dengan minimal API calls dan smart caching.

---

## PHASE 1: Foundation

### Task 1: Service Worker dengan 3 Caching Strategies
**File:** `public/sw.js`

#### Strategi Caching:
1. **Cache-First** (Static Assets)
   - Untuk: `.js`, `.css`, `.woff2`, `.png`, `.jpg`, `.svg`
   - Behavior: Cek cache dulu, jika tidak ada fetch dari network
   - Use case: Static assets yang jarang berubah

2. **Network-First** (API Calls)
   - Untuk: `/api/`, `/rest/`
   - Behavior: Coba network dulu, jika gagal gunakan cache
   - Use case: Data yang sering update tapi perlu fallback offline

3. **Stale-While-Revalidate** (HTML & Dynamic Content)
   - Untuk: `.html`, `/`
   - Behavior: Return cache immediately, update di background
   - Use case: Content yang bisa slightly outdated

#### Features:
- Automatic cache cleanup on activation
- Message handler untuk manual cache management
- Chrome extension filtering

---

### Task 2: IndexedDB dengan 5 Stores dan LRU Eviction
**File:** `src/lib/indexedDB.js`

#### Stores:
| Store | Max Size | Purpose |
|-------|----------|---------|
| exams | 100 | Exam metadata |
| questions | 5000 | Question data |
| options | 20000 | Answer options |
| answers | 10000 | User answers |
| syncQueue | 1000 | Pending submissions |

#### Features:
- **LRU Eviction**: Otomatis hapus item tertua saat store penuh
- **Batch Operations**: `batchPut()` untuk insert multiple items
- **Index Support**: Query by `timestamp` dan `examId`
- **Storage Stats**: Monitor penggunaan storage

#### Usage:
```javascript
const db = await getIndexedDB()

// Add item
await db.put('exams', { id: 1, title: 'Math', syncedAt: Date.now() })

// Get item
const exam = await db.get('exams', 1)

// Query by index
const questions = await db.queryByIndex('questions', 'examId', 1)

// Get stats
const stats = await db.getStats()
```

---

### Task 3: Rate Limiting dengan Sliding Window Algorithm
**File:** `src/utils/rateLimiter.js`

#### Configuration:
- **Default**: 12 requests per minute per user
- **Algorithm**: Sliding window (tidak reset per menit, tapi per request)

#### Features:
- Per-user rate limiting
- Exponential backoff untuk retry
- Cleanup mechanism untuk old entries
- Express middleware support

#### Usage:
```javascript
const limiter = getRateLimiter(12, 60000) // 12 req/min

// Check if allowed
const result = limiter.isAllowed(userId)
if (!result.allowed) {
  console.log(`Retry after ${result.retryAfter}s`)
}

// Get status
const status = limiter.getStatus(userId)
console.log(`Remaining: ${status.remaining}`)
```

---

## PHASE 2: Offline Exam

### Task 4: Pre-Sync H-1 untuk Download Soal
**File:** `src/services/syncService.js`

#### Features:
- **Auto Pre-Sync**: Download soal 24 jam sebelum ujian
- **Batch Download**: Semua questions + options dalam satu sync
- **Rate Limit Aware**: Respects rate limiter
- **Offline-First Loading**: Load dari IndexedDB dulu

#### Workflow:
```
1. Check upcoming exams (within 24 hours)
2. For each exam:
   - Fetch exam details
   - Fetch all questions
   - Fetch options for each question
   - Store in IndexedDB
3. Return sync status (synced/failed count)
```

#### Usage:
```javascript
const syncService = await getSyncService(userId)

// Pre-sync exams
const result = await syncService.preSyncExams(userId)
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`)

// Load exam offline
const { exam, questions } = await syncService.loadExamOffline(examId)

// Save answer locally
await syncService.saveAnswerLocal(examId, questionId, answer)
```

---

### Task 5: Offline Exam Interface
**File:** `src/pages/ExamInterfacePage.jsx`

#### Enhancements:
- **Offline-First Loading**: Try IndexedDB first, fallback to API
- **Local Timer**: Timer berjalan offline
- **Offline Indicator**: Visual indicator untuk online/offline status
- **Auto-Sync**: Sync pending submissions setiap 30 detik saat online
- **Graceful Degradation**: Tetap bisa jawab soal offline

#### Features:
```javascript
// Initialize sync service
const syncService = await getSyncService(userId)

// Load exam (offline-first)
const offlineData = await syncService.loadExamOffline(examId)

// Save answer locally
await syncService.saveAnswerLocal(examId, questionId, answer)

// Submit (online: direct, offline: queue)
if (isOnline) {
  await studentService.submitExam(sessionId, answers)
} else {
  await syncService.queueSubmission(examId, sessionId, answers)
}
```

#### UI Components:
- Online/Offline status indicator (Wifi/WifiOff icon)
- Offline mode badge
- Sync status in submission modal
- Toast notifications untuk sync events

---

### Task 6: Batch Submission dengan Compression & Checksum
**File:** `src/services/submissionService.js`

#### Features:

1. **Compression (gzip)**
   - Target: 60% reduction
   - Actual: Depends on data, typically 50-70%
   - Format: Base64 encoded gzip

2. **Checksum**
   - Algorithm: Simple hash (32-bit integer)
   - Purpose: Verify data integrity
   - Included in payload

3. **Retry Logic**
   - Max retries: 5
   - Backoff: Exponential (1s, 2s, 4s, 8s, 16s)
   - Status tracking: pending → completed/failed

#### Payload Structure:
```javascript
{
  sessionId: "session-123",
  payload: "H4sIAAAA...", // gzip compressed
  checksum: "a1b2c3d4",
  compressed: true,
  originalSize: 5000,
  compressedSize: 1500,
  compressionRatio: "70.00"
}
```

#### Usage:
```javascript
const submissionService = await getSubmissionService()

// Prepare batch submission
const submission = submissionService.prepareBatchSubmission(
  sessionId,
  answers,
  { userAgent: navigator.userAgent }
)

// Submit with retry
const result = await submissionService.submitExamWithRetry(
  submitFn,
  sessionId,
  answers
)

// Queue for later sync
const queueId = await submissionService.queueSubmission(
  sessionId,
  answers
)

// Process queued submissions
const results = await submissionService.processQueuedSubmissions(submitFn)

// Get stats
const stats = await submissionService.getSubmissionStats()
```

---

## Supporting Utilities

### Offline Helper (`src/utils/offlineHelper.js`)
```javascript
// Register Service Worker
await registerServiceWorker()

// Check online status
const online = isOnline()

// Listen to changes
const unsubscribe = onOnlineStatusChange((online) => {
  console.log('Online:', online)
})

// Get storage quota
const quota = await getStorageQuota()

// Request persistent storage
const persistent = await requestPersistentStorage()

// Clear all offline data
await clearAllOfflineData()

// Sync when online
syncWhenOnline(() => {
  // Sync logic
})

// Retry with backoff
await retryWithBackoff(asyncFn, 5, 1000)
```

### Offline Sync Hook (`src/hooks/useOfflineSync.js`)
```javascript
const {
  isOnline,
  isSyncing,
  syncStatus,
  syncPending,
  getStatus,
  preSyncExams,
  saveAnswerLocal,
  queueSubmission,
  clearExamData,
} = useOfflineSync(userId)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Exam Interface                           │
│  (ExamInterfacePage.jsx)                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐      ┌──────────────┐
   │ Online  │      │ Offline Mode │
   │ Mode    │      │              │
   └────┬────┘      └──────┬───────┘
        │                  │
        │                  ▼
        │            ┌──────────────┐
        │            │  IndexedDB   │
        │            │  (5 stores)  │
        │            └──────────────┘
        │
        ▼
   ┌─────────────────────────────────┐
   │    Sync Service                 │
   │  - Pre-sync H-1                 │
   │  - Load offline                 │
   │  - Queue submissions            │
   └────────┬────────────────────────┘
            │
        ┌───┴───┐
        │       │
        ▼       ▼
   ┌────────┐ ┌──────────────────┐
   │ API    │ │ Submission Svc   │
   │        │ │ - Compression    │
   │        │ │ - Checksum       │
   │        │ │ - Retry Logic    │
   └────────┘ └──────────────────┘
        │
        ▼
   ┌─────────────────────────────────┐
   │    Service Worker               │
   │  - Cache-First (static)         │
   │  - Network-First (API)          │
   │  - Stale-While-Revalidate (HTML)│
   └─────────────────────────────────┘
```

---

## Performance Metrics

### Compression
- **Target**: 60% reduction
- **Typical**: 50-70% (depends on data)
- **Example**: 5KB → 1.5KB

### Rate Limiting
- **Limit**: 12 requests/minute per user
- **Sliding Window**: No reset, continuous
- **Backoff**: Exponential (1s, 2s, 4s, 8s, 16s)

### Storage
- **IndexedDB Quota**: Browser dependent (50MB+)
- **LRU Eviction**: Auto cleanup saat penuh
- **Persistent Storage**: Request via API

### Sync
- **Pre-Sync**: 24 hours before exam
- **Auto-Sync**: Every 30 seconds when online
- **Retry**: Max 5 attempts with exponential backoff

---

## Error Handling

### Offline Scenarios
1. **No offline data**: Show error, suggest pre-sync
2. **Network timeout**: Queue for later sync
3. **Sync failure**: Retry with exponential backoff
4. **Storage full**: LRU eviction + user notification

### Recovery
1. **Auto-retry**: Exponential backoff
2. **Manual retry**: User can trigger sync
3. **Fallback**: Use cached data if available
4. **Notification**: Toast messages untuk status

---

## Testing Checklist

- [ ] Service Worker caching strategies
- [ ] IndexedDB CRUD operations
- [ ] LRU eviction mechanism
- [ ] Rate limiter sliding window
- [ ] Pre-sync H-1 functionality
- [ ] Offline exam interface
- [ ] Compression ratio (target 60%)
- [ ] Checksum verification
- [ ] Retry logic with backoff
- [ ] Auto-sync when online
- [ ] Storage quota management
- [ ] Error handling & recovery

---

## Deployment Notes

1. **Service Worker**: Deployed at `/public/sw.js`
2. **Dependencies**: Added `pako` for compression
3. **Build**: Verified with `npm run build`
4. **Bundle Size**: Monitor chunk sizes (currently ~1.1MB)

---

## Future Enhancements

1. **Differential Sync**: Only sync changed questions
2. **Bandwidth Detection**: Adjust sync strategy based on connection
3. **Predictive Caching**: Pre-cache likely exams
4. **Analytics**: Track offline usage patterns
5. **Conflict Resolution**: Handle concurrent edits
6. **End-to-End Encryption**: Secure offline data

---

## References

- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Pako Compression](https://github.com/nodeca/pako)
- [Offline First](https://offlinefirst.org/)
