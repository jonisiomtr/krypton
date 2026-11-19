import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'
import '../../styles/company-orders.css'

export default function Appointments({ companyId, onNotification, onPendingCountChange }) {

  const [appointments, setAppointments] = useState([])
  const [selectedQrCode, setSelectedQrCode] = useState(null)

  const previousCount = useRef(0)

  const audio = useRef(
    new Audio('/sounds/notification.mp3')
  )

  useEffect(() => {
    if (companyId) {
      loadAppointments()
    }
  }, [companyId])

  async function loadAppointments() {
    try {
      const token = localStorage.getItem('token')

      console.log('🔍 Carregando agendamentos para companyId:', companyId)

      const response = await api.get(
        `/appointments/listar/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      console.log('📦 Resposta da API:', response.data)

      const data =
        response.data?.appointments ||
        response.data ||
        []

      const newAppointments = Array.isArray(data) ? data : []

      console.log('✅ Agendamentos carregados:', newAppointments.length)

      // Atualizar contador de pendentes
      const pendingCount = newAppointments.filter(a => a.status === 'pending').length
      if (onPendingCountChange) {
        onPendingCountChange(pendingCount)
      }

      // Som de novo agendamento
      if (
        previousCount.current > 0 &&
        newAppointments.length > previousCount.current
      ) {
        audio.current.play().catch(err => {
          console.log('Som bloqueado:', err)
        })
        
        // Notificação de novo agendamento
        if (onNotification) {
          const newAppointment = newAppointments[newAppointments.length - 1]
          onNotification('appointment', '📅 Novo Agendamento', `${newAppointment.service?.name || 'Serviço'} de ${newAppointment.customer?.name || 'Cliente'} às ${newAppointment.time}`)
        }
      }

      previousCount.current = newAppointments.length
      setAppointments(newAppointments)

    } catch (err) {
      console.log(err)
      setAppointments([])
    }
  }

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (companyId) {
        loadAppointments()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [companyId])

  async function updateAppointmentStatus(appointmentId, status) {
    try {
      const token = localStorage.getItem('token')

      await api.put(
        `/appointments/${companyId}/${appointmentId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      await loadAppointments()

    } catch (err) {
      console.log(err)
    }
  }

  async function deleteAppointment(appointmentId) {
    if (!confirm('Tem certeza que deseja remover este agendamento?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')

      await api.delete(
        `/appointments/${companyId}/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      await loadAppointments()

    } catch (err) {
      console.log(err)
      alert('Erro ao remover agendamento. Tente novamente.')
    }
  }

  return (

    <div className='services-page'>

      <div className='services-header'>

        <div>
          <h2>📅 Agendamentos</h2>

          <p>
            {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>

      </div>

      <div className='services-grid'>

        {appointments.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <p>Nenhum agendamento ainda</p>
          </div>
        ) : (
          appointments.map(appointment => {
            const serviceName = appointment.serviceName || appointment.service?.name || 'Serviço';
            const customerName = appointment.customerName || appointment.customer?.name || 'N/A';
            const serviceCategory = appointment.service?.category || appointment.category || 'N/A';
            const customerPhone = appointment.customerWhatsApp || appointment.customer?.phone || appointment.customer?.whatsapp || 'N/A';
            const professionalName = appointment.professionalName || appointment.professional?.name || null;
            const servicePrice = appointment.servicePrice || appointment.service?.price || appointment.price || 0;

            return (
              <div
                className='order-card'
                key={appointment.id}
                style={{
                  background: appointment.status === 'confirmed'
                    ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))'
                    : appointment.status === 'pending'
                    ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.1), rgba(180, 83, 9, 0.05))'
                    : appointment.status === 'cancelled'
                    ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))'
                    : 'linear-gradient(145deg, rgba(139, 92, 246, 0.1), rgba(109, 40, 217, 0.05))',
                  borderColor: appointment.status === 'confirmed'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : appointment.status === 'pending'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : appointment.status === 'cancelled'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(139, 92, 246, 0.3)'
                }}
              >
                <div className='order-top'>
                  <div className='order-user'>
                    <div className='order-avatar' style={{
                      background: appointment.status === 'confirmed'
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : appointment.status === 'pending'
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : appointment.status === 'cancelled'
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                    }}>
                      📅
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                        {serviceCategory}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#000000', margin: 0 }}>
                        {serviceName}
                      </p>
                      <br></br>
                      <p style={{ fontSize: '13px', color: '#000000', margin: 0 }}>
                        Cliente:
                      </p>
                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                        {customerName}
                      </p>
                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                        {customerPhone}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: appointment.status === 'confirmed'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : appointment.status === 'pending'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : appointment.status === 'cancelled'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(139, 92, 246, 0.2)',
                    color: appointment.status === 'confirmed'
                      ? '#10b981'
                      : appointment.status === 'pending'
                      ? '#f59e0b'
                      : appointment.status === 'cancelled'
                      ? '#ef4444'
                      : '#8b5cf6',
                    border: appointment.status === 'confirmed'
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : appointment.status === 'pending'
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : appointment.status === 'cancelled'
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : '1px solid rgba(139, 92, 246, 0.4)'
                  }}>
                    {appointment.status === 'confirmed' ? '✓ Confirmado' :
                     appointment.status === 'pending' ? '⏳ Pendente' :
                     appointment.status === 'cancelled' ? 'Cancelado' :
                     appointment.status === 'completed' ? '✓ Concluído' : appointment.status}
                  </div>
                  {(appointment.status === 'completed' || appointment.status === 'cancelled') && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteAppointment(appointment.id)
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 10,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '2px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.2)'
                        e.target.style.borderColor = '#ef4444'
                        e.target.style.transform = 'scale(1.1)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.1)'
                        e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                        e.target.style.transform = 'scale(1)'
                      }}
                      title="Remover agendamento"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📅</span>
                    <span style={{ color: '#000000', fontSize: '14px', fontWeight: '500' }}>
                      {appointment.date}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⏰</span>
                    <span style={{ color: '#181818', fontSize: '14px', fontWeight: '500' }}>
                      {appointment.time}
                    </span>
                  </div>
                  {professionalName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>👤</span>
                      <span style={{ color: '#000000', fontSize: '14px', fontWeight: '500' }}>
                        {professionalName}
                      </span>
                    </div>
                  )}
                  {servicePrice > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>💰</span>
                      <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '700' }}>
                        R$ {parseFloat(servicePrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                {appointment.status === 'pending' && (
                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateAppointmentStatus(appointment.id, 'confirmed')
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      ✓ Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateAppointmentStatus(appointment.id, 'cancelled')
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: 'white',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                )}
                {appointment.status === 'confirmed' && (
                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        updateAppointmentStatus(appointment.id, 'completed')
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'black',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      ✓ Concluir
                    </button>
                  </div>
                )}
                {appointment.status === 'pending_payment' && appointment.paymentMethod === 'mercadopago' && (
                  <div style={{ marginTop: '16px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedQrCode(appointment.qrCodeUrl)
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        color: 'white',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      📱 Ver QR Code PIX
                    </button>
                    {appointment.pixCode && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all', textAlign: 'center' }}>
                        {appointment.pixCode.substring(0, 30)}...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

      </div>

      {/* MODAL QR CODE */}
      {selectedQrCode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setSelectedQrCode(null)}
        >
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '16px',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedQrCode(null)}
              style={{
                alignSelf: 'flex-end',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              ✖
            </button>
            <img
              src={selectedQrCode}
              alt="QR Code PIX"
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
            />
          </div>
        </div>
      )}

    </div>

  )

}
