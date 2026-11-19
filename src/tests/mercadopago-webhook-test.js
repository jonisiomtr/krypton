/**
 * Script de teste do Webhook Mercado Pago
 * Simula uma notificação de pagamento aprovado
 */

const axios = require('axios')

const API_URL = 'http://localhost:4177'

// Configurações de teste
const TEST_CONFIG = {
  tenantId: 'ale', // Substitua pelo ID de um tenant existente
  orderId: 1, // Substitua por um ID de pedido existente
  paymentId: '1234567890' // ID do pagamento no Mercado Pago
}

/**
 * Simula payload do webhook Mercado Pago
 */
function createWebhookPayload(tenantId, orderId, paymentId) {
  return {
    notification_id: paymentId,
    external_reference: `${tenantId}_${orderId}`,
    data: {
      id: paymentId
    }
  }
}

/**
 * Simula payload de detalhes do pagamento (para quando o webhook busca na API)
 */
function createPaymentDetailsPayload(paymentId, amount) {
  return {
    id: paymentId,
    status: 'approved',
    transaction_amount: amount,
    external_reference: `${TEST_CONFIG.tenantId}_${TEST_CONFIG.orderId}`,
    date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    date_created: new Date().toISOString()
  }
}

/**
 * Testa o webhook
 */
async function testWebhook() {
  console.log('🧪 Iniciando teste do Webhook Mercado Pago...\n')

  const payload = createWebhookPayload(
    TEST_CONFIG.tenantId,
    TEST_CONFIG.orderId,
    TEST_CONFIG.paymentId
  )

  console.log('📬 Payload do webhook:')
  console.log(JSON.stringify(payload, null, 2))
  console.log()

  try {
    const response = await axios.post(
      `${API_URL}/payments/webhook/mercadopago`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Webhook enviado com sucesso!')
    console.log(`Status: ${response.status}`)
    console.log()

    // Aguarda um momento para o processamento
    console.log('⏳ Aguardando processamento (3 segundos)...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Verifica se o pedido foi atualizado
    console.log('🔍 Verificando se o pedido foi atualizado...')
    
    const fs = require('fs')
    const path = require('path')
    const databasePath = path.join(__dirname, `../../tenants/${TEST_CONFIG.tenantId}/database.json`)
    
    if (fs.existsSync(databasePath)) {
      const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
      const order = database.orders.find(o => o.id === TEST_CONFIG.orderId)
      
      if (order) {
        console.log('📋 Status do pedido:')
        console.log(`  ID: ${order.id}`)
        console.log(`  Status: ${order.status}`)
        console.log(`  Payment Status: ${order.paymentStatus || 'N/A'}`)
        console.log(`  Confirmed At: ${order.confirmedAt || 'N/A'}`)
        
        if (order.status === 'confirmed') {
          console.log('\n✅ SUCESSO: Pedido foi confirmado automaticamente!')
        } else {
          console.log('\n⚠️ ATENÇÃO: Pedido não foi confirmado. Verifique os logs.')
        }
      } else {
        console.log(`❌ Pedido ${TEST_CONFIG.orderId} não encontrado no database.json`)
      }
    } else {
      console.log(`❌ Database não encontrado para tenant: ${TEST_CONFIG.tenantId}`)
    }

  } catch (error) {
    console.error('❌ Erro ao enviar webhook:')
    console.error(error.response?.data || error.message)
  }
}

/**
 * Cria um pedido de teste
 */
async function createTestOrder() {
  console.log('📝 Criando pedido de teste...\n')

  const fs = require('fs')
  const path = require('path')
  const databasePath = path.join(__dirname, `../../tenants/${TEST_CONFIG.tenantId}/database.json`)
  
  let database = { orders: [], lastOrderId: 0 }
  
  if (fs.existsSync(databasePath)) {
    database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
  }

  const order = {
    id: TEST_CONFIG.orderId,
    number: '559999999999@s.whatsapp.net',
    cart: [{ id: 1, name: 'Produto Teste', price: 50 }],
    address: { type: 'text', value: 'Endereço Teste' },
    payment: 'Pix',
    paymentMethod: 'mercadopago',
    paymentId: TEST_CONFIG.paymentId,
    status: 'pending_payment',
    createdAt: Date.now()
  }

  database.orders.unshift(order)
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2))
  
  console.log('✅ Pedido de teste criado:')
  console.log(`  ID: ${order.id}`)
  console.log(`  Status: ${order.status}`)
  console.log(`  Payment ID: ${order.paymentId}`)
  console.log()
}

// Executa teste
async function run() {
  console.log('==========================================')
  console.log('   TESTE WEBHOOK MERCADO PAGO')
  console.log('==========================================\n')

  // Primeiro cria um pedido de teste
  await createTestOrder()

  // Depois testa o webhook
  await testWebhook()

  console.log('\n==========================================')
  console.log('   TESTE FINALIZADO')
  console.log('==========================================')
}

// Executa se chamado diretamente
if (require.main === module) {
  run().catch(console.error)
}

module.exports = { testWebhook, createTestOrder }
