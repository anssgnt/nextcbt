import { supabase } from '../lib/supabase'
import {
  getExamQuestions,
  submitExamBatch,
  autoSaveAnswers,
  getSyncQueueStatus,
  startExamSession,
  calculateChecksum,
  compressData,
  decompressData,
  validateChecksum,
} from './apiHandlers'

export const studentService = {
  async getStudentByName(name) {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, class_id')
      .ilike('name', `%${name}%`)
      .limit(10)
    return { data, error }
  },

  async validateExamToken(studentId, token) {
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, duration, questions_count')
      .eq('token', token)
      .eq('is_active', true)
      .single()
    return { data, error }
  },

  async getActiveExams(studentId) {
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, duration, questions_count, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // PHASE 3: Batch API - Get exam questions with compression support
  async getExamQuestions(examId, options = {}) {
    try {
      return await getExamQuestions(examId, options)
    } catch (error) {
      console.error('Failed to get exam questions:', error)
      throw error
    }
  },

  // Legacy method for backward compatibility
  async getExamQuestionsLegacy(examId) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, type, image_url, options(id, option_text, is_correct)')
      .eq('exam_id', examId)
      .order('order', { ascending: true })
    return { data, error }
  },

  async saveAnswer(sessionId, questionId, answer) {
    const { data, error } = await supabase
      .from('answers')
      .upsert(
        {
          session_id: sessionId,
          question_id: questionId,
          answer_text: answer,
          answered_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,question_id' }
      )
    return { data, error }
  },

  // PHASE 3: Batch API - Auto-save answers
  async autoSaveAnswers(examId, sessionId, answers, options = {}) {
    try {
      return await autoSaveAnswers(examId, sessionId, answers, options)
    } catch (error) {
      console.error('Failed to auto-save answers:', error)
      throw error
    }
  },

  // PHASE 3: Batch API - Submit exam with batch operations
  async submitExamBatch(examId, sessionId, answers, options = {}) {
    try {
      return await submitExamBatch(examId, sessionId, answers, options)
    } catch (error) {
      console.error('Failed to submit exam batch:', error)
      throw error
    }
  },

  async submitExam(sessionId) {
    const { data, error } = await supabase
      .from('exam_sessions')
      .update({ submitted_at: new Date().toISOString(), status: 'submitted' })
      .eq('id', sessionId)
    return { data, error }
  },

  // PHASE 3: Batch API - Start exam session with rate limiting
  async createExamSession(studentId, examId, options = {}) {
    try {
      return await startExamSession(examId, studentId, options)
    } catch (error) {
      console.error('Failed to create exam session:', error)
      throw error
    }
  },

  // PHASE 3: Batch API - Get sync queue status
  async getSyncQueueStatus(studentId) {
    try {
      return await getSyncQueueStatus(studentId)
    } catch (error) {
      console.error('Failed to get sync queue status:', error)
      throw error
    }
  },

  // PHASE 3: Utility methods
  calculateChecksum,
  compressData,
  decompressData,
  validateChecksum,
}

export const adminService = {
  // ==================== STUDENTS ====================
  async getStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, nis, class_name, email, created_at')
      .order('name')
    return { data, error }
  },

  async createStudent(student) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single()
    return { data, error }
  },

  async bulkImportStudents(students) {
    const { data, error } = await supabase
      .from('students')
      .upsert(students, { onConflict: 'nis' })
      .select()
    return { data, error }
  },

  async deleteStudent(id) {
    const { data, error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
    return { data, error }
  },

  // ==================== QUESTIONS ====================
  async getQuestions() {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, type, image_url, correct_answer, score, options, subject, exam, matching_pairs, created_at')
      .order('created_at', { ascending: false })
    // Map question_text to text for frontend
    if (data) {
      data.forEach((q) => {
        q.text = q.question_text
      })
    }
    return { data, error }
  },

  async bulkImportQuestions(questions) {
    // Map frontend fields to DB columns
    const mapped = questions.map((q) => ({
      question_text: q.text,
      type: q.type,
      subject: q.subject || null,
      exam: q.exam || null,
      correct_answer: q.correct_answer || null,
      score: q.score || 1,
      options: q.options || null,
      matching_pairs: q.matching_pairs || null,
      exam_id: null,
      "order": 0,
    }))
    const { data, error } = await supabase
      .from('questions')
      .insert(mapped)
      .select()
    return { data, error }
  },

  async deleteQuestion(id) {
    const { data, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
    return { data, error }
  },

  async updateQuestion(id, updates) {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ==================== EXAMS ====================
  async getExams() {
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, duration, questions_count, is_active, created_at')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async createExam(title, duration, classId) {
    const token = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase
      .from('exams')
      .insert({
        title,
        duration,
        class_id: classId,
        token,
        is_active: true,
      })
      .select()
      .single()
    return { data, error }
  },

  async getExamResults(examId) {
    const { data, error } = await supabase
      .from('exam_sessions')
      .select('id, student:students(name), score, submitted_at')
      .eq('exam_id', examId)
      .eq('status', 'submitted')
    return { data, error }
  },
}
