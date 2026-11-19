const fs = require('fs')
const path = require('path')

/**
 * Middleware para verificar se o período de teste expirou
 * e suspender a conta (inativa) ou atualizar os módulos para o plano Base
 */
function trialCheck(req, res, next) {
  try {
    const companyId = req.companyId || req.params.companyId || req.params.id

    if (!companyId) {
      return next()
    }

    // SuperAdmin tem acesso total - pula verificação
    if (req.user && req.user.type === 'admin') {
      return next()
    }

    const subscriptionPath = path.join(__dirname, `../../tenants/${companyId}/subscription.json`)
    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)

    if (!fs.existsSync(subscriptionPath) || !fs.existsSync(configPath)) {
      return next()
    }

    const subscription = JSON.parse(fs.readFileSync(subscriptionPath, 'utf8'))
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    // Verificar se a conta está suspensa
    if (config.status === 'suspended') {
      console.log(`⚠️ Conta ${companyId} está suspensa/inativa`)
      return res.status(403).json({
        error: 'Conta suspensa',
        message: 'Sua conta está suspensa. Entre em contato com o suporte.'
      })
    }

    // Verificar se está no período de teste
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      const trialEndDate = new Date(subscription.trialEndsAt)
      const now = new Date()

      if (now >= trialEndDate) {
        // Teste expirou - suspender a conta (inativa)
        console.log(`🔒 Teste expirado para tenant ${companyId} - suspendendo conta`)

        // Atualizar config.json - marcar como suspenso com módulos vazios
        config.modules = []
        config.status = 'suspended'
        config.suspendedAt = now.toISOString()
        config.suspendedReason = 'Teste expirado'
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

        // Atualizar subscription.json
        subscription.status = 'expired'
        subscription.expiredAt = now.toISOString()
        fs.writeFileSync(subscriptionPath, JSON.stringify(subscription, null, 2))

        console.log(`✅ Tenant ${companyId} suspenso (inativo) com módulos vazios`)

        return res.status(403).json({
          error: 'Conta suspensa',
          message: 'Seu período de teste expirado. Entre em contato com o suporte para reativar sua conta.'
        })
      }
    }

    next()
  } catch (err) {
    console.error('Erro ao verificar período de teste:', err)
    next() // Não bloqueia a requisição em caso de erro
  }
}

module.exports = trialCheck
