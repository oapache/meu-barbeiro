const crypto = require('crypto');
const pool = require('../config/database');
const config = require('../config');
const { ensureAgendamentoSchema } = require('./agendamentoSchema');

let ensureTrainingSchemaPromise = null;
const CHATBOT_MODES = new Set(['legacy', 'shadow', 'trained']);
const CHATBOT_REVIEW_STATUSES = new Set(['pending', 'reviewed']);

function normalizarTexto(value = '') {
  return String(value || '').trim();
}

function limparTelefone(value = '') {
  return String(value || '').replace(/\D/g, '').trim();
}

function normalizarChatbotMode(value = '') {
  const mode = normalizarTexto(value).toLowerCase();
  return CHATBOT_MODES.has(mode) ? mode : 'legacy';
}

function normalizarReviewStatus(value = '') {
  const status = normalizarTexto(value).toLowerCase();
  return CHATBOT_REVIEW_STATUSES.has(status) ? status : 'pending';
}

function hashPhone(phoneNumber = '') {
  const normalizedPhone = limparTelefone(phoneNumber);
  if (!normalizedPhone) return '';

  return crypto
    .createHash('sha256')
    .update(`${config.jwt.secret}:${normalizedPhone}`)
    .digest('hex');
}

function maskPhone(phoneNumber = '') {
  const normalizedPhone = limparTelefone(phoneNumber);
  if (!normalizedPhone) return '';

  const last4 = normalizedPhone.slice(-4).padStart(4, '*');
  if (normalizedPhone.length <= 4) return `***${last4}`;

  const ddd = normalizedPhone.length >= 10 ? normalizedPhone.slice(-11, -9) : '';
  return ddd ? `(${ddd}) *****-${last4}` : `*****-${last4}`;
}

function maskSensitiveText(text = '', options = {}) {
  const contactName = normalizarTexto(options.contactName);
  let masked = String(text || '').trim();

  if (!masked) return '';

  masked = masked
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[id]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[telefone]');

  if (contactName && contactName.length >= 3) {
    const escaped = contactName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    masked = masked.replace(new RegExp(escaped, 'gi'), '[nome]');
  }

  return masked.slice(0, 2000);
}

async function ensureChatbotTrainingSchema() {
  if (!ensureTrainingSchemaPromise) {
    ensureTrainingSchemaPromise = (async () => {
      await ensureAgendamentoSchema();

      await pool.query(`
        ALTER TABLE barbearias
        ADD COLUMN IF NOT EXISTS chatbot_mode VARCHAR(255) DEFAULT 'legacy',
        ADD COLUMN IF NOT EXISTS chatbot_enabled TINYINT(1) DEFAULT true
      `);

      await pool.query(`
        ALTER TABLE agendamentos
        ADD COLUMN IF NOT EXISTS chatbot_session_id CHAR(36)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_chatbot_sessions (
          id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
          barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
          phone_hash VARCHAR(64) NOT NULL,
          phone_masked VARCHAR(32),
          contact_name_masked TEXT,
          entry_intent TEXT,
          current_stage VARCHAR(255) DEFAULT 'idle',
          status VARCHAR(255) DEFAULT 'active',
          outcome_code TEXT,
          agendamento_id CHAR(36) REFERENCES agendamentos(id) ON DELETE SET NULL,
          review_status VARCHAR(255) DEFAULT 'pending',
          reviewed_intent TEXT,
          review_notes TEXT,
          ideal_response TEXT,
          reviewed_by TEXT,
          reviewed_at DATETIME,
          started_at DATETIME DEFAULT NOW(),
          ended_at DATETIME,
          created_at DATETIME DEFAULT NOW(),
          updated_at DATETIME DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_chatbot_sessions_barbearia_started
          ON whatsapp_chatbot_sessions (barbearia_id, started_at DESC)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_chatbot_sessions_barbearia_phone_hash
          ON whatsapp_chatbot_sessions (barbearia_id, phone_hash)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_chatbot_turns (
          id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
          session_id CHAR(36) REFERENCES whatsapp_chatbot_sessions(id) ON DELETE CASCADE,
          direction TEXT NOT NULL,
          text_masked TEXT,
          stage_before TEXT,
          stage_after TEXT,
          detected_intent TEXT,
          slots_json JSON DEFAULT (JSON_OBJECT()),
          result_code TEXT,
          send_status TEXT,
          created_at DATETIME DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_chatbot_turns_session_created
          ON whatsapp_chatbot_turns (session_id, created_at ASC)
      `);

      await pool.query(`
        ALTER TABLE whatsapp_chatbot_sessions
        ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64),
        ADD COLUMN IF NOT EXISTS phone_masked VARCHAR(32),
        ADD COLUMN IF NOT EXISTS contact_name_masked TEXT,
        ADD COLUMN IF NOT EXISTS entry_intent TEXT,
        ADD COLUMN IF NOT EXISTS current_stage VARCHAR(255) DEFAULT 'idle',
        ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS outcome_code TEXT,
        ADD COLUMN IF NOT EXISTS agendamento_id CHAR(36),
        ADD COLUMN IF NOT EXISTS review_status VARCHAR(255) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS reviewed_intent TEXT,
        ADD COLUMN IF NOT EXISTS review_notes TEXT,
        ADD COLUMN IF NOT EXISTS ideal_response TEXT,
        ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
        ADD COLUMN IF NOT EXISTS reviewed_at DATETIME,
        ADD COLUMN IF NOT EXISTS started_at DATETIME DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS ended_at DATETIME,
        ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT NOW()
      `);

      await pool.query(`
        ALTER TABLE whatsapp_chatbot_turns
        ADD COLUMN IF NOT EXISTS session_id CHAR(36),
        ADD COLUMN IF NOT EXISTS direction TEXT,
        ADD COLUMN IF NOT EXISTS text_masked TEXT,
        ADD COLUMN IF NOT EXISTS stage_before TEXT,
        ADD COLUMN IF NOT EXISTS stage_after TEXT,
        ADD COLUMN IF NOT EXISTS detected_intent TEXT,
        ADD COLUMN IF NOT EXISTS slots_json JSON DEFAULT (JSON_OBJECT()),
        ADD COLUMN IF NOT EXISTS result_code TEXT,
        ADD COLUMN IF NOT EXISTS send_status TEXT,
        ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT NOW()
      `);
    })().catch((error) => {
      ensureTrainingSchemaPromise = null;
      throw error;
    });
  }

  return ensureTrainingSchemaPromise;
}

async function getChatbotOperationalSettings(barbeariaId) {
  await ensureChatbotTrainingSchema();

  const result = await pool.query(
    `SELECT chatbot_mode, chatbot_enabled
     FROM barbearias
     WHERE id = $1
     LIMIT 1`,
    [barbeariaId]
  );

  const row = result.rows[0] || {};

  return {
    mode: normalizarChatbotMode(row.chatbot_mode),
    enabled: row.chatbot_enabled !== false,
  };
}

async function updateChatbotOperationalSettings(barbeariaId, nextSettings = {}) {
  await ensureChatbotTrainingSchema();

  const modeProvided = Object.prototype.hasOwnProperty.call(nextSettings, 'mode');
  const enabledProvided = Object.prototype.hasOwnProperty.call(nextSettings, 'enabled');

  if (!modeProvided && !enabledProvided) {
    return getChatbotOperationalSettings(barbeariaId);
  }

  const mode = modeProvided ? normalizarChatbotMode(nextSettings.mode) : null;
  const enabled = enabledProvided ? nextSettings.enabled !== false : null;

  const result = await pool.query(
    `UPDATE barbearias
     SET chatbot_mode = COALESCE($1, chatbot_mode),
         chatbot_enabled = COALESCE($2, chatbot_enabled),
         updated_at = NOW()
     WHERE id = $3
     RETURNING chatbot_mode, chatbot_enabled`,
    [mode, enabled, barbeariaId]
  );

  const row = result.rows[0] || null;
  if (!row) {
    const error = new Error('Barbearia nao encontrada para atualizar o chatbot.');
    error.code = 'CHATBOT_SETTINGS_NOT_FOUND';
    throw error;
  }

  return {
    mode: normalizarChatbotMode(row.chatbot_mode),
    enabled: row.chatbot_enabled !== false,
  };
}

async function markStaleChatbotSessionsAsAbandoned(barbeariaId, staleMinutes = 180) {
  await ensureChatbotTrainingSchema();

  const minutes = Math.max(5, Number(staleMinutes || 180));

  await pool.query(
    `UPDATE whatsapp_chatbot_sessions
     SET status = 'abandoned',
         outcome_code = COALESCE(outcome_code, 'ABANDONED_TIMEOUT'),
         ended_at = COALESCE(ended_at, updated_at),
         updated_at = NOW()
     WHERE barbearia_id = $1
       AND ended_at IS NULL
       AND status = 'active'
       AND updated_at < DATE_SUB(NOW(), INTERVAL $2 MINUTE)`,
    [barbeariaId, minutes]
  );
}

async function ensureChatbotSession({
  barbeariaId,
  phoneNumber,
  contactName,
  entryIntent,
  currentStage,
  forceNew = false,
}) {
  await ensureChatbotTrainingSchema();

  const phoneHash = hashPhone(phoneNumber);
  const phoneMasked = maskPhone(phoneNumber);
  const contactNameMasked = maskSensitiveText(contactName, { contactName });
  const stage = normalizarTexto(currentStage) || 'idle';
  const intent = normalizarTexto(entryIntent) || 'unknown';

  if (!phoneHash) return null;

  const existingOpenResult = await pool.query(
    `SELECT *
     FROM whatsapp_chatbot_sessions
     WHERE barbearia_id = $1
       AND phone_hash = $2
       AND ended_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [barbeariaId, phoneHash]
  );

  const existingOpen = existingOpenResult.rows[0] || null;

  if (existingOpen && !forceNew) {
    const updatedResult = await pool.query(
      `UPDATE whatsapp_chatbot_sessions
       SET contact_name_masked = COALESCE($1, contact_name_masked),
           current_stage = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [contactNameMasked || null, stage, existingOpen.id]
    );

    return updatedResult.rows[0] || existingOpen;
  }

  if (existingOpen && forceNew) {
    await pool.query(
      `UPDATE whatsapp_chatbot_sessions
       SET status = CASE WHEN status = 'active' THEN 'completed' ELSE status END,
           outcome_code = COALESCE(outcome_code, 'FLOW_RESTARTED'),
           ended_at = COALESCE(ended_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [existingOpen.id]
    );
  }

  const result = await pool.query(
    `INSERT INTO whatsapp_chatbot_sessions (
       barbearia_id,
       phone_hash,
       phone_masked,
       contact_name_masked,
       entry_intent,
       current_stage,
       status,
       started_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
     RETURNING *`,
    [barbeariaId, phoneHash, phoneMasked || null, contactNameMasked || null, intent, stage]
  );

  return result.rows[0] || null;
}

async function updateChatbotSessionState({
  sessionId,
  currentStage,
  status,
  outcomeCode,
  agendamentoId,
  end = false,
}) {
  if (!sessionId) return null;
  await ensureChatbotTrainingSchema();

  const result = await pool.query(
    `UPDATE whatsapp_chatbot_sessions
     SET current_stage = COALESCE($1, current_stage),
         status = COALESCE($2, status),
         outcome_code = COALESCE($3, outcome_code),
         agendamento_id = COALESCE($4, agendamento_id),
         ended_at = CASE WHEN $5 THEN COALESCE(ended_at, NOW()) ELSE ended_at END,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [currentStage || null, status || null, outcomeCode || null, agendamentoId || null, end === true, sessionId]
  );

  if (agendamentoId) {
    await pool.query(
      `UPDATE agendamentos
       SET chatbot_session_id = $1
       WHERE id = $2`,
      [sessionId, agendamentoId]
    );
  }

  return result.rows[0] || null;
}

async function logChatbotTurn({
  sessionId,
  direction,
  text,
  contactName,
  stageBefore,
  stageAfter,
  detectedIntent,
  slots,
  resultCode,
  sendStatus,
}) {
  if (!sessionId) return null;
  await ensureChatbotTrainingSchema();

  const result = await pool.query(
    `INSERT INTO whatsapp_chatbot_turns (
       session_id,
       direction,
       text_masked,
       stage_before,
       stage_after,
       detected_intent,
       slots_json,
       result_code,
       send_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      sessionId,
      normalizarTexto(direction) || 'outbound',
      maskSensitiveText(text, { contactName }),
      normalizarTexto(stageBefore) || null,
      normalizarTexto(stageAfter) || null,
      normalizarTexto(detectedIntent) || null,
      JSON.stringify(slots || {}),
      normalizarTexto(resultCode) || null,
      normalizarTexto(sendStatus) || null,
    ]
  );

  return result.rows[0] || null;
}

async function getChatbotMetrics({ barbeariaId, from, to }) {
  await ensureChatbotTrainingSchema();
  await markStaleChatbotSessionsAsAbandoned(barbeariaId);

  const params = [barbeariaId];
  let filterSql = 'WHERE s.barbearia_id = $1';
  let ratingFilterSql = 'WHERE a.barbearia_id = $1';

  if (from) {
    params.push(from);
    filterSql += ` AND s.created_at >= $${params.length}`;
    ratingFilterSql += ` AND a.created_at >= $${params.length}`;
  }

  if (to) {
    params.push(to);
    filterSql += ` AND s.created_at <= $${params.length}`;
    ratingFilterSql += ` AND a.created_at <= $${params.length}`;
  }

  const sessionsResult = await pool.query(
    `SELECT
       COUNT(*) AS total_sessions,
       SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) AS live_conversations,
       SUM(CASE WHEN s.outcome_code = 'HUMAN_HANDOFF' OR s.status = 'human_handoff' THEN 1 ELSE 0 END) AS human_handoff_open,
       SUM(CASE WHEN s.current_stage = 'awaiting_review' THEN 1 ELSE 0 END) AS awaiting_review,
       SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) AS completed_conversations,
       SUM(CASE WHEN s.outcome_code = 'BOOKED' THEN 1 ELSE 0 END) AS whatsapp_bookings,
       SUM(CASE WHEN s.status = 'abandoned' THEN 1 ELSE 0 END) AS abandoned_conversations
     FROM whatsapp_chatbot_sessions s
     ${filterSql}`,
    params
  );

  const ratingResult = await pool.query(
    `SELECT
       COALESCE(AVG(a.avaliacao_nota), 0) AS whatsapp_reviews_avg
     FROM agendamentos a
     ${ratingFilterSql}
       AND a.chatbot_session_id IS NOT NULL
       AND a.avaliacao_nota IS NOT NULL`,
    params
  );

  const sendResult = await pool.query(
    `SELECT
       SUM(CASE WHEN t.send_status = 'sent' THEN 1 ELSE 0 END) AS outbound_sent,
       SUM(CASE WHEN t.send_status IS NOT NULL AND t.send_status <> 'sent' THEN 1 ELSE 0 END) AS outbound_failed
     FROM whatsapp_chatbot_turns t
     INNER JOIN whatsapp_chatbot_sessions s ON s.id = t.session_id
     ${filterSql.replace(/s\.created_at/g, 't.created_at')}`,
    params
  );

  const reviewQueueResult = await pool.query(
    `SELECT
       SUM(CASE WHEN s.review_status <> 'reviewed'
           AND (
             s.status = 'abandoned'
             OR s.outcome_code = 'HUMAN_HANDOFF'
             OR s.status = 'human_handoff'
             OR EXISTS (
               SELECT 1
               FROM whatsapp_chatbot_turns tr
               WHERE tr.session_id = s.id
                 AND (
                   (tr.send_status IS NOT NULL AND tr.send_status <> 'sent')
                   OR tr.result_code = 'TIME_CONFLICT'
                 )
             )
           )
         THEN 1 ELSE 0 END) AS review_queue_total,
       SUM(CASE WHEN s.status = 'abandoned' THEN 1 ELSE 0 END) AS abandoned_review_queue,
       SUM(CASE WHEN s.outcome_code = 'HUMAN_HANDOFF' OR s.status = 'human_handoff' THEN 1 ELSE 0 END) AS handoff_review_queue,
       SUM(CASE WHEN EXISTS (
           SELECT 1
           FROM whatsapp_chatbot_turns tr
           WHERE tr.session_id = s.id
             AND tr.send_status IS NOT NULL
             AND tr.send_status <> 'sent'
         )
         THEN 1 ELSE 0 END) AS send_failure_sessions,
       SUM(CASE WHEN EXISTS (
           SELECT 1
           FROM whatsapp_chatbot_turns tr
           WHERE tr.session_id = s.id
             AND tr.result_code = 'TIME_CONFLICT'
         )
         THEN 1 ELSE 0 END) AS conflict_sessions
     FROM whatsapp_chatbot_sessions s
     ${filterSql}`,
    params
  );

  const dropoffResult = await pool.query(
    `SELECT
       COALESCE(s.current_stage, 'idle') AS stage,
       COUNT(*) AS total
     FROM whatsapp_chatbot_sessions s
     ${filterSql}
       AND s.status = 'abandoned'
     GROUP BY COALESCE(s.current_stage, 'idle')
     ORDER BY total DESC, stage ASC`,
    params
  );

  const totalSessions = Number(sessionsResult.rows?.[0]?.total_sessions || 0);
  const whatsappBookings = Number(sessionsResult.rows?.[0]?.whatsapp_bookings || 0);
  const outboundSent = Number(sendResult.rows?.[0]?.outbound_sent || 0);
  const outboundFailed = Number(sendResult.rows?.[0]?.outbound_failed || 0);
  const totalOutboundAttempts = outboundSent + outboundFailed;

  return {
    metrics: {
      ...(sessionsResult.rows[0] || {}),
      whatsapp_reviews_avg: Number(ratingResult.rows?.[0]?.whatsapp_reviews_avg || 0),
      outbound_sent: outboundSent,
      outbound_failed: outboundFailed,
      conversion_rate: totalSessions > 0 ? Number(((whatsappBookings / totalSessions) * 100).toFixed(1)) : 0,
      send_success_rate: totalOutboundAttempts > 0 ? Number(((outboundSent / totalOutboundAttempts) * 100).toFixed(1)) : 0,
      review_queue_total: Number(reviewQueueResult.rows?.[0]?.review_queue_total || 0),
      abandoned_review_queue: Number(reviewQueueResult.rows?.[0]?.abandoned_review_queue || 0),
      handoff_review_queue: Number(reviewQueueResult.rows?.[0]?.handoff_review_queue || 0),
      send_failure_sessions: Number(reviewQueueResult.rows?.[0]?.send_failure_sessions || 0),
      conflict_sessions: Number(reviewQueueResult.rows?.[0]?.conflict_sessions || 0),
    },
    dropoff_by_stage: dropoffResult.rows || [],
    range: {
      from: from || null,
      to: to || null,
    },
  };
}

async function listChatbotSessions({
  barbeariaId,
  status,
  stage,
  reviewStatus,
  queueOnly = false,
  q,
  limit = 20,
  offset = 0,
}) {
  await ensureChatbotTrainingSchema();
  await markStaleChatbotSessionsAsAbandoned(barbeariaId);

  const safeLimit = Math.min(100, Math.max(1, Number(limit || 20)));
  const safeOffset = Math.max(0, Number(offset || 0));
  const params = [barbeariaId];
  let whereSql = 'WHERE s.barbearia_id = $1';

  if (status) {
    params.push(status);
    whereSql += ` AND s.status = $${params.length}`;
  }

  if (stage) {
    params.push(stage);
    whereSql += ` AND s.current_stage = $${params.length}`;
  }

  if (reviewStatus) {
    params.push(normalizarReviewStatus(reviewStatus));
    whereSql += ` AND COALESCE(s.review_status, 'pending') = $${params.length}`;
  }

  if (q) {
    params.push(`%${String(q || '').trim().toLowerCase()}%`);
    whereSql += ` AND (
      LOWER(COALESCE(s.contact_name_masked, '')) LIKE $${params.length}
      OR LOWER(COALESCE(s.phone_masked, '')) LIKE $${params.length}
    )`;
  }

  if (queueOnly) {
    whereSql += ` AND (
      s.status = 'abandoned'
      OR s.outcome_code = 'HUMAN_HANDOFF'
      OR s.status = 'human_handoff'
      OR EXISTS (
        SELECT 1
        FROM whatsapp_chatbot_turns tr
        WHERE tr.session_id = s.id
          AND (
            (tr.send_status IS NOT NULL AND tr.send_status <> 'sent')
            OR tr.result_code = 'TIME_CONFLICT'
          )
      )
    )`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM whatsapp_chatbot_sessions s
     ${whereSql}`,
    params
  );

  const rowsResult = await pool.query(
    `SELECT
       s.id,
       s.contact_name_masked AS contact_name,
       s.phone_masked,
       s.current_stage AS stage,
       s.status,
       s.outcome_code,
       s.entry_intent,
       COALESCE(s.review_status, 'pending') AS review_status,
       s.last_interaction_at,
       s.created_at,
       s.updated_at,
       s.agendamento_id AS linked_agendamento_id,
       a.status AS linked_agendamento_status,
       a.avaliacao_nota AS linked_agendamento_rating,
       COALESCE(tstats.outbound_failed_count, 0) AS outbound_failed_count,
       COALESCE(tstats.conflict_count, 0) AS conflict_count,
       CASE
         WHEN COALESCE(tstats.outbound_failed_count, 0) > 0 THEN 'critical'
         WHEN s.status = 'abandoned' OR s.outcome_code = 'HUMAN_HANDOFF' OR s.status = 'human_handoff' THEN 'high'
         WHEN COALESCE(tstats.conflict_count, 0) > 0 THEN 'medium'
         ELSE 'normal'
       END AS review_priority,
       CASE WHEN COALESCE(tstats.outbound_failed_count, 0) > 0 THEN 1 ELSE 0 END AS has_send_failure,
       CASE WHEN s.status = 'abandoned' THEN 1 ELSE 0 END AS has_abandoned,
       CASE WHEN s.outcome_code = 'HUMAN_HANDOFF' OR s.status = 'human_handoff' THEN 1 ELSE 0 END AS has_human_handoff,
       CASE WHEN COALESCE(tstats.conflict_count, 0) > 0 THEN 1 ELSE 0 END AS has_time_conflict,
       (
         SELECT text_masked
         FROM whatsapp_chatbot_turns
         WHERE session_id = s.id AND direction = 'inbound'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS last_inbound_preview,
       (
         SELECT text_masked
         FROM whatsapp_chatbot_turns
         WHERE session_id = s.id AND direction = 'outbound'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS last_outbound_preview
     FROM (
       SELECT
         base.*,
         COALESCE(base.updated_at, base.started_at) AS last_interaction_at
       FROM whatsapp_chatbot_sessions base
     ) s
     LEFT JOIN agendamentos a ON a.id = s.agendamento_id
     LEFT JOIN (
       SELECT
         session_id,
         SUM(CASE WHEN send_status IS NOT NULL AND send_status <> 'sent' THEN 1 ELSE 0 END) AS outbound_failed_count,
         SUM(CASE WHEN result_code = 'TIME_CONFLICT' THEN 1 ELSE 0 END) AS conflict_count
       FROM whatsapp_chatbot_turns
       GROUP BY session_id
     ) tstats ON tstats.session_id = s.id
     ${whereSql}
     ORDER BY s.updated_at DESC, s.created_at DESC
     LIMIT ${safeLimit}
     OFFSET ${safeOffset}`,
    params
  );

  const total = Number(countResult.rows?.[0]?.total || 0);
  const sessions = (rowsResult.rows || []).map((row) => {
    const {
      has_send_failure,
      has_abandoned,
      has_human_handoff,
      has_time_conflict,
      ...session
    } = row;

    return {
      ...session,
      review_reasons: [
        Number(has_send_failure || 0) > 0 ? 'send_failure' : null,
        Number(has_abandoned || 0) > 0 ? 'abandoned' : null,
        Number(has_human_handoff || 0) > 0 ? 'human_handoff' : null,
        Number(has_time_conflict || 0) > 0 ? 'time_conflict' : null,
      ].filter(Boolean),
    };
  });

  return {
    sessions,
    pagination: {
      limit: safeLimit,
      offset: safeOffset,
      total,
      has_more: safeOffset + safeLimit < total,
    },
  };
}

async function getChatbotSessionDetail({ sessionId, barbeariaId }) {
  await ensureChatbotTrainingSchema();

  const sessionResult = await pool.query(
    `SELECT
       s.id,
       s.barbearia_id,
       s.contact_name_masked AS contact_name,
       s.phone_masked,
       s.entry_intent,
       s.current_stage AS stage,
       s.status,
       s.outcome_code,
       s.agendamento_id,
       COALESCE(s.review_status, 'pending') AS review_status,
       s.reviewed_intent,
       s.review_notes,
       s.ideal_response,
       s.reviewed_by,
       s.reviewed_at,
       s.started_at,
       s.ended_at,
       s.created_at,
       s.updated_at
     FROM whatsapp_chatbot_sessions s
     WHERE s.id = $1
       AND s.barbearia_id = $2
     LIMIT 1`,
    [sessionId, barbeariaId]
  );

  const session = sessionResult.rows[0] || null;
  if (!session) return null;

  const turnsResult = await pool.query(
    `SELECT
       id,
       direction,
       text_masked,
       stage_before,
       stage_after,
       detected_intent,
       slots_json,
       result_code,
       send_status,
       created_at
     FROM whatsapp_chatbot_turns
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

  const agendamentoResult = session.agendamento_id
    ? await pool.query(
        `SELECT
           id,
           status,
           data,
           hora,
           COALESCE(servico_nome_snapshot, NULLIF(observacoes, ''), 'Serviço agendado') AS servico_nome,
           avaliacao_nota
         FROM agendamentos
         WHERE id = $1
         LIMIT 1`,
        [session.agendamento_id]
      )
    : { rows: [] };

  const diagnosticsResult = await pool.query(
    `SELECT
       SUM(CASE WHEN send_status IS NOT NULL AND send_status <> 'sent' THEN 1 ELSE 0 END) AS outbound_failed_count,
       SUM(CASE WHEN result_code = 'TIME_CONFLICT' THEN 1 ELSE 0 END) AS conflict_count
     FROM whatsapp_chatbot_turns
     WHERE session_id = $1`,
    [sessionId]
  );

  const diagnostics = diagnosticsResult.rows?.[0] || {};
  const reviewReasons = [
    Number(diagnostics.outbound_failed_count || 0) > 0 ? 'send_failure' : null,
    session.status === 'abandoned' ? 'abandoned' : null,
    session.outcome_code === 'HUMAN_HANDOFF' || session.status === 'human_handoff' ? 'human_handoff' : null,
    Number(diagnostics.conflict_count || 0) > 0 ? 'time_conflict' : null,
  ].filter(Boolean);

  return {
    session,
    turns: turnsResult.rows || [],
    diagnostics: {
      outbound_failed_count: Number(diagnostics.outbound_failed_count || 0),
      conflict_count: Number(diagnostics.conflict_count || 0),
      review_reasons: reviewReasons,
      requires_review: reviewReasons.length > 0 && session.review_status !== 'reviewed',
    },
    review: {
      status: session.review_status || 'pending',
      reviewed_intent: session.reviewed_intent || '',
      review_notes: session.review_notes || '',
      ideal_response: session.ideal_response || '',
      reviewed_by: session.reviewed_by || '',
      reviewed_at: session.reviewed_at || null,
    },
    linked_agendamento: agendamentoResult.rows?.[0] || null,
  };
}

async function updateChatbotSessionReview({
  sessionId,
  barbeariaId,
  reviewedIntent,
  reviewNotes,
  idealResponse,
  reviewStatus,
  reviewedBy,
}) {
  await ensureChatbotTrainingSchema();

  const result = await pool.query(
    `UPDATE whatsapp_chatbot_sessions
     SET reviewed_intent = $1,
         review_notes = $2,
         ideal_response = $3,
         review_status = $4,
         reviewed_by = $5,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $6
       AND barbearia_id = $7
     RETURNING id`,
    [
      normalizarTexto(reviewedIntent) || null,
      normalizarTexto(reviewNotes) || null,
      normalizarTexto(idealResponse) || null,
      normalizarReviewStatus(reviewStatus),
      normalizarTexto(reviewedBy) || null,
      sessionId,
      barbeariaId,
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  return getChatbotSessionDetail({ sessionId, barbeariaId });
}

module.exports = {
  ensureChatbotTrainingSchema,
  getChatbotOperationalSettings,
  updateChatbotOperationalSettings,
  markStaleChatbotSessionsAsAbandoned,
  ensureChatbotSession,
  updateChatbotSessionState,
  logChatbotTurn,
  getChatbotMetrics,
  listChatbotSessions,
  getChatbotSessionDetail,
  updateChatbotSessionReview,
  hashPhone,
  maskPhone,
  maskSensitiveText,
};
