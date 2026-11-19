const express = require('express')
const router = express.Router()
const MercadoPagoService = require('../../services/MercadoPagoService')
const Database = require('../../database/Database')
const fileLock = require('../../utils/fileLock')
const ClientManager = require('../../core/ClientManager')

/**
 * ROTA: Gerar URL de autorização OAuth
 * GET /api/mercadopago/auth/:tenantId
 */
router.get('/auth/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID é obrigatório' })
    }

    const authUrl = MercadoPagoService.getAuthUrl(tenantId)
    
    res.json({
      success: true,
      authUrl
    })
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error.message)
    res.status(500).json({ error: 'Erro ao gerar URL de autorização' })
  }
})

/**
 * ROTA: Callback OAuth (recebe code do Mercado Pago)
 * GET /mercadopago/callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    
    if (!code) {
      return res.status(400).json({ error: 'Código de autorização não fornecido' })
    }

    if (!state) {
      return res.status(400).json({ error: 'State (tenant ID) não fornecido' })
    }

    const tenantId = state
    
    // Troca code por access_token
    const result = await MercadoPagoService.exchangeCodeForToken(code, tenantId)
    
    // Redireciona para o painel com sucesso
    res.redirect(`${process.env.PANEL_URL || 'http://localhost:5000'}/company/${tenantId}?mp_connected=true`)
  } catch (error) {
    console.error('Erro no callback OAuth:', error.message)
    res.status(500).json({ error: 'Erro ao conectar com Mercado Pago' })
  }
})

/**
 * ROTA: Verificar status de conexão
 * GET /api/mercadopago/status/:tenantId
 */
router.get('/status/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params
    const fs = require('fs')
    const path = require('path')

    const configPath = path.join(__dirname, `../../tenants/${tenantId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return res.json({
        success: true,
        connected: false
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const mpData = config.mercadopago

    if (!mpData || !mpData.access_token) {
      return res.json({
        success: true,
        connected: false
      })
    }

    // Calcula data de expiração
    const connectedAt = mpData.connected_at || Date.now()
    const expiresInSeconds = mpData.expires_in || 15552000 // 6 meses padrão
    const expiresAt = connectedAt + (expiresInSeconds * 1000)

    res.json({
      success: true,
      connected: true,
      userId: mpData.user_id,
      connectedAt: connectedAt,
      expiresAt: expiresAt
    })
  } catch (error) {
    console.error('Erro ao verificar status:', error.message)
    res.status(500).json({ error: 'Erro ao verificar status' })
  }
})

/**
 * ROTA: Desconectar Mercado Pago
 * POST /api/mercadopago/disconnect/:tenantId
 */
router.post('/disconnect/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    
    await MercadoPagoService.disconnect(tenantId)
    
    res.json({
      success: true,
      message: 'Mercado Pago desconectado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao desconectar:', error.message)
    res.status(500).json({ error: 'Erro ao desconectar Mercado Pago' })
  }
})

/**
 * ROTA: Webhook de confirmação de pagamento (com fileLock)
 * POST /payments/webhook/mercadopago
 */
router.post('/webhook/mercadopago', async (req, res) => {
  try {
    const notification = req.body
    
    console.log('📬 Webhook Mercado Pago recebido:', notification)
    
    // Mercado Pago envia notification_id ou payment_id
    const notificationId = notification.notification_id || notification.data?.id
    
    if (!notificationId) {
      console.log('⚠️ Webhook sem notification_id, ignorando')
      return res.sendStatus(200)
    }

    // Mercado Pago também envia external_reference em alguns casos
    // Se não tiver, precisamos buscar os detalhes do pagamento
    let tenantId = null
    let paymentId = null
    let paymentDetails = null
    let isCeoPayment = false

    // Se vier com external_reference, extrai informações
    if (notification.external_reference) {
      const externalRef = notification.external_reference
      
      // Verifica se é pagamento do CEO (formato: ceo_module_moduleName_tenantId_timestamp)
      if (externalRef.startsWith('ceo_module_')) {
        isCeoPayment = true
        const parts = externalRef.split('_')
        tenantId = parts[3] // Extrai tenantId do formato ceo_module_moduleName_tenantId_timestamp
        paymentId = notificationId
        console.log(`🏢 Pagamento do CEO detectado para tenant: ${tenantId}`)
      } else {
        // Pagamento de tenant (formato: tenantId_orderId)
        const [tid] = externalRef.split('_')
        tenantId = tid
        paymentId = notificationId
        console.log(`🏭 Pagamento de tenant detectado: ${tenantId}`)
      }
    } else {
      // Caso contrário, precisamos buscar todos os tenants para encontrar o pagamento
      paymentId = notificationId
    }

    // Busca detalhes do pagamento na API do Mercado Pago
    // Se for pagamento do CEO, usa credenciais globais (tenantId = null)
    // Se for de tenant, usa credenciais do tenant
    if (!tenantId) {
      console.log('⚠️ External reference não encontrado, tentando buscar payment details')
      return res.sendStatus(200)
    }

    // Busca detalhes do pagamento
    try {
      const tenantForAuth = isCeoPayment ? null : tenantId
      paymentDetails = await MercadoPagoService.getPaymentDetails(tenantForAuth, paymentId)
    } catch (error) {
      console.error('Erro ao buscar detalhes do pagamento:', error.message)
      return res.sendStatus(200) // Não falha o webhook
    }

    // Verifica se o pagamento foi aprovado
    if (paymentDetails.status !== 'approved') {
      console.log(`ℹ️ Pagamento ${paymentId} não aprovado: ${paymentDetails.status}`)
      return res.sendStatus(200)
    }

    // Extrai external_reference dos detalhes se ainda não tivermos
    const externalReference = paymentDetails.external_reference
    if (!isCeoPayment && !tenantId && externalReference) {
      const [tid] = externalReference.split('_')
      tenantId = tid
    }

    if (!tenantId) {
      console.error('❌ Não foi possível identificar o tenant')
      return res.sendStatus(200)
    }

    // ROTEAMENTO BASEADO NO EXTERNAL_REFERENCE
    if (externalReference.startsWith('ceo_module_')) {
      // FLUXO DO CEO: Ativa módulo no config.json do tenant
      await handleCeoPayment(tenantId, externalReference, paymentDetails)
    } else {
      // FLUXO DO TENANT: Atualiza pedido/agendamento no database.json
      await handleTenantPayment(tenantId, externalReference, paymentDetails)
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('❌ Erro no webhook Mercado Pago:', error.message)
    res.sendStatus(500)
  }
})

/**
 * Lida com pagamento do CEO (ativação de módulo)
 */
async function handleCeoPayment(tenantId, externalReference, paymentDetails) {
  try {
    console.log(`🏢 Processando pagamento do CEO para tenant: ${tenantId}`)
    
    // Extrai o nome do módulo do external_reference (formato: ceo_module_moduleName_tenantId_timestamp)
    const parts = externalReference.split('_')
    const moduleName = parts[2] // moduleName está na posição 2
    
    // Ativa o módulo no config.json
    await MercadoPagoService.activateModule(tenantId, moduleName)
    
    console.log(`✅ Módulo ${moduleName} ativado para tenant ${tenantId} após pagamento do CEO`)
  } catch (error) {
    console.error('❌ Erro ao processar pagamento do CEO:', error.message)
    throw error
  }
}

/**
 * Lida com pagamento de tenant (atualização de pedido/agendamento)
 */
async function handleTenantPayment(tenantId, externalReference, paymentDetails) {
  try {
    console.log(`🏭 Processando pagamento de tenant: ${tenantId}`)
    
    // Extrai orderId do external_reference (formato: tenantId_orderId)
    const orderId = externalReference.split('_')[1]

    // ADQUIRE LOCK PARA EVITAR RACE CONDITION
    console.log(`🔒 Adquirindo lock para tenant: ${tenantId}`)
    await fileLock.acquire(tenantId, 10000, 100)

    try {
      // Busca pedido/agendamento no database.json
      const databasePath = `tenants/${tenantId}/database.json`
      const fs = require('fs')
      
      if (!fs.existsSync(databasePath)) {
        console.error(`❌ Database não encontrado para tenant: ${tenantId}`)
        return
      }

      const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
      
      // Tenta encontrar em orders
      let order = database.orders?.find(o => o.id === Number(orderId) || o.paymentId === paymentDetails.id)
      
      // Se não encontrou em orders, tenta em appointments
      let appointment = null
      if (!order) {
        appointment = database.appointments?.find(a => a.id === Number(orderId) || a.paymentId === paymentDetails.id)
      }

      if (!order && !appointment) {
        console.error(`❌ Pedido/agendamento não encontrado: ${orderId}`)
        return
      }

      // Atualiza status
      if (order) {
        const orderIndex = database.orders.findIndex(o => o.id === order.id)
        database.orders[orderIndex].status = 'confirmed'
        database.orders[orderIndex].paymentStatus = 'approved'
        database.orders[orderIndex].confirmedAt = Date.now()
        
        console.log(`✅ Pedido ${order.id} confirmado (PIX via Mercado Pago)`)
      }

      if (appointment) {
        const appointmentIndex = database.appointments.findIndex(a => a.id === appointment.id)
        database.appointments[appointmentIndex].status = 'confirmed'
        database.appointments[appointmentIndex].paymentStatus = 'approved'
        database.appointments[appointmentIndex].confirmedAt = Date.now()
        
        console.log(`✅ Agendamento ${appointment.id} confirmado (PIX via Mercado Pago)`)
      }

      // Salva database.json
      fs.writeFileSync(databasePath, JSON.stringify(database, null, 2))

      // ENVIA MENSAGEM AUTOMÁTICA NO WHATSAPP
      await sendWhatsAppConfirmation(tenantId, order || appointment, paymentDetails)

    } finally {
      // SEMPRE LIBERA O LOCK
      await fileLock.release(tenantId)
      console.log(`🔓 Lock liberado para tenant: ${tenantId}`)
    }
  } catch (error) {
    console.error('❌ Erro ao processar pagamento de tenant:', error.message)
    throw error
  }
}

/**
 * Helper: Envia mensagem de confirmação no WhatsApp
 */
async function sendWhatsAppConfirmation(tenantId, item, paymentDetails) {
  try {
    const client = ClientManager.get(tenantId)
    
    if (!client || !client.sock) {
      console.error('❌ Cliente WhatsApp não encontrado')
      return
    }

    const customerNumber = item.number || item.customer
    
    if (!customerNumber) {
      console.error('❌ Número do cliente não encontrado')
      return
    }

    const message = `
✅ *PAGAMENTO CONFIRMADO!*

${item.cart ? '🛒 Seu pedido foi confirmado!' : '📅 Seu agendamento foi confirmado!'}

Valor pago: R$ ${paymentDetails.transaction_amount.toFixed(2)}
ID do pagamento: ${paymentDetails.id}

${item.cart ? '🚀 Seu pedido está sendo preparado!' : '🎉 Te esperamos no horário agendado!'}

Obrigado pela preferência! 🙏
`.trim()

    await client.sock.sendMessage(
      `${customerNumber}@s.whatsapp.net`,
      { text: message }
    )

    console.log(`✅ Mensagem de confirmação enviada para ${customerNumber}`)
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error.message)
  }
}

module.exports = router
