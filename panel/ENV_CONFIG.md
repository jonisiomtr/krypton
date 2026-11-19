# Configuração de Ambiente - API

## Desenvolvimento Local
Para testar localmente, o arquivo `.env.development` já está configurado com:
```
VITE_API_URL=http://localhost:4177
```

Isso faz com que o painel se conecte diretamente à API rodando na porta 4177.

## Produção
Para produção, o arquivo `.env.production` está configurado com:
```
VITE_API_URL=/api
```

Isso usa caminhos relativos, funcionando quando o frontend e backend estão no mesmo domínio.

## Como Mudar Entre Ambientes

### Para Testar Localmente (Desenvolvimento)
```bash
npm run dev
```
- Automaticamente usa `.env.development`
- Conecta em `http://localhost:4177`
- Proxy configurado no Vite para evitar CORS

### Para Produção
```bash
npm run build
```
- Automaticamente usa `.env.production`
- Usa caminho `/api` (relativo ao domínio atual)
- Move a pasta `dist` para onde o backend serve

### Para Usar Outra Porta Local
Se precisar mudar a porta da API localmente:

1. Edite `.env.development`:
```
VITE_API_URL=http://localhost:SUA_PORTA
```

2. Edite `vite.config.js` no proxy:
```js
proxy: {
  '/api': {
    target: 'http://localhost:SUA_PORTA',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### Para Voltar para Produção
Basta não alterar o `.env.production`, ele já está configurado corretamente.

## Estrutura de Arquivos

- `.env` - Configuração padrão (usada se não houver ambiente específico)
- `.env.development` - Configuração para `npm run dev`
- `.env.production` - Configuração para `npm run build`

O Vite automaticamente usa o arquivo correto baseado no comando.
