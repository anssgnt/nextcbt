import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'
import { LogOut, Menu, X, LayoutDashboard, BarChart3, Calendar, Users, FileText, BookOpen, Settings, GraduationCap, PieChart } from 'lucide-react'
import { useState, useEffect } from 'react'

export const AdminLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close sidebar on navigate (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: BarChart3, label: 'Monitoring', path: '/admin/monitoring' },
    { icon: Calendar, label: 'Jadwal', path: '/admin/schedule' },
    { icon: Users, label: 'Siswa', path: '/admin/students' },
    { icon: GraduationCap, label: 'Kelas', path: '/admin/classes' },
    { icon: FileText, label: 'Bank Soal', path: '/admin/questions' },
    { icon: PieChart, label: 'Analisis Soal', path: '/admin/analysis' },
    { icon: BookOpen, label: 'Hasil', path: '/admin/results' },
    { icon: Settings, label: 'Pengaturan', path: '/admin/settings' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed z-50' : 'relative'}
        ${sidebarOpen ? (isMobile ? 'translate-x-0' : 'w-64') : (isMobile ? '-translate-x-full' : 'w-16')}
        ${isMobile ? 'w-64' : ''}
        bg-gray-900 text-white transition-all duration-300 flex flex-col h-screen
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {(sidebarOpen || isMobile) && <h1 className="text-lg font-bold">NextCBT</h1>}
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-800 rounded">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-800 rounded">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={18} />
                {(sidebarOpen || isMobile) && <span className="font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition text-sm">
            <LogOut size={18} />
            {(sidebarOpen || isMobile) && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 ${!isMobile && sidebarOpen ? '' : ''}`}>
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-3 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={20} />
              </button>
            )}
            <p className="text-sm text-gray-600 hidden sm:block">Selamat datang, {user?.name || 'Admin'}</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
