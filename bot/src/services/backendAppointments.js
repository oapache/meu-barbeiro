const config = require('../config');
const pool = require('../config/database');
const { ensureAgendamentoSchema } = require('./agendamentoSchema');

function normalizarTexto(valor = '') {
  return String(valor || '').trim();
}

function normalizarData(valor = '') {
  if (valor instanceof Date) {
    const ano = valor.getUTCFullYear();
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(valor.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  const match = String(valor || '').match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function normalizarHora(valor = '') {
  const match = String(valor || '').match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

async function requestBackend(path, { method = 'GET', body } = {}) {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.backendSync.timeoutMs);

  try {
    const response = await fetch(`${config.backendSync.apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.botServiceToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || 'Falha ao comunicar com a API principal.');
      error.code = payload?.code || 'BACKEND_REQUEST_FAILED';
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
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
    protocolo_atendimento: normalizarTexto(agendamento.protocolo_atendimento || agendamento.protocoloAtendimento),
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

  return requestBackend('/internal/bot/appointments', {
    method: 'POST',
    body: { appointment },
  });
}

async function fetchAppointmentByProtocol({ protocolo, barbeariaId, phoneNumber } = {}) {
  const normalizedProtocol = normalizarTexto(protocolo).replace(/\D/g, '');
  const normalizedBarbeariaId = normalizarTexto(barbeariaId);
  const normalizedPhone = normalizarTexto(phoneNumber);

  if (!normalizedProtocol || !normalizedBarbeariaId || !normalizedPhone) {
    const error = new Error('Protocolo, barbearia e telefone são obrigatórios.');
    error.code = 'INVALID_PROTOCOL_LOOKUP_PAYLOAD';
    throw error;
  }

  const params = new URLSearchParams({
    barbearia_id: normalizedBarbeariaId,
    phone_number: normalizedPhone,
  });

  return requestBackend(`/internal/bot/appointments/protocol/${encodeURIComponent(normalizedProtocol)}?${params.toString()}`);
}

async function rescheduleAppointmentInBackend({ appointmentId, barbeariaId, phoneNumber, data, hora } = {}) {
  const normalizedAppointmentId = normalizarTexto(appointmentId);
  const normalizedBarbeariaId = normalizarTexto(barbeariaId);
  const normalizedPhone = normalizarTexto(phoneNumber);
  const normalizedData = normalizarData(data);
  const normalizedHora = normalizarHora(hora);

  if (!normalizedAppointmentId || !normalizedBarbeariaId || !normalizedPhone || !normalizedData || !normalizedHora) {
    const error = new Error('Agendamento, barbearia, telefone, data e hora são obrigatórios.');
    error.code = 'INVALID_APPOINTMENT_RESCHEDULE_PAYLOAD';
    throw error;
  }

  return requestBackend(`/internal/bot/appointments/${encodeURIComponent(normalizedAppointmentId)}/reschedule`, {
    method: 'POST',
    body: {
      barbearia_id: normalizedBarbeariaId,
      phone_number: normalizedPhone,
      data: normalizedData,
      hora: normalizedHora,
    },
  });
}

async function markAppointmentBackendSyncStatus(appointmentId, status, errorMessage = '') {
  const id = normalizarTexto(appointmentId);
  if (!id) return;

  if (status === 'synced') {
    await pool.query(
      `UPDATE agendamentos
       SET backend_sync_status = $2,
           backend_sync_error = NULL,
           backend_synced_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, status]
    );
    return;
  }

  await pool.query(
    `UPDATE agendamentos
     SET backend_sync_status = $2,
         backend_sync_error = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, status || 'failed', normalizarTexto(errorMessage).slice(0, 1000) || null]
  );
}

async function syncPendingAppointmentsToBackend({ limit = 50 } = {}) {
  await ensureAgendamentoSchema();

  if (!config.backendSync.enabled) {
    return { skipped: true, reason: 'BACKEND_SYNC_DISABLED' };
  }

  const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 50)));
  const result = await pool.query(
    `SELECT
       id,
       barbearia_id,
       servico_id,
       servico_nome_snapshot,
       servico_preco_snapshot,
       cliente_id,
       cliente_nome_externo,
       cliente_telefone_externo,
       barbeiro_id,
       data,
       hora,
       status,
       protocolo_atendimento,
       chatbot_session_id,
       observacoes,
       origem
     FROM agendamentos
     WHERE origem = 'whatsapp'
       AND status NOT IN ('cancelado', 'faltou')
       AND (
         backend_sync_status IS NULL
         OR backend_sync_status = ''
         OR backend_sync_status != 'synced'
       )
     ORDER BY created_at ASC
     LIMIT $1`,
    [safeLimit]
  );

  const items = result.rows || [];
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const response = await syncAppointmentToBackend(item);
      if (!response?.agendamento) {
        const error = new Error('API principal confirmou a chamada, mas nao retornou o agendamento sincronizado.');
        error.code = 'BACKEND_SYNC_EMPTY_RESPONSE';
        throw error;
      }

      await markAppointmentBackendSyncStatus(item.id, 'synced');
      synced += 1;
    } catch (error) {
      failed += 1;
      console.warn('[BACKEND_APPOINTMENTS] Falha ao sincronizar agendamento pendente', {
        agendamentoId: item.id,
        barbeariaId: item.barbearia_id,
        code: error?.code,
        status: error?.status,
        message: error?.message,
        payload: error?.payload,
      });

      await markAppointmentBackendSyncStatus(item.id, 'failed', error?.message || 'Falha ao sincronizar com a API principal.')
        .catch(() => undefined);
    }
  }

  return {
    ok: true,
    checked: items.length,
    synced,
    failed,
  };
}

module.exports = {
  serializarAgendamento,
  syncAppointmentToBackend,
  fetchAppointmentByProtocol,
  rescheduleAppointmentInBackend,
  markAppointmentBackendSyncStatus,
  syncPendingAppointmentsToBackend,
};
