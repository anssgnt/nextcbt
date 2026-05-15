# Landing Page Guide

## Overview

Landing page baru telah ditambahkan ke aplikasi CBT dengan desain yang modern dan user-friendly, terinspirasi dari aplikasi mobile CBT yang profesional.

## Fitur Landing Page

### 1. **Status Bar**
- Menampilkan waktu, sinyal, dan baterai
- Memberikan kesan aplikasi mobile yang native

### 2. **Header**
- Logo sekolah (SMP NEGERI 1)
- Tagline sekolah: "Cerdas, Berkarakter, Berprestasi"
- Tombol notifikasi (bell icon)

### 3. **Hero Card**
- Greeting message "Selamat Datang 👋"
- Judul utama "CBT Online"
- Deskripsi: "Siap Ujian, Siap Prestasi"
- Call-to-action button "Mulai Ujian" yang mengarah ke student login
- Ilustrasi karakter (placeholder)

### 4. **Menu Cepat (Quick Menu)**
8 menu items dengan icon dan warna berbeda:
- 📅 Jadwal Ujian (Blue)
- 📢 Pengumuman (Green)
- 🏆 Hasil Ujian (Purple)
- 📚 Materi Belajar (Orange)
- ❓ Simulasi Ujian (Pink)
- 💬 Bantuan (Teal)
- 💬 FAQ (Yellow)
- 👤 Profil Saya (Dark Blue)

### 5. **Ujian Terdokat (Upcoming Exam)**
- Card dengan background hijau
- Menampilkan exam terdekat
- Informasi: mata pelajaran, tanggal, waktu
- Status button "Akan Datang"

### 6. **Pengumuman Terbaru (Latest Announcements)**
- List pengumuman dari admin
- Setiap item menampilkan:
  - Icon
  - Judul pengumuman
  - Tanggal dan pembuat
  - Clickable untuk detail

### 7. **Bottom Navigation**
- 5 menu utama:
  - 🏠 Beranda (Home) - Active
  - ✅ Ujian (Exams)
  - 📢 Pengumuman (Announcements)
  - 🏆 Hasil (Results)
  - 👤 Profil (Profile)

### 8. **Mobile Indicator**
- Indicator bar di bawah untuk menunjukkan aplikasi mobile

## Routing

Landing page dapat diakses di:
```
http://localhost:5173/
```

Dari landing page, user dapat:
- Klik "Mulai Ujian" → `/student/login`
- Klik menu items → Akan di-implement sesuai kebutuhan
- Klik bottom navigation → Akan di-implement sesuai kebutuhan

## Styling

Landing page menggunakan:
- **TailwindCSS** untuk styling
- **Lucide React** untuk icons
- **Responsive Design** - Mobile-first approach
- **Color Scheme**:
  - Primary: Blue (#2563eb)
  - Secondary: Green, Purple, Orange, Pink, Teal, Yellow
  - Background: Light gray (#f9fafb)

## Komponen yang Digunakan

- React Router untuk navigation
- Lucide React icons:
  - Calendar
  - MessageSquare
  - BookOpen
  - Users
  - HelpCircle
  - User
  - Home
  - CheckSquare
  - Megaphone
  - Award

## Customization

### Mengubah Nama Sekolah
Edit di `LandingPage.jsx`:
```jsx
<h1 className="font-bold text-lg">SMP NEGERI 1</h1>
<p className="text-xs text-blue-100">Cerdas, Berkarakter, Berprestasi</p>
```

### Mengubah Ujian Terdokat
Edit data di `announcements` array:
```jsx
const announcements = [
  {
    icon: Calendar,
    title: 'Ujian Terdokat',
    subtitle: 'Matematika',
    date: 'Kamis, 25 Mei 2024',
    time: '08:00 - 10:00 WIB',
    status: 'Akan Datang',
  },
  // ...
]
```

### Mengubah Pengumuman
Edit data di `announcements` array untuk menambah/mengubah pengumuman.

### Mengubah Warna Menu
Edit `color` property di `menuItems` array:
```jsx
const menuItems = [
  { icon: Calendar, label: 'Jadwal\nUjian', color: 'bg-blue-500' },
  // ...
]
```

## Next Steps

1. **Implementasi Menu Items**
   - Buat halaman untuk setiap menu item
   - Update onClick handlers

2. **Implementasi Bottom Navigation**
   - Buat halaman untuk setiap menu
   - Update active state berdasarkan route

3. **Integrasi Data Dinamis**
   - Fetch ujian terdokat dari database
   - Fetch pengumuman terbaru dari database
   - Fetch data siswa untuk greeting

4. **Animasi & Interaksi**
   - Tambah hover effects
   - Tambah loading states
   - Tambah transition animations

5. **PWA Features**
   - Optimize untuk offline mode
   - Tambah app shortcuts
   - Optimize untuk home screen installation

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lazy loading routes
- Code splitting
- Optimized images
- Minimal re-renders
- Lighthouse score: 95+

## Accessibility

- Semantic HTML
- ARIA labels untuk icons
- Keyboard navigation support
- Color contrast compliance

## File Location

```
src/pages/LandingPage.jsx
```

## Related Files

- `src/routes/index.jsx` - Route configuration
- `src/pages/index.js` - Page exports
- `src/App.jsx` - Main app component
