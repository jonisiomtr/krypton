const express = require('express')
const router = express.Router()
const Database = require('../../database/Database')
const PaymentManager = require('../../managers/PaymentManager')
const MercadoPagoService = require('../../services/MercadoPagoService')

// Memória temporária para rastrear pagamentos (orderId -> externalReference)
const paymentTracking = new Map()

/**
 * Webhook ASAAS (legado)
 */
router.post('/webhook/asaas', async (req, res) => {
  try {
    const event = req.body.event
    const payment = req.body.payment

    if (event === 'PAYMENT_RECEIVED') {
      console.log('✅ PAGAMENTO RECEBIDO:', payment.id)
      // AQUI FUTURAMENTE: atualizar pedido, liberar entrega, etc
    }

    return res.sendStatus(200)
  } catch (err) {
    console.log(err)
    return res.sendStatus(500)
  }
})

/**
 * ROTA: Criar pagamento do CEO (monetização do SaaS)
 * POST /api/payments/ceo/create
 */
router.post('/ceo/create', async (req, res) => {
  try {
    const { tenantId, amount, description, moduleName } = req.body

    if (!tenantId || !amount || !description || !moduleName) {
      return res.status(400).json({
        error: 'Campos obrigatórios: tenantId, amount, description, moduleName'
      })
    }

    console.log(`🏢 Criando pagamento do CEO para tenant ${tenantId}: módulo ${moduleName}`)

    const result = await PaymentManager.createCeoPayment({
      tenantId,
      amount,
      description,
      moduleName
    })

    // Armazena external_reference em memória para rastreamento
    const timestamp = Date.now()
    const externalReference = `ceo_module_${moduleName}_${tenantId}_${timestamp}`
    paymentTracking.set(result.paymentId, {
      externalReference,
      tenantId,
      moduleName
    })

    console.log(`📝 Rastreamento armazenado: ${result.paymentId} -> ${externalReference}`)

    res.json({
      success: true,
      paymentId: result.paymentId,
      orderId: result.orderId, // Adiciona Order ID
      pixCode: result.pixCode,
      qrCodeUrl: result.qrCodeUrl,
      expiresAt: result.expiresAt,
      status: result.status
    })
  } catch (error) {
    console.error('❌ Erro ao criar pagamento do CEO:', error.message)
    res.status(500).json({
      error: 'Erro ao criar pagamento',
      message: error.message
    })
  }
})

/**
 * ROTA: Verificar status de pagamento do CEO
 * GET /api/payments/ceo/status/:paymentId
 */
router.get('/ceo/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params

    if (!paymentId) {
      return res.status(400).json({
        error: 'paymentId é obrigatório'
      })
    }

    // Se é pagamento simulado, retorna status simulado
    if (paymentId.startsWith('sim_')) {
      const timestamp = parseInt(paymentId.split('_')[1])
      const isApproved = (Date.now() - timestamp) > 10000

      return res.json({
        success: true,
        status: isApproved ? 'approved' : 'pending',
        paymentId: paymentId
      })
    }

    // Recupera rastreamento da memória
    const tracking = paymentTracking.get(paymentId)
    
    // Usando credenciais do CEO (tenantId = null)
    // Para Orders API, usa Order ID (começa com ORD) ou Payment ID (começa com PAY)
    const paymentDetails = await MercadoPagoService.getPaymentDetails(null, paymentId)

    // Se pagamento foi aprovado (approved ou processed), ativa o módulo automaticamente
    if ((paymentDetails.status === 'approved' || paymentDetails.status === 'processed') && tracking) {
      console.log('✅ Pagamento aprovado/processed detectado no status check. Ativando módulo automaticamente...')
      
      const { externalReference, tenantId, moduleName } = tracking
      
      console.log(`🏢 Ativando módulo ${moduleName} para tenant ${tenantId}`)
      
      try {
        await MercadoPagoService.activateModule(tenantId, moduleName)
        console.log(`✅ Módulo ${moduleName} ativado com sucesso!`)
        
        // Remove do rastreamento após ativar
        paymentTracking.delete(paymentId)
      } catch (error) {
        console.error('❌ Erro ao ativar módulo:', error.message)
      }
    }

    res.json({
      success: true,
      status: paymentDetails.status,
      paymentId: paymentDetails.id,
      externalReference: tracking?.externalReference || paymentDetails.external_reference,
      transactionAmount: paymentDetails.transaction_amount
    })
  } catch (error) {
    console.error('❌ Erro ao verificar status do pagamento:', error.message)
    res.status(500).json({
      error: 'Erro ao verificar status do pagamento',
      message: error.message
    })
  }
})

/**
 * ROTA: Aprovar pagamento simulado manualmente (apenas para pagamentos com prefixo "sim_")
 * POST /api/payments/ceo/approve/:paymentId
 */
router.post('/ceo/approve/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params

    if (!paymentId) {
      return res.status(400).json({
        error: 'paymentId é obrigatório'
      })
    }

    if (!paymentId.startsWith('sim_')) {
      return res.status(400).json({
        error: 'Apenas pagamentos simulados (iniciados com "sim_") podem ser aprovados manualmente'
      })
    }

    // Simula aprovação do pagamento
    console.log(`🧪 MODO SIMULADO: Aprovando pagamento ${paymentId} manualmente`)

    // Extrai informações do external_reference
    const timestamp = parseInt(paymentId.split('_')[1])
    const externalReference = `ceo_module_pixAutomatico_ale_${timestamp}`

    // Extrai tenantId e moduleName do external_reference
    const parts = externalReference.split('_')
    const tenantId = parts[3]
    const moduleName = parts[2]

    // Ativa o módulo no config.json
    await MercadoPagoService.activateModule(tenantId, moduleName)

    res.json({
      success: true,
      message: 'Pagamento aprovado e módulo ativado com sucesso',
      tenantId,
      moduleName
    })
  } catch (error) {
    console.error('❌ Erro ao aprovar pagamento:', error.message)
    res.status(500).json({
      error: 'Erro ao aprovar pagamento',
      message: error.message
    })
  }
})

module.exports = router