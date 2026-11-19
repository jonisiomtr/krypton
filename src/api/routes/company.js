const express = require('express')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const sharp = require('sharp')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limite
  },
  fileFilter: (req, file, cb) => {
    // Aceita todos os formatos de imagem comuns
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|svg|ico|tiff|tif/
    const mimetype = allowedTypes.test(file.mimetype)
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error('Formato de imagem não suportado. Use: JPG, PNG, GIF, WEBP, SVG, BMP, ICO, TIFF'))
  }
})

// PEGAR CONFIGURAÇÕES
router.get(
  '/:companyId',
  async (req, res) => {

    try {

      const { companyId } =
      req.params

      const configPath =
      path.join(
        __dirname,
        `../../tenants/${companyId}/config.json`
      )

      if (
        !fs.existsSync(configPath)
      ) {

        return res.status(404).json({

          error:
          'Empresa não encontrada'

        })

      }

      const config =
      JSON.parse(

        fs.readFileSync(
          configPath,
          'utf8'
        )

      )

      res.json(config)

    } catch (err) {

      console.log(err)

      res.status(500).json({

        error:
        'Erro interno'

      })

    }

  }
)

// CONFIGURAÇÕES - UPLOAD DE LOGO
router.post(
  '/settings',
  upload.single('logo'),
  async (req, res) => {

    try {

      const {
  companyId,
  displayName,
  name,
  phone,
  email,
  address,
  description,
  cnpj
} = req.body

      console.log('📝 Recebendo configurações para empresa:', companyId)

      const configPath =
      path.join(
        __dirname,
        `../../tenants/${companyId}/config.json`
      )

      if (
        !fs.existsSync(configPath)
      ) {

        console.log('❌ Empresa não encontrada:', companyId)
        return res.status(404).json({
          error: 'Empresa não encontrada'
        })
      }

      const config = JSON.parse(
        fs.readFileSync(configPath)
      )

      // NOME VISUAL
      config.displayName =
      displayName

      // NOME INTERNO
      config.name =
      name

      // TELEFONE
      if (phone !== undefined) {
        config.phone = phone
      }

      // EMAIL
      if (email !== undefined) {
        config.email = email
      }

      // ENDEREÇO
      if (address !== undefined) {
        config.address = address
      }

      // DESCRIÇÃO
      if (description !== undefined) {
        config.description = description
      }

      // CNPJ
      if (cnpj !== undefined) {
        config.cnpj = cnpj
      }

      // LOGO
 if (req.file) {
  console.log('🖼️ Processando imagem:', req.file.originalname, 'Tipo:', req.file.mimetype, 'Tamanho:', req.file.size)

  const uploadPath = path.join(
    __dirname,
    `../../uploads/${companyId}`
  )

  // Garante que a pasta existe
  if (!fs.existsSync(uploadPath)) {
    console.log('📁 Criando diretório:', uploadPath)
    fs.mkdirSync(uploadPath, { recursive: true })
  }

  const finalImage = path.join(
    uploadPath,
    'logo.png'
  )

  // Converte qualquer imagem para PNG com otimização
  await sharp(req.file.buffer)
    .resize(500, 500, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .png({
      quality: 85,
      compressionLevel: 9
    })
    .toFile(finalImage)

  console.log('✅ Imagem salva em:', finalImage)

  // Salva sempre o mesmo caminho
  config.logo =
    `/uploads/${companyId}/logo.png`

} else {
  console.log('ℹ️ Nenhuma imagem enviada')
}

      fs.writeFileSync(
        configPath,
        JSON.stringify(config, null, 2)
      )

      console.log('✅ Configurações salvas com sucesso')

      res.json({
        success: true,
        config
      })

    } catch (err) {

      console.log('❌ Erro ao salvar configurações:', err)

      if (err.message.includes('Formato de imagem não suportado')) {
        return res.status(400).json({
          error: err.message
        })
      }

      if (err.message.includes('file too large')) {
        return res.status(400).json({
          error: 'Imagem muito grande. Máximo 5MB'
        })
      }

      res.status(500).json({
        error: 'Erro interno ao salvar configurações'
      })

    }

  }
)

// ALTERAR SENHA
router.post(
  '/password',
  async (req, res) => {

    try {

      const {
        companyId,
        password
      } = req.body

      const configPath =
      path.join(
        __dirname,
        `../../tenants/${companyId}/config.json`
      )

      if (
        !fs.existsSync(configPath)
      ) {

        return res.status(404).json({

          error:
          'Empresa não encontrada'

        })

      }

      const config =
      JSON.parse(

        fs.readFileSync(
          configPath,
          'utf8'
        )

      )

      // NOVA SENHA
      config.password =
      password

      fs.writeFileSync(

        configPath,

        JSON.stringify(
          config,
          null,
          2
        )

      )

      return res.json({

        success: true

      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({


        error:
        'Erro interno'

      })

    }

  }
)

// ATUALIZAR CONFIGURAÇÕES DO WHATSAPP
router.post(
  '/whatsapp',
  async (req, res) => {

    try {

      const {
        companyId,
        welcomeMessage
      } = req.body

      const configPath =
      path.join(
        __dirname,
        `../../tenants/${companyId}/config.json`
      )

      if (
        !fs.existsSync(configPath)
      ) {

        return res.status(404).json({

          error:
          'Empresa não encontrada'

        })

      }

      const config =
      JSON.parse(

        fs.readFileSync(
          configPath,
          'utf8'
        )

      )

      // Atualizar mensagem de boas-vindas
      if (welcomeMessage !== undefined) {
        config.welcomeMessage = welcomeMessage
      }

      fs.writeFileSync(

        configPath,

        JSON.stringify(
          config,
          null,
          2
        )

      )

      return res.json({

        success: true,
        config

      })

    } catch (err) {

      console.log(err)

      return res.status(500).json({

        error:
        'Erro interno'

      })

    }

  }
)

module.exports = router
