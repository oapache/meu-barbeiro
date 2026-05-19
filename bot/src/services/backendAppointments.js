const config = require('../config');

function normalizarTexto(valor = '') {
  return String(valor || '').trim();
}

function normalizarData(valor = '') {
  const match = String(valor || '').match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function normalizarHora(valor = '') {
  const match = String(valor || '').match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

function serializarAgendamento(agendamento = {}) {
  return {
    id: normalizarTexto(agendamento.id),
    barbearia_id: normalizarTexto(agendamento.barbearia_id || agendamento.barbeariaId),
    servico_id: normalizarTexto(agendamento.servico_id || agendamento.servicoId),
    servico_nome_snapshot: normalizarTexto(agendamento.servico_nome_snapshot || agendamento.servico_nome),
    servico_preco_snapshot: Number(agendamento.servico_preco_snapshot || agendamento.servico_preco || 0),
    cliente_id: normalizarTexto(agendamento.cliente_id),
    cliente_nome_externo: normalizarTexto(agendamento.cliente_nome_externo || agendamento.cliente_nome),
    cliente_telefone_externo: normalizarTexto(agendamento.cliente_telefone_externo || agendamento.cliente_telefone),
    barbeiro_id: normalizarTexto(agendamento.barbeiro_id),
    data: normalizarData(agendamento.data),
    hora: normalizarHora(agendamento.hora),
    status: normalizarTexto(agendamento.status) || 'pendente',
    chatbot_session_id: normalizarTexto(agendamento.chatbot_session_id || agendamento.chatbotSessionId),
    observacoes: normalizarTexto(agendamento.observacoes),
    origem: normalizarTexto(agendamento.origem) || 'whatsapp',
  };
}

async function syncAppointmentToBackend(agendamento = {}) {
  if (!config.backendSync.enabled) {
    const error = new Error('Sincronização com a API principal desativada.');
    error.code = 'BACKEND_SYNC_DISABLED';
    throw error;
  }

  if (!config.botServiceToken) {
    const error = new Error('BOT_SERVICE_TOKEN não configurado no bot.');
    error.code = 'BOT_SERVICE_TOKEN_NOT_CONFIGURED';
    throw error;
  }

  const appointment = serializarAgendamento(agendamento);
  if (!appointment.id || !appointment.barbearia_id || !appointment.data || !appointment.hora) {
    const error = new Error('Agendamento inválido para sincronização com a API principal.');
    error.code = 'INVALID_APPOINTMENT_SYNC_PAYLOAD';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.backendSync.timeoutMs);

  try {
    const response = await fetch(`${config.backendSync.apiUrl}/internal/bot/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.botServiceToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appointment }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || 'Falha ao sincronizar agendamento com a API principal.');
      error.code = payload?.code || 'BACKEND_APPOINTMENT_SYNC_FAILED';
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  serializarAgendamento,
  syncAppointmentToBackend,
};
