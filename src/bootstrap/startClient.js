const fs = require('fs')
const path = require('path')
const pino = require('pino')
const QRCode = require('qrcode-terminal')
const QRCodeData = require('qrcode')
const PQueue = require('p-queue').default

global.restartingClients = {}
global.clientSockets = {}
global.clientStartTime = global.clientStartTime || {}

global.lastSocketActivity = global.lastSocketActivity || {}
global.reconnectAttempts = global.reconnectAttempts || {}

global.processedMessages = global.processedMessages || new Set()

// Armazenar conversas por empresa
global.chatsStore = global.chatsStore || {}

// Armazenar mensagens por empresa e chat
global.messagesStore = global.messagesStore || {}

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys')

const { Boom } = require('@hapi/boom')

const ClientManager = require('../core/ClientManager')
const handleMessage = require('../handlers/messages')
const loadModules = require('../core/ModuleLoader')
const ConnectionManager = require('../managers/ConnectionManager')
const { sessions } = require('../store/sessions')

const startingClients = {}

global.messageQueues = {}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function startClient(clientId, force = false) {

  if (startingClients[clientId]) return

  const existing = global.clientSockets[clientId]

  if (existing && existing.ws?.readyState === 1 && !force) {
    console.log(`⚠️ ${clientId} já conectado`)
    return
  }

  if (existing) {
    try { existing.ev.removeAllListeners() } catch {}
    try { existing.ws.close() } catch {}
    delete global.clientSockets[clientId]
  }

  if (!global.messageQueues[clientId]) {
    global.messageQueues[clientId] = new PQueue({ concurrency: 1 })
  }

  const oldClient = ClientManager.get(clientId)

  if (oldClient?.sock) {
    global.restartingClients[clientId] = true
    try { oldClient.sock.ev.removeAllListeners() } catch {}
    try { oldClient.sock.ws.close() } catch {}
  }

  startingClients[clientId] = true

  try {

    const configPath = path.join(__dirname, `../tenants/${clientId}/config.json`)
    if (!fs.existsSync(configPath)) {
      startingClients[clientId] = false
      return
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const modules = loadModules(config.modules || [])

    const sessionPath = path.join(__dirname, `../../sessions/${clientId}`)

    console.log(`📂 Caminho da sessão para ${clientId}: ${sessionPath}`)
    console.log(`📂 Sessão existe: ${fs.existsSync(sessionPath)}`)

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    // Fetch latest version
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`📦 Versão do Baileys: ${version.join('.')} (latest: ${isLatest})`)

    // Cria logger silencioso
    const logger = pino({ level: 'silent' })

    // CONFIGURAÇÃO DO BAILEYS 7.0.0 (segundo exemplo oficial)
    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false // Vamos mostrar QR manualmente
    })

    global.clientStartTime[clientId] = Date.now()
    global.clientSockets[clientId] = sock

    const ensureSession = () => {
      if (!sessions[clientId]) sessions[clientId] = {}
    }

    // PROCESSAMENTO DE EVENTOS (Baileys 7.0.0)
    sock.ev.process(async (events) => {

      // CONNECTION UPDATE
      if (events['connection.update']) {
        const update = events['connection.update']
        const { connection, lastDisconnect, qr } = update

        global.lastSocketActivity[clientId] = Date.now()

        // QR Code
        if (qr) {
          console.log(`📱 QR Code recebido para ${clientId}!`)
          QRCode.generate(qr, { small: true })

          ensureSession()
          sessions[clientId].qr = qr

          // Converter QR para data URL para mostrar no frontend
          try {
            const qrDataUrl = await QRCodeData.toDataURL(qr)
            sessions[clientId].qrDataUrl = qrDataUrl
          } catch (err) {
            sessions[clientId].qrDataUrl = qr
          }

          // Emitir atualização do QR Code via socket
          if (global.io) {
            global.io.emit('connection-update', {
              clientId,
              qr: sessions[clientId].qrDataUrl,
              connected: false
            })
          }
        }

        // Conexão aberta
        if (connection === 'open') {
          console.log(`✅ ${clientId} conectado com sucesso!`)

          global.reconnectAttempts[clientId] = 0
          ensureSession()
          sessions[clientId].connected = true
          sessions[clientId].qr = null

          // Inicializar armazenamento
          global.chatsStore[clientId] = {}
          global.messagesStore[clientId] = {}

          // Emitir atualização de conexão via socket
          if (global.io) {
            global.io.emit('connection-update', {
              clientId,
              qr: null,
              connected: true
            })
          }

          ConnectionManager.set(clientId, {
            qr: null,
            connected: true,
            sock
          })

          startingClients[clientId] = false

          ClientManager.add(clientId, {
            id: clientId,
            sock,
            config,
            modules
          })

          // Inicializar módulos
          modules.forEach(mod => {
            if (mod.events?.start) {
              const clientObj = ClientManager.get(clientId)
              try {
                mod.events.start({
                  client: clientObj,
                  sock: sock,
                  clientId: clientId
                })
                console.log(`✅ Módulo ${mod.name} inicializado`)
              } catch (e) {
                console.error(`❌ Erro ao inicializar módulo ${mod.name}:`, e.message)
              }
            }
          })
        }

        // Conexão fechada
        if (connection === 'close') {
          ConnectionManager.remove(clientId)
          startingClients[clientId] = false

          // Emitir atualização de desconexão via socket
          if (global.io) {
            global.io.emit('connection-update', {
              clientId,
              qr: null,
              connected: false
            })
          }

          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
            : true

          console.log(`🔴 ${clientId} desconectado. Reconectar: ${shouldReconnect}`)

          if (shouldReconnect) {
            const attempts = (global.reconnectAttempts[clientId] || 0) + 1
            global.reconnectAttempts[clientId] = attempts
            const delay = Math.min(attempts * 5000, 60000)
            console.log(`🔄 ${clientId} vai reconectar em ${delay}ms (tentativa ${attempts})`)
            setTimeout(() => startClient(clientId), delay)
          } else {
            // Foi deslogado - limpar sessão
            console.log(`🚪 ${clientId} foi deslogado. Limpando sessão...`)
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true })
            } catch {}
            delete sessions[clientId]
          }
        }
      }

      // CREDS UPDATE
      if (events['creds.update']) {
        await saveCreds()
        console.log(`💾 Credenciais salvas para ${clientId}`)
      }

      // MESSAGES UPSERT
      if (events['messages.upsert']) {
        const upsert = events['messages.upsert']

        if (upsert.type === 'notify') {
          for (const msg of upsert.messages) {
            if (!msg?.message) continue
            if (msg.key.fromMe) continue

            const messageId = msg.key.id

            // DEDUP
            if (global.processedMessages.has(messageId)) {
              continue
            }

            global.processedMessages.add(messageId)

            setTimeout(() => {
              global.processedMessages.delete(messageId)
            }, 1000 * 60 * 10)

            const messageTime = Number(msg.messageTimestamp) * 1000

            if (messageTime < global.clientStartTime[clientId]) {
              continue
            }

            await global.messageQueues[clientId].add(async () => {
              await sleep(400)
              await handleMessage({
                clientId,
                sock,
                message: msg,
                config
              })
              await sleep(200)
            })
          }
        }
      }
    })

    console.log(`🚀 ${clientId} iniciado`)

  } catch (err) {
    startingClients[clientId] = false
    console.error(`❌ Erro ao iniciar ${clientId}:`, err.message)
    setTimeout(() => startClient(clientId, true), 10000)
  }
}

module.exports = {
  startClient,
  startingClients
}
