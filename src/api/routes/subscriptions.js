const express = require('express')
const router = express.Router()
const Database = require('../../database/Database')
const auth = require('../middlewares/auth')

// ========================
// LISTAR PLANOS DISPONÍVEIS
// ========================
router.get('/plans', (req, res) => {
  try {
    const plansData = Database.readPlans()
    res.json(plansData)
  } catch (error) {
    console.error('Erro ao listar planos:', error)
    res.status(500).json({ error: 'Erro ao listar planos' })
  }
})

// ========================
// BUSCAR ASSINATURA DO TENANT
// ========================
router.get('/:tenantId', auth, (req, res) => {
  try {
    const { tenantId } = req.params
    
    // Verificar se o usuário tem acesso a este tenant
    if (req.user.type === 'company' && req.user.companyId !== tenantId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }
    
    const subscription = Database.readSubscription(tenantId)
    
    if (!subscription) {
      return res.json({ 
        hasSubscription: false,
        subscription: null 
      })
    }
    
    res.json({ 
      hasSubscription: true,
      subscription 
    })
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error)
    res.status(500).json({ error: 'Erro ao buscar assinatura' })
  }
})

// ========================
// CRIAR ASSINATURA (manual)
// ========================
router.post('/:tenantId', auth, (req, res) => {
  try {
    const { tenantId } = req.params
    const { planId } = req.body
    
    // Apenas admin pode criar assinatura manual
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Apenas admin pode criar assinatura manual' })
    }
    
    if (!planId) {
      return res.status(400).json({ error: 'planId é obrigatório' })
    }
    
    const subscription = Database.createSubscription(tenantId, planId)
    
    console.log(`✅ Assinatura criada para tenant ${tenantId}: plano ${planId}`)
    
    res.json({ success: true, subscription })
  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    res.status(500).json({ error: error.message || 'Erro ao criar assinatura' })
  }
})

// ========================
// ATUALIZAR ASSINATURA
// ========================
router.put('/:tenantId', auth, (req, res) => {
  try {
    const { tenantId } = req.params
    
    // Verificar se o usuário tem acesso a este tenant
    if (req.user.type === 'company' && req.user.companyId !== tenantId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }
    
    const subscription = Database.updateSubscription(tenantId, req.body)
    
    console.log(`✅ Assinatura atualizada para tenant ${tenantId}`)
    
    res.json({ success: true, subscription })
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error)
    res.status(500).json({ error: error.message || 'Erro ao atualizar assinatura' })
  }
})

// ========================
// CANCELAR ASSINATURA
// ========================
router.delete('/:tenantId', auth, (req, res) => {
  try {
    const { tenantId } = req.params
    
    // Verificar se o usuário tem acesso a este tenant
    if (req.user.type === 'company' && req.user.companyId !== tenantId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }
    
    const subscription = Database.updateSubscription(tenantId, { 
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    })
    
    console.log(`✅ Assinatura cancelada para tenant ${tenantId}`)
    
    res.json({ success: true, subscription })
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error)
    res.status(500).json({ error: error.message || 'Erro ao cancelar assinatura' })
  }
})

// ========================
// HISTÓRICO DE PAGAMENTOS DO TENANT
// ========================
router.get('/:tenantId/payments', auth, (req, res) => {
  try {
    const { tenantId } = req.params
    
    // Verificar se o usuário tem acesso a este tenant
    if (req.user.type === 'company' && req.user.companyId !== tenantId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }
    
    const payments = Database.readPayments(tenantId)
    
    res.json({ payments })
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error)
    res.status(500).json({ error: 'Erro ao buscar pagamentos' })
  }
})

module.exports = router
