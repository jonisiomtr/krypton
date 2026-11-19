const fs = require('fs')
const path = require('path')
const NotificationManager = require('../../managers/NotificationManager')
const Database = require('../../database/Database')

module.exports = {

  name: 'catalog',

  flow: 'catalog',

  priority: 2,

  menu: {

    label: 'Catálogo'

  },

  events: {

    async onMessage(ctx) {

      const body = (ctx.body || '').toLowerCase()

      // ====================================
      // IGNORA DELIVERY
      // ====================================
      if (
        body.startsWith('comprar')
      ) {

        return true

      }

      const productsPath =
      path.join(

        __dirname,

        `../../tenants/${ctx.client.id}/products.json`

      )

      // SEM PRODUTOS
      // SEM ARQUIVO DE PRODUTOS
if (
  !fs.existsSync(productsPath)
) {

  await ctx.reply(
`🛍️ Esta empresa ainda não cadastrou produtos.`
  )

  ctx.setSession({

    flow: 'assistant',
    step: 'start'

  })

  return false
}

      const products =
      JSON.parse(
        fs.readFileSync(productsPath)
      )

      // SEM PRODUTOS CADASTRADOS
if (
  !products.length
) {

  await ctx.reply(
`🛍️ Esta empresa ainda não cadastrou produtos.`
  )

  ctx.setSession({

    flow: 'assistant',
    step: 'start'

  })

  return false
}

      // NORMALIZAR TEXTO
      const normalize =
      text =>

        text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      // SOMENTE ATIVOS
      const activeProducts =
      products.filter(
        product =>
          product.active !== false
      )

      // MENU
      async function sendMenu() {

        await ctx.reply(
`🛍️ CATÁLOGO

1 - Ver produtos
2 - Pesquisar produto
3 - Ver meus pedidos

0 - Voltar`
        )

      }

      // INICIO
      if (
        ctx.session.step === 'start'
      ) {

        await sendMenu()

        ctx.setSession({

          step: 'menu'

        })

        return false
      }

      // MENU
      if (
        ctx.session.step === 'menu'
      ) {

        if (
          ctx.body === '0'
        ) {

          ctx.setSession({

            flow: 'assistant',

            step: 'start'

          })

          await ctx.reply(
            '🔙 Voltando ao menu inicial...'
          )

          return false
        }

        // PRODUTOS
        if (
          ctx.body === '1'
        ) {

          if (
            activeProducts.length === 0
          ) {

            await ctx.reply(
              'Nenhum produto disponível.'
            )

            return false
          }

          let text =
`🛍️ PRODUTOS

`

          activeProducts.forEach(
            product => {

              text +=
`${product.id} - ${product.name}

💰 R$ ${product.price}

`

            }
          )

          text +=
`Digite o número do produto.

0 - Voltar`

          await ctx.reply(text)

          ctx.setSession({

            step: 'details',

            products:
            activeProducts

          })

          return false
        }

        // PESQUISAR
        if (
          ctx.body === '2'
        ) {

          await ctx.reply(
`🔎 Digite o nome do produto.

Exemplo:
Açaí`
          )

          ctx.setSession({

            step: 'search'

          })

          return false
        }

        // VER PEDIDOS
        if (
          ctx.body === '3'
        ) {

          const customerPhone = ctx.sender.replace('@s.whatsapp.net', '')
          const orders = Database.all(ctx.client.id, 'orders')
          
          // Filtrar pedidos deste cliente
          const customerOrders = orders.filter(order => 
            order.customerPhone === customerPhone || 
            (order.number && order.number === customerPhone)
          )

          if (customerOrders.length === 0) {
            await ctx.reply(
`📋 MEUS PEDIDOS

Você ainda não fez nenhum pedido.

0 - Voltar`
            )
            ctx.setSession({ step: 'orders_empty' })
            return false
          }

          let text = `📋 MEUS PEDIDOS\n\n`
          
          customerOrders.forEach((order, index) => {
            const statusEmoji = {
              'pending': '⏳',
              'accepted': '✅',
              'on_the_way': '🚚',
              'completed': '📦',
              'cancelled': '❌'
            }[order.status] || '⏳'

            text += `${index + 1} - Pedido #${String(order.id).slice(-6)}
${statusEmoji} Status: ${order.status}
💰 R$ ${order.total?.toFixed(2) || '0.00'}
📅 ${new Date(order.createdAt).toLocaleDateString('pt-BR')}\n\n`
          })

          text += `Digite o número do pedido para ver detalhes.
0 - Voltar`

          await ctx.reply(text)
          ctx.setSession({ 
            step: 'orders_list',
            orders: customerOrders
          })
          return false
        }

        await ctx.reply(
`❌ Opção inválida.

Escolha uma opção válida.`
        )

        await sendMenu()

        return false
      }

      // PESQUISA
      if (
        ctx.session.step === 'search'
      ) {

        const search =
        normalize(
          ctx.body.trim()
        )

        const foundProducts =
        activeProducts.filter(
          product =>

            normalize(
              product.name
            ).includes(search)
        )

        if (
          foundProducts.length === 0
        ) {

          await ctx.reply(
`❌ Nenhum produto encontrado.

1 - Tentar novamente
2 - Ver todos os produtos
0 - Voltar`
          )

          ctx.setSession({

            step: 'search_not_found'

          })

          return false
        }

        let text =
`🔎 RESULTADOS

`

        foundProducts.forEach(
          product => {

            text +=
`${product.id} - ${product.name}

💰 R$ ${product.price}

`

          }
        )

        text +=
`Digite o número do produto.

0 - Voltar`

        await ctx.reply(text)

        ctx.setSession({

          step: 'details',

          products:
          foundProducts

        })

        return false
      }

      // SEARCH NOT FOUND
      if (
        ctx.session.step ===
        'search_not_found'
      ) {

        if (
          ctx.body === '1'
        ) {

          ctx.setSession({

            step: 'search'

          })

          await ctx.reply(
            '🔎 Digite o nome do produto.'
          )

          return false
        }

        if (
          ctx.body === '2'
        ) {

          let text =
`🛍️ PRODUTOS

`

          activeProducts.forEach(
            product => {

              text +=
`${product.id} - ${product.name}

💰 R$ ${product.price}

`

            }
          )

          text +=
`Digite o número do produto.

0 - Voltar`

          await ctx.reply(text)

          ctx.setSession({

            step: 'details',

            products:
            activeProducts

          })

          return false
        }

        if (
          ctx.body === '0'
        ) {

          ctx.setSession({

            step: 'menu'

          })

          await sendMenu()

          return false
        }

        return false
      }

      // ORDERS EMPTY
      if (ctx.session.step === 'orders_empty') {
        if (ctx.body === '0') {
          await sendMenu()
          ctx.setSession({ step: 'menu' })
          return false
        }
        await ctx.reply('❌ Opção inválida.')
        return false
      }

      // ORDERS LIST
      if (ctx.session.step === 'orders_list') {
        if (ctx.body === '0') {
          await sendMenu()
          ctx.setSession({ step: 'menu' })
          return false
        }

        const orderIndex = parseInt(ctx.body) - 1
        const orders = ctx.session.orders || []

        if (isNaN(orderIndex) || orderIndex < 0 || orderIndex >= orders.length) {
          await ctx.reply('❌ Pedido inválido. Digite um número da lista.')
          return false
        }

        const order = orders[orderIndex]
        const statusEmoji = {
          'pending': '⏳',
          'accepted': '✅',
          'on_the_way': '🚚',
          'completed': '📦',
          'cancelled': '❌'
        }[order.status] || '⏳'

        let details = `📋 DETALHES DO PEDIDO

🆔 Pedido #${String(order.id).slice(-6)}
${statusEmoji} Status: ${order.status}
📅 Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')} às ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
💰 Total: R$ ${order.total?.toFixed(2) || '0.00'}
📦 Tipo: ${order.orderType === 'delivery' ? 'Entrega' : 'Retirada'}
💳 Pagamento: ${order.paymentMethod === 'pix' ? 'Pix' : 'Dinheiro'}

📝 ITENS:\n`

        const items = order.items || order.cart || []
        items.forEach(item => {
          const name = item.name || item.productName
          const price = item.unitPrice || item.price
          const qty = item.quantity || 1
          details += `- ${name} x${qty} - R$ ${price?.toFixed(2) || '0.00'}\n`
        })

        if (order.address) {
          details += `\n📍 Endereço: ${order.address}`
        }

        details += `\n\n0 - Voltar`

        await ctx.reply(details)
        ctx.setSession({ step: 'orders_details' })
        return false
      }

      // ORDERS DETAILS
      if (ctx.session.step === 'orders_details') {
        if (ctx.body === '0') {
          const orders = Database.all(ctx.client.id, 'orders')
          const customerPhone = ctx.sender.replace('@s.whatsapp.net', '')
          const customerOrders = orders.filter(order => 
            order.customerPhone === customerPhone || 
            (order.number && order.number === customerPhone)
          )

          let text = `📋 MEUS PEDIDOS\n\n`
          
          customerOrders.forEach((order, index) => {
            const statusEmoji = {
              'pending': '⏳',
              'accepted': '✅',
              'on_the_way': '🚚',
              'completed': '📦',
              'cancelled': '❌'
            }[order.status] || '⏳'

            text += `${index + 1} - Pedido #${String(order.id).slice(-6)}
${statusEmoji} Status: ${order.status}
💰 R$ ${order.total?.toFixed(2) || '0.00'}
📅 ${new Date(order.createdAt).toLocaleDateString('pt-BR')}\n\n`
          })

          text += `Digite o número do pedido para ver detalhes.
0 - Voltar`

          await ctx.reply(text)
          ctx.setSession({ 
            step: 'orders_list',
            orders: customerOrders
          })
          return false
        }
        await ctx.reply('❌ Opção inválida.')
        return false
      }

      // =========================
// COMPRAR PRODUTO - TIPO DE ENTREGA
// =========================
if (
  ctx.session.step ===
  'buy_product'
) {

  // VOLTAR
  if (
    ctx.body === '0'
  ) {

    ctx.setSession({

      step: 'menu'

    })

    await sendMenu()

    return false
  }

  // COMPRAR - PERGUNTAR TIPO DE ENTREGA
  if (
    ctx.body === '1'
  ) {

    await ctx.reply(
`📦 TIPO DE ENTREGA

1 - 🚚 Delivery (entrega em casa)
2 - 🏪 Retirada no local

0 - Voltar`
    )

    ctx.setSession({
      step: 'order_type',
      selectedProduct: ctx.session.selectedProduct
    })

    return false
  }

  await ctx.reply(
`❌ Opção inválida.

1 - Comprar
0 - Voltar`
  )

  return false
}

      // =========================
// ORDER_TYPE - ESCOLHER DELIVERY OU PICKUP
// =========================
if (
  ctx.session.step === 'order_type'
) {

  if (
    ctx.body === '0'
  ) {

    ctx.setSession({ step: 'details' })

    // Reenviar detalhes do produto
    const product = ctx.session.selectedProduct
    let text =
`🛍️ ${product.name}

💰 Preço:
R$ ${product.price}

📦 Estoque:
${product.stock ?? 0}

📝 Descrição:
${product.description || 'Não informado'}

🛒 O que deseja fazer?

1 - Comprar
0 - Voltar`

    if (product.image) {
      await ctx.sock.sendMessage(ctx.from, {
        image: { url: product.image },
        caption: text
      })
    } else {
      await ctx.reply(text)
    }

    return false
  }

  if (
    ctx.body === '1'
  ) {

    ctx.setSession({
      step: 'customer_name',
      orderType: 'delivery',
      selectedProduct: ctx.session.selectedProduct
    })

    await ctx.reply('👤 Digite seu nome completo:')

    return false
  }

  if (
    ctx.body === '2'
  ) {

    ctx.setSession({
      step: 'customer_name',
      orderType: 'pickup',
      selectedProduct: ctx.session.selectedProduct
    })

    await ctx.reply('👤 Digite seu nome completo:')

    return false
  }

  await ctx.reply('❌ Opção inválida.\n1 - Delivery\n2 - Retirada\n0 - Voltar')

  return false
}

      // =========================
// CUSTOMER_NAME - VALIDAR NOME
// =========================
if (
  ctx.session.step === 'customer_name'
) {

  const name = ctx.body.trim()

  if (
    name.length < 3
  ) {

    await ctx.reply('❌ Nome muito curto. Digite seu nome completo:')
    return false
  }

  ctx.setSession({
    step: 'customer_cpf',
    customerName: name
  })

  await ctx.reply('📄 Digite seu CPF (opcional, digite 0 para pular):')

  return false
}

      // =========================
// CUSTOMER_CPF - VALIDAR CPF
// =========================
if (
  ctx.session.step === 'customer_cpf'
) {

  const cpf = ctx.body.replace(/\D/g, '')

  if (
    cpf !== '0' && cpf.length !== 11
  ) {

    await ctx.reply('❌ CPF inválido. Digite 11 dígitos ou 0 para pular:')
    return false
  }

  const cpfFinal = cpf === '0' ? '' : cpf

  ctx.setSession({
    customerCpf: cpfFinal
  })

  // Se pickup, vai direto para pagamento
  if (
    ctx.session.orderType === 'pickup'
  ) {

    ctx.setSession({
      step: 'payment',
      cart: [ctx.session.selectedProduct]
    })

    await ctx.reply(
`💳 FORMA DE PAGAMENTO

1 - Dinheiro
2 - Pix`
    )

    return false
  }

  // Se delivery, pede endereço
  ctx.setSession({
    step: 'address',
    cart: [ctx.session.selectedProduct]
  })

  await ctx.reply(
`📍 ENDEREÇO DE ENTREGA

Digite seu endereço completo:
Rua, número, bairro, cidade

Ou envie sua localização atual.`
  )

  return false
}

      // ENDEREÇO (SÓ PARA DELIVERY)
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

        await ctx.reply(
`💳 FORMA DE PAGAMENTO

1 - Dinheiro
2 - Pix`
        )

        return false
      }

      // PAGAMENTO (IMPLEMENTADO NO CATALOG)
      if (ctx.session.step === 'payment') {

        // DINHEIRO
        if (body === '1') {

          ctx.setSession({
            step: 'cash_change'
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

          // Identificar se é pedido de teste
          const isTest = ctx.sender?.startsWith('test_user_')
          const testPhone = isTest ? '5511999999999' : ctx.sender.replace('@s.whatsapp.net', '')

          // Salva pedido direto com PIX (formato website)
          const order = Database.create(ctx.client.id, 'orders', {
            source: 'whatsapp',
            isTest: isTest,
            customerName: ctx.session.customerName || '',
            customerPhone: testPhone,
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

          // Só envia notificação se não for teste
          if (!isTest) {
            await NotificationManager.newOrder(ctx, order)
          }

          await ctx.reply(`✅ PEDIDO REALIZADO

🆔 #${order.id}
💰 Total: R$ ${total.toFixed(2)}
💳 Pagamento: Pix
${isTest ? '🧪 (Pedido de Teste)' : ''}

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

        // Se não for 1 ou 2, mostra opções
        await ctx.reply(`💳 FORMA DE PAGAMENTO

1 - Dinheiro
2 - Pix`)

        return false
      }

      // DINHEIRO - TROCO
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

          // Identificar se é pedido de teste
          const isTest = ctx.sender?.startsWith('test_user_')
          const testPhone = isTest ? '5511999999999' : ctx.sender.replace('@s.whatsapp.net', '')

          // Salva pedido usando Database (formato website)
          const order = Database.create(ctx.client.id, 'orders', {
            source: 'whatsapp',
            isTest: isTest,
            customerName: ctx.session.customerName || '',
            customerPhone: testPhone,
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

          // Só envia notificação se não for teste
          if (!isTest) {
            await NotificationManager.newOrder(ctx, order)
          }

          await ctx.reply(`✅ PEDIDO REALIZADO

🆔 #${order.id}
💰 Total: R$ ${total.toFixed(2)}
💳 Pagamento: Dinheiro
${isTest ? '🧪 (Pedido de Teste)' : ''}

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

        await ctx.reply('❌ Opção inválida.')
        return false
      }

      // CALCULAR TROCO
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

        // Identificar se é pedido de teste
        const isTest = ctx.sender?.startsWith('test_user_')
        const testPhone = isTest ? '5511999999999' : ctx.sender.replace('@s.whatsapp.net', '')

        // Salva pedido usando Database (formato website)
        const order = Database.create(ctx.client.id, 'orders', {
          source: 'whatsapp',
          isTest: isTest,
          customerName: ctx.session.customerName || '',
          customerPhone: testPhone,
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

        // Só envia notificação se não for teste
        if (!isTest) {
          await NotificationManager.newOrder(ctx, order)
        }

        await ctx.reply(`✅ PEDIDO REALIZADO

🆔 #${order.id}
💰 Pago: R$ ${paid.toFixed(2)}
🔁 Troco: R$ ${change.toFixed(2)}
${isTest ? '🧪 (Pedido de Teste)' : ''}`)

        ctx.setSession({
          flow: 'assistant',
          step: 'start',
          cart: null,
          address: null,
          orderId: null
        })

        return false
      }

      // DETAILS
      if (
        ctx.session.step === 'details'
      ) {

        if (
          ctx.body === '0'
        ) {

          ctx.setSession({

            step: 'menu'

          })

          await sendMenu()

          return false
        }

        const product =
        ctx.session.products.find(
          p =>
            Number(p.id) === Number(ctx.body)
        )

        if (!product) {

          await ctx.reply(
`❌ Produto inválido.

Digite um número válido.`
          )

          return false
        }

        let text =
`🛍️ ${product.name}

💰 Preço:
R$ ${product.price}

📦 Estoque:
${product.stock ?? 0}

📝 Descrição:
${product.description || 'Não informado'}
`

        const hasDelivery =
ctx.client.modules.some(
  module =>
    module.name === 'delivery'
)

        if (hasDelivery) {

          text +=
`🛒 O que deseja fazer?

1 - Comprar
0 - Voltar`

        } else {

          text +=
`📞 Esta empresa utiliza apenas catálogo.

Consulte a empresa para realizar compras.`

        }

        if (product.image) {

  await ctx.sock.sendMessage(ctx.from, {
    image: { url: product.image },
    caption: text
  })

} else {

  await ctx.reply(text)
}

// TEM DELIVERY
if (hasDelivery) {

  ctx.setSession({

    step: 'buy_product',

    selectedProduct: product

  })

} else {

  // FINALIZA CATÁLOGO
  ctx.setSession({

    flow: 'assistant',

    step: 'start'

  })

}

return false
      }


    }

  }

}
