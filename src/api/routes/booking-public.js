const express = require('express')
const fs = require('fs')
const path = require('path')

const router = express.Router()

// Servir página de agendamento público
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params

    // Verificar se a empresa existe
    const configPath = path.join(
      __dirname,
      `../../tenants/${companyId}/config.json`
    )

    if (!fs.existsSync(configPath)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Página Não Encontrada</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .error-container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            h1 { color: #1e293b; margin: 0 0 16px; }
            p { color: #64748b; margin: 0; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>📅 Empresa Não Encontrada</h1>
            <p>Esta página de agendamento não existe.</p>
          </div>
        </body>
        </html>
      `)
    }

    // Verificar se o online booking está ativado
    const bookingConfigPath = path.join(
      __dirname,
      `../../tenants/${companyId}/onlineBooking.json`
    )

    let bookingConfig = null
    if (fs.existsSync(bookingConfigPath)) {
      bookingConfig = JSON.parse(fs.readFileSync(bookingConfigPath, 'utf8'))
    }
    
    //Bloqueio da pagina
    /*

    if (!bookingConfig || !bookingConfig.enabled) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Agendamento Indisponível</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .error-container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            h1 { color: #1e293b; margin: 0 0 16px; }
            p { color: #64748b; margin: 0; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>📅 Agendamento Indisponível</h1>
            <p>O sistema de agendamento online desta empresa está desativado.</p>
          </div>
        </body>
        </html>
      `)
    }
    */

    
    // Carregar a página HTML
    const htmlPath = path.join(
      __dirname,
      '../../public/booking-pages/index.html'
    )

    let html = fs.readFileSync(htmlPath, 'utf8')

    // Injetar configurações da empresa se necessário
    res.send(html)

  } catch (err) {
    console.log('Erro ao servir página de agendamento:', err)
    res.status(500).send('Erro interno')
  }
})

module.exports = router
