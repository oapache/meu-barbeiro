# Meu Barbeiro - Planejamento Completo

## 1. Stack Tecnológica

| Componente | Tecnologia |
|------------|------------|
| Frontend | Next.js 14 (PWA) + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | JWT |
| Notifications | WhatsApp API |

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│              (Next.js PWA)                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│                   API                        │
│              (Node.js/Express)               │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │  WhatsApp API │
│   (Supabase)  │   │   (Envio)     │
└───────────────┘   └───────────────┘
```

## 3. Diferenciais do Meu Barbeiro

- ✅ Versão **FREE** para 1 barbeiro
- ✅ Foco em **WhatsApp** (brasileiro ama WhatsApp)
- ✅ **PWA** — não precisa baixar (webapp)
- ✅ Interface **moderna e minimalista**
- ✅ Mais **barato** que AppBarber (R$ 55,90)

## 4. Funcionalidades MVP

### Módulo Cliente
- [ ] Cadastro/login (email)
- [ ] Ver barbearias próximas
- [ ] Agendamento online
- [ ] Lista de espera
- [ ] Histórico de cortes
- [ ] Programa de fidelidade
- [ ] Receber promoções via WhatsApp

### Módulo Barbeiro
- [ ] Cadastro da barbearia
- [ ] Gestão de serviços (cortes, barba, etc)
- [ ] Agenda/dashboard
- [ ] Lista de clientes
- [ ] Confirmação de agendamento
- [ ] Relatórios básicos

## 5. Estrutura de Dados (Draft)

### Tabelas Principais
- `users` — clientes e barbeiros
- `barbearias` — dados da barbearia
- `servicos` — serviços oferecidos
- `agendamentos` — jadwal de horários
- `fidelidade` — pontos dos clientes

## 6. Prioridades de Desenvolvimento

1. **Setup** — Backend + Frontend
2. **Auth** — Cadastro de usuários
3. **Barbearia** — CRUD completo
4. **Serviços** — Cadastro de serviços
5. **Agendamento** — Sistema de jadwal
6. **WhatsApp** — Integração de lembretes
7. **Fidelidade** — Programa de pontos

---

*Planejamento em andamento...*
