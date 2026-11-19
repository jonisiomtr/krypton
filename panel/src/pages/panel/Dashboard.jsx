/**
 * @fileoverview Analytics Dashboard Component
 * @description Shows key metrics and analytics for company performance
 * @author CTO/CPO Senior Team
 * @version 2.0.0
 * 
 * FEATURES:
 * - Date picker for custom date ranges
 * - Professional UI design
 * - Real-time metrics
 * - Conversion tracking
 */

import { useEffect, useState } from 'react'
import api from '../../services/api'
import '../../styles/painelEmpresas/dashboard.css'

import {
  PlusIcon,
  BullhornIcon,
  ReportIcon,
  SettingsIcon,
  LightbulbIcon,
  CheckCircleIcon,
  ChartIcon,
  BoxIcon,
  MoneyIcon,
  TicketIcon
} from '../../components/Icons'

export default function Dashboard({ companyId, pendingOrders }) {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeProducts: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
    conversionRate: 0
  })
  const [pdvMetrics, setPdvMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageTicket: 0,
    dailyRevenue: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterType, setFilterType] = useState('today') // today, week, month, custom

  useEffect(() => {
    if (companyId) {
      loadMetrics()
    }
  }, [companyId, selectedDate, filterType])

  async function loadMetrics() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Calculate date range based on filter type
      let range = '7d'
      if (filterType === 'today') {
        range = '1d'
      } else if (filterType === 'week') {
        range = '7d'
      } else if (filterType === 'month') {
        range = '30d'
      } else if (filterType === 'custom') {
        range = 'custom'
      }

      // Carregar métricas do site/webagendamento
      const response = await api.get(`/api/companies/${companyId}/metrics?range=${range}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Carregar métricas do PDV
      const pdvRange = filterType === 'today' ? 'today' : filterType === 'week' ? 'week' : filterType === 'month' ? 'month' : 'today'
      const pdvResponse = await api.get(`/api/pdv/${companyId}/revenue?range=${pdvRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Ensure all values are defined
      const data = response.data || {}
      const pdvData = pdvResponse.data || { totalRevenue: 0, totalOrders: 0, averageTicket: 0, dailyRevenue: [] }

      setMetrics({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        activeProducts: data.activeProducts || 0,
        totalCustomers: data.totalCustomers || 0,
        pendingOrders: data.pendingOrders || 0,
        todayOrders: data.todayOrders || 0,
        todayRevenue: data.todayRevenue || 0,
        conversionRate: data.conversionRate || 0
      })

      setPdvMetrics({
        totalRevenue: pdvData.totalRevenue || 0,
        totalOrders: pdvData.totalOrders || 0,
        averageTicket: pdvData.averageTicket || 0,
        dailyRevenue: pdvData.dailyRevenue || []
      })
    } catch (err) {
      console.log('Erro ao carregar métricas:', err)
      // Set default values on error
      setMetrics({
        totalOrders: 0,
        totalRevenue: 0,
        activeProducts: 0,
        totalCustomers: 0,
        pendingOrders: 0,
        todayOrders: 0,
        todayRevenue: 0,
        conversionRate: 0
      })
      setPdvMetrics({
        totalRevenue: 0,
        totalOrders: 0,
        averageTicket: 0,
        dailyRevenue: []
      })
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(value) {
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  function formatNumber(value) {
    if (value === undefined || value === null || isNaN(value)) {
      return '0'
    }
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  function formatPercent(value) {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%'
    }
    return `${value.toFixed(1)}%`
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className='dashboard-page'>
      <div className='dashboard-header'>
        <div>
          <h1><ChartIcon size={28} className="header-icon" /> Visão Geral</h1>
          <p>Acompanhe o desempenho do seu negócio em tempo real</p>
        </div>
        <div className='date-filter'>
          <button
            className={filterType === 'today' ? 'active' : ''}
            onClick={() => setFilterType('today')}
          >
            Hoje
          </button>
          <button
            className={filterType === 'week' ? 'active' : ''}
            onClick={() => setFilterType('week')}
          >
            Esta Semana
          </button>
          <button
            className={filterType === 'month' ? 'active' : ''}
            onClick={() => setFilterType('month')}
          >
            Este Mês
          </button>
          <button
            className={filterType === 'custom' ? 'active' : ''}
            onClick={() => setFilterType('custom')}
          >
            Personalizado
          </button>
          {filterType === 'custom' && (
            <input
              type='date'
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className='date-picker'
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className='dashboard-loading'>
          <div className='spinner'></div>
          <p>Carregando métricas...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className='metrics-grid'>
            <div className='metric-card primary'>
              <div className='metric-icon'><MoneyIcon size={24} /></div>
              <div className='metric-content'>
                <div className='metric-label'>Faturamento PDV</div>
                <div className='metric-value'>{formatCurrency(pdvMetrics.totalRevenue)}</div>
                <div className='metric-sublabel'>
                  {filterType === 'today' ? 'Hoje' :
                   filterType === 'week' ? 'Esta semana' :
                   filterType === 'month' ? 'Este mês' :
                   'Período selecionado'}
                </div>
              </div>
            </div>

            <div className='metric-card secondary'>
              <div className='metric-icon'><BoxIcon size={24} /></div>
              <div className='metric-content'>
                <div className='metric-label'>Vendas PDV</div>
                <div className='metric-value'>{formatNumber(pdvMetrics.totalOrders)}</div>
                <div className='metric-sublabel'>{formatNumber(pdvMetrics.totalOrders)} vendas</div>
              </div>
            </div>

            <div className='metric-card tertiary'>
              <div className='metric-icon'><TicketIcon size={24} /></div>
              <div className='metric-content'>
                <div className='metric-label'>Ticket Médio PDV</div>
                <div className='metric-value'>{formatCurrency(pdvMetrics.averageTicket)}</div>
                <div className='metric-sublabel'>Por venda</div>
              </div>
            </div>

            <div className='metric-card quaternary'>
              <div className='metric-icon'><ChartIcon size={24} /></div>
              <div className='metric-content'>
                <div className='metric-label'>Taxa de Conversão</div>
                <div className='metric-value'>{formatPercent(metrics.conversionRate)}</div>
                <div className='metric-sublabel'>Visitantes → Pedidos</div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className='secondary-metrics'>
            <div className='secondary-metric'>
              <div className='secondary-label'>Produtos Ativos</div>
              <div className='secondary-value'>{formatNumber(metrics.activeProducts)}</div>
            </div>

            <div className='secondary-metric'>
              <div className='secondary-label'>Pedidos Pendentes</div>
              <div className='secondary-value warning'>{formatNumber(metrics.pendingOrders)}</div>
            </div>

            <div className='secondary-metric'>
              <div className='secondary-label'>Faturamento Site</div>
              <div className='secondary-value success'>{formatCurrency(metrics.todayRevenue)}</div>
            </div>

            <div className='secondary-metric'>
              <div className='secondary-label'>Clientes Ativos</div>
              <div className='secondary-value'>{formatNumber(metrics.totalCustomers)}</div>
            </div>
          </div>

          {/* PDV Daily Revenue */}
          <div className='daily-revenue-section'>
            <h3><ChartIcon size={20} /> Faturamento PDV por Dia</h3>
            {pdvMetrics.dailyRevenue.length === 0 ? (
              <p className='empty-state'>Nenhuma venda no PDV neste período</p>
            ) : (
              <div className='daily-revenue-list'>
                {pdvMetrics.dailyRevenue.map((day, index) => (
                  <div key={index} className='daily-revenue-item'>
                    <div className='day-date'>
                      {new Date(day.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </div>
                    <div className='day-metrics'>
                      <div className='day-orders'>{day.orders} vendas</div>
                      <div className='day-revenue'>{formatCurrency(day.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className='quick-actions'>
            <h3>Ações Rápidas</h3>
            <div className='actions-grid'>
              <button className='action-button'>
                <span className='action-icon'><PlusIcon size={24} /></span>
                <span>Adicionar Produto</span>
              </button>
              <button className='action-button'>
                <span className='action-icon'><BullhornIcon size={24} /></span>
                <span>Criar Campanha</span>
              </button>
              <button className='action-button'>
                <span className='action-icon'><ReportIcon size={24} /></span>
                <span>Ver Relatório</span>
              </button>
              <button className='action-button'>
                <span className='action-icon'><SettingsIcon size={24} /></span>
                <span>Configurações</span>
              </button>
            </div>
          </div>

          {/* Tips Section */}
          <div className='tips-section'>
            <h3><LightbulbIcon size={20} /> Dicas para Aumentar Vendas</h3>
            <ul className='tips-list'>
              <li><CheckCircleIcon size={16} /> Ative o módulo de Catálogo para mostrar seus produtos</li>
              <li><CheckCircleIcon size={16} /> Configure o site da empresa para capturar pedidos online</li>
              <li><CheckCircleIcon size={16} /> Use anúncios automáticos para engajar clientes</li>
              <li><CheckCircleIcon size={16} /> Responda mensagens do chat rapidamente</li>
              <li><CheckCircleIcon size={16} /> Mantenha seu catálogo atualizado com fotos de qualidade</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
