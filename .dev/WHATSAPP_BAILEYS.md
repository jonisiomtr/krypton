# Guia de Implementação WhatsApp com Baileys 7.0.0

## 📋 Visão Geral

Este guia explica como implementar conexões WhatsApp funcionais usando a biblioteca `@whiskeysockets/baileys` versão 7.0.0.

## 🔧 Pré-requisitos

### Versão do Baileys
```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^7.0.0-rc14"
  }
}
```

### Dependências Necessárias
```bash
npm install @whiskeysockets/baileys@latest --legacy-peer-deps
npm install @hapi/boom
npm install pino
npm install qrcode
npm install qrcode-terminal
npm install p-queue
```

## 📁 Estrutura de Arquivos

```
src/
├── bootstrap/
│   └── startClient.js          # Conexão WhatsApp das empresas
├── api/
│   └── routes/
│       └── superadmin-whatsapp.js  # Conexão WhatsApp Super Admin
├── superadmin/
│   └── whatsapp-auth/           # Sessão Super Admin
└── sessions/
    └── {companyId}/             # Sessões das empresas
```

## 🚀 Implementação Completa

### 1. startClient.js (Conexão das Empresas)

```javascript
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const QRCode = require('qrcode-terminal')
const QRCodeData = require('qrcode')
const PQueue = require('p-queue').default

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys')

const { Boom } = require('@hapi/boom')

async function startClient(clientId, force = false) {
  const sessionPath = path.join(__dirname, `../../sessions/${clientId}`)

  // 1. Carregar estado de autenticação
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

  // 2. Buscar versão mais recente do WhatsApp Web
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`📦 Versão do Baileys: ${version.join('.')} (latest: ${isLatest})`)

  // 3. Criar logger silencioso
  const logger = pino({ level: 'silent' })

  // 4. Criar socket com configuração correta
  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false // Vamos mostrar QR manualmente
  })

  // 5. Processar eventos usando a nova API do Baileys 7.0.0
  sock.ev.process(async (events) => {

    // CONEXÃO
    if (events['connection.update']) {
      const update = events['connection.update']
      const { connection, lastDisconnect, qr } = update

      // QR Code
      if (qr) {
        console.log(`📱 QR Code recebido para ${clientId}!`)
        QRCode.generate(qr, { small: true })

        // Converter QR para data URL para o frontend
        const qrDataUrl = await QRCodeData.toDataURL(qr)

        // Emitir via Socket.IO
        if (global.io) {
          global.io.emit('connection-update', {
            clientId,
            qr: qrDataUrl,
            connected: false
          })
        }
      }

      // Conexão aberta
      if (connection === 'open') {
        console.log(`✅ ${clientId} conectado com sucesso!`)
        // Inicializar módulos, armazenamento, etc.
      }

      // Conexão fechada
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
          : true

        if (shouldReconnect) {
          setTimeout(() => startClient(clientId), 5000)
        } else {
          // Limpar sessão se foi deslogado
          fs.rmSync(sessionPath, { recursive: true, force: true })
        }
      }
    }

    // CREDENCIAIS
    if (events['creds.update']) {
      await saveCreds()
      console.log(`💾 Credenciais salvas para ${clientId}`)
    }

    // MENSAGENS
    if (events['messages.upsert']) {
      const upsert = events['messages.upsert']

      if (upsert.type === 'notify') {
        for (const msg of upsert.messages) {
          if (!msg.key.fromMe) {
            // Processar mensagem
            await handleMessage({ clientId, sock, message: msg })
          }
        }
      }
    }
  })
}
```

### 2. superadmin-whatsapp.js (Conexão Super Admin)

```javascript
const express = require('express')
const fs = require('fs')
const path = require('path')
const QRCodeData = require('qrcode')
const pino = require('pino')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')

const authPath = path.join(__dirname, '../../superadmin/whatsapp-auth')

async function startSuperAdminWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authPath)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  const logger = pino({ level: 'silent' })

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false
  })

  sock.ev.process(async (events) => {
    if (events['connection.update']) {
      const update = events['connection.update']
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        const qrDataUrl = await QRCodeData.toDataURL(qr)
        // Emitir via Socket.IO
        globalIo.emit('superadmin-connection-update', {
          qr: qrDataUrl,
          connected: false
        })
      }

      if (connection === 'open') {
        console.log('✅ Super Admin WhatsApp conectado!')
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
          : false

        if (!shouldReconnect) {
          fs.rmSync(authPath, { recursive: true, force: true })
        }
      }
    }

    if (events['creds.update']) {
      await saveCreds()
    }

    if (events['messages.upsert']) {
      const upsert = events['messages.upsert']
      if (upsert.type === 'notify') {
        for (const msg of upsert.messages) {
          if (!msg.key.fromMe) {
            // Responder automaticamente
            await sock.sendMessage(msg.key.remoteJid, {
              text: 'Olá, somos o Super Admin'
            })
          }
        }
      }
    }
  })
}
```

## 🔑 Diferenças entre API Antiga e Nova (7.0.0)

### API Antiga (antes do 7.0.0)
```javascript
// Listener individual
sock.ev.on('connection.update', handler)
sock.ev.on('creds.update', saveCreds)
sock.ev.on('messages.upsert', handler)
```

### API Nova (7.0.0)
```javascript
// Processamento em lote (mais eficiente)
sock.ev.process(async (events) => {
  if (events['connection.update']) { ... }
  if (events['creds.update']) { await saveCreds() }
  if (events['messages.upsert']) { ... }
})
```

## ⚙️ Configuração Importante

### makeCacheableSignalKeyStore
**OBRIGATÓRIO** no Baileys 7.0.0 para performance:
```javascript
auth: {
  creds: state.creds,
  keys: makeCacheableSignalKeyStore(state.keys, logger)
}
```

### fetchLatestBaileysVersion
**RECOMENDADO** para sempre usar a versão mais recente do WhatsApp Web:
```javascript
const { version, isLatest } = await fetchLatestBaileysVersion()
const sock = makeWASocket({ version, ... })
```

## 🐛 Erros Comuns e Soluções

### 1. Erro: "Stream Errored (restart required)"
**Causa:** Versão antiga do Baileys com sync automático problemático
**Solução:** Atualizar para 7.0.0-rc14 e usar `ev.process()`

### 2. Erro: "Invalid account signature"
**Causa:** Sessão corrompida ou versão incompatível
**Solução:** Limpar diretório de sessão e recriar
```bash
rm -rf sessions/{companyId}
```

### 3. Erro: "Connection Failure"
**Causa:** Versão muito antiga do Baileys
**Solução:** Atualizar para versão mais recente

## 📊 Fluxo de Conexão

```
1. Iniciar servidor
   ↓
2. startClient(clientId) é chamado
   ↓
3. useMultiFileAuthState(sessionPath) carrega sessão
   ↓
4. fetchLatestBaileysVersion() busca versão
   ↓
5. makeWASocket() cria conexão
   ↓
6. ev.process() aguarda eventos
   ↓
7. QR Code é gerado (se sessão não existe)
   ↓
8. Usuário escaneia QR no celular
   ↓
9. connection === 'open' → sucesso!
   ↓
10. creds.update → salva sessão automaticamente
   ↓
11. Sessão persiste em sessions/{clientId}/
   ↓
12. Reinicialização → reconecta automaticamente
```

## 🧪 Teste de Conexão

### 1. Limpar sessão existente
```bash
rm -rf sessions/ale
```

### 2. Iniciar servidor
```bash
cd src
node app.js
```

### 3. Verificar logs
```
📦 Versão do Baileys: 2.3000.1043857760 (latest: true)
🚀 ale iniciado
📱 QR Code recebido para ale!
💾 Credenciais salvas para ale
✅ ale conectado com sucesso!
```

### 4. Acessar painel e escanear QR
- Login no painel da empresa
- Clique em "WhatsApp"
- Escaneie o QR code

### 5. Verificar persistência
- Pare o servidor
- Reinicie o servidor
- Conexão deve se reconectar automaticamente sem novo QR

## 🔒 Segurança

### Proteção de Sessões
- Cada empresa tem sua própria sessão em `sessions/{companyId}/`
- Super Admin tem sessão separada em `superadmin/whatsapp-auth`
- Sessões contêm credenciais sensíveis (tokens, chaves)

### Limpeza ao Deslogar
```javascript
if (connection === 'close') {
  if (statusCode === DisconnectReason.loggedOut) {
    fs.rmSync(sessionPath, { recursive: true, force: true })
  }
}
```

## 📚 Referências

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [Baileys Example](https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts)
- [Baileys Wiki](https://baileys.wiki)

## ✅ Checklist de Implementação

- [ ] Instalar @whiskeysockets/baileys@latest
- [ ] Usar `ev.process()` em vez de `ev.on()`
- [ ] Usar `makeCacheableSignalKeyStore` no auth
- [ ] Usar `fetchLatestBaileysVersion()` para versão
- [ ] Processar `events['creds.update']` e chamar `saveCreds()`
- [ ] Processar `events['connection.update']` para QR e status
- [ ] Processar `events['messages.upsert']` para mensagens
- [ ] Implementar reconexão automática
- [ ] Limpar sessão ao deslogar
- [ ] Testar persistência de sessão

## 🎯 Resultado Esperado

Após implementar este guia:
- ✅ QR code aparece no painel
- ✅ Escaneamento funciona corretamente
- ✅ Conexão estabelece com sucesso
- ✅ Credenciais são salvas automaticamente
- ✅ Sessão persiste após reinicialização
- ✅ Reconexão automática funciona
- ✅ Mensagens são recebidas e processadas
