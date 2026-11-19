import { useState, useEffect } from 'react'
import api from '../../services/api'

import '../../styles/painelEmpresas/pdv-config.css'

export default function PDVConfig() {
  const companyId = localStorage.getItem('companyId')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')

  const [config, setConfig] = useState({
    supervisorPhone: ''
  })

  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'caixa'
  })

  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    async function loadAll() {
      await Promise.all([loadConfig(), loadUsers()])
      setLoading(false)
    }
    loadAll()
  }, [])

  useEffect(() => {
    if (companyId) {
      // PDV é uma página pública, usar sempre o origin do frontend
      setPreviewUrl(`${window.location.origin}/pdv/${companyId}`)
    }
  }, [companyId])

  async function loadConfig() {
    try {
      const response = await api.get(`/api/pdv/${companyId}`)
      const loadedConfig = response.data
      setConfig(loadedConfig)
    } catch (err) {
      console.log('Erro ao carregar configuração:', err)
    }
  }

  async function saveConfig() {
    try {
      await api.put(`/api/pdv/${companyId}`, config)
      alert('Configurações salvas com sucesso!')
    } catch (err) {
      console.log('Erro ao salvar:', err)
      alert('Erro ao salvar configurações')
    }
  }

  async function loadUsers() {
    try {
      const response = await api.get(`/api/pdv/${companyId}/users`)
      setUsers(response.data)
    } catch (err) {
      console.log('Erro ao carregar usuários:', err)
    }
  }

  async function addUser() {
    try {
      await api.post(`/api/pdv/${companyId}/users`, newUser)
      alert('Usuário adicionado com sucesso!')
      setNewUser({
        username: '',
        password: '',
        name: '',
        role: 'caixa'
      })
      loadUsers()
    } catch (err) {
      console.log('Erro ao adicionar usuário:', err)
      alert('Erro ao adicionar usuário')
    }
  }

  async function deleteUser(userId) {
    try {
      await api.delete(`/api/pdv/${companyId}/users/${userId}`)
      alert('Usuário removido com sucesso!')
      loadUsers()
    } catch (err) {
      console.log('Erro ao remover usuário:', err)
      alert('Erro ao remover usuário')
    }
  }

  if (loading) {
    return (
      <div className='pdv-loading'>
        <div className='loading-spinner'></div>
        <p>Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className='pdv-config-page'>
      <div className='pdv-header'>
        <h1>💳 PDV - Ponto de Venda</h1>
        <p>Configure seu sistema de vendas e gerencie os caixas</p>
      </div>

      <div className='pdv-tabs'>
        <button
          className={`pdv-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configurações
        </button>
        <button
          className={`pdv-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuários do Caixa
        </button>
        <button
          className={`pdv-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
      </div>

      {activeTab === 'config' && (
        <div className='pdv-section'>
          <h2>Configurações de Notificação</h2>
          <p>Configure o WhatsApp para receber notificações das vendas</p>

          <div className='form-group'>
            <label>WhatsApp do Supervisor</label>
            <input
              type='text'
              value={config.supervisorPhone}
              onChange={(e) => setConfig({ ...config, supervisorPhone: e.target.value })}
              placeholder='Ex: 559191873356'
            />
            <small style={{ color: '#666', fontSize: '12px', marginTop: '8px', display: 'block' }}>
              Número do WhatsApp que receberá notificações após cada venda (apenas números, com código do país)
            </small>
          </div>

          <button className='save-button' onClick={saveConfig}>
            💾 Salvar Configurações
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className='pdv-section'>
          <h2>Usuários do Caixa</h2>
          <p>Crie logins para seus funcionários acessarem o PDV</p>

          <div className='add-user-form'>
            <h3>Adicionar Novo Usuário</h3>
            <div className='form-row'>
              <div className='form-group'>
                <label>Nome</label>
                <input
                  type='text'
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder='Nome completo'
                />
              </div>
              <div className='form-group'>
                <label>Usuário</label>
                <input
                  type='text'
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder='Nome de usuário'
                />
              </div>
            </div>
            <div className='form-row'>
              <div className='form-group'>
                <label>Senha</label>
                <input
                  type='password'
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder='Senha'
                />
              </div>
              <div className='form-group'>
                <label>Cargo</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value='caixa'>Caixa</option>
                  <option value='gerente'>Gerente</option>
                  <option value='admin'>Administrador</option>
                </select>
              </div>
            </div>
            <button className='add-button' onClick={addUser}>
              ➕ Adicionar Usuário
            </button>
          </div>

          <div className='users-list'>
            <h3>Usuários Ativos</h3>
            {users.length === 0 ? (
              <p className='empty-state'>Nenhum usuário cadastrado</p>
            ) : (
              <div className='users-grid'>
                {users.map(user => (
                  <div key={user.id} className='user-card'>
                    <div className='user-avatar'>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className='user-info'>
                      <h4>{user.name}</h4>
                      <p>@{user.username}</p>
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </div>
                    <button
                      className='delete-button'
                      onClick={() => deleteUser(user.id)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className='pdv-section'>
          <h2>Preview do PDV</h2>
          <p>Este é o link que seus funcionários usarão para acessar o PDV</p>

          <div className='preview-card'>
            <div className='preview-link'>
              <label>Link do PDV:</label>
              <input
                type='text'
                value={previewUrl}
                readOnly
              />
              <button
                onClick={() => navigator.clipboard.writeText(previewUrl)}
                className='copy-button'
              >
                📋 Copiar
              </button>
            </div>

            <div className='preview-actions'>
              <button
                className='open-button'
                onClick={() => window.open(previewUrl, '_blank')}
              >
                🔗 Abrir PDV
              </button>
            </div>

            <div className='preview-info'>
              <h3>📋 Informações</h3>
              <ul>
                <li>✅ Cada usuário deve fazer login com suas credenciais</li>
                <li>✅ O sistema registra qual usuário está logado</li>
                <li>✅ Você pode ver quem acessou o PDV</li>
                <li>✅ Gerencie os usuários na aba "Usuários do Caixa"</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
