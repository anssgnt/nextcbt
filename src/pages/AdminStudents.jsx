import { useState, useEffect } from 'react'
import { Upload, Download, Trash2, Plus, Search, Loader2 } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/Toast'
import { adminService } from '../services/api'

export const AdminStudents = () => {
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [file, setFile] = useState(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', nis: '', class_name: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 20

  // Load from Supabase on mount
  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const { data, error } = await adminService.getStudents()
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Failed to load students:', err.message)
    } finally {
      setLoading(false)
    }
  }



  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (uploadedFile) setFile(uploadedFile)
  }

  const handleImport = () => {
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(event.target.result, { type: 'binary' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(sheet)

        const imported = data.map((row) => ({
          name: row.Nama || row.nama || '',
          nis: String(row.NIS || row.nis || ''),
          class_name: row.Kelas || row.kelas || '',
          email: row.Email || row.email || '',
        })).filter((s) => s.name && s.nis)

        // Save to Supabase
        const { data: savedData, error } = await adminService.bulkImportStudents(imported)

        if (error) {
          console.error('Supabase import failed:', error.message)
          toast.error('Import gagal: ' + error.message)
        } else {
          await loadStudents()
          toast.success(`Import berhasil! ${savedData?.length || imported.length} siswa disimpan.`)
        }

        setFile(null)
      } catch (err) {
        toast.error('Error import: ' + err.message)
      } finally {
        setImporting(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const template = [
      { NIS: '001', Nama: 'Ahmad Rizki', Kelas: 'IX A', Email: 'ahmad@school.com' },
      { NIS: '002', Nama: 'Budi Santoso', Kelas: 'IX B', Email: 'budi@school.com' },
      { NIS: '003', Nama: 'Citra Dewi', Kelas: 'IX A', Email: 'citra@school.com' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa')
    XLSX.writeFile(wb, 'template_siswa.xlsx')
  }

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.nis) return
    try {
      const { data, error } = await adminService.createStudent(newStudent)
      if (error) throw error
      await loadStudents()
      toast.success('Siswa berhasil ditambahkan')
    } catch (err) {
      toast.error('Gagal menambah siswa: ' + err.message)
    }
    setNewStudent({ name: '', nis: '', class_name: '', email: '' })
    setShowAdd(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus siswa ini?')) return
    try {
      const { error } = await adminService.deleteStudent(id)
      if (error) throw error
      setStudents(students.filter((s) => s.id !== id))
      toast.success('Siswa dihapus')
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message)
    }
  }

  const filtered = students.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.nis || '').includes(search) ||
    (s.class_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Siswa</h1>
            <p className="text-sm text-gray-600">Data tersimpan di Supabase</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus size={18} />
            Tambah Siswa
          </button>
        </div>

        {/* Add Student Form */}
        {showAdd && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input type="text" placeholder="NIS" value={newStudent.nis} onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="text" placeholder="Nama Lengkap" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="text" placeholder="Kelas" value={newStudent.class_name} onChange={(e) => setNewStudent({ ...newStudent, class_name: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="email" placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={handleAddStudent} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Simpan</button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import Data Siswa</CardTitle>
            <CardDescription>Upload Excel (.xlsx) - Kolom: NIS, Nama, Kelas, Email → Disimpan ke Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {file && <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>}
              </div>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                <Download size={18} /> Template
              </button>
              <button onClick={handleImport} disabled={!file || importing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daftar Siswa ({filtered.length})</CardTitle>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">NIS</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama</th>
                      <th className="px-4 py-3 text-left font-semibold">Kelas</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{student.nis}</td>
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3">{student.class_name}</td>
                        <td className="px-4 py-3 text-gray-600">{student.email}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDelete(student.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={perPage} />
                {filtered.length === 0 && <p className="text-center text-gray-500 py-8">Tidak ada data siswa</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
