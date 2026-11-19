const fs = require('fs')
const path = require('path')

module.exports = {

  name: 'webagendamento',

  flow: 'webagendamento',

  priority: 999,

  menu: {
    label: 'Link doAgendamento Da Empresa',
    description: 'Sistema de agendamento online com página personalizada'
  },

  events: {
    async onMessage(ctx) {
      // INICIO
      if (ctx.session.step === 'start') {
        const bookingConfigPath = path.join(
          __dirname,
          `../../tenants/${ctx.client.id}/webagendamento.json`
        )

        let bookingUrl = null
        if (fs.existsSync(bookingConfigPath)) {
          const bookingConfig = JSON.parse(fs.readFileSync(bookingConfigPath))
          if (bookingConfig.enabled) {
            const baseUrl = process.env.API_URL || 'http://localhost:4177'
            bookingUrl = `${baseUrl}/booking/${ctx.client.id}`
          }
        }

        if (bookingUrl) {
          await ctx.reply(
`📅 AGENDAMENTO ONLINE

${bookingUrl}

📱 Acesse nosso sistema de agendamento para marcar horários de forma rápida e fácil!`
          )

          // Voltar automaticamente ao menu principal
          ctx.setSession({
            flow: 'assistant',
            step: 'start'
          })
        } else {
          await ctx.reply(
`❌ O sistema de agendamento online ainda não está disponível.`
          )

          // Voltar automaticamente ao menu principal
          ctx.setSession({
            flow: 'assistant',
            step: 'start'
          })
        }

        return false
      }
    }
  },

  // Inicialização do módulo quando ativado
  async onEnable(ctx) {
    const bookingConfigPath = path.join(
      __dirname,
      `../../tenants/${ctx.client.id}/webagendamento.json`
    )

    // Cria configuração padrão do agendamento online se não existir
    if (!fs.existsSync(bookingConfigPath)) {
      const defaultConfig = {
        enabled: true,
        theme: 'modern',
        customDomain: null,
        hero: {
          title: ctx.client.config.displayName || ctx.client.config.name,
          subtitle: 'Agende seu horário de forma rápida e fácil',
          showLogo: true
        },
        colors: {
          primary: '#e0a96d',
          secondary: '#c59257',
          accent: '#c59257',
          background: '#121212',
          text: '#e0a96d'
        },
        features: {
          showPrices: true,
          showProfessionals: true,
          showWhatsAppButton: true,
          whatsappNumber: ctx.client.config.phone || '',
          requirePayment: false,
          requireDeposit: false,
          depositAmount: 0
        },
        social: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        },
        businessHours: {
          enableForAllDays: true,
          hours: {
            0: { enabled: false, open: '09:00', close: '18:00' }, // Domingo
            1: { enabled: true, open: '09:00', close: '18:00' },  // Segunda
            2: { enabled: true, open: '09:00', close: '18:00' },  // Terça
            3: { enabled: true, open: '09:00', close: '18:00' },  // Quarta
            4: { enabled: true, open: '09:00', close: '18:00' },  // Quinta
            5: { enabled: true, open: '09:00', close: '18:00' },  // Sexta
            6: { enabled: true, open: '09:00', close: '14:00' }   // Sábado
          },
          interval: 60 // minutos
        },
        notifications: {
          confirmation: true,
          reminder24h: true,
          reminder2h: true
        }
      }

      fs.writeFileSync(
        bookingConfigPath,
        JSON.stringify(defaultConfig, null, 2)
      )

      // Criar arquivo de profissionais se não existir
      const professionalsPath = path.join(
        __dirname,
        `../../tenants/${ctx.client.id}/professionals.json`
      )

      if (!fs.existsSync(professionalsPath)) {
        fs.writeFileSync(
          professionalsPath,
          JSON.stringify([], null, 2)
        )
      }

      console.log(`✅ Online Booking configurado para empresa: ${ctx.client.id}`)
    }
  },

  // Desativar módulo
  async onDisable(ctx) {
    const bookingConfigPath = path.join(
      __dirname,
      `../../tenants/${ctx.client.id}/webagendamento.json`
    )

    if (fs.existsSync(bookingConfigPath)) {
      const config = JSON.parse(fs.readFileSync(bookingConfigPath))
      config.enabled = false
      fs.writeFileSync(bookingConfigPath, JSON.stringify(config, null, 2))
      console.log(`🚫 Online Booking desativado para empresa: ${ctx.client.id}`)
    }
  }
}
