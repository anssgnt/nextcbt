# Panduan Monitoring Siswa yang Sudah Sync

## Deskripsi Fitur

Halaman **Admin Monitoring** sekarang dilengkapi dengan fitur **Laporan Siswa yang Sudah Sync** yang menampilkan:

1. **Statistik Ringkas**
   - Total Siswa di sistem
   - Jumlah siswa yang sudah sync
   - Persentase siswa yang sudah sync

2. **Tabel Detail Siswa**
   - Nomor urut
   - Nama siswa
   - Kelas
   - Tanggal sync
   - Waktu sync (timestamp lengkap)

3. **Export CSV**
   - Tombol untuk mengekspor laporan ke format CSV
   - File akan berisi semua data siswa yang sudah sync

## Cara Mengakses

1. Login sebagai Admin
2. Navigasi ke **Admin Dashboard** → **Monitoring Sistem**
3. Scroll ke bawah untuk melihat section **"Laporan Siswa yang Sudah Sync"**

## Fitur-Fitur

### 1. Statistik Ringkas
```
┌─────────────────────────────────────────────────────┐
│ Total Siswa: 150  │  Sudah Sync: 120  │  Persentase: 80% │
└─────────────────────────────────────────────────────┘
```

### 2. Tabel Siswa
Menampilkan daftar siswa dengan kolom:
- **No**: Nomor urut
- **Nama Siswa**: Nama lengkap siswa
- **Kelas**: Kelas siswa
- **Tanggal Sync**: Format DD/MM/YYYY
- **Waktu Sync**: Format DD/MM/YYYY HH:MM:SS

### 3. Export CSV
Klik tombol **"Export CSV"** untuk mengunduh laporan dalam format CSV dengan struktur:
```
LAPORAN SISWA YANG SUDAH SYNC
Total Siswa: 150, Sudah Sync: 120, Persentase: 80%
Tanggal Export: 15/05/2026 10:30:45

No,Nama Siswa,Kelas,Tanggal Sync,Waktu Sync
1,Ahmad Rizki,X-A,15/05/2026,15/05/2026 10:30:45
2,Budi Santoso,X-A,15/05/2026,15/05/2026 10:31:12
...
```

## Data Source

Data diambil dari tabel `sync_queue` di Supabase dengan kriteria:
- **Status**: `completed` (hanya siswa yang sudah berhasil sync)
- **Diurutkan**: Berdasarkan waktu sync terbaru (descending)

## Refresh Data

Klik tombol **"Refresh"** di bagian atas halaman untuk memperbarui semua data termasuk laporan siswa sync.

## Interpretasi Data

### Persentase Sync
- **80-100%**: Sebagian besar siswa sudah sync ✓
- **50-79%**: Setengah siswa sudah sync ⚠
- **0-49%**: Sebagian besar siswa belum sync ✗

### Waktu Sync
Menunjukkan kapan siswa terakhir kali melakukan sync. Jika ada siswa yang belum muncul di tabel, berarti siswa tersebut belum pernah melakukan sync.

## Troubleshooting

### Tabel Kosong
Jika tabel menunjukkan "Belum ada siswa yang sync":
1. Pastikan siswa sudah melakukan ujian
2. Pastikan siswa sudah submit jawaban
3. Tunggu beberapa saat untuk sync queue diproses
4. Klik Refresh untuk memperbarui data

### Data Tidak Terupdate
1. Klik tombol **Refresh** untuk memperbarui data
2. Tunggu loading selesai
3. Jika masih tidak terupdate, cek koneksi internet

## Fitur Terkait

- **Sync Queue Chart**: Visualisasi status sync (Pending, Failed, Completed)
- **Capacity Planning**: Estimasi resource untuk ujian concurrent
- **Status Cards**: Ringkasan total siswa, ujian, sesi, dan submitted

## Catatan Teknis

- Data diambil dari tabel `sync_queue` dengan status `completed`
- Siswa yang sama mungkin memiliki multiple sync records (satu per submission)
- Tabel menampilkan unique student IDs dengan waktu sync terbaru
- Export CSV menggunakan format UTF-8 dengan BOM untuk kompatibilitas Excel
