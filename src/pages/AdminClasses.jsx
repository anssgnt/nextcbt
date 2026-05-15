import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Users, Printer } from 'lucide-react'
import { AdminLayout } from '../layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { supabase } from '../lib/supabase'

export const AdminClasses = () => {
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', grade: '' })
  const [selectedClass, setSelectedClass] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get unique class_name from students
      const { data: studentsData } = await supabase.from('students').select('id, name, nis, class_name, email').order('name')
      setStudents(studentsData || [])

      // Group by class_name
      const classMap = {}
      ;(studentsData || []).forEach((s) => {
        const cn = s.class_name || 'Tanpa Kelas'
        if (!classMap[cn]) classMap[cn] = []
        classMap[cn].push(s)
      })
      setClasses(Object.entries(classMap).map(([name, members]) => ({ name, count: members.length })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClass = async () => {
    if (!form.name) return
    // Just add a placeholder student to create the class, or we track classes separately
    // For simplicity, classes are derived from student data. We'll just show the form info.
    alert(`Kelas "${form.name}" akan muncul setelah ada siswa yang di-assign ke kelas ini.`)
    setForm({ name: '', grade: '' })
    setShowForm(false)
  }

  const handlePrintKartu = (classStudents, className) => {
    const settings = JSON.parse(localStorage.getItem('cbt_settings') || '{}')
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Kartu Peserta - ${className}</title><style>
      body{font-family:Arial,sans-serif;padding:20px}
      .card{border:2px solid #333;padding:16px;margin:10px;width:300px;display:inline-block;vertical-align:top;page-break-inside:avoid}
      .card h3{margin:0 0 4px;font-size:14px}
      .card p{margin:2px 0;font-size:12px}
      .card .photo{width:60px;height:80px;border:1px solid #ccc;float:right;text-align:center;line-height:80px;font-size:10px;color:#999}
      .header{text-align:center;margin-bottom:20px}
      @media print{.card{break-inside:avoid}}
    </style></head><body>`)
    w.document.write(`<div class="header"><h2>${settings.schoolName || 'Sekolah'}</h2><p>KARTU PESERTA UJIAN</p><p>Kelas: ${className}</p></div>`)
    classStudents.forEach((s) => {
      w.document.write(`<div class="card"><div class="photo">Foto</div><h3>${s.name}</h3><p>NIS: ${s.nis || '-'}</p><p>Kelas: ${s.class_name || '-'}</p><p>Email: ${s.email || '-'}</p></div>`)
    })
    w.document.write(`</body></html>`)
    w.document.close()
    w.print()
  }

  // Detail view
  if (selectedClass) {
    const classStudents = students.filter((s) => (s.class_name || 'Tanpa Kelas') === selectedClass)
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button onClick={() => setSelectedClass(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Kembali</button>
              <h1 className="text-2xl font-bold">{selectedClass}</h1>
              <p className="text-sm text-gray-600">{classStudents.length} siswa</p>
            </div>
            <button onClick={() => handlePrintKartu(classStudents, selectedClass)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Printer size={18} /> Cetak Kartu Peserta
            </button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-12">No</th>
                    <th className="px-4 py-3 text-left font-semibold">NIS</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">{s.nis}</td>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Kelas</h1>
            <p className="text-sm text-gray-600">Kelas otomatis dari data siswa</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
            ) : classes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Belum ada kelas. Import siswa dengan kolom "Kelas" untuk membuat kelas otomatis.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-12">No</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Kelas</th>
                    <th className="px-4 py-3 text-left font-semibold">Jumlah Siswa</th>
                    <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, idx) => (
                    <tr key={cls.name} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{cls.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">{cls.count} siswa</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedClass(cls.name)} className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Lihat</button>
                          <button onClick={() => handlePrintKartu(students.filter((s) => s.class_name === cls.name), cls.name)} className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Cetak Kartu</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
