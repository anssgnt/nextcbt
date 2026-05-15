import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      isLoading: false,
      setUser: (user, role) => set({ user, role }),
      logout: () => set({ user: null, role: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)

export const useExamStore = create(
  persist(
    (set, get) => ({
      currentExam: null,
      answers: {},
      markedQuestions: new Set(),
      currentQuestionIndex: 0,
      timeRemaining: 0,
      isSubmitted: false,
      sessionId: null,

      setCurrentExam: (exam) => set({ currentExam: exam }),
      setAnswer: (questionId, answer) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: answer },
        })),
      toggleMarkQuestion: (questionId) =>
        set((state) => {
          const marked = new Set(state.markedQuestions)
          if (marked.has(questionId)) {
            marked.delete(questionId)
          } else {
            marked.add(questionId)
          }
          return { markedQuestions: marked }
        }),
      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
      setTimeRemaining: (time) => set({ timeRemaining: time }),
      setSubmitted: (submitted) => set({ isSubmitted: submitted }),
      setSessionId: (id) => set({ sessionId: id }),
      resetExam: () =>
        set({
          currentExam: null,
          answers: {},
          markedQuestions: new Set(),
          currentQuestionIndex: 0,
          timeRemaining: 0,
          isSubmitted: false,
          sessionId: null,
        }),
    }),
    {
      name: 'exam-storage',
    }
  )
)
