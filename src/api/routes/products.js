const express = require('express')

const fs = require('fs')

const path = require('path')

const auth = require('../middlewares/auth')

const router = express.Router()

// =========================
// GET FILE
// =========================
function getFile(companyId) {

  const filePath = path.join(

    __dirname,

    `../../tenants/${companyId}/products.json`

  )

  if (!fs.existsSync(filePath)) {

    fs.writeFileSync(
      filePath,
      '[]'
    )

  }

  return filePath

}

// =========================
// LISTAR
// =========================
router.get('/', auth, (req, res) => {

  try {

  const companyId =
  req.user.companyId

  const filePath =
  getFile(companyId)

  const products =
  JSON.parse(
    fs.readFileSync(filePath)
  )

  res.json(products)

  } catch (err) {

  console.log(
    'ERRO ADD PRODUTO:',
    err
  )

  res.status(500).json({
    error: err.message
  })

}

})


// =========================
// ADD PRODUTO
// =========================
router.post('/', auth, (req, res) => {

  const companyId =
  req.user.companyId

  const {

    code,

    name,

    description,

    price,

    stock,

    image,

    category

  } = req.body

  const filePath =
  getFile(companyId)

  const products =
  JSON.parse(
    fs.readFileSync(filePath)
  )

  // =========================
  // GERAR ID
  // =========================
  const nextId =

    products.length > 0

    ? Math.max(
        ...products.map(
          p => p.id
        )
      ) + 1

    : 1

  // =========================
  // GERAR CODE
  // =========================
  const productCode =

    code && code !== ''

    ? code

    : String(nextId)

  // =========================
  // VERIFICA CODIGO
  // =========================
  const existing =
  products.find(

    p => p.code === productCode

  )

  // =========================
  // SE EXISTIR
  // =========================
  if (existing) {

    existing.stock +=
    Number(stock || 1)

    fs.writeFileSync(

      filePath,

      JSON.stringify(
        products,
        null,
        2
      )

    )

    return res.json(products)

  }

  // =========================
  // NOVO PRODUTO
  // =========================
  const newProduct = {

    id: String(nextId),

    code: productCode,

    name,

    description:
    description || '',

    price:
    Number(price),

    stock:
    Number(stock || 1),

    image:
    image || '',

    category: category || '',

    active: true,

    createdAt:
    Date.now()

  }

  products.push(newProduct)

  fs.writeFileSync(

    filePath,

    JSON.stringify(
      products,
      null,
      2
    )

  )

  res.json(products)

})

// =========================
// DELETE
// =========================
router.delete('/:id', auth, (req, res) => {

  const companyId =
  req.user.companyId

  const filePath =
  getFile(companyId)

  const products =
  JSON.parse(
    fs.readFileSync(filePath)
  )

  const updated =
  products.filter(

    p =>

      String(p.id) !==
      String(req.params.id)

  )

  fs.writeFileSync(

    filePath,

    JSON.stringify(
      updated,
      null,
      2
    )

  )

  res.json(updated)

})

// =========================
// UPDATE (EDITAR)
// =========================
router.put('/:id', auth, (req, res) => {

  const companyId =
  req.user.companyId

  const {
    code,
    name,
    description,
    price,
    stock,
    image,
    category
  } = req.body

  const filePath =
  getFile(companyId)

  const products =
  JSON.parse(
    fs.readFileSync(filePath)
  )

  const productIndex =
  products.findIndex(
    p => String(p.id) === String(req.params.id)
  )

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Produto não encontrado' })
  }

  // Atualizar produto
  products[productIndex] = {
    ...products[productIndex],
    code: code || products[productIndex].code,
    name: name || products[productIndex].name,
    description: description !== undefined ? description : products[productIndex].description,
    price: price !== undefined ? Number(price) : products[productIndex].price,
    stock: stock !== undefined ? Number(stock) : products[productIndex].stock,
    image: image !== undefined ? image : products[productIndex].image,
    category: category !== undefined ? category : products[productIndex].category
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      products,
      null,
      2
    )
  )

  res.json(products)

})

// =========================
// BACKUP (EXPORTAR)
// =========================
router.get('/backup', auth, (req, res) => {
  try {
    const companyId = req.user.companyId
    const filePath = getFile(companyId)
    const products = JSON.parse(fs.readFileSync(filePath))

    res.json({
      success: true,
      products: products,
      backupDate: new Date().toISOString(),
      companyId: companyId
    })
  } catch (err) {
    console.log('ERRO BACKUP:', err)
    res.status(500).json({ error: err.message })
  }
})

// =========================
// RESTAURAR (IMPORTAR BACKUP)
// =========================
router.post('/restore', auth, (req, res) => {
  try {
    const companyId = req.user.companyId
    const { products } = req.body

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Formato inválido. Esperado array de produtos.' })
    }

    const filePath = getFile(companyId)

    // Restaurar produtos
    fs.writeFileSync(
      filePath,
      JSON.stringify(products, null, 2)
    )

    const restoredProducts = JSON.parse(fs.readFileSync(filePath))

    res.json({
      success: true,
      products: restoredProducts,
      message: `${products.length} produtos restaurados com sucesso!`
    })
  } catch (err) {
    console.log('ERRO RESTAURAR:', err)
    res.status(500).json({ error: err.message })
  }
})

// =========================
// IMPORTAR CSV EM MASSA
// =========================
router.post('/import-csv', auth, (req, res) => {
  try {
    const companyId = req.user.companyId
    const { csvData } = req.body

    if (!csvData) {
      return res.status(400).json({ error: 'Dados CSV não fornecidos' })
    }

    const filePath = getFile(companyId)
    const existingProducts = JSON.parse(fs.readFileSync(filePath))

    // Parse CSV
    const lines = csvData.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const importedProducts = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map(v => v.trim())
      const product = {}

      headers.forEach((header, index) => {
        product[header] = values[index]
      })

      // Mapear campos CSV para formato do sistema
      const newProduct = {
        id: String(Date.now() + i),
        code: product.codigo || product.code || String(Date.now() + i),
        name: product.nome || product.name || 'Sem nome',
        description: product.descricao || product.description || '',
        price: Number(product.preco || product.price || 0),
        stock: Number(product.estoque || product.stock || 0),
        image: product.imagem || product.image || '',
        active: true,
        createdAt: Date.now()
      }

      importedProducts.push(newProduct)
    }

    // Adicionar produtos importados
    const updatedProducts = [...existingProducts, ...importedProducts]

    fs.writeFileSync(
      filePath,
      JSON.stringify(updatedProducts, null, 2)
    )

    res.json({
      success: true,
      products: updatedProducts,
      imported: importedProducts.length,
      message: `${importedProducts.length} produtos importados com sucesso!`
    })
  } catch (err) {
    console.log('ERRO IMPORTAR CSV:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router