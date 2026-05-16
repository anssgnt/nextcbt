export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Normalisasi teks untuk perbandingan essay/uraian singkat
 * - Trim spasi awal/akhir
 * - Lowercase
 * - Normalisasi spasi ganda jadi satu
 * - Hapus tanda baca di akhir
 */
export const normalizeText = (text) => {
  if (!text) return ''
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')       // spasi ganda → satu spasi
    .replace(/[.,;:!?]+$/, '')  // hapus tanda baca di akhir
    .trim()
}

/**
 * Cek kebenaran jawaban essay/uraian singkat dengan toleransi:
 * - Case insensitive
 * - Trim whitespace
 * - Normalisasi spasi ganda
 * - Abaikan tanda baca di akhir
 */
export const isEssayCorrect = (userAnswer, correctAnswer) => {
  if (!userAnswer || !correctAnswer) return false
  return normalizeText(userAnswer) === normalizeText(correctAnswer)
}

export const calculateScore = (answers, questions) => {
  let correct = 0
  questions.forEach((q) => {
    const userAnswer = answers[q.id]
    if (!userAnswer || !q.correct_answer) return

    const type = q.type
    if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
      // Essay: pakai normalisasi (case-insensitive, trim, dll)
      if (isEssayCorrect(userAnswer, q.correct_answer)) correct++
    } else if (type === 'pilihan_ganda_kompleks' || type === 'multiple_choice_complex') {
      // Multiple select: sort & join lalu bandingkan
      if (Array.isArray(userAnswer) && userAnswer.sort().join(',') === q.correct_answer) correct++
    } else {
      // Pilihan ganda, benar/salah, dll: exact match
      if (userAnswer === q.correct_answer) correct++
    }
  })
  return Math.round((correct / questions.length) * 100)
}

export const getLocalStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('LocalStorage error:', e)
  }
}
