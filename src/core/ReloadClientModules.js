const fs = require('fs')
const path = require('path')

const ClientManager = require('./ClientManager')
const loadModules = require('./ModuleLoader')

module.exports = function reloadClientModules(clientId) {
  const client = ClientManager.get(clientId)

  const configPath = path.join(__dirname, `../tenants/${clientId}/config.json`)
  if (!fs.existsSync(configPath)) {
    console.log(`❌ Config não encontrada: ${clientId}`)
    return false
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  const modules = loadModules(config.modules || [])

  // Verificar se o módulo WhatsApp está sendo ativado
  const wasWhatsAppActive = client?.modules?.some(m => m.name === 'assistant')
  const isWhatsAppActive = modules.some(m => m.name === 'assistant')

  // Se o módulo WhatsApp estava inativo e agora está ativo, reiniciar o cliente
  if (!wasWhatsAppActive && isWhatsAppActive) {
    console.log(`🔄 Módulo WhatsApp ativado para ${clientId}, reiniciando cliente...`)
    try {
      const { startClient } = require('../bootstrap/startClient')
      startClient(clientId, true) // force = true para reiniciar
    } catch (err) {
      console.log('Erro ao reiniciar cliente:', err)
      return false
    }
    return true
  }

  if (!client) {
    console.log(`❌ Cliente não encontrado: ${clientId}, iniciando cliente...`)
    try {
      const { startClient } = require('../bootstrap/startClient')
      startClient(clientId)
    } catch (err) {
      console.log('Erro iniciando cliente:', err)
      return false
    }
    return true
  }

  client.modules = modules
  client.config = config

  console.log(`🔄 Módulos atualizados: ${clientId}`)

  return true
}