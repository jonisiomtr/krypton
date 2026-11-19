const Database = require('../../database/Database')

/**
 * Middleware para verificar se o tenant tem assinatura ativa
 * e se o módulo está incluído no plano
 */
function checkSubscription(moduleKey) {
  return (req, res, next) => {
    try {
      // Extrair tenantId do token ou parâmetro
      const tenantId = req.user?.companyId || req.params?.companyId || req.params?.tenantId || req.body?.companyId
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant não identificado' })
      }

      // Admin tem acesso a tudo
      if (req.user?.type === 'admin') {
        return next()
      }

      // Verificar se o módulo está acessível
      const hasAccess = Database.checkModuleAccess(tenantId, moduleKey)
      
      if (!hasAccess) {
        return res.status(402).json({ 
          error: 'Módulo não incluído no plano',
          message: `O módulo ${moduleKey} não está incluído no seu plano atual. Assine para acessar.`,
          module: moduleKey
        })
      }

      next()
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error)
      res.status(500).json({ error: 'Erro ao verificar assinatura' })
    }
  }
}

module.exports = { checkSubscription }
