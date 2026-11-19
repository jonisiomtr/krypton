import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import '../../styles/company/agent-config.css'

export default function AgentConfig({ companyId, onClose }) {
  const [config, setConfig] = useState({
    agentName: 'Bella',
    welcomeMessage: ''
  })
  const [showTestChat, setShowTestChat] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [companyId])

  async function loadConfig() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const companyConfig = response.data
      
      setConfig({
        agentName: companyConfig.agentName || 'Bella',
        welcomeMessage: companyConfig.welcomeMessage || ''
      })
    } catch (err) {
      console.log('Erro ao carregar config do agente:', err)
    }
  }

  async function saveConfig() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      await api.put(
        `/companies/${companyId}`,
        {
          agentName: config.agentName,
          welcomeMessage: config.welcomeMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      alert('✅ Configurações do agente salvas com sucesso!')
    } catch (err) {
      console.log('Erro ao salvar config:', err)
      alert('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="agent-config-overlay">
      <div className="agent-config-modal">
        <div className="agent-config-header">
          <h2>🤖 Configuração do Agente de IA</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="agent-config-content">
          <div className="config-section">
            <label>Nome do Agente</label>
            <input
              type="text"
              value={config.agentName}
              onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
              placeholder="Ex: Bella, Ana, Carlos..."
            />
            <small>Este é o nome que aparecerá nas mensagens do bot</small>
          </div>

          <div className="config-section">
            <label>Mensagem de Boas-vindas Personalizada</label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              placeholder="Deixe em branco para usar a mensagem padrão..."
              rows={6}
            />
            <small>
              Variáveis disponíveis: &#123;companyName&#125; - Nome da empresa
            </small>
          </div>

          <div className="config-actions">
            <button
              className="btn-test"
              onClick={() => setShowTestChat(true)}
            >
              🧪 Testar Agente
            </button>
            <button
              className="btn-save"
              onClick={saveConfig}
              disabled={loading}
            >
              {loading ? 'Salvando...' : '💾 Salvar Configurações'}
            </button>
          </div>
        </div>

        {showTestChat && (
          <AgentTestChat
            companyId={companyId}
            onClose={() => setShowTestChat(false)}
          />
        )}
      </div>
    </div>
  )
}

function AgentTestChat({ companyId, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  useEffect(() => {
    // Carregar mensagem de boas-vindas do backend (lógica REAL)
    loadWelcomeMessage()
    
    // Limpar sessão ao fechar
    return () => {
      if (sessionId) {
        clearSession()
      }
    }
  }, [companyId])

  async function loadWelcomeMessage() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/agent-test/${companyId}/welcome`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessages([
          {
            id: 1,
            from: 'bot',
            text: response.data.message,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          }
        ])
      }
    } catch (err) {
      console.log('Erro ao carregar mensagem de boas-vindas:', err)
    }
  }

  async function clearSession() {
    try {
      const token = localStorage.getItem('token')
      await api.delete(`/api/agent-test/${companyId}/session`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.log('Erro ao limpar sessão:', err)
    }
  }

  async function handleSend() {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      from: 'user',
      text: input,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([...messages, userMessage])
    const messageToSend = input
    setInput('')

    // Simular "digitando..."
    setIsTyping(true)

    try {
      const token = localStorage.getItem('token')
      
      // Tempo de resposta aleatório entre 1-3 segundos (como WhatsApp real)
      const responseTime = Math.random() * 2000 + 1000

      setTimeout(async () => {
        const response = await api.post(
          `/api/agent-test/${companyId}/message`,
          { message: messageToSend, sessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        setIsTyping(false)

        if (response.data.success) {
          // Atualizar sessionId se for novo
          if (response.data.sessionId && !sessionId) {
            setSessionId(response.data.sessionId)
          }

          // Se houver uma resposta do bot, adicionar ao chat
          if (response.data.message) {
            const botResponse = {
              id: Date.now() + 1,
              from: 'bot',
              text: response.data.message,
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
            setMessages(prev => [...prev, botResponse])
          }

          // Se o fluxo mudou para outro módulo, informar o usuário
          if (response.data.session && response.data.session.flow !== 'assistant') {
            const botResponse = {
              id: Date.now() + 2,
              from: 'bot',
              text: `🔄 Entrando no módulo: ${response.data.session.flow}...\n\nEste módulo tem funcionalidades específicas. Para testar completamente, use o WhatsApp real.`,
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }
            setMessages(prev => [...prev, botResponse])
          }
        }
      }, responseTime)
    } catch (err) {
      console.log('Erro ao enviar mensagem:', err)
      setIsTyping(false)
      
      // Em caso de erro, mostrar mensagem de erro
      const errorResponse = {
        id: Date.now() + 1,
        from: 'bot',
        text: '❌ Erro ao processar mensagem. Por favor, tente novamente.',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorResponse])
    }
  }

  useEffect(() => {
    // Auto-scroll quando novas mensagens chegam
    const messagesContainer = document.querySelector('.chat-messages')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }, [messages, isTyping])

  return (
    <div className="agent-test-chat-overlay">
      <div className="agent-test-chat-modal">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">🤖</div>
            <div>
              <h3>Agente (Teste)</h3>
              <small>Ambiente de simulação - Lógica REAL do WhatsApp</small>
            </div>
          </div>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.from}`}>
              <div className="message-content">
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                <div className="message-footer">
                  <span className="message-time">{msg.time}</span>
                  {msg.from === 'user' && <span className="message-check">✓✓</span>}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message bot">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
          />
          <button onClick={handleSend} className="send-button">
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
