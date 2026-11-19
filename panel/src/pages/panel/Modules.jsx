import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import PaymentModal from '../../components/PaymentModal'
import '../../styles/painelEmpresas/modules.css'

export default function Modules({ companyId, onUpdate, isReadOnly }) {

  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [moduleExpirations, setModuleExpirations] = useState({})

  const allModules = [
    {
      key: 'assistant',
      label: 'Assistente IA 🤖',
      description: 'Atendimento inteligente por WhatsApp',
      price: 50.00
    },
    {
      key: 'delivery',
      label: 'Delivery 🚚',
      description: 'Sistema completo de entregas',
      price: 60.00
    },
    {
      key: 'scheduling',
      label: 'Agendamentos 📅',
      description: 'Gerenciamento de horários',
      price: 0.50
    },
    {
      key: 'catalog',
      label: 'Catálogo 🛍️',
      description: 'Gestão de produtos e estoque',
      price: 50.00
    },
    {
      key: 'pdv_caixa',
      label: 'PDV Frente de Caixa 🖥️',
      description: 'Sistema de ponto de venda com código de barras e cupom fiscal',
      price: 160.00
    },
    {
      key: 'qrcode',
      label: 'WhatsApp 📱',
      description: 'Integração com WhatsApp',
      price: 20.00
    },
    {
      key: 'pix',
      label: 'PIX Automático 💳',
      description: 'Pagamentos instantâneos',
      price: 50.00
    },
    {
      key: 'webagendamento',
      label: 'Website de Agendamento 🌐',
      description: 'Página de agendamento online',
      price: 60.00
    },
    {
      key: 'website',
      label: 'Website 🌐',
      description: 'Site institucional completo',
      price: 60.00
    }
  ]

  useEffect(() => {
    loadModules()
    loadSubscriptionStatus()
  }, [companyId])

  async function loadModules() {
    try {
      const token = localStorage.getItem('token')

      const response = await api.get(
        `/companies/modules/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setModules(response.data.modules || [])
      setModuleExpirations(response.data.moduleExpirations || {})
      setLoading(false)

    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }

  async function loadSubscriptionStatus() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/auth/subscription-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscriptionStatus(response.data)
    } catch (err) {
      console.error('Erro ao carregar status da assinatura:', err)
    }
  }

  function handleModuleClick(moduleKey, isActive) {
    if (isActive) {
      // Módulo já ativo - não faz nada (apenas informativo)
      return
    }

    // Módulo inativo - abre modal de pagamento
    const module = allModules.find(m => m.key === moduleKey)
    setSelectedModule(module)
    setIsPaymentModalOpen(true)
  }

  function handlePaymentSuccess() {
    setIsPaymentModalOpen(false)
    setSelectedModule(null)
    // Recarrega módulos para mostrar o novo módulo ativo
    loadModules()
    if (onUpdate) {
      onUpdate()
    }
  }

  function getTimeRemaining(expirationDate) {
    if (!expirationDate) return null

    const now = new Date()
    const expiration = new Date(expirationDate)
    const diff = expiration - now

    if (diff <= 0) return null

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: '#94a3b8'
      }}>
        <p>Carregando módulos...</p>
      </div>
    )
  }

  return (
    <div className='modules-container'>
      <div className='modules-header'>
        <h2>🧠 Módulos Disponíveis</h2>
        <p>Gerencie os módulos da sua empresa</p>
      </div>

      <div className='modules-grid'>
        {allModules.map((module) => {
          const isActive = modules.includes(module.key)
          const expirationDate = moduleExpirations[module.key]
          const timeRemaining = getTimeRemaining(expirationDate)
          const isInTrial = !!timeRemaining

          return (
            <div
              key={module.key}
              className={`module-card ${isActive ? 'active' : 'inactive'}`}
              onClick={() => handleModuleClick(module.key, isActive)}
              style={{ cursor: isActive ? 'default' : 'pointer' }}
            >
              <div className='module-status-badge'>
                {isInTrial ? '🎁 Teste Grátis' : (isActive ? '✅ Ativo' : '🔒 Disponível')}
              </div>

              <div className='module-icon'>
                {module.label.split(' ').pop()}
              </div>

              <h3>{module.label}</h3>

              <p className='module-description'>
                {module.description}
              </p>

              {isInTrial && (
                <div className='module-countdown'>
                  ⏰ Expira em: {timeRemaining}
                </div>
              )}

              <div className='module-price'>
                {isInTrial ? 'GRÁTIS' : `R$ ${module.price.toFixed(2).replace('.', ',')}`}
              </div>

              {!isActive && !isInTrial && (
                <div className='module-action'>
                  <span>💳 Comprar Agora</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setSelectedModule(null)
        }}
        module={selectedModule}
        companyId={companyId}
      />
    </div>
  )
}