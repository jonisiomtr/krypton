const fs = require('fs')
const path = require('path')

/**
 * Sistema de trava por arquivo para evitar race conditions
 * Uso: await fileLock.acquire(tenantId) -> process -> await fileLock.release(tenantId)
 */
class FileLock {
  constructor() {
    this.locks = new Map() // Armazena timestamps de locks
  }

  /**
   * Adquire trava para um tenant específico
   * @param {string} tenantId - ID do tenant
   * @param {number} timeout - Tempo máximo de espera em ms (padrão: 5000)
   * @param {number} retryInterval - Intervalo entre tentativas em ms (padrão: 100)
   * @returns {Promise<boolean>} - true se lock foi adquirido
   */
  async acquire(tenantId, timeout = 5000, retryInterval = 100) {
    const lockFile = path.join(__dirname, `../../tenants/${tenantId}/.lock`)
    const maxRetries = Math.ceil(timeout / retryInterval)
    let retries = 0

    while (retries < maxRetries) {
      try {
        // Tenta criar arquivo de lock de forma exclusiva (flag 'wx')
        fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' })

        // Lock adquirido com sucesso
        this.locks.set(tenantId, Date.now())
        console.log(`🔒 Lock adquirido para tenant: ${tenantId}`)
        return true

      } catch (err) {
        if (err.code === 'EEXIST') {
          // Lock já existe, verificar se está stale (processo morreu)
          try {
            const lockPid = parseInt(fs.readFileSync(lockFile, 'utf8'))
            
            // Verifica se processo ainda existe (só funciona no Unix)
            if (process.platform !== 'win32') {
              try {
                process.kill(lockPid, 0) // Signal 0 verifica se processo existe
              } catch (e) {
                // Processo não existe mais, podemos remover o lock
                console.log(`🧹 Removendo lock stale para tenant: ${tenantId}`)
                fs.unlinkSync(lockFile)
                continue
              }
            }

            // Processo ainda existe, esperar e tentar novamente
            retries++
            if (retries < maxRetries) {
              await this.sleep(retryInterval)
            } else {
              throw new Error(`Timeout ao adquirir lock para tenant ${tenantId} após ${timeout}ms`)
            }
          } catch (readErr) {
            // Erro ao ler lock, tentar remover e adquirir novamente
            try {
              fs.unlinkSync(lockFile)
            } catch (unlinkErr) {
              // Ignora erro ao remover
            }
            retries++
            await this.sleep(retryInterval)
          }
        } else {
          throw new Error(`Erro ao adquirir lock: ${err.message}`)
        }
      }
    }

    throw new Error(`Não foi possível adquirir lock para tenant ${tenantId}`)
  }

  /**
   * Libera trava para um tenant específico
   * @param {string} tenantId - ID do tenant
   */
  async release(tenantId) {
    const lockFile = path.join(__dirname, `../../tenants/${tenantId}/.lock`)

    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile)
        this.locks.delete(tenantId)
        console.log(`🔓 Lock liberado para tenant: ${tenantId}`)
      }
    } catch (err) {
      console.error(`Erro ao liberar lock para tenant ${tenantId}:`, err.message)
    }
  }

  /**
   * Verifica se um tenant está com lock ativo
   * @param {string} tenantId - ID do tenant
   * @returns {boolean}
   */
  isLocked(tenantId) {
    const lockFile = path.join(__dirname, `../../tenants/${tenantId}/.lock`)
    return fs.existsSync(lockFile)
  }

  /**
   * Libera todos os locks (para cleanup)
   */
  async releaseAll() {
    console.log('🧹 Liberando todos os locks...')
    for (const tenantId of this.locks.keys()) {
      await this.release(tenantId)
    }
  }

  /**
   * Helper para sleep
   * @param {number} ms - Milissegundos
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton
const fileLock = new FileLock()

// Cleanup ao encerrar processo
process.on('SIGINT', async () => {
  await fileLock.releaseAll()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await fileLock.releaseAll()
  process.exit(0)
})

module.exports = fileLock
