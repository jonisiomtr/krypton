import {
  useNavigate
} from 'react-router-dom'

import {
  useEffect,
  useState
} from 'react'

import io from 'socket.io-client'

import api from '../services/api'

import '../styles/painelAdmin/dashboard.css'

import {
  EyeIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  DashboardIcon,
  BuildingIcon,
  PackageIcon,
  CalendarIcon,
  WhatsAppIcon,
  CheckCircleIcon,
  UserIcon,
  LockIcon,
  PhoneIcon,
  KeyIcon,
  Building2Icon,
  BanIcon,
  RefreshCwIcon
} from '../components/Icons'

const socket =
io(import.meta.env.VITE_API_URL || 'http://localhost:4177')

export default function Dashboard() {

  const [companies, setCompanies] = useState([])
  const [suspendedAccounts, setSuspendedAccounts] = useState([])

  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)

  const [newCompany, setNewCompany] = useState({
    id: '',
    name: '',
    password: '',
    adminNumber: '',
    pixKey: '',
    pixHolder: '',
    trialDays: 7 // Padrão: 7 dias de teste
  })

  const [editCompany, setEditCompany] = useState({
    id: '',
    name: '',
    password: '',
    adminNumber: '',
    pixKey: '',
    pixHolder: ''
  })

  useEffect(() => {
    loadCompanies()
    loadSuspendedAccounts()

    const interval = setInterval(() => {
      loadCompanies()
      loadSuspendedAccounts()
    }, 5000)

    socket.on('connection-update', data => {
      setCompanies(prevCompanies => {
        return prevCompanies.map(company => {
          if (company.id === data.clientId) {
            return {
              ...company,
              connected: data.connected,
              qr: data.qr,
              status: data.connected ? 'online' : 'pending'
            }
          }
          return company
        })
      })
    })

    return () => {
      clearInterval(interval)
      socket.off('connection-update')
    }
  }, [])

  async function loadCompanies() {
    try {
      const token = localStorage.getItem('token')

      const response = await api.get('/companies', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const detailedCompanies = await Promise.all(
        response.data.map(async company => {
          let detail = {}

          try {
            const detailResponse = await api.get(
              `/company/${company.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            )
            detail = detailResponse.data
          } catch (err) {
            console.log('Erro carregando config da empresa', company.id, err)
          }

          let qr = null
          let connected = company.status === 'online'

          if (company.status === 'pending') {
            try {
              const qrResponse = await api.get(
                `/companies/${company.id}/qr`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              )
              qr = qrResponse.data.qr
              connected = qrResponse.data.connected
            } catch (err) {
              console.log('Erro carregando QR da empresa', company.id, err)
            }
          }

          return {
            ...company,
            ...detail,
            qr,
            connected,
            moduleExpirations: detail.moduleExpirations || {}
          }
        })
      )

      setCompanies(detailedCompanies)

    } catch (error) {
      console.log(error)
    }
  }

  async function loadSuspendedAccounts() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/companies/suspended/list', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSuspendedAccounts(response.data.suspendedAccounts || [])
    } catch (error) {
      console.log('Erro ao carregar contas suspensas:', error)
    }
  }

  async function reactivateAccount(companyId) {
    if (!confirm('Deseja reativar esta conta?')) return

    try {
      const token = localStorage.getItem('token')
      await api.post(`/companies/${companyId}/reactivate`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      alert('Conta reativada com sucesso!')
      loadSuspendedAccounts()
      loadCompanies()
    } catch (error) {
      console.log('Erro ao reativar conta:', error)
      alert('Erro ao reativar conta')
    }
  }

  async function createCompany() {
    try {
      const token = localStorage.getItem('token')

      await api.post('/companies', newCompany, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      alert('Empresa criada!')

      setShowModal(false)

      setNewCompany({
        id: '',
        name: '',
        password: '',
        adminNumber: '',
        pixKey: '',
        pixHolder: '',
        trialDays: 7
      })

      loadCompanies()

    } catch (error) {
      console.log(error)
      alert('Erro ao criar empresa')
    }
  }

  async function deleteCompany(id) {
    try {
      const token = localStorage.getItem('token')

      await api.delete(`/companies/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setShowDeleteModal(false)
      setSelectedCompany(null)
      alert('Empresa removida!')
      loadCompanies()

    } catch (error) {
      console.log(error)
      alert('Erro ao remover empresa')
    }
  }

  function openEditModal(company) {
    setSelectedCompany(company)
    setEditCompany({
      id: company.id,
      name: company.name || '',
      password: company.password || '',
      adminNumber: company.adminNumber || '',
      pixKey: company.pixKey || '',
      pixHolder: company.pixHolder || ''
    })
    setShowEditModal(true)
  }

  async function updateCompany() {
    try {
      const token = localStorage.getItem('token')

      await api.put(`/companies/${editCompany.id}`, editCompany, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setShowEditModal(false)
      setSelectedCompany(null)
      alert('Empresa atualizada!')
      loadCompanies()

    } catch (error) {
      console.log(error)
      alert('Erro ao atualizar empresa')
    }
  }

  async function suspendAccount(companyId) {
    if (!confirm('Deseja suspender esta conta?')) return

    try {
      const token = localStorage.getItem('token')
      await api.post(`/companies/${companyId}/suspend`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      alert('Conta suspensa com sucesso!')
      loadCompanies()
      loadSuspendedAccounts()
    } catch (error) {
      console.log('Erro ao suspender conta:', error)
      alert('Erro ao suspender conta')
    }
  }

  function openDeleteModal(company) {
    setSelectedCompany(company)
    setShowDeleteModal(true)
  }

  function logout() {
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  function formatWhatsApp(value) {
    if (!value) return '—'
    const digits = value.replace(/\D/g, '')
    return digits ? `+${digits}` : value
  }

  function whatsapp() {
    navigate('/superadmin-whatsapp')
  }

  return (
    <div className='dashboard'>

      <aside className='sidebar'>
        <div>
          <div className='sidebar-top'>
            <div className='sidebar-logo-wrapper'>
              <img src='/logo.png' alt='KRYPTON Logo' className='sidebar-logo' />
            </div>
            <h1 className='sidebar-title'>
              <span>K</span>
              <span>RYPTON</span>
            </h1>
          </div>

          <nav className='menu'>
            <button><DashboardIcon size={20} /> Dashboard</button>
            <button><BuildingIcon size={20} /> Empresas</button>
            <button><PackageIcon size={20} /> Pedidos</button>
            <button><CalendarIcon size={20} /> Agendamentos</button>
            <button onClick={whatsapp}><WhatsAppIcon size={20} /> WhatsApp</button>
          </nav>
        </div>

        <button className='logout' onClick={logout}>
          Sair
        </button>
      </aside>

      <main className='content'>

        <div className='topbar'>
          <h1>Dashboard</h1>
          <p>Bem-vindo 🚀</p>
        </div>

        <div className='cards'>
          <div className='card'>
            <span>Empresas</span>
            <h2>{companies.length}</h2>
          </div>
          <div className='card'>
            <span>Online</span>
            <h2>{companies.filter(c => c.status === 'online').length}</h2>
          </div>
          <div className='card'>
            <span>Pendentes</span>
            <h2>{companies.filter(c => c.status === 'pending').length}</h2>
          </div>
          <div className='card' style={{ background: 'linear-gradient(135deg, #f59e0b22, #d9770622)', border: '1px solid #f59e0b44' }}>
            <span style={{ color: '#f59e0b' }}>Suspensas</span>
            <h2 style={{ color: '#f59e0b' }}>{suspendedAccounts.length}</h2>
          </div>
        </div>

        <div className='companies-box'>

          <div className='companies-header'>
            <h2>Empresas</h2>

            <button onClick={() => setShowModal(true)}>
              <PlusIcon size={16} /> Nova empresa
            </button>
          </div>

          {companies.map(company => (
            <div
              className='company-item'
              key={company.id}
            >
              <div className='company-main-info'>
                <div className='company-left'>
                  <div className='company-avatar'>
                    <BuildingIcon size={28} />
                  </div>
                  <div className='company-info'>
                    <div className='company-status-badge'>
                      {company.status === 'online'
                        ? <span><span className='status-dot online'></span> Online</span>
                        : company.status === 'pending'
                          ? <span><span className='status-dot pending'></span> QR Pendente</span>
                          : <span><span className='status-dot offline'></span> Offline</span>}
                    </div>
                    <h3>{company.name || company.id}</h3>
                    <p>ID: {company.id}</p>
                  </div>
                </div>

                <div className='company-actions'>
                  <button
                    className='action-button view-button'
                    onClick={() => {
                      localStorage.setItem('selectedCompany', company.id)
                      navigate(`/company/${company.id}`)
                    }}
                  >
                    <EyeIcon size={16} /> Ver
                  </button>
                  <button
                    className='action-button edit-button'
                    onClick={() => openEditModal(company)}
                  >
                    <EditIcon size={16} /> Editar
                  </button>
                  {company.status === 'suspended' ? (
                    <button
                      className='action-button reactivate-button'
                      onClick={() => reactivateAccount(company.id)}
                    >
                      <RefreshCwIcon size={16} /> Reativar
                    </button>
                  ) : (
                    <button
                      className='action-button suspend-button'
                      onClick={() => suspendAccount(company.id)}
                    >
                      <BanIcon size={16} /> Suspender
                    </button>
                  )}
                  <button
                    className='action-button delete-button'
                    onClick={() => openDeleteModal(company)}
                  >
                    <TrashIcon size={16} /> Apagar
                  </button>
                </div>
              </div>

              <div className='company-details'>
                <div className='detail-card'>
                  <div className='detail-icon-wrapper'>
                    <UserIcon size={20} className='detail-icon' />
                  </div>
                  <div className='detail-content'>
                    <span className='detail-label'>Nome da Empresa</span>
                    <span className='detail-value'>{company.name || '—'}</span>
                  </div>
                </div>

                <div className='detail-card'>
                  <div className='detail-icon-wrapper'>
                    <LockIcon size={20} className='detail-icon' />
                  </div>
                  <div className='detail-content'>
                    <span className='detail-label'>Senha</span>
                    <span className='detail-value password-hidden'>••••••••</span>
                  </div>
                </div>

                <div className='detail-card'>
                  <div className='detail-icon-wrapper'>
                    <PhoneIcon size={20} className='detail-icon' />
                  </div>
                  <div className='detail-content'>
                    <span className='detail-label'>WhatsApp Admin</span>
                    <span className='detail-value'>{formatWhatsApp(company.adminNumber)}</span>
                  </div>
                </div>

                <div className='detail-card'>
                  <div className='detail-icon-wrapper'>
                    <KeyIcon size={20} className='detail-icon' />
                  </div>
                  <div className='detail-content'>
                    <span className='detail-label'>Chave PIX</span>
                    <span className='detail-value'>{company.pixKey || '—'}</span>
                  </div>
                </div>

                <div className='detail-card'>
                  <div className='detail-icon-wrapper'>
                    <Building2Icon size={20} className='detail-icon' />
                  </div>
                  <div className='detail-content'>
                    <span className='detail-label'>Titular PIX</span>
                    <span className='detail-value'>{company.pixHolder || '—'}</span>
                  </div>
                </div>
              </div>

              {company.status === 'pending' && (
                <div className='company-qr-preview'>
                  <span className='qr-label'>WhatsApp</span>
                  {company.qr ? (
                    <div className='qr-container'>
                      <img
                        src={company.qr}
                        alt="QR"
                        className='qr-preview-image'
                      />
                      <span className='qr-status connecting'>
                        <span className='pulse-dot'></span>
                        Conectando
                      </span>
                    </div>
                  ) : (
                    <div className='qr-loading'>
                      <span className='pulse-dot'></span>
                      Gerando QR Code
                    </div>
                  )}
                </div>
              )}

              {company.status === 'online' && (
                <div className='company-qr-preview connected'>
                  <span className='qr-label'>WhatsApp</span>
                  <div className='qr-connected'>
                    <span className='connected-icon'><CheckCircleIcon size={18} /></span>
                    <span className='connected-text'>Conectado</span>
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Contas Suspensas */}
        {suspendedAccounts.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ color: '#f59e0b', marginBottom: '20px' }}>Contas Suspensas ({suspendedAccounts.length})</h2>

            {suspendedAccounts.map(account => (
              <div
                key={account.id}
                className='company-item'
                style={{ border: '1px solid #f59e0b44', background: 'linear-gradient(135deg, #f59e0b11, #d9770611)' }}
              >
                <div className='company-main-info'>
                  <div className='company-left'>
                    <div className='company-status-badge' style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                      Suspensa
                    </div>
                    <h3>{account.name || account.id}</h3>
                    <p>ID: {account.id}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                      Suspensa em: {account.suspendedAt ? new Date(account.suspendedAt).toLocaleString('pt-BR') : 'N/A'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Motivo: {account.suspendedReason || 'Teste expirado'}
                    </p>
                  </div>

                  <div className='company-actions'>
                    <button
                      className='action-button'
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      onClick={() => reactivateAccount(account.id)}
                    >
                      <CheckCircleIcon size={16} /> Reativar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className='modal'>
            <div className='modal-content'>

              <h2>Nova empresa</h2>

              <input
                placeholder='ID'
                value={newCompany.id}
                onChange={e =>
                  setNewCompany({ ...newCompany, id: e.target.value })
                }
              />

              <input
                placeholder='Nome'
                value={newCompany.name}
                onChange={e =>
                  setNewCompany({ ...newCompany, name: e.target.value })
                }
              />

              <input
                placeholder='Senha'
                value={newCompany.password}
                onChange={e =>
                  setNewCompany({ ...newCompany, password: e.target.value })
                }
              />

              <input
                placeholder='WhatsApp admin'
                value={newCompany.adminNumber}
                onChange={e =>
                  setNewCompany({ ...newCompany, adminNumber: e.target.value })
                }
              />

              <input
                placeholder='Chave PIX'
                value={newCompany.pixKey}
                onChange={e =>
                  setNewCompany({ ...newCompany, pixKey: e.target.value })
                }
              />

              <input
                placeholder='Titular PIX'
                value={newCompany.pixHolder}
                onChange={e =>
                  setNewCompany({ ...newCompany, pixHolder: e.target.value })
                }
              />

              <div style={{ marginTop: '10px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                  Dias de teste (opcional):
                </label>
                <select
                  value={newCompany.trialDays}
                  onChange={e =>
                    setNewCompany({ ...newCompany, trialDays: parseInt(e.target.value) })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="0">Sem teste</option>
                  <option value="1">1 dia</option>
                  <option value="2">2 dias</option>
                  <option value="3">3 dias</option>
                  <option value="4">4 dias</option>
                  <option value="7">7 dias (padrão)</option>
                  <option value="15">15 dias</option>
                  <option value="30">1 mês (30 dias)</option>
                </select>
              </div>

              <button onClick={createCompany}>
                Criar empresa
              </button>

              <button onClick={() => setShowModal(false)} className='close-modal'>
                Cancelar
              </button>

            </div>
          </div>
        )}

        {showEditModal && (
          <div className='modal'>
            <div className='modal-content'>

              <h2>Editar empresa</h2>

              <input
                placeholder='Nome'
                value={editCompany.name}
                onChange={e =>
                  setEditCompany({ ...editCompany, name: e.target.value })
                }
              />

              <input
                placeholder='Senha'
                value={editCompany.password}
                onChange={e =>
                  setEditCompany({ ...editCompany, password: e.target.value })
                }
              />

              <input
                placeholder='WhatsApp admin'
                value={editCompany.adminNumber}
                onChange={e =>
                  setEditCompany({ ...editCompany, adminNumber: e.target.value })
                }
              />

              <input
                placeholder='Chave PIX'
                value={editCompany.pixKey}
                onChange={e =>
                  setEditCompany({ ...editCompany, pixKey: e.target.value })
                }
              />

              <input
                placeholder='Titular PIX'
                value={editCompany.pixHolder}
                onChange={e =>
                  setEditCompany({ ...editCompany, pixHolder: e.target.value })
                }
              />

              <button onClick={updateCompany}>
                Salvar alterações
              </button>

              <button onClick={() => setShowEditModal(false)} className='close-modal'>
                Cancelar
              </button>

            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className='modal'>
            <div className='modal-content delete-modal-content'>

              <h2>Confirmar exclusão</h2>

              <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6' }}>
                Tem certeza que deseja apagar a empresa <strong>{selectedCompany?.name || selectedCompany?.id}</strong>?
              </p>

              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '10px' }}>
                Esta ação não pode ser desfeita.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => deleteCompany(selectedCompany.id)}
                  style={{
                    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                    flex: 1
                  }}
                >
                  Sim, apagar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedCompany(null)
                  }}
                  className='close-modal'
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}