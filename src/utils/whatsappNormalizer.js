/**
 * @fileoverview Centralized WhatsApp Number Normalization Utility
 * @description Ensures consistent phone number formatting across the entire application
 * @author CTO/CPO Senior Team
 * @version 1.0.0
 * 
 * WHY THIS EXISTS:
 * - Phone numbers were being normalized in multiple places inconsistently
 * - Brazil requires 13 digits: 55 (country) + DDD (2) + 9 (mobile) + number (8)
 * - This utility centralizes the logic to prevent bugs and improve maintainability
 * 
 * USAGE:
 * const { normalizeWhatsAppPhone, formatPhoneForDisplay, isValidWhatsAppPhone } = require('./utils/whatsappNormalizer')
 */

/**
 * Normalizes a phone number to WhatsApp JID format
 * @param {string} phone - Raw phone number (can include formatting)
 * @returns {string} Normalized phone number (13 digits for Brazil mobile)
 * 
 * @example
 * normalizeWhatsAppPhone('91991873356') // Returns '55919991873356'
 * normalizeWhatsAppPhone('(91) 99187-3356') // Returns '55919991873356'
 * normalizeWhatsAppPhone('+55 91 99187-3356') // Returns '55919991873356'
 */
function normalizeWhatsAppPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Invalid phone number: must be a non-empty string')
  }

  // Remove all non-numeric characters
  let normalized = phone.replace(/\D/g, '')

  // If empty after cleaning, return as-is (will fail validation)
  if (normalized.length === 0) {
    return phone
  }

  // Add Brazil country code if missing
  if (!normalized.startsWith('55')) {
    normalized = '55' + normalized
  }

  // NÃO alterar o formato - usar exatamente como fornecido pelo usuário
  // Se o usuário já digitou com o formato correto, não fazer mais modificações

  return normalized
}

/**
 * Formats a phone number for display to users
 * @param {string} phone - Normalized phone number
 * @returns {string} Formatted phone number (e.g., (91) 99187-3356)
 * 
 * @example
 * formatPhoneForDisplay('55919991873356') // Returns '(91) 99187-3356'
 */
function formatPhoneForDisplay(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone
  }

  const digits = phone.replace(/\D/g, '')

  if (digits.length === 13 && digits.startsWith('55')) {
    // Brazil format: (DDD) 9XXXX-XXXX
    const ddd = digits.substring(2, 4)
    const first = digits.substring(4, 9)
    const second = digits.substring(9, 13)
    return `(${ddd}) ${first}-${second}`
  }

  // Fallback: return as-is
  return phone
}

/**
 * Validates if a phone number is a valid WhatsApp number
 * @param {string} phone - Phone number to validate
 * @returns {object} Validation result with isValid and reason
 * 
 * @example
 * isValidWhatsAppPhone('55919991873356') // Returns { isValid: true, reason: null }
 * isValidWhatsAppPhone('123') // Returns { isValid: false, reason: 'Number too short' }
 */
function isValidWhatsAppPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, reason: 'Invalid input' }
  }

  const digits = phone.replace(/\D/g, '')

  // Minimum length check
  if (digits.length < 10) {
    return { isValid: false, reason: 'Number too short' }
  }

  // Maximum length check
  if (digits.length > 15) {
    return { isValid: false, reason: 'Number too long' }
  }

  // Brazil specific validation
  if (digits.startsWith('55')) {
    if (digits.length !== 13) {
      return { isValid: false, reason: 'Brazil mobile numbers must be 13 digits' }
    }
  }

  return { isValid: true, reason: null }
}

/**
 * Converts a normalized phone number to WhatsApp JID format
 * @param {string} phone - Normalized phone number
 * @returns {string} WhatsApp JID (e.g., 55919991873356@s.whatsapp.net)
 * 
 * @example
 * toWhatsAppJID('55919991873356') // Returns '55919991873356@s.whatsapp.net'
 */
function toWhatsAppJID(phone) {
  const normalized = normalizeWhatsAppPhone(phone)
  return `${normalized}@s.whatsapp.net`
}

/**
 * Extracts phone number from WhatsApp JID
 * @param {string} jid - WhatsApp JID (e.g., 55919991873356@s.whatsapp.net)
 * @returns {string} Phone number without @s.whatsapp.net
 * 
 * @example
 * fromWhatsAppJID('55919991873356@s.whatsapp.net') // Returns '55919991873356'
 */
function fromWhatsAppJID(jid) {
  if (!jid || typeof jid !== 'string') {
    return jid
  }

  return jid.replace('@s.whatsapp.net', '')
}

module.exports = {
  normalizeWhatsAppPhone,
  formatPhoneForDisplay,
  isValidWhatsAppPhone,
  toWhatsAppJID,
  fromWhatsAppJID
}
