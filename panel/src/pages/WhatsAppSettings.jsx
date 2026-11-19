import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import api from '../services/api'

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4177')

export default function WhatsAppSettings() {
  const companyId = localStorage.getItem('companyId')
  const [qr, setQr] = useState(null)
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadQr()
    loadConfig()

    socket.on('connection-update', data => {
      if (data.clientId === companyId) {
        setQr(data)
      }
    })

    return () => {
      socket.off('connection-update')
    }
  }, [companyId])

  async function loadQr() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/companies/${companyId}/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setQr(response.data)
    } catch (error) {
      console.log(error)
    }
  }

  async function loadConfig() {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/company/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setWelcomeMessage(response.data.welcomeMessage || '')
    } catch (error) {
      console.log(error)
    }
  }

  async function saveWelcomeMessage() {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await api.post(
        '/company/whatsapp',
        {
          companyId,
          welcomeMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      alert('✅ Mensagem de boas-vindas atualizada!')
    } catch (error) {
      console.log(error)
      alert('❌ Erro ao salvar mensagem')
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: '30px' }}>
      {/* QR Code Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Conexão WhatsApp</h2>

        {qr?.connected ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: '#10B981',
            borderRadius: '12px',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
            <h3>WhatsApp Conectado</h3>
            <p>Sua conexão está ativa e funcionando</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            {qr?.qr ? (
              <div>
                <img
                  src={qr.qr}
                  alt="QR Code"
                  style={{
                    width: '300px',
                    height: '300px',
                    margin: '0 auto 20px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <p style={{ color: '#6B7280' }}>
                  Abra o WhatsApp no seu celular e escaneie o QR Code
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#FEF3C7',
                  borderRadius: '8px',
                  color: '#92400E'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    background: '#F59E0B',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></span>
                  Conectando...
                </div>
              </div>
            ) : (
              <div style={{
                padding: '40px',
                background: '#F3F4F6',
                borderRadius: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #E5E7EB',
                  borderTop: '4px solid #3B82F6',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p>Gerando QR Code...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Welcome Message Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Mensagem de Boas-Vindas</h2>
        <p style={{ color: '#6B7280', marginBottom: '20px' }}>
          Personalize a mensagem que a IA envia quando um cliente entra em contato pela primeira vez.
        </p>

        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="Ex: ✨ Seja bem-vindo(a) à [Nome da Empresa]!&#10;&#10;Eu sou o assistente virtual. Como posso ajudar?"
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '15px',
            border: '2px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'monospace',
            resize: 'vertical',
            marginBottom: '20px'
          }}
        />

        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, color: '#1E40AF', fontSize: '13px' }}>
            <strong>Dica:</strong> Você pode usar variáveis automáticas. O nome da empresa é inserido automaticamente.
            Use *texto* para negrito e _texto_ para itálico.
          </p>
        </div>

        <button
          onClick={saveWelcomeMessage}
          disabled={saving}
          style={{
            background: saving ? '#9CA3AF' : '#3B82F6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Mensagem'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
