const fs = require('fs')
const path = require('path')

/**
 * Middleware para verificar expiração de módulos individuais
 * Desativa automaticamente módulos que expiraram
 */
function moduleExpirationCheck(req, res, next) {
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

    // Verificar se tem moduleExpirations
    if (!config.moduleExpirations || Object.keys(config.moduleExpirations).length === 0) {
      return next()
    }

    const now = new Date()
    let hasChanges = false
    const newModules = [...config.modules]
    const newModuleExpirations = { ...config.moduleExpirations }

    // Verificar cada módulo com expiração
    Object.keys(config.moduleExpirations).forEach(moduleName => {
      const expirationDate = new Date(config.moduleExpirations[moduleName])

      if (now >= expirationDate) {
        // Módulo expirou - remover
        const index = newModules.indexOf(moduleName)
        if (index > -1) {
          newModules.splice(index, 1)
          delete newModuleExpirations[moduleName]
          hasChanges = true
          console.log(`⏰ Módulo ${moduleName} expirou para tenant ${companyId} - removendo`)
        }
      }
    })

    // Se houve mudanças, atualizar o config
    if (hasChanges) {
      config.modules = newModules
      config.moduleExpirations = newModuleExpirations
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      // Atualizar subscription.json se existir
      const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
      if (fs.existsSync(subscriptionPath)) {
        const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
        subscription.modules = newModules
        subscription.moduleExpirations = newModuleExpirations
        subscription.updatedAt = new Date().toISOString()
        fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))
      }

      console.log(`✅ Módulos expirados removidos para tenant ${companyId}`)
    }

    next()
  } catch (err) {
    console.error('Erro ao verificar expiração de módulos:', err)
    next() // Não bloqueia a requisição em caso de erro
  }
}

module.exports = moduleExpirationCheck
