const express = require('express')
const fs = require('fs')
const path = require('path')
const PaymentManager = require('../../managers/PaymentManager')
const ConnectionManager = require('../../managers/ConnectionManager')

const router = express.Router()

// ========================
// CONFIGURAÇÃO DO ONLINE BOOKING
// ========================

// OBTER CONFIGURAÇÃO
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params

    const bookingConfigPath = path.join(
      __dirname,
      `../../tenants/${companyId}/webagendamento.json`
    )

    // Se não existir, cria configuração padrão
    if (!fs.existsSync(bookingConfigPath)) {
      const configPath = path.join(
        __dirname,
        `../../tenants/${companyId}/config.json`
      )

      let companyConfig = {}
      if (fs.existsSync(configPath)) {
        companyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      }

      const defaultConfig = {
        enabled: true,
        theme: 'modern',
        customDomain: null,
        hero: {
          title: companyConfig.displayName || companyConfig.name || 'Nome da Empresa',
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
          whatsappNumber: companyConfig.phone || '',
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
            0: { enabled: false, open: '09:00', close: '18:00' },
            1: { enabled: true, open: '09:00', close: '18:00' },
            2: { enabled: true, open: '09:00', close: '18:00' },
            3: { enabled: true, open: '09:00', close: '18:00' },
            4: { enabled: true, open: '09:00', close: '18:00' },
            5: { enabled: true, open: '09:00', close: '18:00' },
            6: { enabled: true, open: '09:00', close: '14:00' }
          }
        },
        notifications: {
          confirmation: true,
          reminder24h: true,
          reminder2h: true
        }
      }

      fs.writeFileSync(
        bookingConfigPath,
        JSON.stringify(defaultConfig, null, 2)
      )

      console.log(`✅ Online Booking configurado automaticamente para empresa: ${companyId}`)
      return res.json(defaultConfig)
    }

    const config = JSON.parse(fs.readFileSync(bookingConfigPath, 'utf8'))
    res.json(config)

  } catch (err) {
    console.log('Erro ao carregar configuração do online booking:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ATUALIZAR CONFIGURAÇÃO
router.put('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const updates = req.body

    const bookingConfigPath = path.join(
      __dirname,
      `../../tenants/${companyId}/webagendamento.json`
    )

    let config

    if (!fs.existsSync(bookingConfigPath)) {
      const configPath = path.join(
        __dirname,
        `../../tenants/${companyId}/config.json`
      )

      let companyConfig = {}
      if (fs.existsSync(configPath)) {
        companyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      }

      config = {
        enabled: true,
        theme: 'modern',
        customDomain: null,
        hero: {
          title: companyConfig.displayName || companyConfig.name || 'Nome da Empresa',
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
          whatsappNumber: companyConfig.phone || '',
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
            0: { enabled: false, open: '09:00', close: '18:00' },
            1: { enabled: true, open: '09:00', close: '18:00' },
            2: { enabled: true, open: '09:00', close: '18:00' },
            3: { enabled: true, open: '09:00', close: '18:00' },
            4: { enabled: true, open: '09:00', close: '18:00' },
            5: { enabled: true, open: '09:00', close: '18:00' },
            6: { enabled: true, open: '09:00', close: '14:00' }
          }
        },
        notifications: {
          confirmation: true,
          reminder24h: true,
          reminder2h: true
        }
      }
    } else {
      config = JSON.parse(fs.readFileSync(bookingConfigPath, 'utf8'))
    }

    const updatedConfig = {
      ...config,
      ...updates,
      hero: { ...config.hero, ...updates.hero },
      colors: { ...config.colors, ...updates.colors },
      features: { ...config.features, ...updates.features },
      social: { ...config.social, ...updates.social },
      businessHours: { ...config.businessHours, ...updates.businessHours },
      notifications: { ...config.notifications, ...updates.notifications }
    }

    fs.writeFileSync(
      bookingConfigPath,
      JSON.stringify(updatedConfig, null, 2)
    )

    console.log('✅ Configuração do online booking atualizada:', companyId)
    res.json({
      success: true,
      config: updatedConfig
    })

  } catch (err) {
    console.log('Erro ao atualizar configuração do online booking:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ========================
// SERVIÇOS (com duração)
// ========================

// OBTER SERVIÇOS
router.get('/:companyId/services', async (req, res) => {
  try {
    const { companyId } = req.params

    const servicesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/services.json`
    )

    let services = []
    if (fs.existsSync(servicesPath)) {
      services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'))
    }

    // Filtrar apenas serviços ativos
    const activeServices = services.filter(s => s.active !== false)

    res.json(activeServices || [])

  } catch (err) {
    console.log('Erro ao carregar serviços:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// SINCRONIZAR SERVIÇOS (DO SIE PARA WEB AGENDAMENTO)
router.post('/:companyId/services/sync', async (req, res) => {
  try {
    const { companyId } = req.params
    const { services } = req.body

    const servicesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/services.json`
    )

    // Converter serviços do SIE para o formato do webagendamento
    const webagendamentoServices = services.map(service => ({
      id: service.id || Date.now() + Math.random(),
      name: service.name,
      price: parseFloat(service.price) || 0,
      duration: parseInt(service.duration) || 60,
      description: service.description || '',
      category: service.category || '',
      imageUrl: service.imageUrl || '',
      active: true,
      createdAt: service.createdAt || new Date().toISOString()
    }))

    fs.writeFileSync(
      servicesPath,
      JSON.stringify(webagendamentoServices, null, 2)
    )

    console.log(`✅ Serviços sincronizados para empresa: ${companyId}`)
    res.json({ success: true, count: webagendamentoServices.length })

  } catch (err) {
    console.log('Erro ao sincronizar serviços:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// CRIAR SERVIÇO
router.post('/:companyId/services', async (req, res) => {
  try {
    const { companyId } = req.params
    const { name, price, duration, description, category, imageUrl } = req.body

    const servicesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/services.json`
    )

    let services = []
    if (fs.existsSync(servicesPath)) {
      services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'))
    }

    const newService = {
      id: Date.now(),
      name,
      price: parseFloat(price),
      duration: parseInt(duration) || 60,
      description: description || '',
      category: category || '',
      imageUrl: imageUrl || '',
      active: true,
      createdAt: new Date().toISOString()
    }

    services.push(newService)

    fs.writeFileSync(
      servicesPath,
      JSON.stringify(services, null, 2)
    )

    console.log(`✅ Serviço criado: ${name} para empresa: ${companyId}`)
    res.json(newService)

  } catch (err) {
    console.log('Erro ao criar serviço:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ATUALIZAR SERVIÇO
router.put('/:companyId/services/:serviceId', async (req, res) => {
  try {
    const { companyId, serviceId } = req.params
    const { name, price, duration, description, category, imageUrl } = req.body

    const servicesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/services.json`
    )

    let services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'))

    const index = services.findIndex(s => s.id === parseInt(serviceId))
    if (index === -1) {
      return res.status(404).json({ error: 'Serviço não encontrado' })
    }

    services[index] = {
      ...services[index],
      name: name !== undefined ? name : services[index].name,
      price: price !== undefined ? parseFloat(price) : services[index].price,
      duration: duration !== undefined ? parseInt(duration) : services[index].duration,
      description: description !== undefined ? description : services[index].description,
      category: category !== undefined ? category : services[index].category,
      imageUrl: imageUrl !== undefined ? imageUrl : services[index].imageUrl
    }

    fs.writeFileSync(
      servicesPath,
      JSON.stringify(services, null, 2)
    )

    res.json(services[index])

  } catch (err) {
    console.log('Erro ao atualizar serviço:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// DELETAR SERVIÇO
router.delete('/:companyId/services/:serviceId', async (req, res) => {
  try {
    const { companyId, serviceId } = req.params

    const servicesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/services.json`
    )

    let services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'))

    services = services.filter(s => s.id !== parseInt(serviceId))

    fs.writeFileSync(
      servicesPath,
      JSON.stringify(services, null, 2)
    )

    res.json({ success: true })

  } catch (err) {
    console.log('Erro ao deletar serviço:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ========================
// PROFISSIONAIS
// ========================

// OBTER PROFISSIONAIS
router.get('/:companyId/professionals', async (req, res) => {
  try {
    const { companyId } = req.params

    const professionalsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/professionals.json`
    )

    let professionals = []
    if (fs.existsSync(professionalsPath)) {
      professionals = JSON.parse(fs.readFileSync(professionalsPath, 'utf8'))
    }

    // Filtrar apenas profissionais ativos
    const activeProfessionals = professionals.filter(p => p.active !== false)

    res.json(activeProfessionals || [])

  } catch (err) {
    console.log('Erro ao carregar profissionais:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// CRIAR PROFISSIONAL
router.post('/:companyId/professionals', async (req, res) => {
  try {
    const { companyId } = req.params
    const { name, phone, email, photo, services } = req.body

    const professionalsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/professionals.json`
    )

    let professionals = []
    if (fs.existsSync(professionalsPath)) {
      professionals = JSON.parse(fs.readFileSync(professionalsPath, 'utf8'))
    }

    const newProfessional = {
      id: Date.now(),
      name,
      phone: phone || '',
      email: email || '',
      photo: photo || '',
      services: services || [],
      active: true,
      createdAt: new Date().toISOString()
    }

    professionals.push(newProfessional)

    fs.writeFileSync(
      professionalsPath,
      JSON.stringify(professionals, null, 2)
    )

    console.log(`✅ Profissional criado: ${name} para empresa: ${companyId}`)
    res.json(newProfessional)

  } catch (err) {
    console.log('Erro ao criar profissional:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ATUALIZAR PROFISSIONAL
router.put('/:companyId/professionals/:professionalId', async (req, res) => {
  try {
    const { companyId, professionalId } = req.params
    const updates = req.body

    const professionalsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/professionals.json`
    )

    let professionals = JSON.parse(fs.readFileSync(professionalsPath, 'utf8'))

    const index = professionals.findIndex(p => p.id === parseInt(professionalId))
    if (index === -1) {
      return res.status(404).json({ error: 'Profissional não encontrado' })
    }

    professionals[index] = {
      ...professionals[index],
      ...updates
    }

    fs.writeFileSync(
      professionalsPath,
      JSON.stringify(professionals, null, 2)
    )

    res.json(professionals[index])

  } catch (err) {
    console.log('Erro ao atualizar profissional:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// DELETAR PROFISSIONAL
router.delete('/:companyId/professionals/:professionalId', async (req, res) => {
  try {
    const { companyId, professionalId } = req.params

    const professionalsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/professionals.json`
    )

    let professionals = JSON.parse(fs.readFileSync(professionalsPath, 'utf8'))

    professionals = professionals.filter(p => p.id !== parseInt(professionalId))

    fs.writeFileSync(
      professionalsPath,
      JSON.stringify(professionals, null, 2)
    )

    res.json({ success: true })

  } catch (err) {
    console.log('Erro ao deletar profissional:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ========================
// DISPONIBILIDADE DE HORÁRIOS
// ========================

// GERAR HORÁRIOS DISPONÍVEIS
function generateAvailableSlots(open, close, serviceDuration, existingAppointments) {
  const slots = []
  const [openHour, openMin] = open.split(':').map(Number)
  const [closeHour, closeMin] = close.split(':').map(Number)

  let currentMinutes = openHour * 60 + openMin
  const endMinutes = closeHour * 60 + closeMin

  // Usa a duração do serviço como intervalo entre slots
  const interval = serviceDuration

  while (currentMinutes + serviceDuration <= endMinutes) {
    const timeString = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`
    const endTimeMinutes = currentMinutes + serviceDuration
    const endTimeString = `${String(Math.floor(endTimeMinutes / 60)).padStart(2, '0')}:${String(endTimeMinutes % 60).padStart(2, '0')}`

    // Verificar se o horário está ocupado
    const isOccupied = existingAppointments.some(appointment => {
      return appointment.time === timeString || isOverlapping(timeString, endTimeString, appointment.time, appointment.endTime)
    })

    slots.push({
      time: timeString,
      endTime: endTimeString,
      available: !isOccupied
    })

    currentMinutes += interval
  }

  return slots
}

function isOverlapping(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)

  return s1 < e2 && e1 > s2
}

function timeToMinutes(time) {
  const [hour, min] = time.split(':').map(Number)
  return hour * 60 + min
}

// OBTER DISPONIBILIDADE
router.get('/:companyId/availability', async (req, res) => {
  try {
    const { companyId } = req.params
    const { date, serviceId, professionalId } = req.query

    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória' })
    }

    // Carregar configuração de horários
    const bookingConfigPath = path.join(
      __dirname,
      `../../tenants/${companyId}/webagendamento.json`
    )

    if (!fs.existsSync(bookingConfigPath)) {
      return res.status(404).json({ error: 'Configuração não encontrada' })
    }

    const config = JSON.parse(fs.readFileSync(bookingConfigPath, 'utf8'))

    // Obter dia da semana (0 = Domingo, 6 = Sábado)
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()

    const businessHours = config.businessHours.hours[dayOfWeek]

    if (!businessHours || !businessHours.enabled) {
      return res.json({ available: false, slots: [] })
    }

    // Carregar serviço para obter duração
    let serviceDuration = 60 // Padrão de 60 minutos
    if (serviceId) {
      const servicesPath = path.join(
        __dirname,
        `../../tenants/${companyId}/services.json`
      )

      if (fs.existsSync(servicesPath)) {
        const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'))
        const service = services.find(s => s.id === parseInt(serviceId))
        if (service && service.duration) {
          serviceDuration = parseInt(service.duration)
        }
      }
    }

    // Carregar agendamentos existentes
    const appointmentsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/appointments.json`
    )

    let existingAppointments = []
    if (fs.existsSync(appointmentsPath)) {
      existingAppointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'))
    }

    // Filtrar agendamentos do dia e profissional específico
    // Bloqueia apenas horários confirmados (não pendentes)
    existingAppointments = existingAppointments.filter(appointment => {
      const matchDate = appointment.date === date
      const matchProfessional = !professionalId || appointment.professionalId === parseInt(professionalId)
      // Bloqueia apenas se estiver confirmado (não pendente nem cancelado)
      return matchDate && matchProfessional && appointment.status === 'confirmed'
    })

    // Gerar slots disponíveis usando a duração do serviço como intervalo
    const slots = generateAvailableSlots(
      businessHours.open,
      businessHours.close,
      serviceDuration,
      existingAppointments
    )

    res.json({
      available: true,
      date,
      dayOfWeek,
      businessHours,
      slots
    })

  } catch (err) {
    console.log('Erro ao obter disponibilidade:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// ========================
// AGENDAMENTOS
// ========================

// CRIAR AGENDAMENTO
router.post('/:companyId/appointments', async (req, res) => {
  try {
    const { companyId } = req.params
    const { serviceId, professionalId, date, time, customer } = req.body

    // Validar campos obrigatórios
    if (!serviceId || !date || !time || !customer) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    }

    // Carregar configuração do tenant
    const configPath = path.join(
      __dirname,
      `../../tenants/${companyId}/config.json`
    )

    let companyConfig = {}
    if (fs.existsSync(configPath)) {
      companyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }

    // Verificar se pix está ativo
    const hasPixAutomatico = companyConfig.modules?.includes('pix')

    // Carregar serviço
    const servicesPath = path.join(
      __dirname,
      `../../tenants/${companyId}/services.json`
    )

    let services = []
    if (fs.existsSync(servicesPath)) {
      services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'))
    }

    const service = services.find(s => s.id === parseInt(serviceId))
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' })
    }

    // Calcular horário de término
    const [hour, min] = time.split(':').map(Number)
    const endMinutes = hour * 60 + min + (service.duration || 60)
    const endHour = Math.floor(endMinutes / 60)
    const endMin = endMinutes % 60
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`

    // Carregar agendamentos existentes
    const appointmentsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/appointments.json`
    )

    let appointments = []
    if (fs.existsSync(appointmentsPath)) {
      appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'))
    }

    // Verificar conflito - só bloqueia se já houver agendamento confirmado no mesmo horário
    const hasConflict = appointments.some(appointment => {
      if (appointment.date === date && appointment.status === 'confirmed') {
        const matchProfessional = !professionalId || appointment.professionalId === parseInt(professionalId)
        if (matchProfessional) {
          return isOverlapping(time, endTime, appointment.time, appointment.endTime)
        }
      }
      return false
    })

    if (hasConflict) {
      return res.status(409).json({ error: 'Horário já está ocupado' })
    }

    // Criar agendamento
    const newAppointment = {
      id: Date.now(),
      serviceId: parseInt(serviceId),
      serviceName: service.name,
      servicePrice: service.price,
      service: service,
      professionalId: professionalId ? parseInt(professionalId) : null,
      professionalName: professionalId ? (() => {
        const professionalsPath = path.join(__dirname, `../../tenants/${companyId}/professionals.json`)
        if (fs.existsSync(professionalsPath)) {
          const professionals = JSON.parse(fs.readFileSync(professionalsPath, 'utf8'))
          const prof = professionals.find(p => p.id === parseInt(professionalId))
          return prof ? prof.name : null
        }
        return null
      })() : null,
      date,
      time,
      endTime,
      customer,
      customerName: customer.name,
      customerWhatsApp: customer.whatsapp || customer.phone,
      status: 'pending', // Começa como pendente, só bloqueia horário após confirmar
      paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    }

    // Se pixAutomatico estiver ativo, gerar PIX via Mercado Pago
    if (hasPixAutomatico) {
      try {
        const pixPayment = await PaymentManager.createPixPayment({
          tenantId: companyId,
          amount: service.price,
          description: `Agendamento #${newAppointment.id} - ${service.name}`,
          orderId: newAppointment.id
        })

        // Atualizar agendamento com dados do pagamento
        newAppointment.status = 'pending_payment'
        newAppointment.paymentMethod = 'mercadopago'
        newAppointment.paymentId = pixPayment.paymentId
        newAppointment.pixCode = pixPayment.pixCode
        newAppointment.qrCodeUrl = pixPayment.qrCodeUrl

        console.log(`✅ PIX gerado para agendamento: ${newAppointment.id}`)
      } catch (error) {
        console.error('Erro ao gerar PIX Mercado Pago:', error.message)
        // Continua sem PIX se houver erro (fallback)
      }
    }

    appointments.push(newAppointment)

    fs.writeFileSync(
      appointmentsPath,
      JSON.stringify(appointments, null, 2)
    )

    console.log(`✅ Agendamento criado para empresa: ${companyId}`)

    // Enviar mensagem de confirmação via WhatsApp se a empresa tiver WhatsApp conectado
    try {
      const connection = ConnectionManager.get(companyId)
      console.log(`🔍 Verificando conexão WhatsApp para empresa: ${companyId}`)
      console.log(`🔍 Connection existe: ${!!connection}`)
      console.log(`🔍 Connection connected: ${connection?.connected}`)
      console.log(`🔍 Customer phone: ${customer.whatsapp || customer.phone}`)

      if (connection && connection.connected && (customer.whatsapp || customer.phone)) {
        const phone = (customer.whatsapp || customer.phone).replace(/\D/g, '')
        // Apenas adicionar código do país se não tiver
        const normalizedPhone = phone.startsWith('55') ? phone : '55' + phone
        const jid = `${normalizedPhone}@s.whatsapp.net`

        console.log(`📱 Enviando mensagem para JID: ${jid}`)

        // Formatar data para exibição
        const [year, month, day] = date.split('-')
        const formattedDate = `${day}/${month}/${year}`

        // Mensagem de confirmação
        const message = `🎉 *Agendamento Solicitado!*

Olá ${customer.name}!

Seu agendamento foi recebido com sucesso:

📋 *Serviço:* ${service.name}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${time}
💰 *Valor:* R$ ${service.price.toFixed(2)}

⏳ *Status:* Aguardando confirmação da empresa

💡 Você pode acompanhar o status acessando o site de agendamento e clicando em "Meus Agendamentos".

Obrigado pela preferência! 😊`

        await connection.sock.sendMessage(jid, { text: message })
        console.log(`✅ Mensagem de confirmação enviada com sucesso para: ${normalizedPhone}`)
      } else {
        console.log(`⚠️ WhatsApp não conectado ou sem número de telefone. Mensagem não enviada.`)
      }
    } catch (whatsappError) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', whatsappError.message)
      console.error('❌ Stack:', whatsappError.stack)
      // Não falha o agendamento se o WhatsApp falhar
    }

    res.json(newAppointment)

  } catch (err) {
    console.log('Erro ao criar agendamento:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// OBTER AGENDAMENTOS
router.get('/:companyId/appointments', async (req, res) => {
  try {
    const { companyId } = req.params
    const { date, status, professionalId } = req.query

    const appointmentsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/appointments.json`
    )

    let appointments = []
    if (fs.existsSync(appointmentsPath)) {
      appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'))
    }

    // Filtrar
    if (date) {
      appointments = appointments.filter(a => a.date === date)
    }
    if (status) {
      appointments = appointments.filter(a => a.status === status)
    }
    if (professionalId) {
      appointments = appointments.filter(a => a.professionalId === parseInt(professionalId))
    }

    // Ordenar por data e horário
    appointments.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.time.localeCompare(b.time)
    })

    res.json(appointments)

  } catch (err) {
    console.log('Erro ao carregar agendamentos:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

// CANCELAR AGENDAMENTO
router.delete('/:companyId/appointments/:appointmentId', async (req, res) => {
  try {
    const { companyId, appointmentId } = req.params

    const appointmentsPath = path.join(
      __dirname,
      `../../tenants/${companyId}/appointments.json`
    )

    let appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'))

    const index = appointments.findIndex(a => a.id === parseInt(appointmentId))
    if (index === -1) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    appointments[index].status = 'cancelled'
    appointments[index].cancelledAt = new Date().toISOString()

    fs.writeFileSync(
      appointmentsPath,
      JSON.stringify(appointments, null, 2)
    )

    res.json({ success: true })

  } catch (err) {
    console.log('Erro ao cancelar agendamento:', err)
    res.status(500).json({
      error: 'Erro interno'
    })
  }
})

module.exports = router
