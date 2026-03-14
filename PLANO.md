# Plano de Desenvolvimento - Meu Barbeiro

## Prioridade 1: Conexão Frontend-Backend

### 1.1 Configurar variáveis de ambiente
- [ ] Criar .env.local no frontend com API URL
- [ ] Configurar CORS no backend
- [ ] Testar comunicação entre frontend e backend

### 1.2 Integrar API Service
- [ ] Conectar ApiService com endpoints reais
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states

---

## Prioridade 2: Sistema de Auth Completo

### 2.1 Backend
- [ ] Implementar geração de JWT tokens
- [ ] Criar middleware de autenticação
- [ ] Proteger rotas privadas

### 2.2 Frontend
- [ ] Criar contexto de autenticação (AuthContext)
- [ ] Implementar login com JWT
- [ ] Criar registro de usuários
- [ ] Proteger rotas privadas
- [ ] Salvar token no localStorage
- [ ] Implementar logout

---

## Prioridade 3: Dashboard do Barbeiro

### 3.1 Gestão da Barbearia
- [ ] Criar/editar perfil da barbearia
- [ ] Upload de logo e fotos
- [ ] Configurar horários de funcionamento

### 3.2 Gestão de Serviços
- [ ] CRUD completo de serviços
- [ ] Preços e duração
- [ ] Ativar/desativar serviços

### 3.3 Gestão de Agendamentos
- [ ] Visualizar agenda do dia
- [ ] Confirmar/cancelar agendamentos
- [ ] Calendário com disponibilidade

### 3.4 Gestão de Clientes
- [ ] Lista de clientes
- [ ] Histórico de atendimentos
- [ ] Contato via WhatsApp

---

## Prioridade 4: Sistema de Agendamento

### 4.1 Backend
- [ ] Calendário/disponibilidade
- [ ] Verificar conflitos de horário
- [ ] Notificações (email/WhatsApp)

### 4.2 Frontend
- [ ] Seleção de serviço
- [ ] Escolha de profissional (opcional)
- [ ] Calendário com horários disponíveis
- [ ] Confirmação de agendamento

---

## Prioridade 5: Busca de Barbearias

### 5.1 Backend
- [ ] Busca por nome/localização
- [ ] Filtros (nota, preço, distância)
- [ ] Ordenação

### 5.2 Frontend
- [ ] Mapa com barbearias
- [ ] Lista filtrável
- [ ] Detalhes da barbearia

---

## Prioridade 6: Perfil do Cliente

### 6.1 Frontend
- [ ] Meus agendamentos
- [ ] Histórico de cortes
- [ ] Programa de fidelidade
- [ ] Editar perfil

---

## Prioridade 7: Integração WhatsApp

### 7.1 Backend
- [ ] Template de confirmação
- [ ] Template de lembrete
- [ ] Template de retorno

### 7.2 Frontend
- [ ] Botão de agendamento via WhatsApp
- [ ] Link direto com mensagem pré-preenchida

---

## Tarefas Técnicas Comuns

- [ ] Validação de formulários (Zod)
- [ ] Tratamento de erros
- [ ] Loading states
- [ ] Responsive design
- [ ] Testes unitários
- [ ] Deploy (Vercel + Render/Neon)

---

## Ordem Sugerida de Desenvolvimento

1. Conexão Frontend-Backend
2. Auth Completo
3. Dashboard Barbeiro (básico)
4. Busca de Barbearias
5. Sistema de Agendamento
6. Perfil Cliente
7. Integração WhatsApp

---

*Plano criado em: 2026-03-14*
