import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import api from '../../services/api'

import '../../styles/company-qrcode.css'

const socket =
io(import.meta.env.VITE_API_URL || 'http://localhost:4177')

export default function CompanyQRCode() {

  const [qr, setQr] =
  useState(null)

  const [connected,
  setConnected] =
  useState(false)

  const companyId =
  localStorage.getItem('companyId')

  async function loadQR() {

    try {

      const token =
      localStorage.getItem('token')

      const response =
      await api.get(

        `/companies/${companyId}/qr`,

        {

          headers: {

            Authorization:
            `Bearer ${token}`

          }

        }

      )

      setQr(response.data.qr)

      setConnected(
        response.data.connected
      )

    } catch (err) {

      console.log(err)

    }

  }

  useEffect(() => {

    loadQR()

    socket.on(
      'connection-update',
      data => {

        if (
          data.clientId !== companyId
        ) return

        setQr(data.qr)

        setConnected(
          data.connected
        )

      }
    )

    return () => {

      socket.off(
        'connection-update'
      )

    }

  }, [])

  return (

    <div className='qr-page'>

      <div className='qr-header'>

        <h1>
          WhatsApp
        </h1>

        <p>
          Conecte seu WhatsApp
        </p>

      </div>

      <div className='qr-card'>

        <div className={`qr-status ${
          connected
          ? 'online'
          : 'offline'
        }`}>

          {

            connected
            ? '🟢 Online'
            : '🔴 Offline'

          }

        </div>

        {

          connected ? (

            <div className='connected-box'>

              <h2>
                WhatsApp conectado 🚀
              </h2>

            </div>

          ) : qr ? (

            <>

              <img
                src={qr}
                className='qr-image'
              />

              <p>
                Escaneie o QR Code
              </p>

            </>

          ) : (

            <div className='loading-qr'>

              Gerando QR Code...

            </div>

          )

        }

      </div>

    </div>

  )

}