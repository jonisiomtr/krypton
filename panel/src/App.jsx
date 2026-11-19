
import { useEffect, useState } from 'react'

import './App.css'

import api from '../services/api'

export default function App() {

  const [username,
  setUsername] =
  useState('')

  const [password,
  setPassword] =
  useState('')

  const [logged,
  setLogged] =
  useState(false)

  const [companies,
  setCompanies] =
  useState([])

  // LOGIN
  async function login() {

    try {

      const response =
      await api.post(

        '/auth/login',

        {
          username,
          password
        }

      )

      const token =
      response.data.token

      localStorage.setItem(
        'token',
        token
      )

      setLogged(true)

      loadCompanies()

    } catch (error) {

      alert(
        'Login inválido.'
      )

    }

  }

  // EMPRESAS
  async function loadCompanies() {

    try {

      const token =
      localStorage.getItem(
        'token'
      )

      const response =
      await api.get(

        '/companies',

        {
          headers: {

            Authorization:
            `Bearer ${token}`

          }
        }

      )

      setCompanies(
        response.data
      )

    } catch (error) {

      console.log(error)

    }

  }

  // AUTO LOGIN
  useEffect(() => {

    const token =
    localStorage.getItem(
      'token'
    )

    if (token) {

      setLogged(true)

      loadCompanies()

    }

  }, [])

  // LOGOUT
  function logout() {

    localStorage.removeItem(
      'token'
    )

    setLogged(false)

  }

  // LOGIN
  if (!logged) {

    return (

      <div className='container'>

        <div className='bg1'></div>

        <div className='bg2'></div>

        <div className='login-card'>

          <div className='logo'>
            S
          </div>

          <h1 className='title'>
            SaaS Panel
          </h1>

          <p className='subtitle'>
            Plataforma inteligente 🚀
          </p>

          <div className='input-group'>

            <label>
              Usuário
            </label>

            <input
              type='text'
              placeholder='Digite seu usuário'
              value={username}
              onChange={
                e =>
                setUsername(
                  e.target.value
                )
              }
            />

          </div>

          <div className='input-group'>

            <label>
              Senha
            </label>

            <input
              type='password'
              placeholder='Digite sua senha'
              value={password}
              onChange={
                e =>
                setPassword(
                  e.target.value
                )
              }
            />

          </div>

          <button
            className='login-button'
            onClick={login}
          >

            Entrar

          </button>

          <p className='footer'>

            Sistema Multiempresa

          </p>

        </div>

      </div>

    )

  }

  // DASHBOARD
  return (

    <div className='dashboard'>

      {/* SIDEBAR */}
      <aside className='sidebar'>

        <div>

          <div className='sidebar-top'>

            <div className='sidebar-logo'>
              S
            </div>

            <h1>
              SaaS Panel
            </h1>

          </div>

          <nav className='menu'>

            <button>
              📊 Dashboard
            </button>

            <button>
              🏢 Empresas
            </button>

            <button>
              📦 Pedidos
            </button>

            <button>
              📅 Agendamentos
            </button>

            <button>
              🤖 Bots
            </button>

            <button>
              ⚙️ Configurações
            </button>

          </nav>

        </div>

        <button
          className='logout'
          onClick={logout}
        >
          Sair
        </button>

      </aside>

      {/* CONTENT */}
      <main className='content'>

        <div className='topbar'>

          <div>

            <h1>
              Dashboard
            </h1>

            <p>
              Bem-vindo ao painel 🚀
            </p>

          </div>

        </div>

        {/* CARDS */}
        <div className='cards'>

          <div className='card'>

            <span>
              Empresas
            </span>

            <h2>
              {companies.length}
            </h2>

          </div>

          <div className='card'>

            <span>
              Bots Online
            </span>

            <h2>
              2
            </h2>

          </div>

          <div className='card'>

            <span>
              Pedidos Hoje
            </span>

            <h2>
              18
            </h2>

          </div>

        </div>

        {/* EMPRESAS */}
        <div className='companies-box'>

          <div className='companies-header'>

            <h2>
              Empresas cadastradas
            </h2>

            <button>
              + Nova empresa
            </button>

          </div>

          {
            companies.map(
              company => (

                <div
                  className='company-item'
                  key={company}
                >

                  <div>

                    <h3>
                      {company}
                    </h3>

                    <p>
                      Empresa ativa
                    </p>

                  </div>

                  <span>
                    Online
                  </span>

                </div>

              )
            )
          }

        </div>

      </main>

    </div>

  )

}






