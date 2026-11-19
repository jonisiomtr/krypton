const express = require('express')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const ConnectionManager = require('../../managers/ConnectionManager')
const { normalizeWhatsAppPhone } = require('../../utils/whatsappNormalizer')

const router = express.Router()

// ========================
// FUNÇÃO PARA ENVIAR WHATSAPP
// ========================
async function sendWhatsAppNotification(companyId, message) {
  try {
    // Carregar configuração do PDV
    const pdvConfigPath = path.join(__dirname, `../../tenants/${companyId}/pdv.json`)
    let supervisorPhone = null

    if (fs.existsSync(pdvConfigPath)) {
      const pdvConfig = JSON.parse(fs.readFileSync(pdvConfigPath, 'utf8'))
      supervisorPhone = pdvConfig.supervisorPhone
    }

    if (!supervisorPhone) {
      console.log('ℹ️ WhatsApp do supervisor não configurado')
      return
    }

    // Normalizar número
    const normalizedPhone = normalizeWhatsAppPhone(supervisorPhone)
    const jid = `${normalizedPhone}@s.whatsapp.net`

    // Carregar gerenciador de conexões
    const connection = ConnectionManager.get(companyId)

    if (!connection || !connection.connected) {
      console.log('⚠️ WhatsApp não conectado para empresa:', companyId)
      return
    }

    // Enviar mensagem
    await connection.sock.sendMessage(jid, { text: message })
    console.log('✅ Notificação WhatsApp enviada para supervisor:', supervisorPhone)
  } catch (err) {
    console.error('❌ Erro ao enviar notificação WhatsApp:', err)
  }
}

// ========================
// CONFIGURAÇÃO DO PDV
// ========================

// OBTER CONFIGURAÇÃO
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params

    const pdvConfigPath = path.join(
      __dirname,
      `../../tenants/${companyId}/pdv.json`
    )

    if (!fs.existsSync(pdvConfigPath)) {
      // Criar configuração padrão
      const defaultConfig = {
        enabled: true,
        theme: 'modern',
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          accent: '#10b981',
          background: '#0f172a',
          text: '#ffffff'
        },
        businessName: '',
        businessLogo: '',
        showLogo: true,
        supervisorPhone: ''
      }
      fs.writeFileSync(pdvConfigPath, JSON.stringify(defaultConfig, null, 2))
      return res.json(defaultConfig)
    }

    const config = JSON.parse(fs.readFileSync(pdvConfigPath, 'utf8'))
    res.json(config)
  } catch (err) {
    console.error('Erro ao carregar configuração PDV:', err)
    res.status(500).json({ error: 'Erro ao carregar configuração' })
  }
})

// SALVAR CONFIGURAÇÃO
router.put('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const config = req.body

    const pdvConfigPath = path.join(
      __dirname,
      `../../tenants/${companyId}/pdv.json`
    )

    fs.writeFileSync(pdvConfigPath, JSON.stringify(config, null, 2))
    res.json({ success: true })
  } catch (err) {
    console.error('Erro ao salvar configuração PDV:', err)
    res.status(500).json({ error: 'Erro ao salvar configuração' })
  }
})

// ========================
// USUÁRIOS DO PDV
// ========================

// OBTER USUÁRIOS
router.get('/:companyId/users', async (req, res) => {
  try {
    const { companyId } = req.params

    const usersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/pdv-users.json`
    )

    if (!fs.existsSync(usersPath)) {
      return res.json([])
    }

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'))
    res.json(users)
  } catch (err) {
    console.error('Erro ao carregar usuários PDV:', err)
    res.status(500).json({ error: 'Erro ao carregar usuários' })
  }
})

// ADICIONAR USUÁRIO
router.post('/:companyId/users', async (req, res) => {
  try {
    const { companyId } = req.params
    const { username, password, name, role } = req.body

    const usersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/pdv-users.json`
    )

    let users = []
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'))
    }

    // Verificar se usuário já existe
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Usuário já existe' })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date().toISOString(),
      active: true
    }

    users.push(newUser)
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2))

    res.json(newUser)
  } catch (err) {
    console.error('Erro ao adicionar usuário PDV:', err)
    res.status(500).json({ error: 'Erro ao adicionar usuário' })
  }
})

// REMOVER USUÁRIO
router.delete('/:companyId/users/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params

    const usersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/pdv-users.json`
    )

    if (!fs.existsSync(usersPath)) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    let users = JSON.parse(fs.readFileSync(usersPath, 'utf8'))
    users = users.filter(u => u.id !== userId)

    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2))
    res.json({ success: true })
  } catch (err) {
    console.error('Erro ao remover usuário PDV:', err)
    res.status(500).json({ error: 'Erro ao remover usuário' })
  }
})

// ========================
// LOGIN DO PDV
// ========================

router.post('/:companyId/login', async (req, res) => {
  try {
    const { companyId } = req.params
    const { username, password } = req.body

    const usersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/pdv-users.json`
    )

    if (!fs.existsSync(usersPath)) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' })
    }

    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'))
    const user = users.find(u => u.username === username && u.active)

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' })
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, companyId, role: user.role },
      process.env.JWT_SECRET || 'krypton-secret-key',
      { expiresIn: '8h' }
    )

    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = user

    res.json({
      token,
      user: userWithoutPassword
    })
  } catch (err) {
    console.error('Erro ao fazer login PDV:', err)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// ========================
// PRODUTOS DO PDV
// ========================

router.get('/:companyId/products', async (req, res) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return res.status(400).json({ error: 'CompanyId não fornecido' })
    }

    const productsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/products.json`
    )

    if (!fs.existsSync(productsPath)) {
      console.log(`Arquivo de produtos não encontrado para ${companyId}`)
      return res.json([])
    }

    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
    console.log(`Produtos carregados para ${companyId}:`, products.length)
    res.json(products)
  } catch (err) {
    console.error('Erro ao carregar produtos PDV:', err)
    res.status(500).json({ error: 'Erro ao carregar produtos' })
  }
})

// ========================
// CHECKOUT DO PDV
// ========================

router.post('/:companyId/checkout', async (req, res) => {
  try {
    const { companyId } = req.params
    const { items, paymentMethod, amountReceived, operator } = req.body

    const productsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/products.json`
    )

    const ordersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/orders.json`
    )

    // Carregar produtos
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))

    // Validar estoque e calcular total
    let total = 0
    const orderItems = []

    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        return res.status(400).json({ error: `Produto ${item.productId} não encontrado` })
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` })
      }

      const itemTotal = product.price * item.quantity
      total += itemTotal

      orderItems.push({
        productId: item.productId,
        code: product.code,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        totalPrice: itemTotal
      })

      // Atualizar estoque
      product.stock -= item.quantity
    }

    // Salvar produtos atualizados
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2))

    // Criar pedido
    const order = {
      id: Date.now().toString(),
      items: orderItems,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'dinheiro' ? amountReceived : 0,
      change: paymentMethod === 'dinheiro' ? amountReceived - total : 0,
      operator,
      createdAt: new Date().toISOString()
    }

    // Carregar pedidos existentes
    let orders = []
    if (fs.existsSync(ordersPath)) {
      orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'))
    }

    orders.push(order)
    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2))

    // Enviar notificação WhatsApp para o supervisor
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const notificationMessage = `🔔 *Nova Venda no PDV*\n\n` +
      `👤 *Operador:* ${operator}\n` +
      `📦 *Total de Itens:* ${totalItems}\n` +
      `💰 *Valor Total:* R$ ${total.toFixed(2)}\n` +
      `💳 *Pagamento:* ${paymentMethod.toUpperCase()}\n` +
      `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
      `✅ Venda finalizada com sucesso!`

    await sendWhatsAppNotification(companyId, notificationMessage)

    // Gerar cupom
    const configPath = path.join(
      __dirname,
      `../../tenants/${companyId}/config.json`
    )

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const companyName = config.name || 'Empresa'

    const receipt = {
      orderId: order.id,
      companyName,
      date: new Date().toLocaleString('pt-BR'),
      operator,
      customer: 'Consumidor Final',
      items: orderItems,
      total,
      paymentMethod,
      amountReceived: order.amountReceived,
      change: order.change
    }

    res.json({
      success: true,
      order,
      receipt
    })
  } catch (err) {
    console.error('Erro ao finalizar venda PDV:', err)
    res.status(500).json({ error: 'Erro ao finalizar venda' })
  }
})

// ========================
// FATURAMENTO DO PDV
// ========================

router.get('/:companyId/revenue', async (req, res) => {
  try {
    const { companyId } = req.params
    const { range = 'today' } = req.query

    const ordersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/orders.json`
    )

    if (!fs.existsSync(ordersPath)) {
      return res.json({
        totalRevenue: 0,
        totalOrders: 0,
        averageTicket: 0,
        dailyRevenue: []
      })
    }

    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'))

    // Filtrar por período
    const now = new Date()
    let filteredOrders = []

    if (range === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= today
      })
    } else if (range === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= weekAgo
      })
    } else if (range === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= monthAgo
      })
    } else {
      filteredOrders = orders
    }

    // Calcular métricas
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0)
    const totalOrders = filteredOrders.length
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Agrupar por dia
    const dailyRevenue = {}
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0]
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { revenue: 0, orders: 0 }
      }
      dailyRevenue[date].revenue += order.total
      dailyRevenue[date].orders += 1
    })

    // Converter para array
    const dailyRevenueArray = Object.entries(dailyRevenue)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    res.json({
      totalRevenue,
      totalOrders,
      averageTicket,
      dailyRevenue: dailyRevenueArray
    })
  } catch (err) {
    console.error('Erro ao calcular faturamento PDV:', err)
    res.status(500).json({ error: 'Erro ao calcular faturamento' })
  }
})

module.exports = router
