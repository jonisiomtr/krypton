const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const auth = require('../middlewares/auth')
const loadModules = require('../../core/ModuleLoader')

// Armazenamento de sessões de teste em memória
const testSessions = new Map()
const testResponses = new Map() // Armazena a última resposta de cada sessão

// Criar contexto simulado igual ao WhatsApp
function createTestContext(companyId, message, config, modules, sessionId) {
  // Obter ou criar sessão
  let session = testSessions.get(sessionId)
  if (!session) {
    session = {
      flow: 'assistant',
      step: 'start'
    }
    testSessions.set(sessionId, session)
  }

  return {
    body: message,
    from: 'test_user',
    sender: 'test_user',
    client: {
      id: companyId,
      config: config,
      modules: modules
    },
    session: session,
    
    // Simula sock do WhatsApp para módulos que enviam imagens
    sock: {
      sendMessage: async (to, content) => {
        console.log('🖼️ sock.sendMessage chamado no contexto inicial')
        if (content.image) {
          const text = content.caption || '[Imagem]'
          testResponses.set(sessionId, text)
          return { text, type: 'text' }
        }
        if (content.text) {
          testResponses.set(sessionId, content.text)
          return { text: content.text, type: 'text' }
        }
        return null
      }
    },
    
    // Métodos simulados do contexto - capturam a resposta
    reply: async (text) => {
      testResponses.set(sessionId, text)
      return { text, type: 'text' }
    },
    
    setSession: (newSession) => {
      Object.assign(session, newSession)
      testSessions.set(sessionId, session)
    },
    
    gotoFlow: (moduleName) => {
      const module = modules.find(m => m.name === moduleName)
      console.log('🔄 gotoFlow chamado para:', moduleName, 'módulo encontrado:', !!module)

      if (module && module.events && module.events.onMessage) {
        // Atualizar sessão para o novo fluxo
        session.flow = moduleName
        session.step = 'start'
        testSessions.set(sessionId, session)

        // Criar contexto para o módulo alvo com todas as propriedades necessárias
        const moduleCtx = {
          body: message,
          from: 'test_user',
          sender: 'test_user',
          client: {
            id: companyId,
            config: config,
            modules: modules
          },
          session: session,

          // Métodos simulados
          reply: async (text) => {
            console.log('💬 Resposta do módulo:', text)
            testResponses.set(sessionId, text)
            return { text, type: 'text' }
          },

          setSession: (newSession) => {
            Object.assign(session, newSession)
            testSessions.set(sessionId, session)
          },

          gotoFlow: (newModuleName) => {
            console.log('🔄 gotoFlow aninhado para:', newModuleName)
            const nestedModule = modules.find(m => m.name === newModuleName)
            if (nestedModule && nestedModule.events && nestedModule.events.onMessage) {
              session.flow = newModuleName
              session.step = 'start'
              testSessions.set(sessionId, session)
              return true
            }
            return false
          },
          
          // Propriedades extras que alguns módulos podem precisar
          sock: {
            sendMessage: async (to, content) => {
              // Se tiver imagem, converte para texto apenas
              if (content.image) {
                console.log('🖼️ Imagem enviada no chat de teste (convertida para texto)')
                const text = content.caption || '[Imagem]'
                testResponses.set(sessionId, text)
                return { text, type: 'text' }
              }
              // Se for só texto
              if (content.text) {
                testResponses.set(sessionId, content.text)
                return { text: content.text, type: 'text' }
              }
              return null
            }
          } // Simula sock do WhatsApp
        }
        
        try {
          console.log('🚀 Executando módulo:', moduleName)
          const result = module.events.onMessage(moduleCtx)
          console.log('✅ Módulo executado, resultado:', result)
        } catch (err) {
          console.log('❌ Erro ao executar módulo:', err)
          testResponses.set(sessionId, 'Erro ao processar módulo')
        }
      } else {
        console.log('❌ Módulo não encontrado ou sem handler:', moduleName)
        testResponses.set(sessionId, `Módulo ${moduleName} não disponível`)
      }
      return false
    }
  }
}

// Limpar sessão de teste
router.delete('/:companyId/session', auth, (req, res) => {
  try {
    const { companyId } = req.params
    const sessionsToDelete = []
    
    for (const [key, value] of testSessions.entries()) {
      if (key.startsWith(companyId)) {
        sessionsToDelete.push(key)
      }
    }
    
    sessionsToDelete.forEach(key => testSessions.delete(key))
    
    res.json({ success: true, deleted: sessionsToDelete.length })
  } catch (err) {
    console.log('Erro ao limpar sessão:', err)
    res.status(500).json({ error: 'Erro ao limpar sessão' })
  }
})

// Processar mensagem de teste
router.post('/:companyId/message', auth, async (req, res) => {
  try {
    const { companyId } = req.params
    const { message, sessionId } = req.body

    console.log('📨 Teste de mensagem recebida:', { companyId, message, sessionId })

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)
    if (!fs.existsSync(configPath)) {
      console.log('❌ Empresa não encontrada:', configPath)
      return res.status(404).json({ error: 'Empresa não encontrada' })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const modules = loadModules(config.modules || [])

    console.log('📦 Módulos carregados:', modules.map(m => m.name))

    // Usar sessionId específico ou criar novo
    const actualSessionId = sessionId || `${companyId}_${Date.now()}`
    
    // Limpar resposta anterior
    testResponses.delete(actualSessionId)

    // Criar contexto simulado com captura de resposta
    const ctx = createTestContext(companyId, message, config, modules, actualSessionId)

    console.log('🎭 Contexto criado, executando assistant...')

    // Encontrar e executar o módulo assistant
    const assistantModule = modules.find(m => m.name === 'assistant')
    
    if (!assistantModule || !assistantModule.events || !assistantModule.events.onMessage) {
      console.log('❌ Módulo assistant não encontrado')
      return res.json({
        success: false,
        error: 'Módulo assistant não encontrado ou sem handler'
      })
    }

    // Executar a lógica do assistant
    const result = await assistantModule.events.onMessage(ctx)

    console.log('✅ Assistant executado, resultado:', result)
    console.log('💬 Resposta capturada:', testResponses.get(actualSessionId))

    // Obter a resposta capturada
    const responseText = testResponses.get(actualSessionId)

    res.json({
      success: true,
      sessionId: actualSessionId,
      session: ctx.session,
      message: responseText || null,
      processed: true
    })

  } catch (err) {
    console.log('❌ Erro ao processar mensagem de teste:', err)
    res.status(500).json({ error: 'Erro ao processar mensagem' })
  }
})

// Obter mensagem de boas-vindas inicial
router.get('/:companyId/welcome', auth, async (req, res) => {
  try {
    const { companyId } = req.params

    const configPath = path.join(__dirname, `../../tenants/${companyId}/config.json`)
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Empresa não encontrada' })
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const modules = loadModules(config.modules || [])

    // Criar contexto para mensagem de boas-vindas
    const ctx = {
      body: 'oi',
      from: 'test_user',
      sender: 'test_user',
      client: {
        id: companyId,
        config: config,
        modules: modules
      },
      session: {
        flow: 'assistant',
        step: 'start'
      },
      
      reply: async (text) => {
        return { text, type: 'text' }
      },
      
      setSession: (newSession) => {
        ctx.session = newSession
      },
      
      gotoFlow: () => false,
      
      // Simula sock do WhatsApp
      sock: {
        sendMessage: async (to, content) => {
          if (content.image) {
            const text = content.caption || '[Imagem]'
            return { text, type: 'text' }
          }
          if (content.text) {
            return { text: content.text, type: 'text' }
          }
          return null
        }
      }
    }

    // Executar assistant para gerar mensagem de boas-vindas
    const assistantModule = modules.find(m => m.name === 'assistant')
    
    if (!assistantModule || !assistantModule.events || !assistantModule.events.onMessage) {
      return res.json({
        success: false,
        error: 'Módulo assistant não encontrado'
      })
    }

    await assistantModule.events.onMessage(ctx)

    // A mensagem de boas-vindas é gerada no step 'start'
    // Vamos reconstruí-la manualmente para enviar ao frontend
    const welcomeMessage = config.welcomeMessage ||
`✨ Olá! Seja bem-vindo(a) à *${config.name}*.

Sou *${config.agentName || 'Bella'}*, sua atendente virtual. 😊

Será um prazer atender você hoje!

Para darmos início ao seu atendimento, escolha uma das opções abaixo digitando apenas o número correspondente:
`

    let menuText = welcomeMessage

    const menuModules = modules
      .filter(module => module.menu)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))

    menuModules.forEach((module, index) => {
      menuText += `${index + 1} - ${module.menu.label}\n`
    })

    menuText += '9 - Suporte Humano'

    res.json({
      success: true,
      message: menuText,
      menuItems: menuModules.map((m, i) => ({
        number: i + 1,
        name: m.name,
        label: m.menu.label
      }))
    })

  } catch (err) {
    console.log('Erro ao obter mensagem de boas-vindas:', err)
    res.status(500).json({ error: 'Erro ao obter mensagem de boas-vindas' })
  }
})

module.exports = router
