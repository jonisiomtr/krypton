# 🚀 KRYPTON - Guia de Deploy no Render

Este documento contém todas as instruções para fazer deploy do KRYPTON no Render, alternar entre produção e desenvolvimento local, e atualizar o sistema.

---

## 📋 Índice

1. [Deploy Inicial no Render](#deploy-inicial-no-render)
2. [Deploy Manual (Atualizações)](#deploy-manual-atualizações)
3. [Configuração: Produção vs Desenvolvimento Local](#configuração-produção-vs-desenvolvimento-local)
4. [Testar em Local (localhost)](#testar-em-local-localhost)
5. [Solução de Problemas Comuns](#solução-de-problemas-comuns)

---

## 🎯 Deploy Inicial no Render

### Pré-requisitos

- Conta no GitHub com acesso ao repositório `jonisiomtr/krypton`
- Conta no Render (ou outra plataforma de deploy)

### 1. Configurar Backend (krypton-backend)

1. Acesse: https://dashboard.render.com/
2. Clique em **"New"** → **"Web Service"**
3. Conecte com sua conta do GitHub
4. Selecione o repositório **"krypton"**
5. Configure:
   - **Name**: `krypton-backend`
   - **Region**: São Paulo (ou o mais próximo)
   - **Branch**: `main`
   - **Root Directory**: `/src`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node app.js`
6. Clique em **"Create Web Service"**
7. Espere o deploy finalizar

### 2. Configurar Painel (krypton-painel)

1. No Render, clique em **"New"** → **"Static Site"**
2. Selecione o repositório **"krypton"**
3. Configure:
   - **Name**: `krypton-painel`
   - **Region**: São Paulo
   - **Branch**: `main`
   - **Root Directory**: `/panel`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `panel/dist`
   - **Start Command**: (deixe em branco - não usado para Static Site)
4. Clique em **"Create Static Site"**
5. Espere o deploy finalizar

### 3. Salvar URLs Geradas

Após os deploys, anote os URLs:
- **Backend**: `https://krypton-backend-7ki7.onrender.com` (ou similar)
- **Painel**: `https://krypton-painel.onrender.com` (ou similar)

---

## 🔄 Deploy Manual (Atualizações)

Sempre que fizer alterações no código e quiser atualizar a produção:

### 1. Commit e Push das Alterações

```bash
cd "C:\Users\VENDAS\Documents\Documentos\elon musck\2026"

# Adicionar alterações
git add .

# Commit com mensagem descritiva
git commit -m "Descrição da alteração"

# Enviar para GitHub
git push
```

### 2. Atualizar Backend no Render

1. Acesse **krypton-backend** no Render
2. Clique em **"Manual Deploy"** → **"Deploy latest commit"**
3. Espere o deploy finalizar
4. **Importante**: Atualize sempre o backend antes do painel

### 3. Atualizar Painel no Render

1. Acesse **krypton-painel** no Render
2. Clique em **"Manual Deploy"** → **"Deploy latest commit"**
3. Espere o deploy finalizar

---

## ⚙️ Configuração: Produção vs Desenvolvimento Local

### Produção (Render)

As configurações de produção estão em:
- `panel/.env.production` - URL do backend em produção
- Backend: Usa a porta definida pelo Render (automaticamente)

**URLs de Produção:**
- Backend: `https://kromium-backend-7ki7.onrender.com`
- Painel: `https://krypton-painel.onrender.com`

### Desenvolvimento Local (localhost)

**Backend:**
```bash
cd src
node app.js
```
- Roda em: `http://localhost:4177`

**Painel:**
```bash
cd panel
npm run dev
```
- Roda em: `http://localhost:5000`

**Variáveis de Ambiente Local:**
- Backend: `.env` (na raiz do projeto)
- Painel: `panel/.env.development` (ou usa fallback para localhost)

---

## 💻 Testar em Local (localhost)

### Iniciar Backend Local

```bash
cd "C:\Users\VENDAS\Documents\Documentos\elon musck\2026\src"
node app.js
```

Backend estará rodando em: `http://localhost:4177`

### Iniciar Painel Local

```bash
cd "C:\Users\VENDAS\Documentos\Documentos\elon musck\2026\panel"
npm run dev
```

Painel estará rodando em: `http://localhost:5000`

### Acessar Painel Local

Acesse no navegador: `http://localhost:5000`

**Login de teste:**
- Usuário: `admin`
- Senha: `123`

---

## 🔧 Mudar de Local para Produção

### 1. Commit e Push

```bash
cd "C:\Users\VENDAS\Documents\Documentos\elon musck\2026"
git add .
git commit -m "Mudança pronta para produção"
git push
```

### 2. Deploy no Render

Siga o passo [Deploy Manual](#deploy-manual-atualizações) acima.

### 3. Acessar Produção

Acesse: `https://krypton-painel.onrender.com`

---

## 🔙 Mudar de Produção para Local

### 1. Iniciar Serviços Locais

Siga o passo [Testar em Local](#testar-em-local-localhost) acima.

### 2. Acessar Local

Acesse: `http://localhost:5000`

---

## 🐛 Solução de Problemas Comuns

### Backend não está respondendo (404/500)

**Solução:**
1. Verifique os logs do backend no Render
2. Certifique-se que o Root Directory está `/src`
3. O Start Command deve ser `node app.js`

### Painel não conecta no backend

**Solução:**
1. Verifique se `panel/.env.production` tem a URL correta do backend
2. A URL deve ser sem `/api` no final (ex: `https://krypton-backend-7ki7.onrender.com`)
3. Atualize o painel no Render após mudar a URL

### Erro de Socket.io no painel

**Solução:**
1. Verifique se o backend está online
2. Atualize o painel para usar a URL correta sem `/api`
3. Verifique se a configuração CORS no backend aceita conexões externas

### Erro no build do painel

**Solução:**
1. Verifique se há erros de sintaxe CSS (como chaves `{}` mal fechadas)
2. Verifique se todas as dependências estão no `package.json`
3. O Publish Directory deve ser `panel/dist`

### Erro "ENOENT: no such file or directory" no Render

**Solução:**
1. Certifique-se que o Root Directory está correto:
   - Backend: `/src`
   - Painel: `/panel`
2. As pastas `src/tenants`, `src/uploads`, `src/sessions`, `src/sessionsData` devem existir (com arquivos `.gitkeep`)

### Git push rejeitado

**Solução:**
```bash
git pull --rebase
git push
```

Se houver conflitos, resolva manualmente ou use:
```bash
git reset --hard origin/main
git push
```

---

## 📝 Resumo Rápido

### Para Atualizar Produção
```bash
git add .
git commit -m "Descrição"
git push
```
Depois: Manual Deploy no Render (backend primeiro, depois painel)

### Para Voltar ao Local
```bash
# Terminal 1 - Backend
cd src
node app.js

# Terminal 2 - Painel
cd panel
npm run dev
```

### URLs Importantes
- **Local Backend**: `http://localhost:4177`
- **Local Painel**: `http://localhost:5000`
- **Produção Backend**: `https://krypton-backend-7ki7.onrender.com`
- **Produção Painel**: `https://krypton-painel.onrender.com`

---

## 🎓 Dicas

- **Sempre atualize o backend antes do painel** - o painel depende do backend
- **Verifique os logs no Render** se algo não funcionar
- **Teste em local antes de enviar para produção**
- **Mantenha o `.gitignore` atualizado** para não enviar dados sensíveis
- **Use commits descritivos** para facilitar rastreamento de problemas

---

**Criado em:** 20/11/2026
**Versão:** 1.0
