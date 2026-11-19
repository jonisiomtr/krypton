const express = require('express')

const router = express.Router()
const fs = require('fs')
const path = require('path')
const auth = require('../middlewares/auth')

// LISTAR AGENDAMENTOS
router.get('/', auth, (req, res) => {
  let clientId

  // ADMIN
  if (req.user.type === 'admin') {
    clientId = req.query.clientId
  }
  // EMPRESA
  else {
    clientId = req.user.companyId
  }

  if (!clientId) {
    return res.status(400).json({
      error: 'clientId obrigatório'
    })
  }

  const filePath = path.join(
    __dirname,
    `../../tenants/${clientId}/appointments.json`
  )

  // cria se nao existir
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]')
  }

  const appointments = JSON.parse(fs.readFileSync(filePath))

  return res.json(appointments)
})

// LISTAR AGENDAMENTOS POR COMPANY ID (para o painel)
router.get('/listar/:companyId', (req, res) => {
  const { companyId } = req.params

  console.log('📅 Buscando agendamentos para companyId:', companyId)

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/appointments.json`
  )

  console.log('📂 Caminho do arquivo:', filePath)

  // cria se nao existir
  if (!fs.existsSync(filePath)) {
    console.log('❌ Arquivo não existe, criando novo')
    fs.writeFileSync(filePath, '[]')
  }

  const appointments = JSON.parse(fs.readFileSync(filePath))

  console.log('✅ Agendamentos encontrados:', appointments.length)

  return res.json({ appointments })
})

// ATUALIZAR STATUS DO AGENDAMENTO
router.put('/:companyId/:appointmentId', (req, res) => {
  const { companyId, appointmentId } = req.params
  const { status } = req.body

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/appointments.json`
  )

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Agendamentos não encontrados' })
  }

  let appointments = JSON.parse(fs.readFileSync(filePath))

  const appointmentIndex = appointments.findIndex(a => a.id === parseInt(appointmentId))

  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  appointments[appointmentIndex].status = status
  appointments[appointmentIndex].updatedAt = new Date().toISOString()

  fs.writeFileSync(filePath, JSON.stringify(appointments, null, 2))

  return res.json({ success: true, appointment: appointments[appointmentIndex] })
})

// DELETAR AGENDAMENTO (para o painel administrativo)
router.delete('/:companyId/:appointmentId', auth, (req, res) => {
  const { companyId, appointmentId } = req.params

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/appointments.json`
  )

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Agendamentos não encontrados' })
  }

  let appointments = JSON.parse(fs.readFileSync(filePath))

  const appointmentIndex = appointments.findIndex(a => a.id === parseInt(appointmentId))

  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  appointments.splice(appointmentIndex, 1)

  fs.writeFileSync(filePath, JSON.stringify(appointments, null, 2))

  return res.json({ success: true, message: 'Agendamento removido com sucesso' })
})

// CONSULTAR AGENDAMENTOS POR CLIENTE (para o site público)
router.get('/cliente/:companyId', (req, res) => {
  const { companyId } = req.params
  const { nome, whatsapp } = req.query

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/appointments.json`
  )

  if (!fs.existsSync(filePath)) {
    return res.json([])
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    if (!fileContent || fileContent.trim() === '') {
      return res.json([])
    }

    const appointments = JSON.parse(fileContent)

    // Filtrar por nome ou WhatsApp (aceita customerWhatsApp ou customer.phone)
    const filtered = appointments.filter(a => {
      const customerName = a.customerName || a.customer?.name || ''
      const customerWhatsapp = a.customerWhatsApp || a.customer?.phone || a.customer?.whatsapp || ''

      if (nome && whatsapp) {
        return customerName.toLowerCase().includes(nome.toLowerCase()) &&
               customerWhatsapp.includes(whatsapp)
      } else if (nome) {
        return customerName.toLowerCase().includes(nome.toLowerCase())
      } else if (whatsapp) {
        return customerWhatsapp.includes(whatsapp)
      }
      return false
    })

    return res.json(filtered)
  } catch (err) {
    console.log('Erro ao ler agendamentos:', err)
    return res.json([])
  }
})

// CANCELAR AGENDAMENTO PELO CLIENTE (antes da confirmação)
router.delete('/cliente/:companyId/:appointmentId', (req, res) => {
  const { companyId, appointmentId } = req.params

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/appointments.json`
  )

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Agendamentos não encontrados' })
  }

  let appointments = JSON.parse(fs.readFileSync(filePath))

  const appointmentIndex = appointments.findIndex(a => a.id === parseInt(appointmentId))

  if (appointmentIndex === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  const appointment = appointments[appointmentIndex]

  // Só permite cancelar se ainda estiver pendente
  if (appointment.status !== 'pending') {
    return res.status(400).json({ 
      error: 'Este agendamento já foi confirmado pela empresa e não pode mais ser cancelado' 
    })
  }

  appointments.splice(appointmentIndex, 1)

  fs.writeFileSync(filePath, JSON.stringify(appointments, null, 2))

  return res.json({ success: true, message: 'Agendamento cancelado com sucesso' })
})

module.exports = router