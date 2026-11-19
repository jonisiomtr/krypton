/**
 * @fileoverview WhatsApp Chat Interface - Human Agent Dashboard
 * @description Real-time chat interface for manual WhatsApp message handling
 * @author CTO/CPO Senior Team
 * @version 2.0.0
 */

import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'
import io from 'socket.io-client'
import '../../styles/painelEmpresas/whatsapp-chat.css'

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4177')

export default function WhatsAppChat({ companyId }) {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const messagesEndRef = useRef(null)

  // Estado do chat de teste
  const [showTestChat, setShowTestChat] = useState(false)
  const [testMessages, setTestMessages] = useState([])
  const [testInput, setTestInput] = useState('')
  const [testTyping, setTestTyping] = useState(false)
  const testMessagesEndRef = useRef(null)

  // Carregar conversas ao montar
  useEffect(() => {
    loadConversations()
    checkWhatsAppConnection()
    
    // WebSocket para atualizações em tempo real
    socket.on('connection-update', (data) => {
      if (data.clientId === companyId) {
        setWhatsappConnected(data.connected)
        if (data.connected) {
          loadConversations()
        }
      }
    })

    return () => {
      socket.off('connection-update')
    }
  }, [companyId])

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-scroll para chat de teste
  useEffect(() => {
    testMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [testMessages])

  async function checkWhatsAppConnection() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/companies/${companyId}/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setWhatsappConnected(response.data.connected)
      console.log('📡 Status WhatsApp:', response.data.connected ? 'Online' : 'Offline')
    } catch (err) {
      console.log('Erro ao verificar conexão WhatsApp:', err)
      setWhatsappConnected(false)
    }
  }

  async function loadConversations() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Buscar conversas reais do WhatsApp via Baileys
      const response = await api.get(`/companies/${companyId}/whatsapp/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setConversations(response.data.chats || [])
    } catch (err) {
      console.log('Erro ao carregar conversas:', err)
      // Fallback para mensagens do site se WhatsApp não estiver conectado
      try {
        const fallbackResponse = await api.get(`/messages/${companyId}`)
        setConversations(fallbackResponse.data.messages || [])
      } catch (fallbackErr) {
        console.log('Erro ao carregar conversas do site:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(jid) {
    try {
      const token = localStorage.getItem('token')
      
      // Buscar mensagens reais do WhatsApp
      const response = await api.get(`/companies/${companyId}/whatsapp/messages/${jid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Formatar mensagens
      const formattedMessages = response.data.messages.map(msg => ({
        id: msg.id,
        fromMe: msg.fromMe,
        text: msg.text,
        timestamp: msg.timestamp,
        type: msg.type
      }))
      
      setMessages(formattedMessages)
    } catch (err) {
      console.log('Erro ao carregar mensagens:', err)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const token = localStorage.getItem('token')
      
      // Enviar via WhatsApp Baileys
      const response = await api.post(
        `/companies/${companyId}/whatsapp/send`,
        {
          jid: selectedConversation.jid,
          message: newMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Adicionar mensagem enviada localmente
      const newMsg = {
        id: Date.now().toString(),
        fromMe: true,
        text: newMessage,
        timestamp: Date.now(),
        type: 'text'
      }
      
      setMessages([...messages, newMsg])
      setNewMessage('')
      
      // Recarregar conversas para atualizar última mensagem
      loadConversations()
    } catch (err) {
      console.log('Erro ao enviar mensagem:', err)
      alert('Erro ao enviar mensagem. Verifique se o WhatsApp está conectado.')
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Chat de Teste - Enviar mensagem
  async function sendTestMessage() {
    if (!testInput.trim()) return

    try {
      const token = localStorage.getItem('token')

      // Adicionar mensagem do usuário
      const userMsg = {
        id: Date.now().toString(),
        fromMe: true,
        text: testInput,
        timestamp: Date.now(),
        type: 'text'
      }
      setTestMessages([...testMessages, userMsg])
      setTestInput('')
      setTestTyping(true)

      // Enviar para o backend
      const response = await api.post(
        `/companies/${companyId}/whatsapp/test-chat`,
        { message: userMsg.text },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setTestTyping(false)

      // Adicionar resposta da IA
      if (response.data.response) {
        const botMsg = {
          id: (Date.now() + 1).toString(),
          fromMe: false,
          text: response.data.response,
          timestamp: Date.now(),
          type: 'text'
        }
        setTestMessages([...testMessages, userMsg, botMsg])
      }
    } catch (err) {
      console.log('Erro ao enviar mensagem de teste:', err)
      setTestTyping(false)
      alert('Erro ao enviar mensagem de teste: ' + (err.response?.data?.error || err.message))
    }
  }

  // Chat de Teste - Limpar sessão
  async function clearTestSession() {
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/companies/${companyId}/whatsapp/test-chat/session`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTestMessages([])
    } catch (err) {
      console.log('Erro ao limpar sessão de teste:', err)
    }
  }

  // Chat de Teste - Handle key press
  function handleTestKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendTestMessage()
    }
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatName(name) {
    // Se for número de telefone, formatar
    if (/^\d+$/.test(name)) {
      const cleaned = name.replace(/\D/g, '')
      if (cleaned.length === 11) {
        return `+55 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
      }
      return name
    }
    return name
  }

  return (
    <div className='whatsapp-chat-container'>
      {/* Sidebar - Lista de Conversas */}
      <div className={`chat-sidebar ${selectedConversation ? 'hidden-mobile' : ''}`}>
        <div className='chat-sidebar-header'>
          <h2>Conversas</h2>
          <div className={`connection-status ${whatsappConnected ? 'connected' : 'disconnected'}`}>
            {whatsappConnected ? '🟢 Online' : '🔴 Offline'}
          </div>
          <button className='refresh-btn' onClick={loadConversations}>
            🔄
          </button>
          <button
            className='test-chat-btn'
            onClick={() => setShowTestChat(true)}
            title='Chat de Teste da IA'
          >
            🧪
          </button>
        </div>

        {!whatsappConnected ? (
          <div className='chat-connection-warning'>
            <p>⚠️ WhatsApp não conectado</p>
            <p>Conecte o WhatsApp para ver conversas</p>
          </div>
        ) : loading ? (
          <div className='chat-loading'>Carregando conversas...</div>
        ) : (
          <div className='conversations-list'>
            {conversations.length === 0 ? (
              <div className='no-conversations'>
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedConversation(conv)
                    loadMessages(conv.jid)
                  }}
                >
                  <div className='conversation-avatar'>
                    {formatName(conv.name).charAt(0) || '?'}
                  </div>
                  <div className='conversation-info'>
                    <div className='conversation-name'>{formatName(conv.name)}</div>
                    <div className='conversation-preview'>
                      {conv.lastMessage?.substring(0, 40) || 'Sem mensagem'}
                    </div>
                  </div>
                  <div className='conversation-time'>
                    {conv.timestamp ? formatTimestamp(conv.timestamp) : ''}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className='unread-badge'>{conv.unreadCount}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`chat-main ${!selectedConversation ? 'hidden-mobile' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className='chat-header'>
              <div className='chat-header-left'>
                <div className='chat-avatar'>
                  {formatName(selectedConversation.name).charAt(0) || '?'}
                </div>
                <div className='chat-header-info'>
                  <h3>{formatName(selectedConversation.name)}</h3>
                  <p>{selectedConversation.jid}</p>
                </div>
              </div>
              <div className='chat-header-actions'>
                <button
                  className='back-button'
                  onClick={() => setSelectedConversation(null)}
                >
                  ← Voltar
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className='chat-messages'>
              {messages.length === 0 ? (
                <div className='no-messages'>
                  <p>Nenhuma mensagem nesta conversa</p>
                <p>Seja o primeiro a enviar uma mensagem!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.fromMe ? 'sent' : 'received'}`}
                  >
                    <div className='message-content'>{msg.text}</div>
                    <div className='message-time'>
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className='chat-input-area'>
              <textarea
                className='message-input'
                placeholder='Digite sua mensagem...'
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={1}
              />
              <button 
                className='send-button' 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                ➤
              </button>
            </div>
          </>
        ) : (
          <div className='chat-empty-state'>
            <div className='empty-icon'>💬</div>
            <h3>Selecione uma conversa</h3>
            <p>Escolha uma conversa da lista para começar a atender</p>
          </div>
        )}
      </div>

      {/* Modal de Chat de Teste */}
      {showTestChat && (
        <div className='test-chat-modal-overlay' onClick={() => setShowTestChat(false)}>
          <div className='test-chat-modal' onClick={(e) => e.stopPropagation()}>
            <div className='test-chat-header'>
              <div className='test-chat-header-left'>
                <div className='test-chat-icon'>🧪</div>
                <div className='test-chat-header-info'>
                  <h3>Chat de Teste da IA</h3>
                  <p>Teste seu assistente virtual sem precisar de um segundo número</p>
                </div>
              </div>
              <div className='test-chat-header-actions'>
                <button
                  className='test-chat-clear-btn'
                  onClick={clearTestSession}
                  title='Limpar conversa'
                >
                  🗑️
                </button>
                <button
                  className='test-chat-close-btn'
                  onClick={() => setShowTestChat(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className='test-chat-messages'>
              {testMessages.length === 0 ? (
                <div className='test-chat-empty'>
                  <div className='test-chat-empty-icon'>🤖</div>
                  <h3>Chat de Teste</h3>
                  <p>Envie uma mensagem para testar sua IA</p>
                  <p className='test-chat-hint'>Dica: Tente "oi" ou "menu"</p>
                </div>
              ) : (
                <>
                  {testMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`test-message ${msg.fromMe ? 'sent' : 'received'}`}
                    >
                      <div className='test-message-content'>{msg.text}</div>
                      <div className='test-message-time'>
                        {formatTimestamp(msg.timestamp / 1000)}
                      </div>
                    </div>
                  ))}
                  {testTyping && (
                    <div className='test-message received typing'>
                      <div className='test-message-content'>
                        <span className='typing-indicator'>
                          <span className='typing-dot'></span>
                          <span className='typing-dot'></span>
                          <span className='typing-dot'></span>
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={testMessagesEndRef} />
                </>
              )}
            </div>

            <div className='test-chat-input-area'>
              <textarea
                className='test-chat-input'
                placeholder='Digite sua mensagem...'
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyPress={handleTestKeyPress}
                rows={1}
              />
              <button
                className='test-chat-send-btn'
                onClick={sendTestMessage}
                disabled={!testInput.trim() || testTyping}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
