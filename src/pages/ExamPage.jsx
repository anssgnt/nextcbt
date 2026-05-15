import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, Users } from 'lucide-react'

export const ExamPage = () => {
  const navigate = useNavigate()

  // Mock available exams
  const availableExams = [
    {
      id: 1,
      title: 'Matematika',
      subject: 'Matematika',
      date: '25 Mei 2024',
      time: '08:00 - 10:00',
      duration: 120,
      questions: 50,
      status: 'Akan Datang',
      color: 'bg-blue-500',
    },
    {
      id: 2,
      title: 'Bahasa Indonesia',
      subject: 'Bahasa Indonesia',
      date: '26 Mei 2024',
      time: '10:30 - 12:00',
      duration: 90,
      questions: 40,
      status: 'Akan Datang',
      color: 'bg-green-500',
    },
    {
      id: 3,
      title: 'IPA',
      subject: 'Ilmu Pengetahuan Alam',
      date: '27 Mei 2024',
      time: '13:00 - 14:30',
      duration: 90,
      questions: 45,
      status: 'Akan Datang',
      color: 'bg-purple-500',
    },
    {
      id: 4,
      title: 'IPS',
      subject: 'Ilmu Pengetahuan Sosial',
      date: '28 Mei 2024',
      time: '08:00 - 09:30',
      duration: 60,
      questions: 35,
      status: 'Akan Datang',
      color: 'bg-orange-500',
    },
  ]

  const handleStartExam = (examId) => {
    navigate(`/exam/${examId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-6">
        <h1 className="text-2xl font-bold">Daftar Ujian</h1>
        <p className="text-blue-100 text-sm mt-1">Pilih ujian yang ingin dikerjakan</p>
      </div>

      {/* Exams List */}
      <div className="px-4 py-6 space-y-4">
        {availableExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`${exam.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0`}>
                <BookOpen size={32} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-600">{exam.subject}</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {exam.status}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} />
                    <span>{exam.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} />
                    <span>{exam.duration} menit</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users size={16} />
                    <span>{exam.questions} soal</span>
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => handleStartExam(exam.id)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
                >
                  Mulai Ujian
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
