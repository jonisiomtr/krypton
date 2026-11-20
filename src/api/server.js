const express = require('express')
const fs = require('fs')
const path = require('path')

const cors =
require('cors')





//importando rotas
const ordersRoutes = require('./routes/orders')
const appointmentsRoutes = require('./routes/appointments')
const companiesRoutes = require('./routes/companies')
const companyRoutes = require('./routes/company')
const productRoutes = require('./routes/products')
const companyOrdersRoutes = require('./routes/companyOrders')
//adicionar horarios
const scheduleRoutes = require('./routes/schedule')

//api pagamentos
const paymentRoutes = require('./routes/payments')

//website
const websiteRoutes = require('./routes/website')
const companySiteRoutes = require('./routes/company-site')
const siteDataRoutes = require('./routes/website')
const messagesRoutes = require('./routes/messages')

//webagendamento
const webagendamentoRoutes = require('./routes/webagendamento')
const bookingPublicRoutes = require('./routes/booking-public')

//mercado pago
const mercadopagoRoutes = require('./routes/mercadopago')

//pdv
const pdvRoutes = require('./routes/pdv')

//super admin whatsapp
const superAdminWhatsAppRoutes = require('./routes/superadmin-whatsapp')

//auth website
const authWebsiteRoutes = require('./routes/auth-website')

//auth
const authRoutes = require('./routes/auth')

//subscriptions
const subscriptionsRoutes = require('./routes/subscriptions')

//agent test
const agentTestRoutes = require('./routes/agent-test')

//trial check middleware
const trialCheck = require('./middlewares/trialCheck')

//module expiration middleware
const moduleExpiration = require('./middlewares/moduleExpiration')

//module expiration check middleware (expiração individual por módulo)
const moduleExpirationCheck = require('./middlewares/moduleExpirationCheck')

//importando rotas diretas



const app = express()

app.use(cors())







app.use(
  express.json()
)


//serve company sites (nova rota com dados injetados)
app.use('/site', companySiteRoutes)

//api para dados do site (produtos, categorias, config)
app.use('/api/site', siteDataRoutes)

//tentando adicionar react
app.use(express.static(path.join(__dirname, 'dist')));

//rota de ApiPagamentos Altomatico
app.use('/payments', paymentRoutes)
app.use('/api/payments', paymentRoutes)

//rota de upload
app.use('/api/upload', require('./routes/upload'))




//add horas
app.use(
  '/api/schedule',
  scheduleRoutes
)

//liberar pastas
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '../uploads')
  )
)

app.use(
  '/pixReceipts',
  express.static(
    path.join(__dirname, '../tenants/teste/pixReceipts')
  )
)

app.use('/api/products', productRoutes)
//app.use('/api/services', require('./routes/services'))
app.use('/api/services', require('./routes/services'))

app.use('/api/appointments', appointmentsRoutes)
app.use('/appointments', require('./routes/appointments'))

//rota dos pedidos


app.use(
  '/company',
  moduleExpirationCheck,
  companyRoutes
)

app.use(
  '/auth',
  authRoutes
)

app.use(
  '/companies',
  moduleExpirationCheck,
  companiesRoutes
)

// Apply rate limiting to auth routes
const rateLimiter = require('./middlewares/rateLimiter')
app.use('/auth', rateLimiter(10, 60000)) // 10 requests per minute for auth

// Rate limiting para rotas sensíveis
app.use('/companies', rateLimiter(20, 60000)) // 20 requests/min
app.use('/api/products', rateLimiter(30, 60000))
app.use('/api/pdv', rateLimiter(50, 60000))
app.use('/api/orders', rateLimiter(30, 60000))
app.use('/api/services', rateLimiter(30, 60000))

app.use('/pedidos', companyOrdersRoutes)

app.use(
  '/appointments',
  appointmentsRoutes
)

app.use(
  '/orders',
  ordersRoutes
)

//website routes
app.use('/api/website', websiteRoutes)
app.use('/api/messages', messagesRoutes)

//pedidos públicos (site)
app.use('/api/orders', ordersRoutes)

//webagendamento routes
app.use('/api/webagendamento', webagendamentoRoutes)
app.use('/booking', bookingPublicRoutes)

//mercado pago routes
app.use('/api/mercadopago', mercadopagoRoutes)
app.use('/mercadopago', mercadopagoRoutes)

//pdv routes
app.use('/api/pdv', pdvRoutes)

//super admin whatsapp routes
app.use('/superadmin/whatsapp', superAdminWhatsAppRoutes)

//auth website routes
app.use('/auth-website', authWebsiteRoutes)

//subscriptions routes
app.use('/api/subscriptions', subscriptionsRoutes)

//agent test routes
app.use('/api/agent-test', agentTestRoutes)

app.get(
  '/',
  (req, res) => {

    return res.json({

      status: true,

      message:
      'API ONLINE 🚀'

    })

  }
)

module.exports = app