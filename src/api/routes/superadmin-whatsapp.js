const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const QRCodeData = require('qrcode')
const pino = require('pino')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')

const configPath = path.join(__dirname, '../../superadmin/superadmin-config.json')
const authPath = path.join(__dirname, '../../superadmin/whatsapp-auth')

// Garantir que o diretório de autenticação existe
if (!fs.existsSync(authPath)) {
  fs.mkdirSync(authPath, { recursive: true })
}

let superAdminSocket = null
let globalIo = null

// Inicializar socket global
router.init = (io) => {
  globalIo = io
  startSuperAdminWhatsApp()
}

// Exportar socket para uso global
router.getSocket = () => superAdminSocket

// Expor socket globalmente para outras rotas usarem
router.exposeSocket = () => {
  global.superAdminSocket = superAdminSocket
  console.log('🌐 Super Admin socket exposto globalmente')
}

// Função para iniciar o WhatsApp do Super Admin
async function startSuperAdminWhatsApp() {
  try {
    console.log('🚀 Iniciando WhatsApp Super Admin...')

    const { state, saveCreds } = await useMultiFileAuthState(authPath)

    // Fetch latest version
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`📦 Versão do Baileys: ${version.join('.')} (latest: ${isLatest})`)

    // Cria logger silencioso
    const logger = pino({ level: 'silent' })

    // CONFIGURAÇÃO DO BAILEYS 7.0.0
    superAdminSocket = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      browser: Browsers.ubuntu('KRYPTON Super Admin'),
      printQRInTerminal: false,
      syncFullHistory: true,
      markOnlineOnConnect: false
    })

    // PROCESSAMENTO DE EVENTOS (Baileys 7.0.0)
    superAdminSocket.ev.process(async (events) => {

      // CONNECTION UPDATE
      if (events['connection.update']) {
        const update = events['connection.update']
        const { connection, lastDisconnect, qr } = update

        console.log('📡 Super Admin connection update:', { connection, hasQR: !!qr })

        if (qr) {
          console.log('📱 QR Code gerado para Super Admin')

          // Converter QR para data URL para mostrar no frontend
          let qrDataUrl
          try {
            qrDataUrl = await QRCodeData.toDataURL(qr)
            console.log('📱 QR Code convertido para data URL')
            updateConfig({ qr: qrDataUrl, connected: false })
          } catch (err) {
            console.error('❌ Erro ao converter QR para data URL:', err.message)
            qrDataUrl = qr
            updateConfig({ qr: qr, connected: false })
          }

          if (globalIo) {
            globalIo.emit('superadmin-connection-update', {
              qr: qrDataUrl,
              connected: false,
              phoneNumber: ''
            })
          }
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
            : true

          console.log('📡 Super Admin connection closed. Reconectar:', shouldReconnect)

          if (shouldReconnect) {
            console.log('🔄 Reconectando Super Admin em 5 segundos...')
            setTimeout(() => startSuperAdminWhatsApp(), 5000)
          } else {
            console.log('📡 Super Admin desconectado. Sessão foi deslogada.')
            // Limpar sessão se foi deslogado
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, { recursive: true, force: true })
            }
            updateConfig({ connected: false, qr: null, phoneNumber: '' })

            // Limpar socket global
            global.superAdminSocket = null
            console.log('🌐 Super Admin socket removido globalmente (desconectado)')

            if (globalIo) {
              globalIo.emit('superadmin-connection-update', {
                qr: null,
                connected: false,
                phoneNumber: ''
              })
            }
          }
        } else if (connection === 'open') {
          console.log('✅ Super Admin WhatsApp conectado!')
          const user = superAdminSocket.user
          updateConfig({
            connected: true,
            qr: null,
            phoneNumber: user?.id || ''
          })

          // Expor socket globalmente quando conectado
          global.superAdminSocket = superAdminSocket
          console.log('🌐 Super Admin socket exposto globalmente (conectado)')

          if (globalIo) {
            globalIo.emit('superadmin-connection-update', {
              qr: null,
              connected: true,
              phoneNumber: user?.id || ''
            })
          }
        }
      }

      // CREDS UPDATE
      if (events['creds.update']) {
        await saveCreds()
        console.log('💾 Credenciais salvas para Super Admin')
      }

      // MESSAGES UPSERT
      if (events['messages.upsert']) {
        const upsert = events['messages.upsert']

        if (upsert.type === 'notify') {
          for (const msg of upsert.messages) {
            if (!msg.key.fromMe) {
              console.log('📨 Mensagem recebida no Super Admin:', msg.message?.conversation || msg.message?.extendedTextMessage?.text)

              // Enviar mensagem automática
              const config = loadConfig()
              const autoMessage = config.whatsapp?.autoMessage || 'Olá, somos o Super Admin'

              try {
                await superAdminSocket.sendMessage(msg.key.remoteJid, {
                  text: autoMessage
                })
                console.log('✅ Mensagem automática enviada para:', msg.key.remoteJid)
              } catch (err) {
                console.log('Erro ao enviar mensagem automática:', err)
              }
            }
          }
        }
      }
    })

  } catch (err) {
    console.log('Erro ao iniciar Super Admin WhatsApp:', err)
  }
}

// Função para carregar configuração
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8')
      return JSON.parse(data)
    }
    return { whatsapp: { connected: false, phoneNumber: '', qr: null, autoMessage: 'Olá, somos o Super Admin' } }
  } catch (err) {
    console.log('Erro ao carregar config:', err)
    return { whatsapp: { connected: false, phoneNumber: '', qr: null, autoMessage: 'Olá, somos o Super Admin' } }
  }
}

// Função para atualizar configuração
function updateConfig(updates) {
  try {
    const config = loadConfig()
    const updated = {
      ...config,
      whatsapp: {
        ...config.whatsapp,
        ...updates
      }
    }
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2))
  } catch (err) {
    console.log('Erro ao atualizar config:', err)
  }
}

// Rota para desconectar
router.post('/disconnect', (req, res) => {
  try {
    if (superAdminSocket) {
      superAdminSocket.ev.removeAllListeners()
      superAdminSocket.ws.close()
      superAdminSocket = null
    }

    // Limpar sessão
    fs.rmSync(authPath, { recursive: true, force: true })

    updateConfig({ connected: false, qr: null, phoneNumber: '' })

    if (globalIo) {
      globalIo.emit('superadmin-connection-update', {
        qr: null,
        connected: false,
        phoneNumber: ''
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.log('Erro ao desconectar:', err)
    res.status(500).json({ error: err.message })
  }
})

// Rota para reiniciar conexão
router.post('/restart', (req, res) => {
  try {
    // Limpar sessão
    fs.rmSync(authPath, { recursive: true, force: true })

    updateConfig({ connected: false, qr: null, phoneNumber: '' })

    // Reiniciar
    startSuperAdminWhatsApp()

    res.json({ success: true })
  } catch (err) {
    console.log('Erro ao reiniciar:', err)
    res.status(500).json({ error: err.message })
  }
})

// Rota para atualizar mensagem automática
router.post('/auto-message', (req, res) => {
  try {
    const { autoMessage } = req.body
    updateConfig({ autoMessage })
    res.json({ success: true })
  } catch (err) {
    console.log('Erro ao atualizar mensagem:', err)
    res.status(500).json({ error: err.message })
  }
})

// Rota para obter mensagem automática
router.get('/auto-message', (req, res) => {
  try {
    const config = loadConfig()
    res.json({ message: config.whatsapp?.autoMessage || 'Olá, somos o Super Admin' })
  } catch (err) {
    console.log('Erro ao carregar mensagem:', err)
    res.status(500).json({ error: err.message })
  }
})

// Rota PUT para atualizar mensagem automática (usada pelo frontend)
router.put('/auto-message', (req, res) => {
  try {
    const { message } = req.body
    updateConfig({ autoMessage: message })
    res.json({ success: true })
  } catch (err) {
    console.log('Erro ao atualizar mensagem:', err)
    res.status(500).json({ error: err.message })
  }
})

// Rota para obter status
router.get('/status', (req, res) => {
  const config = loadConfig()
  res.json(config.whatsapp)
})

// Rota para enviar mensagem de teste
router.post('/send-test', async (req, res) => {
  try {
    const { phone } = req.body

    // Validar se o socket está conectado
    if (!superAdminSocket) {
      return res.status(400).json({ success: false, error: 'Super Admin WhatsApp não está conectado' })
    }

    const config = loadConfig()
    if (!config.whatsapp?.connected) {
      return res.status(400).json({ success: false, error: 'Super Admin WhatsApp não está conectado' })
    }

    // Validar número (deve ter entre 12 e 14 dígitos: 55 + DDD + número)
    if (!phone || !/^\d{12,14}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Número de telefone inválido. Use o formato: 559191873356' })
    }

    // Normalizar número para formato JID (jID = número@s.whatsapp.net)
    const jid = `${phone}@s.whatsapp.net`
    console.log('📱 Enviando mensagem de teste para:', jid)

    // Enviar mensagem de teste
    const testMessage = '🧪 *Mensagem de Teste - KRYPTON*\n\nEsta é uma mensagem de teste do Super Admin WhatsApp.\nSe você recebeu esta mensagem, a conexão está funcionando corretamente! ✅'

    await superAdminSocket.sendMessage(jid, {
      text: testMessage
    })

    console.log('✅ Mensagem de teste enviada com sucesso para:', jid)
    res.json({ success: true, message: 'Mensagem de teste enviada com sucesso' })
  } catch (err) {
    console.log('❌ Erro ao enviar mensagem de teste:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
