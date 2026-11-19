/**
 * @fileoverview Rate Limiting Middleware
 * @description Prevents API abuse by limiting request rate per IP
 * @author CTO/CPO Senior Team
 * @version 1.0.0
 * 
 * WHY THIS EXISTS:
 * - No rate limiting means API can be abused/DoS'd
 * - Protects server from excessive requests
 * - Prevents brute force attacks on login
 * 
 * USAGE:
 * const rateLimiter = require('./middlewares/rateLimiter')
 * app.use('/api/auth', rateLimiter(10, 60)) // 10 requests per minute
 */

const rateLimitMap = new Map()

/**
 * Creates a rate limiting middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 * 
 * @example
 * const limiter = rateLimiter(100, 60000) // 100 requests per minute
 * app.use('/api', limiter)
 */
function rateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress
    const now = Date.now()

    // Get or create rate limit entry for this IP
    let entry = rateLimitMap.get(ip)

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset if window expired
      entry = {
        count: 0,
        resetTime: now + windowMs
      }
      rateLimitMap.set(ip, entry)
    }

    // Increment request count
    entry.count++

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      })
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count)
    res.setHeader('X-RateLimit-Reset', entry.resetTime)

    next()
  }
}

/**
 * Clear expired rate limit entries (call periodically)
 * This prevents memory leaks from stale entries
 */
function cleanupRateLimits() {
  const now = Date.now()
  const ipAddresses = Array.from(rateLimitMap.keys())

  ipAddresses.forEach(ip => {
    const entry = rateLimitMap.get(ip)
    if (entry && now > entry.resetTime) {
      rateLimitMap.delete(ip)
    }
  })
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000)

module.exports = rateLimiter
