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
      markedQuestions: [],
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
          const marked = [...(state.markedQuestions || [])]
          const idx = marked.indexOf(questionId)
          if (idx >= 0) {
            marked.splice(idx, 1)
          } else {
            marked.push(questionId)
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
          markedQuestions: [],
          currentQuestionIndex: 0,
          timeRemaining: 0,
          isSubmitted: false,
          sessionId: null,
        }),
    }),
    {
      name: 'exam-storage',
      // Exclude timeRemaining from persistence — it changes every second
      // and is recalculated from exam_start_{id} on mount anyway
      partialize: (state) => ({
        currentExam: state.currentExam,
        answers: state.answers,
        markedQuestions: state.markedQuestions,
        currentQuestionIndex: state.currentQuestionIndex,
        isSubmitted: state.isSubmitted,
        sessionId: state.sessionId,
      }),
    }
  )
)
