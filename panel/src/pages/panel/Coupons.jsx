import { useState, useEffect } from 'react'
import api from '../../services/api'

import '../../styles/painelEmpresas/coupons.css'

export default function Coupons() {
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState([])
  
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    minOrder: '',
    description: '',
    maxUses: '',
    expiresAt: ''
  })

  useEffect(() => {
    const cid = localStorage.getItem('companyId')
    setCompanyId(cid)
    if (cid) {
      loadCoupons(cid)
    }
  }, [])

  async function loadCoupons(cid) {
    try {
      const response = await api.get(`/api/orders/coupons/${cid}`)
      if (response.data.success) {
        setCoupons(response.data.coupons || [])
      }
    } catch (err) {
      console.error('Erro ao carregar cupons:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createCoupon() {
    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: Number(formData.value),
        minOrder: formData.minOrder ? Number(formData.minOrder) : 0,
        description: formData.description,
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        expiresAt: formData.expiresAt || null
      }

      await api.post(`/api/orders/coupons/${companyId}`, couponData)
      alert('Cupom criado com sucesso!')
      setShowForm(false)
      resetForm()
      loadCoupons(companyId)
    } catch (err) {
      console.error('Erro ao criar cupom:', err)
      alert('Erro ao criar cupom')
    }
  }

  async function deleteCoupon(couponId) {
    if (!confirm('Tem certeza que deseja remover este cupom?')) return
    
    try {
      await api.delete(`/api/orders/coupons/${companyId}/${couponId}`)
      alert('Cupom removido com sucesso!')
      loadCoupons(companyId)
    } catch (err) {
      console.error('Erro ao remover cupom:', err)
      alert('Erro ao remover cupom')
    }
  }

  function resetForm() {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      minOrder: '',
      description: '',
      maxUses: '',
      expiresAt: ''
    })
    setEditingCoupon(null)
  }

  function getTypeLabel(type) {
    switch (type) {
      case 'percentage': return 'Desconto Percentual'
      case 'fixed': return 'Desconto Fixo'
      case 'free_shipping': return 'Frete Grátis'
      default: return type
    }
  }

  function getTypeValue(coupon) {
    switch (coupon.type) {
      case 'percentage': return `${coupon.value}%`
      case 'fixed': return `R$ ${coupon.value.toFixed(2)}`
      case 'free_shipping': return 'Frete Grátis'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className='coupons-loading'>
        <div className='loading-spinner'></div>
        <p>Carregando cupons...</p>
      </div>
    )
  }

  return (
    <div className='coupons-page'>
      <div className='coupons-header'>
        <h2>🎟️ Gerenciar Cupons</h2>
        <p>Crie e gerencie cupons de desconto para seus clientes</p>
      </div>

      <div className='coupons-content'>
        {/* ADD BUTTON */}
        <button 
          className='coupons-add-btn'
          onClick={() => {
            setShowForm(true)
            resetForm()
          }}
        >
          <span>+</span> Novo Cupom
        </button>

        {/* COUPONS LIST */}
        <div className='coupons-list'>
          {coupons.length === 0 ? (
            <div className='coupons-empty'>
              <i className='fas fa-ticket-alt'></i>
              <p>Nenhum cupom criado ainda</p>
              <p>Clique em "Novo Cupom" para começar</p>
            </div>
          ) : (
            coupons.map(coupon => (
              <div key={coupon.id} className='coupon-card'>
                <div className='coupon-card-header'>
                  <div className='coupon-card-code'>{coupon.code}</div>
                  <div className='coupon-card-type'>{getTypeLabel(coupon.type)}</div>
                </div>
                <div className='coupon-card-value'>
                  {getTypeValue(coupon)}
                </div>
                {coupon.description && (
                  <div className='coupon-card-description'>{coupon.description}</div>
                )}
                <div className='coupon-card-info'>
                  {coupon.minOrder > 0 && (
                    <span>Pedido mínimo: R$ {coupon.minOrder.toFixed(2)}</span>
                  )}
                  {coupon.maxUses && (
                    <span>Usos: {coupon.currentUses || 0} / {coupon.maxUses}</span>
                  )}
                  {coupon.expiresAt && (
                    <span>Expira: {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
                <div className='coupon-card-actions'>
                  <button 
                    className='coupon-delete-btn'
                    onClick={() => deleteCoupon(coupon.id)}
                  >
                    🗑️ Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE FORM MODAL */}
      {showForm && (
        <div className='coupons-modal-overlay' onClick={() => setShowForm(false)}>
          <div className='coupons-modal' onClick={e => e.stopPropagation()}>
            <div className='coupons-modal-header'>
              <h3>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h3>
              <button 
                className='coupons-modal-close'
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <div className='coupons-modal-body'>
              <div className='form-group'>
                <label>Código do Cupom *</label>
                <input
                  type='text'
                  placeholder='Ex: OFERTA2026'
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={20}
                />
              </div>

              <div className='form-group'>
                <label>Tipo de Desconto *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value='percentage'>Desconto Percentual (%)</option>
                  <option value='fixed'>Desconto Fixo (R$)</option>
                  <option value='free_shipping'>Frete Grátis</option>
                </select>
              </div>

              {formData.type !== 'free_shipping' && (
                <div className='form-group'>
                  <label>Valor do Desconto *</label>
                  <input
                    type='number'
                    placeholder={formData.type === 'percentage' ? 'Ex: 10' : 'Ex: 5.00'}
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    min='0'
                    step={formData.type === 'percentage' ? '1' : '0.01'}
                  />
                </div>
              )}

              <div className='form-group'>
                <label>Pedido Mínimo (opcional)</label>
                <input
                  type='number'
                  placeholder='Ex: 50.00'
                  value={formData.minOrder}
                  onChange={e => setFormData({ ...formData, minOrder: e.target.value })}
                  min='0'
                  step='0.01'
                />
              </div>

              <div className='form-group'>
                <label>Descrição (opcional)</label>
                <input
                  type='text'
                  placeholder='Ex: Cupom para clientes novos'
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className='form-group'>
                <label>Máximo de Usos (opcional)</label>
                <input
                  type='number'
                  placeholder='Ex: 100'
                  value={formData.maxUses}
                  onChange={e => setFormData({ ...formData, maxUses: e.target.value })}
                  min='1'
                />
              </div>

              <div className='form-group'>
                <label>Data de Expiração (opcional)</label>
                <input
                  type='date'
                  value={formData.expiresAt}
                  onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className='coupons-modal-footer'>
              <button 
                className='coupons-modal-cancel'
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
              <button 
                className='coupons-modal-submit'
                onClick={createCoupon}
                disabled={!formData.code || (formData.type !== 'free_shipping' && !formData.value)}
              >
                Criar Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
