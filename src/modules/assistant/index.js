const fs = require('fs')
const path = require('path')

async function sendWelcome(ctx, text) {

  let imagePath = null

  // 1. Tenta uploads pelo nome da empresa
  if (ctx.client.config?.name) {
    const companyDir = path.join(
      __dirname,
      `../../uploads/${ctx.client.config.name}`
    )
    
    if (fs.existsSync(companyDir)) {
      const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      try {
        const files = fs.readdirSync(companyDir)
        for (const file of files) {
          if (exts.some(e => file.toLowerCase().endsWith(e))) {
            imagePath = path.join(companyDir, file)
            break
          }
        }
      } catch (e) {}
    }
  }

  // 2. Fallback: tenta pelo ID se não achou pelo nome
  if (!imagePath) {
    const companyDir = path.join(
      __dirname,
      `../../uploads/${ctx.client.id}`
    )
    
    if (fs.existsSync(companyDir)) {
      const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      try {
        const files = fs.readdirSync(companyDir)
        for (const file of files) {
          if (exts.some(e => file.toLowerCase().endsWith(e))) {
            imagePath = path.join(companyDir, file)
            break
          }
        }
      } catch (e) {}
    }
  }

  // 3. Fallback: config.logo antigo
  if (!imagePath && ctx.client.config.logo) {
    const fallback = path.join(__dirname, '../../', ctx.client.config.logo)
    if (fs.existsSync(fallback)) imagePath = fallback
  }

  // Sem imagem: manda só texto
  if (!imagePath) {
    await ctx.reply(text)
    return
  }

  try {
    const destino = ctx.from.includes('@')
      ? ctx.from
      : `${ctx.from}@s.whatsapp.net`

    await ctx.sock.sendMessage(destino, {
      image: fs.readFileSync(imagePath),
      caption: text
    })
  } catch (err) {
    console.log('Erro ao enviar logo:', err)
    await ctx.reply(text)
  }
}

module.exports = {

  name: 'assistant',

  flow: 'assistant',

  priority: 1,

  events: {

    async onMessage(ctx) {

  // ==========================================
  // LÓGICA DE INSCRIÇÃO PARA ANÚNCIOS
  // ==========================================
  const subscribersPath = path.join(
    __dirname,
    `../../tenants/${ctx.client.id}/subscribers.json`
  )

  let subscribers = []
  if (fs.existsSync(subscribersPath)) {
    try {
      subscribers = JSON.parse(fs.readFileSync(subscribersPath))
    } catch (e) {
      subscribers = []
    }
  }

  // Adiciona o usuário se ainda não estiver inscrito
  if (!subscribers.includes(ctx.sender)) {
    subscribers.push(ctx.sender)
    fs.writeFileSync(subscribersPath, JSON.stringify(subscribers, null, 2))
    console.log(`📝 Usuário ${ctx.sender} inscrito para anúncios`)
  }
  // ==========================================

  // IGNORA DELIVERY
  if (
    ctx.body
    ?.toLowerCase()
    .startsWith('comprar')
  ) {
    return true
  }

  const message =
  ctx.body
  .toLowerCase()
  .trim()

  // COMANDOS PARA VOLTAR AO MENU
  const resetCommands = [

    'menu',
    'inicio',
    'início',
    'oi',
    'ola',
    'olá',
    'voltar',
    '0'

  ]

  // RESETAR MENU
  if (
    resetCommands.includes(message)
  ) {

    ctx.setSession({

      flow: 'assistant',

      step: 'start'

    })

  }

  // SESSÃO VAZIA
  if (
    !ctx.session.step
  ) {

    ctx.setSession({

      flow: 'assistant',

      step: 'start'

    })

  }

  // INICIO
  if (
    ctx.session.step === 'start'
  ) {

    // Usar mensagem personalizada do config ou padrão
    const welcomeMessage = ctx.client.config.welcomeMessage ||
`✨ Olá! Seja bem-vindo(a) à *${ctx.client.config.name}*.

Sou *Bella*, sua atendente virtual. 😊

Será um prazer atender você hoje!

Para darmos início ao seu atendimento, escolha uma das opções abaixo digitando apenas o número correspondente:

`

    let text = welcomeMessage

    const menuModules =

    ctx.client.modules
      .filter(module => module.menu)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))

    console.log('📋 Módulos com menu:', menuModules.map(m => ({ name: m.name, label: m.menu.label })))

    menuModules.forEach(
      (module, index) => {

        text +=
`${index + 1} - ${module.menu.label}
`

      }
    )

    text +=
`9 - Suporte Humano`


    //await ctx.reply(text)
    await sendWelcome(ctx, text)

    ctx.setSession({

      flow: 'assistant',

      step: 'menu'

    })

    return false
  }

  // MENU
  // MENU
      if (
        ctx.session.step === 'menu'
      ) {

        // 1. Pega os módulos com menu configurado
        const menuModules = ctx.client.modules
          .filter(module => module.menu)
          .sort((a, b) => (a.priority || 0) - (b.priority || 0))

        console.log('📋 Menu módulos disponíveis:', menuModules.map((m, i) => `${i + 1} - ${m.name}: ${m.menu.label}`))
        console.log('🔢 Usuário digitou:', ctx.body)

        // 2. Calcula qual módulo a pessoa quer acessar
        const selectedModule = menuModules[
          Number(ctx.body) - 1
        ]

        console.log('✅ Módulo selecionado:', selectedModule?.name)

        // ==========================================
        // LÓGICA DE ERRO (AQUI É O SEU PEDIDO)
        // ==========================================
        if (!selectedModule) {

          // Envia mensagem de erro
          await ctx.reply('😅 Ops! Parece que algo não foi entendido.')

          // Envia o menu novamente para ficar limpo
          const text = `
Escolha uma das opções abaixo:

${menuModules.map((m, i) => `${i + 1} - ${m.menu.label}`).join('\n')}
9 - Suporte Humano
`
          await sendWelcome(ctx, text)

          // IMPORTANTE: Não resetamos o fluxo para 'start'. O bot continua no 'menu'.
          // Isso faz com que o próximo clique direto funcione.
          return false
        }

        // ==========================================
        // SUCESSO
        // ==========================================
        // ENTRAR NO MÓDULO CORRETO
        ctx.gotoFlow(
          selectedModule.name
        )

        return false
      }

}

  }

}