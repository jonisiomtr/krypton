import { useState, useEffect } from 'react'
import api from '../../services/api'

import '../../styles/painelEmpresas/website.css'

export default function Website() {
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    storeName: '',
    tagline: '',
    description: '',
    address: '',
    logo: '',
    bannerImage: '',
    primaryColor: '#FF8000',
    hasDelivery: true,
    deliveryTime: '50 a 60 min',
    deliveryFeeMin: 6,
    deliveryFeeMax: 15,
    pickupTime: '30 min',
    whatsapp: '',
    rating: '0,0',
    minimumOrder: 10,
    email: '',
    phone: '',
    hours: {
      domingo: { open: null, close: null },
      segunda: { open: '09:00', close: '22:00' },
      terca: { open: '09:00', close: '22:00' },
      quarta: { open: '09:00', close: '22:00' },
      quinta: { open: '09:00', close: '22:00' },
      sexta: { open: '09:00', close: '22:00' },
      sabado: { open: '09:00', close: '20:00' }
    }
  })

  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    const cid = localStorage.getItem('companyId')
    console.log('CompanyId from localStorage:', cid)
    setCompanyId(cid)
    
    // Set preview URL imediatamente para não ter href vazio
    if (cid) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4177'
      const baseUrl = apiBaseUrl.startsWith('http') ? apiBaseUrl : window.location.origin
      const url = `${baseUrl}/site/${cid}`
      console.log('Preview URL set immediately:', url)
      setPreviewUrl(url)
    }
    
    loadConfig(cid)
  }, [])

  async function loadConfig(cid) {
    console.log('loadConfig called with companyId:', cid)
    try {
      const response = await api.get('/api/site/config/me')
      if (response.data) {
        setConfig({
          ...config,
          ...response.data,
          hours: response.data.hours || config.hours
        })
      }
      // Usa a mesma lógica do OnlineBooking
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4177'
      const baseUrl = apiBaseUrl.startsWith('http') ? apiBaseUrl : window.location.origin
      const url = `${baseUrl}/site/${cid}`
      console.log('Preview URL set to:', url)
      setPreviewUrl(url)
    } catch (err) {
      console.log('Erro ao carregar configuração:', err)
      // Não mostra alert se não tiver config ainda (primeiro acesso)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig() {
    try {
      setSaving(true)
      await api.post('/api/site/config/me', config)
      alert('Configurações salvas com sucesso!')
    } catch (err) {
      console.log('Erro ao salvar:', err)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await api.post('/api/upload', formData)
      setConfig({ ...config, logo: response.data.url })
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload da logo')
    }
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await api.post('/api/upload', formData)
      setConfig({ ...config, bannerImage: response.data.url })
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload da capa')
    }
  }

  if (loading) {
    return (
      <div className='website-loading'>
        <div className='loading-spinner'></div>
        <p>Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className='website-page'>
      <div className='website-header'>
        <h2>🌐 Configurações do Site</h2>
        <p>Personalize o site da sua empresa</p>
      </div>

      {/* STATUS CARD */}
      <div className='status-card'>
        <div className='status-indicator active'>
          <span className='status-dot'></span>
          <span className='status-text'>Site Ativo</span>
        </div>
        <div className='status-info'>
          <span className='status-label'>Link do site:</span>
          <span className='status-value'>{previewUrl}</span>
        </div>
      </div>

      {/* PREVIEW BUTTON */}
      <div className='preview-section'>
        <a href={previewUrl} target='_blank' className='preview-button'>
          👁️ Ver Site Preview
        </a>
        <span className='preview-url'>{previewUrl}</span>
      </div>

      {/* INFORMAÇÕES BÁSICAS */}
      <div className='config-section'>
        <h3>
          <span className='section-icon'>�</span>
          Informações Básicas
        </h3>
        <div className='form-group'>
          <label>Nome da Loja</label>
          <input
            type='text'
            value={config.storeName}
            onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
            placeholder='Nome da sua loja'
          />
        </div>
        <div className='form-group'>
          <label>Tagline</label>
          <input
            type='text'
            value={config.tagline}
            onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
            placeholder='Ex: Peixaria · Delivery'
          />
        </div>
        <div className='form-group'>
          <label>Descrição</label>
          <textarea
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder='Descrição da loja que aparecerá no site'
            rows={3}
          />
        </div>
        <div className='form-group'>
          <label>Endereço</label>
          <input
            type="text"
            value={config.address}
            onChange={(e) => setConfig({ ...config, address: e.target.value })}
            placeholder='Ex: Rua das Flores, 123 - Centro'
          />
        </div>
        <div className='form-group' style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="checkbox"
            id="hasDelivery"
            checked={config.hasDelivery}
            onChange={(e) => setConfig({ ...config, hasDelivery: e.target.checked })}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <label htmlFor="hasDelivery" style={{ cursor: 'pointer', margin: 0, fontWeight: '500' }}>
            Faz entrega?
          </label>
        </div>
        <div className='form-group'>
          <label>Logo</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {config.logo && (
              <img src={config.logo} alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
            )}
            <label style={{ padding: '12px 24px', background: '#FF8000', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
              📷 Alterar Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
        <div className='form-group'>
          <label>Imagem de Capa (Banner)</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {config.bannerImage && (
              <img src={config.bannerImage} alt="Capa" style={{ width: '200px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
            )}
            <label style={{ padding: '12px 24px', background: '#FF8000', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
              📷 Alterar Capa
              <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* CORES */}
      <div className='config-section'>
        <h3>
          <span className='section-icon'>🎨</span>
          Cores e Estilo
        </h3>
        <div className='form-group'>
          <label>Cor Principal</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type='color'
              value={config.primaryColor}
              onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
              style={{ width: '60px', height: '40px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <input
              type='text'
              value={config.primaryColor}
              onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
              style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
          </div>
        </div>
        <div style={{ padding: '16px', background: config.primaryColor, borderRadius: '8px', color: 'white', textAlign: 'center', fontWeight: '600' }}>
          Preview da cor principal
        </div>
      </div>

      {/* ENTREGA */}
      <div className='config-section'>
        <h3>
          <span className='section-icon'>🚚</span>
          Entrega
        </h3>
        <div className='form-group'>
          <label>Tempo de Delivery</label>
          <input
            type='text'
            value={config.deliveryTime}
            onChange={(e) => setConfig({ ...config, deliveryTime: e.target.value })}
            placeholder='Ex: 50 a 60 min'
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className='form-group'>
            <label>Taxa Mínima (R$)</label>
            <input
              type='number'
              value={config.deliveryFeeMin}
              onChange={(e) => setConfig({ ...config, deliveryFeeMin: Number(e.target.value) })}
            />
          </div>
          <div className='form-group'>
            <label>Taxa Máxima (R$)</label>
            <input
              type='number'
              value={config.deliveryFeeMax}
              onChange={(e) => setConfig({ ...config, deliveryFeeMax: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className='form-group'>
          <label>Tempo de Retirada</label>
          <input
            type='text'
            value={config.pickupTime}
            onChange={(e) => setConfig({ ...config, pickupTime: e.target.value })}
            placeholder='Ex: 30 min'
          />
        </div>
        <div className='form-group'>
          <label>Pedido Mínimo (R$)</label>
          <input
            type='number'
            value={config.minimumOrder}
            onChange={(e) => setConfig({ ...config, minimumOrder: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* CONTATO */}
      <div className='config-section'>
        <h3>
          <span className='section-icon'>📱</span>
          Contato
        </h3>
        <div className='form-group'>
          <label>WhatsApp</label>
          <input
            type='text'
            value={config.whatsapp}
            onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
            placeholder='Ex: (11) 99999-0000'
          />
        </div>
        <div className='form-group'>
          <label>Email</label>
          <input
            type='email'
            value={config.email}
            onChange={(e) => setConfig({ ...config, email: e.target.value })}
            placeholder='Ex: contato@loja.com'
          />
        </div>
        <div className='form-group'>
          <label>Telefone</label>
          <input
            type='tel'
            value={config.phone}
            onChange={(e) => setConfig({ ...config, phone: e.target.value })}
            placeholder='Ex: (11) 99999-0000'
          />
        </div>
      </div>

      {/* HORÁRIOS DE FUNCIONAMENTO */}
      <div className='config-section'>
        <h3>
          <span className='section-icon'>🕐</span>
          Horários de Funcionamento
        </h3>
        <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
          Configure os horários de abertura e fechamento para cada dia da semana.
          Deixe em branco para indicar que a loja está fechada.
        </p>
        {Object.entries(config.hours || {}).map(([day, times]) => (
          <div key={day} style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontWeight: '600', textTransform: 'capitalize' }}>{day}</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  type='checkbox'
                  checked={times.open !== null && times.close !== null}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setConfig({
                        ...config,
                        hours: {
                          ...config.hours,
                          [day]: { open: '09:00', close: '22:00' }
                        }
                      })
                    } else {
                      setConfig({
                        ...config,
                        hours: {
                          ...config.hours,
                          [day]: { open: null, close: null }
                        }
                      })
                    }
                  }}
                />
                Aberto
              </label>
            </div>
            {times.open !== null && times.close !== null && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#64748b' }}>Abertura</label>
                  <input
                    type='time'
                    value={times.open || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      hours: {
                        ...config.hours,
                        [day]: { ...times, open: e.target.value }
                      }
                    })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: '#64748b' }}>Fechamento</label>
                  <input
                    type='time'
                    value={times.close || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      hours: {
                        ...config.hours,
                        [day]: { ...times, close: e.target.value }
                      }
                    })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SAVE BUTTON */}
      <div className='save-section'>
        <button
          className='save-button'
          onClick={saveConfig}
          disabled={saving}
        >
          {saving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
