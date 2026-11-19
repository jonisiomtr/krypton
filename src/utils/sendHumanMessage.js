const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function getTypingDelay(text) {
  const base = 800
  const perChar = 25
  const jitter = Math.random() * 1200

  return Math.min(base + text.length * perChar + jitter, 6000)
}

/**
 * Envia mensagem com simulação humana (digitando + delay inteligente)
 */
async function sendHumanMessage(sock, jid, text, options = {}) {
  try {
    const {
      typing = true,
      pauseAfterTyping = true
    } = options

    // 1. começa "digitando"
    if (typing) {
      await sock.sendPresenceUpdate('composing', jid)
    }

    // 2. delay humano baseado no texto
    const delay = getTypingDelay(text)
    await sleep(delay)

    // 3. pausa digitando
    if (pauseAfterTyping) {
      await sock.sendPresenceUpdate('paused', jid)
    }

    // 4. pequeno delay final antes de enviar
    await sleep(200 + Math.random() * 400)

    // 5. envia mensagem final
    return await sock.sendMessage(jid, { text })

  } catch (err) {
    console.log('sendHumanMessage error:', err)

    // fallback direto
    return await sock.sendMessage(jid, { text })
  }
}

module.exports = sendHumanMessage