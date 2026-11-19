/**
 * @fileoverview In-Memory Cache Utility
 * @description Simple caching layer to reduce file I/O and improve performance
 * @author CTO/CPO Senior Team
 * @version 1.0.0
 * 
 * WHY THIS EXISTS:
 * - File-based database causes repeated I/O operations
 * - No cache means every request reads from disk
 * - Significant performance impact with 100+ tenants
 * 
 * USAGE:
 * const cache = require('./utils/cache')
 * cache.set('tenant:john:products', productsData, 300000) // 5 minutes TTL
 * const cached = cache.get('tenant:john:products')
 */

class SimpleCache {
  constructor() {
    this.cache = new Map()
    this.timers = new Map()
  }

  /**
   * Sets a value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttlMs = 5 * 60 * 1000) {
    // Remove existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }

    // Set value
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    })

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key)
    }, ttlMs)

    this.timers.set(key, timer)
  }

  /**
   * Gets a value from cache
   * @param {string} key - Cache key
   * @returns {any|undefined} Cached value or undefined if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return undefined
    }

    return entry.value
  }

  /**
   * Deletes a value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key)

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
      this.timers.delete(key)
    }
  }

  /**
   * Clears all cache entries
   */
  clear() {
    this.cache.clear()
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }

  /**
   * Gets cache statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Invalidates all cache entries matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'tenant:john:*')
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'))
    const keysToDelete = []

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.delete(key))
  }
}

// Export singleton instance
const cache = new SimpleCache()

module.exports = cache
