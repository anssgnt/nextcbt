# Tasks: CBT Scalable 1000 Siswa Concurrent

## Overview

Implementasi sistem CBT scalable untuk 1000 siswa concurrent dengan offline-first architecture, minimal API calls, dan smart caching. Total 15 tasks yang akan dieksekusi secara incremental.

---

## PHASE 1: Foundation & Infrastructure (Tasks 1-3)

### Task 1: Setup Offline-First Architecture & Service Worker
**Status**: Not Started  
**Priority**: Critical  
**Effort**: 4 hours  
**Dependencies**: None

**Description**:
Implementasi Service Worker untuk caching strategy 3-layer (static assets, IndexedDB, memory cache). Service Worker akan menangani offline scenarios dan background sync.

**Acceptance Criteria**:
- [ ] Service Worker terdaftar dan aktif di browser
- [ ] Static assets (JS, CSS, images) di-cache dengan cache-first strategy
- [ ] API responses di-cache dengan network-first strategy
- [ ] Stale-while-revalidate strategy untuk dashboard data
- [ ] Background sync untuk retry failed submissions
- [ ] Cache versioning dan cleanup otomatis
- [ ] Offline mode indicator di UI

**Implementation Details**:
- Create `public/sw.js` dengan Service Worker logic
- Register SW di `src/main.jsx`
- Implement cache strategies (cache-first, network-first, stale-while-revalidate)
- Setup background sync event listener
- Add offline detection dan UI indicator

**Files to Create/Modify**:
- `public/sw.js` (new)
- `src/main.jsx` (modify - register SW)
- `src/utils/serviceWorkerManager.js` (new)

---

### Task 2: Setup IndexedDB for Offline Storage
**Status**: Not Started  
**Priority**: Critical  
**Effort**: 3 hours  
**Dependencies**: Task 1

**Description**:
Implementasi IndexedDB database untuk penyimpanan offline data (questions, answers, metadata). Termasuk storage management, LRU eviction, dan query optimization.

**Acceptance Criteria**:
- [ ] IndexedDB database `cbt_offline_db` terbuat dengan 5 stores
- [ ] Stores: exams, questions, options, answers, syncQueue
- [ ] Indexes terbuat untuk fast queries
- [ ] Storage usage tracking (max 50MB)
- [ ] LRU eviction ketika storage penuh
- [ ] CRUD operations untuk semua stores
- [ ] Transaction handling untuk data consistency

**Implementation Details**:
- Create `src/lib/indexedDB.js` dengan IndexedDBManager class
- Implement stores: exams, questions, options, answers, syncQueue
- Implement indexes untuk fast queries
- Implement storage management dan LRU eviction
- Implement CRUD operations

**Files to Create/Modify**:
- `src/lib/indexedDB.js` (new)
- `src/utils/storageManager.js` (new)

---

### Task 3: Implement Rate Limiting (Client & Server)
**Status**: Not Started  
**Priority**: Critical  
**Effort**: 3 hours  
**Dependencies**: None

**Description**:
Implementasi rate limiting dengan sliding window algorithm. Client-side untuk prevent unnecessary requests, server-side untuk enforce limits.

**Acceptance Criteria**:
- [ ] Client-side rate limiter dengan sliding window
- [ ] Server-side rate limiting middleware
- [ ] Rate limits: 12 req/min general, 1 req/hour submit, 5 req/5min sync
- [ ] User blocking mechanism (15 min block after 3 violations)
- [ ] Rate limit headers di response (X-RateLimit-*)
- [ ] Retry-After header saat rate limited
- [ ] Admin dashboard untuk monitor rate limit violations

**Implementation Details**:
- Create `src/utils/rateLimiter.js` (client-side)
- Create `src/services/rateLimitMiddleware.js` (server-side)
- Implement sliding window algorithm
- Implement user blocking logic
- Add rate limit headers ke API responses

**Files to Create/Modify**:
- `src/utils/rateLimiter.js` (new)
- `src/services/rateLimitMiddleware.js` (new)
- `src/services/api.js` (modify - add rate limit checks)

---

## PHASE 2: Data Sync & Offline Exam (Tasks 4-6)

### Task 4: Implement Pre-Sync (H-1) for Questions
**Status**: Not Started  
**Priority**: Critical  
**Effort**: 4 hours  
**Dependencies**: Task 2, Task 3

**Description**:
Implementasi pre-sync mechanism untuk download semua soal ujian 1 hari sebelum ujian dimulai. Termasuk sync window detection, progress tracking, dan compression.

**Acceptance Criteria**:
- [ ] Sync window detection (24h sebelum exam start)
- [ ] Auto-trigger sync saat student login dalam sync window
- [ ] Download semua questions + options dengan single API call
- [ ] Compress payload dengan gzip (target 60% reduction)
- [ ] Store ke IndexedDB dengan proper indexing
- [ ] Progress bar untuk sync process
- [ ] Status indicator "Soal Tersedia Offline"
- [ ] Fallback ke on-demand download jika pre-sync gagal

**Implementation Details**:
- Create `src/services/syncService.js` untuk manage sync logic
- Implement sync window detection
- Implement question download dengan compression
- Implement progress tracking
- Modify `src/pages/StudentDashboard.jsx` untuk show sync status
- Create sync progress component

**Files to Create/Modify**:
- `src/services/syncService.js` (new)
- `src/components/SyncProgress.jsx` (new)
- `src/pages/StudentDashboard.jsx` (modify)
- `src/services/api.js` (modify - add sync endpoint)

---

### Task 5: Implement Offline Exam Interface
**Status**: Not Started  
**Priority**: Critical  
**Effort**: 5 hours  
**Dependencies**: Task 2, Task 4

**Description**:
Implementasi exam interface yang berfungsi offline. Load questions dari IndexedDB, save answers locally, maintain accurate timer, dan support batch submission.

**Acceptance Criteria**:
- [ ] Load questions dari IndexedDB (instant load)
- [ ] Display questions dengan proper formatting
- [ ] Save answers ke IndexedDB real-time
- [ ] Accurate timer menggunakan device time (tidak tergantung server)
- [ ] Navigation antar soal tanpa API calls
- [ ] Flag/unflag questions
- [ ] Review mode untuk check jawaban sebelum submit
- [ ] Offline indicator di UI
- [ ] Auto-save setiap 30 detik (optional, max 1 per 5 min)

**Implementation Details**:
- Modify `src/pages/ExamInterfacePage.jsx` untuk offline support
- Implement IndexedDB loading untuk questions
- Implement local timer dengan device time
- Implement answer saving ke IndexedDB
- Implement navigation logic (no API calls)
- Implement flag/unflag logic
- Implement review mode

**Files to Create/Modify**:
- `src/pages/ExamInterfacePage.jsx` (modify)
- `src/components/ExamTimer.jsx` (new - local timer)
- `src/components/OfflineIndicator.jsx` (new)
- `src/utils/timerUtils.js` (new)

---

### Task 6: Implement Batch Answer Submission
**Status**: Not Started  
**Priority**: Critical  
**Effort**: 3 hours  
**Dependencies**: Task 2, Task 5

**Description**:
Implementasi batch submission untuk semua jawaban sekaligus saat ujian selesai. Termasuk compression, checksum validation, dan retry mechanism.

**Acceptance Criteria**:
- [ ] Collect semua answers dari IndexedDB
- [ ] Compress payload dengan gzip
- [ ] Add checksum untuk integrity validation
- [ ] Send batch request dengan format compact
- [ ] Show progress indicator saat submit
- [ ] Handle submission success
- [ ] Handle submission failure dengan retry
- [ ] Save failed submission ke sync queue
- [ ] Auto-retry saat koneksi kembali
- [ ] Show confirmation setelah submit berhasil

**Implementation Details**:
- Create `src/services/submissionService.js` untuk manage submission
- Implement batch collection logic
- Implement compression dengan gzip
- Implement checksum calculation
- Implement retry mechanism dengan exponential backoff
- Modify `src/pages/ExamInterfacePage.jsx` untuk add submit button
- Create submission progress component

**Files to Create/Modify**:
- `src/services/submissionService.js` (new)
- `src/components/SubmissionProgress.jsx` (new)
- `src/pages/ExamInterfacePage.jsx` (modify)
- `src/services/api.js` (modify - add submit endpoint)

---

## PHASE 3: Database & API Optimization (Tasks 7-9)

### Task 7: Setup Optimized Supabase Schema
**Status**: Not Started  
**Priority**: High  
**Effort**: 3 hours  
**Dependencies**: None

**Description**:
Setup Supabase database dengan optimized schema untuk batch operations. Termasuk proper indexing, partitioning strategy, dan materialized views.

**Acceptance Criteria**:
- [ ] Tables terbuat: exams, questions, options, answers, exam_sessions, sync_queue, rate_limit_tracker
- [ ] Indexes terbuat untuk fast queries
- [ ] Composite indexes untuk batch operations
- [ ] Materialized view untuk exam_statistics
- [ ] Partitioning strategy untuk answers table (jika supported)
- [ ] Foreign key constraints
- [ ] Timestamps (created_at, updated_at)
- [ ] RLS policies untuk security

**Implementation Details**:
- Create `supabase/migrations/001_init_schema.sql` dengan schema
- Run migration di Supabase
- Verify indexes dan performance
- Setup RLS policies

**Files to Create/Modify**:
- `supabase/migrations/001_init_schema.sql` (new)
- `src/lib/supabase.js` (modify - add table definitions)

---

### Task 8: Implement Batch API Endpoints
**Status**: Not Started  
**Priority**: High  
**Effort**: 4 hours  
**Dependencies**: Task 3, Task 7

**Description**:
Implementasi API endpoints untuk batch operations. Termasuk pre-sync endpoint, batch submit endpoint, auto-save endpoint, dan sync status endpoint.

**Acceptance Criteria**:
- [ ] GET `/api/v1/exams/{examId}/questions` - pre-sync endpoint
- [ ] POST `/api/v1/exams/{examId}/submit` - batch submit endpoint
- [ ] POST `/api/v1/exams/{examId}/autosave` - auto-save endpoint (optional)
- [ ] GET `/api/v1/sync-queue/status` - sync status endpoint
- [ ] POST `/api/v1/exams/{examId}/session/start` - session start endpoint
- [ ] Compression support (gzip)
- [ ] Checksum validation
- [ ] Rate limiting applied
- [ ] Proper error handling
- [ ] Response caching headers

**Implementation Details**:
- Create `src/services/api.js` dengan endpoint implementations
- Implement compression handling
- Implement checksum validation
- Implement rate limiting
- Implement error handling
- Add response caching headers

**Files to Create/Modify**:
- `src/services/api.js` (modify - add endpoints)
- `src/services/apiHandlers.js` (new - endpoint logic)

---

### Task 9: Implement Sync Queue & Retry Mechanism
**Status**: Not Started  
**Priority**: High  
**Effort**: 3 hours  
**Dependencies**: Task 2, Task 6, Task 8

**Description**:
Implementasi sync queue untuk handle failed submissions. Termasuk retry mechanism dengan exponential backoff, conflict resolution, dan monitoring.

**Acceptance Criteria**:
- [ ] Failed submissions saved ke sync queue (IndexedDB)
- [ ] Retry mechanism dengan exponential backoff (1s, 2s, 4s, 8s)
- [ ] Max 5 retries sebelum mark as failed
- [ ] Background sync saat koneksi kembali
- [ ] Conflict resolution menggunakan server-side data
- [ ] Sync status tracking
- [ ] Admin dashboard untuk monitor sync queue
- [ ] Manual retry option untuk admin

**Implementation Details**:
- Create `src/services/syncQueueService.js` untuk manage sync queue
- Implement retry logic dengan exponential backoff
- Implement background sync trigger
- Implement conflict resolution
- Modify Service Worker untuk background sync
- Create sync queue monitoring component

**Files to Create/Modify**:
- `src/services/syncQueueService.js` (new)
- `src/components/SyncQueueMonitor.jsx` (new)
- `public/sw.js` (modify - add background sync)
- `src/pages/AdminMonitoring.jsx` (modify - add sync queue monitoring)

---

## PHASE 4: Monitoring & Admin Tools (Tasks 10-12)

### Task 10: Implement Real-Time Monitoring Dashboard
**Status**: Not Started  
**Priority**: High  
**Effort**: 4 hours  
**Dependencies**: Task 3, Task 9

**Description**:
Implementasi monitoring dashboard untuk admin. Termasuk real-time metrics, quota tracking, error monitoring, dan alerts.

**Acceptance Criteria**:
- [ ] Real-time metrics: active users, API response time, cache hit rate
- [ ] Quota tracking: current usage, estimated usage, warning threshold
- [ ] Error monitoring: error rate, error types, error trends
- [ ] Sync monitoring: sync success rate, failed syncs, retry count
- [ ] Rate limit monitoring: violations, blocked users
- [ ] Performance metrics: response time, throughput
- [ ] Alerts untuk anomalies
- [ ] Export reports functionality

**Implementation Details**:
- Create `src/components/MonitoringDashboard.jsx` untuk main dashboard
- Create metric collection service
- Create alert system
- Modify `src/pages/AdminMonitoring.jsx` untuk integrate monitoring
- Create charts untuk visualize metrics

**Files to Create/Modify**:
- `src/components/MonitoringDashboard.jsx` (new)
- `src/services/metricsService.js` (new)
- `src/services/alertService.js` (new)
- `src/pages/AdminMonitoring.jsx` (modify)

---

### Task 11: Implement Capacity Planning Tools
**Status**: Not Started  
**Priority**: Medium  
**Effort**: 3 hours  
**Dependencies**: Task 10

**Description**:
Implementasi tools untuk capacity planning. Admin dapat predict dan prevent overload dengan calculate estimated quota usage.

**Acceptance Criteria**:
- [ ] Capacity calculator: input jumlah siswa, output estimated API calls
- [ ] Quota warning: alert jika estimated load > 80% quota
- [ ] Storage calculator: estimate storage needed
- [ ] Bandwidth calculator: estimate bandwidth needed
- [ ] Pre-sync distribution: stagger sync across 24 hours
- [ ] Report generation: actual vs estimated usage
- [ ] Optimization suggestions

**Implementation Details**:
- Create `src/components/CapacityPlanner.jsx` untuk capacity planning UI
- Create `src/services/capacityService.js` untuk calculations
- Modify `src/pages/AdminSettings.jsx` untuk add capacity planning section
- Create calculator components

**Files to Create/Modify**:
- `src/components/CapacityPlanner.jsx` (new)
- `src/services/capacityService.js` (new)
- `src/pages/AdminSettings.jsx` (modify)

---

### Task 12: Implement Admin Reporting & Analytics
**Status**: Not Started  
**Priority**: Medium  
**Effort**: 3 hours  
**Dependencies**: Task 10

**Description**:
Implementasi reporting dan analytics untuk admin. Termasuk exam reports, student performance, system health reports.

**Acceptance Criteria**:
- [ ] Exam reports: total submissions, average score, completion rate
- [ ] Student performance: individual scores, time spent, flagged questions
- [ ] System health reports: uptime, error rate, response time trends
- [ ] Quota usage reports: actual vs estimated, trends
- [ ] Export reports: PDF, CSV formats
- [ ] Scheduled reports: daily, weekly, monthly
- [ ] Custom report builder

**Implementation Details**:
- Create `src/components/ReportBuilder.jsx` untuk report UI
- Create `src/services/reportService.js` untuk report generation
- Modify `src/pages/AdminResults.jsx` untuk integrate reporting
- Create export functionality

**Files to Create/Modify**:
- `src/components/ReportBuilder.jsx` (new)
- `src/services/reportService.js` (new)
- `src/pages/AdminResults.jsx` (modify)

---

## PHASE 5: Optimization & Resilience (Tasks 13-15)

### Task 13: Implement Data Compression & Optimization
**Status**: Not Started  
**Priority**: Medium  
**Effort**: 3 hours  
**Dependencies**: Task 4, Task 6

**Description**:
Implementasi data compression untuk minimize bandwidth usage. Termasuk gzip compression, compact format, image optimization, dan delta sync.

**Acceptance Criteria**:
- [ ] Gzip compression untuk API requests/responses
- [ ] Compact format untuk answers (q_id, a, t)
- [ ] WebP image format dengan resize
- [ ] Delta sync untuk only changed data
- [ ] Low bandwidth mode untuk slow connections
- [ ] Compression ratio tracking (target 60%)
- [ ] Bandwidth usage monitoring

**Implementation Details**:
- Implement gzip compression di API calls
- Implement compact format converter
- Implement image optimization
- Implement delta sync logic
- Create low bandwidth mode toggle
- Add compression metrics

**Files to Create/Modify**:
- `src/utils/compressionUtils.js` (new)
- `src/utils/imageOptimizer.js` (new)
- `src/services/api.js` (modify - add compression)
- `src/components/BandwidthModeToggle.jsx` (new)

---

### Task 14: Implement Error Handling & Resilience
**Status**: Not Started  
**Priority**: High  
**Effort**: 3 hours  
**Dependencies**: Task 5, Task 6, Task 9

**Description**:
Implementasi comprehensive error handling dan resilience mechanisms. Termasuk retry logic, fallback strategies, dan user-friendly error messages.

**Acceptance Criteria**:
- [ ] Automatic retry dengan exponential backoff
- [ ] Fallback ke cached data saat error
- [ ] Browser crash recovery (session restore)
- [ ] IndexedDB full handling
- [ ] User-friendly error messages
- [ ] Error logging untuk debugging
- [ ] Graceful degradation
- [ ] Offline error handling

**Implementation Details**:
- Create `src/services/errorHandler.js` untuk centralized error handling
- Implement retry logic
- Implement fallback strategies
- Implement session recovery
- Implement error logging
- Create error boundary components

**Files to Create/Modify**:
- `src/services/errorHandler.js` (new)
- `src/components/ErrorBoundary.jsx` (modify)
- `src/utils/sessionRecovery.js` (new)

---

### Task 15: Implement Progressive Enhancement & Testing
**Status**: Not Started  
**Priority**: Medium  
**Effort**: 4 hours  
**Dependencies**: All previous tasks

**Description**:
Implementasi progressive enhancement untuk support device lama dan slow connections. Termasuk feature detection, graceful degradation, dan comprehensive testing.

**Acceptance Criteria**:
- [ ] Feature detection untuk IndexedDB, Service Worker, etc
- [ ] Fallback ke localStorage jika IndexedDB tidak available
- [ ] Low bandwidth mode untuk 2G/3G
- [ ] Reduced cache size untuk low-memory devices
- [ ] JavaScript disabled fallback
- [ ] Comprehensive unit tests
- [ ] Integration tests untuk offline scenarios
- [ ] Load tests untuk 1000 concurrent users
- [ ] Performance benchmarks

**Implementation Details**:
- Create `src/utils/featureDetection.js` untuk feature detection
- Implement fallback strategies
- Create test suite dengan Jest
- Create integration tests
- Create load tests
- Create performance benchmarks

**Files to Create/Modify**:
- `src/utils/featureDetection.js` (new)
- `src/utils/fallbacks.js` (new)
- `src/__tests__/` (new - test directory)
- `src/__tests__/offline.test.js` (new)
- `src/__tests__/sync.test.js` (new)
- `src/__tests__/submission.test.js` (new)

---

## Implementation Order & Dependencies

```
PHASE 1 (Foundation):
├─ Task 1: Service Worker
├─ Task 2: IndexedDB (depends on Task 1)
└─ Task 3: Rate Limiting (independent)

PHASE 2 (Offline Exam):
├─ Task 4: Pre-Sync (depends on Task 2, 3)
├─ Task 5: Offline Exam (depends on Task 2, 4)
└─ Task 6: Batch Submission (depends on Task 2, 5)

PHASE 3 (Database & API):
├─ Task 7: Supabase Schema (independent)
├─ Task 8: API Endpoints (depends on Task 3, 7)
└─ Task 9: Sync Queue (depends on Task 2, 6, 8)

PHASE 4 (Monitoring):
├─ Task 10: Monitoring Dashboard (depends on Task 3, 9)
├─ Task 11: Capacity Planning (depends on Task 10)
└─ Task 12: Reporting (depends on Task 10)

PHASE 5 (Optimization):
├─ Task 13: Data Compression (depends on Task 4, 6)
├─ Task 14: Error Handling (depends on Task 5, 6, 9)
└─ Task 15: Progressive Enhancement (depends on all)
```

---

## Success Criteria

Sistem dianggap berhasil jika:

1. **Offline-First**: Siswa dapat mengerjakan ujian tanpa koneksi internet
2. **Scalability**: Sistem dapat handle 1000 concurrent users tanpa timeout
3. **Minimal API Calls**: Max 1 call per 5 menit, batch submission saat selesai
4. **Rate Limiting**: 12 req/min per user, no single user overload
5. **Data Integrity**: Semua jawaban tersimpan, tidak ada data loss
6. **Performance**: Response time < 2 detik untuk setiap API call
7. **Monitoring**: Admin dapat monitor real-time metrics dan detect issues
8. **Resilience**: Sistem recover dari errors dan network failures
9. **Compression**: 60% reduction dalam bandwidth usage
10. **Progressive Enhancement**: Berfungsi di device lama dan slow connections

---

## Testing Strategy

### Unit Tests
- Test IndexedDB operations
- Test rate limiter logic
- Test compression/decompression
- Test timer accuracy
- Test retry mechanism

### Integration Tests
- Test offline sync flow
- Test batch submission flow
- Test error recovery flow
- Test rate limiting enforcement
- Test background sync

### Load Tests
- Simulate 1000 concurrent users
- Measure API response time
- Measure database query time
- Measure cache hit rate
- Measure bandwidth usage

### Performance Benchmarks
- Sync time untuk 50 questions
- Submit time untuk 50 answers
- IndexedDB query time
- Service Worker cache hit rate
- Compression ratio

---

## Rollout Plan

1. **Phase 1**: Deploy foundation (Service Worker, IndexedDB, Rate Limiting)
2. **Phase 2**: Deploy offline exam (Pre-Sync, Offline Interface, Batch Submission)
3. **Phase 3**: Deploy database & API (Supabase Schema, API Endpoints, Sync Queue)
4. **Phase 4**: Deploy monitoring (Monitoring Dashboard, Capacity Planning, Reporting)
5. **Phase 5**: Deploy optimization (Compression, Error Handling, Progressive Enhancement)

Each phase should be tested thoroughly before moving to next phase.

---

## Notes

- Semua tasks harus follow offline-first principle
- Minimize API calls adalah prioritas utama
- Rate limiting harus strict untuk prevent overload
- Error handling harus comprehensive
- Monitoring harus real-time untuk quick issue detection
- Testing harus cover offline scenarios
- Documentation harus clear untuk maintenance
