const QRCode = require('qrcode')
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const auth = require('../middlewares/auth')
const bcrypt = require('bcrypt')
const trialCheck = require('../middlewares/trialCheck')
const moduleExpiration = require('../middlewares/moduleExpiration')

const {
  startClient,
  startingClients
} = require('../../bootstrap/startClient')

const reloadClientModules = require('../../core/ReloadClientModules')
const ConnectionManager = require('../../managers/ConnectionManager')
const ClientManager = require('../../core/ClientManager')
const loadModules = require('../../core/ModuleLoader')

//aqui2 qrcod
const { sessions } = require( '../../store/sessions' )

// LISTAR EMPRESAS
router.get(
  '/',
  auth,
  (req, res) => {
    const tenantsPath = path.join(__dirname, '../../tenants')
    const companies = fs.readdirSync(tenantsPath)

    const formatted = companies.map(
      company => {
        const configPath = path.join(tenantsPath, company, 'config.json')
        let status = 'offline'

        // Verificar status no config.json primeiro
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
          if (config.status === 'suspended') {
            status = 'suspended'
          }
        }

        // Se não estiver suspensa, verificar status da sessão
        if (status !== 'suspended') {
          const session = sessions[company]
          if (session?.connected) {
            status = 'online'
          } else if (session?.qr) {
            status = 'pending'
          }
        }

        return {
          id: company,
          status
        }
      }
    )

    return res.json(formatted)
  }
)

// DETALHES EMPRESA
router.get(
  '/:id',
  auth,
  (req, res) => {
    const companyId = req.params.id
    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath))
    return res.json(config)
  }
)

// CRIAR EMPRESA
router.post(
  '/',
  auth,
  async (req, res) => {
    // SOMENTE ADMIN
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        error: 'Sem permissão'
      })
    }

    const {
      id,
      name,
      password,
      adminNumber,
      pixKey,
      pixHolder,
      trialDays // Campo opcional para teste personalizado (1, 2, 3, 4 dias ou 30 para 1 mês)
    } = req.body

    if (!id || !name || !password) {
      return res.status(400).json({
        error: 'Dados obrigatórios'
      })
    }

    const tenantPath = path.join(__dirname, `../../tenants/${id}`)

    // EMPRESA EXISTE
    if (fs.existsSync(tenantPath)) {
      return res.status(400).json({
        error: 'Empresa já existe'
      })
    }

    // HASHEAR SENHA
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // CRIAR PASTA
    fs.mkdirSync(tenantPath)

    // LOGO DAS IMAGENS
    const logoPath = path.join(__dirname, `../../uploads/${id}`)

    // CRIAR PASTA de LOGOS
    if (!fs.existsSync(logoPath)) {
      fs.mkdirSync(logoPath)
    }

    // CONFIG
    // Se trialDays for informado e > 0, ativar todos os módulos com expiração
    let modules = []
    let moduleExpirations = {}

    if (trialDays && trialDays > 0) {
      // Todos os módulos disponíveis
      const allModules = ['assistant', 'delivery', 'scheduling', 'catalog', 'pdv_caixa', 'qrcode', 'pix', 'webagendamento', 'website']
      modules = allModules

      // Calcular expiração para cada módulo
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + trialDays)

      allModules.forEach(module => {
        moduleExpirations[module] = trialEndDate.toISOString()
      })

      console.log(`✅ Empresa ${id} criada com ${trialDays} dias de teste em todos os módulos`)
    }

    fs.writeFileSync(
      path.join(tenantPath, 'config.json'),
      JSON.stringify({
        id,
        name,
        password: passwordHash,
        cnpj: '',
        modules,
        moduleExpirations,
        adminNumber: `${adminNumber.replace(/\D/g, '')}@s.whatsapp.net`,
        pix: {
          key: pixKey || null,
          holder: pixHolder || null
        }
      }, null, 2)
    )

    // DATABASE
    fs.writeFileSync(
      path.join(tenantPath, 'database.json'),
      JSON.stringify({
        orders: [],
        appointments: []
      }, null, 2)
    )

    // CUSTOMERS (multi-tenancy)
    fs.writeFileSync(
      path.join(tenantPath, 'customers.json'),
      JSON.stringify([], null, 2)
    )

    // MESSAGES (chat system)
    fs.writeFileSync(
      path.join(tenantPath, 'messages.json'),
      JSON.stringify([], null, 2)
    )

    // PRODUCTS
    fs.writeFileSync(
      path.join(tenantPath, 'products.json'),
      '[]'
    )

    // SERVICES
    fs.writeFileSync(
      path.join(tenantPath, 'services.json'),
      '[]' //base {"id": 1,"name":"cabelo","price": 12}
    )

    // PROFESSIONALS (para webagendamento)
    fs.writeFileSync(
      path.join(tenantPath, 'professionals.json'),
      '[]'
    )

    // SCHEDULE
    fs.writeFileSync(
      path.join(tenantPath, 'schedule.json'),
      JSON.stringify({
        open: '08:00',
        close: '18:00',
        interval: 60
      }, null, 2)
    )

    // INICIAR CLIENTE (não pode quebrar a criação)
    try {
      await startClient(id)
    } catch (err) {
      console.log('StartClient falhou, mas empresa foi criada:', err.message)
    }

    // Criar website.json com estrutura padrão
    const defaultWebsiteConfig = {
      enabled: true,
      theme: 'modern',
      customDomain: null,
      seo: {
        title: name || 'Site da Empresa',
        description: 'Site oficial da empresa',
        keywords: ''
      },
      hero: {
        title: name || 'Nome da Empresa',
        subtitle: 'Melhores produtos e serviços para você',
        imageUrl: '',
        showLogo: true
      },
      about: {
        enabled: true,
        title: 'Sobre Nós',
        content: 'Somos uma empresa dedicada a oferecer os melhores produtos e serviços.'
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#10b981',
        background: '#0f172a',
        text: '#ffffff'
      },
      features: {
        showPrices: true,
        showCategories: true,
        showWhatsAppButton: true,
        whatsappNumber: adminNumber?.replace('@s.whatsapp.net', '') || ''
      },
      social: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: ''
      }
    }

    fs.writeFileSync(
      path.join(tenantPath, 'website.json'),
      JSON.stringify(defaultWebsiteConfig, null, 2)
    )

    // Criar webagendamento.json com estrutura padrão
    const defaultWebagendamentoConfig = {
      enabled: true,
      theme: 'modern',
      customDomain: null,
      hero: {
        title: name || 'Agendamento Online',
        subtitle: 'Agende seu horário de forma rápida e fácil',
        imageUrl: '',
        showLogo: true
      },
      colors: {
        primary: '#e0a96d',
        secondary: '#c59257',
        accent: '#c59257',
        background: '#121212',
        text: '#e0a96d'
      },
      features: {
        showPrices: true,
        showProfessionals: true,
        showWhatsAppButton: true,
        whatsappNumber: adminNumber?.replace('@s.whatsapp.net', '') || '',
        requirePayment: false,
        requireDeposit: false,
        depositAmount: 0
      },
      social: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: ''
      },
      businessHours: {
        enableForAllDays: true,
        hours: {
          "0": { "enabled": false, "open": "09:00", "close": "18:00" },
          "1": { "enabled": true, "open": "09:00", "close": "18:00" },
          "2": { "enabled": true, "open": "09:00", "close": "18:00" },
          "3": { "enabled": true, "open": "09:00", "close": "18:00" },
          "4": { "enabled": true, "open": "09:00", "close": "18:00" },
          "5": { "enabled": true, "open": "09:00", "close": "18:00" },
          "6": { "enabled": true, "open": "09:00", "close": "14:00" }
        }
      },
      notifications: {
        confirmation: true,
        reminder24h: true,
        reminder2h: true
      }
    }

    fs.writeFileSync(
      path.join(tenantPath, 'webagendamento.json'),
      JSON.stringify(defaultWebagendamentoConfig, null, 2)
    )

    // Criar assinatura de teste personalizado (se especificado)
    if (trialDays && trialDays > 0) {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + trialDays)

      const trialSubscription = {
        tenantId: id,
        planId: 'base',
        planName: `Base (Teste Personalizado - ${trialDays} dias)`,
        price: 0,
        modules, // Inclui todos os módulos com expiração
        moduleExpirations, // Inclui expirações de cada módulo
        status: 'trial',
        startDate: new Date().toISOString(),
        endDate: null,
        trialEndsAt: trialEndDate.toISOString(),
        createdAt: new Date().toISOString()
      }

      fs.writeFileSync(
        path.join(tenantPath, 'subscription.json'),
        JSON.stringify(trialSubscription, null, 2)
      )

      console.log(`✅ Teste personalizado de ${trialDays} dias criado para tenant ${id} com todos os módulos ativos`)
    }

    return res.json({
      success: true,
      message: 'Empresa criada com sucesso.'
    })
  }
)

// ATUALIZAR EMPRESA
router.put('/:id', auth, async (req, res) => {
  try {
    const companyId = req.params.id

    const {
      name,
      password,
      adminNumber,
      pixKey,
      pixHolder,
      agentName,
      welcomeMessage
    } = req.body

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath))

    // Se for admin, pode atualizar campos sensíveis
    if (req.user.type === 'admin') {
      if (name) config.name = name
      if (adminNumber) config.adminNumber = `${adminNumber.replace(/\D/g, '')}@s.whatsapp.net`
      if (pixKey) config.pix.key = pixKey
      if (pixHolder) config.pix.holder = pixHolder

      // Se fornecida nova senha, hashear
      if (password) {
        const saltRounds = 10
        config.password = await bcrypt.hash(password, saltRounds)
      }
    }

    // Qualquer usuário (admin ou company) pode atualizar configurações do agente
    if (agentName !== undefined) config.agentName = agentName
    if (welcomeMessage !== undefined) config.welcomeMessage = welcomeMessage

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    return res.json({
      success: true,
      message: 'Empresa atualizada com sucesso'
    })
  } catch (err) {
    console.log('Erro ao atualizar empresa:', err)
    return res.status(500).json({
      error: 'Erro interno ao atualizar empresa'
    })
  }
})

// WHATSAPP STATUS - Verificar status da conexão
router.get('/:id/whatsapp/status', auth, (req, res) => {
  try {
    const companyId = req.params.id
    
    // Usar ConnectionManager para pegar a conexão
    const connection = ConnectionManager.get(companyId)
    
    const isConnected = connection && connection.connected
    
    console.log(`📡 Status WhatsApp ${companyId}:`, isConnected ? 'Online' : 'Offline')
    
    res.json({
      connected: isConnected
    })
  } catch (err) {
    console.log('Erro ao verificar status WhatsApp:', err)
    res.json({
      connected: false
    })
  }
})

// QR CODE
router.get(
  '/:id/qr',
  auth,
  (req, res) => {
    const companyId = req.params.id
    const session = sessions[companyId]

    console.log(`📱 Buscando QR para ${companyId}, session existe:`, !!session)

    if (!session) {
      return res.json({
        connected: false,
        qr: null,
        pairingCode: null,
        message: 'Cliente não iniciado'
      })
    }

    if (session.connected) {
      return res.json({
        connected: true
      })
    }

    // Se não tiver QR, retorna null
    if (!session.qr) {
      return res.json({
        connected: false,
        qr: null,
        pairingCode: session?.pairingCode || null,
        message: 'Aguardando QR Code...'
      })
    }

    // Se já tiver data URL, retorna direto
    if (session.qrDataUrl) {
      return res.json({
        connected: false,
        qr: session.qrDataUrl,
        pairingCode: session?.pairingCode || null
      })
    }

    // Converte QR para data URL
    QRCode.toDataURL(
      session.qr,
      (err, url) => {
        return res.json({
          connected: false,
          qr: url,
          pairingCode: session?.pairingCode || null
        })
      }
    )
  }
)

// DELETAR EMPRESA
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    
    // SOMENTE ADMIN
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        error: 'Sem permissão'
      })
    }

    const tenantPath = path.join(__dirname, `../../tenants/${companyId}`)

    // EMPRESA NÃO EXISTE
    if (!fs.existsSync(tenantPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    // Parar conexão WhatsApp se existir
    const existingSock = global.clientSockets[companyId]
    if (existingSock) {
      try {
        existingSock.ev.removeAllListeners()
        existingSock.ws.close()
      } catch (err) {
        console.log('Erro ao parar socket:', err)
      }
      delete global.clientSockets[companyId]
    }

    // Deletar sessão
    if (sessions[companyId]) {
      delete sessions[companyId]
    }

    // Remover do ConnectionManager
    ConnectionManager.remove(companyId)

    // Deletar pasta da empresa
    fs.rmSync(tenantPath, { recursive: true, force: true })

    // Deletar pasta de uploads se existir
    const uploadPath = path.join(__dirname, `../../uploads/${companyId}`)
    if (fs.existsSync(uploadPath)) {
      fs.rmSync(uploadPath, { recursive: true, force: true })
    }

    // Deletar sessão do WhatsApp se existir
    const sessionPath = path.join(__dirname, `../../../sessions/${companyId}`)
    console.log(`🔍 Verificando sessão WhatsApp: ${sessionPath}`)
    console.log(`🔍 Sessão existe: ${fs.existsSync(sessionPath)}`)
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true })
      console.log(`✅ Sessão WhatsApp deletada: ${sessionPath}`)
    } else {
      console.log(`⚠️ Sessão WhatsApp não encontrada`)
    }

    // Deletar arquivo de sessionData se existir
    const sessionDataPath = path.join(__dirname, `../../../sessionsData/${companyId}.json`)
    console.log(`🔍 Verificando sessionData: ${sessionDataPath}`)
    console.log(`🔍 SessionData existe: ${fs.existsSync(sessionDataPath)}`)
    if (fs.existsSync(sessionDataPath)) {
      fs.unlinkSync(sessionDataPath)
      console.log(`✅ SessionData deletado: ${sessionDataPath}`)
    } else {
      console.log(`⚠️ SessionData não encontrado`)
    }

    console.log(`✅ Empresa ${companyId} deletada com sucesso`)

    return res.json({
      success: true,
      message: 'Empresa deletada com sucesso'
    })
  } catch (err) {
    console.log('Erro ao deletar empresa:', err)
    return res.status(500).json({
      error: 'Erro interno ao deletar empresa'
    })
  }
})

// MANUAL MODE CONTROL
router.post('/:id/manual-mode', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const { jid, enabled } = req.body

    const SessionManager = require('../../core/SessionManager')

    if (enabled) {
      SessionManager.setManualMode(companyId, jid, 'current-agent')
    } else {
      SessionManager.unsetManualMode(companyId, jid)
    }

    res.json({
      success: true,
      manualMode: enabled
    })
  } catch (err) {
    console.log('Erro ao controlar modo manual:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// GET MANUAL MODE STATUS
router.get('/:id/manual-mode/:jid', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const { jid } = req.params

    const SessionManager = require('../../core/SessionManager')
    const isManual = SessionManager.isManualMode(companyId, jid)
    const info = SessionManager.getManualModeInfo(companyId, jid)

    res.json({
      manualMode: isManual,
      info
    })
  } catch (err) {
    console.log('Erro ao verificar modo manual:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// GET MODULES
router.get('/:id/modules', auth, trialCheck, moduleExpiration, (req, res) => {
  try {
    const companyId = req.params.id
    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    // Se for SuperAdmin, sempre retorna os módulos do config.json (controle total)
    if (req.user.type === 'admin') {
      return res.json({
        modules: config.modules || []
      })
    }

    // Verificar se está no período de teste
    const subscriptionPath = path.join(
      __dirname,
      `../../tenants/${companyId}/subscription.json`
    )

    let modules = config.modules || []

    if (fs.existsSync(subscriptionPath)) {
      const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))

      // Se está no período de teste, retorna os módulos do config.json (vazios por padrão)
      if (subscription.status === 'trial' && subscription.trialEndsAt) {
        const trialEndDate = new Date(subscription.trialEndsAt)
        const now = new Date()

        if (now < trialEndDate) {
          // Ainda no teste - retorna módulos do config.json (SuperAdmin pode ativar manualmente)
          modules = config.modules || []
        } else {
          // Teste expirado - retorna apenas módulos do config (plano atual)
          modules = config.modules || []
        }
      } else if (subscription.status === 'active') {
        // Assinatura ativa - retorna módulos do plano
        modules = subscription.modules || config.modules || []
      }
    }

    return res.json({
      modules
    })
  } catch (err) {
    console.log('Erro ao carregar módulos:', err)
    return res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// BUSCAR MODULOS DA EMPRESA (rota alternativa)
router.get('/modules/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const configPath = path.join(
      __dirname,
      `../../tenants/${companyId}/config.json`
    )

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(
      fs.readFileSync(
        configPath,
        'utf-8'
      )
    )

    // Verificar se é SuperAdmin pelo token (se existir)
    const authHeader = req.headers.authorization
    let isAdmin = false

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        isAdmin = payload.type === 'admin'
      } catch (err) {
        // Token inválido, não é admin
      }
    }

    // Se for SuperAdmin, sempre retorna os módulos do config.json (controle total)
    if (isAdmin) {
      return res.json({
        modules: config.modules || [],
        moduleExpirations: config.moduleExpirations || {}
      })
    }

    // Verificar se está no período de teste
    const subscriptionPath = path.join(
      __dirname,
      `../../tenants/${companyId}/subscription.json`
    )

    let modules = config.modules || []

    if (fs.existsSync(subscriptionPath)) {
      const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))

      // Se está no período de teste, retorna os módulos do config.json (vazios por padrão)
      if (subscription.status === 'trial' && subscription.trialEndsAt) {
        const trialEndDate = new Date(subscription.trialEndsAt)
        const now = new Date()

        if (now < trialEndDate) {
          // Ainda no teste - retorna módulos do config.json (SuperAdmin pode ativar manualmente)
          modules = config.modules || []
        } else {
          // Teste expirado - retorna apenas módulos do config (plano atual)
          modules = config.modules || []
        }
      } else if (subscription.status === 'active') {
        // Assinatura ativa - retorna módulos do plano
        modules = subscription.modules || config.modules || []
      }
    }

    return res.json({
      modules,
      moduleExpirations: config.moduleExpirations || {}
    })

  } catch (err) {
    console.log(err)
    return res.status(500).json({
      error:
      'Erro interno'
    })
  }
})

// TOGGLE MODULE
router.post('/:id/modules', auth, trialCheck, async (req, res) => {
  try {
    const companyId = req.params.id
    const { moduleName, action, days } = req.body

    if (!moduleName || !action) {
      return res.status(400).json({
        error: 'Dados obrigatórios'
      })
    }

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const modules = config.modules || []
    const moduleExpirations = config.moduleExpirations || {}

    if (action === 'enable') {
      if (!modules.includes(moduleName)) {
        modules.push(moduleName)
      }

      // Se ativou o módulo qrcode, também ativar o assistant automaticamente
      if (moduleName === 'qrcode' && !modules.includes('assistant')) {
        modules.push('assistant')
        console.log(`✅ Módulo assistant ativado automaticamente junto com qrcode para ${companyId}`)
      }

      // Se foi especificado dias de expiração (SuperAdmin)
      if (days && days > 0 && req.user.type === 'admin') {
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + days)
        moduleExpirations[moduleName] = expirationDate.toISOString()
        // Se ativou qrcode, também expirar o assistant
        if (moduleName === 'qrcode') {
          moduleExpirations['assistant'] = expirationDate.toISOString()
        }
        console.log(`✅ Módulo ${moduleName} expirará em ${days} dias para ${companyId}`)
      }

      // Se for o módulo website, inicializa a configuração
      if (moduleName === 'website') {
        const websiteConfigPath = path.join(
          __dirname,
          `../../tenants/${companyId}/website.json`
        )

        if (!fs.existsSync(websiteConfigPath)) {
          const defaultConfig = {
            enabled: true,
            theme: 'modern',
            customDomain: null,
            seo: {
              title: config.displayName || config.name || 'Site da Empresa',
              description: config.description || 'Site oficial da empresa',
              keywords: ''
            },
            hero: {
              title: config.displayName || config.name || 'Nome da Empresa',
              subtitle: 'Melhores produtos e serviços para você',
              showLogo: true
            },
            about: {
              enabled: true,
              title: 'Sobre Nós',
              content: config.description || 'Somos uma empresa dedicada a oferecer os melhores produtos e serviços.'
            },
            colors: {
              primary: '#3b82f6',
              secondary: '#8b5cf6',
              accent: '#10b981',
              background: '#0f172a',
              text: '#ffffff'
            },
            features: {
              showPrices: true,
              showCategories: true,
              showWhatsAppButton: true,
              whatsappNumber: config.phone || ''
            },
            social: {
              facebook: '',
              instagram: '',
              twitter: '',
              linkedin: ''
            }
          }

          fs.writeFileSync(
            websiteConfigPath,
            JSON.stringify(defaultConfig, null, 2)
          )

          console.log(`✅ Website configurado para empresa: ${companyId}`)
        }
      }

      // Recarrega módulos do cliente
      try {
        const reloadClientModules = require('../../core/ReloadClientModules')
        reloadClientModules(companyId)
      } catch (err) {
        console.log('Erro ao recarregar módulos:', err)
      }

      // Se ativou o módulo assistant (diretamente ou via qrcode), forçar reinício do cliente
      if (moduleName === 'assistant' || moduleName === 'qrcode') {
        try {
          const { startClient } = require('../../bootstrap/startClient')
          console.log(`🔄 Reiniciando cliente ${companyId} para gerar QR Code...`)
          startClient(companyId, true) // force = true
        } catch (err) {
          console.log('Erro ao reiniciar cliente:', err)
        }
      }

    } else if (action === 'disable') {
      const index = modules.indexOf(moduleName)
      if (index > -1) {
        modules.splice(index, 1)
      }

      // Remove expiração do módulo
      delete moduleExpirations[moduleName]

      // Se desativou o módulo qrcode, também desativar o assistant automaticamente
      if (moduleName === 'qrcode') {
        const assistantIndex = modules.indexOf('assistant')
        if (assistantIndex > -1) {
          modules.splice(assistantIndex, 1)
          delete moduleExpirations['assistant']
          console.log(`✅ Módulo assistant desativado automaticamente junto com qrcode para ${companyId}`)
        }
      }

      // Se for o módulo website, desativa
      if (moduleName === 'website') {
        const websiteConfigPath = path.join(
          __dirname,
          `../../tenants/${companyId}/website.json`
        )

        if (fs.existsSync(websiteConfigPath)) {
          const websiteConfig = JSON.parse(fs.readFileSync(websiteConfigPath))
          websiteConfig.enabled = false
          fs.writeFileSync(websiteConfigPath, JSON.stringify(websiteConfig, null, 2))
          console.log(`🚫 Website desativado para empresa: ${companyId}`)
        }
      }

      // Recarrega módulos do cliente (para qrcode/assistant ou website)
      try {
        const reloadClientModules = require('../../core/ReloadClientModules')
        reloadClientModules(companyId)
      } catch (err) {
        console.log('Erro ao recarregar módulos:', err)
      }
    }

    config.modules = modules
    config.moduleExpirations = moduleExpirations
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Se for SuperAdmin, também atualiza o subscription.json para manter sincronia
    if (req.user.type === 'admin') {
      const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
      if (fs.existsSync(subscriptionPath)) {
        const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
        subscription.modules = modules
        subscription.moduleExpirations = moduleExpirations
        subscription.updatedByAdmin = true
        subscription.updatedAt = new Date().toISOString()
        fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))
        console.log(`✅ Módulos sincronizados com subscription.json por SuperAdmin: ${companyId}`)
      }
    }

    return res.json({
      success: true,
      modules,
      moduleExpirations,
      websiteUrl: modules.includes('website') ? `${req.protocol}://${req.get('host')}/site/${companyId}` : null
    })
  } catch (err) {
    console.log('Erro ao alterar módulo:', err)
    return res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ATIVAR TESTE GRÁTIS DO MÓDULO (apenas SuperAdmin)
router.post('/:id/modules/trial', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const { moduleName, trialDays } = req.body

    // Apenas SuperAdmin pode ativar teste grátis
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        error: 'Apenas SuperAdmin pode ativar teste grátis'
      })
    }

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    // Verificar se o módulo já está ativo
    if (config.modules.includes(moduleName)) {
      return res.status(400).json({
        error: 'Módulo já está ativo'
      })
    }

    // Calcular data de expiração do teste
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + trialDays)

    // Inicializar moduleExpirations se não existir
    if (!config.moduleExpirations) {
      config.moduleExpirations = {}
    }

    // Adicionar módulo com expiração
    config.modules.push(moduleName)
    config.moduleExpirations[moduleName] = trialEndDate.toISOString()

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Atualizar subscription.json se existir
    const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
    if (fs.existsSync(subscriptionPath)) {
      const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
      subscription.modules = config.modules
      subscription.moduleExpirations = config.moduleExpirations
      subscription.updatedByAdmin = true
      subscription.updatedAt = new Date().toISOString()
      fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))
    }

    console.log(`✅ Teste grátis de ${trialDays} dias ativado para módulo ${moduleName} da empresa ${companyId}`)

    return res.json({
      success: true,
      message: `Teste grátis de ${trialDays} dias ativado`,
      moduleExpirations: config.moduleExpirations
    })
  } catch (err) {
    console.log('Erro ao ativar teste grátis:', err)
    return res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// WHATSAPP CHATS - Listar conversas recentes
router.get('/:id/whatsapp/chats', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    
    console.log(`🔍 Buscando conversas para empresa: ${companyId}`)
    console.log(`📦 ChatsStore disponível:`, !!global.chatsStore)
    console.log(`📦 Chats da empresa:`, global.chatsStore ? Object.keys(global.chatsStore[companyId] || {}).length : 0)
    
    // Verificar conexão usando sessions (mesmo método do QR)
    const session = sessions[companyId]
    if (!session || !session.connected) {
      console.log(`❌ WhatsApp não conectado para empresa: ${companyId}`)
      return res.status(404).json({
        error: 'WhatsApp não conectado'
      })
    }
    
    // Usar o armazenamento global de conversas
    const chatsStore = global.chatsStore || {}
    const clientChats = chatsStore[companyId] || {}
    
    console.log(`💬 Conversas encontradas:`, Object.keys(clientChats).length)
    
    // Converter objeto de conversas em array e formatar
    const chatsArray = Object.values(clientChats).map(chat => ({
      id: chat.id,
      name: chat.name || chat.id.split('@')[0],
      jid: chat.id,
      lastMessage: chat.lastMessage?.messageStubType ? '📎 Mídia' : (chat.lastMessage?.conversation || ''),
      timestamp: chat.lastMessage?.epochTimestamp || chat.timestamp,
      unreadCount: chat.unreadCount || 0
    }))
    
    // Ordenar por timestamp (mais recentes primeiro)
    chatsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    
    // Retornar últimas 50 conversas
    const formattedChats = chatsArray.slice(0, 50)

    console.log(`✅ Retornando ${formattedChats.length} conversas`)

    res.json({
      chats: formattedChats
    })
  } catch (err) {
    console.log('Erro ao buscar conversas WhatsApp:', err)
    res.status(500).json({
      error: 'Erro ao buscar conversas'
    })
  }
})

// WHATSAPP MESSAGES - Buscar histórico de mensagens de um chat
router.get('/:id/whatsapp/messages/:jid', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const { jid } = req.params
    
    console.log(`🔍 Buscando mensagens para chat: ${jid}`)
    
    // Usar o armazenamento global de mensagens
    const messagesStore = global.messagesStore || {}
    const clientMessages = messagesStore[companyId] || {}
    const chatMessages = clientMessages[jid] || []
    
    // Verificar se o WhatsApp está conectado
    const connection = ConnectionManager.get(companyId)
    if (!connection || !connection.connected) {
      console.log(`❌ WhatsApp não conectado para empresa: ${companyId}`)
      return res.status(404).json({
        error: 'WhatsApp não conectado'
      })
    }
    
    console.log(`💬 Mensagens encontradas:`, chatMessages.length)
    
    // Formatar mensagens
    const formattedMessages = chatMessages.map(msg => ({
      id: msg.key.id,
      fromMe: msg.key.fromMe,
      from: msg.key.remoteJid,
      timestamp: msg.messageTimestamp,
      text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '📎 Mídia',
      type: msg.message?.conversation ? 'text' : 'media'
    }))

    res.json({
      messages: formattedMessages
    })
  } catch (err) {
    console.log('Erro ao buscar mensagens WhatsApp:', err)
    res.status(500).json({
      error: 'Erro ao buscar mensagens'
    })
  }
})

// WHATSAPP SEND - Enviar mensagem via WhatsApp
router.post('/:id/whatsapp/send', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const { jid, message } = req.body
    
    console.log(`📤 Enviando mensagem para: ${jid}`)
    
    // Usar ConnectionManager para pegar a conexão
    const connection = ConnectionManager.get(companyId)
    
    if (!connection || !connection.connected) {
      console.log(`❌ WhatsApp não conectado para empresa: ${companyId}`)
      return res.status(404).json({
        error: 'WhatsApp não conectado'
      })
    }

    if (!jid || !message) {
      return res.status(400).json({
        error: 'jid e message são obrigatórios'
      })
    }

    const sock = connection.sock

    // Enviar mensagem
    await sock.sendMessage(jid, { text: message })
    console.log(`✅ Mensagem enviada com sucesso`)

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso'
    })
  } catch (err) {
    console.log('Erro ao enviar mensagem WhatsApp:', err)
    res.status(500).json({
      error: 'Erro ao enviar mensagem'
    })
  }
})

// WHATSAPP TEST CHAT - Chat de teste da IA (usando arquitetura real do WhatsApp)
router.post('/:id/whatsapp/test-chat', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const { message } = req.body

    console.log(`🧪 Test chat message from ${companyId}: ${message}`)

    // Carregar config da empresa
    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Empresa não encontrada' })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const modules = loadModules(config.modules || [])

    // Verificar se o módulo assistant está ativo
    const assistantModule = modules.find(m => m.name === 'assistant')
    if (!assistantModule || !assistantModule.events || !assistantModule.events.onMessage) {
      return res.status(400).json({
        error: 'Módulo assistant não está ativo. Ative o módulo WhatsApp para usar o chat de teste.'
      })
    }

    // USAR SESSIONMANAGER REAL
    const SessionManager = require('../../core/SessionManager')
    const testSenderId = 'test_user_' + companyId  // Sender único para teste

    // Criar mock message
    const mockMessage = {
      key: {
        remoteJid: testSenderId + '@s.whatsapp.net',
        fromMe: false
      },
      message: {
        conversation: message
      }
    }

    // Criar client object
    const client = {
      id: companyId,
      config: config,
      modules: modules
    }

    // Criar mock sock que captura todas as mensagens (incluindo sendWelcome)
    const responses = []
    const mockSock = {
      sendMessage: async (to, content) => {
        let text
        if (content.image) {
          text = content.caption || '[Imagem]'
        } else if (content.text) {
          text = content.text
        } else {
          text = '[Mídia]'
        }
        console.log('💬 Captured sock.sendMessage:', text.substring(0, 50) + '...')
        responses.push(text)
        return { text, type: 'text' }
      },
      sendPresenceUpdate: async () => {
        // Ignorar presença no teste
      }
    }

    // CRIAR CONTEXT REAL
    const Context = require('../../core/Context')
    const ctx = new Context({ sock: mockSock, message: mockMessage, client })

    // Sobrescrever ctx.reply para capturar sem chamar o original (evita sendHumanMessage)
    ctx.reply = async (text) => {
      console.log('💬 Captured ctx.reply:', text.substring(0, 50) + '...')
      responses.push(text)
      return { text, type: 'text' }  // Retornar mock response sem chamar originalReply
    }

    // USAR O MESMO LOOP DO MESSAGES.JS
    const FlowManager = require('../../core/FlowManager')
    let responded = false

    const sortedModules = modules.sort((a, b) => (a.priority || 0) - (b.priority || 0))
    console.log('📦 Sorted modules:', sortedModules.map(m => m.name))

    for (const module of sortedModules) {
      if (!FlowManager.canExecute(module, ctx)) {
        console.log(`⏭️ Skipping ${module.name} (flow mismatch)`)
        continue
      }

      console.log(`🚀 Executing ${module.name}`)
      const result = await module.events?.onMessage?.(ctx)

      if (ctx.goto) {
        console.log(`🔄 gotoFlow to: ${ctx.goto}`)
        const next = sortedModules.find(m => m.name === ctx.goto)
        if (next?.events?.onMessage) {
          ctx.goto = null
          await next.events.onMessage(ctx)
        }
        break
      }

      if (result === false) break
      responded = true
    }

    console.log(`✅ Test chat processed. Responses: ${responses.length}, Current flow: ${ctx.session.flow}, step: ${ctx.session.step}`)

    res.json({
      success: true,
      response: responses[responses.length - 1] || null,
      session: ctx.session
    })
  } catch (err) {
    console.log('Erro ao processar chat de teste:', err)
    res.status(500).json({
      error: 'Erro ao processar chat de teste'
    })
  }
})

// Limpar sessão de teste (usando SessionManager real)
router.delete('/:id/whatsapp/test-chat/session', auth, (req, res) => {
  try {
    const companyId = req.params.id
    const SessionManager = require('../../core/SessionManager')

    // Carregar sessões
    const sessions = SessionManager.load(companyId)

    // Remover apenas a sessão de teste
    const testSenderId = 'test_user_' + companyId
    if (sessions[testSenderId]) {
      delete sessions[testSenderId]
      SessionManager.save(companyId, sessions)
      console.log(`🗑️ Test session cleared for ${companyId}`)
    }

    res.json({ success: true })
  } catch (err) {
    console.log('Erro ao limpar sessão de teste:', err)
    res.status(500).json({ error: 'Erro ao limpar sessão' })
  }
})

// METRICS ENDPOINT - Analytics Dashboard
router.get('/:id/metrics', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    const range = req.query.range || '1d' // Default to today
    const customDate = req.query.date // YYYY-MM-DD format for custom range

    const tenantPath = path.join(__dirname, `../../tenants/${companyId}`)

    // Load products
    const productsPath = path.join(tenantPath, 'products.json')
    let products = []
    if (fs.existsSync(productsPath)) {
      products = JSON.parse(fs.readFileSync(productsPath, 'utf8'))
    }

    // Load orders
    const databasePath = path.join(tenantPath, 'database.json')
    let orders = []
    if (fs.existsSync(databasePath)) {
      const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'))
      orders = database.orders || []
    }

    // Load customers
    const customersPath = path.join(tenantPath, 'customers.json')
    let customers = []
    if (fs.existsSync(customersPath)) {
      customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    }

    // Calculate date range
    const now = new Date()
    let startDate
    let endDate = now

    if (range === 'custom' && customDate) {
      startDate = new Date(customDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(customDate)
      endDate.setHours(23, 59, 59, 999)
    } else {
      const daysAgo = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      }[range] || 7

      startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    }

    // Filter orders by date range
    const ordersInRange = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= startDate && orderDate <= endDate
    })

    // Calculate today's metrics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= today
    })

    // Retorna os dados processados das métricas
    return res.json({
      range,
      totalOrdersInRange: ordersInRange.length,
      todayOrdersCount: todayOrders.length,
      totalProducts: products.length,
      totalCustomers: customers.length,
      orders: ordersInRange
    })

  } catch (err) {
    console.log('Erro ao carregar métricas:', err)
    return res.status(500).json({
      error: 'Erro interno ao processar métricas'
    })
  }
})

// SUSPENDER CONTA (SuperAdmin)
router.post('/:id/suspend', auth, async (req, res) => {
  try {
    const companyId = req.params.id
    console.log(`🔒 Tentando suspender conta: ${companyId}`)

    // SOMENTE ADMIN
    if (req.user.type !== 'admin') {
      console.log('❌ Sem permissão para suspender')
      return res.status(403).json({
        error: 'Sem permissão'
      })
    }

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      console.log('❌ Empresa não encontrada')
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    console.log(`📋 Status atual: ${config.status}`)

    // Suspender conta
    config.status = 'suspended'
    config.suspendedAt = new Date().toISOString()
    config.suspendedReason = 'Período de teste expirado'

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log(`✅ Conta ${companyId} suspensa com sucesso. Novo status: ${config.status}`)

    // Atualizar subscription.json
    const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
    if (fs.existsSync(subscriptionPath)) {
      const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
      subscription.status = 'suspended'
      subscription.suspendedAt = new Date().toISOString()
      fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))
    }

    return res.json({
      success: true,
      message: 'Conta suspensa com sucesso'
    })
  } catch (err) {
    console.log('❌ Erro ao suspender conta:', err)
    return res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// REATIVAR CONTA SUSPENSA (SuperAdmin)
router.post('/:id/reactivate', auth, async (req, res) => {
  try {
    const companyId = req.params.id

    // SOMENTE ADMIN
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        error: 'Sem permissão'
      })
    }

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    // Reativar conta
    config.status = 'active'
    delete config.suspendedAt
    delete config.suspendedReason

    // Não ativa módulos automaticamente - SuperAdmin deve ativar manualmente
    // config.modules permanece como está

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Atualizar subscription.json
    const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
    if (fs.existsSync(subscriptionPath)) {
      const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
      subscription.status = 'active'
      subscription.reactivatedAt = new Date().toISOString()
      fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))
    }

    console.log(`✅ Conta ${companyId} reativada`)

    return res.json({
      success: true,
      message: 'Conta reativada com sucesso'
    })
  } catch (err) {
    console.log('Erro ao reativar conta:', err)
    return res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// LISTAR CONTAS SUSPENSAS (SuperAdmin)
router.get('/suspended/list', auth, async (req, res) => {
  try {
    // SOMENTE ADMIN
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        error: 'Sem permissão'
      })
    }

    const tenantsPath = path.join(__dirname, '../../tenants')
    const companies = fs.readdirSync(tenantsPath)

    const suspendedAccounts = []

    for (const company of companies) {
      const configPath = path.join(tenantsPath, company, 'config.json')

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

        if (config.status === 'suspended') {
          suspendedAccounts.push({
            id: company,
            name: config.name,
            suspendedAt: config.suspendedAt,
            suspendedReason: config.suspendedReason,
            modules: config.modules || []
          })
        }
      }
    }

    return res.json({
      suspendedAccounts
    })
  } catch (err) {
    console.log('Erro ao listar contas suspensas:', err)
    return res.status(500).json({
      error: 'Erro interno'
    })
  }
})

module.exports = router
