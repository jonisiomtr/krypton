const fs = require('fs')
const path = require('path')
const cron = require('node-cron')

module.exports = {
  name: 'advertisement',
  flow: 'advertisement',
  priority: 3,

  events: {
    async start(ctx) {
      if (!ctx || !ctx.client || !ctx.sock) {
        console.log('❌ Não foi possível iniciar o módulo de anúncios (ctx faltando).')
        return
      }

      console.log(`✅ Iniciando módulo de anúncios para o cliente: ${ctx.client.config.name}`)

      // Agendar para as 09:00 e 18:00 todos os dias
      const job = cron.schedule('0 9,18 * * *', () => {
        this.run(ctx)
      })

      // Opcional: Salvar a referência ao job para parar depois se precisar
      ctx.client.advertisementJob = job 


    },



    

    async run(ctx) {
      // 1. Pegar todos os assinantes desse cliente
      const subscribersPath = path.join(
        __dirname,
        `../../tenants/${ctx.client.id}/subscribers.json`
      )

      // Se não existe arquivo, cria um array vazio
      let subscribers = []
      if (fs.existsSync(subscribersPath)) {
        try {
          subscribers = JSON.parse(fs.readFileSync(subscribersPath))
        } catch (e) {
          subscribers = []
        }
      }

      // Se não tem ninguém inscrito, para aqui
      if (subscribers.length === 0) return

      // 2. Carregar produtos
      const productsPath = path.join(
        __dirname,
        `../../tenants/${ctx.client.id}/products.json`
      )

      if (!fs.existsSync(productsPath)) return

      const products = JSON.parse(fs.readFileSync(productsPath))
      const activeProducts = products.filter(p => p.active !== false)
      if (activeProducts.length === 0) return

      // 3. Escolher produto aleatório
      const randomProduct = activeProducts[Math.floor(Math.random() * activeProducts.length)]
      const hour = new Date().getHours()
      
      // Não anuncia fora do horário comercial
      if (hour < 8 || hour > 20) return

      // 4. Criar mensagem
      const message = `🌟 ${ctx.client.config.name} tem algo de novo para você! 🌟

${randomProduct.name}

💰 Preço: R$ ${randomProduct.price}

${randomProduct.description || 'Clique no Catálogo para ver mais opções.'}

${ctx.client.config.name === 'Sua Empresa' ? '1 - Ver Catálogo' : ''}`

      // 5. Enviar para CADA pessoa na lista
      for (const phone of subscribers) {
        const destination = phone.includes('@')
          ? phone
          : `${phone}@s.whatsapp.net`

        try {
          if (randomProduct.image) {
            await ctx.sock.sendMessage(destination, {
              image: { url: randomProduct.image },
              caption: message
            })
          } else {
            await ctx.sock.sendMessage(destination, { text: message })
          }
        } catch (err) {
          console.log(`Erro ao enviar para ${destination}:`, err.message)
          // Opcional: Remover da lista se falhar várias vezes
        }
      }
    }
  }
}