import { useState, useEffect } from 'react';
import api from '../../services/api';

function WebsiteConfig() {
  const [config, setConfig] = useState({
    storeName: '',
    tagline: '',
    description: '',
    logo: '',
    primaryColor: '#FF8000',
    deliveryTime: '50 a 60 min',
    deliveryFeeMin: 6,
    deliveryFeeMax: 15,
    pickupTime: '30 min',
    whatsapp: '',
    rating: '0,0',
    minimumOrder: 10,
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/api/site/config/me');
      if (response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/site/config/me', config);
      alert('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/api/upload', formData);
      setConfig({ ...config, logo: response.data.url });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da logo');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '32px' }}>
        Configuração do Site
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Informações Básicas */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Informações Básicas</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nome da Loja</label>
            <input
              type="text"
              value={config.storeName}
              onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tagline</label>
            <input
              type="text"
              value={config.tagline}
              onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              placeholder="Ex: Peixaria · Delivery"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Descrição</label>
            <textarea
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '100px' }}
              placeholder="Descrição da loja que aparecerá no site"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Logo</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {config.logo && (
                <img src={config.logo} alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px' }} />
              )}
              <label style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                📷 Alterar Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        {/* Cores e Estilo */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Cores e Estilo</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Cor Principal</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                style={{ width: '60px', height: '40px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <input
                type="text"
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

        {/* Entrega */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Entrega</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tempo de Delivery</label>
            <input
              type="text"
              value={config.deliveryTime}
              onChange={(e) => setConfig({ ...config, deliveryTime: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              placeholder="Ex: 50 a 60 min"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Taxa Mínima (R$)</label>
              <input
                type="number"
                value={config.deliveryFeeMin}
                onChange={(e) => setConfig({ ...config, deliveryFeeMin: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Taxa Máxima (R$)</label>
              <input
                type="number"
                value={config.deliveryFeeMax}
                onChange={(e) => setConfig({ ...config, deliveryFeeMax: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tempo de Retirada</label>
            <input
              type="text"
              value={config.pickupTime}
              onChange={(e) => setConfig({ ...config, pickupTime: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              placeholder="Ex: 30 min"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Pedido Mínimo (R$)</label>
            <input
              type="number"
              value={config.minimumOrder}
              onChange={(e) => setConfig({ ...config, minimumOrder: Number(e.target.value) })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
          </div>
        </div>

        {/* Contato */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Contato</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>WhatsApp</label>
            <input
              type="text"
              value={config.whatsapp}
              onChange={(e) => setConfig({ ...config, whatsapp: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              placeholder="Ex: (11) 99999-0000"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              placeholder="Ex: contato@loja.com"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Telefone</label>
            <input
              type="tel"
              value={config.phone}
              onChange={(e) => setConfig({ ...config, phone: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              placeholder="Ex: (11) 99999-0000"
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 32px',
            background: saving ? '#94a3b8' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}

export default WebsiteConfig;
