/**
 * Script utilitário para gerar uma chave de criptografia válida
 * Uso: node scripts/generate-encryption-key.js
 */

const crypto = require('crypto')

function generateKey() {
  return crypto.randomBytes(32).toString('hex')
}

const key = generateKey()

console.log('=================================')
console.log('Chave de criptografia gerada:')
console.log('=================================')
console.log('')
console.log(`ENCRYPTION_KEY=${key}`)
console.log('')
console.log('=================================')
console.log('Adicione esta linha ao seu arquivo .env')
console.log('=================================')
