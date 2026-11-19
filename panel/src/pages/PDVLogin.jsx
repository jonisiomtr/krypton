import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../../styles/painelEmpresas/pdv-login.css'

export default function PDVLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const companyId = localStorage.getItem('companyId')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${window.location.origin}/api/pdv/${companyId}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('pdvToken', data.token)
        localStorage.setItem('pdvUser', JSON.stringify(data.user))
        navigate(`/pdv/${companyId}/terminal`)
      } else {
        setError(data.message || 'Usuário ou senha inválidos')
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='pdv-login-container'>
      <div className='pdv-login-card'>
        <div className='pdv-login-header'>
          <div className='pdv-logo'>
            💳
          </div>
          <h1>PDV - Ponto de Venda</h1>
          <p>Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleLogin} className='pdv-login-form'>
          {error && (
            <div className='pdv-error'>
              ⚠️ {error}
            </div>
          )}

          <div className='form-group'>
            <label>Usuário</label>
            <input
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder='Digite seu usuário'
              required
            />
          </div>

          <div className='form-group'>
            <label>Senha</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Digite sua senha'
              required
            />
          </div>

          <button type='submit' className='login-button' disabled={loading}>
            {loading ? 'Entrando...' : '🔐 Entrar'}
          </button>
        </form>

        <div className='pdv-login-footer'>
          <p>Entre com suas credenciais fornecidas pela empresa</p>
        </div>
      </div>
    </div>
  )
}
