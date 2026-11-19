import {
  useEffect,
  useState
} from 'react'

import io from 'socket.io-client'

import api from '../services/api'

import '../styles/painelAdmin/superadmin-whatsapp.css'

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4177')

export default function SuperAdminWhatsApp() {

  const [qr, setQr] = useState(null)
  const [connected, setConnected] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [autoMessage, setAutoMessage] = useState('Olá, somos o Super Admin')
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState('559191873356')
  const [testSending, setTestSending] = useState(false)

  useEffect(() => {
    console.log('🔌 Socket.io conectado ao Super Admin WhatsApp')
    
    loadStatus()
    loadAutoMessage()

    // Escutar atualizações de conexão
    socket.on('superadmin-connection-update', data => {
      console.log('📡 Super Admin connection update recebido:', data)
      console.log('📡 QR disponível:', data.qr ? 'SIM' : 'NÃO')
      console.log('📡 Tipo do QR:', typeof data.qr)
      setQr(data.qr || null)
      setConnected(data.connected || false)
      setPhoneNumber(data.phoneNumber || '')
      setLoading(false)
    })

    // Polling como fallback (a cada 5 segundos)
    const interval = setInterval(() => {
      loadStatus()
    }, 5000)

    return () => {
      socket.off('superadmin-connection-update')
      clearInterval(interval)
    }
  }, [])

  async function loadStatus() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/superadmin/whatsapp/status', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setQr(response.data.qr || null)
      setConnected(response.data.connected || false)
      setPhoneNumber(response.data.phoneNumber || '')
      setLoading(false)
    } catch (err) {
      console.log('Erro ao carregar status:', err)
      setLoading(false)
    }
  }

  async function loadAutoMessage() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/superadmin/whatsapp/auto-message', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setAutoMessage(response.data.message || 'Olá, somos o Super Admin')
    } catch (err) {
      console.log('Erro ao carregar mensagem automática:', err)
    }
  }

  async function saveAutoMessage() {
    try {
      const token = localStorage.getItem('token')
      await api.put('/superadmin/whatsapp/auto-message', {
        message: autoMessage
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      alert('Mensagem automática salva!')
    } catch (err) {
      console.log('Erro ao salvar mensagem automática:', err)
      alert('Erro ao salvar mensagem automática')
    }
  }

  async function disconnect() {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp do Super Admin?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await api.post('/superadmin/whatsapp/disconnect', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      alert('WhatsApp desconectado!')
      loadStatus()
    } catch (err) {
      console.log('Erro ao desconectar:', err)
      alert('Erro ao desconectar')
    }
  }

  async function restartConnection() {
    try {
      const token = localStorage.getItem('token')
      await api.post('/superadmin/whatsapp/restart', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      alert('Conexão reiniciada!')
      setLoading(true)
      loadStatus()
    } catch (err) {
      console.log('Erro ao reiniciar conexão:', err)
      alert('Erro ao reiniciar conexão')
    }
  }

  async function sendTestMessage() {
    if (!testPhone || testPhone.length < 10) {
      alert('Digite um número válido')
      return
    }

    setTestSending(true)
    try {
      const token = localStorage.getItem('token')
      const response = await api.post('/superadmin/whatsapp/send-test', {
        phone: testPhone
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.data.success) {
        alert('Mensagem de teste enviada com sucesso!')
      } else {
        alert(response.data.error || 'Erro ao enviar mensagem')
      }
    } catch (err) {
      console.log('Erro ao enviar mensagem de teste:', err)
      alert('Erro ao conectar com servidor')
    } finally {
      setTestSending(false)
    }
  }

  return (
    <div className='superadmin-whatsapp'>

      <div className='whatsapp-header'>
        <h1>✨ WhatsApp Super Admin</h1>
        <p>Conexão independente para gerenciamento do sistema</p>
      </div>

      <div className='whatsapp-grid'>

        {/* Status Card */}
        <div className='status-card'>
          <div className='status-header'>
            <h2>Status da Conexão</h2>
            {connected ? (
              <span className='status-badge connected'>🟢 Online</span>
            ) : (
              <span className='status-badge pending'>🟡 Pendente</span>
            )}
          </div>

          {loading && (
            <div className='qr-loading'>
              <span className='pulse-dot'></span>
              Carregando...
            </div>
          )}

          {!loading && !connected && qr && (
            <div className='qr-container'>
              <img
                src={qr}
                alt="QR Code"
                className='qr-image'
              />
              <p className='qr-instruction'>
                Escaneie o QR Code com o WhatsApp para conectar
              </p>
            </div>
          )}

          {!loading && !connected && !qr && (
            <div className='qr-loading'>
              <span className='pulse-dot'></span>
              Gerando QR Code...
            </div>
          )}

          {!loading && connected && (
            <div className='connected-info'>
              <div className='connected-icon'>✅</div>
              <p className='connected-text'>Conectado com sucesso!</p>
              {phoneNumber && (
                <p className='phone-number'>{phoneNumber}</p>
              )}
            </div>
          )}

          {!loading && connected && (
            <button className='disconnect-button' onClick={disconnect}>
              📡 Desconectar
            </button>
          )}

          {!loading && !connected && (
            <button className='restart-button' onClick={restartConnection}>
              🔄 Reiniciar Conexão
            </button>
          )}
        </div>

        {/* Auto Message Card */}
        <div className='message-card'>
          <div className='message-header'>
            <h2>Mensagem Automática</h2>
            <span className='message-badge'>💬</span>
          </div>

          <p className='message-description'>
            Esta mensagem será enviada automaticamente sempre que alguém
            enviar uma mensagem para o número conectado do Super Admin.
          </p>

          <textarea
            className='message-input'
            value={autoMessage}
            onChange={e => setAutoMessage(e.target.value)}
            placeholder='Digite a mensagem automática...'
            rows={4}
          />

          <button className='save-button' onClick={saveAutoMessage}>
            💾 Salvar Mensagem
          </button>
        </div>

      </div>

      {/* Info Card */}
      <div className='info-card'>
        <h3>ℹ️ Informações</h3>
        <ul>
          <li>Este WhatsApp é independente das empresas</li>
          <li>Não agrega mensagens de empresas</li>
          <li>Usado para envio de códigos e gerenciamento</li>
          <li>Apenas Super Admin pode acessar</li>
        </ul>
      </div>

      {/* Test Environment Card */}
      <div className='test-card'>
        <div className='test-header'>
          <h3>🧪 Ambiente de Teste</h3>
          <span className='test-badge'>TESTE</span>
        </div>

        <p className='test-description'>
          Envie uma mensagem de teste para verificar se o Super Admin WhatsApp está funcionando corretamente.
        </p>

        <div className='test-input-group'>
          <label className='test-label'>Número de WhatsApp</label>
          <input
            type='text'
            className='test-input'
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            placeholder='559191873356'
            maxLength={15}
          />
          <p className='test-hint'>Formato: 559191873356 (código país + DDD + número, sem + ou espaços)</p>
        </div>

        <button
          className='test-button'
          onClick={sendTestMessage}
          disabled={testSending || !connected}
        >
          {testSending ? '⏳ Enviando...' : '📱 Enviar Mensagem de Teste'}
        </button>

        {!connected && (
          <p className='test-warning'>
            ⚠️ Conecte o WhatsApp Super Admin antes de enviar mensagens de teste
          </p>
        )}
      </div>

    </div>
  )
}
