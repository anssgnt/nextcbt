import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function ResultsPage() {
  const navigate = useNavigate()

  const results = [
    {
      id: 1,
      examName: 'Matematika',
      score: 85,
      totalQuestions: 50,
      correctAnswers: 42,
      date: '20 Mei 2024',
    },
    {
      id: 2,
      examName: 'Bahasa Indonesia',
      score: 78,
      totalQuestions: 40,
      correctAnswers: 31,
      date: '19 Mei 2024',
    },
    {
      id: 3,
      examName: 'IPA',
      score: 92,
      totalQuestions: 50,
      correctAnswers: 46,
      date: '18 Mei 2024',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="hover:opacity-80">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Hasil Ujian</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {results.map((item) => (
          <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{item.examName}</h3>
                <p className="text-xs text-gray-500">{item.date}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{item.score}</p>
                <p className="text-xs text-gray-500">Nilai</p>
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Benar: {item.correctAnswers}/{item.totalQuestions}</span>
              <span>Persentase: {Math.round((item.correctAnswers / item.totalQuestions) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
