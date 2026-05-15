# Requirements Document: CBT Scalable 1000 Siswa Concurrent

## Introduction

NextCBT harus mendukung 1000 siswa concurrent mengikuti ujian secara bersamaan dengan infrastruktur terbatas (Supabase Free + Vercel Free). Sistem dirancang dengan offline-first architecture untuk meminimalkan API calls, mengoptimalkan database, dan menerapkan rate limiting yang ketat. Siswa melakukan sync soal H-1, ujian offline, dan submit batch untuk efisiensi maksimal.

## Glossary

- **Offline-First**: Aplikasi berfungsi penuh tanpa koneksi internet, sync data saat tersedia
- **Batch Submission**: Pengumpulan jawaban dalam satu request besar, bukan per-soal
- **Sync H-1**: Sinkronisasi soal ujian 1 hari sebelum ujian dimulai
- **Concurrent Users**: Jumlah siswa yang mengakses sistem secara bersamaan
- **Rate Limiting**: Pembatasan jumlah request per waktu untuk mencegah overload
- **IndexedDB**: Database lokal browser untuk penyimpanan data offline
- **Service Worker**: Script yang berjalan di background untuk caching dan sync
- **Exam Session**: Sesi ujian seorang siswa dari login hingga submit
- **Question Payload**: Data soal termasuk teks, gambar, opsi jawaban
- **Answer Batch**: Kumpulan jawaban siswa yang siap disubmit
- **Cache Strategy**: Strategi penyimpanan data lokal untuk performa optimal
- **API Quota**: Batas jumlah request yang diizinkan per periode waktu
- **Supabase Free**: Tier gratis Supabase dengan 500MB storage, 2M monthly active users
- **Vercel Free**: Tier gratis Vercel dengan 100GB bandwidth/bulan
- **Progressive Sync**: Sinkronisasi data secara bertahap tanpa blocking
- **Conflict Resolution**: Mekanisme mengatasi konflik data saat sync

## Requirements

### Requirement 1: Offline-First Architecture

**User Story:** Sebagai siswa, saya ingin mengerjakan ujian tanpa koneksi internet, sehingga gangguan jaringan tidak mengganggu ujian saya.

#### Acceptance Criteria

1. WHEN siswa membuka aplikasi CBT THEN THE System SHALL load semua data dari IndexedDB terlebih dahulu sebelum melakukan API call
2. WHEN siswa mengerjakan soal tanpa koneksi internet THEN THE System SHALL menyimpan jawaban ke IndexedDB secara real-time
3. WHEN koneksi internet kembali tersedia THEN THE System SHALL secara otomatis sync jawaban ke server tanpa intervensi siswa
4. WHEN terjadi konflik data saat sync THEN THE System SHALL menggunakan timestamp untuk menentukan data mana yang valid
5. WHEN siswa menutup aplikasi saat offline THEN THE System SHALL mempertahankan semua data lokal dan dapat dilanjutkan saat dibuka kembali
6. WHILE siswa offline THEN THE System SHALL tetap menampilkan timer ujian yang akurat berdasarkan waktu lokal device

### Requirement 2: Sync Soal H-1 (Pre-Exam Synchronization)

**User Story:** Sebagai admin, saya ingin siswa melakukan sync soal 1 hari sebelum ujian, sehingga server tidak overload saat ujian dimulai.

#### Acceptance Criteria

1. WHEN admin membuka halaman exam management THEN THE System SHALL menampilkan opsi "Enable Pre-Sync" untuk setiap ujian
2. WHEN admin mengaktifkan pre-sync untuk ujian THEN THE System SHALL membuat sync window 24 jam sebelum exam start time
3. WHEN siswa login dalam sync window THEN THE System SHALL secara otomatis trigger download semua soal ujian ke IndexedDB
4. WHEN siswa sudah melakukan sync THEN THE System SHALL menampilkan status "Soal Tersedia Offline" di dashboard
5. IF siswa tidak melakukan sync sebelum ujian dimulai THEN THE System SHALL tetap mengizinkan ujian dengan download soal on-demand
6. WHEN sync soal berlangsung THEN THE System SHALL menampilkan progress bar dan estimasi waktu selesai

### Requirement 3: Minimal API Calls Strategy

**User Story:** Sebagai system architect, saya ingin meminimalkan API calls ke Supabase, sehingga sistem dapat menangani 1000 concurrent users dengan FREE tier.

#### Acceptance Criteria

1. WHEN siswa mengerjakan ujian THEN THE System SHALL melakukan maksimal 1 API call per 5 menit untuk auto-save
2. WHEN siswa submit ujian THEN THE System SHALL mengirim semua jawaban dalam 1 batch request, bukan per-soal
3. WHEN siswa membuka halaman dashboard THEN THE System SHALL menggunakan cached data dan hanya fetch data baru yang berubah
4. IF data cache sudah lebih dari 1 jam THEN THE System SHALL melakukan refresh cache di background tanpa blocking UI
5. WHEN multiple siswa melakukan sync soal bersamaan THEN THE System SHALL menggunakan shared cache untuk mengurangi database queries
6. WHEN siswa navigasi antar soal THEN THE System SHALL tidak melakukan API call, hanya manipulasi data lokal

### Requirement 4: Caching Strategy

**User Story:** Sebagai developer, saya ingin menerapkan caching strategy yang efektif, sehingga performa aplikasi optimal dan API calls minimal.

#### Acceptance Criteria

1. WHEN aplikasi pertama kali diload THEN THE System SHALL menggunakan Service Worker untuk cache static assets (JS, CSS, images)
2. WHEN siswa melakukan sync soal THEN THE System SHALL menyimpan soal ke IndexedDB dengan struktur terindeks untuk query cepat
3. WHEN cache data sudah stale THEN THE System SHALL menggunakan stale-while-revalidate strategy untuk tetap responsif
4. WHEN storage lokal mencapai kapasitas maksimal THEN THE System SHALL immediately menghapus cache tertua terlebih dahulu (LRU eviction) tanpa threshold minimum
5. WHEN siswa membuka aplikasi offline THEN THE System SHALL menampilkan cached data dengan indikator "Offline Mode"
6. WHEN koneksi internet tersedia THEN THE System SHALL secara background sync cache dengan server data terbaru

### Requirement 5: Database Optimization

**User Story:** Sebagai database administrator, saya ingin mengoptimalkan database Supabase, sehingga dapat menangani 1000 concurrent queries tanpa timeout.

#### Acceptance Criteria

1. WHEN siswa melakukan sync soal THEN THE System SHALL menggunakan single query dengan JOIN untuk fetch soal + opsi + metadata
2. WHEN admin membuat laporan hasil ujian THEN THE System SHALL menggunakan aggregation query untuk menghitung statistik, bukan loop
3. WHEN siswa submit ujian THEN THE System SHALL menggunakan batch insert untuk menyimpan semua jawaban dalam 1 transaction
4. WHEN query membutuhkan waktu > 5 detik THEN THE System SHALL menggunakan database view atau materialized cache
5. IF tabel answers sudah besar THEN THE System SHALL menggunakan partitioning berdasarkan exam_id atau created_date
6. WHEN siswa query hasil ujian THEN THE System SHALL menggunakan indexed columns (student_id, exam_id, created_at)

### Requirement 6: Rate Limiting & Quota Management

**User Story:** Sebagai system operator, saya ingin menerapkan rate limiting yang ketat, sehingga sistem stabil dan tidak ada single user yang menghabiskan quota.

#### Acceptance Criteria

1. WHEN siswa melakukan API call THEN THE System SHALL membatasi maksimal 12 requests per menit per user
2. WHEN siswa mencapai rate limit THEN THE System SHALL menampilkan pesan "Terlalu banyak request, coba lagi dalam X detik"
3. WHEN admin melakukan bulk operation THEN THE System SHALL menggunakan separate rate limit bucket (lebih tinggi)
4. WHEN sistem mendekati Supabase quota THEN THE System SHALL menampilkan warning ke admin dan disable non-essential features
5. IF siswa mencoba bypass rate limit THEN THE System SHALL temporary block user untuk 15 menit
6. WHEN rate limit reset THEN THE System SHALL menggunakan sliding window algorithm untuk fairness

### Requirement 7: Batch Answer Submission

**User Story:** Sebagai siswa, saya ingin submit semua jawaban sekaligus saat ujian selesai, sehingga tidak perlu submit per-soal.

#### Acceptance Criteria

1. WHEN siswa mengerjakan soal THEN THE System SHALL menyimpan jawaban ke IndexedDB, bukan langsung ke server
2. WHEN siswa klik tombol "Selesai Ujian" THEN THE System SHALL mengumpulkan semua jawaban dalam satu payload
3. WHEN siswa submit ujian THEN THE System SHALL mengirim batch request dengan format: {exam_id, student_id, answers: [{question_id, answer, time_spent}]}
4. WHEN batch submission berlangsung THEN THE System SHALL menampilkan progress indicator dan disable tombol submit
5. IF batch submission gagal THEN THE System SHALL menyimpan batch ke IndexedDB dan retry otomatis saat koneksi kembali
6. WHEN batch submission berhasil THEN THE System SHALL menampilkan konfirmasi dan redirect ke halaman hasil

### Requirement 8: Concurrent User Handling (1000 Siswa)

**User Story:** Sebagai system architect, saya ingin sistem dapat menangani 1000 siswa concurrent tanpa degradasi performa.

#### Acceptance Criteria

1. WHEN 1000 siswa login bersamaan THEN THE System SHALL distribute load dengan staggered sync (tidak semua sync di waktu yang sama)
2. WHEN siswa melakukan sync soal THEN THE System SHALL menggunakan CDN cache untuk mengurangi database load
3. WHEN multiple siswa submit ujian bersamaan THEN THE System SHALL menggunakan queue mechanism untuk process submissions sequentially
4. IF server response time > 3 detik THEN THE System SHALL cache response dan serve dari cache untuk request identik
5. WHEN database connection pool penuh THEN THE System SHALL queue request dan process saat connection tersedia
6. WHILE 1000 siswa mengerjakan ujian THEN THE System SHALL maintain response time < 2 detik untuk setiap API call

### Requirement 9: Resilience & Error Handling

**User Story:** Sebagai siswa, saya ingin sistem tetap berfungsi meski terjadi error, sehingga ujian saya tidak hilang.

#### Acceptance Criteria

1. WHEN API call gagal THEN THE System SHALL automatically retry dengan exponential backoff (1s, 2s, 4s, 8s)
2. WHEN siswa kehilangan koneksi saat submit THEN THE System SHALL menyimpan batch ke IndexedDB dan retry saat online
3. WHEN browser crash saat ujian THEN THE System SHALL recover session dan lanjutkan ujian dari soal terakhir
4. IF IndexedDB penuh THEN THE System SHALL clear old cache dan notify user tentang storage limitation
5. WHEN server error terjadi THEN THE System SHALL menampilkan user-friendly error message dan suggest action
6. WHEN sync conflict terjadi THEN THE System SHALL resolve menggunakan server-side data sebagai source of truth

### Requirement 10: Monitoring & Analytics

**User Story:** Sebagai admin, saya ingin monitor performa sistem real-time, sehingga dapat detect dan fix issues dengan cepat.

#### Acceptance Criteria

1. WHEN siswa menggunakan aplikasi THEN THE System SHALL collect metrics: API response time, cache hit rate, sync success rate
2. WHEN admin membuka monitoring dashboard THEN THE System SHALL menampilkan: active users, API quota usage, error rate
3. WHEN API response time > 3 detik THEN THE System SHALL log incident dan alert admin
4. WHEN cache hit rate < 70% THEN THE System SHALL analyze dan suggest cache optimization
5. WHEN sync failure rate > 5% THEN THE System SHALL alert admin untuk investigate
6. WHEN exam selesai THEN THE System SHALL generate report: total submissions, average response time, error count

### Requirement 11: Data Compression & Optimization

**User Story:** Sebagai system architect, saya ingin mengoptimalkan ukuran data, sehingga bandwidth usage minimal dan sync lebih cepat.

#### Acceptance Criteria

1. WHEN siswa melakukan sync soal THEN THE System SHALL compress question payload menggunakan gzip (target: 60% reduction)
2. WHEN siswa submit jawaban THEN THE System SHALL menggunakan compact format: {q_id, a, t} bukan {question_id, answer, time_spent}
3. WHEN image dalam soal ditampilkan THEN THE System SHALL menggunakan WebP format dan resize sesuai device screen
4. WHEN siswa offline THEN THE System SHALL store hanya essential data (question_id, answer) bukan full question object
5. WHEN sync soal berlangsung THEN THE System SHALL menggunakan delta sync (hanya data yang berubah)
6. WHEN bandwidth terbatas THEN THE System SHALL offer "Low Bandwidth Mode" yang disable image loading

### Requirement 12: Security & Data Integrity

**User Story:** Sebagai admin, saya ingin sistem aman dari cheating dan data corruption, sehingga hasil ujian valid dan terpercaya.

#### Acceptance Criteria

1. WHEN siswa submit ujian THEN THE System SHALL validate bahwa semua jawaban valid dan tidak ada duplicate submission
2. WHEN siswa mencoba modify answer setelah submit THEN THE System SHALL prevent modification dan log attempt
3. WHEN siswa mencoba access soal ujian yang belum dimulai THEN THE System SHALL block access dan log attempt
4. WHEN batch submission diterima THEN THE System SHALL verify integrity menggunakan checksum
5. WHEN siswa offline saat submit THEN THE System SHALL ensure data tidak hilang dan dapat di-retry
6. WHEN admin query hasil ujian THEN THE System SHALL ensure data consistency dan tidak ada missing answers

### Requirement 13: Progressive Enhancement

**User Story:** Sebagai developer, saya ingin aplikasi tetap berfungsi di device lama dengan koneksi lambat, sehingga accessible untuk semua siswa.

#### Acceptance Criteria

1. WHEN aplikasi diakses di device dengan RAM < 512MB THEN THE System SHALL reduce cache size dan disable heavy features
2. WHEN koneksi internet 2G/3G THEN THE System SHALL automatically enable "Low Bandwidth Mode"
3. WHEN browser tidak support IndexedDB THEN THE System SHALL fallback ke localStorage dengan compression
4. WHEN device storage penuh THEN THE System SHALL prioritize essential data (soal ujian) dan delete non-essential cache
5. WHEN JavaScript disabled THEN THE System SHALL tetap menampilkan basic UI dan informasi
6. WHEN device offline THEN THE System SHALL tetap berfungsi dengan cached data tanpa degradasi functionality

### Requirement 14: Admin Capacity Planning

**User Story:** Sebagai admin, saya ingin tools untuk capacity planning, sehingga dapat predict dan prevent overload.

#### Acceptance Criteria

1. WHEN admin membuka settings THEN THE System SHALL menampilkan: current quota usage, estimated quota untuk N concurrent users
2. WHEN admin schedule ujian THEN THE System SHALL warn jika estimated load > 80% dari Supabase quota
3. WHEN admin input jumlah siswa yang akan ujian THEN THE System SHALL calculate: estimated API calls, storage needed, bandwidth needed
4. WHEN admin enable pre-sync THEN THE System SHALL distribute sync load across 24 jam untuk prevent spike
5. WHEN ujian selesai THEN THE System SHALL generate report: actual quota usage vs estimated
6. WHEN quota usage trending up THEN THE System SHALL suggest optimization atau upgrade

### Requirement 15: Offline Exam Experience

**User Story:** Sebagai siswa, saya ingin pengalaman ujian yang smooth saat offline, sehingga tidak ada perbedaan dengan online.

#### Acceptance Criteria

1. WHEN siswa offline THEN THE System SHALL tetap menampilkan timer yang akurat (tidak tergantung server)
2. WHEN siswa navigate antar soal offline THEN THE System SHALL instant load tanpa loading indicator
3. WHEN siswa submit offline THEN THE System SHALL show "Pending Submit" status dan auto-retry saat online
4. WHEN siswa offline > 30 menit THEN THE System SHALL periodically check koneksi tanpa drain battery
5. WHEN siswa kembali online THEN THE System SHALL sync data dan update UI tanpa page reload
6. WHEN offline session berakhir THEN THE System SHALL auto-submit dan show confirmation

