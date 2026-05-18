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
 * - Hapus semua tanda baca
 * - Hapus aksen/diakritik
 * - Normalisasi ejaan Indonesia (oe→u, dj→j, tj→c, j→y untuk nama lama)
 */
export const normalizeText = (text) => {
  if (!text) return ''
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // hapus aksen (é → e)
    .replace(/[.,;:!?'"()\-\/\\]+/g, ' ')            // tanda baca → spasi
    .replace(/\s+/g, ' ')                             // spasi ganda → satu spasi
    .trim()
}

/**
 * Normalisasi lebih agresif: hapus kata sambung + normalisasi ejaan lama Indonesia
 * Digunakan sebagai fallback jika exact match gagal
 */
const normalizeAggressive = (text) => {
  const stopWords = ['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'adalah', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'ir', 'dr', 'prof', 'moh', 'muhammad']
  let normalized = normalizeText(text)
  // Normalisasi ejaan lama Indonesia
  normalized = normalized
    .replace(/oe/g, 'u')   // Soekarno → Sukarno
    .replace(/dj/g, 'j')   // Djokjakarta → Jokjakarta
    .replace(/tj/g, 'c')   // Tjirebon → Cirebon
    .replace(/nj/g, 'ny')  // Njonja → Nyonya
    .replace(/sj/g, 'sy')  // Sjahrir → Syahrir
  return normalized
    .split(' ')
    .filter((word) => !stopWords.includes(word))
    .join(' ')
}

/**
 * Hitung similarity antara dua string (Levenshtein-based)
 * Return 0-1 (1 = identik)
 */
const similarity = (a, b) => {
  if (a === b) return 1
  if (!a || !b) return 0
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1

  // Levenshtein distance (optimized for short strings)
  const costs = []
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) { costs[j] = j }
      else if (j > 0) {
        let newValue = costs[j - 1]
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(newValue, lastValue, costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[longer.length] = lastValue
  }
  return 1 - costs[longer.length] / longer.length
}

/**
 * Cek kebenaran jawaban essay/uraian singkat dengan toleransi bertingkat:
 * 
 * Level 1: Exact match setelah normalisasi dasar (case, spasi, tanda baca)
 * Level 2: Support multiple correct answers (dipisah | di kunci jawaban)
 * Level 3: Match tanpa kata sambung (dan, atau, yang, dll)
 * Level 4: Similarity >= 85% (toleransi typo ringan, max 2-3 huruf salah)
 */
export const isEssayCorrect = (userAnswer, correctAnswer) => {
  if (!userAnswer || !correctAnswer) return false

  const userNorm = normalizeText(userAnswer)

  // Support multiple correct answers: "Soekarno|Sukarno" atau "Jakarta|DKI Jakarta"
  const correctVariants = correctAnswer.split('|').map((v) => v.trim())

  for (const variant of correctVariants) {
    const correctNorm = normalizeText(variant)

    // Level 1: Exact match setelah normalisasi
    if (userNorm === correctNorm) return true

    // Level 2: Match tanpa kata sambung + ejaan lama
    const userAggr = normalizeAggressive(userAnswer)
    const correctAggr = normalizeAggressive(variant)
    if (userAggr === correctAggr) return true

    // Level 3: Similarity check pada versi agresif (toleransi typo + ejaan)
    // Threshold 0.75 untuk toleransi lebih luas (oe/u, typo, dll)
    if (correctAggr.length < 60 && userAggr.length < 60) {
      const sim = similarity(userAggr, correctAggr)
      if (sim >= 0.75) return true
    }
  }

  return false
}

/**
 * Cek kebenaran jawaban menjodohkan
 * userAnswer = object {0: "Jakarta", 1: "Tokyo", ...}
 * question.matching_pairs = [{left: "Indonesia", right: "Jakarta"}, ...]
 */
export const isMatchingCorrect = (userAnswer, matchingPairs) => {
  if (!userAnswer || !matchingPairs || !Array.isArray(matchingPairs)) return false
  if (typeof userAnswer !== 'object' || Array.isArray(userAnswer)) return false

  return matchingPairs.every((pair, idx) => {
    const studentAnswer = userAnswer[idx] || userAnswer[String(idx)]
    if (!studentAnswer) return false
    return normalizeText(studentAnswer) === normalizeText(pair.right)
  })
}

export const calculateScore = (answers, questions) => {
  let earnedScore = 0
  let totalScore = 0

  questions.forEach((q) => {
    const weight = q.score || 1 // bobot skor per soal (default 1)
    totalScore += weight

    const userAnswer = answers[q.id]
    if (!userAnswer) return

    const type = q.type
    let isCorrect = false

    if (type === 'uraian_singkat' || type === 'short_answer' || type === 'essay') {
      if (q.correct_answer) isCorrect = isEssayCorrect(userAnswer, q.correct_answer)
    } else if (type === 'pilihan_ganda_kompleks' || type === 'multiple_choice_complex') {
      if (q.correct_answer && Array.isArray(userAnswer)) isCorrect = userAnswer.sort().join(',') === q.correct_answer
    } else if (type === 'menjodohkan' || type === 'matching') {
      isCorrect = isMatchingCorrect(userAnswer, q.matching_pairs)
    } else {
      if (q.correct_answer) isCorrect = userAnswer === q.correct_answer
    }

    if (isCorrect) earnedScore += weight
  })

  // Nilai = skor didapat / total skor × 100 (selalu skala 100)
  return totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0
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
