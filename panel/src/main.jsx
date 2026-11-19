import React from 'react'

import ReactDOM from 'react-dom/client'

import {
  BrowserRouter,
  Routes,
  Route
} from 'react-router-dom'

import './App.css'

import Login from './pages/Login'

import Dashboard from './pages/Dashboard'

import Company from './pages/Company'

import PrivateRoute from './components/PrivateRoute'

import CompanyPanel from './pages/CompanyPanel'

import WhatsAppSettings from './pages/WhatsAppSettings'

import SuperAdminWhatsApp from './pages/SuperAdminWhatsApp'

import SuspendedLogin from './pages/SuspendedLogin'

import PDVPublicLogin from './pages/PDVPublicLogin'
import PDVTerminal from './pages/PDVTerminal'

ReactDOM.createRoot(
  document.getElementById('root')
).render(

  <BrowserRouter>

    <Routes>

      <Route
        path='/'
        element={<Login />}
      />

      <Route
        path='/suspended'
        element={<SuspendedLogin />}
      />

      <Route
        path='/dashboard'
        element={

          <PrivateRoute>

            <Dashboard />

          </PrivateRoute>

        }
      />

      <Route
  path='/company-panel'
  element={
    <PrivateRoute>
      <CompanyPanel />
    </PrivateRoute>
  }
/>

      <Route
        path='/company/:id'
        element={

          <PrivateRoute>

            <Company />

          </PrivateRoute>

        }
      />

      <Route
        path='/whatsapp-settings'
        element={

          <PrivateRoute>

            <WhatsAppSettings />

          </PrivateRoute>

        }
      />

      <Route
        path='/superadmin-whatsapp'
        element={

          <PrivateRoute>

            <SuperAdminWhatsApp />

          </PrivateRoute>

        }
      />

      <Route
        path='/pdv/:companyId'
        element={<PDVPublicLogin />}
      />

      <Route
        path='/pdv/:companyId/terminal'
        element={<PDVTerminal />}
      />

    </Routes>

  </BrowserRouter>

)