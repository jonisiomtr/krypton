import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function PaymentModal({ isOpen, onClose, module, companyId }) {
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('pending') // pending, waiting, approved, failed
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutos em segundos

  // Gerar pagamento quando modal abre
  useEffect(() => {
    if (isOpen && module && companyId) {
      generatePayment()
    }
  }, [isOpen, module, companyId])

  // Timer de contagem regressiva
  useEffect(() => {
    if (status === 'waiting' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [status, timeLeft])

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (status === 'waiting' && paymentData?.paymentId) {
      const interval = setInterval(checkPaymentStatus, 3000) // Verifica a cada 3 segundos
      return () => clearInterval(interval)
    }
  }, [status, paymentData])

  async function generatePayment() {
    try {
      setLoading(true)
      setError(null)
      setStatus('pending')

      const token = localStorage.getItem('token')

      const response = await api.post(
        '/payments/ceo/create',
        {
          tenantId: companyId,
          amount: module.price,
          description: `Módulo ${module.label} - KRYPTON SaaS`,
          moduleName: module.key
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setPaymentData(response.data)
      setStatus('waiting')
      setTimeLeft(900) // Reinicia timer
      console.log('📊 Payment data recebido:', response.data)
      console.log('📊 QR Code URL:', response.data.qrCodeUrl ? 'Presente (length: ' + response.data.qrCodeUrl.length + ')' : 'Ausente')
      console.log('📊 PIX Code:', response.data.pixCode ? 'Presente (length: ' + response.data.pixCode.length + ')' : 'Ausente')

    } catch (err) {
      console.error('Erro ao gerar pagamento:', err)
      setError('Erro ao gerar pagamento. Tente novamente.')
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  async function checkPaymentStatus() {
    try {
      const token = localStorage.getItem('token')

      const response = await api.get(
        `/payments/ceo/status/${paymentData.paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      console.log('📊 Status do pagamento:', response.data.status)

      // Considera "approved" ou "processed" como pagamento confirmado
      if (response.data.status === 'approved' || response.data.status === 'processed') {
        setStatus('approved')
        console.log('✅ Pagamento aprovado/processed! Recarregando página...')
        // Fecha modal após 2 segundos
        setTimeout(() => {
          onClose()
          window.location.reload() // Recarrega para mostrar módulo ativo
        }, 2000)
      }

    } catch (err) {
      // Ignora erros silenciosamente durante o polling
      // Não afeta o funcionamento, apenas evita poluir o console
    }
  }

  async function approvePaymentManually() {
    try {
      const token = localStorage.getItem('token')

      const response = await api.post(
        `/payments/ceo/approve/${paymentData.paymentId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        setStatus('approved')
        // Fecha modal após 2 segundos
        setTimeout(() => {
          onClose()
          window.location.reload() // Recarrega para mostrar módulo ativo
        }, 2000)
      }

    } catch (err) {
      console.error('Erro ao aprovar pagamento:', err)
      alert('Erro ao aprovar pagamento manualmente')
    }
  }

  function copyPixCode() {
    if (paymentData?.pixCode) {
      navigator.clipboard.writeText(paymentData.pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <button className="payment-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="payment-modal-header">
          <h2>💳 Pagamento PIX</h2>
          <p className="payment-modal-subtitle">
            {module?.label} - R$ {module?.price?.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {loading && (
          <div className="payment-modal-loading">
            <div className="payment-spinner"></div>
            <p>Gerando QR Code...</p>
          </div>
        )}

        {error && (
          <div className="payment-modal-error">
            <p>❌ {error}</p>
            <button onClick={generatePayment} className="payment-retry-button">
              Tentar novamente
            </button>
          </div>
        )}

        {status === 'approved' && (
          <div className="payment-modal-success">
            <div className="payment-success-icon">✅</div>
            <h3>Pagamento Confirmado!</h3>
            <p>O módulo foi ativado com sucesso.</p>
            <p>Recarregando...</p>
          </div>
        )}

        {status === 'waiting' && paymentData && (
          <div className="payment-modal-content">
            <div className="payment-timer">
              ⏱️ Expira em: <span className="timer-value">{formatTime(timeLeft)}</span>
            </div>

            <div className="payment-qr-section">
              <div className="payment-qr-label">Escaneie o QR Code</div>
              {paymentData.qrCodeUrl ? (
                <img
                  src={paymentData.qrCodeUrl.startsWith('data:') ? paymentData.qrCodeUrl : `data:image/png;base64,${paymentData.qrCodeUrl}`}
                  alt="QR Code PIX"
                  className="payment-qr-image"
                />
              ) : (
                <div className="payment-qr-placeholder">
                  <div className="payment-spinner"></div>
                </div>
              )}
            </div>

            <div className="payment-pix-code-section">
              <div className="payment-pix-label">Ou copie o código PIX</div>
              <div className="payment-pix-code">
                <input
                  type="text"
                  value={paymentData.pixCode}
                  readOnly
                  className="payment-pix-input"
                />
                <button
                  onClick={copyPixCode}
                  className="payment-copy-button"
                >
                  {copied ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>

            <div className="payment-status">
              <div className="payment-status-dot"></div>
              <p>Aguardando pagamento...</p>
              <p className="payment-status-sub">
                O sistema verificará automaticamente quando o pagamento for confirmado.
              </p>
            </div>

            <button onClick={checkPaymentStatus} className="payment-check-button">
              🔄 Verificar Pagamento
            </button>

            {paymentData?.paymentId?.startsWith('sim_') && (
              <button onClick={approvePaymentManually} className="payment-approve-button">
                ✅ Aprovar Manualmente (Teste)
              </button>
            )}
          </div>
        )}

        <style jsx>{`
          .payment-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(4px);
          }

          .payment-modal {
            background: white;
            border-radius: 20px;
            padding: 32px;
            max-width: 480px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .payment-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 36px;
            height: 36px;
            border: none;
            background: #f1f5f9;
            border-radius: 50%;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .payment-modal-close:hover {
            background: #e2e8f0;
          }

          .payment-modal-header {
            text-align: center;
            margin-bottom: 24px;
          }

          .payment-modal-header h2 {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
          }

          .payment-modal-subtitle {
            color: #64748b;
            font-size: 16px;
          }

          .payment-modal-loading {
            text-align: center;
            padding: 40px;
          }

          .payment-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .payment-modal-error {
            text-align: center;
            padding: 40px;
            color: #ef4444;
          }

          .payment-retry-button {
            margin-top: 16px;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }

          .payment-modal-success {
            text-align: center;
            padding: 40px;
          }

          .payment-success-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }

          .payment-modal-success h3 {
            font-size: 24px;
            font-weight: 700;
            color: #10b981;
            margin-bottom: 8px;
          }

          .payment-modal-success p {
            color: #64748b;
            margin-bottom: 8px;
          }

          .payment-modal-content {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .payment-timer {
            text-align: center;
            padding: 12px;
            background: #fef3c7;
            border-radius: 8px;
            color: #92400e;
            font-size: 14px;
            font-weight: 600;
          }

          .timer-value {
            font-weight: 700;
            font-size: 16px;
          }

          .payment-qr-section {
            text-align: center;
          }

          .payment-qr-label {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 12px;
          }

          .payment-qr-image {
            width: 240px;
            height: 240px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 8px;
            background: white;
          }

          .payment-qr-placeholder {
            width: 240px;
            height: 240px;
            border: 2px dashed #e2e8f0;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
          }

          .payment-pix-code-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .payment-pix-label {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
          }

          .payment-pix-code {
            display: flex;
            gap: 8px;
          }

          .payment-pix-input {
            flex: 1;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 12px;
            font-family: monospace;
            background: #f8fafc;
            color: #475569;
          }

          .payment-copy-button {
            padding: 12px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }

          .payment-copy-button:hover {
            background: #2563eb;
          }

          .payment-status {
            text-align: center;
            padding: 16px;
            background: #f1f5f9;
            border-radius: 8px;
          }

          .payment-status-dot {
            width: 12px;
            height: 12px;
            background: #fbbf24;
            border-radius: 50%;
            margin: 0 auto 8px;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          .payment-status p {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 4px;
          }

          .payment-status-sub {
            font-size: 12px;
            color: #94a3b8;
          }

          .payment-check-button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .payment-check-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
          }

          .payment-approve-button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
          }

          .payment-approve-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
          }
        `}</style>
      </div>
    </div>
  )
}
