const fs = require('fs')
const path = require('path')

/**
 * Middleware para verificar se os módulos individuais expiraram
 * e desativar automaticamente módulos expirados
 */
function moduleExpiration(req, res, next) {
  try {
    const companyId = req.companyId || req.params.companyId || req.params.id

    if (!companyId) {
      return next()
    }

    // SuperAdmin tem acesso total - pula verificação
    if (req.user && req.user.type === 'admin') {
      return next()
    }

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(configPath)) {
      return next()
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const moduleExpirations = config.moduleExpirations || {}
    const modules = config.modules || []

    if (Object.keys(moduleExpirations).length === 0) {
      return next() // Nenhum módulo com expiração
    }

    const now = new Date()
    let hasChanges = false

    // Verificar cada módulo com expiração
    for (const moduleName in moduleExpirations) {
      const expirationDate = new Date(moduleExpirations[moduleName])

      if (now >= expirationDate) {
        // Módulo expirou - remover
        const index = modules.indexOf(moduleName)
        if (index > -1) {
          modules.splice(index, 1)
          delete moduleExpirations[moduleName]
          hasChanges = true
          console.log(`🔒 Módulo ${moduleName} expirou para tenant ${companyId} - removendo`)
        }
      }
    }

    // Se houve mudanças, atualizar os arquivos
    if (hasChanges) {
      config.modules = modules
      config.moduleExpirations = moduleExpirations
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      // Sincronizar com subscription.json
      const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
      if (fs.existsSync(subscriptionPath)) {
        const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
        subscription.modules = modules
        subscription.moduleExpirations = moduleExpirations
        subscription.updatedAt = new Date().toISOString()
        fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))
        console.log(`✅ Módulos expirados removidos e sincronizados: ${companyId}`)
      }
    }

    next()
  } catch (err) {
    console.error('Erro ao verificar expiração de módulos:', err)
    next() // Não bloqueia a requisição em caso de erro
  }
}

module.exports = moduleExpiration
