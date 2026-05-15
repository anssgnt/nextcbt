# Offline Sync Integration Guide

## Quick Start

### 1. Initialize Service Worker
```javascript
// In your main.jsx or App.jsx
import { registerServiceWorker } from './utils/offlineHelper'

useEffect(() => {
  registerServiceWorker()
}, [])
```

### 2. Initialize Sync Service
```javascript
// In ExamInterfacePage or any exam component
import { getSyncService } from './services/syncService'

const syncService = await getSyncService(userId)
```

### 3. Pre-Sync Exams (Optional)
```javascript
// Call this 24 hours before exam starts
const result = await syncService.preSyncExams(userId)
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`)
```

---

## Integration Points

### Student Dashboard
```javascript
// Show pre-sync status
const syncStatus = await syncService.getSyncStatus()
console.log(`Offline data: ${syncStatus.exams} exams, ${syncStatus.questions} questions`)

// Trigger pre-sync
const handlePreSync = async () => {
  const result = await syncService.preSyncExams(userId)
  showToast(`Pre-synced ${result.synced} exams`)
}
```

### Exam Interface
```javascript
// Already integrated in ExamInterfacePage.jsx
// Features:
// - Offline-first loading
// - Local answer saving
// - Auto-sync when online
// - Graceful offline submission
```

### API Service
```javascript
// Update studentService to support batch submission
export const submitExamBatch = async (submission) => {
  const response = await fetch('/api/exams/submit-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })
  return response.json()
}
```

---

## API Endpoints Required

### 1. Get Exam Details
```
GET /api/exams/:examId
Response: { id, title, duration, start_time, ... }
```

### 2. Get Exam Questions
```
GET /api/exams/:examId/questions
Response: [{ id, question_text, type, ... }]
```

### 3. Get Question Options
```
GET /api/questions/:questionId/options
Response: [{ id, option_text, ... }]
```

### 4. Save Answer
```
POST /api/sessions/:sessionId/answers
Body: { questionId, answer }
Response: { success: true }
```

### 5. Submit Exam (Batch)
```
POST /api/exams/submit-batch
Body: {
  sessionId,
  payload, // gzip compressed
  checksum,
  compressed,
  originalSize,
  compressedSize
}
Response: { success: true, sessionId }
```

---

## Configuration

### Rate Limiter
```javascript
// Default: 12 requests/minute
const limiter = getRateLimiter(12, 60000)

// Custom: 20 requests/minute
const limiter = getRateLimiter(20, 60000)
```

### IndexedDB Store Sizes
```javascript
// In src/lib/indexedDB.js
const MAX_STORE_SIZE = {
  exams: 100,        // Adjust based on needs
  questions: 5000,
  options: 20000,
  answers: 10000,
  syncQueue: 1000,
}
```

### Sync Interval
```javascript
// In ExamInterfacePage.jsx
syncIntervalRef.current = setInterval(syncPending, 30000) // 30 seconds
```

---

## Monitoring & Debugging

### Check Sync Status
```javascript
const syncService = await getSyncService(userId)
const status = await syncService.getSyncStatus()

console.log({
  exams: status.exams,
  questions: status.questions,
  options: status.options,
  answers: status.answers,
  pendingSubmissions: status.pendingSubmissions,
  isSyncing: status.isSyncing,
  rateLimitStatus: status.rateLimitStatus,
})
```

### Check Storage Usage
```javascript
import { getOfflineDataSize } from './utils/offlineHelper'

const size = await getOfflineDataSize()
console.log({
  used: `${(size.used / 1024 / 1024).toFixed(2)}MB`,
  available: `${(size.available / 1024 / 1024).toFixed(2)}MB`,
  percentage: `${size.percentage.toFixed(2)}%`,
})
```

### Check Submission Queue
```javascript
const submissionService = await getSubmissionService()
const stats = await submissionService.getSubmissionStats()

console.log({
  total: stats.total,
  pending: stats.pending,
  completed: stats.completed,
  failed: stats.failed,
  compressionRatio: `${stats.compressionRatio}%`,
})
```

### Browser DevTools
```javascript
// IndexedDB
// Open DevTools → Application → IndexedDB → NextCBT

// Service Worker
// Open DevTools → Application → Service Workers

// Cache Storage
// Open DevTools → Application → Cache Storage

// Network
// Open DevTools → Network → Filter by XHR/Fetch
```

---

## Troubleshooting

### Issue: Service Worker not registering
```javascript
// Check browser support
if (!('serviceWorker' in navigator)) {
  console.warn('Service Workers not supported')
}

// Check HTTPS (required for production)
// localhost works for development
```

### Issue: IndexedDB quota exceeded
```javascript
// Clear old data
const syncService = await getSyncService(userId)
await syncService.clearExamData(examId)

// Or clear all
import { clearAllOfflineData } from './utils/offlineHelper'
await clearAllOfflineData()
```

### Issue: Sync not working
```javascript
// Check online status
console.log('Online:', navigator.onLine)

// Check rate limiter
const limiter = getRateLimiter()
const status = limiter.getStatus(userId)
console.log('Rate limit status:', status)

// Check pending submissions
const pending = await syncService.getPendingSubmissions()
console.log('Pending:', pending)
```

### Issue: Compression not working
```javascript
// Check pako library
import pako from 'pako'
console.log('Pako version:', pako.version)

// Test compression
const data = { test: 'data' }
const compressed = pako.gzip(JSON.stringify(data))
console.log('Compression ratio:', (1 - compressed.length / JSON.stringify(data).length) * 100)
```

---

## Performance Optimization

### 1. Lazy Load Sync Service
```javascript
// Only initialize when needed
const [syncService, setSyncService] = useState(null)

useEffect(() => {
  if (user?.id) {
    getSyncService(user.id).then(setSyncService)
  }
}, [user?.id])
```

### 2. Batch IndexedDB Operations
```javascript
// Instead of multiple puts
for (const question of questions) {
  await db.put('questions', question)
}

// Use batch
await db.batchPut('questions', questions)
```

### 3. Debounce Answer Saving
```javascript
// Already implemented in ExamInterfacePage
const debouncedSaveAnswer = debounce(async (qId, answer) => {
  await syncService.saveAnswerLocal(examId, qId, answer)
}, 2000) // Wait 2 seconds before saving
```

### 4. Limit Sync Frequency
```javascript
// Sync every 30 seconds, not every change
syncIntervalRef.current = setInterval(syncPending, 30000)
```

---

## Security Considerations

### 1. Data Encryption
```javascript
// TODO: Implement encryption for sensitive data
// Consider: TweetNaCl.js, libsodium.js
```

### 2. Checksum Verification
```javascript
// Already implemented
const checksum = submissionService.calculateChecksum(data)
// Verify on server side
```

### 3. Rate Limiting
```javascript
// Already implemented
const limiter = getRateLimiter(12, 60000)
// Prevents abuse
```

### 4. HTTPS Only (Production)
```javascript
// Service Worker requires HTTPS in production
// localhost works for development
```

---

## Migration Guide

### From Online-Only to Offline-First

1. **Update ExamInterfacePage**
   - Already done ✓

2. **Add Sync Service**
   - Already done ✓

3. **Update API Service**
   - Add batch submission endpoint
   - Add compression support

4. **Update Student Dashboard**
   - Show offline data status
   - Add pre-sync button

5. **Update Admin Dashboard**
   - Monitor offline usage
   - Track sync failures

---

## Testing Scenarios

### Scenario 1: Pre-Sync Success
```
1. User logs in 24 hours before exam
2. System auto pre-syncs exam data
3. User can see offline indicator
4. User can answer questions offline
```

### Scenario 2: Offline Submission
```
1. User goes offline during exam
2. User continues answering questions
3. User submits exam (queued)
4. User goes online
5. System auto-syncs submission
```

### Scenario 3: Network Interruption
```
1. User is online, answering questions
2. Network drops
3. User continues offline
4. Network restored
5. System auto-syncs pending data
```

### Scenario 4: Storage Full
```
1. IndexedDB reaches max size
2. System triggers LRU eviction
3. Oldest unused data is deleted
4. New data can be stored
```

---

## Rollback Plan

If issues occur:

1. **Disable Service Worker**
   ```javascript
   // In main.jsx
   // Comment out registerServiceWorker()
   ```

2. **Clear Offline Data**
   ```javascript
   import { clearAllOfflineData } from './utils/offlineHelper'
   await clearAllOfflineData()
   ```

3. **Revert to Online-Only**
   ```javascript
   // Use original ExamInterfacePage without sync service
   ```

---

## Support & Documentation

- **Offline Sync Implementation**: `OFFLINE_SYNC_IMPLEMENTATION.md`
- **Service Worker**: `public/sw.js`
- **IndexedDB**: `src/lib/indexedDB.js`
- **Sync Service**: `src/services/syncService.js`
- **Submission Service**: `src/services/submissionService.js`
- **Offline Helper**: `src/utils/offlineHelper.js`
- **Offline Sync Hook**: `src/hooks/useOfflineSync.js`

---

## Contact & Issues

For issues or questions:
1. Check troubleshooting section
2. Review browser console for errors
3. Check IndexedDB/Cache Storage in DevTools
4. Review sync status logs
