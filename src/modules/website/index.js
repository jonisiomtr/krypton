const fs = require('fs')
const path = require('path')

module.exports = {

  name: 'website',

  flow: 'website',

  priority: 999,

  menu: {
    label: 'Link do Site Da Empresa',
    description: 'Acesse o site oficial da empresa'
  },

  events: {
    async onMessage(ctx) {
      // INICIO
      if (ctx.session.step === 'start') {
        // Obter URL do site
        const websiteConfigPath = path.join(
          __dirname,
          `../../tenants/${ctx.client.id}/website.json`
        )

        let websiteUrl = null
        if (fs.existsSync(websiteConfigPath)) {
          const websiteConfig = JSON.parse(fs.readFileSync(websiteConfigPath))
          if (websiteConfig.enabled) {
            // URL do site - usa a configuração do servidor
            const baseUrl = process.env.API_URL || 'http://localhost:4177'
            websiteUrl = `${baseUrl}/site/${ctx.client.id}`
          }
        }

        if (websiteUrl) {
          await ctx.reply(
`🌐 SITE DA EMPRESA

${websiteUrl}

📱 Acesse nosso site para ver produtos, fazer pedidos e muito mais!`
          )

          // Voltar automaticamente ao menu principal
          ctx.setSession({
            flow: 'assistant',
            step: 'start'
          })
        } else {
          await ctx.reply(
`❌ O site da empresa ainda não está disponível.`
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
    const websiteConfigPath = path.join(
      __dirname,
      `../../tenants/${ctx.client.id}/website.json`
    )

    // Cria configuração padrão do site se não existir
    if (!fs.existsSync(websiteConfigPath)) {
      const defaultConfig = {
        enabled: true,
        theme: 'modern',
        customDomain: null,
        seo: {
          title: ctx.client.config.displayName || ctx.client.config.name,
          description: ctx.client.config.description || 'Site oficial da empresa',
          keywords: ''
        },
        hero: {
          title: ctx.client.config.displayName || ctx.client.config.name,
          subtitle: 'Melhores produtos e serviços para você',
          showLogo: true
        },
        about: {
          enabled: true,
          title: 'Sobre Nós',
          content: ctx.client.config.description || 'Somos uma empresa dedicada a oferecer os melhores produtos e serviços.'
        },
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          accent: '#10b981',
          background: '#0f172a',
          text: '#ffffff'
        },
        features: {
          showPrices: true,
          showCategories: true,
          showWhatsAppButton: true,
          whatsappNumber: ctx.client.config.phone || ''
        },
        social: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        }
      }

      fs.writeFileSync(
        websiteConfigPath,
        JSON.stringify(defaultConfig, null, 2)
      )

      console.log(`✅ Website configurado para empresa: ${ctx.client.id}`)
    }
  },

  // Desativar módulo
  async onDisable(ctx) {
    const websiteConfigPath = path.join(
      __dirname,
      `../../tenants/${ctx.client.id}/website.json`
    )

    if (fs.existsSync(websiteConfigPath)) {
      const config = JSON.parse(fs.readFileSync(websiteConfigPath))
      config.enabled = false
      fs.writeFileSync(websiteConfigPath, JSON.stringify(config, null, 2))
      console.log(`🚫 Website desativado para empresa: ${ctx.client.id}`)
    }
  }
}
