const express = require('express')
const fs = require('fs')
const path = require('path')

const router = express.Router()

// MENSAGENS DO SITE

// Enviar mensagem do cliente para empresa
router.post('/:companyId/message', async (req, res) => {
  try {
    const { companyId } = req.params
    const { customerId, message, type, customerData } = req.body // type: 'customer' ou 'company'

    // Se customerData foi fornecido (cliente guest), criar cliente automaticamente
    if (customerData && !customerId) {
      const customersPath = path.join(
        __dirname,
        `../../tenants/${companyId}/customers.json`
      )
      
      let customers = []
      if (fs.existsSync(customersPath)) {
        customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
      }

      // Verificar se cliente já existe pelo telefone
      const existingCustomer = customers.find(c => c.phone.replace(/\D/g, '') === customerData.phone.replace(/\D/g, ''))
      
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Criar novo cliente
        const newCustomer = {
          id: customerData.phone.replace(/\D/g, ''),
          name: customerData.name,
          phone: customerData.phone,
          createdAt: new Date().toISOString()
        }
        customers.push(newCustomer)
        fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
        customerId = newCustomer.id
        console.log(`✅ Cliente guest criado: ${newCustomer.name} (${newCustomer.id})`)
      }
    }

    // Se customerId existe mas cliente não foi criado (empresa enviando mensagem primeiro)
    if (customerId && !customerData) {
      const customersPath = path.join(
        __dirname,
        `../../tenants/${companyId}/customers.json`
      )
      
      let customers = []
      if (fs.existsSync(customersPath)) {
        customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
      }

      const existingCustomer = customers.find(c => c.id === customerId)
      
      if (!existingCustomer) {
        // Criar cliente com ID (telefone) e nome padrão
        const newCustomer = {
          id: customerId,
          name: customerData?.name || 'Cliente',
          phone: customerData?.phone || customerId, // ID é o telefone normalizado
          createdAt: new Date().toISOString()
        }
        customers.push(newCustomer)
        fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
        console.log(`✅ Cliente criado automaticamente pela empresa: ${newCustomer.name} (${newCustomer.id})`)
      } else if (customerData?.name && existingCustomer.name === 'Cliente') {
        // Update name if it was "Cliente" and now we have the real name
        existingCustomer.name = customerData.name
        if (customerData.phone) {
          existingCustomer.phone = customerData.phone
        }
        fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
        console.log(`✅ Nome do cliente atualizado: ${existingCustomer.name} (${existingCustomer.id})`)
      }
    }

    const messagesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/messages.json`
    )

    let messages = []
    if (fs.existsSync(messagesPath)) {
      messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'))
    }

    // Criar nova mensagem
    const newMessage = {
      id: Date.now().toString(),
      customerId,
      from: type, // 'customer' ou 'company'
      message,
      read: false,
      createdAt: new Date().toISOString()
    }

    messages.push(newMessage)
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2))

    console.log(`✅ Mensagem enviada: ${type} -> ${type === 'customer' ? 'company' : 'customer'}`)

    // Emit Socket.io event for real-time update
    const io = global.io
    if (io) {
      // Emit for company panel
      io.to(companyId).emit('new_message', newMessage)
      // Emit for customer
      io.to(companyId).to(customerId).emit('new_message', newMessage)
      console.log(`✅ Socket event emitted for message`)
    }

    // Enviar notificação via WhatsApp se disponível
    const clientSockets = global.clientSockets || {}
    const sock = clientSockets[companyId]

    if (sock) {
      try {
        // Obter dados do cliente
        const customersPath = path.join(
          __dirname,
          `../../tenants/${companyId}/customers.json`
        )
        let customer = { phone: '', name: 'Cliente' }
        if (fs.existsSync(customersPath)) {
          const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
          customer = customers.find(c => c.id === customerId) || customer
        }

        // Normalizar número WhatsApp
        let phone = customer.phone.replace(/\D/g, '')
        if (!phone.startsWith('55')) {
          phone = '55' + phone
        }
        // Verificar formato do número para Brasil (DDD + 9 dígitos)
        if (phone.length === 12) {
          phone = phone.substring(0, 4) + '9' + phone.substring(4)
        }

        const jid = `${phone}@s.whatsapp.net`
        console.log(`📱 Enviando notificação WhatsApp para: ${jid}`)

        const whatsappMessage = type === 'company' 
          ? `💬 Nova mensagem da empresa!

👤 ${customer.name}
📝 ${message}

Esta mensagem foi enviada através do site da empresa.`
          : `💬 Nova mensagem do site!

👤 ${customer.name}
📝 ${message}

Esta mensagem foi enviada através do site da empresa.`

        await sock.sendMessage(jid, { text: whatsappMessage })
        console.log(`✅ Notificação WhatsApp enviada para ${type === 'company' ? 'cliente' : 'empresa'}`)
      } catch (err) {
        console.log('Erro ao enviar notificação WhatsApp:', err)
      }
    } else {
      console.log('⚠️ Socket WhatsApp não disponível para companyId:', companyId)
    }

    res.json({
      success: true,
      messageId: newMessage.id
    })

  } catch (err) {
    console.log('Erro ao enviar mensagem:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// Obter mensagens do cliente
router.get('/:companyId/customer/:customerId/messages', async (req, res) => {
  try {
    const { companyId, customerId } = req.params

    const messagesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/messages.json`
    )

    if (!fs.existsSync(messagesPath)) {
      return res.json({ messages: [] })
    }

    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'))
    
    // Filtrar mensagens deste cliente E visíveis para empresa (painel)
    const customerMessages = messages.filter(m => 
      m.customerId === customerId && 
      (!m.visibleTo || m.visibleTo === 'company')
    )

    res.json({
      messages: customerMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    })

  } catch (err) {
    console.log('Erro ao carregar mensagens:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// Obter todas as mensagens da empresa (para painel) - AGRUPADAS POR CLIENTE
router.get('/:companyId/messages', async (req, res) => {
  try {
    const { companyId } = req.params

    const messagesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/messages.json`
    )

    if (!fs.existsSync(messagesPath)) {
      return res.json({ conversations: [] })
    }

    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'))
    const customersPath = path.join(
      __dirname,
      `../../tenants/${companyId}/customers.json`
    )
    
    // Adicionar informações dos clientes
    let customers = []
    if (fs.existsSync(customersPath)) {
      customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    }

    // Agrupar mensagens por customerId
    const conversationsMap = new Map()

    messages.forEach(msg => {
      // Skip messages that are only visible to customer
      if (msg.visibleTo === 'customer') return
      
      const customer = customers.find(c => c.id === msg.customerId)
      
      if (!conversationsMap.has(msg.customerId)) {
        conversationsMap.set(msg.customerId, {
          customerId: msg.customerId,
          customerName: customer?.name || 'Cliente',
          customerPhone: customer?.phone || '',
          unreadCount: 0,
          lastMessage: msg.message,
          lastMessageTime: msg.createdAt,
          messages: []
        })
      }

      const conversation = conversationsMap.get(msg.customerId)
      conversation.messages.push(msg)
      
      // Contar mensagens não lidas do cliente
      if (msg.from === 'customer' && !msg.read) {
        conversation.unreadCount++
      }
      
      // Atualizar última mensagem se for mais recente
      if (new Date(msg.createdAt) > new Date(conversation.lastMessageTime)) {
        conversation.lastMessage = msg.message
        conversation.lastMessageTime = msg.createdAt
      }
    })

    // Converter para array e ordenar por última mensagem
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))

    res.json({
      conversations
    })

  } catch (err) {
    console.log('Erro ao carregar mensagens da empresa:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// Marcar mensagem como lida
router.put('/:companyId/message/:messageId/read', async (req, res) => {
  try {
    const { companyId, messageId } = req.params

    const messagesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/messages.json`
    )

    if (!fs.existsSync(messagesPath)) {
      return res.status(404).json({
        error: 'Mensagem não encontrada'
      })
    }

    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'))
    const messageIndex = messages.findIndex(m => m.id === messageId)

    if (messageIndex === -1) {
      return res.status(404).json({
        error: 'Mensagem não encontrada'
      })
    }

    messages[messageIndex].read = true
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2))

    res.json({
      success: true
    })

  } catch (err) {
    console.log('Erro ao marcar mensagem como lida:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// Deletar todas as mensagens de um cliente (conversa inteira)
router.delete('/:companyId/conversation/:customerId', async (req, res) => {
  try {
    const { companyId, customerId } = req.params

    const messagesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/messages.json`
    )

    if (!fs.existsSync(messagesPath)) {
      return res.json({ success: true })
    }

    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'))
    
    // Filtrar apenas mensagens de outros clientes
    const remainingMessages = messages.filter(m => m.customerId !== customerId)
    
    fs.writeFileSync(messagesPath, JSON.stringify(remainingMessages, null, 2))

    console.log(`✅ Conversa do cliente ${customerId} deletada`)

    res.json({ success: true })

  } catch (err) {
    console.log('Erro ao deletar conversa:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

module.exports = router
