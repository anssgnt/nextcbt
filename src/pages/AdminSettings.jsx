import { useNavigate } from 'react-router-dom'
import { Save, Upload, Loader2 } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'

const DEFAULT_SETTINGS = {
  schoolName: 'SMP NEGERI 1',
  schoolMotto: 'Cerdas, Berkarakter, Berprestasi',
  schoolAddress: 'Jl. Pendidikan No. 1',
  schoolPhone: '(021) 1234567',
  schoolEmail: 'info@smpn1.sch.id',
  examDuration: 120,
  maxAttempts: 1,
  passingScore: 70,
  minWorkingTime: 30,
  enableOfflineMode: true,
  enableTabDetection: true,
  autoSaveInterval: 30,
  syncTime: 'H-1 23:59',
  logo: null,
  examInstruction: 'Baca setiap soal dengan teliti sebelum menjawab. Waktu ujian akan berjalan otomatis setelah Anda memulai.',
  examFinishMessage: 'Terima kasih telah mengerjakan ujian. Hasil akan diumumkan setelah semua peserta selesai.',
  showQuestionNumber: true,
  examThemeColor: '#2563eb',
  tataTertib: '1. Siswa wajib hadir 15 menit sebelum ujian\n2. Dilarang membuka aplikasi lain saat ujian\n3. Dilarang bekerja sama dengan siswa lain\n4. Pastikan baterai HP terisi penuh\n5. Sync soal sebelum ujian dimulai',
  tutorialPanduan: '1. Login menggunakan NIS\n2. Pilih ujian yang tersedia\n3. Klik Sync untuk download soal\n4. Masukkan token dari pengawas\n5. Kerjakan soal hingga selesai\n6. Klik Submit untuk mengirim jawaban',
  pengumuman: '',
  forcePwa: false,
  loginMode: 'nis',
}

export const AdminSettings = () => {
  const navigate = useNavigate()
  const [logoFile, setLogoFile] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  // Load settings dari Supabase saat mount, fallback ke localStorage
  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true)
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('data')
          .eq('id', 'main')
          .single()

        if (!error && data?.data?.settings) {
          const dbSettings = { ...DEFAULT_SETTINGS, ...data.data.settings }
          setSettings(dbSettings)
          // Sync ke localStorage sebagai cache
          localStorage.setItem('cbt_settings', JSON.stringify(dbSettings))
        } else {
          // Fallback ke localStorage
          const saved = localStorage.getItem('cbt_settings')
          if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
        }
      } catch {
        // Offline fallback
        const saved = localStorage.getItem('cbt_settings')
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      } finally {
        setLoadingSettings(false)
      }
    }
    loadSettings()
  }, [])

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target.result
        setSettings(prev => ({ ...prev, logo: base64 }))
        setLogoFile(file.name)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    localStorage.setItem('cbt_settings', JSON.stringify(settings))

    // Generate combined JSON: settings + active exams list
    try {
      // Fetch active exams for the combined JSON
      const { data: exams } = await supabase
        .from('exams')
        .select('id, title, duration, questions_count, token, description, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const combinedData = {
        settings,
        exams: (exams || []).map((e) => ({
          id: e.id,
          title: e.title,
          duration: e.duration,
          questions_count: e.questions_count,
          token: e.token,
          meta: (() => { try { return JSON.parse(e.description || '{}') } catch { return {} } })(),
        })),
        version: Date.now(),
      }

      await supabase.from('app_settings').upsert({ id: 'main', data: combinedData }, { onConflict: 'id' })
      alert('Pengaturan berhasil disimpan & dipublish!')
    } catch (err) {
      // Fallback: save settings only
      await supabase.from('app_settings').upsert({ id: 'main', data: { settings, version: Date.now() } }, { onConflict: 'id' }).catch(() => {})
      alert('Pengaturan disimpan! (jadwal gagal di-generate: ' + err.message + ')')
    }
  }

  return (
    <AdminLayout>
      {loadingSettings ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
          <p className="text-sm text-gray-600">Kelola konfigurasi sekolah dan sistem CBT</p>
        </div>

        {/* School Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informasi Sekolah</CardTitle>
            <CardDescription>Data identitas sekolah</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo Sekolah</label>
              <div className="flex gap-4 items-start">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-2xl">🏫</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-2">Format: PNG, JPG (Max 2MB)</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nama Sekolah</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Motto Sekolah</label>
              <input
                type="text"
                value={settings.schoolMotto}
                onChange={(e) => handleChange('schoolMotto', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                <input
                  type="text"
                  value={settings.schoolAddress}
                  onChange={(e) => handleChange('schoolAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
                <input
                  type="text"
                  value={settings.schoolPhone}
                  onChange={(e) => handleChange('schoolPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={settings.schoolEmail}
                onChange={(e) => handleChange('schoolEmail', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exam Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pengaturan Ujian</CardTitle>
            <CardDescription>Konfigurasi parameter ujian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durasi Ujian (menit)</label>
                <input
                  type="number"
                  value={settings.examDuration}
                  onChange={(e) => handleChange('examDuration', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maksimal Percobaan</label>
                <input
                  type="number"
                  value={settings.maxAttempts}
                  onChange={(e) => handleChange('maxAttempts', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Kelulusan</label>
                <input
                  type="number"
                  value={settings.passingScore}
                  onChange={(e) => handleChange('passingScore', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimal Waktu Mengerjakan (menit)</label>
                <input
                  type="number"
                  value={settings.minWorkingTime}
                  onChange={(e) => handleChange('minWorkingTime', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Siswa harus mengerjakan minimal {settings.minWorkingTime} menit sebelum submit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offline Sync Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pengaturan Sinkronisasi Offline</CardTitle>
            <CardDescription>Konfigurasi untuk mode offline CBT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Waktu Sinkronisasi Soal</label>
              <input
                type="text"
                value={settings.syncTime}
                onChange={(e) => handleChange('syncTime', e.target.value)}
                placeholder="H-1 23:59"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">Soal akan otomatis tersinkronisasi ke HP siswa pada waktu ini</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Mode Offline</p>
                <p className="text-sm text-gray-600">Izinkan ujian tanpa koneksi internet</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableOfflineMode}
                onChange={(e) => handleChange('enableOfflineMode', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Deteksi Perpindahan Tab</p>
                <p className="text-sm text-gray-600">Peringatan saat siswa berpindah tab</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableTabDetection}
                onChange={(e) => handleChange('enableTabDetection', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-save Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pengaturan Auto-save</CardTitle>
            <CardDescription>Interval penyimpanan otomatis jawaban</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interval (detik)</label>
              <input
                type="number"
                value={settings.autoSaveInterval}
                onChange={(e) => handleChange('autoSaveInterval', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">Jawaban akan disimpan setiap {settings.autoSaveInterval} detik</p>
            </div>
          </CardContent>
        </Card>

        {/* Kustomisasi Tampilan Ujian */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Kustomisasi Tampilan Ujian</CardTitle>
            <CardDescription>Instruksi dan pesan yang ditampilkan ke siswa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instruksi Sebelum Ujian</label>
              <textarea
                value={settings.examInstruction}
                onChange={(e) => handleChange('examInstruction', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Instruksi yang ditampilkan sebelum siswa memulai ujian..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pesan Setelah Submit</label>
              <textarea
                value={settings.examFinishMessage}
                onChange={(e) => handleChange('examFinishMessage', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Pesan yang ditampilkan setelah siswa submit ujian..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warna Tema Ujian</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings.examThemeColor}
                    onChange={(e) => handleChange('examThemeColor', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{settings.examThemeColor}</span>
                </div>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showQuestionNumber}
                    onChange={(e) => handleChange('showQuestionNumber', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Tampilkan Nomor Soal</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA & Login Mode */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mode Aplikasi & Login</CardTitle>
            <CardDescription>Pengaturan PWA dan metode login siswa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 text-sm">Wajib Install PWA</p>
                <p className="text-xs text-gray-500">Jika aktif, siswa harus install aplikasi (tidak bisa buka di browser biasa)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.forcePwa}
                onChange={(e) => handleChange('forcePwa', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode Login Siswa</label>
              <select
                value={settings.loginMode}
                onChange={(e) => handleChange('loginMode', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="nis">Login dengan NIS</option>
                <option value="nama">Login dengan Nama (autosuggest)</option>
                <option value="both">Keduanya (switch NIS / Nama)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.loginMode === 'nis' && 'Siswa memasukkan NIS untuk login'}
                {settings.loginMode === 'nama' && 'Siswa mengetik nama, muncul suggestion dari database'}
                {settings.loginMode === 'both' && 'Siswa bisa pilih login pakai NIS atau Nama'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informasi Landing Page */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informasi Landing Page</CardTitle>
            <CardDescription>Konten yang ditampilkan di halaman utama siswa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tata Tertib Ujian</label>
              <textarea
                value={settings.tataTertib}
                onChange={(e) => handleChange('tataTertib', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Tulis tata tertib ujian (1 baris per poin)..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tutorial / Panduan</label>
              <textarea
                value={settings.tutorialPanduan}
                onChange={(e) => handleChange('tutorialPanduan', e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Tulis panduan cara mengerjakan ujian (1 baris per langkah)..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pengumuman</label>
              <textarea
                value={settings.pengumuman}
                onChange={(e) => handleChange('pengumuman', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Tulis pengumuman untuk siswa (kosongkan jika tidak ada)..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Save size={20} />
            Simpan Pengaturan
          </button>
        </div>
      </div>
      )}
    </AdminLayout>
  )
}
