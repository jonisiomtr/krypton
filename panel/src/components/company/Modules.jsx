import { useEffect, useState } from 'react'
import api from '../../services/api'

import '../../styles/company-modulos.css'

export default function Modules({ companyId, onUpdate, isReadOnly = false }) {

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

  async function toggleModule(moduleKey) {
    if (isReadOnly) {
      alert('⚠️ Apenas o administrador pode ativar/desativar módulos.')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const isActive = modules.includes(moduleKey)

      await api.post(
        `/companies/${companyId}/modules`,
        {
          moduleName: moduleKey,
          action: isActive ? 'disable' : 'enable'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      await loadModules()

      if (onUpdate) {
        onUpdate()
      }

      if (moduleKey === 'website' && !isActive) {
        alert('✅ Módulo Website ativado! Link do site gerado automaticamente.')
      }

      if (moduleKey === 'webagendamento' && !isActive) {
        alert('✅ Módulo Web Agendamento ativado! Link de agendamento gerado automaticamente.')
      }

    } catch (err) {
      console.log(err)
      alert('Erro ao alterar módulo')
    } finally {
      setLoading(false)
    }
  }
  

  const allModules = [

  {
    key: 'assistant',
    name: 'Assistente IA',
    icon: '🤖',
    description:
    'Responde clientes automaticamente.'
  },

  {
    key: 'catalog',
    name: 'Catálogo',
    icon: '🛍️',
    description:
    'Mostra produtos automaticamente.'
  },

  {
    key: 'pdv_caixa',
    name: 'PDV Frente de Caixa',
    icon: '🖥️',
    description:
    'Sistema de ponto de venda com código de barras e impressão de cupom fiscal.'
  },

  {
    key: 'delivery',
    name: 'Delivery',
    icon: '🚚',
    description:
    'Sistema automático de entregas.'
  },

  {
    key: 'scheduling',
    name: 'Agendamentos',
    icon: '📅',
    description:
    'Sistema de reservas automático.'
  },

  {
    key: 'qrcode',
    name: 'WhatsApp 📱',
    icon: '📱',
    description:
    'Usado para voce poder ler o bot em qualquer dispositivo.'
  },

  {
    key: 'pix',
    name: 'PIX Automático',
    icon: '💳',
    description:
    'Cobranças automáticas via pix.'
  },

  {
    key: 'website',
    name: 'Website',
    icon: '🌐',
    description:
    'Site profissional automático para sua empresa.'
  },

  {
    key: 'webagendamento',
    name: 'Web Agendamento',
    icon: '📅',
    description:
    'Sistema de agendamento online com página personalizada.'
  }

]

  return (

    <div className='modules-page'>

      <div className='modules-header'>

        <h1>
          Módulos do Sistema
        </h1>

        <p>
          {isReadOnly ? 'Visualização dos módulos' : 'Gerencie os módulos da empresa'}
        </p>

      </div>

      <div className='modules-grid'>

        {

          allModules.map((module, index) => {

            const active =
            modules.includes(
              module.key
            )

            return (

              <div

                key={index}

                className={

                  `module-card ${
                    active
                    ? 'active'
                    : 'locked'
                  }`

                }

              >

                {

                  !active && (

                    <div className='module-lock'>

                      🔒

                    </div>

                  )

                }

                <div className='module-top'>

                  <div className='module-icon'>
                    {module.icon}
                  </div>

                  <div
                    className={`module-status ${
                      active
                      ? 'on'
                      : 'off'
                    }`}
                  >

                    {

                      active
                      ? 'ATIVO'
                      : 'BLOQUEADO'

                    }

                  </div>

                </div>

                <h2>
                  {module.name}
                </h2>

                <p>
                  {module.description}
                </p>

                {!isReadOnly && (
                  active ? (
                    <button
                      className='module-button-on'
                      onClick={() => toggleModule(module.key)}
                      disabled={loading}
                    >
                      {loading ? '...' : '🔴 Desativar'}
                    </button>
                  ) : (
                    <button
                      className='module-button-off'
                      onClick={() => toggleModule(module.key)}
                      disabled={loading}
                    >
                      {loading ? '...' : '🟢 Ativar'}
                    </button>
                  )
                )}

              </div>

            )

          })

        }

      </div>

    </div>

  )

}