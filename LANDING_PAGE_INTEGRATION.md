# Landing Page - Data Integration Guide

## Overview

Panduan lengkap untuk mengintegrasikan landing page dengan data dinamis dari Supabase.

## Current State

Landing page saat ini menggunakan **hardcoded data** untuk:
- Ujian terdokat (upcoming exam)
- Pengumuman terbaru (announcements)

## Integration Steps

### Step 1: Fetch Upcoming Exams

#### Add to API Service
File: `src/services/api.js`

```javascript
export const studentService = {
  // ... existing methods ...

  async getUpcomingExams(limit = 1) {
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, duration, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(limit)
    return { data, error }
  },

  async getLatestAnnouncements(limit = 4) {
    const { data, error } = await supabase
      .from('announcements')  // Perlu create table ini
      .select('id, title, content, created_at, admin_id')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },
}
```

### Step 2: Create Announcements Table

File: `supabase.sql`

```sql
-- Create announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read announcements
CREATE POLICY "Anyone can read announcements"
  ON announcements FOR SELECT
  USING (true);

-- RLS Policy: Only admins can insert
CREATE POLICY "Only admins can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- RLS Policy: Only admins can update their announcements
CREATE POLICY "Only admins can update announcements"
  ON announcements FOR UPDATE
  USING (auth.uid() = admin_id);

-- RLS Policy: Only admins can delete their announcements
CREATE POLICY "Only admins can delete announcements"
  ON announcements FOR DELETE
  USING (auth.uid() = admin_id);
```

### Step 3: Update Landing Page Component

File: `src/pages/LandingPage.jsx`

```javascript
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Calendar, MessageSquare, BookOpen, Users, HelpCircle, User, Home, CheckSquare, Megaphone, Award } from 'lucide-react'
import { studentService } from '../services/api'

export default function LandingPage() {
  const navigate = useNavigate()
  const [upcomingExam, setUpcomingExam] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch upcoming exams
      const { data: examsData, error: examsError } = await studentService.getUpcomingExams(1)
      if (examsError) throw examsError
      if (examsData && examsData.length > 0) {
        setUpcomingExam(examsData[0])
      }

      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await studentService.getLatestAnnouncements(4)
      if (announcementsError) throw announcementsError
      setAnnouncements(announcementsData || [])

      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ... rest of component ...

  // Update announcements rendering
  const announcementsList = announcements.length > 0 ? announcements : [
    {
      id: 1,
      title: 'Jadwal Ujian Semester Genap 2023/2024',
      created_at: '2024-05-20',
    },
    {
      id: 2,
      title: 'Ketentuan Pelaksanaan Ujian CBT',
      created_at: '2024-05-18',
    },
    {
      id: 3,
      title: 'Selamat Mengerjakan Ujian!',
      created_at: '2024-05-15',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ... existing JSX ... */}

      {/* Ujian Terdokat */}
      {upcomingExam && (
        <div className="px-4 mt-8">
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Calendar size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-green-600 font-semibold mb-1">Ujian Terdokat</p>
                <h4 className="font-bold text-gray-800 mb-1">{upcomingExam.title}</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {new Date(upcomingExam.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <button className="text-green-600 text-xl">→</button>
            </div>
            <button className="mt-3 w-full bg-green-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-600 transition">
              Akan Datang
            </button>
          </div>
        </div>
      )}

      {/* Pengumuman Terbaru */}
      <div className="px-4 mt-8 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Pengumuman Terbaru</h3>
          <a href="#" className="text-blue-600 text-sm font-semibold">
            Lihat Semua
          </a>
        </div>

        <div className="space-y-3">
          {announcementsList.map((item, idx) => (
            <button
              key={item.id || idx}
              className="w-full bg-white rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition border border-gray-100"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 flex-shrink-0">
                <Megaphone size={20} />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-gray-800 text-sm">{item.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(item.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* ... rest of JSX ... */}
    </div>
  )
}
```

### Step 4: Add Loading State

```javascript
// Add loading skeleton
import { Skeleton } from '../components'

// In JSX, show skeleton while loading
{loading ? (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <Skeleton key={i} className="h-16 rounded-xl" />
    ))}
  </div>
) : (
  // ... announcements list ...
)}
```

### Step 5: Add Error Handling

```javascript
// Show error message if fetch fails
{error && (
  <div className="px-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-sm text-red-600">
      Error loading data: {error}
    </p>
    <button
      onClick={fetchData}
      className="mt-2 text-sm text-red-600 font-semibold hover:text-red-700"
    >
      Retry
    </button>
  </div>
)}
```

## Alternative: Using Zustand Store

Jika ingin menggunakan Zustand untuk state management:

```javascript
// src/store/index.js
import { create } from 'zustand'

export const useLandingStore = create((set) => ({
  upcomingExam: null,
  announcements: [],
  loading: false,
  error: null,

  setUpcomingExam: (exam) => set({ upcomingExam: exam }),
  setAnnouncements: (announcements) => set({ announcements }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchData: async () => {
    set({ loading: true })
    try {
      const { data: examsData } = await studentService.getUpcomingExams(1)
      const { data: announcementsData } = await studentService.getLatestAnnouncements(4)
      
      set({
        upcomingExam: examsData?.[0] || null,
        announcements: announcementsData || [],
        error: null,
      })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ loading: false })
    }
  },
}))
```

## Database Schema Addition

Jika belum ada tabel announcements, jalankan SQL ini di Supabase:

```sql
-- Create announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read announcements"
  ON announcements FOR SELECT USING (true);

CREATE POLICY "Only admins can insert announcements"
  ON announcements FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Only admins can update announcements"
  ON announcements FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "Only admins can delete announcements"
  ON announcements FOR DELETE USING (auth.uid() = admin_id);
```

## Testing

### Test Locally
```bash
npm run dev
# Visit http://localhost:5173/
# Check console for any errors
# Verify data loads correctly
```

### Test with Real Data
1. Create announcements in Supabase
2. Create exams in Supabase
3. Refresh landing page
4. Verify data displays correctly

## Performance Optimization

### Add Caching
```javascript
// Cache data for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

const fetchData = async () => {
  const cached = localStorage.getItem('landing-data')
  const cacheTime = localStorage.getItem('landing-data-time')
  
  if (cached && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_DURATION) {
    const data = JSON.parse(cached)
    setUpcomingExam(data.upcomingExam)
    setAnnouncements(data.announcements)
    return
  }

  // Fetch fresh data...
  localStorage.setItem('landing-data', JSON.stringify({
    upcomingExam,
    announcements,
  }))
  localStorage.setItem('landing-data-time', Date.now().toString())
}
```

### Add Pagination
```javascript
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)

const loadMore = async () => {
  const { data } = await studentService.getLatestAnnouncements(4, page * 4)
  setAnnouncements([...announcements, ...data])
  setPage(page + 1)
}
```

## Troubleshooting

### Data not loading
1. Check Supabase connection
2. Verify API keys in .env
3. Check browser console for errors
4. Verify RLS policies

### Slow loading
1. Add indexes to database
2. Implement caching
3. Optimize queries
4. Use pagination

### CORS errors
1. Check Supabase CORS settings
2. Verify API URL
3. Check authentication

## Next Steps

1. ✅ Create announcements table
2. ✅ Add API methods
3. ✅ Update landing page component
4. ✅ Add loading states
5. ✅ Add error handling
6. ✅ Test with real data
7. ✅ Optimize performance
8. ✅ Deploy to production

## Summary

Dengan mengikuti panduan ini, landing page akan:
- ✅ Menampilkan ujian terdokat dari database
- ✅ Menampilkan pengumuman terbaru dari database
- ✅ Handle loading states
- ✅ Handle error states
- ✅ Cache data untuk performa
- ✅ Siap untuk production
