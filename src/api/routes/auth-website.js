const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')

// Importar função de envio do Super Admin
const superAdminRouter = require('./superadmin-whatsapp')

// Configurar multer para upload de fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { companyId, customerId } = req.body
    const uploadDir = path.join(__dirname, `../../tenants/${companyId}/customers/${customerId}`)
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (extname && mimetype) {
      return cb(null, true)
    } else {
      cb(new Error('Apenas imagens são permitidas'))
    }
  }
})

// Armazenar códigos de validação temporários (em produção, usar Redis)
const validationCodes = new Map()

// Função para inicializar usuários de exemplo
function initExampleUsers() {
  try {
    const tenantsPath = path.join(__dirname, '../../tenants')
    
    if (!fs.existsSync(tenantsPath)) {
      console.log('📁 Diretório tenants não encontrado, criando usuários de exemplo mais tarde')
      return
    }
    
    const companies = fs.readdirSync(tenantsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    const exampleUsers = [
      { phone: '559199288087', password: '1234', name: 'Usuário Teste 1' },
      { phone: '5591993561587', password: '1234', name: 'Usuário Teste 2' }
    ]
    
    for (const companyId of companies) {
      const customersPath = path.join(tenantsPath, companyId, 'customers.json')
      
      let customers = []
      if (fs.existsSync(customersPath)) {
        customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
      }
      
      let addedCount = 0
      for (const exampleUser of exampleUsers) {
        const existing = customers.find(c => c.id === exampleUser.phone)
        if (!existing) {
          customers.push({
            id: exampleUser.phone,
            name: exampleUser.name,
            phone: exampleUser.phone,
            email: '',
            password: exampleUser.password,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            profile: {
              photo: null,
              address: null,
              city: null,
              state: null
            }
          })
          addedCount++
        }
      }
      
      if (addedCount > 0) {
        fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
        console.log(`✅ Adicionados ${addedCount} usuários de exemplo para empresa ${companyId}`)
      }
    }
  } catch (err) {
    console.log('Erro ao inicializar usuários de exemplo:', err)
  }
}

// Inicializar usuários de exemplo ao carregar o módulo
initExampleUsers()

// Função para gerar código de 6 dígitos
function generateValidationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Função para enviar código via Super Admin WhatsApp
async function sendValidationCode(phone, code) {
  try {
    const message = `🔐 Código de validação: ${code}\n\nUse este código para validar sua conta no sistema.`
    
    // Usar função do Super Admin para enviar mensagem
    const sent = superAdminRouter.sendMessage(phone, message)
    
    return sent
  } catch (err) {
    console.log('Erro ao enviar código de validação:', err)
    return false
  }
}

// POST /auth-website/send-code - Enviar código de validação
router.post('/send-code', (req, res) => {
  try {
    const { phone, companyId } = req.body
    
    if (!phone || !companyId) {
      return res.status(400).json({ error: 'Telefone e companyId são obrigatórios' })
    }
    
    // Normalizar telefone
    const normalizedPhone = phone.replace(/\D/g, '')
    
    // Gerar código
    const code = generateValidationCode()
    
    // Armazenar código (expira em 5 minutos)
    validationCodes.set(normalizedPhone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
      companyId
    })
    
    // Enviar via WhatsApp
    const sent = sendValidationCode(phone, code)
    
    if (sent) {
      res.json({ success: true, message: 'Código enviado com sucesso' })
    } else {
      res.status(500).json({ error: 'Erro ao enviar código' })
    }
    
  } catch (err) {
    console.log('Erro ao enviar código:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /auth-website/validate-code - Validar código
router.post('/validate-code', (req, res) => {
  try {
    const { phone, code, companyId } = req.body
    
    if (!phone || !code || !companyId) {
      return res.status(400).json({ error: 'Telefone, código e companyId são obrigatórios' })
    }
    
    const normalizedPhone = phone.replace(/\D/g, '')
    const stored = validationCodes.get(normalizedPhone)
    
    if (!stored) {
      return res.status(400).json({ error: 'Código não encontrado ou expirado' })
    }
    
    if (stored.expiresAt < Date.now()) {
      validationCodes.delete(normalizedPhone)
      return res.status(400).json({ error: 'Código expirado' })
    }
    
    if (stored.code !== code) {
      return res.status(400).json({ error: 'Código inválido' })
    }
    
    if (stored.companyId !== companyId) {
      return res.status(400).json({ error: 'Código inválido para esta empresa' })
    }
    
    // Código válido - remover
    validationCodes.delete(normalizedPhone)
    
    res.json({ success: true, message: 'Código validado com sucesso' })
    
  } catch (err) {
    console.log('Erro ao validar código:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /auth-website/register - Registrar novo cliente
router.post('/register', (req, res) => {
  try {
    const { companyId, name, phone, password, confirmPassword } = req.body
    
    if (!companyId || !name || !phone || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Senhas não conferem' })
    }
    
    if (password.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' })
    }
    
    // Normalizar telefone
    const normalizedPhone = phone.replace(/\D/g, '')
    if (!normalizedPhone.startsWith('55')) {
      return res.status(400).json({ error: 'Número deve ser brasileiro (DDD + 9 dígitos)' })
    }
    
    const customerId = normalizedPhone
    
    // Verificar se cliente já existe
    const customersPath = path.join(__dirname, `../../tenants/${companyId}/customers.json`)
    let customers = []
    
    if (fs.existsSync(customersPath)) {
      customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
      
      const existing = customers.find(c => c.id === customerId)
      if (existing) {
        return res.status(400).json({ error: 'Este número já está cadastrado' })
      }
    }
    
    // Criar novo cliente
    const newCustomer = {
      id: customerId,
      name: name.trim(),
      phone: normalizedPhone,
      email: '',
      password: password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      profile: {
        photo: null,
        address: null,
        city: null,
        state: null
      }
    }
    
    customers.push(newCustomer)
    fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
    
    res.json({ success: true, message: 'Conta criada com sucesso', customer: { id: customerId, name: name.trim() } })
    
  } catch (err) {
    console.log('Erro ao registrar:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /auth-website/login - Login de cliente
router.post('/login', (req, res) => {
  try {
    const { companyId, phone, password } = req.body
    
    if (!companyId || !phone || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }
    
    const normalizedPhone = phone.replace(/\D/g, '')
    const customerId = normalizedPhone
    
    // Buscar cliente
    const customersPath = path.join(__dirname, `../../tenants/${companyId}/customers.json`)
    
    if (!fs.existsSync(customersPath)) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    const customer = customers.find(c => c.id === customerId)
    
    if (!customer) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    if (customer.password !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    // Atualizar último login
    customer.lastLogin = new Date().toISOString()
    fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
    
    res.json({ 
      success: true, 
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        profile: customer.profile
      }
    })
    
  } catch (err) {
    console.log('Erro ao fazer login:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /auth-website/profile - Atualizar perfil com upload de foto
router.post('/profile', upload.single('photo'), (req, res) => {
  try {
    const { companyId, customerId, name, email, address } = req.body
    
    if (!companyId || !customerId) {
      return res.status(400).json({ error: 'CompanyId e customerId são obrigatórios' })
    }
    
    const customersPath = path.join(__dirname, `../../tenants/${companyId}/customers.json`)
    
    if (!fs.existsSync(customersPath)) {
      return res.status(404).json({ error: 'Cliente não encontrado' })
    }
    
    const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'))
    const customerIndex = customers.findIndex(c => c.id === customerId)
    
    if (customerIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado' })
    }
    
    // Atualizar campos
    if (name) customers[customerIndex].name = name.trim()
    if (email !== undefined) customers[customerIndex].email = email
    if (address !== undefined) {
      if (!customers[customerIndex].profile) {
        customers[customerIndex].profile = {}
      }
      customers[customerIndex].profile.address = address
    }
    
    // Atualizar foto se foi enviada
    if (req.file) {
      if (!customers[customerIndex].profile) {
        customers[customerIndex].profile = {}
      }
      customers[customerIndex].profile.photo = `/tenants/${companyId}/customers/${customerId}/${req.file.filename}`
    }
    
    fs.writeFileSync(customersPath, JSON.stringify(customers, null, 2))
    
    res.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso',
      customer: {
        id: customers[customerIndex].id,
        name: customers[customerIndex].name,
        phone: customers[customerIndex].phone,
        email: customers[customerIndex].email,
        profile: customers[customerIndex].profile
      }
    })
    
  } catch (err) {
    console.log('Erro ao atualizar perfil:', err)
    res.status(500).json({ error: 'Erro interno' })
  }
})

module.exports = router
