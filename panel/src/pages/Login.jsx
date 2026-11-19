import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import '../styles/login.css'

export default function Login() {
  const navigate = useNavigate()
  
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [registerStep, setRegisterStep] = useState(1) // 1: dados, 2: OTP
  const [forgotStep, setForgotStep] = useState(1) // 1: identificação, 2: OTP, 3: nova senha
  
  // Login states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Register states
  const [regUsername, setRegUsername] = useState('')
  const [regCompanyName, setRegCompanyName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('559191873356')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [otpTimer, setOtpTimer] = useState(15 * 60) // 15 minutos
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [otpMethod, setOtpMethod] = useState('whatsapp') // 'email' ou 'whatsapp' (padrão: whatsapp)
  
  // Forgot password states
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotOtpCode, setForgotOtpCode] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [forgotOtpTimer, setForgotOtpTimer] = useState(15 * 60)
  const [forgotCanResend, setForgotCanResend] = useState(false)
  const [forgotResendTimer, setForgotResendTimer] = useState(60)
  const [forgotMethod, setForgotMethod] = useState('whatsapp')
  
  // Debounce para verificar username
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (regUsername.length >= 3) {
        setUsernameChecking(true)
        try {
          const response = await api.get(`/auth/check-username/${regUsername}`)
          setUsernameAvailable(response.data.available)
        } catch (error) {
          setUsernameAvailable(null)
        }
        setUsernameChecking(false)
      } else {
        setUsernameAvailable(null)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [regUsername])
  
  // Timer do OTP
  useEffect(() => {
    if (registerStep === 2 && otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [registerStep, otpTimer])
  
  // Timer para reenviar
  useEffect(() => {
    if (!canResend && resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else if (resendTimer === 0) {
      setCanResend(true)
    }
  }, [canResend, resendTimer])
  
  // Forgot password OTP timer
  useEffect(() => {
    if (forgotStep === 2 && forgotOtpTimer > 0) {
      const timer = setInterval(() => {
        setForgotOtpTimer(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [forgotStep, forgotOtpTimer])
  
  // Forgot password resend timer
  useEffect(() => {
    if (!forgotCanResend && forgotResendTimer > 0) {
      const timer = setInterval(() => {
        setForgotResendTimer(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else if (forgotResendTimer === 0) {
      setForgotCanResend(true)
    }
  }, [forgotCanResend, forgotResendTimer])
  
  async function login(e) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.post('/auth/login', {
        username,
        password
      })

      localStorage.setItem('token', response.data.token)
      setSuccess('Login realizado com sucesso 🚀')

      const payload = JSON.parse(atob(response.data.token.split('.')[1]))

      setLoading(false)

      setTimeout(() => {
        if (payload.type === 'admin') {
          navigate('/dashboard')
        } else {
          localStorage.setItem('companyId', payload.companyId)
          navigate('/company-panel')
        }
      }, 700)

    } catch {
      setError('Usuário ou senha inválidos')
      setLoading(false)
    }
  }
  
  async function requestOTP(e) {
    e.preventDefault()
    
    if (usernameAvailable === false) {
      setError('Nome de usuário já está em uso')
      return
    }
    
    if (regPassword !== regConfirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    
    if (regPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    
    if (otpMethod === 'whatsapp' && !regPhone) {
      setError('Número de WhatsApp é obrigatório')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/register/request', {
        username: regUsername,
        companyName: regCompanyName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        method: otpMethod
      })

      const methodText = otpMethod === 'whatsapp' ? 'WhatsApp' : 'e-mail'
      setSuccess(`Código enviado para o ${methodText}! ${otpMethod === 'whatsapp' ? '�' : '�📧'}`)
      setRegisterStep(2)
      setOtpTimer(15 * 60)
      setCanResend(false)
      setResendTimer(60)

      // Log do OTP para desenvolvimento
      console.log(`📧 Código OTP (${otpMethod}):`, response.data.code || 'Verifique o console do backend')

      setLoading(false)

    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao enviar código')
      setLoading(false)
    }
  }
  
  async function verifyOTP(e) {
    e.preventDefault()
    
    if (otpCode.length !== 6) {
      setError('Digite o código de 6 dígitos')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await api.post('/auth/register/verify', {
        email: regEmail,
        code: otpCode
      })
      
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('companyId', regUsername)
      
      setSuccess('Conta criada com sucesso! 🎉')
      
      setLoading(false)
      
      setTimeout(() => {
        navigate('/company-panel')
      }, 700)
      
    } catch (error) {
      setError(error.response?.data?.error || 'Código inválido ou expirado')
      setLoading(false)
    }
  }
  
  async function resendOTP() {
    setLoading(true)
    setError('')

    try {
      await api.post('/auth/register/request', {
        username: regUsername,
        companyName: regCompanyName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        method: otpMethod
      })

      const methodText = otpMethod === 'whatsapp' ? 'WhatsApp' : 'e-mail'
      setSuccess(`Código reenviado para o ${methodText}! ${otpMethod === 'whatsapp' ? '�' : '�📧'}`)
      setOtpTimer(15 * 60)
      setCanResend(false)
      setResendTimer(60)

      setLoading(false)

    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao reenviar código')
      setLoading(false)
    }
  }
  
  // Funções de Esqueci a Senha
  async function requestForgotPasswordOTP(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!forgotIdentifier) {
      setError('Digite seu usuario ou numero de WhatsApp')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await api.post('/auth/forgot-password/request', {
        identifier: forgotIdentifier,
        method: forgotMethod
      })
      
      console.log('Resposta do backend:', response.data)
      
      if (response.data.success) {
        setForgotMethod(response.data.method || 'whatsapp')
        setSuccess(response.data.message || 'Código enviado com sucesso!')
        setForgotStep(2)
        setForgotOtpTimer(15 * 60)
        setForgotCanResend(false)
        setForgotResendTimer(60)
        
        console.log('📧 Codigo de recuperacao:', response.data.code || 'Verifique o console do backend')
      } else {
        setError(response.data.error || 'Erro ao enviar código')
      }
    } catch (err) {
      console.log('Erro ao enviar codigo:', err.response?.data || err)
      setError(err.response?.data?.error || 'Erro ao enviar codigo')
    } finally {
      setLoading(false)
    }
  }
  
  async function verifyForgotPasswordOTP(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!forgotOtpCode || forgotOtpCode.length !== 6) {
      setError('Digite o codigo de 6 digitos')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await api.post('/auth/forgot-password/verify', {
        identifier: forgotIdentifier,
        code: forgotOtpCode
      })
      
      setSuccess('Codigo verificado! Agora defina sua nova senha')
      setForgotStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Codigo invalido ou expirado')
    } finally {
      setLoading(false)
    }
  }
  
  async function resetPassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!forgotNewPassword || !forgotConfirmPassword) {
      setError('Preencha ambos os campos de senha')
      return
    }
    
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('As senhas nao coincidem')
      return
    }
    
    if (forgotNewPassword.length < 6) {
      setError('A senha deve ter no minimo 6 caracteres')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await api.post('/auth/forgot-password/reset', {
        identifier: forgotIdentifier,
        code: forgotOtpCode,
        newPassword: forgotNewPassword
      })
      
      setSuccess('Senha alterada com sucesso! Faça login com sua nova senha')
      
      // Voltar para o login após 2 segundos
      setTimeout(() => {
        setIsForgotPasswordMode(false)
        setForgotStep(1)
        setForgotIdentifier('')
        setForgotOtpCode('')
        setForgotNewPassword('')
        setForgotConfirmPassword('')
        setError('')
        setSuccess('')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }
  
  async function resendForgotPasswordOTP() {
    setError('')
    setSuccess('')
    setForgotCanResend(false)
    setForgotResendTimer(60)
    
    try {
      const response = await api.post('/auth/forgot-password/request', {
        identifier: forgotIdentifier
      })
      
      setForgotMethod(response.data.method || 'whatsapp')
      setSuccess(`Codigo reenviado para ${forgotMethod === 'whatsapp' ? 'WhatsApp' : 'e-mail'}! 📱`)
      setForgotOtpTimer(15 * 60)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao reenviar codigo')
    }
  }
  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  if (isRegisterMode) {
    return (
      <div className='container'>
        <div className='bg1'></div>
        <div className='bg2'></div>
        
        <form className='login-card' onSubmit={registerStep === 1 ? requestOTP : verifyOTP}>
          <div className='logo-wrapper'>
            <div className='orbit-ring'></div>
            <div className='orbit-ring-2'></div>
            <img src='/logo.png' alt='KRYPTON Logo' className='login-logo' />
          </div>

          <div className='title-area'>
            <h1 className='title'>
              <span>CRIAR CONTA</span>
            </h1>
          </div>
          
          {error && (
            <div className='login-error'>
              ⚠️ {error}
            </div>
          )}
          
          {success && (
            <div className='login-success'>
              ✅ {success}
            </div>
          )}
          
          {registerStep === 1 ? (
            <>
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  NOME DE USUÁRIO
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type='text'
                    placeholder='     Digite seu nome de usuário'
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    style={{
                      borderColor: usernameAvailable === false ? '#ef4444' : usernameAvailable === true ? '#22c55e' : ''
                    }}
                  />
                </div>
                {usernameChecking && <span style={{ fontSize: '12px', color: '#666' }}>Verificando...</span>}
                {usernameAvailable === false && (
                  <span style={{ fontSize: '12px', color: '#ef4444' }}>
                    Este nome de usuário já está em uso
                  </span>
                )}
                {usernameAvailable === true && (
                  <span style={{ fontSize: '12px', color: '#22c55e' }}>
                    Nome de usuário disponível ✅
                  </span>
                )}
              </div>
              
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  NOME DA EMPRESA
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <input
                    type='text'
                    placeholder='     Nome da sua empresa'
                    value={regCompanyName}
                    onChange={e => setRegCompanyName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  E-MAIL
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <input
                    type='email'
                    placeholder='     seu@email.com'
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  WHATSAPP
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <input
                    type='text'
                    placeholder='     559191873356'
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 14))}
                    maxLength={14}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '0' }}>
                  Formato: 55 + DDD + número (ex: 559191873356)
                </p>
              </div>
              
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  SENHA
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type='password'
                    placeholder='     Mínimo 6 caracteres'
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  CONFIRMAR SENHA
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type='password'
                    placeholder='     Repita a senha'
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <button
                className='login-button'
                type='submit'
                disabled={loading || usernameAvailable === false}
              >
                {loading ? 'Enviando...' : 'Enviar Código'}
              </button>
            </>
          ) : (
            <>
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                  </svg>
                  CÓDIGO DE VERIFICAÇÃO
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                  </svg>
                  <input
                    type='text'
                    placeholder='Digite o código de 6 dígitos'
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                  />
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                  O código expira em {formatTime(otpTimer)}
                </p>

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    Método de envio (padrão: WhatsApp):
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type='button'
                      onClick={() => setOtpMethod('email')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: otpMethod === 'email' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                        backgroundColor: otpMethod === 'email' ? '#3b82f6' : 'white',
                        color: otpMethod === 'email' ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      E-mail
                    </button>
                    <button
                      type='button'
                      onClick={() => setOtpMethod('whatsapp')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: otpMethod === 'whatsapp' ? '2px solid #22c55e' : '1px solid #d1d5db',
                        backgroundColor: otpMethod === 'whatsapp' ? '#22c55e' : 'white',
                        color: otpMethod === 'whatsapp' ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                className='login-button'
                type='submit'
                disabled={loading}
              >
                {loading ? 'Verificando...' : 'Verificar e Criar Conta'}
              </button>
              
              {canResend ? (
                <button
                  type='button'
                  className='login-button'
                  style={{ backgroundColor: '#3b82f6', marginTop: '10px' }}
                  onClick={resendOTP}
                  disabled={loading}
                >
                  Reenviar Código
                </button>
              ) : (
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  Reenviar em {resendTimer}s
                </p>
              )}
            </>
          )}
          
          <div className='footer-text'>
            <span>
              Já tem conta?{' '}
              <button
                type='button'
                onClick={() => {
                  setIsRegisterMode(false)
                  setRegisterStep(1)
                  setError('')
                  setSuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Fazer Login
              </button>
            </span>
          </div>
        </form>
      </div>
    )
  }
  
  // Formulário de Esqueci a Senha
  if (isForgotPasswordMode) {
    return (
      <div className='container'>
        <div className='bg1'></div>
        <div className='bg2'></div>
        
        <form className='login-card' onSubmit={forgotStep === 1 ? requestForgotPasswordOTP : forgotStep === 2 ? verifyForgotPasswordOTP : resetPassword}>
          <div className='logo-wrapper'>
            <div className='orbit-ring'></div>
            <div className='orbit-ring-2'></div>
            <img src='/logo.png' alt='KRYPTON Logo' className='login-logo' />
          </div>

          <div className='title-area'>
            <h1 className='title'>
              <span>RECOBE</span>
              <span>SENHA</span>
            </h1>
            <p className='subtitle'>
              {forgotStep === 1 ? 'Digite seu usuario ou WhatsApp' : forgotStep === 2 ? 'Digite o codigo recebido' : 'Defina sua nova senha'}
            </p>
          </div>
          
          {error && (
            <div className='login-error'>
              ⚠️ {error}
            </div>
          )}
          
          {success && (
            <div className='login-success'>
              ✅ {success}
            </div>
          )}
          
          {forgotStep === 1 ? (
            <>
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  USUARIO OU WHATSAPP
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type='text'
                    placeholder='Digite seu usuario ou WhatsApp'
                    value={forgotIdentifier}
                    onChange={e => setForgotIdentifier(e.target.value)}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '0' }}>
                  Exemplo: seu_usuario ou 559191873356
                </p>
              </div>
              
              <div className='method-selector'>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  Método de envio (padrão: WhatsApp):
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type='button'
                    onClick={() => setForgotMethod('whatsapp')}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: forgotMethod === 'whatsapp' ? '2px solid #22c55e' : '1px solid #e5e7eb',
                      backgroundColor: forgotMethod === 'whatsapp' ? '#22c55e' : '#fff',
                      color: forgotMethod === 'whatsapp' ? '#fff' : '#374151',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: forgotMethod === 'whatsapp' ? '600' : '400'
                    }}
                  >
                    WhatsApp
                  </button>
                  <button
                    type='button'
                    onClick={() => setForgotMethod('email')}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: forgotMethod === 'email' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      backgroundColor: forgotMethod === 'email' ? '#3b82f6' : '#fff',
                      color: forgotMethod === 'email' ? '#fff' : '#374151',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: forgotMethod === 'email' ? '600' : '400'
                    }}
                  >
                    E-mail
                  </button>
                </div>
              </div>
              
              <button
                className='login-button'
                type='submit'
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Código'}
              </button>
            </>
          ) : forgotStep === 2 ? (
            <>
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                  </svg>
                  CÓDIGO DE VERIFICAÇÃO
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                  </svg>
                  <input
                    type='text'
                    placeholder='Digite o codigo de 6 digitos'
                    value={forgotOtpCode}
                    onChange={e => setForgotOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                  />
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                  O código expira em {formatTime(forgotOtpTimer)}
                </p>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Enviado via {forgotMethod === 'whatsapp' ? 'WhatsApp' : 'e-mail'}
                </p>
              </div>
              
              <button
                className='login-button'
                type='submit'
                disabled={loading}
              >
                {loading ? 'Verificando...' : 'Verificar Código'}
              </button>
              
              {forgotCanResend ? (
                <button
                  type='button'
                  className='login-button'
                  style={{ backgroundColor: '#3b82f6', marginTop: '10px' }}
                  onClick={resendForgotPasswordOTP}
                  disabled={loading}
                >
                  Reenviar Código
                </button>
              ) : (
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                  Reenviar em {forgotResendTimer}s
                </p>
              )}
            </>
          ) : (
            <>
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  NOVA SENHA
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type='password'
                    placeholder='Digite sua nova senha'
                    value={forgotNewPassword}
                    onChange={e => setForgotNewPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className='input-group'>
                <label className='input-label'>
                  <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  CONFIRMAR NOVA SENHA
                </label>
                <div className='input-wrapper'>
                  <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type='password'
                    placeholder='Repita a nova senha'
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <button
                className='login-button'
                type='submit'
                disabled={loading}
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </>
          )}
          
          <div className='footer-text'>
            <button
              type='button'
              onClick={() => {
                setIsForgotPasswordMode(false)
                setForgotStep(1)
                setForgotIdentifier('')
                setForgotOtpCode('')
                setForgotNewPassword('')
                setForgotConfirmPassword('')
                setError('')
                setSuccess('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Voltar ao Login
            </button>
          </div>
        </form>
      </div>
    )
  }
  
  return (
    <div className='container'>
      <div className='bg1'></div>
      <div className='bg2'></div>
      
      <form className='login-card' onSubmit={login}>
        <div className='logo-wrapper'>
          <div className='orbit-ring'></div>
          <div className='orbit-ring-2'></div>
          <img src='/logo.png' alt='KRYPTON Logo' className='login-logo' />
        </div>

        <div className='title-area'>
          <h1 className='title'>
            <span>K</span>
            <span>RYPTON</span>
          </h1>
          <p className='subtitle'>
            SISTEMA INTELIGENTE PARA O SEU NEGÓCIO
          </p>
        </div>
        
        {error && (
          <div className='login-error'>
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div className='login-success'>
            ✅ {success}
          </div>
        )}
        
        <div className='input-group'>
          <label className='input-label'>
            <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            USUÁRIO
          </label>
          <div className='input-wrapper'>
            <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input
              type='text'
              placeholder='     Digite seu usuário'
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
        </div>
        
        <div className='input-group'>
          <label className='input-label'>
            <svg className='label-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            SENHA
          </label>
          <div className='input-wrapper'>
            <svg className='input-icon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              type='password'
              placeholder='     Digite sua senha'
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>
        
        <button
          className='login-button'
          type='submit'
          disabled={loading}
        >
          {loading ? 'Entrando...' : (
            <>
              Entrar
              <span className='button-arrow'>→</span>
            </>
          )}
        </button>
        
        <div className='footer-text'>
          <span>
            Não tem uma conta?{' '}
            <button
              type='button'
              onClick={() => setIsRegisterMode(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Criar Conta
            </button>
          </span>
        </div>
        
        <div className='footer-text' style={{ marginTop: '10px' }}>
          <button
            type='button'
            onClick={() => {
              setIsForgotPasswordMode(true)
              setForgotStep(1)
              setForgotIdentifier('')
              setForgotOtpCode('')
              setForgotNewPassword('')
              setForgotConfirmPassword('')
              setError('')
              setSuccess('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '13px'
            }}
          >
            Esqueci minha senha
          </button>
        </div>
        
        <div className='footer-text' style={{ marginTop: '5px' }}>
          <span>KRYPTON</span>
          <span>TECNOLOGIA QUE IMPULSIONA</span>
        </div>
      </form>
    </div>
  )
}
