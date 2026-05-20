const express = require('express');
const config = require('../config');
const { getBarbeariaSyncPayload } = require('../services/botSync');
const { ensureAgendamentoSchema } = require('../services/agendamentoSchema');
const { ensureServicoAvailabilitySchema } = require('../services/servicoAvailability');
const {
  gerarProtocoloAtendimentoUnico,
  normalizarProtocoloAtendimento,
} = require('../services/appointmentProtocol');
const pool = require('../config/database');

const router = express.Router();

function requireServiceToken(req, res, next) {
  if (!config.bot?.serviceToken) {
    return res.status(503).json({ error: 'BOT_SERVICE_TOKEN não configurado na API principal.' });
  }

  const authHeader = String(req.headers?.authorization || '').trim();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  if (token !== config.bot.serviceToken) {
    return res.status(401).json({ error: 'Token interno do bot inválido.' });
  }

  next();
}

function parseLimit(value) {
  const limit = Number(value || 100);
  if (!Number.isFinite(limit)) return 100;
  return Math.min(500, Math.max(1, Math.floor(limit)));
}

function parseSince(value) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

function text(value = '') {
  return String(value || '').trim();
}

function nullableText(value = '') {
  const normalized = text(value);
  return normalized || null;
}

function normalizarData(value = '') {
  const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function normalizarHora(value = '') {
  const match = String(value || '').match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

function serializarAgendamentoPayload(payload = {}) {
  const appointment = payload.appointment || payload.agendamento || payload;

  return {
    id: text(appointment.id),
    barbearia_id: text(appointment.barbearia_id || appointment.barbeariaId),
    servico_id: nullableText(appointment.servico_id || appointment.servicoId),
    servico_nome_snapshot: nullableText(appointment.servico_nome_snapshot || appointment.servico_nome),
    servico_preco_snapshot: Number(appointment.servico_preco_snapshot || appointment.servico_preco || 0),
    cliente_id: nullableText(appointment.cliente_id || appointment.clienteId),
    cliente_nome_externo: nullableText(appointment.cliente_nome_externo || appointment.cliente_nome),
    cliente_telefone_externo: nullableText(appointment.cliente_telefone_externo || appointment.cliente_telefone),
    barbeiro_id: nullableText(appointment.barbeiro_id || appointment.barbeiroId),
    data: normalizarData(appointment.data),
    hora: normalizarHora(appointment.hora),
    status: text(appointment.status) || 'pendente',
    protocolo_atendimento: normalizarProtocoloAtendimento(appointment.protocolo_atendimento || appointment.protocoloAtendimento),
    chatbot_session_id: nullableText(appointment.chatbot_session_id || appointment.chatbotSessionId),
    observacoes: nullableText(appointment.observacoes),
    origem: text(appointment.origem) || 'whatsapp',
  };
}

function phoneVariants(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return [];

  const variants = new Set([digits]);
  if (digits.startsWith('55')) {
    variants.add(digits.slice(2));
  } else {
    variants.add(`55${digits}`);
  }

  return Array.from(variants).filter(Boolean);
}

function phoneMatches(received = '', stored = '') {
  const receivedVariants = phoneVariants(received);
  const storedVariants = phoneVariants(stored);
  return receivedVariants.length > 0 && storedVariants.some((item) => receivedVariants.includes(item));
}

async function reservarProtocoloAtendimento({ protocolo, appointmentId }) {
  const normalized = normalizarProtocoloAtendimento(protocolo);

  if (normalized) {
    const conflito = await pool.query(
      `SELECT id
       FROM agendamentos
       WHERE protocolo_atendimento = $1
         AND id != $2
       LIMIT 1`,
      [normalized, appointmentId]
    );

    if (conflito.rows.length === 0) {
      return normalized;
    }
  }

  return gerarProtocoloAtendimentoUnico(pool);
}

async function normalizarServicoId(servicoId, barbeariaId) {
  const id = nullableText(servicoId);
  if (!id) return null;

  const result = await pool.query(
    'SELECT id FROM servicos WHERE id = $1 AND barbearia_id = $2 LIMIT 1',
    [id, barbeariaId]
  );

  return result.rows[0]?.id || null;
}

async function normalizarUsuarioId(usuarioId, { tipo } = {}) {
  const id = nullableText(usuarioId);
  if (!id) return null;

  const params = [id];
  let query = 'SELECT id FROM usuarios WHERE id = $1';
  if (tipo) {
    params.push(tipo);
    query += ' AND tipo = $2';
  }
  query += ' LIMIT 1';

  const result = await pool.query(query, params);
  return result.rows[0]?.id || null;
}

async function listChangedBarbeariaIds({ since, limit }) {
  await ensureServicoAvailabilitySchema();

  if (!since) {
    const result = await pool.query(
      `SELECT id
       FROM barbearias
       ORDER BY updated_at DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => row.id).filter(Boolean);
  }

  const result = await pool.query(
    `SELECT id
     FROM (
       SELECT b.id, b.updated_at
       FROM barbearias b
       WHERE b.updated_at >= $1 OR b.created_at >= $1

       UNION

       SELECT b.id, u.updated_at
       FROM usuarios u
       INNER JOIN barbearias b ON b.usuario_id = u.id
       WHERE u.updated_at >= $1 OR u.created_at >= $1

       UNION

        SELECT b.id, a.updated_at
        FROM assinaturas a
        INNER JOIN barbearias b ON b.id = a.barbearia_id
        WHERE a.updated_at >= $1 OR a.created_at >= $1

        UNION

        SELECT b.id, s.updated_at
        FROM servicos s
        INNER JOIN barbearias b ON b.id = s.barbearia_id
        WHERE s.updated_at >= $1 OR s.created_at >= $1
      ) changed
     GROUP BY id
     ORDER BY MAX(updated_at) DESC
     LIMIT $2`,
    [since, limit]
  );

  return result.rows.map((row) => row.id).filter(Boolean);
}

router.use(requireServiceToken);

router.get('/sync/changes', async (req, res) => {
  try {
    const since = parseSince(req.query?.since);
    const limit = parseLimit(req.query?.limit);
    const ids = await listChangedBarbeariaIds({ since, limit });
    const items = [];

    for (const id of ids) {
      const payload = await getBarbeariaSyncPayload(id);
      if (payload?.user && payload?.barbearia) {
        items.push(payload);
      }
    }

    res.json({
      ok: true,
      since: since ? since.toISOString() : null,
      next_since: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Não foi possível listar mudanças para o bot.' });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    await ensureAgendamentoSchema();

    const appointment = serializarAgendamentoPayload(req.body || {});

    if (!appointment.id || !appointment.barbearia_id || !appointment.data || !appointment.hora) {
      return res.status(400).json({
        error: 'Agendamento inválido para sincronização.',
        code: 'INVALID_APPOINTMENT_SYNC_PAYLOAD',
      });
    }

    const barbeariaResult = await pool.query(
      'SELECT id FROM barbearias WHERE id = $1 LIMIT 1',
      [appointment.barbearia_id]
    );

    if (barbeariaResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Barbearia não encontrada para sincronizar o agendamento.',
        code: 'BARBERSHOP_NOT_FOUND',
      });
    }

    const [servicoId, clienteId, barbeiroId] = await Promise.all([
      normalizarServicoId(appointment.servico_id, appointment.barbearia_id),
      normalizarUsuarioId(appointment.cliente_id),
      normalizarUsuarioId(appointment.barbeiro_id, { tipo: 'barbeiro' }),
    ]);

    appointment.servico_id = servicoId;
    appointment.cliente_id = clienteId;
    appointment.barbeiro_id = barbeiroId;
    appointment.protocolo_atendimento = await reservarProtocoloAtendimento({
      protocolo: appointment.protocolo_atendimento,
      appointmentId: appointment.id,
    });

    if (appointment.status !== 'cancelado') {
      const conflito = await pool.query(
        `SELECT id
         FROM agendamentos
         WHERE barbearia_id = $1
           AND data = $2
           AND hora = $3
           AND status != $4
           AND id != $5
         LIMIT 1`,
        [appointment.barbearia_id, appointment.data, appointment.hora, 'cancelado', appointment.id]
      );

      if (conflito.rows.length > 0) {
        return res.status(409).json({
          error: 'Horário não disponível na agenda principal.',
          code: 'TIME_CONFLICT',
          existing_id: conflito.rows[0].id,
        });
      }
    }

    await pool.query(
      `INSERT INTO agendamentos (
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
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON DUPLICATE KEY UPDATE
         barbearia_id = VALUES(barbearia_id),
         servico_id = VALUES(servico_id),
         servico_nome_snapshot = VALUES(servico_nome_snapshot),
         servico_preco_snapshot = VALUES(servico_preco_snapshot),
         cliente_id = VALUES(cliente_id),
         cliente_nome_externo = VALUES(cliente_nome_externo),
         cliente_telefone_externo = VALUES(cliente_telefone_externo),
         barbeiro_id = VALUES(barbeiro_id),
         data = VALUES(data),
         hora = VALUES(hora),
         status = VALUES(status),
         protocolo_atendimento = COALESCE(VALUES(protocolo_atendimento), protocolo_atendimento),
         chatbot_session_id = VALUES(chatbot_session_id),
         observacoes = VALUES(observacoes),
         origem = VALUES(origem),
         updated_at = CURRENT_TIMESTAMP`,
      [
        appointment.id,
        appointment.barbearia_id,
        appointment.servico_id,
        appointment.servico_nome_snapshot,
        appointment.servico_preco_snapshot,
        appointment.cliente_id,
        appointment.cliente_nome_externo,
        appointment.cliente_telefone_externo,
        appointment.barbeiro_id,
        appointment.data,
        appointment.hora,
        appointment.status,
        appointment.protocolo_atendimento,
        appointment.chatbot_session_id,
        appointment.observacoes,
        appointment.origem,
      ]
    );

    const result = await pool.query(
      'SELECT * FROM agendamentos WHERE id = $1 LIMIT 1',
      [appointment.id]
    );

    res.status(201).json({
      ok: true,
      agendamento: result.rows[0] || appointment,
    });
  } catch (error) {
    console.error('[INTERNAL_BOT_SYNC.appointments] Falha ao sincronizar agendamento do bot', {
      message: error?.message,
      code: error?.code,
      appointment: {
        id: req.body?.appointment?.id || req.body?.agendamento?.id || req.body?.id,
        barbearia_id: req.body?.appointment?.barbearia_id || req.body?.agendamento?.barbearia_id || req.body?.barbearia_id,
        servico_id: req.body?.appointment?.servico_id || req.body?.agendamento?.servico_id || req.body?.servico_id,
        data: req.body?.appointment?.data || req.body?.agendamento?.data || req.body?.data,
        hora: req.body?.appointment?.hora || req.body?.agendamento?.hora || req.body?.hora,
      },
    }, error);

    res.status(500).json({
      error: error?.message || 'Não foi possível sincronizar o agendamento do bot.',
      code: 'APPOINTMENT_SYNC_FAILED',
    });
  }
});

router.get('/appointments/protocol/:protocol', async (req, res) => {
  try {
    await ensureAgendamentoSchema();

    const protocolo = normalizarProtocoloAtendimento(req.params?.protocol);
    const barbeariaId = text(req.query?.barbearia_id || req.query?.barbeariaId);
    const phoneNumber = text(req.query?.phone_number || req.query?.phoneNumber);

    if (!protocolo || !barbeariaId || !phoneNumber) {
      return res.status(400).json({
        error: 'Protocolo, barbearia e telefone são obrigatórios.',
        code: 'INVALID_PROTOCOL_LOOKUP_PAYLOAD',
      });
    }

    const result = await pool.query(
      `SELECT
         a.*,
         COALESCE(c.nome, a.cliente_nome_externo, 'Cliente') AS cliente_nome,
         COALESCE(c.telefone, a.cliente_telefone_externo, '') AS cliente_telefone,
         COALESCE(a.servico_nome_snapshot, s.nome, NULLIF(a.observacoes, '')) AS servico_nome,
         COALESCE(a.servico_preco_snapshot, s.preco, 0) AS servico_preco,
         COALESCE(s.duracao_minutos, 30) AS servico_duracao,
         b.nome AS barbearia_nome,
         b.endereco AS barbearia_endereco
       FROM agendamentos a
       LEFT JOIN usuarios c ON c.id = a.cliente_id
       LEFT JOIN servicos s ON s.id = a.servico_id
       LEFT JOIN barbearias b ON b.id = a.barbearia_id
       WHERE a.protocolo_atendimento = $1
         AND a.barbearia_id = $2
       LIMIT 1`,
      [protocolo, barbeariaId]
    );

    const appointment = result.rows[0];
    if (!appointment || !phoneMatches(phoneNumber, appointment.cliente_telefone)) {
      return res.status(404).json({
        error: 'Não encontrei agendamento para este protocolo e telefone.',
        code: 'APPOINTMENT_PROTOCOL_NOT_FOUND',
      });
    }

    if (['cancelado', 'faltou', 'concluido'].includes(String(appointment.status || '').toLowerCase())) {
      return res.status(409).json({
        error: 'Este agendamento não está disponível para remarcação pelo WhatsApp.',
        code: 'APPOINTMENT_NOT_RESCHEDULABLE',
      });
    }

    res.json({
      ok: true,
      agendamento: appointment,
    });
  } catch (error) {
    console.error('[INTERNAL_BOT_SYNC.protocol] Falha ao buscar agendamento por protocolo', {
      message: error?.message,
      code: error?.code,
    }, error);

    res.status(500).json({
      error: error?.message || 'Não foi possível buscar o agendamento pelo protocolo.',
      code: 'APPOINTMENT_PROTOCOL_LOOKUP_FAILED',
    });
  }
});

router.post('/appointments/:id/reschedule', async (req, res) => {
  try {
    await ensureAgendamentoSchema();

    const id = text(req.params?.id);
    const barbeariaId = text(req.body?.barbearia_id || req.body?.barbeariaId);
    const phoneNumber = text(req.body?.phone_number || req.body?.phoneNumber);
    const data = normalizarData(req.body?.data);
    const hora = normalizarHora(req.body?.hora);

    if (!id || !barbeariaId || !phoneNumber || !data || !hora) {
      return res.status(400).json({
        error: 'Agendamento, barbearia, telefone, data e hora são obrigatórios.',
        code: 'INVALID_APPOINTMENT_RESCHEDULE_PAYLOAD',
      });
    }

    const atualResult = await pool.query(
      `SELECT
         a.*,
         COALESCE(c.nome, a.cliente_nome_externo, 'Cliente') AS cliente_nome,
         COALESCE(c.telefone, a.cliente_telefone_externo, '') AS cliente_telefone,
         COALESCE(a.servico_nome_snapshot, s.nome, NULLIF(a.observacoes, '')) AS servico_nome,
         COALESCE(a.servico_preco_snapshot, s.preco, 0) AS servico_preco,
         COALESCE(s.duracao_minutos, 30) AS servico_duracao,
         b.nome AS barbearia_nome,
         b.endereco AS barbearia_endereco
       FROM agendamentos a
       LEFT JOIN usuarios c ON c.id = a.cliente_id
       LEFT JOIN servicos s ON s.id = a.servico_id
       LEFT JOIN barbearias b ON b.id = a.barbearia_id
       WHERE a.id = $1
         AND a.barbearia_id = $2
       LIMIT 1`,
      [id, barbeariaId]
    );

    const atual = atualResult.rows[0];
    if (!atual || !phoneMatches(phoneNumber, atual.cliente_telefone)) {
      return res.status(404).json({
        error: 'Agendamento não encontrado para este telefone.',
        code: 'APPOINTMENT_NOT_FOUND',
      });
    }

    if (['cancelado', 'faltou', 'concluido'].includes(String(atual.status || '').toLowerCase())) {
      return res.status(409).json({
        error: 'Este agendamento não está disponível para remarcação pelo WhatsApp.',
        code: 'APPOINTMENT_NOT_RESCHEDULABLE',
      });
    }

    const conflito = await pool.query(
      `SELECT id
       FROM agendamentos
       WHERE barbearia_id = $1
         AND data = $2
         AND hora = $3
         AND status != $4
         AND id != $5
       LIMIT 1`,
      [barbeariaId, data, hora, 'cancelado', id]
    );

    if (conflito.rows.length > 0) {
      return res.status(409).json({
        error: 'Horário não disponível na agenda principal.',
        code: 'TIME_CONFLICT',
      });
    }

    const protocoloAtendimento = atual.protocolo_atendimento || await gerarProtocoloAtendimentoUnico(pool);
    const updateResult = await pool.query(
      `UPDATE agendamentos
       SET data = $1,
           hora = $2,
           protocolo_atendimento = COALESCE(protocolo_atendimento, $3),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [data, hora, protocoloAtendimento, id]
    );

    res.json({
      ok: true,
      previous: {
        data: atual.data,
        hora: atual.hora,
      },
      agendamento: {
        ...atual,
        ...(updateResult.rows[0] || {}),
        data,
        hora,
        protocolo_atendimento: protocoloAtendimento,
      },
    });
  } catch (error) {
    console.error('[INTERNAL_BOT_SYNC.reschedule] Falha ao remarcar agendamento pelo bot', {
      message: error?.message,
      code: error?.code,
    }, error);

    res.status(500).json({
      error: error?.message || 'Não foi possível remarcar o agendamento pelo bot.',
      code: 'APPOINTMENT_RESCHEDULE_FAILED',
    });
  }
});

module.exports = router;
