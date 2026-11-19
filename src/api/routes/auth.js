const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const jwt = require('../auth/jwt')
const bcrypt = require('bcrypt')
const NodeCache = require('node-cache')
const nodemailer = require('nodemailer')
const Database = require('../../database/Database')

// Armazenamento em memória para OTP com node-cache
const otpStore = new NodeCache({ stdTTL: 900 }) // 15 minutos

// Gerar hash de senha com bcrypt
async function hashPassword(password) {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// Verificar senha (apenas bcrypt)
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

// Gerar código OTP de 6 dígitos
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Configurar transporter de e-mail
function getEmailTransporter() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  
  if (!host || !port || !user || !pass) {
    console.log('⚠️ SMTP não configurado. Usando log do console para OTP.')
    return null
  }
  
  return nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: false, // true para 465, false para outras portas
    auth: {
      user,
      pass
    }
  })
}

// Enviar OTP via SuperAdmin WhatsApp
async function sendOTPWhatsApp(phone, otpCode, companyName) {
  try {
    // Acessar o socket do SuperAdmin global
    const superAdminSocket = global.superAdminSocket
    
    if (!superAdminSocket) {
      console.log('⚠️ SuperAdmin WhatsApp não está conectado')
      return false
    }

    // Usar o número fornecido diretamente (formato: 559191873356)
    const jid = phone + '@s.whatsapp.net'
    console.log('📱 Enviando OTP para WhatsApp:', jid)
    
    const message = `
🔐 *CÓDIGO DE VERIFICAÇÃO - KRYPTON SaaS*

Empresa: ${companyName}
Código: *${otpCode}*

Este código expira em 15 minutos.
Não compartilhe este código com ninguém.

---
KRYPTON SaaS © 2026
    `.trim()
    
    // Enviar a mensagem
    superAdminSocket.sendMessage(jid, { text: message })
      .then(() => {
        console.log(`✅ OTP enviado via WhatsApp para ${phone}: ${otpCode}`)
      })
      .catch((err) => {
        console.log('⚠️ Erro assíncrono no envio:', err.message)
      })
    
    // Retornar true imediatamente (assumindo sucesso para evitar timeout)
    return true
  } catch (error) {
    console.log('❌ Erro ao enviar OTP via WhatsApp:', error.message)
    console.log('Detalhes do erro:', error)
    return false
  }
}

// Enviar e-mail com código OTP
async function sendOTPEmail(email, otpCode, companyName) {
  const transporter = getEmailTransporter()
  
  if (!transporter) {
    // Se não configurado, retorna falso (log será feito no controller)
    return false
  }
  
  const from = process.env.SMTP_FROM || 'KRYPTON SaaS <noreply@krypton.com>'
  
  const mailOptions = {
    from,
    to: email,
    subject: 'Seu Código de Verificação - KRYPTON SaaS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: bold;
          }
          .content {
            padding: 40px;
            text-align: center;
          }
          .code {
            background-color: #f0f0f0;
            border: 2px dashed #667eea;
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 10px;
          }
          .info {
            color: #666;
            font-size: 14px;
            margin-top: 20px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KRYPTON SaaS</h1>
          </div>
          <div class="content">
            <h2>Seu Código de Verificação</h2>
            <p>Olá! Você solicitou a criação da conta para <strong>${companyName}</strong>.</p>
            <p>Use o código abaixo para completar seu cadastro:</p>
            <div class="code">${otpCode}</div>
            <p class="info">Este código expira em 15 minutos.</p>
            <p class="info">Se você não solicitou este código, ignore este e-mail.</p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
            <p>&copy; 2026 KRYPTON SaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
  
  try {
    await transporter.sendMail(mailOptions)
    console.log('✅ E-mail enviado para:', email)
    return true
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error)
    return false
  }
}

// Verificar se username já existe
router.get('/check-username/:username', (req, res) => {
  const { username } = req.params
  
  const tenantPath = path.join(__dirname, `../../tenants/${username}`)
  
  if (fs.existsSync(tenantPath)) {
    return res.json({ available: false })
  }
  
  return res.json({ available: true })
})

// Verificar status da assinatura do usuário logado
router.get('/subscription-status', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'Token não enviado' })
    }
    
    const decoded = jwt.verify(token)
    
    if (decoded.type !== 'company') {
      return res.status(403).json({ error: 'Apenas company pode verificar assinatura' })
    }
    
    const subscription = Database.readSubscription(decoded.companyId)
    
    if (!subscription) {
      return res.json({
        hasSubscription: false,
        isInTrial: false,
        message: 'Nenhuma assinatura encontrada'
      })
    }
    
    // Verificar se está em período de teste
    const now = new Date()
    const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null
    const isInTrial = trialEndsAt && now < trialEndsAt
    const trialDaysRemaining = trialEndsAt ? Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)) : 0
    
    return res.json({
      hasSubscription: true,
      subscription,
      isInTrial,
      trialDaysRemaining,
      trialEndsAt: subscription.trialEndsAt
    })
  } catch (error) {
    console.error('Erro ao verificar status da assinatura:', error)
    res.status(500).json({ error: 'Erro ao verificar status da assinatura' })
  }
})

// Solicitar registro (enviar OTP)
router.post('/register/request', async (req, res) => {
  const { username, companyName, email, phone, password, method = 'whatsapp' } = req.body
  
  // Validações
  if (!username || !companyName || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
  }
  
  // Se método for WhatsApp, validar telefone
  if (method === 'whatsapp') {
    if (!phone) {
      return res.status(400).json({ error: 'Número de WhatsApp é obrigatório para envio via WhatsApp' })
    }
    // Validar formato (deve ter entre 12 e 14 dígitos: 55 + DDD + número)
    if (!/^\d{12,14}$/.test(phone)) {
      return res.status(400).json({ error: 'Número de WhatsApp inválido. Use o formato: 559191873356' })
    }
  }
  
  // Verificar se username já existe
  const tenantPath = path.join(__dirname, `../../tenants/${username}`)
  if (fs.existsSync(tenantPath)) {
    return res.status(400).json({ error: 'Nome de usuário já está em uso' })
  }

  // Verificar se email ou WhatsApp já estão em uso
  const tenantsPath = path.join(__dirname, '../../tenants')
  const tenants = fs.readdirSync(tenantsPath).filter(file => {
    const fullPath = path.join(tenantsPath, file)
    return fs.lstatSync(fullPath).isDirectory()
  })

  for (const tenantId of tenants) {
    try {
      const configPath = path.join(tenantsPath, tenantId, 'config.json')
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        const config = JSON.parse(configData)

        // Verificar email (case-insensitive)
        if (config.email && config.email.toLowerCase() === email.toLowerCase()) {
          console.log('⚠️ Email já cadastrado:', email, 'no tenant:', tenantId)
          return res.status(400).json({ error: 'Este e-mail já está cadastrado em outra conta' })
        }

        // Verificar WhatsApp (se fornecido e existir no config)
        if (phone && config.phone) {
          // Normalizar ambos para comparação (remover espaços e caracteres especiais)
          const normalizedPhone = phone.replace(/\D/g, '')
          const normalizedConfigPhone = config.phone.replace(/\D/g, '')
          
          if (normalizedPhone === normalizedConfigPhone) {
            console.log('⚠️ WhatsApp já cadastrado:', phone, 'no tenant:', tenantId)
            return res.status(400).json({ error: 'Este número de WhatsApp já está cadastrado em outra conta' })
          }
        }
      }
    } catch (err) {
      console.log('Erro ao verificar tenant:', tenantId, err)
      // Continuar verificando outros tenants
    }
  }
  
  // Gerar OTP
  const otpCode = generateOTP()
  
  // Hash da senha
  const passwordHash = await hashPassword(password)
  
  // Armazenar dados
  otpStore.set(email, {
    username,
    companyName,
    email,
    phone,
    passwordHash,
    code: otpCode,
    method
  })
  
  // Enviar OTP pelo método escolhido
  if (method === 'whatsapp') {
    // Enviar via SuperAdmin WhatsApp
    const whatsappSent = await sendOTPWhatsApp(phone, otpCode, companyName)
    
    if (whatsappSent) {
      return res.json({
        success: true,
        message: 'Código enviado para o WhatsApp',
        expiresIn: 15 * 60
      })
    } else {
      // Fallback para e-mail se WhatsApp falhar
      console.log('📱 WhatsApp não disponível, usando e-mail como fallback')
      const emailSent = await sendOTPEmail(email, otpCode, companyName)
      
      if (emailSent) {
        return res.json({
          success: true,
          message: 'Código enviado para o e-mail (WhatsApp indisponível)',
          expiresIn: 15 * 60
        })
      } else {
        console.log('📧 OTP Code para ' + email + ': ' + otpCode)
        return res.json({
          success: true,
          message: 'Código gerado (verifique o console)',
          expiresIn: 15 * 60,
          fallback: true
        })
      }
    }
  } else {
    // Enviar via e-mail (comportamento padrão)
    const emailSent = await sendOTPEmail(email, otpCode, companyName)
    
    if (emailSent) {
      return res.json({
        success: true,
        message: 'Código enviado para o e-mail',
        expiresIn: 15 * 60
      })
    } else {
      console.log('📧 OTP Code para ' + email + ': ' + otpCode)
      console.log('📧 Este código expira em 15 minutos')
      
      return res.json({
        success: true,
        message: 'Código gerado (verifique o console se e-mail não configurado)',
        expiresIn: 15 * 60,
        fallback: true
      })
    }
  }
})

// Verificar OTP e criar conta
router.post('/register/verify', async (req, res) => {
  const { email, code } = req.body
  
  if (!email || !code) {
    return res.status(400).json({ error: 'E-mail e código são obrigatórios' })
  }
  
  // Recuperar dados
  const otpData = otpStore.get(email)
  
  if (!otpData) {
    return res.status(400).json({ error: 'Código inválido ou expirado' })
  }
  
  if (otpData.code !== code) {
    return res.status(400).json({ error: 'Código incorreto' })
  }
  
  // Verificar novamente se username existe (double-check)
  const tenantPath = path.join(__dirname, `../../tenants/${otpData.username}`)
  if (fs.existsSync(tenantPath)) {
    otpStore.del(email)
    return res.status(400).json({ error: 'Nome de usuário já está em uso' })
  }

  // Verificar novamente se email ou WhatsApp já estão em uso (double-check)
  const tenantsPath = path.join(__dirname, '../../tenants')
  const tenants = fs.readdirSync(tenantsPath).filter(file => {
    const fullPath = path.join(tenantsPath, file)
    return fs.lstatSync(fullPath).isDirectory()
  })

  for (const tenantId of tenants) {
    try {
      const configPath = path.join(tenantsPath, tenantId, 'config.json')
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        const config = JSON.parse(configData)

        // Verificar email
        if (config.email && config.email.toLowerCase() === otpData.email.toLowerCase()) {
          otpStore.del(email)
          return res.status(400).json({ error: 'Este e-mail já está cadastrado em outra conta' })
        }

        // Verificar WhatsApp (se fornecido)
        if (otpData.phone && config.phone) {
          const normalizedPhone = otpData.phone.replace(/\D/g, '')
          const normalizedConfigPhone = config.phone.replace(/\D/g, '')
          
          if (normalizedPhone === normalizedConfigPhone) {
            otpStore.del(email)
            return res.status(400).json({ error: 'Este número de WhatsApp já está cadastrado em outra conta' })
          }
        }
      }
    } catch (err) {
      console.log('Erro ao verificar tenant no verify:', tenantId, err)
    }
  }
  
  try {
    // Criar diretório do tenant
    fs.mkdirSync(tenantPath, { recursive: true })
    
    // Criar config.json com módulos de teste grátis (2 dias)
    const allModules = ['assistant', 'delivery', 'scheduling', 'catalog', 'pdv_caixa', 'qrcode', 'pix', 'webagendamento', 'website']
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 2) // 2 dias de teste grátis

    const moduleExpirations = {}
    allModules.forEach(module => {
      moduleExpirations[module] = trialEndDate.toISOString()
    })

    const config = {
      id: otpData.username,
      name: otpData.companyName,
      password: otpData.passwordHash,
      email: otpData.email,
      phone: otpData.phone || '',
      cnpj: '',
      modules: allModules, // Todos os módulos ativos com teste grátis
      moduleExpirations, // Expiração de cada módulo (2 dias)
      adminNumber: '',
      pix: { key: '', holder: '' },
      status: 'active'
    }

    fs.writeFileSync(
      path.join(tenantPath, 'config.json'),
      JSON.stringify(config, null, 2)
    )
    
    // Criar arquivos JSON vazios
    const emptyFiles = [
      'products.json',
      'services.json',
      'orders.json',
      'appointments.json',
      'schedule.json',
      'professionals.json',
      'customers.json',
      'messages.json',
      'subscribers.json'
    ]

    emptyFiles.forEach(file => {
      fs.writeFileSync(
        path.join(tenantPath, file),
        '[]'
      )
    })

    // Criar website.json com estrutura padrão
    const defaultWebsiteConfig = {
      enabled: true,
      theme: 'modern',
      customDomain: null,
      seo: {
        title: otpData.companyName || 'Site da Empresa',
        description: 'Site oficial da empresa',
        keywords: ''
      },
      hero: {
        title: otpData.companyName || 'Nome da Empresa',
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
        whatsappNumber: otpData.phone || ''
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
        title: otpData.companyName || 'Agendamento Online',
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
        whatsappNumber: otpData.phone || '',
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
    
    // Criar assinatura de teste grátis (2 dias para módulos)
    const trialSubscription = {
      tenantId: otpData.username,
      planId: 'base',
      planName: 'Base (Teste Grátis - 2 dias)',
      price: 0,
      modules: allModules, // Todos os módulos ativos
      moduleExpirations, // Expiração de cada módulo (2 dias)
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
    
    console.log(`✅ Assinatura de teste criada para ${otpData.username} (7 dias grátis)`)

    // Iniciar cliente WhatsApp para gerar QR Code
    try {
      const { startClient } = require('../../bootstrap/startClient')
      console.log(`🔄 Iniciando cliente WhatsApp para ${otpData.username}...`)
      startClient(otpData.username)
    } catch (err) {
      console.log('Erro ao iniciar cliente WhatsApp:', err)
      // Não falha a criação da conta se o WhatsApp falhar
    }

    // Deletar dados OTP
    otpStore.del(email)

    // Gerar token JWT
    const token = jwt.generate({
      type: 'company',
      companyId: otpData.username
    })
    
    return res.json({
      success: true,
      token,
      message: 'Conta criada com sucesso! Você tem 7 dias grátis para testar todos os módulos.',
      trialEndsAt: trialEndDate.toISOString()
    })
    
  } catch (error) {
    console.error('Erro ao criar tenant:', error)
    return res.status(500).json({ error: 'Erro ao criar conta' })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  
  // ADMIN
  if (username === 'admin' && password === '123') {
    const token = jwt.generate({
      type: 'admin'
    })
    return res.json({
      success: true,
      token
    })
  }
  
  // EMPRESA
  const configPath = path.join(__dirname, `../../tenants/${username}/config.json`)
  
  if (!fs.existsSync(configPath)) {
    return res.status(404).json({
      error: 'Empresa não encontrada'
    })
  }
  
  const config = JSON.parse(fs.readFileSync(configPath))

  // Verificar senha (hash)
  const isValid = await verifyPassword(password, config.password)
  if (!isValid) {
    return res.status(401).json({
      error: 'Senha inválida'
    })
  }

  const token = jwt.generate({
    type: 'company',
    companyId: username
  })

  return res.json({
    success: true,
    token,
    suspended: false
  })
})

// RECUPERAÇÃO DE SENHA - Solicitar OTP
router.post('/forgot-password/request', async (req, res) => {
  const { identifier, method: preferredMethod = 'whatsapp' } = req.body
  
  if (!identifier) {
    return res.status(400).json({ error: 'Usuário ou WhatsApp é obrigatório' })
  }
  
  // Identificar se é usuário ou WhatsApp
  let tenantId = null
  let method = null
  let phone = null
  let email = null
  
  const tenantsPath = path.join(__dirname, '../../tenants')
  const tenants = fs.readdirSync(tenantsPath).filter(file => {
    const fullPath = path.join(tenantsPath, file)
    return fs.lstatSync(fullPath).isDirectory()
  })
  
  for (const tenant of tenants) {
    try {
      const configPath = path.join(tenantsPath, tenant, 'config.json')
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        const config = JSON.parse(configData)
        
        // Verificar se é o usuário
        if (config.id === identifier) {
          tenantId = tenant
          // Usar preferência do usuário se disponível, senão prioridade: WhatsApp > Email
          if (preferredMethod === 'email' && config.email && config.email.length > 0) {
            method = 'email'
            email = config.email
          } else if (config.phone && config.phone.length > 0) {
            method = 'whatsapp'
            phone = config.phone
          } else if (config.email && config.email.length > 0) {
            method = 'email'
            email = config.email
          }
          break
        }
        
        // Verificar se é o WhatsApp (normalizando)
        const normalizedIdentifier = identifier.replace(/\D/g, '')
        if (config.phone) {
          const normalizedConfigPhone = config.phone.replace(/\D/g, '')
          if (normalizedIdentifier === normalizedConfigPhone) {
            tenantId = tenant
            // Usar preferência do usuário se disponível
            if (preferredMethod === 'email' && config.email && config.email.length > 0) {
              method = 'email'
              email = config.email
            } else {
              method = 'whatsapp'
              phone = config.phone
            }
            break
          }
        }
      }
    } catch (err) {
      console.log('Erro ao verificar tenant:', tenant, err)
    }
  }
  
  if (!tenantId) {
    return res.status(404).json({ error: 'Usuário ou WhatsApp não encontrado no sistema' })
  }
  
  if (!method) {
    return res.status(400).json({ error: 'Este usuário não tem WhatsApp ou e-mail cadastrado' })
  }
  
  // Gerar OTP
  const otpCode = generateOTP()
  
  // Armazenar OTP
  otpStore.set(`reset_${tenantId}`, {
    tenantId,
    code: otpCode,
    method,
    phone,
    email
  })
  
  // Enviar OTP
  if (method === 'whatsapp' && phone) {
    const whatsappSent = await sendOTPWhatsApp(phone, otpCode, tenantId)
    
    if (whatsappSent) {
      return res.json({
        success: true,
        message: 'Código enviado para o WhatsApp',
        method: 'whatsapp',
        code: otpCode // Para desenvolvimento
      })
    } else {
      // Fallback para email se WhatsApp falhar
      if (email) {
        const emailSent = await sendOTPEmail(email, otpCode, tenantId)
        if (emailSent) {
          return res.json({
            success: true,
            message: 'Código enviado para o e-mail (WhatsApp indisponível)',
            method: 'email',
            code: otpCode
          })
        }
      }
      // Se não tem email nem WhatsApp funcionou, retorna erro
      return res.status(500).json({ error: 'Não foi possível enviar o código' })
    }
  } else if (method === 'email' && email) {
    const emailSent = await sendOTPEmail(email, otpCode, tenantId)
    
    if (emailSent) {
      return res.json({
        success: true,
        message: 'Código enviado para o e-mail',
        method: 'email',
        code: otpCode
      })
    } else {
      return res.status(500).json({ error: 'Não foi possível enviar o código' })
    }
  }
})

// RECUPERAÇÃO DE SENHA - Verificar OTP
router.post('/forgot-password/verify', async (req, res) => {
  const { identifier, code } = req.body
  
  if (!identifier || !code) {
    return res.status(400).json({ error: 'Identificador e código são obrigatórios' })
  }
  
  // Encontrar tenantId pelo identifier
  let tenantId = null
  const tenantsPath = path.join(__dirname, '../../tenants')
  const tenants = fs.readdirSync(tenantsPath).filter(file => {
    const fullPath = path.join(tenantsPath, file)
    return fs.lstatSync(fullPath).isDirectory()
  })
  
  for (const tenant of tenants) {
    try {
      const configPath = path.join(tenantsPath, tenant, 'config.json')
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        const config = JSON.parse(configData)
        
        if (config.id === identifier) {
          tenantId = tenant
          break
        }
        
        const normalizedIdentifier = identifier.replace(/\D/g, '')
        if (config.phone) {
          const normalizedConfigPhone = config.phone.replace(/\D/g, '')
          if (normalizedIdentifier === normalizedConfigPhone) {
            tenantId = tenant
            break
          }
        }
      }
    } catch (err) {
      console.log('Erro ao verificar tenant:', tenant, err)
    }
  }
  
  if (!tenantId) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }
  
  // Verificar OTP
  const otpData = otpStore.get(`reset_${tenantId}`)
  
  if (!otpData) {
    return res.status(400).json({ error: 'Código inválido ou expirado' })
  }
  
  if (otpData.code !== code) {
    return res.status(400).json({ error: 'Código incorreto' })
  }
  
  return res.json({
    success: true,
    message: 'Código verificado com sucesso'
  })
})

// RECUPERAÇÃO DE SENHA - Redefinir senha
router.post('/forgot-password/reset', async (req, res) => {
  const { identifier, code, newPassword } = req.body
  
  if (!identifier || !code || !newPassword) {
    return res.status(400).json({ error: 'Identificador, código e nova senha são obrigatórios' })
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
  }
  
  // Encontrar tenantId pelo identifier
  let tenantId = null
  const tenantsPath = path.join(__dirname, '../../tenants')
  const tenants = fs.readdirSync(tenantsPath).filter(file => {
    const fullPath = path.join(tenantsPath, file)
    return fs.lstatSync(fullPath).isDirectory()
  })
  
  for (const tenant of tenants) {
    try {
      const configPath = path.join(tenantsPath, tenant, 'config.json')
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        const config = JSON.parse(configData)
        
        if (config.id === identifier) {
          tenantId = tenant
          break
        }
        
        const normalizedIdentifier = identifier.replace(/\D/g, '')
        if (config.phone) {
          const normalizedConfigPhone = config.phone.replace(/\D/g, '')
          if (normalizedIdentifier === normalizedConfigPhone) {
            tenantId = tenant
            break
          }
        }
      }
    } catch (err) {
      console.log('Erro ao verificar tenant:', tenant, err)
    }
  }
  
  if (!tenantId) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }
  
  // Verificar OTP novamente
  const otpData = otpStore.get(`reset_${tenantId}`)
  
  if (!otpData || otpData.code !== code) {
    return res.status(400).json({ error: 'Código inválido ou expirado' })
  }
  
  // Atualizar senha
  try {
    const configPath = path.join(tenantsPath, tenantId, 'config.json')
    const configData = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(configData)
    
    const passwordHash = await hashPassword(newPassword)
    config.password = passwordHash
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    
    // Deletar OTP
    otpStore.del(`reset_${tenantId}`)
    
    console.log(`✅ Senha alterada para ${tenantId}`)
    
    return res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao alterar senha:', error)
    return res.status(500).json({ error: 'Erro ao alterar senha' })
  }
})

module.exports = router
