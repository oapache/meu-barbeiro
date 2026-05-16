# O Corte Certo

App de barbearia — Agendamento online e gestão.

## Diferenciais
- Foco em WhatsApp
- Interface moderna
- PWA (não precisa baixar)

## Stack
- Frontend: Next.js (PWA)
- Backend: Node.js/Express
- Bot: Node.js/Express separado para WhatsApp/ChatBot
- Database: MySQL 8 (Docker local / Hostinger)
- Auth: JWT + WhatsApp

## Arquitetura de deploy
- Frontend público: `https://ocortecerto.com`
- API principal: `https://api.ocortecerto.com/api`
- Bot WhatsApp: pasta `bot/`, preparado para rodar em VPS própria

O backend não carrega mais o runtime do WhatsApp. Quando precisar enviar mensagens ou pausar o bot por assinatura, ele chama o serviço `bot` por `BOT_SERVICE_URL` usando `BOT_SERVICE_TOKEN`.

## Banco local
```bash
docker compose up -d mysql
```

O MySQL local sobe na porta `3307` e persiste os dados no volume nomeado do Compose.

## Funcionalidades MVP
- Cadastro de clientes
- Agendamento online
- Gestão de serviços
- Gestão de barbeiros
- Lista de espera
- Lembretes WhatsApp
- Histórico de clientes

## Como contribuir
Em desenvolvimento...
