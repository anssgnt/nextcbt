/**
 * Metrics Service - Collects and tracks system performance metrics
 * PHASE 4: Real-time monitoring for 1000 concurrent users
 */

class MetricsService {
  constructor() {
    this.metrics = {
      apiCalls: [],
      cacheHits: 0,
      cacheMisses: 0,
      syncSuccess: 0,
      syncFailure: 0,
      activeUsers: 0,
      responseTime: [],
      errors: [],
      quotaUsage: { api: 0, storage: 0, bandwidth: 0 },
    }
    this.listeners = []
    this.collectInterval = null
  }

  // Start collecting metrics
  start(intervalMs = 5000) {
    this.collectInterval = setInterval(() => {
      this.collectSystemMetrics()
      this.notifyListeners()
    }, intervalMs)
  }

  // Stop collecting
  stop() {
    if (this.collectInterval) {
      clearInterval(this.collectInterval)
      this.collectInterval = null
    }
  }

  // Subscribe to metric updates
  subscribe(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  notifyListeners() {
    const snapshot = this.getSnapshot()
    this.listeners.forEach((cb) => cb(snapshot))
  }

  // Record API call
  recordApiCall(endpoint, duration, success = true) {
    const entry = {
      endpoint,
      duration,
      success,
      timestamp: Date.now(),
    }
    this.metrics.apiCalls.push(entry)

    // Keep only last 1000 entries
    if (this.metrics.apiCalls.length > 1000) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-1000)
    }

    if (!success) {
      this.metrics.errors.push({
        endpoint,
        timestamp: Date.now(),
        type: 'api_error',
      })
    }

    this.metrics.responseTime.push({ time: Date.now(), value: duration })
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-100)
    }
  }

  // Record cache hit/miss
  recordCacheHit() {
    this.metrics.cacheHits++
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++
  }

  // Record sync events
  recordSyncSuccess() {
    this.metrics.syncSuccess++
  }

  recordSyncFailure() {
    this.metrics.syncFailure++
  }

  // Record error
  recordError(type, message, endpoint = '') {
    this.metrics.errors.push({
      type,
      message,
      endpoint,
      timestamp: Date.now(),
    })
    if (this.metrics.errors.length > 500) {
      this.metrics.errors = this.metrics.errors.slice(-500)
    }
  }

  // Update active users count
  setActiveUsers(count) {
    this.metrics.activeUsers = count
  }

  // Collect system metrics (storage, etc)
  async collectSystemMetrics() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        this.metrics.quotaUsage.storage = Math.round(
          (estimate.usage / estimate.quota) * 100
        )
      }
    } catch (e) {
      // ignore
    }
  }

  // Get current snapshot
  getSnapshot() {
    const now = Date.now()
    const lastMinute = now - 60000
    const lastHour = now - 3600000

    const recentCalls = this.metrics.apiCalls.filter((c) => c.timestamp > lastMinute)
    const hourCalls = this.metrics.apiCalls.filter((c) => c.timestamp > lastHour)
    const recentErrors = this.metrics.errors.filter((e) => e.timestamp > lastHour)

    const avgResponseTime =
      recentCalls.length > 0
        ? Math.round(recentCalls.reduce((sum, c) => sum + c.duration, 0) / recentCalls.length)
        : 0

    const cacheTotal = this.metrics.cacheHits + this.metrics.cacheMisses
    const cacheHitRate = cacheTotal > 0 ? Math.round((this.metrics.cacheHits / cacheTotal) * 100) : 0

    const syncTotal = this.metrics.syncSuccess + this.metrics.syncFailure
    const syncSuccessRate = syncTotal > 0 ? Math.round((this.metrics.syncSuccess / syncTotal) * 100) : 0

    return {
      activeUsers: this.metrics.activeUsers,
      apiCallsPerMinute: recentCalls.length,
      apiCallsPerHour: hourCalls.length,
      avgResponseTime,
      cacheHitRate,
      syncSuccessRate,
      errorRate: recentErrors.length,
      quotaUsage: this.metrics.quotaUsage,
      responseTimeHistory: this.metrics.responseTime.slice(-20),
      recentErrors: recentErrors.slice(-10),
      timestamp: now,
    }
  }

  // Get alerts based on thresholds
  getAlerts() {
    const snapshot = this.getSnapshot()
    const alerts = []

    if (snapshot.avgResponseTime > 3000) {
      alerts.push({
        level: 'critical',
        message: `Response time tinggi: ${snapshot.avgResponseTime}ms (threshold: 3000ms)`,
      })
    }

    if (snapshot.cacheHitRate < 70 && (this.metrics.cacheHits + this.metrics.cacheMisses) > 10) {
      alerts.push({
        level: 'warning',
        message: `Cache hit rate rendah: ${snapshot.cacheHitRate}% (threshold: 70%)`,
      })
    }

    if (snapshot.syncSuccessRate < 95 && (this.metrics.syncSuccess + this.metrics.syncFailure) > 5) {
      alerts.push({
        level: 'warning',
        message: `Sync failure rate tinggi: ${100 - snapshot.syncSuccessRate}% (threshold: 5%)`,
      })
    }

    if (snapshot.quotaUsage.storage > 80) {
      alerts.push({
        level: 'warning',
        message: `Storage usage tinggi: ${snapshot.quotaUsage.storage}% (threshold: 80%)`,
      })
    }

    return alerts
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      apiCalls: [],
      cacheHits: 0,
      cacheMisses: 0,
      syncSuccess: 0,
      syncFailure: 0,
      activeUsers: 0,
      responseTime: [],
      errors: [],
      quotaUsage: { api: 0, storage: 0, bandwidth: 0 },
    }
  }
}

// Singleton
let metricsInstance = null

export const getMetricsService = () => {
  if (!metricsInstance) {
    metricsInstance = new MetricsService()
    metricsInstance.start()
  }
  return metricsInstance
}

export default MetricsService
