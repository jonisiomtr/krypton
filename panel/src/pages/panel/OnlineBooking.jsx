import { useState, useEffect } from 'react'
import api from '../../services/api'

import '../../styles/painelEmpresas/webagendamento.css'
import '../../styles/botao-upload-image.css'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4177'

export default function OnlineBooking() {
  const companyId = localStorage.getItem('companyId')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('config')

  const [config, setConfig] = useState({
    enabled: true,
    theme: 'modern',
    hero: {
      title: '',
      subtitle: '',
      imageUrl: '',
      showLogo: true
    },
    colors: {
      primary: '#e0a96d',
      secondary: '#c59257',
      accent: '#c59257',
      background: '#121212',
      text: '#e0a96d'
    },
    features: {
      showPrices: true,
      showProfessionals: true,
      showWhatsAppButton: true,
      whatsappNumber: '',
      requirePayment: false,
      requireDeposit: false,
      depositAmount: 0
    },
    social: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: ''
    },
    businessHours: {
      enableForAllDays: true,
      hours: {
        0: { enabled: false, open: '09:00', close: '18:00' },
        1: { enabled: true, open: '09:00', close: '18:00' },
        2: { enabled: true, open: '09:00', close: '18:00' },
        3: { enabled: true, open: '09:00', close: '18:00' },
        4: { enabled: true, open: '09:00', close: '18:00' },
        5: { enabled: true, open: '09:00', close: '18:00' },
        6: { enabled: true, open: '09:00', close: '14:00' }
      }
    },
    notifications: {
      confirmation: true,
      reminder24h: true,
      reminder2h: true
    }
  })

  const [services, setServices] = useState([])
  const [professionals, setProfessionals] = useState([])

  const [previewUrl, setPreviewUrl] = useState('')

  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '60',
    description: '',
    category: '',
    imageUrl: ''
  })

  const [editingService, setEditingService] = useState(null)

  const [newProfessional, setNewProfessional] = useState({
    name: '',
    phone: '',
    email: '',
    photo: ''
  })

  useEffect(() => {
    loadConfig()
    loadServices()
    loadProfessionals()
  }, [])

  async function loadConfig() {
    try {
      const response = await api.get(`/api/webagendamento/${companyId}`)
      const loadedConfig = response.data

      // Garantir que a estrutura do hero esteja completa
      if (!loadedConfig.hero) {
        loadedConfig.hero = {
          title: '',
          subtitle: '',
          imageUrl: '',
          showLogo: true
        }
      } else if (!loadedConfig.hero.imageUrl) {
        loadedConfig.hero.imageUrl = ''
      }

      // Garantir que a estrutura de colors esteja completa
      if (!loadedConfig.colors) {
        loadedConfig.colors = {
          primary: '#e0a96d',
          secondary: '#c59257',
          accent: '#c59257',
          background: '#121212',
          text: '#e0a96d'
        }
      }

      // Garantir que a estrutura de features esteja completa
      if (!loadedConfig.features) {
        loadedConfig.features = {
          showPrices: true,
          showProfessionals: true,
          showWhatsAppButton: true,
          whatsappNumber: '',
          requirePayment: false,
          requireDeposit: false,
          depositAmount: 0
        }
      }

      // Garantir que a estrutura de social esteja completa
      if (!loadedConfig.social) {
        loadedConfig.social = {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        }
      }

      // Garantir que a estrutura de businessHours esteja completa
      if (!loadedConfig.businessHours) {
        loadedConfig.businessHours = {
          enableForAllDays: true,
          hours: {
            0: { enabled: false, open: '09:00', close: '18:00' },
            1: { enabled: true, open: '09:00', close: '18:00' },
            2: { enabled: true, open: '09:00', close: '18:00' },
            3: { enabled: true, open: '09:00', close: '18:00' },
            4: { enabled: true, open: '09:00', close: '18:00' },
            5: { enabled: true, open: '09:00', close: '18:00' },
            6: { enabled: true, open: '09:00', close: '14:00' }
          }
        }
      }

      // Garantir que a estrutura de notifications esteja completa
      if (!loadedConfig.notifications) {
        loadedConfig.notifications = {
          confirmation: true,
          reminder24h: true,
          reminder2h: true
        }
      }

      setConfig(loadedConfig)
      setPreviewUrl(`${API_BASE_URL}/booking/${companyId}`)
    } catch (err) {
      console.log('Erro ao carregar configuração:', err)
      alert('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  async function loadServices() {
    try {
      const response = await api.get(`/api/webagendamento/${companyId}/services`)
      setServices(response.data)
    } catch (err) {
      console.log('Erro ao carregar serviços:', err)
    }
  }

  async function loadProfessionals() {
    try {
      const response = await api.get(`/api/webagendamento/${companyId}/professionals`)
      setProfessionals(response.data)
    } catch (err) {
      console.log('Erro ao carregar profissionais:', err)
    }
  }

  async function saveConfig() {
    try {
      setSaving(true)
      await api.put(`/api/webagendamento/${companyId}`, config)
      alert('Configurações salvas com sucesso!')
    } catch (err) {
      console.log('Erro ao salvar:', err)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  async function addService() {
    try {
      if (editingService) {
        // Editar serviço existente
        await api.put(`/api/webagendamento/${companyId}/services/${editingService.id}`, newService)
        setEditingService(null)
        alert('Serviço atualizado com sucesso!')
      } else {
        // Adicionar novo serviço
        await api.post(`/api/webagendamento/${companyId}/services`, newService)
        alert('Serviço adicionado com sucesso!')
      }
      await loadServices()
      setNewService({
        name: '',
        price: '',
        duration: '60',
        description: '',
        category: '',
        imageUrl: ''
      })
    } catch (err) {
      console.log('Erro ao salvar serviço:', err)
      alert('Erro ao salvar serviço')
    }
  }

  // UPLOAD IMAGE
  async function uploadServiceImage(event) {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setNewService({
        ...newService,
        imageUrl: data.url
      })
    } catch (err) {
      console.log('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload da imagem')
    }
  }

  async function uploadProfessionalPhoto(event) {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setNewProfessional({
        ...newProfessional,
        photo: data.url
      })
    } catch (err) {
      console.log('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload da foto')
    }
  }

  async function uploadHeroImage(event) {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setConfig({
        ...config,
        hero: {
          ...config.hero,
          imageUrl: data.url
        }
      })
    } catch (err) {
      console.log('Erro ao fazer upload:', err)
      alert('Erro ao fazer upload da imagem')
    }
  }

  function editService(service) {
    setNewService({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || '',
      category: service.category || '',
      imageUrl: service.imageUrl || ''
    })
    setEditingService(service)
    // Scroll para o topo para mostrar os campos de edição
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setNewService({
      name: '',
      price: '',
      duration: '60',
      description: '',
      category: '',
      imageUrl: ''
    })
    setEditingService(null)
  }

  async function removeService(id) {
    try {
      await api.delete(`/api/webagendamento/${companyId}/services/${id}`)
      await loadServices()
    } catch (err) {
      console.log('Erro ao remover serviço:', err)
      alert('Erro ao remover serviço')
    }
  }

  async function addProfessional() {
    try {
      await api.post(`/api/webagendamento/${companyId}/professionals`, newProfessional)
      await loadProfessionals()
      setNewProfessional({
        name: '',
        phone: '',
        email: '',
        photo: ''
      })
      alert('Profissional adicionado com sucesso!')
    } catch (err) {
      console.log('Erro ao adicionar profissional:', err)
      alert('Erro ao adicionar profissional')
    }
  }

  async function removeProfessional(id) {
    try {
      await api.delete(`/api/webagendamento/${companyId}/professionals/${id}`)
      await loadProfessionals()
    } catch (err) {
      console.log('Erro ao remover profissional:', err)
      alert('Erro ao remover profissional')
    }
  }

  function handleChange(section, field, value) {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  function handleNestedChange(section, field, value) {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  function handleBusinessHoursChange(day, field, value) {
    setConfig(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        hours: {
          ...prev.businessHours.hours,
          [day]: {
            ...prev.businessHours.hours[day],
            [field]: value
          }
        }
      }
    }))
  }

  function downloadBackup() {
    const backup = {
      webagendamentoServices: services,
      config: config,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-webagendamento-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function restoreBackup(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result)

        // Restaurar serviços
        if (backup.webagendamentoServices) {
          setServices(backup.webagendamentoServices)
        }

        // Restaurar configuração
        if (backup.config) {
          setConfig(backup.config)
        }

        alert('Backup restaurado com sucesso! Salve as alterações.')
      } catch (err) {
        console.log(err)
        alert('Erro ao restaurar backup')
      }
    }
    reader.readAsText(file)
  }

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  if (loading) {
    return (
      <div className='online-booking-loading'>
        <div className='loading-spinner'></div>
        <p>Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className='online-booking-page'>
      <div className='online-booking-header'>
        <h2>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Agendamento Online
        </h2>
        <p>Configure o sistema de agendamento online</p>
      </div>

      {/* STATUS CARD */}
      <div className='status-card'>
        <div className={`status-indicator ${config.enabled ? 'active' : 'inactive'}`}>
          <span className='status-dot'></span>
          <span className='status-text'>{config.enabled ? 'Sistema Ativo' : 'Sistema Inativo'}</span>
        </div>
        <div className='status-info'>
          <span className='status-label'>Link de agendamento:</span>
          <span className='status-value'>{previewUrl}</span>
        </div>
      </div>

      {/* PREVIEW BUTTON */}
      <div className='preview-section'>
        <a href={previewUrl} target='_blank' className='preview-button'>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Ver Página de Agendamento
        </a>
      </div>

      {/* TABS */}
      <div className='tabs-container'>
        <button
          className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2h.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Configurações
        </button>
        <button
          className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Serviços
        </button>
        <button
          className={`tab-button ${activeTab === 'professionals' ? 'active' : ''}`}
          onClick={() => setActiveTab('professionals')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Profissionais
        </button>
        <button
          className={`tab-button ${activeTab === 'hours' ? 'active' : ''}`}
          onClick={() => setActiveTab('hours')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Horários
        </button>
      </div>

      {/* CONFIG TAB */}
      {activeTab === 'config' && (
        <div className='tab-content'>
          {/* HERO */}
          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4"></circle>
                  <line x1="21.17" y1="8" x2="12" y2="8"></line>
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
                </svg>
              </span>
              Seção Principal
            </h3>
            <div className='form-group'>
              <label>Imagem do Logo (Opcional)</label>
              <label htmlFor="heroImageUpload" className='gallery-btn'>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Adicionar imagem
              </label>
              <input
                id="heroImageUpload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={uploadHeroImage}
              />
              {config.hero.imageUrl && (
                <img
                  src={config.hero.imageUrl}
                  alt="preview"
                  style={{
                    width: '150px',
                    borderRadius: '12px',
                    marginTop: '10px'
                  }}
                />
              )}
              <input
                type='text'
                value={config.hero.imageUrl || ''}
                onChange={(e) => handleNestedChange('hero', 'imageUrl', e.target.value)}
                placeholder='Ou cole o link da imagem'
                style={{ marginTop: '10px' }}
              />
              <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                A imagem aparecerá como logo circular no topo do site de agendamento
              </small>
            </div>
            <div className='form-group'>
              <label>Título Principal</label>
              <input
                type='text'
                value={config.hero.title}
                onChange={(e) => handleNestedChange('hero', 'title', e.target.value)}
                placeholder='Título que aparece no topo'
              />
            </div>
            <div className='form-group'>
              <label>Subtítulo</label>
              <input
                type='text'
                value={config.hero.subtitle}
                onChange={(e) => handleNestedChange('hero', 'subtitle', e.target.value)}
                placeholder='Subtítulo abaixo do título'
              />
            </div>
          </div>

          {/* COLORS */}
          <div className='config-section'>
            <h3>
              <span className='section-icon'>🎨</span>
              Cores
            </h3>
            <div className='color-grid'>
              <div className='color-input'>
                <label>Primária (Header, Botões, Avatares)</label>
                <input
                  type='color'
                  value={config.colors.primary}
                  onChange={(e) => handleNestedChange('colors', 'primary', e.target.value)}
                />
              </div>
              <div className='color-input'>
                <label>Secundária (Gradiente, Step Ativo)</label>
                <input
                  type='color'
                  value={config.colors.secondary}
                  onChange={(e) => handleNestedChange('colors', 'secondary', e.target.value)}
                />
              </div>
              <div className='color-input'>
                <label>Bordas e Detalhes</label>
                <input
                  type='color'
                  value={config.colors.accent}
                  onChange={(e) => handleNestedChange('colors', 'accent', e.target.value)}
                />
              </div>
              <div className='color-input'>
                <label>Fundo da Página</label>
                <input
                  type='color'
                  value={config.colors.background}
                  onChange={(e) => handleNestedChange('colors', 'background', e.target.value)}
                />
              </div>
              <div className='color-input'>
                <label>Cor do Texto Principal</label>
                <input
                  type='color'
                  value={config.colors.text}
                  onChange={(e) => handleNestedChange('colors', 'text', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* FEATURES */}
          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2h.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
              Funcionalidades
            </h3>
            <div className='form-group checkbox'>
              <label>
                <input
                  type='checkbox'
                  checked={config.features.showPrices}
                  onChange={(e) => handleNestedChange('features', 'showPrices', e.target.checked)}
                />
                Mostrar preços dos serviços
              </label>
            </div>
            <div className='form-group checkbox'>
              <label>
                <input
                  type='checkbox'
                  checked={config.features.showProfessionals}
                  onChange={(e) => handleNestedChange('features', 'showProfessionals', e.target.checked)}
                />
                Mostrar profissionais
              </label>
            </div>
            <div className='form-group checkbox'>
              <label>
                <input
                  type='checkbox'
                  checked={config.features.showWhatsAppButton}
                  onChange={(e) => handleNestedChange('features', 'showWhatsAppButton', e.target.checked)}
                />
                Mostrar botão de WhatsApp
              </label>
            </div>
            <div className='form-group'>
              <label>Número do WhatsApp</label>
              <input
                type='text'
                value={config.features.whatsappNumber}
                onChange={(e) => handleNestedChange('features', 'whatsappNumber', e.target.value)}
                placeholder='91991873356'
              />
            </div>
          </div>

          {/* SOCIAL */}
          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </span>
              Redes Sociais
            </h3>
            <div className='form-group'>
              <label>Instagram</label>
              <input
                type='text'
                value={config.social.instagram}
                onChange={(e) => handleNestedChange('social', 'instagram', e.target.value)}
                placeholder='https://instagram.com/suaempresa'
              />
            </div>
            <div className='form-group'>
              <label>Facebook</label>
              <input
                type='text'
                value={config.social.facebook}
                onChange={(e) => handleNestedChange('social', 'facebook', e.target.value)}
                placeholder='https://facebook.com/suaempresa'
              />
            </div>
          </div>

          <div className='save-section'>
            <button
              className='save-button'
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? 'Salvando...' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SERVICES TAB */}
      {activeTab === 'services' && (
        <div className='tab-content'>
          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </span>
              Adicionar Serviço
            </h3>
            <div className='form-grid'>
              <div className='form-group'>
                <label>Nome do Serviço</label>
                <input
                  type='text'
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder='Corte de cabelo'
                />
              </div>
              <div className='form-group'>
                <label>Preço (R$)</label>
                <input
                  type='number'
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  placeholder='50.00'
                />
              </div>
              <div className='form-group'>
                <label>Duração (minutos)</label>
                <input
                  type='number'
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                  placeholder='60'
                />
              </div>
              <div className='form-group'>
                <label>Categoria</label>
                <input
                  type='text'
                  list='category-options'
                  value={newService.category}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  placeholder='Selecione ou digite uma categoria'
                />
                <datalist id='category-options'>
                  <option value='Corte de cabelo' />
                  <option value='Pintura de cabelo' />
                  <option value='Rena' />
                  <option value='Selagem' />
                  <option value='Unha' />
                </datalist>
              </div>
              <div className='form-group'>
                <label>Imagem do Serviço (Opcional)</label>
                <input
                  id="serviceImageUpload"
                  type="file"
                  accept="image/*"
                  onChange={uploadServiceImage}
                  style={{ display: 'none' }}
                />
                <label htmlFor="serviceImageUpload" className="gallery-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  Adicionar imagem
                </label>
                {newService.imageUrl && (
                  <img
                    src={newService.imageUrl}
                    alt="preview"
                    style={{
                      width: '150px',
                      borderRadius: '12px',
                      marginTop: '10px'
                    }}
                  />
                )}
                <input
                  type='text'
                  value={newService.imageUrl}
                  onChange={(e) => setNewService({ ...newService, imageUrl: e.target.value })}
                  placeholder='Ou cole o link da imagem'
                  style={{ marginTop: '10px' }}
                />
              </div>
            </div>
            <div className='form-group'>
              <label>Descrição</label>
              <textarea
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                placeholder='Descrição do serviço'
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className='add-button' onClick={addService}>
                {editingService ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Adicionar Serviço
                  </>
                )}
              </button>
              {editingService && (
                <button
                  className='add-button'
                  onClick={cancelEdit}
                  style={{ background: '#6b7280' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </span>
              Backup dos Serviços
            </h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className='add-button' onClick={downloadBackup}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Baixar Backup
              </button>
              <label className='add-button' style={{ background: '#059669' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Restaurar Backup
                <input
                  type='file'
                  accept='.json'
                  onChange={restoreBackup}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div className='config-section'>
            <h3>
              <span className='section-icon'>�📋</span>
              Serviços Cadastrados
            </h3>
            <div className='items-grid'>
              {services.map(service => (
                <div className='item-card' key={service.id}>
                  <div className='item-header'>
                    {service.imageUrl ? (
                      <img 
                        src={service.imageUrl} 
                        alt={service.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginRight: '10px'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '700',
                          marginRight: '10px'
                        }}
                      >
                        {service.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h4>{service.name}</h4>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className='edit-btn'
                        onClick={() => editService(service)}
                        title='Editar serviço'
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className='remove-btn'
                        onClick={() => removeService(service.id)}
                        title='Excluir serviço'
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p>R$ {parseFloat(service.price).toFixed(2)}</p>
                  <p>{service.duration} min</p>
                  {service.category && <small>{service.category}</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONALS TAB */}
      {activeTab === 'professionals' && (
        <div className='tab-content'>
          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              Adicionar Profissional
            </h3>
            <div className='form-grid'>
              <div className='form-group'>
                <label>Nome</label>
                <input
                  type='text'
                  value={newProfessional.name}
                  onChange={(e) => setNewProfessional({ ...newProfessional, name: e.target.value })}
                  placeholder='Nome do profissional'
                />
              </div>
              <div className='form-group'>
                <label>Telefone</label>
                <input
                  type='text'
                  value={newProfessional.phone}
                  onChange={(e) => setNewProfessional({ ...newProfessional, phone: e.target.value })}
                  placeholder='91991873356'
                />
              </div>
              <div className='form-group'>
                <label>Email</label>
                <input
                  type='email'
                  value={newProfessional.email}
                  onChange={(e) => setNewProfessional({ ...newProfessional, email: e.target.value })}
                  placeholder='email@exemplo.com'
                />
              </div>
              <div className='form-group'>
                <label>Foto do Profissional (Opcional)</label>
                <input
                  id="professionalPhotoUpload"
                  type="file"
                  accept="image/*"
                  onChange={uploadProfessionalPhoto}
                  style={{ display: 'none' }}
                />
                <label htmlFor="professionalPhotoUpload" className="gallery-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  Adicionar foto
                </label>
                {newProfessional.photo && (
                  <img
                    src={newProfessional.photo}
                    alt="preview"
                    style={{
                      width: '150px',
                      borderRadius: '12px',
                      marginTop: '10px'
                    }}
                  />
                )}
                <input
                  type='text'
                  value={newProfessional.photo}
                  onChange={(e) => setNewProfessional({ ...newProfessional, photo: e.target.value })}
                  placeholder='Ou cole o link da foto'
                  style={{ marginTop: '10px' }}
                />
              </div>
            </div>
            <button className='add-button' onClick={addProfessional}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Adicionar Profissional
            </button>
          </div>

          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              Profissionais Cadastrados
            </h3>
            <div className='items-grid'>
              {professionals.map(professional => (
                <div className='item-card' key={professional.id}>
                  <div className='item-header'>
                    {professional.photo ? (
                      <img 
                        src={professional.photo} 
                        alt={professional.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginRight: '10px'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '18px',
                          fontWeight: '700',
                          marginRight: '10px'
                        }}
                      >
                        {professional.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h4>{professional.name}</h4>
                    <button
                      className='remove-btn'
                      onClick={() => removeProfessional(professional.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                  {professional.phone && (
                    <p>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      {professional.phone}
                    </p>
                  )}
                  {professional.email && (
                    <p>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      {professional.email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HOURS TAB */}
      {activeTab === 'hours' && (
        <div className='tab-content'>
          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </span>
              Horário de Funcionamento
            </h3>
            <div className='form-group checkbox'>
              <label style={{ color: '#1e293b', fontSize: '15px', fontWeight: '500' }}>
                <input
                  type='checkbox'
                  checked={config.businessHours.enableForAllDays}
                  onChange={(e) => handleChange('businessHours', 'enableForAllDays', e.target.checked)}
                />
                Usar mesmo horário para todos os dias
              </label>
            </div>
            <div className='form-group'>
              <small style={{ color: '#64748b', fontSize: '13px', background: 'rgba(102, 126, 234, 0.1)', padding: '10px 14px', borderRadius: '8px', display: 'inline-block' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px', verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                O intervalo entre horários é definido automaticamente pela duração de cada serviço.
              </small>
            </div>
          </div>

          <div className='config-section'>
            <h3>
              <span className='section-icon'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </span>
              Horários por Dia
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              Configure os horários de funcionamento para cada dia da semana. Os clientes só poderão agendar nos dias e horários habilitados.
            </p>
            {dayNames.map((dayName, index) => (
              <div className='day-hours-card' key={index}>
                <div className='day-header'>
                  <h4>{dayName}</h4>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      checked={config.businessHours.hours[index].enabled}
                      onChange={(e) => handleBusinessHoursChange(index, 'enabled', e.target.checked)}
                    />
                    <span className='slider'></span>
                  </label>
                </div>
                {config.businessHours.hours[index].enabled && (
                  <div className='hours-inputs'>
                    <div className='form-group'>
                      <label>Abertura</label>
                      <input
                        type='time'
                        value={config.businessHours.hours[index].open}
                        onChange={(e) => handleBusinessHoursChange(index, 'open', e.target.value)}
                      />
                    </div>
                    <div className='form-group'>
                      <label>Fechamento</label>
                      <input
                        type='time'
                        value={config.businessHours.hours[index].close}
                        onChange={(e) => handleBusinessHoursChange(index, 'close', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className='save-section'>
            <button
              className='save-button'
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? 'Salvando...' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Salvar Horários
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
