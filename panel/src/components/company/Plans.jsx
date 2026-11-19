import { useEffect, useState } from 'react'
import api from '../../services/api'
import '../../styles/company-modulos.css'

export default function Plans({ companyId, onUpdate }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadModules()
  }, [])

  async function loadModules() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/companies/modules/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setModules(response.data.modules || [])
    } catch (err) {
      console.log(err)
    }
  }

  async function purchaseModule(moduleKey) {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const isActive = modules.includes(moduleKey)

      if (isActive) {
        alert('Este módulo já está ativo!')
        return
      }

      const confirmed = confirm(`Deseja ativar o módulo ${moduleKey}?`)
      if (!confirmed) return

      await api.post(
        `/companies/${companyId}/modules`,
        {
          moduleName: moduleKey,
          action: 'enable'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      await loadModules()

      if (onUpdate) {
        onUpdate()
      }

      alert('✅ Módulo ativado com sucesso!')

    } catch (err) {
      console.log(err)
      alert('Erro ao ativar módulo. Entre em contato com o suporte.')
    } finally {
      setLoading(false)
    }
  }

  const availableModules = [
    {
      key: 'assistant',
      name: 'Assistente IA',
      icon: '🤖',
      description: 'Responde clientes automaticamente.',
      price: 50.90
    },
    {
      key: 'catalog',
      name: 'Catálogo',
      icon: '🛍️',
      description: 'Mostra produtos automaticamente.',
      price: 50.00
    },
    {
      key: 'pdv_caixa',
      name: 'PDV Frente de Caixa',
      icon: '🖥️',
      description: 'Sistema de ponto de venda com código de barras e impressão de cupom fiscal.',
      price: 160.00
    },
    {
      key: 'delivery',
      name: 'Delivery',
      icon: '🚚',
      description: 'Sistema automático de entregas.',
      price: 60.00
    },
    {
      key: 'scheduling',
      name: 'Agendamentos',
      icon: '📅',
      description: 'Sistema de reservas automático.',
      price: 0.50
    },
    {
      key: 'qrcode',
      name: 'WhatsApp 📱',
      icon: '📱',
      description: 'Usado para voce poder ler o bot em qualquer dispositivo.',
      price: 20.00
    },
    {
      key: 'pix',
      name: 'PIX Automático',
      icon: '💳',
      description: 'Cobranças automáticas via pix.',
      price: 50.00
    },
    {
      key: 'website',
      name: 'Website',
      icon: '🌐',
      description: 'Site profissional automático para sua empresa.',
      price: 60.60
    },
    {
      key: 'webagendamento',
      name: 'Web Agendamento',
      icon: '📅',
      description: 'Sistema de agendamento online com página personalizada.',
      price: 60.00
    }
  ]

  return (
    <div className='modules-page'>
      <div className='modules-header'>
        <h1>
          Planos e Módulos
        </h1>
        <p>
          Compre módulos adicionais para expandir seu sistema
        </p>
      </div>

      <div className='modules-grid'>
        {availableModules.map((module, index) => {
          const active = modules.includes(module.key)

          return (
            <div
              key={index}
              className={`module-card ${active ? 'active' : 'locked'}`}
            >
              {!active && (
                <div className='module-lock'>
                  🔒
                </div>
              )}

              <div className='module-top'>
                <div className='module-icon'>
                  {module.icon}
                </div>
                <div className={`module-status ${active ? 'on' : 'off'}`}>
                  {active ? 'ATIVO' : 'DISPONÍVEL'}
                </div>
              </div>

              <h2>
                {module.name}
              </h2>

              <p>
                {module.description}
              </p>

              <p style={{
                fontSize: '24px',
                fontWeight: '700',
                color: active ? '#10b981' : '#3b82f6',
                marginTop: '8px'
              }}>
                R$ {module.price.toFixed(2).replace('.', ',')}
              </p>

              {active ? (
                <button
                  className='module-button-on'
                  disabled
                >
                  ✅ Já Contratado
                </button>
              ) : (
                <button
                  className='module-button-off'
                  onClick={() => purchaseModule(module.key)}
                  disabled={loading}
                >
                  {loading ? '...' : '💎 Comprar Agora'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
