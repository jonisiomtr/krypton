const fs = require('fs')
const path = require('path')

const ClientMemoryManager =
require(
  './database/ClientMemoryManager'
)
const ConversationManager =
require(
  './database/ConversationManager'
)

const {
  askOllama
} = require('./services/ollama')

const IntentParser =
require('./IntentParser')

const systemPrompt =
require('./prompts/systemPrompt')

module.exports = {

  name: 'ia2',

  global: true,

  priority: 99,

  events: {

    async onMessage(ctx) {

      console.log('IA2 recebeu:', ctx.body)

      try {

        // =========================
        // PRODUTOS
        // =========================

        const productsPath =
        path.join(
          __dirname,
          `../../tenants/${ctx.client.id}/products.json`
        )

        let products = []

        if (
          fs.existsSync(productsPath)
        ) {

          products =
          JSON.parse(
            fs.readFileSync(
              productsPath,
              'utf8'
            )
          )

        }

        // =========================
        // SERVIÇOS
        // =========================

        const servicesPath =
        path.join(
          __dirname,
          `../../tenants/${ctx.client.id}/services.json`
        )

        let services = []

        if (
          fs.existsSync(servicesPath)
        ) {

          services =
          JSON.parse(
            fs.readFileSync(
              servicesPath,
              'utf8'
            )
          )

        }

        // =========================
        // DEBUG
        // =========================

        console.log(
          'CLIENT DATA:',
          ctx.client
        )

        // =========================
        // NOME EMPRESA
        // =========================

        const company = {

          name:
          ctx.client?.config?.name ||

          ctx.client?.name ||

          'Empresa'

        }

        const memory =

ClientMemoryManager.get(
  ctx.sender
)

        // =========================
        // PROMPT SISTEMA
        // =========================

        const promptSistema =
        systemPrompt({

          company,

          products,

          services

        })

        // =========================
        // PROMPT FINAL
        // =========================

        // =========================
// =========================
// HISTÓRICO
// =========================

ConversationManager.addMessage(

  ctx.sender,

  'user',

  ctx.body

)

const history =

ConversationManager.getHistory(
  ctx.sender
)

const historyText =

history

.map(item =>

`${item.role.toUpperCase()}:

${item.content}`

)

.join('\n\n')

// DEBUG

console.log(
  'HISTORICO:',
  historyText
)

// =========================
// PROMPT FINAL
// =========================

const pergunta = `

[SISTEMA]

${promptSistema}

[MEMORIA CLIENTE]

${JSON.stringify(
  memory,
  null,
  2
)}

[HISTORICO]

${historyText}

[CLIENTE]

${ctx.body}

`

// =========================
// OLLAMA
// =========================

const resposta =
await askOllama(
  pergunta
)

const nomeMatch =

ctx.body.match(
  /meu nome é\s+(.*)/i
)

if (nomeMatch) {

  ClientMemoryManager.set(

    ctx.sender,

    'name',

    nomeMatch[1]

  )

}

// SALVA RESPOSTA IA

ConversationManager.addMessage(

  ctx.sender,

  'assistant',

  resposta

)

console.log(
  'SESSION ID:',
  ctx.sender
)

console.log(
  'HISTORY SIZE:',
  history.length
)

console.log(
  'IA respondeu:',
  resposta
)

const intent =
IntentParser.parse(
  ctx.body
)

console.log(
  'INTENT:',
  intent.intent
)

await ctx.reply(
  resposta
)

return false

      } catch (err) {

        console.log(
          'ERRO IA2:',
          err
        )

        return false

      }

    }

  }

}