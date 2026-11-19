const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()

// Servir arquivos estáticos da pasta company-sites
router.use(express.static(path.join(__dirname, '../../public/company-sites')))

// Caminho do arquivo de cupons
function getCouponsPath(companyId) {
  return path.join(__dirname, '../../tenants', companyId, 'localdata', 'coupons.json')
}

// Rota que serve o site da empresa (usando o novo index.html com carrinho)
router.get('/:companyId', (req, res) => {
  const { companyId } = req.params

  try {
    // Ler o novo index.html
    const indexPath = path.join(__dirname, '../../public/company-sites/index.html')
    let html = fs.readFileSync(indexPath, 'utf8')

    res.send(html)

  } catch (error) {
    console.error('Erro ao carregar site:', error)
    res.status(500).send('<h1>Erro ao carregar o site</h1>')
  }
})

// Obter cupons disponíveis da empresa (público)
router.get('/:companyId/coupons', (req, res) => {
  try {
    const { companyId } = req.params
    const couponsPath = getCouponsPath(companyId)

    if (!fs.existsSync(couponsPath)) {
      return res.json({ success: true, coupons: [] })
    }

    const coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'))
    
    // Filtrar apenas cupons ativos e não expirados
    const activeCoupons = coupons.filter(c => 
      c.active && 
      (!c.expiresAt || new Date(c.expiresAt) > new Date()) &&
      (!c.maxUses || c.currentUses < c.maxUses)
    )

    res.json({ success: true, coupons: activeCoupons })
  } catch (error) {
    console.error('Erro ao listar cupons:', error)
    res.status(500).json({ error: 'Erro ao listar cupons' })
  }
})

module.exports = router
