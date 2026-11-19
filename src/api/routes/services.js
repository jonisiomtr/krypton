const express = require('express')
const fs = require('fs')
const path = require('path')

const auth = require('../middlewares/auth')

const router = express.Router()

// LISTAR
router.get('/', auth, (req, res) => {

  const companyId = req.user.companyId

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/services.json`
  )

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]')
  }

  const services = JSON.parse(
    fs.readFileSync(filePath)
  )

  res.json(services)
})

// ADICIONAR
router.post('/', auth, (req, res) => {

  const companyId = req.user.companyId

  const { name, price, duration, description, category, imageUrl } = req.body

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/services.json`
  )

  const services = JSON.parse(
    fs.readFileSync(filePath)
  )

  // DUPLICADO
  const exists = services.find(
    s =>
      s.name.toLowerCase() ===
      name.toLowerCase()
  )

  if (exists) {
    return res.status(400).json({
      error: 'Serviço já existe'
    })
  }

  // ID AUTOMÁTICO
  const nextId =
    services.length > 0
      ? Math.max(...services.map(s => s.id)) + 1
      : 1

  services.push({

    id: nextId,

    name,

    price,

    duration: duration || 60,

    description: description || '',

    category: category || '',

    imageUrl: imageUrl || '',

    createdAt: new Date().toISOString()

  })

  fs.writeFileSync(
    filePath,
    JSON.stringify(services, null, 2)
  )

  res.json(services)
})

// ATUALIZAR
router.put('/:id', auth, (req, res) => {

  const companyId = req.user.companyId

  const serviceId = String(req.params.id)

  const { name, price, duration, description, category, imageUrl } = req.body

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/services.json`
  )

  let services = JSON.parse(
    fs.readFileSync(filePath)
  )

  const index = services.findIndex(
    s => String(s.id) === serviceId
  )

  if (index === -1) {
    return res.status(404).json({
      error: 'Serviço não encontrado'
    })
  }

  services[index] = {
    ...services[index],
    name,
    price,
    duration: duration || services[index].duration,
    description: description !== undefined ? description : services[index].description,
    category: category !== undefined ? category : services[index].category,
    imageUrl: imageUrl !== undefined ? imageUrl : services[index].imageUrl
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(services, null, 2)
  )

  res.json(services)
})

// REMOVER
router.delete('/:id', auth, (req, res) => {

  const companyId = req.user.companyId

  const serviceId = String(req.params.id)

  const filePath = path.join(
    __dirname,
    `../../tenants/${companyId}/services.json`
  )

  let services = JSON.parse(
    fs.readFileSync(filePath)
  )

  services = services.filter(
    s => String(s.id) !== serviceId
  )

  fs.writeFileSync(
    filePath,
    JSON.stringify(services, null, 2)
  )

  res.json(services)
})

module.exports = router