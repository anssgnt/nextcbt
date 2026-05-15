import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components'
import { CheckCircle2, Home } from 'lucide-react'

export const ResultPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadResult = async () => {
      try {
        // In a real app, fetch from Supabase
        const mockResult = {
          score: 85,
          totalQuestions: 50,
          correctAnswers: 42,
          timeSpent: 1800,
        }
        setResult(mockResult)
      } finally {
        setIsLoading(false)
      }
    }

    loadResult()
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Submitted!</h1>
        <p className="text-gray-600 mb-8">Your answers have been saved successfully.</p>

        {result && (
          <div className="bg-blue-50 rounded-lg p-6 mb-8 space-y-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Your Score</p>
              <p className="text-4xl font-bold text-primary">{result.score}%</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Correct Answers</p>
                <p className="text-lg font-semibold text-gray-900">{result.correctAnswers}/{result.totalQuestions}</p>
              </div>
              <div>
                <p className="text-gray-600">Time Spent</p>
                <p className="text-lg font-semibold text-gray-900">{Math.floor(result.timeSpent / 60)} min</p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate('/student')}
          size="lg"
          className="flex items-center justify-center gap-2"
        >
          <Home size={20} />
          Back to Dashboard
        </Button>
      </Card>
    </div>
  )
}
