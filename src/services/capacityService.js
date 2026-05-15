/**
 * Capacity Planning Service - PHASE 4
 * Calculate estimated quota usage for N concurrent users
 */

// Supabase Free Tier Limits
const SUPABASE_LIMITS = {
  apiRequests: 500000, // per month
  storage: 500, // MB
  bandwidth: 2000, // MB per month (2GB)
  dbSize: 500, // MB
  realtimeConnections: 200,
}

// Vercel Free Tier Limits
const VERCEL_LIMITS = {
  bandwidth: 100000, // MB per month (100GB)
  serverlessFunctions: 100000, // invocations per day
  buildMinutes: 6000, // per month
}

class CapacityService {
  constructor() {
    this.settings = this.loadSettings()
  }

  loadSettings() {
    const saved = localStorage.getItem('cbt_settings')
    return saved
      ? JSON.parse(saved)
      : { examDuration: 120, autoSaveInterval: 30 }
  }

  /**
   * Calculate estimated API calls for N students taking an exam
   */
  calculateApiCalls(studentCount, questionsPerExam = 50) {
    // Per student:
    // 1 call: login
    // 1 call: pre-sync questions (H-1)
    // 1 call: start session
    // 0-2 calls: auto-save (max 1 per 5 min, exam ~120 min = ~24 calls, but batch = 1)
    // 1 call: batch submit
    // Total per student: ~4-5 calls per exam

    const callsPerStudent = 5
    const totalCalls = studentCount * callsPerStudent

    // Admin calls (monitoring, results, etc)
    const adminCalls = 50

    return {
      perStudent: callsPerStudent,
      totalStudents: totalCalls,
      adminCalls,
      total: totalCalls + adminCalls,
      monthlyEstimate: totalCalls + adminCalls, // per exam session
      quotaPercentage: Math.round(((totalCalls + adminCalls) / SUPABASE_LIMITS.apiRequests) * 100),
    }
  }

  /**
   * Calculate estimated storage for N students
   */
  calculateStorage(studentCount, questionsPerExam = 50) {
    // Questions: ~2KB per question (compressed ~0.8KB)
    const questionSize = questionsPerExam * 0.8 // KB
    // Answers: ~0.1KB per answer
    const answerSize = studentCount * questionsPerExam * 0.1 // KB
    // Sessions: ~0.5KB per session
    const sessionSize = studentCount * 0.5 // KB
    // Total
    const totalKB = questionSize + answerSize + sessionSize
    const totalMB = totalKB / 1024

    return {
      questions: Math.round(questionSize),
      answers: Math.round(answerSize),
      sessions: Math.round(sessionSize),
      totalKB: Math.round(totalKB),
      totalMB: parseFloat(totalMB.toFixed(2)),
      quotaPercentage: Math.round((totalMB / SUPABASE_LIMITS.storage) * 100),
    }
  }

  /**
   * Calculate estimated bandwidth for N students
   */
  calculateBandwidth(studentCount, questionsPerExam = 50) {
    // Pre-sync download: ~300KB per student (compressed questions)
    const preSyncKB = studentCount * 300
    // Submit upload: ~8KB per student (compressed answers)
    const submitKB = studentCount * 8
    // Static assets: ~500KB per student (cached after first load)
    const staticKB = studentCount * 500
    // Total
    const totalKB = preSyncKB + submitKB + staticKB
    const totalMB = totalKB / 1024

    return {
      preSync: Math.round(preSyncKB / 1024), // MB
      submit: Math.round(submitKB / 1024), // MB
      static: Math.round(staticKB / 1024), // MB
      totalMB: Math.round(totalMB),
      quotaPercentage: Math.round((totalMB / SUPABASE_LIMITS.bandwidth) * 100),
    }
  }

  /**
   * Full capacity report for N students
   */
  generateReport(studentCount, questionsPerExam = 50) {
    const apiCalls = this.calculateApiCalls(studentCount, questionsPerExam)
    const storage = this.calculateStorage(studentCount, questionsPerExam)
    const bandwidth = this.calculateBandwidth(studentCount, questionsPerExam)

    const overallHealth =
      apiCalls.quotaPercentage < 50 && storage.quotaPercentage < 50 && bandwidth.quotaPercentage < 50
        ? 'healthy'
        : apiCalls.quotaPercentage < 80 && storage.quotaPercentage < 80 && bandwidth.quotaPercentage < 80
        ? 'warning'
        : 'critical'

    const recommendations = []

    if (apiCalls.quotaPercentage > 80) {
      recommendations.push('Kurangi auto-save frequency atau tingkatkan batch size')
    }
    if (storage.quotaPercentage > 80) {
      recommendations.push('Aktifkan cleanup otomatis untuk data lama')
    }
    if (bandwidth.quotaPercentage > 80) {
      recommendations.push('Aktifkan low bandwidth mode atau kurangi image quality')
    }
    if (studentCount > 500) {
      recommendations.push('Gunakan staggered sync untuk distribute load')
    }
    if (questionsPerExam > 100) {
      recommendations.push('Pertimbangkan split ujian menjadi beberapa sesi')
    }

    return {
      studentCount,
      questionsPerExam,
      apiCalls,
      storage,
      bandwidth,
      overallHealth,
      recommendations,
      limits: { supabase: SUPABASE_LIMITS, vercel: VERCEL_LIMITS },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Calculate max concurrent users based on current quota
   */
  calculateMaxConcurrent() {
    // Based on Supabase Free limits
    // 500,000 API calls/month, 5 calls per student per exam
    const maxByApi = Math.floor(SUPABASE_LIMITS.apiRequests / 5)
    // 2GB bandwidth, ~800KB per student
    const maxByBandwidth = Math.floor((SUPABASE_LIMITS.bandwidth * 1024) / 800)
    // 500MB storage, ~5KB per student per exam
    const maxByStorage = Math.floor((SUPABASE_LIMITS.storage * 1024) / 5)

    return {
      maxByApi,
      maxByBandwidth,
      maxByStorage,
      recommended: Math.min(maxByApi, maxByBandwidth, maxByStorage),
      perExamSession: Math.min(1000, Math.floor(SUPABASE_LIMITS.apiRequests / 50)), // conservative
    }
  }
}

// Singleton
let capacityInstance = null

export const getCapacityService = () => {
  if (!capacityInstance) {
    capacityInstance = new CapacityService()
  }
  return capacityInstance
}

export default CapacityService
