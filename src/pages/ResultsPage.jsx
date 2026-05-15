import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../store'
import { supabase } from '../lib/supabase'
import { StudentLayout } from '../layouts/StudentLayout'

export function ResultsPage() {
  const { user } = useAuthStore()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadResults() }, [])

  const loadResults = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('id, score, status, submitted_at, exams(title, questions_count)')
        .eq('student_id', user?.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
      if (error) throw error
      setResults(data || [])
    } catch (err) {
      console.error('Failed to load results:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudentLayout>
      <div className="bg-blue-600 text-white px-4 py-4">
        <h1 className="font-bold text-lg">Hasil Ujian</h1>
      </div>

      <div className="px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium">Belum ada hasil ujian</p>
            <p className="text-sm mt-1">Kerjakan ujian untuk melihat hasil</p>
          </div>
        ) : (
          results.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{item.exams?.title || '-'}</h3>
                  <p className="text-xs text-gray-500">{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('id-ID') : '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{item.score || 0}</p>
                  <p className="text-xs text-gray-500">Nilai</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </StudentLayout>
  )
}
