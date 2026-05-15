import pako from 'pako'
import { supabase } from '../lib/supabase'

/**
 * API Handlers untuk PHASE 3 - Batch operations, compression, checksum validation
 */

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate checksum untuk data validation
 */
export function calculateChecksum(data) {
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Compress data menggunakan gzip
 */
export function compressData(data) {
  try {
    const json = JSON.stringify(data)
    const compressed = pako.gzip(json)
    return {
      data: btoa(String.fromCharCode.apply(null, compressed)),
      compressed: true,
      originalSize: json.length,
      compressedSize: compressed.length,
    }
  } catch (error) {
    console.error('Compression failed:', error)
    return {
      data: data,
      compressed: false,
      error: error.message,
    }
  }
}

/**
 * Decompress data
 */
export function decompressData(compressedData) {
  try {
    const binaryString = atob(compressedData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const decompressed = pako.ungzip(bytes, { to: 'string' })
    return JSON.parse(decompressed)
  } catch (error) {
    console.error('Decompression failed:', error)
    throw error
  }
}

/**
 * Validate checksum
 */
export function validateChecksum(data, checksum) {
  const calculatedChecksum = calculateChecksum(data)
  return calculatedChecksum === checksum
}

/**
 * Add cache headers ke response
 */
export function addCacheHeaders(response, maxAge = 3600) {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}`)
  response.headers.set('ETag', `"${calculateChecksum(response.body)}"`)
  return response
}

// ============================================================================
// BATCH API HANDLERS
// ============================================================================

/**
 * GET /api/v1/exams/{examId}/questions
 * Pre-sync endpoint untuk fetch semua questions dengan options
 * Support compression & checksum validation
 */
export async function getExamQuestions(examId, options = {}) {
  const { compress = true, includeChecksum = true } = options

  try {
    // Fetch exam details
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, duration, questions_count')
      .eq('id', examId)
      .single()

    if (examError) throw examError
    if (!exam) throw new Error('Exam not found')

    // Fetch all questions dengan options dalam satu query
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(
        `
        id,
        question_text,
        type,
        image_url,
        order,
        options(id, option_text, is_correct, order)
      `
      )
      .eq('exam_id', examId)
      .order('order', { ascending: true })

    if (questionsError) throw questionsError

    const response = {
      exam,
      questions: questions || [],
      timestamp: new Date().toISOString(),
      count: questions?.length || 0,
    }

    // Add checksum jika diminta
    if (includeChecksum) {
      response.checksum = calculateChecksum(response)
    }

    // Compress jika diminta
    if (compress) {
      const compressed = compressData(response)
      return {
        ...compressed,
        originalResponse: response,
      }
    }

    return response
  } catch (error) {
    console.error('Failed to get exam questions:', error)
    throw error
  }
}

/**
 * POST /api/v1/exams/{examId}/submit
 * Batch submit endpoint untuk submit semua answers sekaligus
 * Support compression, checksum validation, conflict resolution
 */
export async function submitExamBatch(examId, sessionId, answers, options = {}) {
  const { compress = false, checksum = null, conflictResolution = 'server' } = options

  try {
    // Validate checksum jika provided
    if (checksum && !validateChecksum(answers, checksum)) {
      throw new Error('Checksum validation failed - data may be corrupted')
    }

    // Get current session
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('id, student_id, exam_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError
    if (!session) throw new Error('Session not found')
    if (session.status !== 'in_progress') {
      throw new Error('Session is not in progress')
    }

    // Batch upsert answers
    const answersToInsert = answers.map((answer) => ({
      session_id: sessionId,
      question_id: answer.question_id,
      answer_text: answer.answer_text,
      answered_at: new Date().toISOString(),
    }))

    const { data: insertedAnswers, error: answersError } = await supabase
      .from('answers')
      .upsert(answersToInsert, {
        onConflict: 'session_id,question_id',
      })
      .select()

    if (answersError) throw answersError

    // Calculate score
    const { data: correctAnswers, error: scoreError } = await supabase
      .from('answers')
      .select('id')
      .eq('session_id', sessionId)
      .eq('answer_text', supabase.rpc('get_correct_answer', { question_id: 'question_id' }))

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('exam_sessions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        score: correctAnswers?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) throw updateError

    // Create result record
    const { data: result, error: resultError } = await supabase
      .from('results')
      .insert({
        session_id: sessionId,
        student_id: session.student_id,
        exam_id: examId,
        score: correctAnswers?.length || 0,
        total_questions: answers.length,
        correct_answers: correctAnswers?.length || 0,
        time_spent: Math.floor((Date.now() - new Date(session.created_at).getTime()) / 1000),
      })
      .select()
      .single()

    if (resultError) throw resultError

    const response = {
      success: true,
      sessionId,
      examId,
      answersSubmitted: insertedAnswers?.length || 0,
      score: correctAnswers?.length || 0,
      totalQuestions: answers.length,
      timestamp: new Date().toISOString(),
    }

    return response
  } catch (error) {
    console.error('Failed to submit exam batch:', error)
    throw error
  }
}

/**
 * POST /api/v1/exams/{examId}/autosave
 * Auto-save endpoint untuk save answers tanpa submit
 * Support batch operations & compression
 */
export async function autoSaveAnswers(examId, sessionId, answers, options = {}) {
  const { compress = false } = options

  try {
    // Batch upsert answers
    const answersToInsert = answers.map((answer) => ({
      session_id: sessionId,
      question_id: answer.question_id,
      answer_text: answer.answer_text,
      answered_at: new Date().toISOString(),
    }))

    const { data: savedAnswers, error: answersError } = await supabase
      .from('answers')
      .upsert(answersToInsert, {
        onConflict: 'session_id,question_id',
      })
      .select()

    if (answersError) throw answersError

    const response = {
      success: true,
      sessionId,
      answersSaved: savedAnswers?.length || 0,
      timestamp: new Date().toISOString(),
    }

    return response
  } catch (error) {
    console.error('Failed to auto-save answers:', error)
    throw error
  }
}

/**
 * GET /api/v1/sync-queue/status
 * Sync status endpoint untuk check pending submissions
 */
export async function getSyncQueueStatus(studentId) {
  try {
    // Get pending sync queue items
    const { data: pending, error: pendingError } = await supabase
      .from('sync_queue')
      .select('id, exam_id, status, attempts, error_message, created_at')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (pendingError) throw pendingError

    // Get failed items
    const { data: failed, error: failedError } = await supabase
      .from('sync_queue')
      .select('id, exam_id, status, attempts, error_message, created_at')
      .eq('student_id', studentId)
      .eq('status', 'failed')
      .order('created_at', { ascending: true })

    if (failedError) throw failedError

    // Get completed items (last 24 hours)
    const { data: completed, error: completedError } = await supabase
      .from('sync_queue')
      .select('id, exam_id, status, created_at')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (completedError) throw completedError

    const response = {
      studentId,
      pending: pending || [],
      failed: failed || [],
      completed: completed || [],
      summary: {
        pendingCount: pending?.length || 0,
        failedCount: failed?.length || 0,
        completedCount: completed?.length || 0,
      },
      timestamp: new Date().toISOString(),
    }

    return response
  } catch (error) {
    console.error('Failed to get sync queue status:', error)
    throw error
  }
}

/**
 * POST /api/v1/exams/{examId}/session/start
 * Session start endpoint untuk create exam session
 * Support rate limiting
 */
export async function startExamSession(examId, studentId, options = {}) {
  const { rateLimit = true } = options

  try {
    // Check rate limit jika enabled
    if (rateLimit) {
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limit_tracker')
        .select('request_count, window_end')
        .eq('student_id', studentId)
        .eq('endpoint', `/exams/${examId}/session/start`)
        .gte('window_end', new Date().toISOString())
        .single()

      if (!rateLimitError && rateLimitData) {
        if (rateLimitData.request_count >= 5) {
          throw new Error('Rate limit exceeded - max 5 session starts per minute')
        }
      }
    }

    // Check if exam exists and is active
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, title, duration, questions_count, is_active')
      .eq('id', examId)
      .eq('is_active', true)
      .single()

    if (examError) throw examError
    if (!exam) throw new Error('Exam not found or not active')

    // Create exam session
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .insert({
        student_id: studentId,
        exam_id: examId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    // Update rate limit tracker
    if (rateLimit) {
      const { data: existingLimit } = await supabase
        .from('rate_limit_tracker')
        .select('id, request_count')
        .eq('student_id', studentId)
        .eq('endpoint', `/exams/${examId}/session/start`)
        .gte('window_end', new Date().toISOString())
        .single()

      if (existingLimit) {
        await supabase
          .from('rate_limit_tracker')
          .update({ request_count: existingLimit.request_count + 1 })
          .eq('id', existingLimit.id)
      } else {
        await supabase.from('rate_limit_tracker').insert({
          student_id: studentId,
          endpoint: `/exams/${examId}/session/start`,
          request_count: 1,
          window_start: new Date().toISOString(),
          window_end: new Date(Date.now() + 60000).toISOString(),
        })
      }
    }

    const response = {
      success: true,
      sessionId: session.id,
      examId: exam.id,
      examTitle: exam.title,
      duration: exam.duration,
      questionsCount: exam.questions_count,
      startedAt: session.started_at,
      timestamp: new Date().toISOString(),
    }

    return response
  } catch (error) {
    console.error('Failed to start exam session:', error)
    throw error
  }
}

// ============================================================================
// RETRY MECHANISM HELPERS
// ============================================================================

/**
 * Calculate exponential backoff delay
 * 1s, 2s, 4s, 8s, 16s (max 5 attempts)
 */
export function getExponentialBackoffDelay(attempts) {
  const maxAttempts = 5
  if (attempts >= maxAttempts) {
    return null // Max retries reached
  }
  return Math.pow(2, attempts) * 1000 // 1s, 2s, 4s, 8s, 16s
}

/**
 * Retry submission dengan exponential backoff
 */
export async function retrySubmissionWithBackoff(queueId, maxAttempts = 5) {
  try {
    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('id', queueId)
      .single()

    if (queueError) throw queueError
    if (!queueItem) throw new Error('Queue item not found')

    // Check if max attempts reached
    if (queueItem.attempts >= maxAttempts) {
      await supabase
        .from('sync_queue')
        .update({
          status: 'failed',
          error_message: 'Max retries exceeded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueId)
      return { success: false, reason: 'Max retries exceeded' }
    }

    // Calculate delay
    const delay = getExponentialBackoffDelay(queueItem.attempts)
    if (delay === null) {
      return { success: false, reason: 'Max retries exceeded' }
    }

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Retry submission
    const payload = queueItem.payload
    const result = await submitExamBatch(
      queueItem.exam_id,
      queueItem.session_id,
      payload.answers,
      { compress: false }
    )

    // Update queue item status
    await supabase
      .from('sync_queue')
      .update({
        status: 'completed',
        attempts: queueItem.attempts + 1,
        updated_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    return { success: true, result }
  } catch (error) {
    console.error('Retry submission failed:', error)

    // Update queue item with error
    const { data: queueItem } = await supabase
      .from('sync_queue')
      .select('attempts')
      .eq('id', queueId)
      .single()

    await supabase
      .from('sync_queue')
      .update({
        status: queueItem?.attempts >= 4 ? 'failed' : 'pending',
        attempts: (queueItem?.attempts || 0) + 1,
        error_message: error.message,
        updated_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    return { success: false, error: error.message }
  }
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve conflicts antara client dan server data
 * Strategy: server-side data wins (untuk consistency)
 */
export async function resolveConflict(sessionId, questionId, clientAnswer) {
  try {
    // Get server answer
    const { data: serverAnswer, error: serverError } = await supabase
      .from('answers')
      .select('answer_text, answered_at')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .single()

    if (serverError && serverError.code !== 'PGRST116') {
      throw serverError
    }

    // Jika server answer exists, gunakan server data
    if (serverAnswer) {
      return {
        resolved: true,
        winner: 'server',
        answer: serverAnswer.answer_text,
        timestamp: serverAnswer.answered_at,
      }
    }

    // Jika tidak ada server answer, gunakan client answer
    return {
      resolved: true,
      winner: 'client',
      answer: clientAnswer,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to resolve conflict:', error)
    throw error
  }
}
