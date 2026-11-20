import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { FaBell, FaComments } from 'react-icons/fa'

import '../App.css'
import '../styles/painelEmpresas/company-panel.css'
import '../styles/painelEmpresas/suporte.css'
import '../styles/painelEmpresas/dashboard.css'
import '../styles/painelEmpresas/whatsapp-chat.css'

import CompanyQRCode from './panel/CompanyQRCode'
import Modules from './panel/Modules'
import ModulesPurchase from './panel/Modules'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4177'

import {
  OverviewIcon,
  ShoppingBagIcon,
  ClipboardIcon,
  BoxIcon,
  CreditCardIcon,
  ScissorsIcon,
  LayersIcon,
  GlobeIcon,
  MessageIcon,
  ChartIcon,
  SettingsIcon,
  SupportIcon,
  WhatsAppIcon,
  CalendarIcon
} from '../components/Icons'

// PÁGINAS
import Dashboard from './panel/Dashboard'
import Orders from './panel/Orders'
import Appointments from './panel/Appointments'
import Products from './panel/Products'
import Services from './panel/Services'
import Settings from './panel/Settings'
import Support from './panel/Support'
import Website from './panel/Website'
import Messages from './panel/Messages'
import WhatsAppChat from './panel/WhatsAppChat'
import OnlineBooking from './panel/OnlineBooking'
import MercadoPago from './panel/MercadoPago'
import PDVConfig from './panel/PDVConfig'
import WhatsAppSettings from './WhatsAppSettings'
import Coupons from './panel/Coupons'
import AgentConfig from '../components/company/AgentConfig'

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: 'white',
          fontSize: '18px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <p>Ocorreu um erro ao carregar o painel</p>
            <p style={{ fontSize: '14px', color: '#ef4444', marginTop: '10px' }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function CompanyPanel() {

  const [companyId, setCompanyId] = useState(null)

  const [page, setPage] = useState('dashboard')

  const [companyData, setCompanyData] = useState({
    displayName: '',
    logo: '',
    phone: '',
    email: '',
    address: '',
    description: ''
  })

  const [pendingOrders, setPendingOrders] = useState(0)
  const [pendingAppointments, setPendingAppointments] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [showMessagesModal, setShowMessagesModal] = useState(false)
  const [notificationModalPosition, setNotificationModalPosition] = useState({ x: null, y: null })
  const [isDraggingNotification, setIsDraggingNotification] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Resetar posição quando modal fecha
  useEffect(() => {
    if (!showNotificationsModal) {
      setNotificationModalPosition({ x: null, y: null })
    }
  }, [showNotificationsModal])
  const [removedNotifications, setRemovedNotifications] = useState(() => {
    const saved = localStorage.getItem(`removedNotifications_${companyId}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [notifiedRatings, setNotifiedRatings] = useState(() => {
    const saved = localStorage.getItem(`notifiedRatings_${companyId}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [modules, setModules] = useState([])
  const [hasWebsiteModule, setHasWebsiteModule] = useState(false)
  const [hasOnlineBookingModule, setHasOnlineBookingModule] = useState(false)
  const [hasBotAgendamentoModule, setHasBotAgendamentoModule] = useState(false)
  const [hasCatalogModule, setHasCatalogModule] = useState(false)
  const [hasPDVModule, setHasPDVModule] = useState(false)
  const [hasPixModule, setHasPixModule] = useState(false)
  const [hasWhatsAppModule, setHasWhatsAppModule] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [showAgentConfig, setShowAgentConfig] = useState(false)

  // pega companyId do localStorage (seguro)
  useEffect(() => {
    const id = localStorage.getItem('companyId')
    setCompanyId(id)
  }, [])

  // carrega dados somente quando companyId existir
  useEffect(() => {
    if (!companyId) return

    loadPendingOrders()
    loadUnreadNotifications()
    loadRatings() // Carregar avaliações na inicialização (do JSON local)
    loadCompanyData()
    loadModules()
    loadSubscriptionStatus()

    // Atualizar contadores a cada 5 segundos (sem avaliações)
    const interval = setInterval(() => {
      loadPendingOrders()
      loadUnreadNotifications()
    }, 5000)

    return () => {
      clearInterval(interval)
    }

  }, [companyId])

  // Atualizar contador quando notifications mudar
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length
    setUnreadNotifications(unreadCount)
  }, [notifications])

  // Salvar removedNotifications no localStorage
  useEffect(() => {
    if (companyId) {
      localStorage.setItem(`removedNotifications_${companyId}`, JSON.stringify([...removedNotifications]))
    }
  }, [removedNotifications, companyId])

  // Salvar notifiedRatings no localStorage
  useEffect(() => {
    if (companyId) {
      localStorage.setItem(`notifiedRatings_${companyId}`, JSON.stringify([...notifiedRatings]))
    }
  }, [notifiedRatings, companyId])

  // =========================
  // API CALLS
  // =========================

  async function loadCompanyData() {
    try {
      const response = await api.get(`/company/${companyId}`)

      setCompanyData({
        displayName: response.data.displayName || '',
        logo: response.data.logo
  ? `${API_BASE_URL}${response.data.logo}?t=${Date.now()}`
  : 'https://placehold.co/100x100',
        phone: response.data.phone || '',
        email: response.data.email || '',
        address: response.data.address || '',
        description: response.data.description || ''
      })

    } catch (err) {
      console.log(err)
    }
  }

  async function loadPendingOrders() {
    try {
      const token = localStorage.getItem('token')

      const response = await api.get(
        `/pedidos/listar/orders/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const pending = response.data.orders.filter(
        order => order.status === 'pending'
      )

      setPendingOrders(pending.length)

    } catch (err) {
      // Ignora erros silenciosamente durante o polling
      // Não afeta o funcionamento
    }
  }

  async function loadUnreadNotifications() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/messages/${companyId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const conversations = response.data.conversations || []
      const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)
      setUnreadMessages(totalUnread)
    } catch (err) {
      // Ignora erros silenciosamente durante o polling
      // Não afeta o funcionamento
    }
  }

  async function loadRatings() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/api/orders/ratings', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const ratings = response.data || []

      // Adicionar notificações para avaliações ainda não notificadas
      ratings.forEach(rating => {
        // Usar o ID único do JSON local como chave
        const ratingKey = `rating_${rating.id}`

        // Não adicionar se já foi notificada ou foi removida
        if (!notifiedRatings.has(ratingKey) && !removedNotifications.has(ratingKey)) {
          const stars = '⭐'.repeat(rating.rating)
          const starText = rating.rating === 1 ? 'estrela' : 'estrelas'
          const message = rating.comment
            ? `${rating.customerName} avaliou com ${rating.rating} ${starText}: "${rating.comment}"`
            : `${rating.customerName} avaliou com ${rating.rating} ${starText}`

          // Adicionar metadados para tracking
          addNotification('rating', 'Nova avaliação recebida', message, {
            orderId: rating.orderId,
            ratingId: rating.id,
            ratedAt: rating.ratedAt
          })

          // Marcar como notificada
          setNotifiedRatings(prev => new Set([...prev, ratingKey]))
          console.log('Notificação adicionada para avaliação:', rating.id, '-', rating.customerName)
        }
      })
    } catch (err) {
      console.log('Erro ao carregar avaliações:', err)
    }
  }

  function addNotification(type, title, message, metadata = {}) {
    const newNotification = {
      id: Date.now(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      ...metadata // Adiciona orderId e ratedAt se fornecidos
    }
    setNotifications(prev => [newNotification, ...prev])
    setUnreadNotifications(prev => prev + 1)
  }

  async function removeNotification(id) {
    const notification = notifications.find(n => n.id === id)
    
    // Se for notificação de avaliação, remover do JSON local também
    if (notification && notification.type === 'rating' && notification.ratingId) {
      try {
        const token = localStorage.getItem('token')
        await api.delete(`/api/orders/ratings/${notification.ratingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('Avaliação removida do JSON local:', notification.ratingId)
      } catch (err) {
        console.log('Erro ao remover avaliação do JSON local:', err)
      }
    }

    // Marcar como removida no localStorage
    if (notification && notification.type === 'rating') {
      const notificationKey = notification.ratingId
        ? `rating_${notification.ratingId}`
        : notification.orderId
        ? `rating_order_${notification.orderId}`
        : `${notification.title}_${notification.message}`
      setRemovedNotifications(prev => new Set([...prev, notificationKey]))
    }
    
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function markNotificationAsRead(id) {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
    // Atualizar contador
    setUnreadNotifications(prev => Math.max(0, prev - 1))
  }

  function handleNotificationMouseDown(e) {
    if (e.target.closest('.modal-close') || e.target.closest('button')) return
    
    const modal = document.querySelector('.notifications-modal')
    if (!modal) return
    
    const rect = modal.getBoundingClientRect()
    
    // Se ainda não tem posição definida, usar a posição atual do modal
    if (notificationModalPosition.x === null && notificationModalPosition.y === null) {
      setNotificationModalPosition({
        x: rect.left,
        y: rect.top
      })
    }
    
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDraggingNotification(true)
  }

  function handleNotificationMouseMove(e) {
    if (!isDraggingNotification) return
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Limitar posição dentro da viewport
    const maxX = window.innerWidth - 400 // largura aproximada do modal
    const maxY = window.innerHeight - 300 // altura aproximada do modal
    
    setNotificationModalPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }

  function handleNotificationMouseUp() {
    setIsDraggingNotification(false)
  }

  useEffect(() => {
    if (isDraggingNotification) {
      document.addEventListener('mousemove', handleNotificationMouseMove)
      document.addEventListener('mouseup', handleNotificationMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleNotificationMouseMove)
        document.removeEventListener('mouseup', handleNotificationMouseUp)
      }
    }
  }, [isDraggingNotification, dragOffset])

  function markAllNotificationsAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadNotifications(0)
  }

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

      const loadedModules = response.data.modules || []
      setModules(loadedModules)

      // Verifica se o módulo website está ativo
      setHasWebsiteModule(loadedModules.includes('website'))

      // Verifica se o módulo webagendamento está ativo
      setHasOnlineBookingModule(loadedModules.includes('webagendamento'))

      // Verifica se o módulo botAgendamento está ativo
      setHasBotAgendamentoModule(loadedModules.includes("scheduling"))

      // Verifica se o módulo catalog está ativo
      setHasCatalogModule(loadedModules.includes('catalog'))

      // Verifica se o módulo PDV está ativo
      setHasPDVModule(loadedModules.includes('pdv_caixa'))

      // Verifica se o módulo pix está ativo (verifica tanto 'pix' quanto 'pixAutomatico')
      setHasPixModule(loadedModules.includes('pix') || loadedModules.includes('pixAutomatico'))

      // Verifica se o módulo WhatsApp (qrcode) está ativo
      setHasWhatsAppModule(loadedModules.includes('qrcode'))

    } catch (err) {
      console.log(err)
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

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('companyId')
    window.location.href = '/'
  }

  // loading seguro (evita tela preta)
  if (!companyId) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: 'white',
        fontSize: '18px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <p>Empresa não selecionada</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '10px' }}>
            Por favor, selecione uma empresa no Dashboard
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Ir para Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className='dashboard'>

      <aside className='sidebar'>

        <div className='sidebar-header'>

          <img
            src={companyData.logo || 'https://placehold.co/100x100'}
            alt='logo'
            className='sidebar-logo'
          />

          <h1 className='sidebar-company'>
            {companyData.displayName || 'Painel da Empresa'}
          </h1>

        </div>

        <nav className='sidebar-menu'>

          <button
            className={`sidebar-item ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            <OverviewIcon size={18} />
            <span>VISÃO GERAL</span>
          </button>

          <button
            className={`sidebar-item ${page === 'orders' ? 'active' : ''}`}
            onClick={() => setPage('orders')}
          >
            <ShoppingBagIcon size={18} />
            <span>PEDIDOS</span>
            {pendingOrders > 0 && (
              <div className='sidebar-notify'>{pendingOrders}</div>
            )}
          </button>

          <button
            className={`sidebar-item ${page === 'appointments' ? 'active' : ''}`}
            onClick={() => setPage('appointments')}
          >
            <ClipboardIcon size={18} />
            <span>AGENDAMENTOS</span>
            {pendingAppointments > 0 && (
              <div className='sidebar-notify'>{pendingAppointments}</div>
            )}
          </button>

          {hasCatalogModule && (
            <button
              className={`sidebar-item ${page === 'products' ? 'active' : ''}`}
              onClick={() => setPage('products')}
            >
              <BoxIcon size={18} />
            <span>PRODUTOS</span>
            </button>
          )}

          {hasPDVModule && (
            <button
              className={`sidebar-item ${page === 'pdv' ? 'active' : ''}`}
              onClick={() => setPage('pdv')}
            >
              <CreditCardIcon size={18} />
            <span>PDV CAIXA</span>
            </button>
          )}

          {hasBotAgendamentoModule && (

            <button
              className={`sidebar-item ${page === 'services' ? 'active' : ''}`}
              onClick={() => setPage('services')}
            >
              <ScissorsIcon size={18} />
            <span>SERVIÇOS</span>
            </button>

          )}


          <button
            className={`sidebar-item ${page === 'modules' ? 'active' : ''}`}
            onClick={() => setPage('modules')}
          >
            <LayersIcon size={18} />
            <span>PLANOS</span>
          </button>

          {hasOnlineBookingModule && (
            <button
              className={`sidebar-item ${page === 'online-booking' ? 'active' : ''}`}
              onClick={() => setPage('online-booking')}
            >
              <CalendarIcon size={18} />
            <span>WEB AGENDAMENTOS</span>
            </button>
          )}

          {hasWebsiteModule && (
            <>
              <button
                className={`sidebar-item ${page === 'website' ? 'active' : ''}`}
                onClick={() => setPage('website')}
              >
                <GlobeIcon size={18} />
            <span>WEB SITE</span>
              </button>
              <button
                className={`sidebar-item ${page === 'coupons' ? 'active' : ''}`}
                onClick={() => setPage('coupons')}
              >
                <ClipboardIcon size={18} />
            <span>CUPONS</span>
              </button>
              <button
                className={`sidebar-item ${page === 'messages' ? 'active' : ''}`}
                onClick={() => setPage('messages')}
              >
                <MessageIcon size={18} />
            <span>MENSAGENS</span>
              </button>
              <button
                className={`sidebar-item ${page === 'whatsapp-chat' ? 'active' : ''}`}
                onClick={() => setPage('whatsapp-chat')}
              >
                <WhatsAppIcon size={18} />
            <span>WHATSAPP WEB</span>
              </button>
            </>
          )}

          {hasPixModule && (
            <button
              className={`sidebar-item ${page === 'mercadopago' ? 'active' : ''}`}
              onClick={() => setPage('mercadopago')}
            >
              <CreditCardIcon size={18} />
            <span>MERCADO PAGO</span>
            </button>
          )}

          {hasWhatsAppModule && (
            <button
              className={`sidebar-item ${page === 'whatsapp-settings' ? 'active' : ''}`}
              onClick={() => setPage('whatsapp-settings')}
            >
              <WhatsAppIcon size={18} />
            <span>WHATSAPP</span>
            </button>
          )}


          <button
            className={`sidebar-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage('settings')}
          >
            <SettingsIcon size={18} />
            <span>CONFIGURAÇÕES</span>
          </button>

          <button
            className={`sidebar-item ${page === 'support' ? 'active' : ''}`}
            onClick={() => setPage('support')}
          >
            <SupportIcon size={18} />
            <span>SUPORTE</span>
          </button>

        </nav>

        <button className='logout-button' onClick={logout}>
          🚪 Sair
        </button>

      </aside>

      <main className='content'>

        {/* Header simples da empresa - aparece em todas as páginas */}
        <div className='company-header-simple'>
          <div className='company-header-left'>
            <img
              src={companyData.logo || 'https://placehold.co/80'}
              alt='logo'
              className='company-header-logo'
            />
            <div className='company-header-info'>
              <h1>{companyData.displayName}</h1>
              <p>@{companyId}</p>
            </div>
          </div>
          <div className='company-header-status'>
            <div className='status-dot'></div>
            Online
          </div>
          
          {/* Notification Bell Icon */}
          <div 
            className='header-icon-button'
            onClick={() => setShowNotificationsModal(true)}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <FaBell size={24} color='#94a3b8' />
            {unreadNotifications > 0 && (
              <div className='header-badge'>
                {unreadNotifications}
              </div>
            )}
          </div>

          {/* Global Chat Icon */}
          {hasWebsiteModule && (
            <div 
              className='header-icon-button'
              onClick={() => setShowMessagesModal(true)}
              style={{ position: 'relative', cursor: 'pointer', marginLeft: '16px' }}
            >
              <FaComments size={24} color='#94a3b8' />
              {unreadMessages > 0 && (
                <div className='header-badge'>
                  {unreadMessages}
                </div>
              )}
            </div>
          )}

          <button
            className={`manual-mode-toggle ${manualMode ? 'active' : ''}`}
            onClick={() => {
              setManualMode(!manualMode)
              // TODO: Call API to enable/disable manual mode for all conversations
            }}
          >
            {manualMode ? '🤖 Ativar Bot' : '👤 Atender Manualmente'}
          </button>

          <button
            className="agent-config-button"
            onClick={() => setShowAgentConfig(true)}
            title="Configurar Agente de IA"
          >
            🤖 Configurar IA
          </button>
        </div>

        {/* Subscription Banner */}
        {subscriptionStatus && subscriptionStatus.isInTrial && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '16px 24px',
            margin: '0 20px 20px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🎁</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                  Período de Teste Grátis
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Você tem {subscriptionStatus.trialDaysRemaining} dias restantes para testar todos os módulos!
                </p>
              </div>
            </div>
            <button
              onClick={() => setPage('modules')}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Ver Planos
            </button>
          </div>
        )}

        {!subscriptionStatus?.hasSubscription && !subscriptionStatus?.isInTrial && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '16px 24px',
            margin: '0 20px 20px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                  Período de Teste Encerrado
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Assine um plano para continuar usando o KRYPTON
                </p>
              </div>
            </div>
            <button
              onClick={() => setPage('modules')}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Assinar Agora
            </button>
          </div>
        )}

        {page === 'dashboard' && <Dashboard companyId={companyId} pendingOrders={pendingOrders} />}
        {page === 'orders' && <Orders companyId={companyId} onNotification={addNotification} />}
        {page === 'appointments' && <Appointments companyId={companyId} onNotification={addNotification} onPendingCountChange={setPendingAppointments} />}
        {page === 'products' && <Products />}
        {page === 'services' && <Services />}
        {page === 'settings' && <Settings onUpdate={loadCompanyData} onNotification={addNotification} />}
        {page === 'support' && <Support />}
        {page === 'modules' && <Modules companyId={companyId} onUpdate={loadModules} isReadOnly={false} />}
        {page === 'website' && <Website />}
        {page === 'coupons' && <Coupons />}
        {page === 'messages' && <Messages companyId={companyId} />}
        {page === 'whatsapp-chat' && <WhatsAppChat companyId={companyId} />}
        {page === 'online-booking' && <OnlineBooking />}
        {page === 'mercadopago' && <MercadoPago companyId={companyId} />}
        {page === 'pdv' && <PDVConfig />}
        {page === 'qrcode' && <CompanyQRCode companyId={companyId} />}
        {page === 'whatsapp-settings' && <WhatsAppSettings />}

      </main>

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className='modal-overlay' onClick={() => setShowNotificationsModal(false)}>
          <div 
            className='modal-content notifications-modal' 
            onClick={e => e.stopPropagation()}
            style={{
              position: notificationModalPosition.x === null && notificationModalPosition.y === null ? 'relative' : 'absolute',
              left: notificationModalPosition.x !== null ? `${notificationModalPosition.x}px` : 'auto',
              top: notificationModalPosition.y !== null ? `${notificationModalPosition.y}px` : 'auto',
              transform: notificationModalPosition.x === null && notificationModalPosition.y === null ? 'none' : 'none',
              cursor: isDraggingNotification ? 'grabbing' : 'default'
            }}
          >
            <div 
              className='modal-header'
              style={{ 
                cursor: isDraggingNotification ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
              onMouseDown={handleNotificationMouseDown}
            >
              <h2>🔔 Notificações</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {notifications.filter(n => !n.read).length > 0 && (
                  <button 
                    className='mark-all-read-btn'
                    onClick={markAllNotificationsAsRead}
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button className='modal-close' onClick={() => setShowNotificationsModal(false)}>×</button>
              </div>
            </div>
            <div className='modal-body'>
              {notifications.length === 0 ? (
                <div className='empty-state'>
                  <span style={{ fontSize: '48px' }}>🔔</span>
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className='notification-icon'>
                      {notification.type === 'order' && '🛒'}
                      {notification.type === 'appointment' && '📅'}
                      {notification.type === 'profile' && '👤'}
                      {notification.type === 'message' && '💬'}
                      {notification.type === 'rating' && '⭐'}
                      {!notification.type && '📢'}
                    </div>
                    <div className='notification-content'>
                      <div className='notification-title'>{notification.title}</div>
                      <div className='notification-message'>{notification.message}</div>
                      <div className='notification-time'>
                        {new Date(notification.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <button 
                      className='notification-remove'
                      onClick={(e) => {
                        e.stopPropagation()
                        removeNotification(notification.id)
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Messages Modal */}
      {showMessagesModal && (
        <div className='modal-overlay' onClick={() => setShowMessagesModal(false)}>
          <div className='modal-content messages-global-modal' onClick={e => e.stopPropagation()}>
            <div className='modal-header'>
              <h2>💬 Mensagens Globais</h2>
              <button className='modal-close' onClick={() => setShowMessagesModal(false)}>×</button>
            </div>
            <div className='modal-body'>
              <Messages companyId={companyId} />
            </div>
          </div>
        </div>
      )}

      {/* Agent Config Modal */}
      {showAgentConfig && (
        <AgentConfig
          companyId={companyId}
          onClose={() => setShowAgentConfig(false)}
        />
      )}

    </div>
    </ErrorBoundary>
  )
}