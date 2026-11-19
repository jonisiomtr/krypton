const crypto = require('crypto')

/**
 * Criptografa texto usando AES-256-GCM
 * @param {string} text - Texto a ser criptografado
 * @param {string} key - Chave de criptografia (32 bytes em hex)
 * @returns {string} - Texto criptografado em formato base64
 */
function encrypt(text, key) {
  try {
    // Garante que a chave tenha 32 bytes (hex para buffer)
    const keyBuffer = Buffer.from(key, 'hex').slice(0, 32)
    if (keyBuffer.length < 32) {
      throw new Error('Chave de criptografia deve ter pelo menos 32 bytes')
    }

    // Gera IV aleatório (12 bytes para GCM)
    const iv = crypto.randomBytes(12)

    // Criptografa
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Pega o auth tag
    const authTag = cipher.getAuthTag()

    // Combina IV + authTag + encrypted em base64
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')])
    return combined.toString('base64')
  } catch (error) {
    console.error('Erro ao criptografar:', error.message)
    throw error
  }
}

/**
 * Descriptografa texto usando AES-256-GCM
 * @param {string} encrypted - Texto criptografado em base64
 * @param {string} key - Chave de criptografia (32 bytes em hex)
 * @returns {string} - Texto descriptografado
 */
function decrypt(encrypted, key) {
  try {
    // Garante que a chave tenha 32 bytes
    const keyBuffer = Buffer.from(key, 'hex').slice(0, 32)
    if (keyBuffer.length < 32) {
      throw new Error('Chave de criptografia deve ter pelo menos 32 bytes')
    }

    // Decodifica base64
    const combined = Buffer.from(encrypted, 'base64')

    // Extrai IV (12 bytes), authTag (16 bytes) e encrypted
    const iv = combined.slice(0, 12)
    const authTag = combined.slice(12, 28)
    const encryptedText = combined.slice(28)

    // Descriptografa
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Erro ao descriptografar:', error.message)
    throw error
  }
}

/**
 * Gera uma chave de criptografia aleatória de 32 bytes
 * @returns {string} - Chave em formato hexadecimal
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Valida se uma chave hexadecimal tem 32 bytes (64 caracteres hex)
 * @param {string} key - Chave em formato hexadecimal
 * @returns {boolean} - True se válida, false caso contrário
 */
function validateKey(key) {
  try {
    // Verifica se é uma string hexadecimal válida
    const hexRegex = /^[0-9a-fA-F]{64}$/
    if (!hexRegex.test(key)) {
      return false
    }
    
    // Verifica se tem 32 bytes quando convertida
    const keyBuffer = Buffer.from(key, 'hex')
    return keyBuffer.length === 32
  } catch (error) {
    return false
  }
}

/**
 * Gera uma chave válida ou valida uma chave existente
 * @param {string} [existingKey] - Chave existente para validar (opcional)
 * @returns {string} - Chave válida em formato hexadecimal
 */
function getValidKey(existingKey) {
  if (existingKey && validateKey(existingKey)) {
    return existingKey
  }
  
  console.log('⚠️ Chave de criptografia inválida ou não fornecida. Gerando nova chave...')
  const newKey = generateKey()
  console.log('🔑 Nova chave gerada (adicione ao .env):')
  console.log(`ENCRYPTION_KEY=${newKey}`)
  return newKey
}

module.exports = {
  encrypt,
  decrypt,
  generateKey,
  validateKey,
  getValidKey
}
