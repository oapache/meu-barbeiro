const pool = require('../config/database');
const {
  syncBotUser,
  bootstrapBotBarbearia,
} = require('./botClient');

function text(value) {
  return String(value || '').trim();
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function serializeUser(row = {}) {
  if (!row?.id) return null;

  return {
    id: row.id,
    email: row.email,
    nome: row.nome,
    telefone: row.telefone || '',
    tipo: row.tipo || 'cliente',
    avatar_url: row.avatar_url || '',
    preferencias: parseJson(row.preferencias, {}),
    tax_id: row.tax_id || '',
    billing_address: parseJson(row.billing_address, {}),
    stripe_customer_id: row.stripe_customer_id || '',
    subscription_plan: row.subscription_plan || 'free',
    subscription_status: row.subscription_status || 'inactive',
    subscription_trial_ends_at: row.subscription_trial_ends_at || null,
    subscription_grace_ends_at: row.subscription_grace_ends_at || null,
    subscription_current_period_end: row.subscription_current_period_end || null,
  };
}

function serializeBarbearia(row = {}) {
  if (!row?.id) return null;

  return {
    id: row.id,
    usuario_id: row.usuario_id,
    nome: row.nome,
    telefone: row.telefone || '',
    endereco: row.endereco || '',
    logo_url: row.logo_url || '',
    horario_abertura: row.horario_abertura || '09:00:00',
    horario_fechamento: row.horario_fechamento || '20:00:00',
    horarios_semana: parseJson(row.horarios_semana, null),
    whatsapp_link: row.whatsapp_link || '',
    nota_media: Number(row.nota_media || 0),
    total_avaliacoes: Number(row.total_avaliacoes || 0),
    subscription_plan: row.subscription_plan || 'free',
    subscription_status: row.subscription_status || 'inactive',
    premium_locked_at: row.premium_locked_at || null,
    chatbot_mode: row.chatbot_mode || 'legacy',
    chatbot_enabled: row.chatbot_enabled !== false,
  };
}

function serializeSubscription(row = {}, fallback = {}) {
  const barbeariaId = row?.barbearia_id || fallback.barbearia_id;
  const usuarioId = row?.usuario_id || fallback.usuario_id;

  if (!barbeariaId || !usuarioId) return null;

  return {
    id: row.id || '',
    barbearia_id: barbeariaId,
    usuario_id: usuarioId,
    stripe_customer_id: row.stripe_customer_id || '',
    stripe_subscription_id: row.stripe_subscription_id || '',
    stripe_price_id: row.stripe_price_id || '',
    plan_key: row.plan_key || fallback.subscription_plan || 'free',
    status: row.status || fallback.subscription_status || 'inactive',
    trial_end: row.trial_end || null,
    current_period_start: row.current_period_start || null,
    current_period_end: row.current_period_end || fallback.subscription_current_period_end || null,
    cancel_at_period_end: row.cancel_at_period_end === true,
    provider: row.provider || 'stripe',
    payment_method: row.payment_method || 'card',
    provider_customer_id: row.provider_customer_id || '',
    provider_subscription_id: row.provider_subscription_id || '',
    provider_price_id: row.provider_price_id || '',
    provider_checkout_url: row.provider_checkout_url || '',
    provider_payload: parseJson(row.provider_payload, {}),
  };
}

async function getBarbeariaSyncPayload(barbeariaId) {
  const id = text(barbeariaId);
  if (!id) return null;

  const barbeariaResult = await pool.query(
    `SELECT *
     FROM barbearias
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  const barbearia = barbeariaResult.rows?.[0];
  if (!barbearia?.id) return null;

  const usuarioResult = await pool.query(
    `SELECT id, email, nome, telefone, tipo, avatar_url, preferencias, tax_id, billing_address,
            stripe_customer_id, subscription_plan, subscription_status,
            subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end
     FROM usuarios
     WHERE id = $1
     LIMIT 1`,
    [barbearia.usuario_id]
  );

  const assinaturaResult = await pool.query(
    `SELECT *
     FROM assinaturas
     WHERE barbearia_id = $1
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`,
    [id]
  );

  const userPayload = serializeUser(usuarioResult.rows?.[0]);
  const barbeariaPayload = serializeBarbearia(barbearia);
  const subscriptionPayload = serializeSubscription(assinaturaResult.rows?.[0], {
    usuario_id: barbearia.usuario_id,
    barbearia_id: barbearia.id,
    subscription_plan: barbearia.subscription_plan,
    subscription_status: barbearia.subscription_status,
  });

  return {
    user: userPayload,
    barbearia: barbeariaPayload,
    subscription: subscriptionPayload,
  };
}

async function safeSyncUserToBot(user = {}) {
  try {
    if (!user?.id || !user?.email) return { skipped: true, reason: 'USER_PAYLOAD_INCOMPLETE' };
    return await syncBotUser(serializeUser(user));
  } catch (error) {
    console.warn('[BOT_SYNC.user] Falha ao sincronizar usuário com o bot', {
      userId: user?.id,
      code: error?.code,
      message: error?.message,
    });
    return { skipped: true, reason: 'BOT_SYNC_FAILED' };
  }
}

async function safeSyncBarbeariaToBot(barbeariaId) {
  try {
    const payload = await getBarbeariaSyncPayload(barbeariaId);
    if (!payload?.user || !payload?.barbearia) {
      return { skipped: true, reason: 'BARBEARIA_PAYLOAD_INCOMPLETE' };
    }

    return await bootstrapBotBarbearia(payload);
  } catch (error) {
    console.warn('[BOT_SYNC.barbearia] Falha ao sincronizar barbearia com o bot', {
      barbeariaId,
      code: error?.code,
      message: error?.message,
    });
    return { skipped: true, reason: 'BOT_SYNC_FAILED' };
  }
}

module.exports = {
  getBarbeariaSyncPayload,
  safeSyncUserToBot,
  safeSyncBarbeariaToBot,
};
