const fs = require('fs')
const path = require('path')

const ClientManager = require('../core/ClientManager')
const FlowManager = require('../core/FlowManager')
const Context = require('../core/Context')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min = 1200, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = async ({ clientId, sock, message }) => {
  try {

    const client = ClientManager.get(clientId)
    if (!client) return

    const ctx = new Context({ sock, message, client })

    // IGNORA PRÓPRIO BOT
    if (message.key.fromMe) return

    // IGNORA VAZIO
    if (
      !ctx.body &&
      !ctx.location &&
      !ctx.message.message?.imageMessage &&
      !ctx.message.message?.documentMessage
    ) {
      return
    }

    const jid = message.key.remoteJid

    // ========================
    // VERIFICA MODO MANUAL
    // ========================
    const SessionManager = require('../core/SessionManager')
    if (SessionManager.isManualMode(clientId, jid)) {
      console.log(`[MANUAL MODE] Bot paused for ${jid} - waiting for human agent`)
      return // Bot não responde, humano deve atender
    }

    // 👇 TIPO HUMANO: começa "digitando"
    await sock.sendPresenceUpdate('composing', jid)

    // espera antes de pensar (humanização)
    await sleep(randomDelay(1200, 2500))

    const modules = client.modules.sort(
      (a, b) => (a.priority || 0) - (b.priority || 0)
    )

    let responded = false

    for (const module of modules) {

      if (!FlowManager.canExecute(module, ctx)) continue

      const result = await module.events?.onMessage?.(ctx)

      if (ctx.goto) {
        const next = modules.find(m => m.name === ctx.goto)

        if (next?.events?.onMessage) {
          ctx.goto = null
          await next.events.onMessage(ctx)
        }

        break
      }

      if (result === false) break

      responded = true
    }

    // 👇 para "digitando"
    await sock.sendPresenceUpdate('paused', jid)

    // micro delay antes de envio final (realismo)
    if (responded) {
      await sleep(randomDelay(800, 1500))
    }

  } catch (err) {
    console.log('Erro no messages handler:', err)
  }
}