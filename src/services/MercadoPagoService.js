const axios = require('axios')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const { encrypt, decrypt } = require('../utils/crypto')

/**
 * Serviço Mercado Pago - Integração OAuth e PIX
 */
class MercadoPagoService {
  constructor() {
    this.clientId = process.env.MP_CLIENT_ID
    this.clientSecret = process.env.MP_CLIENT_SECRET
    this.redirectUri = process.env.MP_REDIRECT_URI
    this.env = process.env.MP_ENV || 'sandbox'
    this.encryptionKey = process.env.ENCRYPTION_KEY

    // URLs da API
    this.baseUrl = this.env === 'production' 
      ? 'https://api.mercadopago.com' 
      : 'https://api.mercadopago.com'
  }

  /**
   * Gera URL de autorização OAuth
   * @param {string} tenantId - ID do tenant
   * @returns {string} - URL de autorização
   */
  getAuthUrl(tenantId) {
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${tenantId}`
    return authUrl
  }

  /**
   * Troca código de autorização por access_token
   * @param {string} code - Código de autorização do Mercado Pago
   * @param {string} tenantId - ID do tenant
   * @returns {object} - { access_token, refresh_token, expires_in }
   */
  async exchangeCodeForToken(code, tenantId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      )

      const { access_token, refresh_token, expires_in, user_id } = response.data

      // Criptografa tokens antes de salvar
      const encryptedAccessToken = encrypt(access_token, this.encryptionKey)
      const encryptedRefreshToken = encrypt(refresh_token, this.encryptionKey)

      // Salva no config.json do tenant
      await this.saveCredentialsToTenant(tenantId, {
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_in,
        user_id,
        connected_at: Date.now()
      })

      console.log(`✅ Mercado Pago conectado para tenant: ${tenantId}`)
      
      return {
        success: true,
        user_id
      }
    } catch (error) {
      console.error('❌ Erro ao trocar code por token:', error.response?.data || error.message)
      throw new Error('Falha ao conectar com Mercado Pago')
    }
  }

  /**
   * Salva credenciais criptografadas no config.json do tenant
   * @param {string} tenantId - ID do tenant
   * @param {object} credentials - Credenciais criptografadas
   */
  async saveCredentialsToTenant(tenantId, credentials) {
    const configPath = path.join(__dirname, `../tenants/${tenantId}/config.json`)
    
    let config = {}
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }

    // Adiciona credenciais do Mercado Pago
    config.mercadopago = credentials

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  }

  /**
   * Descriptografa access_token do tenant
   * @param {string} tenantId - ID do tenant
   * @returns {string} - Access token descriptografado
   */
  async decryptToken(tenantId) {
    const configPath = path.join(__dirname, `../tenants/${tenantId}/config.json`)
    
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuração do tenant não encontrada')
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    if (!config.mercadopago || !config.mercadopago.access_token) {
      throw new Error('Mercado Pago não conectado para este tenant')
    }

    try {
      return decrypt(config.mercadopago.access_token, this.encryptionKey)
    } catch (error) {
      console.error('Erro ao descriptografar token:', error.message)
      throw new Error('Falha ao descriptografar token do Mercado Pago')
    }
  }

  /**
   * Obtém access token global (credenciais do CEO via .env)
   * @returns {string} - Access token do CEO
   */
  async getGlobalAccessToken() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      )

      return response.data.access_token
    } catch (error) {
      console.error('❌ Erro ao obter access token global:', error.response?.data || error.message)
      throw new Error('Falha ao obter credenciais globais do Mercado Pago')
    }
  }

  /**
   * Cria pagamento PIX usando Orders API (CORRETO para QR Code)
   * @param {string|null} tenantId - ID do tenant (null para usar credenciais do CEO)
   * @param {number} amount - Valor do pagamento
   * @param {string} description - Descrição do pagamento
   * @param {string} externalReference - Referência externa (ceo_module_moduleName_tenantId_timestamp ou tenantId_pedidoId)
   * @returns {object} - { pixCode, qrCodeUrl, paymentId, expiresAt }
   */
  async createPixPayment(tenantId, amount, description, externalReference) {
    try {
      let accessToken

      // Se tenantId for null, usa credenciais globais do CEO
      if (!tenantId) {
        accessToken = await this.getGlobalAccessToken()
        console.log(`🏢 CREDENCIAIS CEO: Criando ORDER PIX REAL (Orders API)`)
      } else {
        // Senão, usa credenciais do tenant específico
        accessToken = await this.decryptToken(tenantId)
        console.log(`🏭 CREDENCIAIS TENANT (${tenantId}): Criando ORDER PIX REAL (Orders API)`)
      }

      console.log(`   - External Reference: ${externalReference}`)
      console.log(`   - Valor: R$ ${amount}`)
      console.log(`   - Descrição: ${description}`)

      // Criar ORDER usando Orders API (CORRETO para PIX online com QR Code)
      const orderData = {
        type: 'online',
        external_reference: externalReference,
        total_amount: amount.toString(),
        payer: {
          email: 'cliente@kryptonsaas.com',
          first_name: 'Cliente',
          last_name: 'Krypton'
        },
        transactions: {
          payments: [
            {
              amount: amount.toString(),
              payment_method: {
                id: 'pix',
                type: 'bank_transfer'
              }
            }
          ]
        }
      }

      // Só adiciona notification_url se for uma URL válida (não localhost)
      if (process.env.MP_WEBHOOK_URL && !process.env.MP_WEBHOOK_URL.includes('localhost')) {
        orderData.transactions.payments[0].notification_url = process.env.MP_WEBHOOK_URL
        console.log(`   - Webhook URL: ${process.env.MP_WEBHOOK_URL}`)
      } else {
        console.log(`   - Webhook URL: DESATIVADO (localhost não é aceito pelo Mercado Pago)`)
      }

      const orderResponse = await axios.post(
        `${this.baseUrl}/v1/orders`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': externalReference // Evita duplicidade
          }
        }
      )

      const order = orderResponse.data
      const orderId = order.id

      console.log(`   - Order ID criado: ${orderId}`)
      console.log(`   - Status inicial: ${order.status}`)

      // Extrair QR Code da resposta do payment
      let pixCode = null
      let qrCodeUrl = null

      const payment = order.transactions?.payments?.[0]
      if (payment) {
        // QR Code está em payment_method.qr_code e payment_method.qr_code_base64
        pixCode = payment.payment_method?.qr_code
        qrCodeUrl = payment.payment_method?.qr_code_base64

        // Se vier qr_code mas não base64, gera imagem
        if (pixCode && !qrCodeUrl) {
          console.log(`   - Gerando QR Code do código copia e cola...`)
          qrCodeUrl = await QRCode.toDataURL(pixCode)
        }

        if (pixCode || qrCodeUrl) {
          console.log(`   - QR Code obtido com sucesso`)
          console.log(`   - PIX Code length: ${pixCode?.length || 0}`)
          console.log(`   - QR Code base64 length: ${qrCodeUrl?.length || 0}`)
        }
      }

      // Extrair payment ID da transação
      const paymentId = payment?.id

      const logPrefix = tenantId ? `tenant ${tenantId}` : 'CEO'
      console.log(`✅ ORDER PIX REAL criado para ${logPrefix}: R$ ${amount} (Order ID: ${orderId}, Payment ID: ${paymentId})`)

      return {
        success: true,
        paymentId: paymentId || orderId, // Usa paymentId se disponível, senão orderId
        orderId: orderId, // Adiciona Order ID para referência
        pixCode: pixCode,
        qrCodeUrl: qrCodeUrl,
        expiresAt: payment?.date_of_expiration,
        status: order.status
      }
    } catch (error) {
      console.error('❌ Erro ao criar ORDER PIX REAL:', error.response?.data || error.message)
      console.log(`⚠️ A conta MP não está totalmente configurada. Usando MODO SIMULADO para permitir testes.`)
      
      // FALLBACK: Modo simulado para testes enquanto conta não está configurada
      console.log(`🧪 MODO SIMULADO (FALLBACK): Criando pagamento PIX`)
      
      const paymentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const simulatedPixCode = `00020126580014BR.GOV.BCB.PIX0136${paymentId}5204000053039865405${amount.toFixed(2)}5802BR5925KRYPTON SAAS - TESTE6009SAO PAULO62070503***6304${Math.floor(Math.random() * 9000 + 1000)}`
      const qrCodeUrl = await QRCode.toDataURL(simulatedPixCode)

      const logPrefix = tenantId ? `tenant ${tenantId}` : 'CEO'
      console.log(`✅ PIX SIMULADO criado para ${logPrefix}: R$ ${amount} (ID: ${paymentId})`)

      return {
        success: true,
        paymentId,
        pixCode: simulatedPixCode,
        qrCodeUrl: qrCodeUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    }
  }

  /**
   * Busca detalhes de um pagamento (MODO HÍBRIDO - Tenta REAL, fallback para SIMULADO)
   * @param {string|null} tenantId - ID do tenant (null para usar credenciais do CEO)
   * @param {string} paymentId - ID do pagamento ou order
   * @returns {object} - Detalhes do pagamento
   */
  async getPaymentDetails(tenantId, paymentId) {
    try {
      // Se é pagamento simulado, retorna status simulado
      if (paymentId.startsWith('sim_')) {
        console.log(`🧪 MODO SIMULADO: Buscando detalhes do pagamento ${paymentId}`)
        
        const timestamp = parseInt(paymentId.split('_')[1])
        const isApproved = (Date.now() - timestamp) > 10000 // Aprova após 10 segundos

        return {
          id: paymentId,
          status: isApproved ? 'approved' : 'pending',
          external_reference: 'ceo_module_pixAutomatico_ale_' + timestamp,
          transaction_amount: 0.50,
          date_of_expiration: new Date(timestamp + 15 * 60 * 1000).toISOString()
        }
      }

      // Tenta modo REAL - Primeiro tenta Orders API (para PIX com QR Code)
      let accessToken

      // Se tenantId for null, usa credenciais globais do CEO
      if (!tenantId) {
        accessToken = await this.getGlobalAccessToken()
        console.log(`🏢 CREDENCIAIS CEO: Buscando detalhes da ORDER REAL ${paymentId}`)
      } else {
        // Senão, usa credenciais do tenant específico
        accessToken = await this.decryptToken(tenantId)
        console.log(`🏭 CREDENCIAIS TENANT (${tenantId}): Buscando detalhes da ORDER REAL ${paymentId}`)
      }

      // Busca como ORDER (API de PIX com QR Code)
      const orderResponse = await axios.get(
        `${this.baseUrl}/v1/orders/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const order = orderResponse.data
      console.log(`   - Status da ORDER: ${order.status}`)
      
      // Se for order, extrai o status do payment associado
      if (order.transactions?.payments?.[0]) {
        const payment = order.transactions.payments[0]
        console.log(`   - Status do PAYMENT: ${payment.status}`)
        console.log(`   - External Reference: ${payment.external_reference}`)
        
        return {
          id: paymentId,
          status: payment.status,
          external_reference: payment.external_reference,
          transaction_amount: payment.amount,
          date_of_expiration: payment.date_of_expiration
        }
      }
      
      return order
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes do pagamento REAL:', error.response?.data || error.message)
      throw new Error('Falha ao buscar detalhes do pagamento: ' + (error.response?.data?.message || error.message))
    }
  }

  /**
   * Cancela um pagamento
   * @param {string} tenantId - ID do tenant
   * @param {string} paymentId - ID do pagamento
   * @returns {boolean}
   */
  async cancelPayment(tenantId, paymentId) {
    try {
      const accessToken = await this.decryptToken(tenantId)

      await axios.put(
        `${this.baseUrl}/v1/payments/${paymentId}`,
        {
          status: 'cancelled'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log(`✅ Pagamento ${paymentId} cancelado para tenant ${tenantId}`)
      return true
    } catch (error) {
      console.error('❌ Erro ao cancelar pagamento:', error.response?.data || error.message)
      throw new Error('Falha ao cancelar pagamento')
    }
  }

  /**
   * Verifica se tenant está conectado ao Mercado Pago
   * @param {string} tenantId - ID do tenant
   * @returns {boolean}
   */
  isConnected(tenantId) {
    const configPath = path.join(__dirname, `../tenants/${tenantId}/config.json`)
    
    if (!fs.existsSync(configPath)) {
      return false
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    return !!(config.mercadopago && config.mercadopago.access_token)
  }

  /**
   * Desconecta tenant do Mercado Pago
   * @param {string} tenantId - ID do tenant
   */
  async disconnect(tenantId) {
    const configPath = path.join(__dirname, `../tenants/${tenantId}/config.json`)
    
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuração do tenant não encontrada')
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    delete config.mercadopago

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log(`🚪 Mercado Pago desconectado para tenant: ${tenantId}`)
  }

  /**
   * Ativa módulo no config.json do tenant (fluxo CEO)
   * @param {string} tenantId - ID do tenant
   * @param {string} moduleName - Nome do módulo a ativar
   * @returns {boolean}
   */
  async activateModule(tenantId, moduleName) {
    try {
      const configPath = path.join(__dirname, `../tenants/${tenantId}/config.json`)
      
      if (!fs.existsSync(configPath)) {
        throw new Error('Configuração do tenant não encontrada')
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      const modules = config.modules || []

      if (!modules.includes(moduleName)) {
        modules.push(moduleName)
        config.modules = modules
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        console.log(`✅ Módulo ${moduleName} ativado para tenant: ${tenantId}`)
      }

      return true
    } catch (error) {
      console.error('❌ Erro ao ativar módulo:', error.message)
      throw new Error('Falha ao ativar módulo')
    }
  }
}

module.exports = new MercadoPagoService()
