const fs = require('fs')
const path = require('path')



class SessionManager {

   static SESSION_TIMEOUT = 1000 * 60 * 30
  // 30 minutos

  // Armazena conversas em modo manual por companyId
  static manualModeCache = new Map()

  static getPath(clientId) {

    return path.join(
      __dirname,
      `../../sessionsData/${clientId}.json`
    )
  }

  static ensureDirectory(filePath) {

    const dir =
    path.dirname(filePath)

    if (!fs.existsSync(dir)) {

      fs.mkdirSync(dir, {
        recursive: true
      })

    }

  }

  static load(clientId) {

    const filePath =
      this.getPath(clientId)

    // GARANTE PASTA
    this.ensureDirectory(filePath)

    if (!fs.existsSync(filePath)) {

      fs.writeFileSync(
        filePath,
        JSON.stringify({}, null, 2)
      )

    }

    return JSON.parse(
      fs.readFileSync(filePath)
    )
  }

  static save(clientId, data) {

    const filePath =
      this.getPath(clientId)

    // GARANTE PASTA
    this.ensureDirectory(filePath)

    fs.writeFileSync(
      filePath,
      JSON.stringify(data, null, 2)
    )
  }

  static getSession(clientId, userId) {

    const sessions =
      this.load(clientId)

    if (!sessions[userId]) {

      sessions[userId] = {

        flow: 'assistant',

        step: 'start',

        cart: [],

        data: {},

        lastActivity: Date.now()
      }

      this.save(clientId, sessions)
    }

    const session = sessions[userId]

    if (!session.lastActivity) {

  session.lastActivity =
    session.createdAt || Date.now()

  this.save(clientId, sessions)
}

if (
  Date.now() - session.lastActivity >
  this.SESSION_TIMEOUT
) {

  console.log(
    'Sessão expirada:',
    userId
  )

  sessions[userId] = {

    flow: 'assistant',

    step: 'start',

    cart: [],

    data: {},

    lastActivity: Date.now()

  }

  this.save(clientId, sessions)
}

    return sessions[userId]
  }

  static updateSession(
    clientId,
    userId,
    newData
  ) {

    const sessions =
      this.load(clientId)

    sessions[userId] = {

  ...sessions[userId],

  ...newData,

  lastActivity: Date.now()
}

    this.save(clientId, sessions)

    return sessions[userId]
  }

  // ========================
  // MANUAL MODE MANAGEMENT
  // ========================

  static setManualMode(clientId, jid, agentId = null) {
    const key = `${clientId}:${jid}`
    this.manualModeCache.set(key, {
      enabled: true,
      agentId,
      timestamp: Date.now()
    })
    console.log(`[MANUAL MODE] Enabled for ${key} by agent ${agentId}`)
  }

  static unsetManualMode(clientId, jid) {
    const key = `${clientId}:${jid}`
    this.manualModeCache.delete(key)
    console.log(`[MANUAL MODE] Disabled for ${key}`)
  }

  static isManualMode(clientId, jid) {
    const key = `${clientId}:${jid}`
    return this.manualModeCache.has(key)
  }

  static getManualModeInfo(clientId, jid) {
    const key = `${clientId}:${jid}`
    return this.manualModeCache.get(key) || null
  }

  static getAllManualConversations(clientId) {
    const conversations = []
    for (const [key, value] of this.manualModeCache.entries()) {
      if (key.startsWith(`${clientId}:`)) {
        const jid = key.split(':')[1]
        conversations.push({
          jid,
          ...value
        })
      }
    }
    return conversations
  }
}

module.exports = SessionManager