import { useEffect, useState } from 'react'
import api from '../../services/api'
import '../../styles/painelEmpresas/messages.css'
import io from 'socket.io-client'

export default function Messages({ companyId }) {
  const [conversations, setConversations] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [registeredCustomers, setRegisteredCustomers] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  useEffect(() => {
    if (companyId) {
      loadConversations()
      loadRegisteredCustomers()
      
      // Socket.io for real-time updates
      const socket = io()
      socket.on('new_message', (message) => {
        console.log('📨 New message received in company panel:', message)
        loadConversations()
        if (selectedCustomer === message.customerId) {
          loadCustomerMessages(selectedCustomer)
        }
      })

      // Auto-refresh mensagens a cada 10 segundos (fallback)
      const interval = setInterval(() => {
        loadConversations()
        if (selectedCustomer) {
          loadCustomerMessages(selectedCustomer)
        }
      }, 10000)
      
      return () => {
        clearInterval(interval)
        socket.disconnect()
      }
    }
  }, [companyId, selectedCustomer])

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (showCustomerDropdown && !event.target.closest('.customer-select-wrapper')) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCustomerDropdown])

  async function loadConversations() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/messages/${companyId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setConversations(response.data.conversations || [])
    } catch (err) {
      console.log('Erro ao carregar conversas:', err)
      setConversations([])
    }
  }

  async function loadRegisteredCustomers() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/customers/${companyId}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRegisteredCustomers(response.data.customers || [])
    } catch (err) {
      console.log('Erro ao carregar clientes cadastrados:', err)
      setRegisteredCustomers([])
    }
  }

  async function loadCustomerMessages(customerId) {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/messages/${companyId}/customer/${customerId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatMessages(response.data.messages || [])
      
      // Marcar TODAS as mensagens como lidas ao abrir conversa
      const unreadMessages = response.data.messages.filter(msg => !msg.read && msg.from === 'customer')
      unreadMessages.forEach(msg => {
        markAsRead(msg.id)
      })
      
      // Recarregar conversas para atualizar contadores
      loadConversations()
    } catch (err) {
      console.log('Erro ao carregar mensagens do cliente:', err)
      setChatMessages([])
    }
  }

  async function markAsRead(messageId) {
    try {
      const token = localStorage.getItem('token')
      await api.put(`/api/messages/${companyId}/message/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.log('Erro ao marcar como lida:', err)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedCustomer) return

    try {
      const token = localStorage.getItem('token')
      const response = await api.post(`/api/messages/${companyId}/message`, {
        customerId: selectedCustomer,
        message: newMessage,
        type: 'company'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setNewMessage('')
        loadCustomerMessages(selectedCustomer)
      }
    } catch (err) {
      console.log('Erro ao enviar mensagem:', err)
      alert('Erro ao enviar mensagem')
    }
  }

  async function deleteConversation(customerId) {
    if (!confirm('Tem certeza que deseja deletar esta conversa?')) return

    try {
      const token = localStorage.getItem('token')
      await api.delete(`/api/messages/${companyId}/conversation/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (selectedCustomer === customerId) {
        setSelectedCustomer(null)
        setChatMessages([])
      }

      loadConversations()
    } catch (err) {
      console.log('Erro ao deletar conversa:', err)
      alert('Erro ao deletar conversa')
    }
  }

  function selectCustomer(customerId) {
    setSelectedCustomer(customerId)
    loadCustomerMessages(customerId)
  }

  function startNewConversation(customerPhone) {
    // Normalizar telefone para match com sistema de mensagens
    const normalizedPhone = customerPhone.replace(/\D/g, '')
    selectCustomer(normalizedPhone)
  }

  function getAvatar(name) {
    if (!name) return '👤'
    return name.charAt(0).toUpperCase()
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    // Se for hoje, mostra hora
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    
    // Se for ontem, mostra "Ontem"
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    }
    
    // Senão, mostra data
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  function formatMessage(text) {
    // Formata Markdown básico: *texto* -> negrito
    let formatted = text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  function isOrderMessage(text) {
    return text.includes('PEDIDO') || text.includes('Pedido') || text.includes('pedido')
  }

  function formatOrderMessageForCompany(text) {
    // Simplify order message for company panel
    if (text.includes('PEDIDO REALIZADO')) {
      return text.split('\n\n')[0] + '\n\n' + text.split('\n\n')[1] // Keep title and customer info
    }
    return text
  }

  return (
    <div className='messages-page'>
      <div className='messages-header'>
        <div>
          <h1>💬 Mensagens</h1>
          <p>Comunique-se com seus clientes pelo site</p>
        </div>
        <div className='messages-badge'>
          {conversations.length} conversas
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className='messages-empty'>
          <div className='messages-empty-icon'>💬</div>
          <h2>Nenhuma mensagem ainda</h2>
          <p>As mensagens enviadas pelos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className='messages-container'>
          <div className='customers-list'>
            <div className='customers-list-header'>
              <h3>Clientes</h3>
              <div className='customer-select-wrapper'>
                <button 
                  className='customer-select-btn'
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                >
                  👤 Selecionar Cliente
                </button>
                {showCustomerDropdown && (
                  <div className='customer-dropdown'>
                    {registeredCustomers.length === 0 ? (
                      <div className='dropdown-empty'>
                        Nenhum cliente cadastrado
                      </div>
                    ) : (
                      registeredCustomers.map(customer => (
                        <div 
                          key={customer.id}
                          className='dropdown-item'
                          onClick={() => {
                            startNewConversation(customer.phone)
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <div className='dropdown-item-icon'>
                            {getAvatar(customer.name)}
                          </div>
                          <div className='dropdown-item-info'>
                            <div className='dropdown-item-name'>{customer.name}</div>
                            <div className='dropdown-item-phone'>{customer.phone}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            {conversations.map((conv, index) => (
              <div
                key={index}
                className={`customer-item ${selectedCustomer === conv.customerId ? 'active' : ''}`}
                onClick={() => selectCustomer(conv.customerId)}
              >
                <div className='customer-avatar'>
                  {getAvatar(conv.customerName)}
                </div>
                <div className='customer-info'>
                  <div className='customer-name'>{conv.customerName}</div>
                  <div className='customer-phone'>{conv.customerPhone}</div>
                  <div className='customer-last-message'>
                    {isOrderMessage(conv.lastMessage) ? '🛒 ' : ''}{conv.lastMessage.substring(0, 40)}...
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <div className='unread-badge'>{conv.unreadCount}</div>
                )}
                <button 
                  className='delete-conversation-btn'
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.customerId)
                  }}
                  title='Deletar conversa'
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className='chat-area'>
            {selectedCustomer ? (
              <>
                <div className='chat-header'>
                  <div className='chat-header-left'>
                    <div className='chat-header-avatar'>
                      {getAvatar(conversations.find(c => c.customerId === selectedCustomer)?.customerName)}
                    </div>
                    <div className='chat-header-info'>
                      <h3>{conversations.find(c => c.customerId === selectedCustomer)?.customerName}</h3>
                      <span className='chat-phone'>{conversations.find(c => c.customerId === selectedCustomer)?.customerPhone}</span>
                    </div>
                  </div>
                  <button className='close-chat' onClick={() => setSelectedCustomer(null)}>×</button>
                </div>
                <div className='chat-messages'>
                  {chatMessages.length === 0 ? (
                    <div className='no-messages'>Nenhuma mensagem nesta conversa</div>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`chat-message ${msg.from} ${isOrderMessage(msg.message) ? 'order-message' : ''}`}
                      >
                        <div className='message-bubble'>
                          {isOrderMessage(msg.message) && (
                            <div className='order-icon'>🛒</div>
                          )}
                          <div className='message-content'>
                            {isOrderMessage(msg.message) ? formatOrderMessageForCompany(msg.message) : formatMessage(msg.message)}
                          </div>
                          <div className='message-time'>
                            {formatTime(msg.createdAt)}
                            {msg.from === 'company' && (
                              <span className={`read-receipt ${msg.read ? 'read' : 'pending'}`}>
                                {msg.read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className='chat-input-area'>
                  <input
                    type='text'
                    className='chat-input'
                    placeholder='Digite sua mensagem...'
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button className='send-button' onClick={sendMessage}>
                    <span className='send-icon'>📤</span>
                  </button>
                </div>
              </>
            ) : (
              <div className='no-chat-selected'>
                <div className='no-chat-icon'>💬</div>
                <h3>Selecione um cliente</h3>
                <p>Escolha uma conversa da lista para começar</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
