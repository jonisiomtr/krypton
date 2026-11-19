const AsaasGateway = require('../modules/pixAutomatico/gateways/asaas')
const MercadoPagoService = require('../services/MercadoPagoService')
const fs = require('fs')
const path = require('path')

module.exports = {

  /**
   * Cria pagamento PIX universal (ASAAS ou Mercado Pago)
   * @param {object} data - { tenantId, amount, description, gateway, orderId }
   * @returns {object} - { pixCode, qrCodeUrl, paymentId, expiresAt }
   */
  async createPixPayment(data) {
    const { tenantId, amount, description, gateway = 'mercadopago', orderId } = data

    // Verifica qual gateway usar
    // Se especificado, usa o especificado
    // Se não, verifica se pixAutomatico está ativo no config
    let selectedGateway = gateway

    if (!gateway) {
      const configPath = path.join(__dirname, `../tenants/${tenantId}/config.json`)
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const hasPix = config.modules?.includes('pix') || config.modules?.includes('pixAutomatico')
        
        // Se pix está ativo e Mercado Pago conectado, usa Mercado Pago
        if (hasPix && MercadoPagoService.isConnected(tenantId)) {
          selectedGateway = 'mercadopago'
        } else {
          selectedGateway = 'asaas'
        }
      } else {
        selectedGateway = 'asaas'
      }
    }

    // Gera external_reference no formato: tenantId_orderId
    const externalReference = `${tenantId}_${orderId}`

    switch (selectedGateway) {
      case 'mercadopago':
        return await MercadoPagoService.createPixPayment(
          tenantId,
          amount,
          description,
          externalReference
        )

      case 'asaas':
        return await AsaasGateway.createPix({
          ...data,
          externalReference
        })

      default:
        throw new Error('Gateway não suportado.')
    }
  },

  /**
   * Cria pagamento PIX para o CEO (fluxo de monetização do SaaS)
   * @param {object} data - { tenantId, amount, description, moduleName }
   * @returns {object} - { pixCode, qrCodeUrl, paymentId, orderId, expiresAt }
   */
  async createCeoPayment(data) {
    const { tenantId, amount, description, moduleName } = data

    // Gera external_reference no formato: ceo_module_moduleName_tenantId_timestamp
    const timestamp = Date.now()
    const externalReference = `ceo_module_${moduleName}_${tenantId}_${timestamp}`

    // Usa Mercado Pago com credenciais globais (tenantId = null)
    const result = await MercadoPagoService.createPixPayment(
      null, // null indica uso de credenciais do CEO
      amount,
      description,
      externalReference
    )

    // Para Orders API, retorna Order ID como ID principal para status check
    return {
      ...result,
      paymentId: result.orderId || result.paymentId // Usa Order ID para status check
    }
  },

  async createPix(data) {

    const gateway =
    data.gateway || 'asaas'

    switch (gateway) {

      case 'asaas':

        return await AsaasGateway.createPix(data)

      default:

        throw new Error(
          'Gateway não suportado.'
        )

    }

  },

  async verifyPayment(data) {

    const gateway =
    data.gateway || 'asaas'

    switch (gateway) {

      case 'asaas':

        return await AsaasGateway.verifyPayment(data)

      case 'mercadopago':
        // tenantId pode ser null para pagamentos do CEO
        return await MercadoPagoService.getPaymentDetails(data.tenantId || null, data.paymentId)

      default:

        throw new Error(
          'Gateway não suportado.'
        )

    }

  },

  async cancelPayment(data) {

    const gateway =
    data.gateway || 'asaas'

    switch (gateway) {

      case 'asaas':

        return await AsaasGateway.cancelPayment(data)

      case 'mercadopago':
        return await MercadoPagoService.cancelPayment(data.tenantId, data.paymentId)

      default:

        throw new Error(
          'Gateway não suportado.'
        )

    }

  }

}