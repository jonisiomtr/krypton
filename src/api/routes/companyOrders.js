const express = require('express')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const Database = require('../../database/Database')

const clientSockets = global.clientSockets || {}
const API_URL = process.env.API_URL || 'http://localhost:4177'

const router = express.Router()

// Helper para encontrar customerId pelo telefone
function findCustomerIdByPhone(companyId, phone) {
  try {
    const customersPath = path.join(__dirname, `../../tenants/${companyId}/customers.json`)
    if (fs.existsSync(customersPath)) {
      const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
      const customer = customers.find(c => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      return customer?.id
    }
  } catch (err) {
    console.log('Erro ao buscar customerId:', err)
  }
  return null
}

router.get(
  '/listar/orders/:companyId',
  async (req, res) => {
    try {
      const { companyId } = req.params
      const orders = Database.all(companyId, 'orders')
      return res.json({
        orders: orders || []
      })
    } catch (err) {
      console.log(err)
      return res.status(500).json({
        error: 'Erro ao carregar pedidos'
      })
    }
  }
)

//rotas de aceitar e finalizar pedidos
router.put(
  '/companies/orders/:companyId/:orderId',
  async (req, res) => {
    try {
      const { companyId, orderId } = req.params
      const { status } = req.body

      const orders = Database.all(companyId, 'orders')
      const orderIndex = orders.findIndex(o => String(o.id) === String(orderId))

      if (orderIndex === -1) {
        return res.status(404).json({
          error: 'Pedido não encontrado'
        })
      }

      const order = orders[orderIndex]
      order.status = status
      order.updatedAt = new Date().toISOString()

      // limpa comprovante após decisão
      if (status === 'confirmed' || status === 'rejected') {
        if (order.receipt) {
          try {
            const fileName = path.basename(order.receipt)
            const filePath = path.join(
              __dirname,
              `../../tenants/${companyId}/pixReceipts/${fileName}`
            )

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
              console.log('🗑 Comprovante apagado:', filePath)
            }
          } catch (err) {
            console.log('Erro ao apagar comprovante:', err)
          }
        }
        order.receipt = null
      }

      if (status === 'rejected') {
        try {
          const sock = clientSockets[companyId]
          if (sock) {
            let phone = String(order.customerPhone || order.number).replace(/\D/g, '')
            if (!phone.startsWith('55')) {
              phone = '55' + phone
            }

            await sock.sendMessage(
              `${phone}@s.whatsapp.net`,
              {
                text: `❌ COMPROVANTE REJEITADO

🆔 Pedido #${order.id}

Não conseguimos validar seu pagamento.

Por favor, envie um novo comprovante ou entre em contato com a loja.`
              }
            )
          }
        } catch (err) {
          console.log('Erro ao enviar rejeição PIX:', err)
        }
      }

      if (status === 'confirmed') {
        try {
          const sock = clientSockets[companyId]
          if (sock) {
            let phone = String(order.customerPhone || order.number).replace(/\D/g, '')
            if (!phone.startsWith('55')) {
              phone = '55' + phone
            }

            await sock.sendMessage(
              `${phone}@s.whatsapp.net`,
              {
                text: `🧾 COMPROVANTE APROVADO

🆔 Pedido #${order.id}

Seu pagamento foi confirmado com sucesso! 🎉
Estamos preparando seu pedido agora.`
              }
            )
          }
        } catch (err) {
          console.log('Erro ao enviar confirmação PIX:', err)
        }
      }

      if (status === 'accepted') {
        // Não envia notificação para pedidos de teste
        if (!order.isTest) {
          try {
            const sock = clientSockets[companyId]
            if (sock) {
              // Verificar se o pedido veio do site
              const isWebsite = order.source === 'website' || (order.customerPhone && !order.number)
              let customerPhone = isWebsite ? order.customerPhone : (order.customerPhone || order.number);

              if (customerPhone) {
                customerPhone = String(customerPhone).replace(/\D/g, '')
                if (!customerPhone.startsWith('55')) {
                  customerPhone = '55' + customerPhone
                }

                const whatsappMessage = `🎉 PEDIDO ACEITO!

🆔 Pedido #${order.id}

${isWebsite && order.customerName ? `Olá ${order.customerName}!` : ''}

Seu pedido foi aceito! ✅
Estamos preparando agora. 🚀`

                const jid = `${customerPhone}@s.whatsapp.net`
                console.log(`🔍 Enviando notificação para: ${jid}`)
                await sock.sendMessage(
                  jid,
                  {
                    text: whatsappMessage
                  }
                )
                console.log('✅ Notificação de aceitação enviada!')

                try {
                  let customerId = order.customer?.id || order.customerId
                  if (!customerId && customerPhone) {
                    customerId = findCustomerIdByPhone(companyId, customerPhone)
                  }

                  if (customerId) {
                    await axios.post(`${API_URL}/api/messages/${companyId}/message`, {
                      customerId: customerId,
                      message: whatsappMessage,
                      type: 'company'
                    })
                    console.log('✅ Notificação de aceitação enviada para chat do cliente')
                  }
                } catch (err) {
                  console.log('Erro ao enviar notificação para chat:', err)
                }
              }
            }
          } catch (err) {
            console.log('Erro ao enviar confirmação:', err)
          }
        }
      }

      if (status === 'finished' || status === 'completed') {
        // Não envia notificação para pedidos de teste
        if (!order.isTest) {
          try {
            const sock = clientSockets[companyId]
            if (sock) {
              const isWebsite = order.source === 'website' || (order.customerPhone && !order.number)
              let customerPhone = isWebsite ? order.customerPhone : (order.customerPhone || order.number);

              if (customerPhone) {
                customerPhone = String(customerPhone).replace(/\D/g, '')
                if (!customerPhone.startsWith('55')) {
                  customerPhone = '55' + customerPhone
                }

                const whatsappMessage = `🎉 PEDIDO FINALIZADO!

🆔 Pedido #${order.id}

${isWebsite && order.customerName ? `Olá ${order.customerName}!` : ''}

Seu pedido foi entregue com sucesso! ✅

Esperamos que você esteja satisfeito com o produto.

Agradecemos pela preferência! ❤️

Deixe sua avaliação nas mensagens! ⭐⭐⭐⭐⭐`

                const jid = `${customerPhone}@s.whatsapp.net`
                console.log(`🔍 Enviando notificação de finalização para: ${jid}`)
                await sock.sendMessage(
                  jid,
                  {
                    text: whatsappMessage
                  }
                )
                console.log('✅ Notificação de finalização enviada!')

                try {
                  let customerId = order.customer?.id || order.customerId
                  if (!customerId && customerPhone) {
                    customerId = findCustomerIdByPhone(companyId, customerPhone)
                  }

                  if (customerId) {
                    const chatMessage = `🎉 PEDIDO FINALIZADO!

🆔 Pedido #${order.id}

${isWebsite && order.customerName ? `Olá ${order.customerName}!` : ''}

Seu pedido foi entregue com sucesso! ✅

Esperamos que você esteja satisfeito com o produto.

Agradecemos pela preferência! ❤️

Deixe sua avaliação respondendo com estrelas (⭐⭐⭐⭐⭐)!`;

                    await axios.post(`${API_URL}/api/messages/${companyId}/message`, {
                      customerId: customerId,
                      message: chatMessage,
                      type: 'company'
                    })
                    console.log('✅ Notificação de finalização enviada para chat do cliente')
                  }
                } catch (err) {
                  console.log('Erro ao enviar notificação para chat:', err)
                }
              }
            }
          } catch (err) {
            console.log('Erro ao enviar mensagem de entrega:', err)
          }
        }
      }

      Database.write(companyId, 'orders', orders)

      return res.json({
        success: true
      })

    } catch (err) {
      console.log(err)
      return res.status(500).json({
        error: 'Erro ao atualizar pedido'
      })
    }
  }
)

// Rota para deletar pedido
router.delete(
  '/companies/orders/:companyId/:orderId',
  async (req, res) => {
    try {
      const { companyId, orderId } = req.params

      const orders = Database.all(companyId, 'orders')
      const orderIndex = orders.findIndex(o => String(o.id) === String(orderId))

      if (orderIndex === -1) {
        return res.status(404).json({
          error: 'Pedido não encontrado'
        })
      }

      orders.splice(orderIndex, 1)
      Database.write(companyId, 'orders', orders)

      return res.json({
        success: true
      })

    } catch (err) {
      console.log(err)
      return res.status(500).json({
        error: 'Erro ao remover pedido'
      })
    }
  }
)


module.exports = router
