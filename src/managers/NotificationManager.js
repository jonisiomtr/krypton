class NotificationManager {

  static async send(sock, to, text) {
    if (!to) return
    await sock.sendMessage(to, { text })
  }

  static async pixReceipt(ctx, session) {
    const admin = ctx.client.config.adminNumber
    if (!admin) return

    const text = `
🧾 COMPROVANTE PIX

🆔 Pedido #${session.orderId}
Cliente: ${session.customerNumber}

⚠️ Aguardando confirmação do pagamento.

🔎 Acesse o painel para validar o comprovante.
`

    try {
      //await ctx.sock.sendMessage(admin, { text })
      await ctx.sock.sendMessage(admin, {
        forward: ctx.message
      })

    } catch (err) {
      console.log('PIX ERROR:', err)
    }
  }

  static formatMoney(v) {
    return Number(v).toFixed(2).replace('.', ',')
  }

  static async newOrder(ctx, order) {
    const admin = ctx.client.config.adminNumber
    if (!admin) return

    let total = order.total || 0
    let itens = ''

    // Usar items (formato unificado website/whatsapp)
    const cartItems = order.items || order.cart || []
    for (const item of cartItems) {
      const unitPrice = item.unitPrice || item.price || 0
      const quantity = item.quantity || 1
      itens += `${item.name} x${quantity}\n💰 R$ ${this.formatMoney(unitPrice * quantity)}\n\n`
    }

    let endereco = 'Não informado'

    // Se for string (formato unificado)
    if (typeof order.address === 'string') {
      endereco = order.address
    }
    // Se for objeto com type (formato antigo)
    else if (order.address?.type === 'text') {
      endereco = order.address.value
    }

    const phone = order.customerPhone || order.number || 'Não informado'

    const text = `
🛒 NOVO PEDIDO

🆔 #${order.id}
Cliente: ${order.customerName || 'Não informado'}
📱 ${phone}

🛍️ ITENS:
${itens}

📍 Endereço:
${endereco}

💳 Pagamento:
${order.paymentMethod || order.payment || 'Não informado'}

💵 TOTAL:
R$ ${this.formatMoney(total)}

━━━━━━━━━━━━━━━━━━━━━━
`

    // Se for location (formato antigo)
    if (order.address?.type === 'location') {
      await ctx.sock.sendMessage(`${admin}@s.whatsapp.net`, {
        location: {
          degreesLatitude: order.address.latitude,
          degreesLongitude: order.address.longitude
        }
      })
    }

    await this.send(ctx.sock, `${admin}@s.whatsapp.net`, text)
  }
}

module.exports = NotificationManager
