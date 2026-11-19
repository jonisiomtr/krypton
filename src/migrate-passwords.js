const fs = require('fs')
const bcrypt = require('bcrypt')
const path = require('path')

const tenantsPath = path.join(__dirname, 'tenants')

if (!fs.existsSync(tenantsPath)) {
  console.log('❌ Pasta tenants não encontrada em:', tenantsPath)
  process.exit(1)
}

const tenants = fs.readdirSync(tenantsPath)

console.log('🔄 Iniciando migração de senhas...')

tenants.forEach(tenantId => {
  const configPath = path.join(tenantsPath, tenantId, 'config.json')
  
  if (!fs.existsSync(configPath)) {
    console.log(`⏭️  Pulando ${tenantId} (config não existe)`)
    return
  }
  
  const config = JSON.parse(fs.readFileSync(configPath))
  
  if (config.password && config.password.length < 60) {
    // É texto puro, migrar
    const hash = bcrypt.hashSync(config.password, 10)
    config.password = hash
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log(`✅ Migrado: ${tenantId}`)
  } else {
    console.log(`⏭️  Pulando ${tenantId} (já está em hash)`)
  }
})

console.log('✅ Migração concluída!')
