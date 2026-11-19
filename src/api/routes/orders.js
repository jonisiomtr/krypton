const express = require('express')
const router = express.Router()
const Database = require('../../database/Database')
const auth = require('../middlewares/auth')
const fs = require('fs')
const path = require('path')
const ConnectionManager = require('../../managers/ConnectionManager')

// =========================
// GERENCIAMENTO DE CUPONS
// =========================

// Caminho do arquivo de cupons
function getCouponsPath(companyId) {
  return path.join(__dirname, '../../tenants', companyId, 'localdata', 'coupons.json')
}

// Listar cupons da empresa
router.get('/coupons/:companyId', auth, (req, res) => {
  try {
    const { companyId } = req.params
    const couponsPath = getCouponsPath(companyId)

    if (!fs.existsSync(couponsPath)) {
      return res.json({ success: true, coupons: [] })
    }

    const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'))
    res.json({ success: true, coupons })
  } catch (error) {
    console.error('Erro ao listar cupons:', error)
    res.status(500).json({ error: 'Erro ao listar cupons' })
  }
})

// Criar cupom
router.post('/coupons/:companyId', auth, (req, res) => {
  try {
    const { companyId } = req.params
    const { code, type, value, minOrder, maxUses, expiresAt, description } = req.body

    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'Código, tipo e valor são obrigatórios' })
    }

    const couponsPath = getCouponsPath(companyId)

    let coupons = []
    if (fs.existsSync(couponsPath)) {
      coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'))
    }

    // Verificar se código já existe
    if (coupons.find(c => c.code === code)) {
      return res.status(400).json({ error: 'Código de cupom já existe' })
    }

    const coupon = {
      id: Date.now().toString(),
      code: code.toUpperCase(),
      type, // 'percentage', 'fixed', 'free_shipping'
      value: Number(value),
      minOrder: minOrder ? Number(minOrder) : 0,
      maxUses: maxUses ? Number(maxUses) : null,
      currentUses: 0,
      expiresAt: expiresAt || null,
      description: description || '',
      active: true,
      createdAt: new Date().toISOString()
    }

    coupons.push(coupon)
    fs.writeFileSync(couponsPath, JSON.stringify(coupons, null, 2))

    res.json({ success: true, coupon })
  } catch (error) {
    console.error('Erro ao criar cupom:', error)
    res.status(500).json({ error: 'Erro ao criar cupom' })
  }
})

// Remover cupom
router.delete('/coupons/:companyId/:couponId', auth, (req, res) => {
  try {
    const { companyId, couponId } = req.params
    const couponsPath = getCouponsPath(companyId)

    if (!fs.existsSync(couponsPath)) {
      return res.status(404).json({ error: 'Cupons não encontrados' })
    }

    const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'))
    const index = coupons.findIndex(c => c.id === couponId)

    if (index === -1) {
      return res.status(404).json({ error: 'Cupom não encontrado' })
    }

    coupons.splice(index, 1)
    fs.writeFileSync(couponsPath, JSON.stringify(coupons, null, 2))

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover cupom:', error)
    res.status(500).json({ error: 'Erro ao remover cupom' })
  }
})

// Validar cupom (público)
router.post('/coupons/:companyId/validate', (req, res) => {
  try {
    const { companyId } = req.params
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ success: false, error: 'Código não informado' })
    }

    const couponsPath = getCouponsPath(companyId)

    if (!fs.existsSync(couponsPath)) {
      return res.json({ success: false, error: 'Cupom inválido' })
    }

    const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'))
    const couponIndex = coupons.findIndex(c =>
      c.code === code.toUpperCase() &&
      c.active &&
      (!c.maxUses || c.currentUses < c.maxUses)
    )

    if (couponIndex === -1) {
      // Verificar se o cupom existe mas atingiu o limite
      const existingCoupon = coupons.find(c => c.code === code.toUpperCase())

      if (existingCoupon && existingCoupon.maxUses && existingCoupon.currentUses >= existingCoupon.maxUses) {
        return res.json({
          success: false,
          error: `Cupom esgotado! Limite de ${existingCoupon.maxUses} usos atingido.`
        })
      }

      // Listar cupons disponíveis para ajudar o usuário
      const availableCoupons = coupons
        .filter(c => c.active && (!c.maxUses || c.currentUses < c.maxUses))
        .map(c => c.code)
        .join(', ')

      return res.json({
        success: false,
        error: availableCoupons
          ? `Cupom inválido.`
          : 'Cupom inválido ou expirado'
      })
    }

    // Incrementar uso do cupom imediatamente ao resgatar
    coupons[couponIndex].currentUses = (coupons[couponIndex].currentUses || 0) + 1
    fs.writeFileSync(couponsPath, JSON.stringify(coupons, null, 2))
    console.log('Uso do cupom incrementado ao resgatar:', code, `Usos: ${coupons[couponIndex].currentUses}/${coupons[couponIndex].maxUses || '∞'}`)

    res.json({ success: true, coupon: coupons[couponIndex] })
  } catch (error) {
    console.error('Erro ao validar cupom:', error)
    res.status(500).json({ error: 'Erro ao validar cupom' })
  }
})

// =========================
// LISTAR PEDIDOS (PAINEL)
// =========================
router.get('/', auth, (req, res) => {
  let clientId

  // ADMIN
  if (req.user.type === 'admin') {
    clientId = req.query.clientId
  }
  // EMPRESA
  else {
    clientId = req.user.companyId
  }

  if (!clientId) {
    return res.status(400).json({
      error: 'clientId obrigatório'
    })
  }

  const orders = Database.all(clientId, 'orders')
  return res.json(orders)
})

// =========================
// CRIAR PEDIDO (SITE)
// =========================
router.post('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const orderData = req.body

    console.log('Criando pedido para companyId:', companyId)
    console.log('Dados do pedido:', orderData)

    // Validar dados obrigatórios
    if (!orderData.items || !orderData.items.length) {
      console.log('Erro: Pedido sem itens')
      return res.status(400).json({ error: 'Pedido deve ter pelo menos um item' })
    }

    if (!orderData.customerName) {
      console.log('Erro: Nome do cliente não informado')
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' })
    }

    // Criar pedido
    const order = Database.create(companyId, 'orders', {
      ...orderData,
      source: 'website',
      status: 'pending', // pending, accepted, on_the_way, completed, cancelled
      orderType: orderData.orderType || 'delivery',
      paymentMethod: orderData.paymentMethod || 'pix',
      needsChange: orderData.needsChange || false,
      changeAmount: orderData.changeAmount || 0,
      rating: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Validar cupom se foi aplicado (uso já foi incrementado na validação)
    if (orderData.couponCode) {
      try {
        const couponsPath = getCouponsPath(companyId)
        if (fs.existsSync(couponsPath)) {
          const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'))
          const coupon = coupons.find(c => c.code === orderData.couponCode.toUpperCase())

          if (!coupon) {
            return res.status(400).json({ error: 'Cupom não encontrado' })
          }

          // Validar se cupom ainda é válido
          if (!coupon.active) {
            return res.status(400).json({ error: 'Cupom não está mais ativo' })
          }

          if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ error: 'Cupom expirado' })
          }
        }
      } catch (couponError) {
        console.error('Erro ao validar cupom:', couponError)
        return res.status(500).json({ error: 'Erro ao processar cupom' })
      }
    }

    console.log('Pedido criado com sucesso:', order)

    // Enviar mensagem de confirmação via WhatsApp se a empresa tiver WhatsApp conectado
    try {
      const connection = ConnectionManager.get(companyId)
      console.log(`🔍 Verificando conexão WhatsApp para empresa: ${companyId}`)
      console.log(`🔍 Connection existe: ${!!connection}`)
      console.log(`🔍 Connection connected: ${connection?.connected}`)
      console.log(`🔍 Customer phone: ${orderData.customerPhone}`)

      if (connection && connection.connected && orderData.customerPhone) {
        const phone = orderData.customerPhone.replace(/\D/g, '')
        // Apenas adicionar código do país se não tiver
        const normalizedPhone = phone.startsWith('55') ? phone : '55' + phone
        const jid = `${normalizedPhone}@s.whatsapp.net`

        console.log(`📱 Enviando mensagem para JID: ${jid}`)

        // Formatar itens do pedido
        const itemsList = orderData.items.map(item =>
          `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`
        ).join('\n')

        // Formatar data/hora
        const createdAt = new Date()
        const formattedDate = createdAt.toLocaleDateString('pt-BR')
        const formattedTime = createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

        // Mensagem de confirmação ⏰ *Horário:* ${formattedTime}
        const message = `🛒 *Novo Pedido Recebido!😃*

Olá, ${orderData.customerName}!

Seu pedido foi registrado com sucesso:

📲 *Número do Pedido:* ${String(order.id).slice(-6)}
👤 *Cliente: ${orderData.customerName}*
📳 *Telefone: ${orderData.customerPhone}*
📅 *Data:* ${formattedDate} às ${formattedTime}
🚚 *Tipo de Delivery:* ${orderData.orderType === 'delivery' ? 'Entrega' : 'Retirada'}
💰 *Valor Total:* ${orderData.total.toFixed(2)}
${orderData.deliveryFee > 0 ? `📦 *Taxa de Entrega:* R$ ${orderData.deliveryFee.toFixed(2)}` : ''}
${orderData.orderType === 'delivery' && orderData.address ? `📍 *Endereço:* ${orderData.address}` : ''}
📋 *Pedidos:*
${itemsList}

⏳ *Status:* Aguardando confirmação da empresa.

💡 Você pode acompanhar o status acessando o site da loja.
Obrigado pela preferência! 😊`

        await connection.sock.sendMessage(jid, { text: message })
        console.log(`✅ Mensagem de confirmação enviada com sucesso para: ${normalizedPhone}`)
      } else {
        console.log(`⚠️ WhatsApp não conectado ou sem número de telefone. Mensagem não enviada.`)
      }
    } catch (whatsappError) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', whatsappError.message)
      console.error('❌ Stack:', whatsappError.stack)
      // Não falha o pedido se o WhatsApp falhar
    }

    res.json(order)
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    res.status(500).json({ error: 'Erro ao criar pedido' })
  }
})

// =========================
// ATUALIZAR STATUS DO PEDIDO (PAINEL)
// =========================
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const clientId = req.user.companyId

    if (!clientId) {
      return res.status(400).json({ error: 'companyId obrigatório' })
    }

    const orders = Database.all(clientId, 'orders')
    const orderIndex = orders.findIndex(o => String(o.id) === String(id))

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    const order = orders[orderIndex]

    // Atualizar status no pedido da empresa
    orders[orderIndex] = {
      ...order,
      status,
      updatedAt: new Date().toISOString()
    }

    Database.write(clientId, 'orders', orders)

    // Enviar notificação WhatsApp ao cliente sobre atualização de status
    try {
      const connection = ConnectionManager.get(clientId)
      
      if (connection && connection.connected && order.customerPhone) {
        const phone = order.customerPhone.replace(/\D/g, '')
        // Apenas adicionar código do país se não tiver
        const normalizedPhone = phone.startsWith('55') ? phone : '55' + phone
        const jid = `${normalizedPhone}@s.whatsapp.net`
        
        // Formatar data/hora
        const updatedAt = new Date()
        const formattedDate = updatedAt.toLocaleDateString('pt-BR')
        const formattedTime = updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        
        // Mensagens diferentes para cada status
        let statusMessage = ''
        let statusEmoji = ''
        
        switch (status) {
          case 'accepted':
            statusEmoji = '✅'
            statusMessage = `🎉 *Pedido Aceito!*

Olá, ${order.customerName}!

Seu pedido foi aceito pela empresa e está sendo preparado.

📲 *Pedido:* ${String(order.id).slice(-6)}
⏰ *Hora:* ${formattedTime}
💰 *Total:* R$ ${order.total.toFixed(2)}

⏳ *Status:* Em preparação

A empresa entrará em contato em breve caso precise de mais informações😊`
            break
          case 'on_the_way':
            statusEmoji = '🚚'
            statusMessage = `🚚 *Pedido a Caminho!*

Olá, ${order.customerName}!

Seu pedido saiu para entrega.

📲 *Pedido:* ${String(order.id).slice(-6)}
⏰ *Hora:* ${formattedTime}
💰 *Total:* R$ ${order.total.toFixed(2)}
${order.orderType === 'delivery' && order.address ? `📍 *Endereço:* ${order.address}` : ''}

⏳ *Status:* A caminho

Fique atento para receber seu pedido!

Obrigado pela preferência! 😊`
            break
          case 'completed':
            statusEmoji = '✅'
            statusMessage = `✅ *Pedido Entregue!*

Olá, ${order.customerName}!

Seu pedido foi entregue com sucesso.

📲 *Pedido:* ${String(order.id).slice(-6)}
⏰ *Hora:* ${formattedTime}
💰 *Total:* R$ ${order.total.toFixed(2)}

⏳ *Status:* Entregue

Esperamos que tenha gostado! Deixe sua avaliação no site da loja.
Obrigado pela preferência! 😊`
            break
          case 'cancelled':
            statusEmoji = '❌'
            statusMessage = `❌ *Pedido Cancelado*

Olá ${order.customerName}!

Seu pedido foi cancelado pela empresa.

📲 *Pedido:* ${String(order.id).slice(-6)}
⏰ *Hora:* ${formattedTime}
💰 *Total:* R$ ${order.total.toFixed(2)}

⏳ *Status:* Cancelado

Entre em contato com a empresa para mais informações.
Obrigado!`
            break
          default:
            statusMessage = `📋 *Atualização de Pedido*

Olá, ${order.customerName}!

Seu pedido teve o status atualizado.

📲 *Pedido:* ${String(order.id).slice(-6)}
⏰ *Hora:* ${formattedTime}
💰 *Total:* R$ ${order.total.toFixed(2)}

⏳ *Status:* ${status}

Obrigado pela preferência! 😊`
        }
        
        await connection.sock.sendMessage(jid, { text: statusMessage })
        console.log(`✅ Notificação de status enviada para: ${normalizedPhone} - Status: ${status}`)
      } else {
        console.log(`⚠️ WhatsApp não conectado ou sem número de telefone. Notificação não enviada.`)
      }
    } catch (whatsappError) {
      console.error('❌ Erro ao enviar notificação WhatsApp:', whatsappError.message)
      // Não falha a atualização se o WhatsApp falhar
    }

    // ATUALIZAR TAMBÉM NO CUSTOMER DATA DO USUÁRIO
    try {
      const customersPath = getCustomersPath(clientId)
      
      if (fs.existsSync(customersPath)) {
        const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
        
        // Encontrar o cliente pelo telefone
        const customerIndex = customers.findIndex(c => c.phone === order.customerPhone)
        
        if (customerIndex !== -1) {
          const customer = customers[customerIndex]
          
          // Atualizar o pedido específico nos pedidos do cliente
          if (customer.orders && Array.isArray(customer.orders)) {
            const customerOrderIndex = customer.orders.findIndex(o => String(o.id) === String(id))
            
            if (customerOrderIndex !== -1) {
              customer.orders[customerOrderIndex] = {
                ...customer.orders[customerOrderIndex],
                status,
                updatedAt: new Date().toISOString()
              }
              
              // Salvar o cliente atualizado
              customers[customerIndex] = customer
              fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
              
              console.log('✅ Status do pedido atualizado no customerData:', id, '→', status)
            }
          }
        }
      }
    } catch (customerError) {
      console.error('Erro ao atualizar pedido no customerData:', customerError)
      // Não retorna erro porque o pedido principal já foi atualizado
    }

    res.json(orders[orderIndex])
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    res.status(500).json({ error: 'Erro ao atualizar pedido' })
  }
})

// =========================
// REMOVER PEDIDO (PAINEL)
// =========================
router.delete('/:id', auth, (req, res) => {
  try {
    const { id } = req.params
    const clientId = req.user.companyId

    if (!clientId) {
      return res.status(400).json({ error: 'companyId obrigatório' })
    }

    const orders = Database.all(clientId, 'orders')
    const orderIndex = orders.findIndex(o => String(o.id) === String(id))

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    // Remover pedido
    orders.splice(orderIndex, 1)
    Database.write(clientId, 'orders', orders)

    console.log('Pedido removido:', id)
    res.json({ success: true, message: 'Pedido removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover pedido:', error)
    res.status(500).json({ error: 'Erro ao remover pedido' })
  }
})

// =========================
// ADICIONAR AVALIAÇÃO (SITE)
// =========================
router.post('/:id/rating', (req, res) => {
  try {
    const { id } = req.params
    const { companyId } = req.body
    const { rating, comment } = req.body

    console.log('📝 Avaliação recebida:', { id, companyId, rating, comment })

    if (!companyId) {
      console.log('❌ companyId não fornecido')
      return res.status(400).json({ error: 'companyId obrigatório' })
    }

    if (!rating || rating < 1 || rating > 5) {
      console.log('❌ Rating inválido:', rating)
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas' })
    }

    const orders = Database.all(companyId, 'orders')
    const orderIndex = orders.findIndex(o => String(o.id) === String(id))

    if (orderIndex === -1) {
      console.log('❌ Pedido não encontrado:', id)
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    const order = orders[orderIndex]

    // Atualizar pedido com avaliação
    orders[orderIndex] = {
      ...orders[orderIndex],
      rating: {
        stars: rating,
        comment: comment || '',
        ratedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    }

    Database.write(companyId, 'orders', orders)

    // Salvar avaliação no JSON local
    const fs = require('fs')
    const path = require('path')
    const ratingsPath = path.join(__dirname, `../../tenants/${companyId}/localdata/ratings.json`)

    // Criar arquivo se não existir
    if (!fs.existsSync(ratingsPath)) {
      fs.writeFileSync(ratingsPath, '[]')
    }

    // Ler avaliações existentes
    const ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'))

    // Verificar se já existe avaliação para este pedido
    const existingIndex = ratings.findIndex(r => r.orderId === String(id))

    // Criar avaliação com ID único
    const ratingData = {
      id: `${id}_${Date.now()}`, // ID único baseado em orderId + timestamp
      orderId: String(id),
      customerName: order.customerName || order.customer?.name || 'Cliente',
      rating: rating,
      comment: comment || '',
      ratedAt: new Date().toISOString()
    }

    if (existingIndex !== -1) {
      // Atualizar avaliação existente
      ratings[existingIndex] = ratingData
    } else {
      // Adicionar nova avaliação
      ratings.push(ratingData)
    }

    // Salvar no JSON
    fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2))

    console.log('✅ Avaliação salva no JSON local:', ratingData)
    res.json({ order: orders[orderIndex] })
  } catch (error) {
    console.error('❌ Erro ao adicionar avaliação:', error)
    res.status(500).json({ error: 'Erro ao adicionar avaliação' })
  }
})

// =========================
// BUSCAR PEDIDO POR ID (SITE)
// =========================
router.get('/:companyId/:orderId', (req, res) => {
  try {
    const { companyId, orderId } = req.params

    const orders = Database.all(companyId, 'orders')
    const order = orders.find(o => String(o.id) === String(orderId))

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' })
    }

    res.json(order)
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    res.status(500).json({ error: 'Erro ao buscar pedido' })
  }
})

// =========================
// BUSCAR MÉDIA DE AVALIAÇÕES (SITE PÚBLICO)
// =========================
router.get('/ratings/average/:companyId', (req, res) => {
  try {
    const { companyId } = req.params

    const fs = require('fs')
    const path = require('path')
    const ratingsPath = path.join(__dirname, `../../tenants/${companyId}/localdata/ratings.json`)

    let ratings = []
    if (fs.existsSync(ratingsPath)) {
      ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'))
    }

    // Calcular média
    const average = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
      : 0

    res.json({ average: average.toFixed(1), count: ratings.length })
  } catch (error) {
    console.error('Erro ao calcular média:', error)
    res.status(500).json({ error: 'Erro ao calcular média' })
  }
})

// =========================
// BUSCAR AVALIAÇÕES (PAINEL)
// =========================
router.get('/ratings', auth, (req, res) => {
  try {
    const clientId = req.user.companyId

    console.log('Buscando avaliações para companyId:', clientId)

    // Buscar do JSON local
    const fs = require('fs')
    const path = require('path')
    const ratingsPath = path.join(__dirname, `../../tenants/${clientId}/localdata/ratings.json`)

    let ratings = []
    if (fs.existsSync(ratingsPath)) {
      ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'))
    }

    console.log('Avaliações encontradas:', ratings.length)
    res.json(ratings)
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error)
    res.status(500).json({ error: 'Erro ao buscar avaliações' })
  }
})

// =========================
// REMOVER AVALIAÇÃO (PAINEL)
// =========================
router.delete('/ratings/:ratingId', auth, (req, res) => {
  try {
    const clientId = req.user.companyId
    const { ratingId } = req.params

    console.log('Removendo avaliação:', ratingId, 'para companyId:', clientId)

    // Buscar do JSON local
    const fs = require('fs')
    const path = require('path')
    const ratingsPath = path.join(__dirname, `../../tenants/${clientId}/localdata/ratings.json`)

    if (!fs.existsSync(ratingsPath)) {
      return res.status(404).json({ error: 'Arquivo de avaliações não encontrado' })
    }

    let ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'))

    // Filtrar para remover a avaliação
    const originalLength = ratings.length
    ratings = ratings.filter(r => r.id !== ratingId)

    if (ratings.length === originalLength) {
      return res.status(404).json({ error: 'Avaliação não encontrada' })
    }

    // Salvar no JSON
    fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2))

    console.log('Avaliação removida do JSON local:', ratingId)
    res.json({ success: true, message: 'Avaliação removida com sucesso' })
  } catch (error) {
    console.error('Erro ao remover avaliação:', error)
    res.status(500).json({ error: 'Erro ao remover avaliação' })
  }
})

// =========================
// ROTAS DE CLIENTES (SITE PÚBLICO)
// =========================

// Obter caminho do arquivo de clientes de uma empresa
function getCustomersPath(companyId) {
  return path.join(__dirname, '../../tenants', companyId, 'localdata', 'customers.json')
}

// Criar ou atualizar cliente
router.post('/customers/:companyId', (req, res) => {
  try {
    const { companyId } = req.params
    const customerData = req.body

    console.log('Salvando cliente para companyId:', companyId)
    console.log('Dados do cliente:', customerData)

    // Validar dados obrigatórios
    if (!customerData.phone || !customerData.name) {
      return res.status(400).json({ error: 'Telefone e nome são obrigatórios' })
    }

    const customersPath = getCustomersPath(companyId)
    const customersDir = path.dirname(customersPath)

    // Criar diretório se não existir
    if (!fs.existsSync(customersDir)) {
      fs.mkdirSync(customersDir, { recursive: true })
    }

    // Ler clientes existentes
    let customers = []
    if (fs.existsSync(customersPath)) {
      customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    }

    // Verificar se cliente já existe pelo telefone
    const existingIndex = customers.findIndex(c => c.phone === customerData.phone)
    
    if (existingIndex !== -1) {
      // Atualizar cliente existente
      customers[existingIndex] = {
        ...customers[existingIndex],
        ...customerData,
        updatedAt: new Date().toISOString()
      }
      console.log('Cliente atualizado:', customers[existingIndex])
    } else {
      // Criar novo cliente
      const newCustomer = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...customerData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cashback: 0
      }
      customers.push(newCustomer)
      console.log('Novo cliente criado:', newCustomer)
    }

    // Salvar no JSON
    fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))

    console.log('Cliente salvo com sucesso')
    res.json({ success: true, customer: existingIndex !== -1 ? customers[existingIndex] : customers[customers.length - 1] })
  } catch (error) {
    console.error('Erro ao salvar cliente:', error)
    res.status(500).json({ error: 'Erro ao salvar cliente' })
  }
})

// Obter cliente por telefone
router.get('/customers/:companyId/:phone', (req, res) => {
  try {
    const { companyId, phone } = req.params

    const customersPath = getCustomersPath(companyId)

    if (!fs.existsSync(customersPath)) {
      return res.json({ success: false, customer: null })
    }

    const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    const customer = customers.find(c => c.phone === phone)

    res.json({ success: true, customer: customer || null })
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    res.status(500).json({ error: 'Erro ao buscar cliente' })
  }
})

// Atualizar dados do cliente
router.put('/customers/:companyId/:customerId', (req, res) => {
  try {
    const { companyId, customerId } = req.params
    const updateData = req.body

    const customersPath = getCustomersPath(companyId)

    if (!fs.existsSync(customersPath)) {
      return res.status(404).json({ error: 'Cliente não encontrado' })
    }

    const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    const index = customers.findIndex(c => c.id === customerId)

    if (index === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' })
    }

    // Atualizar cliente
    customers[index] = {
      ...customers[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))

    res.json({ success: true, customer: customers[index] })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    res.status(500).json({ error: 'Erro ao atualizar cliente' })
  }
})

module.exports = router