# Backend - Meu Barbeiro

API REST em Node.js/Express

## Setup
```bash
cd backend
npm install
cp .env.example .env
# preencha DATABASE_URL no .env
npm run db:init
npm run dev
```

## Erro ECONNREFUSED 127.0.0.1:5432
Esse erro indica que o backend nao conseguiu conectar no PostgreSQL.

Checklist rapido:
1. Configure `DATABASE_URL` em `backend/.env`.
2. Se usar banco local, garanta o PostgreSQL ativo na porta `5432`.
3. Rode `npm run db:init` para criar as tabelas.

## Estrutura
- /src/routes - Rotas da API
- /src/controllers - Lógica dos endpoints
- /src/models - Modelos de dados
- /src/middleware - Middlewares
- /src/services - Serviços externos
