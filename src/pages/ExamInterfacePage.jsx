import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Modal, Toast } from '../components'
import { useExamStore, useAuthStore } from '../store'
import { useExamTimer, useTabVisibility, useOnlineStatus } from '../hooks/useExam'
import { studentService } from '../services/api'
import { getSyncService } from '../services/syncService'
import { formatTime, debounce } from '../utils/helpers'
import { Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react'

export const ExamInterfacePage = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const {
    currentExam,
    setCurrentExam,
    answers,
    setAnswer,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    markedQuestions,
    toggleMarkQuestion,
    setSessionId,
    sessionId,
  } = useExamStore()

  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [toast, setToast] = useState(null)
  const isOnline = useOnlineStatus()
  const [syncService, setSyncService] = useState(null)
  const [offlineMode, setOfflineMode] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const syncIntervalRef = useRef(null)

  const { timeRemaining, isTimeUp } = useExamTimer(currentExam?.duration)

  useTabVisibility(() => {
    setShowWarning(true)
  })

  // Initialize sync service
  useEffect(() => {
    const initSync = async () => {
      try {
        const service = await getSyncService(user.id)
        setSyncService(service)
      } catch (error) {
        console.error('Failed to initialize sync service:', error)
      }
    }

    if (user?.id) {
      initSync()
    }
  }, [user?.id])

  // Auto-sync pending submissions when online
  useEffect(() => {
    if (!syncService || !isOnline) return

    const syncPending = async () => {
      try {
        await syncService.syncPendingSubmissions()
        const status = await syncService.getSyncStatus()
        setSyncStatus(status)
      } catch (error) {
        console.error('Failed to sync pending submissions:', error)
      }
    }

    syncPending()
    syncIntervalRef.current = setInterval(syncPending, 30000) // Sync every 30 seconds

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [syncService, isOnline])

  useEffect(() => {
    if (isTimeUp) {
      handleSubmitExam()
    }
  }, [isTimeUp])

  useEffect(() => {
    const loadExam = async () => {
      try {
        let exam, questionsData

        // Try to load from offline storage first
        if (syncService) {
          try {
            const offlineData = await syncService.loadExamOffline(examId)
            exam = offlineData.exam
            questionsData = offlineData.questions
            setOfflineMode(true)
            setToast({ type: 'info', message: 'Loaded from offline storage' })
          } catch (error) {
            // Offline data not available, try online
            if (!isOnline) {
              throw new Error('No offline data available and offline')
            }
          }
        }

        // If not loaded from offline, fetch from API
        if (!exam) {
          const { data: examData } = await studentService.getActiveExams(user.id)
          exam = examData?.find((e) => e.id === examId)
          if (!exam) {
            navigate('/student/exams')
            return
          }

          const { data: questions } = await studentService.getExamQuestions(examId)
          questionsData = questions || []

          // Cache to offline storage
          if (syncService) {
            await syncService.syncExam(examId, user.id)
          }
        }

        setCurrentExam(exam)

        if (!sessionId) {
          const { data: session } = await studentService.createExamSession(user.id, examId)
          setSessionId(session.id)
        }

        setQuestions(questionsData)
      } catch (err) {
        setToast({ type: 'error', message: err.message || 'Failed to load exam' })
      } finally {
        setIsLoading(false)
      }
    }

    loadExam()
  }, [examId, user.id, syncService, isOnline])

  const debouncedSaveAnswer = debounce(async (qId, answer) => {
    if (!syncService) return

    // Save locally first
    try {
      await syncService.saveAnswerLocal(examId, qId, answer)
    } catch (error) {
      console.error('Failed to save answer locally:', error)
    }

    // Try to sync if online
    if (sessionId && isOnline) {
      try {
        await studentService.saveAnswer(sessionId, qId, answer)
      } catch (error) {
        console.error('Failed to sync answer:', error)
      }
    }
  }, 2000)

  const handleAnswerChange = (questionId, answer) => {
    setAnswer(questionId, answer)
    debouncedSaveAnswer(questionId, answer)
  }

  const handleSubmitExam = async () => {
    if (!sessionId || !syncService) return

    try {
      // Get all local answers
      const localAnswers = await syncService.getLocalAnswers(examId)
      const answersMap = {}
      localAnswers.forEach((ans) => {
        answersMap[ans.questionId] = ans.answer
      })

      if (isOnline) {
        // Submit directly if online
        await studentService.submitExam(sessionId, { answers: answersMap })
        navigate(`/result/${sessionId}`)
      } else {
        // Queue for sync if offline
        await syncService.queueSubmission(examId, sessionId, answersMap)
        setToast({
          type: 'info',
          message: 'Exam queued for submission. Will sync when online.',
        })
        navigate(`/result/${sessionId}`)
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to submit exam' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (!currentExam || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Exam not found</h2>
          <Button onClick={() => navigate('/student/exams')}>Back to Exams</Button>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]
  const isMarked = markedQuestions.has(currentQuestion?.id)
  const answeredCount = Object.keys(answers).length

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option) => (
              <label key={option.id} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-blue-50 transition-all">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.id}
                  checked={currentAnswer === option.id}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 text-gray-900">{option.option_text}</span>
              </label>
            ))}
          </div>
        )

      case 'multiple_choice_complex':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">Pilih semua jawaban yang benar:</p>
            {currentQuestion.options?.map((option) => (
              <label key={option.id} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-blue-50 transition-all">
                <input
                  type="checkbox"
                  value={option.id}
                  checked={(currentAnswer || []).includes(option.id)}
                  onChange={(e) => {
                    const selected = currentAnswer || []
                    const newSelected = e.target.checked
                      ? [...selected, option.id]
                      : selected.filter(id => id !== option.id)
                    handleAnswerChange(currentQuestion.id, newSelected)
                  }}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 text-gray-900">{option.option_text}</span>
              </label>
            ))}
          </div>
        )

      case 'true_false':
        return (
          <div className="space-y-3">
            {['Benar', 'Salah'].map((option) => (
              <label key={option} className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-blue-50 transition-all">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-4 h-4 text-primary"
                />
                <span className="ml-3 text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'matching':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-3">Kolom A</p>
              <div className="space-y-2">
                {currentQuestion.leftItems?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-100 rounded">{item}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold mb-3">Kolom B</p>
              <div className="space-y-2">
                {currentQuestion.rightItems?.map((item, idx) => (
                  <select key={idx} className="w-full p-2 border border-gray-300 rounded">
                    <option>Pilih pasangan</option>
                    {currentQuestion.leftItems?.map((left, lidx) => (
                      <option key={lidx}>{left}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          </div>
        )

      case 'short_answer':
        return (
          <textarea
            value={currentAnswer || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            placeholder="Ketik jawaban Anda di sini..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-100 resize-none"
            rows={6}
          />
        )

      default:
        return <p className="text-gray-600">Tipe soal tidak dikenali</p>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{currentExam.title}</h1>
            <p className="text-sm text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}>
              <Clock size={20} />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isOnline ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              {isOnline ? (
                <>
                  <Wifi size={18} />
                  <span className="text-sm font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={18} />
                  <span className="text-sm font-medium">Offline</span>
                </>
              )}
            </div>
            {offlineMode && (
              <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                Offline Mode
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card className="mb-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{currentQuestion.question_text}</h2>
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="max-w-full h-auto rounded-lg mb-4"
                />
              )}
            </div>

            {renderQuestion()}
          </Card>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant={isMarked ? 'danger' : 'secondary'}
              onClick={() => toggleMarkQuestion(currentQuestion.id)}
            >
              {isMarked ? 'Unmark' : 'Mark'}
            </Button>
            <Button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowSubmitModal(true)}
              className="ml-auto"
            >
              Submit Exam
            </Button>
          </div>
        </div>

        {/* Question Palette */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                    idx === currentQuestionIndex
                      ? 'bg-primary text-white'
                      : answers[q.id]
                      ? 'bg-green-100 text-green-700'
                      : markedQuestions.has(q.id)
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 rounded"></div>
                <span className="text-gray-600">Answered: {answeredCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                <span className="text-gray-600">Marked: {markedQuestions.size}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showWarning} onClose={() => setShowWarning(false)} title="Warning">
        <div className="space-y-4">
          <p className="text-gray-700">You switched tabs. Please stay focused on the exam.</p>
          <Button onClick={() => setShowWarning(false)} size="lg">
            Continue Exam
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Exam">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to submit? You have answered {answeredCount} of {questions.length} questions.</p>
          {!isOnline && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                You are offline. Your submission will be queued and synced when you go online.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitExam}>Submit</Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

