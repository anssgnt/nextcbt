import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, BookOpen, Award, User, ArrowLeft } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home, label: 'Beranda', path: '/student/dashboard' },
  { icon: BookOpen, label: 'Ujian', path: '/student/exams' },
  { icon: Award, label: 'Hasil', path: '/results' },
  { icon: User, label: 'Profil', path: '/profile' },
]

// Pages that show bottom nav
const PAGES_WITH_NAV = ['/student/dashboard', '/student/exams', '/results', '/profile', '/announcements']

// Back button targets (child → parent)
const BACK_TARGETS = {
  '/student/exams': '/student/dashboard',
  '/results': '/student/dashboard',
  '/profile': '/student/dashboard',
  '/announcements': '/student/dashboard',
}

export const StudentLayout = ({ children, title, showBack = false, backTo }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const showNav = PAGES_WITH_NAV.includes(location.pathname)

  // Sync version tracking
  const [syncVersion, setSyncVersion] = useState(null)
  useEffect(() => {
    try {
      const versions = JSON.parse(localStorage.getItem('exam_versions') || '{}')
      const allVersions = Object.values(versions)
      if (allVersions.length > 0) {
        // Show the most recent version
        const latest = Math.max(...allVersions)
        setSyncVersion(latest)
      }
    } catch { /* ignore */ }
  }, [])

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
    } else if (BACK_TARGETS[location.pathname]) {
      navigate(BACK_TARGETS[location.pathname])
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/student/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with back */}
      {(title || showBack) && (
        <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-30">
          {showBack && (
            <button onClick={handleBack} className="p-1 hover:bg-white/10 rounded-lg">
              <ArrowLeft size={22} />
            </button>
          )}
          {title && <h1 className="font-bold text-lg">{title}</h1>}
        </div>
      )}

      {/* Content */}
      <div>{children}</div>

      {/* Bottom Navigation */}
      {showNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
          {/* Sync version indicator */}
          {syncVersion && (
            <div className="flex items-center justify-center gap-1.5 py-1 bg-gray-50 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-[10px] text-gray-500">
                v{new Date(syncVersion).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
              </span>
            </div>
          )}
          <div className="flex justify-around items-center px-2 py-2 max-w-md mx-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
