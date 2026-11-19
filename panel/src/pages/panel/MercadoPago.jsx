import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function MercadoPago({ companyId }) {

  const [mercadoPagoData, setMercadoPagoData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (companyId) {
      loadMercadoPagoData()
    }
  }, [companyId])

  async function loadMercadoPagoData() {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')

      const response = await api.get(
        `/api/mercadopago/status/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setMercadoPagoData(response.data)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar dados Mercado Pago:', err)
      setError('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConnect() {
    try {
      console.log('🔗 Clicou em conectar Mercado Pago')
      console.log('companyId:', companyId)
      
      const token = localStorage.getItem('token')
      console.log('Token presente:', !!token)

      const response = await api.get(
        `/api/mercadopago/auth/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      console.log('✅ Auth URL recebida:', response.data.authUrl ? 'Sim' : 'Não')

      // Redireciona para a URL de autorização do Mercado Pago
      if (response.data.authUrl) {
        console.log('🔄 Redirecionando para Mercado Pago...')
        window.location.href = response.data.authUrl
      } else {
        console.error('❌ Auth URL não recebida')
        setError('Erro ao receber URL de autorização')
      }
    } catch (err) {
      console.error('❌ Erro ao conectar Mercado Pago:', err)
      setError('Erro ao conectar com Mercado Pago: ' + (err.response?.data?.error || err.message))
    }
  }

  async function handleDisconnect() {
    if (!confirm('Tem certeza que deseja desconectar sua conta Mercado Pago?')) {
      return
    }

    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')

      await api.post(
        `/mercadopago/disconnect/${companyId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setMercadoPagoData(null)
      alert('Conta Mercado Pago desconectada com sucesso!')
    } catch (err) {
      console.error('Erro ao desconectar Mercado Pago:', err)
      setError('Erro ao desconectar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='services-page'>

      <div className='services-header'>
        <div>
          <h2>💳 Mercado Pago</h2>
          <p>Pagamentos PIX automáticos com confirmação instantânea</p>
        </div>
      </div>

      <div className='services-grid'>

        {isLoading ? (
          <div className='service-card'>
            <p>Carregando...</p>
          </div>
        ) : error ? (
          <div className='service-card'>
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        ) : mercadoPagoData?.connected ? (
          // CONECTADO
          <div className='service-card' style={{
            background: 'linear-gradient(145deg, rgba(34,197,94,0.1), rgba(16,185,129,0.1))',
            border: '1px solid rgba(34,197,94,0.3)'
          }}>
            <div className='service-top'>
              <div className='service-icon' style={{ fontSize: '48px' }}>
                ✅
              </div>
            </div>

            <h3>Conta Conectada</h3>

            <p>
              <strong>User ID:</strong> {mercadoPagoData.userId}
            </p>

            <p>
              <strong>Conectado em:</strong> {new Date(mercadoPagoData.connectedAt).toLocaleString('pt-BR')}
            </p>

            <p>
              <strong>Token expira em:</strong> {new Date(mercadoPagoData.expiresAt).toLocaleString('pt-BR')}
            </p>

            <button
              onClick={handleDisconnect}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Desconectar Conta
            </button>
          </div>
        ) : (
          // NÃO CONECTADO
          <div className='service-card'>
            <div className='service-top'>
              <div className='service-icon'>
                💳
              </div>
            </div>

            <h3>Conectar Mercado Pago</h3>

            <p>
              Conecte sua conta Mercado Pago para aceitar pagamentos PIX automáticos com confirmação instantânea.
            </p>

            <ul style={{ textAlign: 'left', marginTop: '16px', paddingLeft: '20px', color: '#94a3b8' }}>
              <li>Pagamentos PIX automáticos</li>
              <li>Confirmação instantânea via webhook</li>
              <li>QR Code gerado automaticamente</li>
              <li>Integração com WhatsApp</li>
            </ul>

            <button
              onClick={handleConnect}
              style={{
                marginTop: '20px',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                width: '100%',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10
              }}
            >
              Conectar minha conta Mercado Pago
            </button>
          </div>
        )}

      </div>

    </div>
  )
}
