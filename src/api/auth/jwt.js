/**
 * @fileoverview JWT Authentication Module with Enhanced Security
 * @description Token generation and verification with environment variables
 * @author CTO/CPO Senior Team
 * @version 2.0.0
 * 
 * SECURITY IMPROVEMENTS:
 * - Uses environment variable for JWT secret
 * - Shorter token expiration (24h instead of 7d)
 * - Refresh token support
 * - Token blacklist capability
 */

const jwt = require('jsonwebtoken')

// Use environment variable or fallback (should be set in production)
const SECRET = process.env.JWT_SECRET || 'krypton-secret-key'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'krypton-refresh-secret-key'

// Token blacklist for logout/revocation
const tokenBlacklist = new Set()

module.exports = {

  /**
   * Generates an access token
   * @param {object} data - Payload data (companyId, type, etc.)
   * @param {string} expiresIn - Token expiration (default: 24h)
   * @returns {string} JWT token
   */
  generate(data, expiresIn = '24h') {

    return jwt.sign(

      data,

      SECRET,

      {
        expiresIn,
        issuer: 'whatsapp-saas',
        audience: 'whatsapp-saas-users'
      }

    )

  },

  /**
   * Generates a refresh token (longer-lived)
   * @param {object} data - Payload data
   * @returns {string} Refresh token
   */
  generateRefreshToken(data) {
    return jwt.sign(
      data,
      REFRESH_SECRET,
      {
        expiresIn: '7d',
        issuer: 'whatsapp-saas',
        audience: 'whatsapp-saas-refresh'
      }
    )
  },

  /**
   * Verifies an access token
   * @param {string} token - JWT token
   * @returns {object} Decoded payload
   * @throws {Error} If token is invalid or blacklisted
   */
  verify(token) {

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked')
    }

    return jwt.verify(

      token,

      SECRET,

      {
        issuer: 'whatsapp-saas',
        audience: 'whatsapp-saas-users'
      }

    )

  },

  /**
   * Verifies a refresh token
   * @param {string} token - Refresh token
   * @returns {object} Decoded payload
   */
  verifyRefreshToken(token) {
    return jwt.verify(
      token,
      REFRESH_SECRET,
      {
        issuer: 'whatsapp-saas',
        audience: 'whatsapp-saas-refresh'
      }
    )
  },

  /**
   * Revokes a token (adds to blacklist)
   * @param {string} token - Token to revoke
   */
  revoke(token) {
    tokenBlacklist.add(token)
  },

  /**
   * Checks if a token is revoked
   * @param {string} token - Token to check
   * @returns {boolean} True if revoked
   */
  isRevoked(token) {
    return tokenBlacklist.has(token)
  },

  /**
   * Clears the token blacklist (use sparingly)
   */
  clearBlacklist() {
    tokenBlacklist.clear()
  },

  /**
   * Gets blacklist size (for monitoring)
   * @returns {number} Number of blacklisted tokens
   */
  getBlacklistSize() {
    return tokenBlacklist.size
  }

}