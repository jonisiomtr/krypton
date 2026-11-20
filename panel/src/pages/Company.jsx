import {
  useNavigate
} from 'react-router-dom'

import {
  useEffect,
  useState
} from 'react'

import io from 'socket.io-client'

import api from '../services/api'

import '../styles/company-modulos.css'
import '../App.css'

const socket =
io(import.meta.env.VITE_API_URL || 'http://localhost:4177')

export default function Company() {

  const companyId =
  localStorage.getItem(
    'selectedCompany'
  )

  const navigate =
  useNavigate()

  const [company,
  setCompany] =
  useState(null)

  const [qr,
  setQr] =
  useState(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [selectedModule, setSelectedModule] = useState(null)
  const [trialDays, setTrialDays] = useState(7)

  const allModules = [

    {
      key: 'assistant',
      label: 'Assistente IA 🤖',
      price: 50.00
    },

    {
      key: 'delivery',
      label: 'Delivery 🚚',
      price: 60.00
    },

    {
      key: 'scheduling',
      label: 'Agendamentos 📅',
      price: 0.50
    },

    {
      key: 'catalog',
      label: 'Catálogo 🛍️',
      price: 50.00
    },

    {
      key: 'pdv_caixa',
      label: 'PDV Frente de Caixa 🖥️',
      price: 160.00
    },

    {
      key: 'qrcode',
      label: 'WhatsApp 📱',
      price: 20.00
    },

    {
      key: 'pix',
      label: 'PIX Automático 💳',
      price: 50.00
    },

    {
      key: 'webagendamento',
      label: 'Website de Agendamento 🌐',
      price: 60.00
    },

    {
      key: 'website',
      label: 'Website 🌐',
      price: 60.00
    }

  ]

  useEffect(() => {

    // Verificar se é SuperAdmin
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setIsAdmin(payload.type === 'admin')
      } catch (e) {
        console.log('Erro ao decodificar token:', e)
      }
    }

    loadCompany()

    loadQr()

    socket.on(
      'connection-update',
      data => {

        if (
          data.clientId !== companyId
        ) return

        setQr(data)

      }
    )

    return () => {
      socket.off(
        'connection-update'
      )
    }
  }, [])

  async function loadCompany() {

    try {

      const token =
      localStorage.getItem(
        'token'
      )

      const response =
      await api.get(

        `/companies/${companyId}`,

        {

          headers: {

            Authorization:
            `Bearer ${token}`

          }

        }

      )

      setCompany(
        response.data
      )

    } catch (error) {

      console.log(error)

    }

  }

  async function loadQr() {

    try {

      const token =
      localStorage.getItem(
        'token'
      )

      const response =
      await api.get(

        `/companies/${companyId}/qr`,

        {

          headers: {

            Authorization:
            `Bearer ${token}`

          }

        }

      )

      setQr(
        response.data
      )

    } catch (error) {

      console.log(error)

    }

  }

  async function toggleModule(
    moduleName
  ) {

    try {

      const token =
      localStorage.getItem(
        'token'
      )

      const isActive = company.modules.includes(moduleName)

      await api.post(
        `/companies/${companyId}/modules`,
        {
          moduleName: moduleName,
          action: isActive ? 'disable' : 'enable'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      loadCompany()

      if (moduleName === 'website' && !isActive) {
        alert('✅ Módulo Website ativado! Link do site gerado automaticamente.')
      }

    } catch (error) {

      console.log(error)
      alert('Erro ao alterar módulo')

    }

  }

  async function activateModuleTrial(moduleName, days) {
    try {
      const token = localStorage.getItem('token')

      await api.post(
        `/companies/${companyId}/modules/trial`,
        {
          moduleName: moduleName,
          trialDays: days
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      loadCompany()
      setShowTrialModal(false)
      alert(`✅ Teste grátis de ${days} dias ativado para o módulo!`)

    } catch (error) {
      console.log(error)
      alert('Erro ao ativar teste grátis')
    }
  }

  if (!company) {

    return (
      <h1>
        Carregando...
      </h1>
    )

  }

  return (

    <div className='dashboard'>

      <aside className='sidebar'>

        <div>

          <div className='sidebar-top'>

            <div className='sidebar-logo'>
              S
            </div>

            <h1>
              {company.name}
            </h1>

          </div>

        </div>

      </aside>

      <main className='content'>

        <div className='topbar'>

          <button

            onClick={() =>
              navigate('/dashboard')
            }

            style={{

              marginBottom: 20,

              background: '#111827',

              color: 'white',

              border: 'none',

              padding: '12px 20px',

              borderRadius: 12,

              cursor: 'pointer'

            }}

          >

            ← Voltar

          </button>

          <h1>
            {company.name}
          </h1>

          <p>
            Painel da empresa 🚀
          </p>

        </div>

        {/* WHATSAPP */}

        <div className='modules-page'>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2>
              WhatsApp
            </h2>

            <button
              onClick={() => navigate('/whatsapp-settings')}
              style={{
                background: '#25D366',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              ⚙️ Configurar WhatsApp
            </button>
          </div>

          {

            qr?.connected

            ? (
              <div className='whatsapp-connected-large'>

                <div className='connected-large-icon'>✅</div>

                <h1>
                  WhatsApp Conectado
                </h1>

                <p>
                  Sua conexão está ativa e funcionando
                </p>

              </div>

            )
            : (
              <div className='whatsapp-connecting'>

                <div className='qr-container-large'>

                  <h3>
                    QR Code
                  </h3>

                  {

                    qr?.qr

                    ? (
                      <img
                        src={qr.qr}
                        className='qr-image-large'
                      />

                    )

                    : (
                      <div className='qr-loading-large'>

                        <span className='pulse-dot-large'></span>

                        <p>
                          Gerando QR Code...
                        </p>

                      </div>

                    )

                  }

                  {qr?.qr && (
                    <div className='qr-status-large connecting'>

                      <span className='pulse-dot'></span>

                      <span>
                        Conectando...
                      </span>

                    </div>
                  )}

                </div>

              </div>

            )

          }

        </div>

        {/* MODULOS */}

        <div
          className='modules-page'
          style={{
            marginTop: 20
          }}
        >

          <div className='modules-header'>

            <h1>
              Módulos da Empresa
            </h1>

            <p>
              Gerencie os acessos liberados
            </p>

          </div>

          <div className='modules-grid'>

            {

              allModules.map((moduleData, index) => {

                const active =
                company.modules.includes(
                  moduleData.key
                )

                // Se for SuperAdmin, mostra botão de teste grátis
                if (isAdmin) {
                  return (

                    <div

                      key={index}
                      className={`module-card ${
                        active
                        ? 'active'
                        : 'locked'
                      }`}

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

                          {

                            moduleData.key === 'assistant'
                            ? '🤖'

                            : moduleData.key === 'delivery'
                            ? '🚚'

                            : moduleData.key === 'scheduling'
                            ? '📅'

                            : moduleData.key === 'catalog'
                            ? '🛍️'

                            : moduleData.key === 'pdv_caixa'
                            ? '🖥️'

                            : moduleData.key === 'qrcode'
                            ? '📱'

                            : moduleData.key === 'pix'
                            ? '💳'

                            : moduleData.key === 'website'
                            ? '🌐'

                            : moduleData.key === 'webagendamento'
                            ? '💋'

                            : '⚙️'

                          }

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

                        {moduleData.label}

                      </h2>

                      <p style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: active ? '#10b981' : '#3b82f6',
                        marginTop: '8px'
                      }}>
                        R$ {moduleData.price.toFixed(2).replace('.', ',')}
                      </p>

                      <div className='module-buttons'>
                        <button

                          onClick={() =>
                            toggleModule(
                              moduleData.key
                            )
                          }

                          className={
                            active
                            ? 'module-button-on'
                            : 'module-button-off'
                          }

                        >

                          {

                            active
                            ? '✅ Ativado'
                            : 'Ativar'

                          }

                        </button>

                        {!active && (
                          <button

                            onClick={() => {
                              setSelectedModule(moduleData.key)
                              setShowTrialModal(true)
                            }}

                            className='module-button-trial'

                          >

                            🎁 Teste Grátis

                          </button>
                        )}
                      </div>

                    </div>

                  )
                }

                // Visual normal para usuários comuns
                return (

                  <div

                    key={index}
                    className={`module-card ${
                      active
                      ? 'active'
                      : 'locked'
                    }`}

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

                        {

                          moduleData.key === 'assistant'
                          ? '🤖'

                          : moduleData.key === 'delivery'
                          ? '🚚'

                          : moduleData.key === 'scheduling'
                          ? '📅'

                          : moduleData.key === 'catalog'
                          ? '🛍️'

                          : moduleData.key === 'pdv_caixa'
                          ? '🖥️'

                          : moduleData.key === 'qrcode'
                          ? '📱'

                          : moduleData.key === 'pix'
                          ? '💳'

                          : moduleData.key === 'website'
                          ? '🌐'

                          : moduleData.key === 'webagendamento'
                          ? '💋'

                          : '⚙️'

                        }

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

                      {moduleData.label}

                    </h2>

                    <p style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: active ? '#10b981' : '#3b82f6',
                      marginTop: '8px'
                    }}>
                      R$ {moduleData.price.toFixed(2).replace('.', ',')}
                    </p>

                    <button

                      onClick={() =>
                        toggleModule(
                          moduleData.key
                        )
                      }

                      className={
                        active
                        ? 'module-button-on'
                        : 'module-button-off'
                      }

                    >

                      {

                        active
                        ? '✅ Liberado'
                        : '💎 Liberar'

                      }

                    </button>

                  </div>

                )

              })
            }

          </div>

        </div>

      </main>

      {/* Modal de Teste Grátis */}
      {showTrialModal && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <h2>🎁 Ativar Teste Grátis</h2>
            <p>Selecione a duração do teste grátis para este módulo:</p>

            <div className='trial-days-options'>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <button
                  key={days}
                  className={`trial-day-button ${trialDays === days ? 'selected' : ''}`}
                  onClick={() => setTrialDays(days)}
                >
                  {days} {days === 1 ? 'dia' : 'dias'}
                </button>
              ))}
            </div>

            <div className='modal-buttons'>
              <button
                className='modal-button-cancel'
                onClick={() => setShowTrialModal(false)}
              >
                Cancelar
              </button>
              <button
                className='modal-button-confirm'
                onClick={() => activateModuleTrial(selectedModule, trialDays)}
              >
                Ativar Teste
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  )

}
