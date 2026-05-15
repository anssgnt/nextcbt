import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card } from '../components'
import { useAuthStore } from '../store'
import { Lock, Mail, Shield, BarChart3 } from 'lucide-react'

export const AdminLogin = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Mock admin credentials untuk testing
  const MOCK_ADMIN = {
    email: 'admin@cbt.com',
    password: 'admin123'
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Simulasi delay login
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock authentication
      if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
        setUser({ id: 'admin-1', email, name: 'Admin' }, 'admin')
        navigate('/admin/dashboard')
      } else {
        setError('Email atau password salah. Gunakan: admin@cbt.com / admin123')
      }
    } catch (err) {
      setError('Login gagal. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-purple-400 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white pt-8 pb-12 shadow-lg">
        <div className="max-w-md mx-auto px-4">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
              <Shield size={40} className="text-purple-600" />
            </div>
            <h1 className="text-4xl font-bold mb-2">NextCBT</h1>
            <p className="text-purple-100 text-lg">Portal Admin</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <BarChart3 size={24} className="mx-auto mb-1" />
              <p className="text-xs text-purple-100">Analitik</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <Lock size={24} className="mx-auto mb-1" />
              <p className="text-xs text-purple-100">Aman</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8 max-w-md mx-auto w-full flex items-center">
        <Card className="w-full shadow-2xl">
          <div className="space-y-6">
            {/* Welcome Text */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Admin</h2>
              <p className="text-gray-600">Akses dashboard admin</p>
            </div>

            {/* Demo Credentials Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-semibold mb-2">Demo Credentials:</p>
              <p className="text-xs text-blue-700">Email: <code className="bg-white px-2 py-1 rounded">admin@cbt.com</code></p>
              <p className="text-xs text-blue-700">Password: <code className="bg-white px-2 py-1 rounded">admin123</code></p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="admin@cbt.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-base"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Lock size={16} className="inline mr-2" />
                  Kata Sandi
                </label>
                <Input
                  type="password"
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
                  <p className="font-medium">Kesalahan</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <Button 
                type="submit" 
                size="lg" 
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
              >
                <Shield size={20} />
                {isLoading ? 'Sedang Masuk...' : 'Masuk'}
              </Button>
            </form>

            {/* Footer Info */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Akses admin saja. Akses tidak sah dilarang.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Safe Area */}
      <div className="h-4"></div>
    </div>
  )
}
