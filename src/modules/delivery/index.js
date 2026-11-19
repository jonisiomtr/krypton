const fs = require('fs')
const path = require('path')
const NotificationManager = require('../../managers/NotificationManager')
const Database = require('../../database/Database')

module.exports = {
  name: 'delivery',
  global: true,
  flow: 'delivery',
  priority: 0,

  events: {
    async onMessage(ctx) {

      const body = ctx.body || ''

      const productsPath = path.join(
        __dirname,
        `../../tenants/${ctx.client.id}/products.json`
      )

      const databasePath = path.join(
        __dirname,
        `../../tenants/${ctx.client.id}/database.json`
      )

      // =====================
      // CANCELAR (ADMIN OU CLIENTE)
      // =====================
      const cancelMatch = ctx.body?.match(/^\/cancelar\s+#?(\d+)$/i)

      if (cancelMatch) {

        let database = { orders: [] }

        if (fs.existsSync(databasePath)) {
          database = JSON.parse(fs.readFileSync(databasePath))
        }

        const orderId = Number(cancelMatch[1])

        const order = database.orders.find(o => String(o.id) === String(orderId))

        if (!order) {
          await ctx.reply(`❌ Pedido #${orderId} não encontrado.`)
          return false
        }

        const isAdmin = ctx.sender === ctx.client.config.adminNumber
        const isOwner = order.number === ctx.sender.replace('@s.whatsapp.net', '')

        if (!isAdmin && !isOwner) {
          await ctx.reply('❌ Você não pode cancelar este pedido.')
          return false
        }

        order.status = 'cancelled'

        fs.writeFileSync(databasePath, JSON.stringify(database, null, 2))

        await ctx.sock.sendMessage(`${order.number}@s.whatsapp.net`, {
          text: `❌ PEDIDO CANCELADO\n\n🆔 #${order.id}`
        })

        await ctx.reply(`❌ Pedido #${order.id} cancelado.`)

        return false
      }

      // =====================
      // ENTRADA DO FLUXO
      // =====================
      if (!body.startsWith('comprar') && ctx.session.flow !== 'delivery') {
        return true
      }

      if (!fs.existsSync(productsPath)) return false

      const products = JSON.parse(fs.readFileSync(productsPath))

      // =====================
      // ENTRADA DO FLUXO (START)
      // =====================
      if (ctx.session.step === 'start') {
        // Se veio do catálogo com cart, vai direto para pagamento e mostra opções
        if (ctx.session.cart && ctx.session.cart.length > 0) {
          ctx.setSession({
            step: 'payment'
          })
          await ctx.reply(`💳 FORMA DE PAGAMENTO

1 - Dinheiro
2 - Pix`)
          return false
        }
        return true
      }

      // =====================
      // COMPRA
      // =====================
      if (body.startsWith('comprar')) {

        const productId = Number(body.split(' ')[1])
        const product = products.find(p => p.id === productId)

        if (!product) {
          await ctx.reply('❌ Produto não encontrado.')
          return false
        }

        ctx.setSession({
          flow: 'delivery',
          step: 'address',
          cart: [product]
        })

        await ctx.reply(`📍 ENVIO

Envie seu endereço ou localização.`)

        return false
      }

      // =====================
      // ENDEREÇO
      // =====================
      if (ctx.session.step === 'address') {

        if (ctx.location) {
          ctx.setSession({
            address: {
              type: 'location',
              latitude: ctx.location.latitude,
              longitude: ctx.location.longitude
            },
            step: 'payment'
          })
        } else {
          ctx.setSession({
            address: {
              type: 'text',
              value: ctx.body
            },
            step: 'payment'
          })
        }

        await ctx.reply(`💳 PAGAMENTO

1 - Dinheiro
2 - Pix`)

        return false
      }

      // =====================
      // PAGAMENTO
      // =====================
      if (ctx.session.step === 'payment') {

        // Se body não for 1 ou 2, mostra opções
        if (body !== '1' && body !== '2') {
          await ctx.reply(`💳 FORMA DE PAGAMENTO

1 - Dinheiro
2 - Pix`)
          return false
        }

        // DINHEIRO
        if (body === '1') {

          ctx.setSession({
            flow: 'delivery',
            step: 'cash_change',
            cart: ctx.session.cart,
            customerName: ctx.session.customerName || '',
            customerCpf: ctx.session.customerCpf || '',
            orderType: ctx.session.orderType || 'delivery',
            address: ctx.session.address
          })

          await ctx.reply(`💵 DINHEIRO

Precisa de troco?

1 - Sim
2 - Não`)

          return false
        }

        // PIX
        if (body === '2') {

          // Calcula total do carrinho
          let total = 0
          for (const item of ctx.session.cart) {
            total += Number(item.price)
          }

          // Salva pedido direto com PIX (formato website)
          const order = Database.create(ctx.client.id, 'orders', {
            source: 'whatsapp',
            customerName: ctx.session.customerName || '',
            customerPhone: ctx.sender.replace('@s.whatsapp.net', ''),
            customerCpf: ctx.session.customerCpf || '',
            address: ctx.session.address?.type === 'text' ? ctx.session.address.value : '',
            orderType: ctx.session.orderType || 'delivery',
            paymentMethod: 'pix',
            needsChange: false,
            changeAmount: 0,
            items: ctx.session.cart.map(item => ({
              productId: item.id,
              name: item.name,
              image: item.image,
              unitPrice: item.price,
              quantity: 1,
              extras: [],
              observation: ''
            })),
            subtotal: total,
            deliveryFee: 0,
            discount: 0,
            total: total,
            observation: '',
            couponCode: null,
            couponType: null,
            couponValue: null,
            status: 'pending',
            rating: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })

          await NotificationManager.newOrder(ctx, order)

          await ctx.reply(`✅ PEDIDO REALIZADO

🆔 #${order.id}
💰 Total: R$ ${total.toFixed(2)}
💳 Pagamento: Pix

Seu pedido foi registrado com sucesso! ✅`)

          ctx.setSession({
            flow: 'assistant',
            step: 'start',
            cart: null,
            address: null,
            orderId: null
          })

          return false
        }

        return false
      }

      // =====================
      // DINHEIRO - TROCO
      // =====================
      if (ctx.session.step === 'cash_change') {

        if (body === '1') {
          ctx.setSession({
            step: 'cash_amount'
          })

          await ctx.reply('💰 Quanto você vai pagar?')
          return false
        }

        if (body === '2') {

          // Calcula total do carrinho
          let total = 0
          for (const item of ctx.session.cart) {
            total += Number(item.price)
          }

          // Salva pedido usando Database (formato website)
          const order = Database.create(ctx.client.id, 'orders', {
            source: 'whatsapp',
            customerName: ctx.session.customerName || '',
            customerPhone: ctx.sender.replace('@s.whatsapp.net', ''),
            customerCpf: ctx.session.customerCpf || '',
            address: ctx.session.address?.type === 'text' ? ctx.session.address.value : '',
            orderType: ctx.session.orderType || 'delivery',
            paymentMethod: 'cash',
            needsChange: false,
            changeAmount: 0,
            items: ctx.session.cart.map(item => ({
              productId: item.id,
              name: item.name,
              image: item.image,
              unitPrice: item.price,
              quantity: 1,
              extras: [],
              observation: ''
            })),
            subtotal: total,
            deliveryFee: 0,
            discount: 0,
            total: total,
            observation: '',
            couponCode: null,
            couponType: null,
            couponValue: null,
            status: 'pending',
            rating: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })

          await NotificationManager.newOrder(ctx, order)

          await ctx.reply(`✅ PEDIDO REALIZADO\n\n🆔 #${order.id}`)

          ctx.setSession({
            flow: 'assistant',
            step: 'start',
            cart: null,
            address: null,
            orderId: null
          })

          return false
        }

        await ctx.reply('❌ Opção inválida.')
        return false
      }

      // =====================
      // CALCULAR TROCO
      // =====================
      if (ctx.session.step === 'cash_amount') {

        const paid = Number(body.replace(',', '.'))

        if (isNaN(paid)) {
          await ctx.reply('❌ Valor inválido.')
          return false
        }

        let total = 0
        for (const item of ctx.session.cart) {
          total += Number(item.price)
        }

        const change = paid - total

        // Salva pedido usando Database (formato website)
        const order = Database.create(ctx.client.id, 'orders', {
          source: 'whatsapp',
          customerName: ctx.session.customerName || '',
          customerPhone: ctx.sender.replace('@s.whatsapp.net', ''),
          customerCpf: ctx.session.customerCpf || '',
          address: ctx.session.address?.type === 'text' ? ctx.session.address.value : '',
          orderType: ctx.session.orderType || 'delivery',
          paymentMethod: 'cash',
          needsChange: true,
          changeFor: paid,
          changeAmount: change,
          items: ctx.session.cart.map(item => ({
            productId: item.id,
            name: item.name,
            image: item.image,
            unitPrice: item.price,
            quantity: 1,
            extras: [],
            observation: ''
          })),
          subtotal: total,
          deliveryFee: 0,
          discount: 0,
          total: total,
          observation: '',
          couponCode: null,
          couponType: null,
          couponValue: null,
          status: 'pending',
          rating: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        await NotificationManager.newOrder(ctx, order)

        await ctx.reply(`✅ PEDIDO REALIZADO

🆔 #${order.id}
💰 Pago: R$ ${paid.toFixed(2)}
🔁 Troco: R$ ${change.toFixed(2)}`)

        ctx.setSession({
          flow: 'assistant',
          step: 'start',
          cart: null,
          address: null,
          orderId: null
        })

        return false
      }

      // =====================
      // COMPROVANTE PIX (REMOVIDO - PIX FINALIZA DIRETO)
      // =====================

      return true
    }
  }
}
