import { useEffect, useState, useRef } from 'react'
import api from '../../services/api'
import '../../styles/company-orders.css'

export default function Orders({ companyId, onNotification }) {

  console.log('🔥 ORDERS NOVO CARREGOU 1')

  const [orders, setOrders] = useState([])

  const previousCount = useRef(0)
  const audio = useRef(new Audio('/sounds/notification.mp3'))

  useEffect(() => {
    if (companyId) {
      loadOrders()
    }
  }, [companyId])

  async function loadOrders() {
    try {
      const token = localStorage.getItem('token')

      const response = await api.get(`/pedidos/listar/orders/${companyId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = response.data.orders || []
      const newOrders = Array.isArray(data) ? data : []

      // som de novo pedido
      if (
        previousCount.current > 0 &&
        newOrders.length > previousCount.current
      ) {
        audio.current.play().catch(err => {
          console.log('Som bloqueado:', err)
        })
        
        // Notificação de novo pedido
        if (onNotification) {
          const newOrder = newOrders[newOrders.length - 1]
          onNotification('order', 'Novo Pedido', `Pedido #${newOrder.id} de ${newOrder.customerName || 'Cliente'} - R$ ${(newOrder.total || 0).toFixed(2)}`)
        }
      }

      previousCount.current = newOrders.length
      setOrders(newOrders)

    } catch (err) {
      console.log(err)
      setOrders([])
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const token = localStorage.getItem('token')

      await api.put(
        `/pedidos/companies/orders/${companyId}/${orderId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      await loadOrders()

    } catch (err) {
      console.log(err)
    }
  }

  async function deleteOrder(orderId) {
    if (!window.confirm('Tem certeza que deseja remover este pedido? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')

      await api.delete(`/pedidos/companies/orders/${companyId}/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      await loadOrders()

    } catch (err) {
      console.log(err)
      alert('Erro ao remover pedido. Tente novamente.')
    }
  }

  function getCart(order) {
    // Para pedidos do site, usar 'items'
    if (order?.items) {
      return Array.isArray(order.items) ? order.items : []
    }

    // Para pedidos do bot, usar 'cart'
    if (!order?.cart) return []

    if (Array.isArray(order.cart)) return order.cart

    if (typeof order.cart === 'string') {
      try {
        return JSON.parse(order.cart)
      } catch {
        return []
      }
    }

    if (typeof order.cart === 'object') {
      return Object.values(order.cart)
    }

    return []
  }

  function getAddress(address) {
    if (!address) return 'Sem endereço'

    if (typeof address === 'string') return address

    if (address.type === 'text') {
      return address.value || 'Sem endereço'
    }

    if (address.type === 'location') {
      return `Lat: ${address.latitude} | Long: ${address.longitude}`
    }

    return 'Sem endereço'
  }

  return (
    <div className='orders-page'>

      {/* HEADER */}
      <div className='orders-header'>
        <div>
          <h1>Pedidos</h1>
          <p>{orders.length} pedidos recebidos</p>
        </div>

        <div className='orders-badge'>
          {orders.length} pedidos
        </div>
      </div>

      {/* EMPTY STATE */}
      {orders.length === 0 && (
        <div className='orders-empty'>
          <div className='orders-empty-icon'>📦</div>
          <h2>Nenhum pedido encontrado</h2>
          <p>Os pedidos feitos no site e WhatsApp aparecerão aqui.</p>
        </div>
      )}

      {/* GRID */}
      <div className='orders-grid'>

        {orders.map((order, index) => {

          const cart = getCart(order)

          let total = 0
          cart.forEach(p => {
            const unitPrice = p?.unitPrice || p?.price || 0
            const quantity = p?.quantity || 1
            total += unitPrice * quantity
          })

          return (
            <div
              key={`${order.id}-${order.createdAt}`}
              className={`order-card ${order?.status || ''}`}
            >

              {/* TOP */}
              <div className='order-top'>
                <div className='order-user'>
                  <div className='order-avatar'>
                    {(order?.customerName || order?.customer?.name || order?.number || 'N/A').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3>Cliente</h3>
                    <span>
                      {order?.customerName || order?.customer?.name || order?.number || 'N/A'}
                    </span>
                    {order?.isTest && (
                      <span style={{ fontSize: '12px', color: '#f59e0b', display: 'block', fontWeight: 'bold' }}>
                        🧪 Pedido de Teste
                      </span>
                    )}
                    {order?.customerPhone && (
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
                        📞 {order.customerPhone}
                      </span>
                    )}
                    {order?.customerCpf && (
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
                        🆔 CPF: {order.customerCpf}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`order-status ${order?.status || ''}`}>
                  {order?.status === 'pending' && '� PENDENTE'}
                  {order?.status === 'accepted' && '� ACEITO'}
                  {order?.status === 'on_the_way' && '� A CAMINHO'}
                  {order?.status === 'completed' && '✅ FINALIZADO'}
                  {order?.status === 'cancelled' && '❌ CANCELADO'}
                </div>
              </div>

              {/* PRODUCTS */}
              <div className='order-products'>
                {cart.map((product, i) => {
                  const unitPrice = product?.unitPrice || product?.price || 0
                  const quantity = product?.quantity || 1
                  const totalPrice = unitPrice * quantity
                  return (
                    <div
                      key={`${order.id}-${product.id}-${i}`}
                      className='order-product'
                    >
                      <span>🛒 {product?.name || 'Produto'} x{quantity}</span>
                      <strong>R$ {Number(totalPrice).toFixed(2)}</strong>
                    </div>
                  )
                })}
              </div>

              {/* FOOTER */}
              <div className='order-footer'>

                <div className='order-address'>
                  📍 {getAddress(order?.address)}
                  {order?.orderType === 'pickup' && (
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>
                      📦 Retirada na loja
                    </span>
                  )}
                </div>

                <div className='order-payment'>
                  💳 {order?.paymentMethod === 'pix' ? 'Pix' : order?.paymentMethod === 'card' ? 'Cartão' : order?.paymentMethod === 'cash' ? 'Dinheiro' : 'N/A'}
                  {order?.needsChange && order?.changeAmount > 0 && (
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>
                      💰 Troco para: R$ {order.changeAmount}
                    </span>
                  )}
                </div>

                {order?.observation && (
                  <div className='order-observation' style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    📝 {order.observation}
                  </div>
                )}
              </div>

              {/* TOTAL */}
              <div className='order-total'>
                Total: <strong>R$ {(order?.total || total).toFixed(2)}</strong>
              </div>

              {/* ACTIONS */}
              <div className='order-actions'>

                {order?.status === 'pending' && (
                  <button
                    className='accept-order'
                    onClick={() => updateOrderStatus(order.id, 'accepted')}
                  >
                    ✅ Aceitar
                  </button>
                )}

                {order?.status === 'accepted' && order?.orderType === 'delivery' && (
                  <button
                    className='finish-order'
                    onClick={() => updateOrderStatus(order.id, 'on_the_way')}
                  >
                    🚚 A caminho
                  </button>
                )}

                {order?.status === 'accepted' && order?.orderType === 'pickup' && (
                  <button
                    className='finish-order'
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                  >
                    ✅ Finalizar
                  </button>
                )}

                {order?.status === 'on_the_way' && (
                  <button
                    className='finish-order'
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                  >
                    ✅ Finalizar
                  </button>
                )}

                {order?.status === 'completed' && (
                  <>
                    <button className='finished-order' disabled>
                      ✅ Pedido Finalizado
                    </button>
                    <button
                      className='delete-order'
                      onClick={() => deleteOrder(order.id)}
                      title='Remover pedido'
                    >
                      🗑️ Remover
                    </button>
                  </>
                )}

              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}