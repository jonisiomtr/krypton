const SessionManager = require('./SessionManager')
const sendHumanMessage = require('../utils/sendHumanMessage')

class Context {

  constructor({ sock, message, client }) {

    const rawSender =
      message.key.senderPn ||
      message.key.participantPn ||
      message.key.participant ||
      message.key.remoteJid

    this.sender = rawSender
      ?.replace('@s.whatsapp.net', '')
      ?.replace('@lid', '')
      ?.replace('@g.us', '')

    console.log('NOVO SENDER:', this.sender)

    this.pushname = message.pushName

    this.sock = sock
    this.message = message
    this.client = client

    this.session = SessionManager.getSession(
      client.id,
      this.sender
    )

    this.from =
      message.key.remoteJidAlt ||
      message.key.remoteJid

    this.body = this.getMessageBody()
    this.location = this.getLocation()
  }

  gotoFlow(flow) {
    this.setSession({
      flow,
      step: 'start'
    })

    this.goto = flow
  }

  setSession(data) {
    this.session = SessionManager.updateSession(
      this.client.id,
      this.sender,
      data
    )

    return this.session
  }

  getMessageBody() {
    const msg = this.message.message

    return (
      msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.videoMessage?.caption ||
      msg?.buttonsResponseMessage?.selectedButtonId ||
      msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      ''
    )
  }

  getLocation() {
    const msg = this.message.message

    if (msg?.locationMessage) {
      return {
        latitude: msg.locationMessage.degreesLatitude,
        longitude: msg.locationMessage.degreesLongitude
      }
    }

    return null
  }

  // ✅ AQUI É O PULO DO GATO (RESPOSTA HUMANA)
  async reply(text, options = {}) {
    return sendHumanMessage(
      this.sock,
      this.from,
      text,
      options
    )
  }
}

module.exports = Context