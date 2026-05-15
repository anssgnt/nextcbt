/**
 * Rate Limiter dengan Sliding Window Algorithm
 * Default: 12 requests per minute per user
 */

class RateLimiter {
  constructor(maxRequests = 12, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = new Map() // userId -> array of timestamps
  }

  /**
   * Check if request is allowed
   */
  isAllowed(userId) {
    const now = Date.now()
    const windowStart = now - this.windowMs

    if (!this.requests.has(userId)) {
      this.requests.set(userId, [])
    }

    const userRequests = this.requests.get(userId)

    // Remove old requests outside the window
    const validRequests = userRequests.filter((timestamp) => timestamp > windowStart)
    this.requests.set(userId, validRequests)

    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + this.windowMs,
        retryAfter: Math.ceil((validRequests[0] + this.windowMs - now) / 1000),
      }
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(userId, validRequests)

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      resetTime: now + this.windowMs,
      retryAfter: null,
    }
  }

  /**
   * Get current status
   */
  getStatus(userId) {
    const now = Date.now()
    const windowStart = now - this.windowMs

    if (!this.requests.has(userId)) {
      return {
        requests: 0,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
      }
    }

    const userRequests = this.requests.get(userId)
    const validRequests = userRequests.filter((timestamp) => timestamp > windowStart)

    return {
      requests: validRequests.length,
      remaining: Math.max(0, this.maxRequests - validRequests.length),
      resetTime: validRequests.length > 0 ? validRequests[0] + this.windowMs : now + this.windowMs,
    }
  }

  /**
   * Reset user's rate limit
   */
  reset(userId) {
    this.requests.delete(userId)
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    this.requests.clear()
  }

  /**
   * Get all active users
   */
  getActiveUsers() {
    return Array.from(this.requests.keys())
  }

  /**
   * Cleanup old entries (call periodically)
   */
  cleanup() {
    const now = Date.now()
    const windowStart = now - this.windowMs

    for (const [userId, timestamps] of this.requests.entries()) {
      const validRequests = timestamps.filter((timestamp) => timestamp > windowStart)
      if (validRequests.length === 0) {
        this.requests.delete(userId)
      } else {
        this.requests.set(userId, validRequests)
      }
    }
  }
}

// Global instance
let limiterInstance = null

/**
 * Get or create rate limiter instance
 */
export const getRateLimiter = (maxRequests = 12, windowMs = 60000) => {
  if (!limiterInstance) {
    limiterInstance = new RateLimiter(maxRequests, windowMs)

    // Cleanup every 5 minutes
    setInterval(() => {
      limiterInstance.cleanup()
    }, 5 * 60 * 1000)
  }
  return limiterInstance
}

/**
 * Middleware untuk Express/API
 */
export const rateLimitMiddleware = (maxRequests = 12, windowMs = 60000) => {
  const limiter = new RateLimiter(maxRequests, windowMs)

  return (req, res, next) => {
    const userId = req.user?.id || req.ip
    const result = limiter.isAllowed(userId)

    // Set headers
    res.set('X-RateLimit-Limit', limiter.maxRequests)
    res.set('X-RateLimit-Remaining', result.remaining)
    res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    if (!result.allowed) {
      res.set('Retry-After', result.retryAfter)
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Retry after ${result.retryAfter} seconds`,
        retryAfter: result.retryAfter,
      })
    }

    next()
  }
}

/**
 * Client-side rate limiter untuk API calls
 */
export class ClientRateLimiter {
  constructor(maxRequests = 12, windowMs = 60000) {
    this.limiter = new RateLimiter(maxRequests, windowMs)
    this.userId = null
  }

  setUserId(userId) {
    this.userId = userId
  }

  /**
   * Check if API call is allowed
   */
  canMakeRequest() {
    if (!this.userId) {
      console.warn('User ID not set for rate limiter')
      return { allowed: true }
    }

    return this.limiter.isAllowed(this.userId)
  }

  /**
   * Get current status
   */
  getStatus() {
    if (!this.userId) return null
    return this.limiter.getStatus(this.userId)
  }

  /**
   * Wait until next request is allowed
   */
  async waitForNextRequest() {
    const status = this.canMakeRequest()
    if (status.allowed) return

    const waitTime = status.retryAfter * 1000
    return new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  /**
   * Reset
   */
  reset() {
    if (this.userId) {
      this.limiter.reset(this.userId)
    }
  }
}

export default RateLimiter
