import '../styles/suspended-login.css'

export default function SuspendedLogin() {
  return (
    <div className='suspended-login-container'>
      <div className='orbit-container'>
        <div className='krypton-core'>K</div>
        <div className='orbit orbit-1'></div>
        <div className='orbit orbit-2'></div>
        <div className='orbit orbit-3'></div>
      </div>

      <div className='suspended-content'>
        <div className='suspended-icon'>
          <svg width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
            <circle cx='12' cy='12' r='10' />
            <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
          </svg>
        </div>

        <h1>Conta Suspensa</h1>

        <p className='suspended-message'>
          Sua conta foi suspensa temporariamente. Entre em contato com o suporte para mais informações.
        </p>

        <div className='suspended-details'>
          <div className='detail-item'>
            <span className='detail-label'>Motivo:</span>
            <span className='detail-value'>Período de teste expirado</span>
          </div>
          <div className='detail-item'>
            <span className='detail-label'>Desde:</span>
            <span className='detail-value'>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div className='suspended-actions'>
          <button className='contact-support'>
            Entrar em Contato
          </button>
          <button
            className='back-home'
            onClick={() => window.location.href = '/'}
          >
            Voltar ao Início
          </button>
        </div>

        <p className='support-info'>
          📧 suporte@krypton.com.br | 📱 (91) 99999-9999
        </p>
      </div>
    </div>
  )
}
