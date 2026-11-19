const express = require('express')
const fs = require('fs')
const path = require('path')

const router = express.Router()

// CLIENTES DO SITE
// Nota: Login e registro agora são feitos via auth-website.js com validação WhatsApp

// Obter pedidos do cliente
router.get('/:companyId/customer/:customerId/orders', async (req, res) => {
  try {
    const { companyId, customerId } = req.params

    const databasePath = path.join(
      __dirname,
      `../../tenants/${companyId}/database.json`
    )

    if (!fs.existsSync(databasePath)) {
      return res.json({ orders: [] })
    }

    const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
    const orders = database.orders || []

    // Filtrar pedidos deste cliente
    const customerOrders = orders.filter(order => {
      if (order.source === 'website') {
        return order.customer?.phone === customerId
      }
      return order.number === customerId
    })

    res.json({
      orders: customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

  } catch (err) {
    console.log('Erro ao carregar pedidos do cliente:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// Listar todos os clientes da empresa
router.get('/:companyId/customers', async (req, res) => {
  try {
    const { companyId } = req.params

    const customersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/customers.json`
    )

    if (!fs.existsSync(customersPath)) {
      return res.json({ customers: [] })
    }

    const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))

    res.json({
      customers: customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        createdAt: c.createdAt,
        lastLogin: c.lastLogin
      }))
    })

  } catch (err) {
    console.log('Erro ao carregar clientes:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

module.exports = router
