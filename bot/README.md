# Bot - O Corte Certo

Serviço independente do ChatBot WhatsApp para rodar em VPS/LXC separada.

O serviço usa Baileys para manter sessões WhatsApp sem Chromium/Puppeteer, Redis/BullMQ para filas e MySQL compartilhado com a API principal como fonte da verdade.

## Setup

```bash
cd bot
npm install
cp .env.example .env
npm run start:api
```

Para produção com PM2 global:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

Processos:

- `ocorte-bot-api`: API HTTP do bot.
- `ocorte-bot-worker`: sessões Baileys e filas de mensagens.
- `ocorte-bot-scheduler`: limpeza leve, reconexão e monitoramento.

## Redis

O LXC deve ter Redis local disponível. Configuração padrão:

```env
REDIS_URL=redis://127.0.0.1:6379
```

## Rotas

- `GET /health` retorna status do serviço, Redis, filas, uptime e sessões ativas.
- `GET /api/chatbot/whatsapp/status`
- `POST /api/chatbot/whatsapp/start`
- `POST /api/chatbot/whatsapp/reset`
- `POST /api/chatbot/whatsapp/stop`
- `GET /api/chatbot/metrics`
- `GET /api/chatbot/settings`
- `PUT /api/chatbot/settings`
- `GET /api/chatbot/sessions`
- `GET /api/chatbot/sessions/:id`
- `PUT /api/chatbot/sessions/:id/review`

As rotas `/api/chatbot/internal/*` são chamadas pela API principal e devem usar `BOT_SERVICE_TOKEN` em produção.

Em produção, você pode expor o bot por um subdomínio próprio e configurar `NEXT_PUBLIC_BOT_API_URL`, ou encaminhar `/api/chatbot/*` no proxy de `api.ocortecerto.com` para este serviço.

## Observações

- Não use `whatsapp-web.js` neste serviço. O motor oficial do bot agora é Baileys.
- As sessões ficam em `BOT_AUTH_DATA_PATH`, por padrão `.baileys_auth`.
- O worker segura as conexões WhatsApp em memória; a API HTTP apenas enfileira comandos e consulta estado no Redis.
