const fs = require('fs')
const path = require('path')

// Carregar variáveis de ambiente do .env manualmente
const envPath = path.join(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
  console.log('✅ Variáveis de ambiente carregadas do .env')
}

//logs
const Logger = require('./core/logger/Logger')

//api Server Painel
const api = require('./api/server')

//atualizado
const http = require('http')
const { Server } = require('socket.io')

const server = http.createServer(api)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})

global.io = io

// Inicializar Super Admin WhatsApp
const superAdminWhatsAppRoutes = require('./api/routes/superadmin-whatsapp')
superAdminWhatsAppRoutes.init(io)

// Expor socket do SuperAdmin globalmente para uso em outras rotas
// Nota: O socket será exposto quando a conexão for estabelecida
superAdminWhatsAppRoutes.exposeSocket()

Logger.info(
  'Sistema iniciado'
)

//const startClient =
//require('./bootstrap/startClient')
const {
  startClient,
  startingClients
} = require('./bootstrap/startClient')

//funcao para criar empresas
async function createTenant(data) {

  const tenantPath =
  path.join(
    __dirname,
    `tenants/${data.id}`
  )

  if (!fs.existsSync(tenantPath)) {

    fs.mkdirSync(tenantPath, {
      recursive: true
    })

  }

  // PRODUTOS
  fs.writeFileSync(
    `${tenantPath}/products.json`,
    JSON.stringify([], null, 2)
  )

  // SERVIÇOS
  fs.writeFileSync(
    `${tenantPath}/services.json`,
    JSON.stringify([], null, 2)
  )

  // PEDIDOS
  fs.writeFileSync(
    `${tenantPath}/orders.json`,
    JSON.stringify([], null, 2)
  )

  // AGENDAMENTOS
  fs.writeFileSync(
    `${tenantPath}/appointments.json`,
    JSON.stringify([], null, 2)
  )

  // PROFISSIONAIS (online booking)
  fs.writeFileSync(
    `${tenantPath}/professionals.json`,
    JSON.stringify([], null, 2)
  )

  // CUSTOMERS (multi-tenancy)
  fs.writeFileSync(
    `${tenantPath}/customers.json`,
    JSON.stringify([], null, 2)
  )

  // MESSAGES (chat system)
  if (!fs.existsSync(`${tenantPath}/messages.json`)) {
    fs.writeFileSync(
      `${tenantPath}/messages.json`,
      JSON.stringify([], null, 2)
    )
  }

  await startClient(data.id)

}

async function start() {

  const tenantsPath =
  path.join(__dirname, 'tenants')

  const clients =
  fs.readdirSync(tenantsPath)
  .filter(file => {

    const fullPath =
    path.join(
      tenantsPath,
      file
    )

    return fs.lstatSync(
      fullPath
    ).isDirectory()

  })

  for (const clientId of clients) {

    await startClient(clientId)

  }

}

start()


// ROTA DE TESTE PARA CRIAR EMPRESA



const PORT =
process.env.PORT || 4177

server.listen(PORT, () => {

  console.log(
    `🌐 API ONLINE ${PORT}`
  )

})