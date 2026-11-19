import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import '../styles/painelEmpresas/pdv-terminal.css'
import PDV from './panel/PDV'

export default function PDVTerminal() {
  const navigate = useNavigate()
  const { companyId } = useParams()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const pdvUser = localStorage.getItem('pdvUser')
    const pdvToken = localStorage.getItem('pdvToken')

    if (!pdvUser || !pdvToken) {
      navigate(`/pdv/${companyId}`)
      return
    }

    setUser(JSON.parse(pdvUser))
  }, [companyId, navigate])

  function handleLogout() {
    localStorage.removeItem('pdvToken')
    localStorage.removeItem('pdvUser')
    localStorage.removeItem('pdvCompanyId')
    navigate(`/pdv/${companyId}`)
  }

  if (!user) {
    return <div className='pdv-loading'>Carregando...</div>
  }

  // Se for caixa, renderiza o PDV original
  if (user.role === 'caixa') {
    // Usar companyId do localStorage (salvo no login)
    const pdvCompanyId = localStorage.getItem('pdvCompanyId') || companyId
    return <PDV companyId={pdvCompanyId} />
  }

  // Se for gerente ou admin, mostra o placeholder
  return (
    <div className='pdv-terminal'>
      <div className='pdv-terminal-header'>
        <div className='pdv-terminal-logo'>
          💳
        </div>
        <div className='pdv-terminal-info'>
          <h1>PDV - Ponto de Venda</h1>
          <p>Logado como: <strong>{user.name}</strong> ({user.role})</p>
        </div>
        <button className='logout-button' onClick={handleLogout}>
          🚪 Sair
        </button>
      </div>

      <div className='pdv-terminal-content'>
        <div className='pdv-welcome'>
          <h2>🎉 Bem-vindo ao Sistema PDV!</h2>
          <p>Terminal pronto para operações de vendas.</p>
          <div className='pdv-features'>
            <div className='feature-card'>
              <span className='feature-icon'>📦</span>
              <h3>Catálogo</h3>
              <p>Gerencie produtos e preços</p>
            </div>
            <div className='feature-card'>
              <span className='feature-icon'>💳</span>
              <h3>Pagamentos</h3>
              <p>Processamento de vendas</p>
            </div>
            <div className='feature-card'>
              <span className='feature-icon'>📊</span>
              <h3>Relatórios</h3>
              <p>Vendas e faturamento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
