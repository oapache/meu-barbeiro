const crypto = require('crypto');
const pool = require('../config/database');
const { ensureAgendamentoSchema } = require('./agendamentoSchema');

function text(value) {
  return String(value || '').trim();
}

function nullableText(value) {
  const normalized = text(value);
  return normalized || null;
}

function jsonValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
}

function mysqlDateTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  const normalized = text(value);
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

async function ensureSyncSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      email VARCHAR(255) UNIQUE NOT NULL,
      senha_hash VARCHAR(255),
      nome VARCHAR(255) NOT NULL,
      telefone VARCHAR(20),
      tipo VARCHAR(20) DEFAULT 'cliente',
      avatar_url TEXT,
      preferencias JSON DEFAULT (JSON_OBJECT()),
      tax_id TEXT,
      billing_address JSON DEFAULT (JSON_OBJECT()),
      stripe_customer_id TEXT,
      subscription_plan VARCHAR(255) DEFAULT 'free',
      subscription_status VARCHAR(255) DEFAULT 'inactive',
      subscription_trial_ends_at DATETIME,
      subscription_grace_ends_at DATETIME,
      subscription_current_period_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS barbearias (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      usuario_id CHAR(36),
      nome VARCHAR(255) NOT NULL,
      telefone VARCHAR(20),
      endereco TEXT,
      logo_url TEXT,
      horario_abertura TIME DEFAULT '09:00:00',
      horario_fechamento TIME DEFAULT '20:00:00',
      horarios_semana JSON,
      whatsapp_link TEXT,
      nota_media DECIMAL(10, 2) DEFAULT 0,
      total_avaliacoes INT DEFAULT 0,
      subscription_plan VARCHAR(255) DEFAULT 'free',
      subscription_status VARCHAR(255) DEFAULT 'inactive',
      premium_locked_at DATETIME,
      chatbot_mode VARCHAR(255) DEFAULT 'legacy',
      chatbot_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assinaturas (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      barbearia_id CHAR(36),
      usuario_id CHAR(36),
      stripe_customer_id TEXT,
      stripe_subscription_id VARCHAR(255) UNIQUE,
      stripe_price_id TEXT,
      plan_key TEXT,
      status VARCHAR(255) DEFAULT 'inactive',
      trial_end DATETIME,
      current_period_start DATETIME,
      current_period_end DATETIME,
      cancel_at_period_end TINYINT(1) DEFAULT 0,
      provider VARCHAR(255) DEFAULT 'stripe',
      payment_method VARCHAR(255) DEFAULT 'card',
      provider_customer_id TEXT,
      provider_subscription_id TEXT,
      provider_price_id TEXT,
      provider_checkout_url TEXT,
      provider_payload JSON DEFAULT (JSON_OBJECT()),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'cliente',
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS preferencias JSON DEFAULT (JSON_OBJECT()),
    ADD COLUMN IF NOT EXISTS tax_id TEXT,
    ADD COLUMN IF NOT EXISTS billing_address JSON DEFAULT (JSON_OBJECT()),
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255) DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS subscription_trial_ends_at DATETIME,
    ADD COLUMN IF NOT EXISTS subscription_grace_ends_at DATETIME,
    ADD COLUMN IF NOT EXISTS subscription_current_period_end DATETIME,
    ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    ALTER TABLE barbearias
    ADD COLUMN IF NOT EXISTS usuario_id CHAR(36),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS endereco TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS horario_abertura TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS horario_fechamento TIME DEFAULT '20:00:00',
    ADD COLUMN IF NOT EXISTS horarios_semana JSON,
    ADD COLUMN IF NOT EXISTS whatsapp_link TEXT,
    ADD COLUMN IF NOT EXISTS nota_media DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_avaliacoes INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255) DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS premium_locked_at DATETIME,
    ADD COLUMN IF NOT EXISTS chatbot_mode VARCHAR(255) DEFAULT 'legacy',
    ADD COLUMN IF NOT EXISTS chatbot_enabled TINYINT(1) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    ALTER TABLE assinaturas
    ADD COLUMN IF NOT EXISTS barbearia_id CHAR(36),
    ADD COLUMN IF NOT EXISTS usuario_id CHAR(36),
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
    ADD COLUMN IF NOT EXISTS plan_key TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS trial_end DATETIME,
    ADD COLUMN IF NOT EXISTS current_period_start DATETIME,
    ADD COLUMN IF NOT EXISTS current_period_end DATETIME,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS provider VARCHAR(255) DEFAULT 'stripe',
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255) DEFAULT 'card',
    ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT,
    ADD COLUMN IF NOT EXISTS provider_payload JSON DEFAULT (JSON_OBJECT()),
    ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  `);
}

async function upsertUser(user = {}) {
  await ensureSyncSchema();

  const id = text(user.id);
  const email = text(user.email).toLowerCase();
  const nome = text(user.nome) || email || 'Usuário';

  if (!id || !email) {
    const error = new Error('Payload de usuário inválido para sincronização.');
    error.code = 'SYNC_USER_INVALID';
    throw error;
  }

  await pool.query(
    `INSERT INTO usuarios (
       id, email, nome, telefone, tipo, avatar_url, preferencias, tax_id, billing_address,
       stripe_customer_id, subscription_plan, subscription_status,
       subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       nome = VALUES(nome),
       telefone = VALUES(telefone),
       tipo = VALUES(tipo),
       avatar_url = VALUES(avatar_url),
       preferencias = VALUES(preferencias),
       tax_id = VALUES(tax_id),
       billing_address = VALUES(billing_address),
       stripe_customer_id = VALUES(stripe_customer_id),
       subscription_plan = VALUES(subscription_plan),
       subscription_status = VALUES(subscription_status),
       subscription_trial_ends_at = VALUES(subscription_trial_ends_at),
       subscription_grace_ends_at = VALUES(subscription_grace_ends_at),
       subscription_current_period_end = VALUES(subscription_current_period_end),
       updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      email,
      nome,
      nullableText(user.telefone),
      text(user.tipo) || 'cliente',
      nullableText(user.avatar_url),
      jsonValue(user.preferencias, {}),
      nullableText(user.tax_id),
      jsonValue(user.billing_address, {}),
      nullableText(user.stripe_customer_id),
      text(user.subscription_plan) || 'free',
      text(user.subscription_status) || 'inactive',
      mysqlDateTime(user.subscription_trial_ends_at),
      mysqlDateTime(user.subscription_grace_ends_at),
      mysqlDateTime(user.subscription_current_period_end),
    ]
  );

  return { ok: true, user_id: id };
}

async function upsertBarbearia(barbearia = {}) {
  await ensureSyncSchema();

  const id = text(barbearia.id);
  const usuarioId = text(barbearia.usuario_id || barbearia.usuarioId);
  const nome = text(barbearia.nome);

  if (!id || !usuarioId || !nome) {
    const error = new Error('Payload de barbearia inválido para sincronização.');
    error.code = 'SYNC_BARBEARIA_INVALID';
    throw error;
  }

  await pool.query(
    `INSERT INTO barbearias (
       id, usuario_id, nome, telefone, endereco, logo_url, horario_abertura, horario_fechamento,
       horarios_semana, whatsapp_link, nota_media, total_avaliacoes, subscription_plan,
       subscription_status, premium_locked_at, chatbot_mode, chatbot_enabled
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON DUPLICATE KEY UPDATE
       usuario_id = VALUES(usuario_id),
       nome = VALUES(nome),
       telefone = VALUES(telefone),
       endereco = VALUES(endereco),
       logo_url = VALUES(logo_url),
       horario_abertura = VALUES(horario_abertura),
       horario_fechamento = VALUES(horario_fechamento),
       horarios_semana = VALUES(horarios_semana),
       whatsapp_link = VALUES(whatsapp_link),
       nota_media = VALUES(nota_media),
       total_avaliacoes = VALUES(total_avaliacoes),
       subscription_plan = VALUES(subscription_plan),
       subscription_status = VALUES(subscription_status),
       premium_locked_at = VALUES(premium_locked_at),
       chatbot_mode = VALUES(chatbot_mode),
       chatbot_enabled = VALUES(chatbot_enabled),
       updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      usuarioId,
      nome,
      nullableText(barbearia.telefone),
      nullableText(barbearia.endereco),
      nullableText(barbearia.logo_url),
      text(barbearia.horario_abertura) || '09:00:00',
      text(barbearia.horario_fechamento) || '20:00:00',
      jsonValue(barbearia.horarios_semana, null),
      nullableText(barbearia.whatsapp_link),
      Number(barbearia.nota_media || 0),
      Number(barbearia.total_avaliacoes || 0),
      text(barbearia.subscription_plan) || 'free',
      text(barbearia.subscription_status) || 'inactive',
      mysqlDateTime(barbearia.premium_locked_at),
      text(barbearia.chatbot_mode) || 'legacy',
      barbearia.chatbot_enabled === false ? false : true,
    ]
  );

  return { ok: true, barbearia_id: id };
}

async function upsertSubscription(subscription = {}) {
  await ensureSyncSchema();

  const barbeariaId = text(subscription.barbearia_id || subscription.barbeariaId);
  const usuarioId = text(subscription.usuario_id || subscription.usuarioId);

  if (!barbeariaId || !usuarioId) {
    const error = new Error('Payload de assinatura inválido para sincronização.');
    error.code = 'SYNC_SUBSCRIPTION_INVALID';
    throw error;
  }

  await pool.query(
    `INSERT INTO assinaturas (
       id, barbearia_id, usuario_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
       plan_key, status, trial_end, current_period_start, current_period_end, cancel_at_period_end,
       provider, payment_method, provider_customer_id, provider_subscription_id, provider_price_id,
       provider_checkout_url, provider_payload
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON DUPLICATE KEY UPDATE
       barbearia_id = VALUES(barbearia_id),
       usuario_id = VALUES(usuario_id),
       stripe_customer_id = VALUES(stripe_customer_id),
       stripe_price_id = VALUES(stripe_price_id),
       plan_key = VALUES(plan_key),
       status = VALUES(status),
       trial_end = VALUES(trial_end),
       current_period_start = VALUES(current_period_start),
       current_period_end = VALUES(current_period_end),
       cancel_at_period_end = VALUES(cancel_at_period_end),
       provider = VALUES(provider),
       payment_method = VALUES(payment_method),
       provider_customer_id = VALUES(provider_customer_id),
       provider_subscription_id = VALUES(provider_subscription_id),
       provider_price_id = VALUES(provider_price_id),
       provider_checkout_url = VALUES(provider_checkout_url),
       provider_payload = VALUES(provider_payload),
       updated_at = CURRENT_TIMESTAMP`,
    [
      text(subscription.id) || crypto.randomUUID(),
      barbeariaId,
      usuarioId,
      nullableText(subscription.stripe_customer_id),
      nullableText(subscription.stripe_subscription_id) || `local-${barbeariaId}`,
      nullableText(subscription.stripe_price_id),
      text(subscription.plan_key) || 'free',
      text(subscription.status) || 'inactive',
      mysqlDateTime(subscription.trial_end),
      mysqlDateTime(subscription.current_period_start),
      mysqlDateTime(subscription.current_period_end),
      subscription.cancel_at_period_end === true,
      text(subscription.provider) || 'stripe',
      text(subscription.payment_method) || 'card',
      nullableText(subscription.provider_customer_id),
      nullableText(subscription.provider_subscription_id),
      nullableText(subscription.provider_price_id),
      nullableText(subscription.provider_checkout_url),
      jsonValue(subscription.provider_payload, {}),
    ]
  );

  await pool.query(
    `UPDATE barbearias
     SET subscription_plan = $1,
         subscription_status = $2,
         premium_locked_at = CASE WHEN $2 = 'blocked' THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [text(subscription.plan_key) || 'free', text(subscription.status) || 'inactive', barbeariaId]
  );

  return { ok: true, barbearia_id: barbeariaId, status: text(subscription.status) || 'inactive' };
}

async function upsertService(service = {}) {
  await ensureAgendamentoSchema();

  const id = text(service.id);
  const barbeariaId = text(service.barbearia_id || service.barbeariaId);
  const nome = text(service.nome);

  if (!id || !barbeariaId || !nome) {
    const error = new Error('Payload de serviço inválido para sincronização.');
    error.code = 'SYNC_SERVICE_INVALID';
    throw error;
  }

  await pool.query(
    `INSERT INTO servicos (
       id, barbearia_id, nome, descricao, imagem_url, preco, duracao_minutos,
       ativo, pausado_por_assinatura, ativo_antes_pausa_assinatura
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON DUPLICATE KEY UPDATE
       barbearia_id = VALUES(barbearia_id),
       nome = VALUES(nome),
       descricao = VALUES(descricao),
       imagem_url = VALUES(imagem_url),
       preco = VALUES(preco),
       duracao_minutos = VALUES(duracao_minutos),
       ativo = VALUES(ativo),
       pausado_por_assinatura = VALUES(pausado_por_assinatura),
       ativo_antes_pausa_assinatura = VALUES(ativo_antes_pausa_assinatura)`,
    [
      id,
      barbeariaId,
      nome,
      nullableText(service.descricao),
      nullableText(service.imagem_url),
      Number(service.preco || 0),
      Number(service.duracao_minutos || 30),
      service.ativo === false ? false : true,
      service.pausado_por_assinatura === true,
      service.ativo_antes_pausa_assinatura === null || service.ativo_antes_pausa_assinatura === undefined
        ? null
        : service.ativo_antes_pausa_assinatura === true,
    ]
  );

  return { ok: true, service_id: id };
}

async function syncServices(barbeariaId, services = []) {
  await ensureAgendamentoSchema();

  const normalizedBarbeariaId = text(barbeariaId);
  const items = Array.isArray(services) ? services : [];
  const synced = [];

  for (const service of items) {
    synced.push(await upsertService({
      ...service,
      barbearia_id: text(service?.barbearia_id || service?.barbeariaId) || normalizedBarbeariaId,
    }));
  }

  const ids = items.map((service) => text(service?.id)).filter(Boolean);
  if (normalizedBarbeariaId) {
    if (ids.length === 0) {
      await pool.query(
        `UPDATE servicos
         SET ativo = false
         WHERE barbearia_id = $1`,
        [normalizedBarbeariaId]
      );
    } else {
      const placeholders = ids.map((_, index) => `$${index + 2}`).join(', ');
      await pool.query(
        `UPDATE servicos
         SET ativo = false
         WHERE barbearia_id = $1
           AND id NOT IN (${placeholders})`,
        [normalizedBarbeariaId, ...ids]
      );
    }
  }

  return { ok: true, count: synced.length };
}

async function bootstrapBarbershop(payload = {}) {
  const results = {};

  if (payload.user) {
    results.user = await upsertUser(payload.user);
  }

  if (payload.barbearia) {
    results.barbearia = await upsertBarbearia(payload.barbearia);
  }

  if (payload.subscription) {
    results.subscription = await upsertSubscription(payload.subscription);
  }

  if (Array.isArray(payload.services)) {
    const barbeariaId = text(payload.barbearia?.id || payload.services?.[0]?.barbearia_id);
    results.services = await syncServices(barbeariaId, payload.services);
  }

  return { ok: true, synced: results };
}

module.exports = {
  ensureSyncSchema,
  upsertUser,
  upsertBarbearia,
  upsertSubscription,
  upsertService,
  syncServices,
  bootstrapBarbershop,
};
