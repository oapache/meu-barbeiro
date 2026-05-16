# Backend - O Corte Certo

API REST em Node.js/Express. O runtime do ChatBot/WhatsApp fica separado na pasta `../bot`.

## Setup
```bash
docker compose up -d mysql
cd backend
npm install
cp .env.example .env
# preencha MYSQL_*, JWT_SECRET, APP_URL, API_PUBLIC_URL e CORS_ORIGIN no .env
npm run db:init
npm run dev
```

## Produção
Configure o backend para responder em `https://api.ocortecerto.com` no proxy/hosting e mantenha:

```env
APP_URL=https://ocortecerto.com
API_PUBLIC_URL=https://api.ocortecerto.com
CORS_ORIGIN=https://ocortecerto.com,https://www.ocortecerto.com
```

Se o backend precisar acionar o bot da VPS, configure:

```env
BOT_SERVICE_URL=https://seu-host-do-bot
BOT_SERVICE_TOKEN=um-token-forte-compartilhado-com-o-bot
```

As rotas públicas do ChatBot não são mais montadas no backend principal.

## Erro ECONNREFUSED 127.0.0.1:3307
Esse erro indica que o backend nao conseguiu conectar no MySQL.

Checklist rapido:
1. Configure `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` e `MYSQL_DATABASE` em `backend/.env`.
2. Se usar banco local via Docker, rode `docker compose up -d mysql` na raiz do projeto.
3. Garanta o MySQL ativo na porta `3307`.
4. Rode `npm run db:init` para criar as tabelas.

## Estrutura
- /src/routes - Rotas da API
- /src/controllers - Lógica dos endpoints
- /src/models - Modelos de dados
- /src/middleware - Middlewares
- /src/services - Serviços externos e cliente HTTP do bot
