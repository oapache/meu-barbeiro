const pool = require('../config/database');
const config = require('../config');
const { getStripeClient } = require('../services/stripe');
const { getOwnedBarbearia, listOwnedBarbearias } = require('../services/ownership');
const { disconnectBotPorAssinatura } = require('../services/botClient');
const { safeSyncBarbeariaToBot } = require('../services/botSync');
const { pauseServicosBySubscription, resumeServicosBySubscription } = require('../services/servicoAvailability');

const PLAN_MAP = {
  professionals_1: { key: 'professionals_1', label: '1_profissional', maxProfessionals: 1, amount: 3490 },
  professionals_2_5: { key: 'professionals_2_5', label: '2_a_5_profissionais', maxProfessionals: 5, amount: 6990 },
  professionals_6_15: { key: 'professionals_6_15', label: '6_a_15_profissionais', maxProfessionals: 15, amount: 11990 },
  professionals_15_plus: { key: 'professionals_15_plus', label: 'mais_de_15_profissionais', maxProfessionals: 999, amount: 15990 },
};

const SUBSCRIPTION_ALLOWED_STATUS = ['pending', 'pending_approval', 'trialing', 'active', 'past_due', 'grace_period'];
const SUBSCRIPTION_BLOCKING_CREATE_STATUSES = ['pending', 'pending_approval', 'trialing', 'active', 'past_due', 'grace_period'];
const SUBSCRIPTION_UNLOCKED_STATUSES = ['trialing', 'active', 'past_due', 'grace_period'];
const TRIAL_DAYS = 7;
const STRIPE_SYNCABLE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'];
let ensureSubscriptionSchemaPromise = null;

async function executarGarantiasSubscriptionSchema() {
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255) DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS subscription_trial_ends_at DATETIME,
    ADD COLUMN IF NOT EXISTS subscription_grace_ends_at DATETIME,
    ADD COLUMN IF NOT EXISTS subscription_current_period_end DATETIME
  `);

  await pool.query(`
    ALTER TABLE barbearias
    ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255) DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS premium_locked_at DATETIME
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assinaturas (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
      usuario_id CHAR(36) REFERENCES usuarios(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id VARCHAR(255) UNIQUE,
      stripe_price_id TEXT,
      plan_key TEXT,
      status VARCHAR(255) DEFAULT 'inactive',
      trial_end DATETIME,
      current_period_start DATETIME,
      current_period_end DATETIME,
      cancel_at_period_end TINYINT(1) DEFAULT false,
      provider VARCHAR(255) DEFAULT 'stripe',
      payment_method VARCHAR(255) DEFAULT 'card',
      provider_customer_id TEXT,
      provider_subscription_id TEXT,
      provider_price_id TEXT,
      provider_checkout_url TEXT,
      provider_payload JSON DEFAULT (JSON_OBJECT()),
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE assinaturas
    ADD COLUMN IF NOT EXISTS provider VARCHAR(255) DEFAULT 'stripe',
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255) DEFAULT 'card',
    ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT,
    ADD COLUMN IF NOT EXISTS provider_payload JSON DEFAULT (JSON_OBJECT())
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
      event_type TEXT,
      payload JSON,
      processed_at DATETIME DEFAULT NOW(),
      created_at DATETIME DEFAULT NOW()
    )
  `);
}

async function ensureSubscriptionSchema() {
  if (!ensureSubscriptionSchemaPromise) {
    ensureSubscriptionSchemaPromise = executarGarantiasSubscriptionSchema().catch((error) => {
      ensureSubscriptionSchemaPromise = null;
      throw error;
    });
  }

  return ensureSubscriptionSchemaPromise;
}

function getAuthenticatedUserId(req) {
  const fromAuth = req.auth?.id;
  const fromHeader = req.headers['x-user-id'];
  const fromBody = req.body?.user_id;
  const fromQuery = req.query?.user_id;
  return String(fromAuth || fromHeader || fromBody || fromQuery || '').trim();
}

function normalizarTexto(value) {
  return String(value || '').trim();
}

function parseBooleanFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(normalizarTexto(value).toLowerCase());
}

function normalizarStatusLocal(status) {
  const normalized = normalizarTexto(status).toLowerCase();
  if (normalized === 'pending_approval') return 'pending';
  return normalized || 'inactive';
}

function toDateOrNull(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(Number(unixSeconds) * 1000);
}

function adicionarMeses(dataBase, quantidade) {
  if (!dataBase) return null;
  const data = new Date(dataBase);
  if (Number.isNaN(data.getTime())) return null;
  data.setMonth(data.getMonth() + quantidade);
  return data;
}

function getStripeSubscriptionStatusScore(status) {
  switch (normalizarTexto(status)) {
    case 'active': return 7;
    case 'trialing': return 6;
    case 'past_due': return 5;
    case 'unpaid': return 4;
    case 'canceled': return 3;
    case 'incomplete': return 2;
    case 'incomplete_expired': return 1;
    default: return 0;
  }
}

function getPlanDefinition(planKey) {
  const plan = PLAN_MAP[planKey];
  if (!plan) {
    throw new Error('Plano inválido. Use professionals_1, professionals_2_5, professionals_6_15 ou professionals_15_plus.');
  }

  return {
    ...plan,
    priceId: config.stripe.prices?.[plan.key] || '',
    promoCoupon: config.stripe.promoCoupons?.[plan.key] || '',
  };
}

function serializarAssinatura(row) {
  if (!row) return null;
  return {
    ...row,
    status: normalizarStatusLocal(row.status),
    cancel_at_period_end: row.cancel_at_period_end === true,
    provider_payload: row.provider_payload || {},
  };
}

async function getUsuarioBarbearia(usuarioId, barbeariaIdFromBody) {
  const solicitanteResult = await pool.query(
    `SELECT id, nome, email, telefone, stripe_customer_id
     FROM usuarios
     WHERE id = $1
     LIMIT 1`,
    [usuarioId]
  );

  if (solicitanteResult.rows.length === 0) {
    throw new Error('Usuário não encontrado para assinatura.');
  }

  let barbearia = null;

  if (normalizarTexto(barbeariaIdFromBody)) {
    barbearia = await getOwnedBarbearia(usuarioId, barbeariaIdFromBody);
  } else {
    const barbearias = await listOwnedBarbearias(usuarioId);
    barbearia = barbearias[0] || null;
  }

  if (!barbearia) {
    throw new Error('Barbearia não encontrada para este usuário.');
  }

  const usuarioResult = await pool.query(
    `SELECT id, nome, email, telefone, stripe_customer_id
     FROM usuarios
     WHERE id = $1
     LIMIT 1`,
    [barbearia.usuario_id]
  );

  if (usuarioResult.rows.length === 0) {
    throw new Error('Usuário responsável pela cobrança não encontrado para esta barbearia.');
  }

  return {
    usuario: usuarioResult.rows[0],
    solicitante: solicitanteResult.rows[0],
    barbearia,
  };
}

function selectMostRelevantStripeSubscription(subscriptions, barbeariaId) {
  const lista = Array.isArray(subscriptions) ? subscriptions : [];
  if (lista.length === 0) return null;

  const barbeariaIdNormalizada = normalizarTexto(barbeariaId);
  const correspondentes = lista.filter((subscription) => (
    normalizarTexto(subscription?.metadata?.barbearia_id) === barbeariaIdNormalizada
  ));

  const candidatas = correspondentes.length > 0
    ? correspondentes
    : lista.length === 1
      ? lista
      : [];

  if (candidatas.length === 0) return null;

  return [...candidatas]
    .filter((subscription) => STRIPE_SYNCABLE_STATUSES.includes(normalizarTexto(subscription?.status)))
    .sort((a, b) => {
      const score = getStripeSubscriptionStatusScore(b?.status) - getStripeSubscriptionStatusScore(a?.status);
      if (score !== 0) return score;
      return Number(b?.created || 0) - Number(a?.created || 0);
    })[0] || null;
}

async function findCurrentSubscription(barbeariaId) {
  const result = await pool.query(
    `SELECT *
     FROM assinaturas
     WHERE barbearia_id = $1
     ORDER BY
       CASE status
         WHEN 'active' THEN 7
         WHEN 'trialing' THEN 6
         WHEN 'past_due' THEN 5
         WHEN 'grace_period' THEN 4
         WHEN 'pending' THEN 3
         WHEN 'pending_approval' THEN 3
         WHEN 'unpaid' THEN 2
         WHEN 'incomplete' THEN 1
         ELSE 0
       END DESC,
       updated_at DESC,
       created_at DESC
     LIMIT 1`,
    [barbeariaId]
  );

  return result.rows[0] || null;
}

async function findBlockingSubscription(barbeariaId) {
  const statuses = SUBSCRIPTION_BLOCKING_CREATE_STATUSES;
  const statusPlaceholders = statuses.map((_, index) => `$${index + 2}`).join(', ');
  const result = await pool.query(
    `SELECT *
     FROM assinaturas
     WHERE barbearia_id = $1
       AND status IN (${statusPlaceholders})
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`,
    [barbeariaId, ...statuses]
  );

  return result.rows[0] || null;
}

async function findExistingSubscriptionRecord({ stripeSubscriptionId, barbeariaId }) {
  if (normalizarTexto(stripeSubscriptionId)) {
    const result = await pool.query(
      'SELECT * FROM assinaturas WHERE stripe_subscription_id = $1 LIMIT 1',
      [stripeSubscriptionId]
    );
    if (result.rows[0]) return result.rows[0];
  }

  if (normalizarTexto(barbeariaId)) {
    return findCurrentSubscription(barbeariaId);
  }

  return null;
}

async function applySubscriptionSideEffects({ usuarioId, barbeariaId, planKey, status, trialEnd, currentPeriodEnd, graceEndsAt }) {
  const localStatus = normalizarStatusLocal(status);
  const effectivePlan = ['inactive', 'canceled', 'blocked', 'unpaid', 'incomplete', 'incomplete_expired'].includes(localStatus)
    ? 'free'
    : (planKey || 'free');

  await pool.query(
    `UPDATE usuarios
     SET subscription_plan = $1,
         subscription_status = $2,
         subscription_trial_ends_at = $3,
         subscription_current_period_end = $4,
         subscription_grace_ends_at = CASE
           WHEN $2 = 'grace_period' THEN $5
           WHEN $2 IN ('active','trialing','past_due') THEN NULL
           ELSE subscription_grace_ends_at
         END,
         updated_at = NOW()
     WHERE id = $6`,
    [
      effectivePlan,
      localStatus,
      trialEnd,
      currentPeriodEnd,
      graceEndsAt || null,
      usuarioId,
    ]
  );

  await pool.query(
    `UPDATE barbearias
     SET subscription_plan = $1,
         subscription_status = $2,
         premium_locked_at = CASE WHEN $2 = 'blocked' THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $3`,
    [effectivePlan, localStatus, barbeariaId]
  );

  if (SUBSCRIPTION_UNLOCKED_STATUSES.includes(localStatus)) {
    await resumeServicosBySubscription(barbeariaId);
    return;
  }

  await pauseServicosBySubscription(barbeariaId);
  await disconnectBotPorAssinatura({
    barbeariaId,
    subscriptionStatus: localStatus,
  });
}

async function upsertAssinaturaRecord({
  existing,
  usuarioId,
  barbeariaId,
  planKey,
  status,
  trialEnd = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
  provider = 'stripe',
  paymentMethod = 'card',
  providerCustomerId = null,
  providerSubscriptionId = null,
  providerPriceId = null,
  providerCheckoutUrl = null,
  providerPayload = {},
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  stripePriceId = null,
  applyEffects = true,
  graceEndsAt = null,
}) {
  const atual = existing || await findExistingSubscriptionRecord({
    stripeSubscriptionId,
    barbeariaId,
  });

  const localStatus = normalizarStatusLocal(status);
  const resolvedPlanKey = planKey || atual?.plan_key || 'free';

  if (atual?.id) {
    await pool.query(
      `UPDATE assinaturas
       SET usuario_id = $1,
           barbearia_id = $2,
           stripe_customer_id = $3,
           stripe_subscription_id = $4,
           stripe_price_id = $5,
           plan_key = $6,
           status = $7,
           trial_end = $8,
           current_period_start = $9,
           current_period_end = $10,
           cancel_at_period_end = $11,
           provider = $12,
           payment_method = $13,
           provider_customer_id = $14,
           provider_subscription_id = $15,
           provider_price_id = $16,
           provider_checkout_url = $17,
           provider_payload = $18,
           updated_at = NOW()
       WHERE id = $19`,
      [
        usuarioId,
        barbeariaId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        resolvedPlanKey,
        localStatus,
        trialEnd,
        currentPeriodStart,
        currentPeriodEnd,
        Boolean(cancelAtPeriodEnd),
        provider,
        paymentMethod,
        providerCustomerId,
        providerSubscriptionId,
        providerPriceId,
        providerCheckoutUrl,
        JSON.stringify(providerPayload || {}),
        atual.id,
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO assinaturas (
         usuario_id, barbearia_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
         plan_key, status, trial_end, current_period_start, current_period_end, cancel_at_period_end,
         provider, payment_method, provider_customer_id, provider_subscription_id, provider_price_id,
         provider_checkout_url, provider_payload
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        usuarioId,
        barbeariaId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        resolvedPlanKey,
        localStatus,
        trialEnd,
        currentPeriodStart,
        currentPeriodEnd,
        Boolean(cancelAtPeriodEnd),
        provider,
        paymentMethod,
        providerCustomerId,
        providerSubscriptionId,
        providerPriceId,
        providerCheckoutUrl,
        JSON.stringify(providerPayload || {}),
      ]
    );
  }

  if (applyEffects) {
    await applySubscriptionSideEffects({
      usuarioId,
      barbeariaId,
      planKey: resolvedPlanKey,
      status: localStatus,
      trialEnd,
      currentPeriodEnd,
      graceEndsAt,
    });
  }

  await safeSyncBarbeariaToBot(barbeariaId);
}

async function upsertAssinaturaFromStripe({
  usuarioId,
  barbeariaId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  planKey,
  status,
  trialEnd,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  providerPayload = {},
}) {
  await upsertAssinaturaRecord({
    usuarioId,
    barbeariaId,
    planKey,
    status,
    trialEnd,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    provider: 'stripe',
    paymentMethod: 'card',
    providerCustomerId: stripeCustomerId,
    providerSubscriptionId: stripeSubscriptionId,
    providerPriceId: stripePriceId,
    providerPayload,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId,
  });

  await pool.query(
    `UPDATE usuarios
     SET stripe_customer_id = COALESCE(NULLIF($1, ''), stripe_customer_id),
         updated_at = NOW()
     WHERE id = $2`,
    [normalizarTexto(stripeCustomerId), usuarioId]
  );
}

async function syncFromStripeSubscriptionObject(subscription, fallback = {}) {
  const existing = fallback.existing || await findExistingSubscriptionRecord({
    stripeSubscriptionId: subscription?.id,
    barbeariaId: fallback.barbeariaId,
  });
  const metadata = subscription?.metadata || {};
  const usuarioId = normalizarTexto(metadata.usuario_id || fallback.usuarioId || existing?.usuario_id);
  const barbeariaId = normalizarTexto(metadata.barbearia_id || fallback.barbeariaId || existing?.barbearia_id);
  const planKey = normalizarTexto(metadata.plan_key || fallback.planKey || existing?.plan_key) || 'free';

  if (!usuarioId || !barbeariaId) return;

  await upsertAssinaturaFromStripe({
    usuarioId,
    barbeariaId,
    stripeCustomerId: normalizarTexto(subscription?.customer),
    stripeSubscriptionId: normalizarTexto(subscription?.id),
    stripePriceId: normalizarTexto(subscription?.items?.data?.[0]?.price?.id),
    planKey,
    status: normalizarTexto(subscription?.status) || 'inactive',
    trialEnd: toDateOrNull(subscription?.trial_end),
    currentPeriodStart: toDateOrNull(subscription?.current_period_start),
    currentPeriodEnd: toDateOrNull(subscription?.current_period_end),
    cancelAtPeriodEnd: subscription?.cancel_at_period_end === true,
    providerPayload: subscription || {},
  });
}

async function syncCurrentSubscriptionFromStripe({ usuario, barbearia, checkoutSessionId }) {
  if (!config.stripe.secretKey || !usuario?.stripe_customer_id || !barbearia?.id) {
    return null;
  }

  const stripe = getStripeClient();
  let subscription = null;

  if (checkoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(String(checkoutSessionId));
    const sessionCustomerId = normalizarTexto(session?.customer);
    const sessionBarbeariaId = normalizarTexto(session?.metadata?.barbearia_id);
    const stripeCustomerId = normalizarTexto(usuario.stripe_customer_id);

    if (
      session?.subscription
      && (!stripeCustomerId || sessionCustomerId === stripeCustomerId)
      && (!sessionBarbeariaId || sessionBarbeariaId === String(barbearia.id))
    ) {
      subscription = await stripe.subscriptions.retrieve(String(session.subscription));
    }
  }

  if (!subscription) {
    const subscriptions = await stripe.subscriptions.list({
      customer: String(usuario.stripe_customer_id),
      status: 'all',
      limit: 10,
    });
    subscription = selectMostRelevantStripeSubscription(subscriptions?.data, barbearia.id);
  }

  if (!subscription) return null;

  await syncFromStripeSubscriptionObject(subscription, {
    usuarioId: usuario.id,
    barbeariaId: barbearia.id,
  });

  return subscription;
}

async function createStripeCheckoutForPlan({ usuario, barbearia, plan }) {
  if (!plan.priceId) {
    throw new Error(`Price do Stripe não configurado para o plano ${plan.key}.`);
  }

  const stripe = getStripeClient();
  let stripeCustomerId = usuario.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: usuario.nome || 'Barbeiro',
      email: usuario.email || undefined,
      phone: usuario.telefone || undefined,
      metadata: {
        usuario_id: String(usuario.id),
        barbearia_id: String(barbearia.id),
      },
    });
    stripeCustomerId = customer.id;

    await pool.query(
      'UPDATE usuarios SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
      [stripeCustomerId, usuario.id]
    );
  }

  const discounts = [];
  if (plan.promoCoupon && TRIAL_DAYS === 0) {
    discounts.push({ coupon: plan.promoCoupon });
  }

  const checkoutPayload = {
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${config.stripe.appUrl}/barbearia?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe.appUrl}/barbearia/planos?checkout=cancel`,
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        usuario_id: String(usuario.id),
        barbearia_id: String(barbearia.id),
        plan_key: plan.key,
      },
    },
    metadata: {
      usuario_id: String(usuario.id),
      barbearia_id: String(barbearia.id),
      plan_key: plan.key,
      max_professionals: String(plan.maxProfessionals),
    },
  };

  if (discounts.length > 0) {
    checkoutPayload.discounts = discounts;
  } else {
    checkoutPayload.allow_promotion_codes = true;
  }

  const session = await stripe.checkout.sessions.create(checkoutPayload);
  return {
    provider: 'stripe',
    payment_method: 'card',
    checkout_url: session.url,
    session_id: session.id,
    plan_key: plan.key,
    trial_days: TRIAL_DAYS,
  };
}

async function createCheckoutSession(req, res) {
  try {
    await ensureSubscriptionSchema();
    const usuarioId = getAuthenticatedUserId(req);
    const { plan_key, barbearia_id } = req.body || {};

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado. Envie x-user-id ou user_id.' });
    }
    if (!plan_key) {
      return res.status(400).json({ error: 'plan_key é obrigatório.' });
    }

    const plan = getPlanDefinition(plan_key);
    const { usuario, barbearia } = await getUsuarioBarbearia(usuarioId, barbearia_id);
    const currentBlocking = await findBlockingSubscription(barbearia.id);

    if (currentBlocking) {
      const statusAtual = normalizarStatusLocal(currentBlocking.status);
      const mesmoPlano = normalizarTexto(currentBlocking.plan_key) === plan.key;
      const mensagem = mesmoPlano
        ? 'Esse plano já está ativo ou aguardando confirmação para esta barbearia.'
        : `Já existe uma assinatura ${statusAtual === 'pending' ? 'aguardando aprovação' : 'ativa'} para esta barbearia.`;
      return res.status(409).json({ error: mensagem });
    }

    return res.status(201).json(await createStripeCheckoutForPlan({ usuario, barbearia, plan }));
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao iniciar assinatura.' });
  }
}

async function getCurrentSubscription(req, res) {
  try {
    await ensureSubscriptionSchema();
    const usuarioId = getAuthenticatedUserId(req);
    const barbeariaIdFromQuery = req.query?.barbearia_id;
    const checkoutSessionId = normalizarTexto(req.query?.checkout_session_id);
    const forceSync = parseBooleanFlag(req.query?.sync) || parseBooleanFlag(req.query?.refresh) || Boolean(checkoutSessionId);

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado. Envie x-user-id ou user_id.' });
    }

    const { usuario, barbearia } = await getUsuarioBarbearia(usuarioId, barbeariaIdFromQuery);
    let assinatura = await findCurrentSubscription(barbearia.id);

    if (forceSync) {
      try {
        await syncCurrentSubscriptionFromStripe({ usuario, barbearia, checkoutSessionId });
      } catch (syncError) {
        console.error('Falha ao sincronizar assinatura:', syncError?.message || syncError);
      }

      assinatura = await findCurrentSubscription(barbearia.id);
    }

    const assinaturaSerializada = serializarAssinatura(assinatura);

    return res.json({
      barbearia_id: barbearia.id,
      subscription: assinaturaSerializada,
      status: assinaturaSerializada?.status || normalizarStatusLocal(barbearia.subscription_status) || 'inactive',
      plan_key: assinaturaSerializada?.plan_key || barbearia.subscription_plan || 'free',
      provider: assinaturaSerializada?.provider || 'stripe',
      payment_method: assinaturaSerializada?.payment_method || 'card',
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao consultar assinatura atual.' });
  }
}

async function createCustomerPortal(req, res) {
  try {
    await ensureSubscriptionSchema();
    const usuarioId = getAuthenticatedUserId(req);
    const { barbearia_id } = req.body || {};

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado. Envie x-user-id ou user_id.' });
    }

    const { usuario, barbearia } = await getUsuarioBarbearia(usuarioId, barbearia_id);
    const assinatura = await findCurrentSubscription(barbearia.id);

    if (!usuario.stripe_customer_id) {
      return res.status(400).json({ error: 'Cliente Stripe ainda não existe para este usuário.' });
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: usuario.stripe_customer_id,
      return_url: `${config.stripe.appUrl}/barbearia`,
    });

    return res.json({ portal_url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao criar sessao do portal de cobranca.' });
  }
}

async function cancelSubscription(req, res) {
  try {
    await ensureSubscriptionSchema();
    const usuarioId = getAuthenticatedUserId(req);
    const { barbearia_id } = req.body || {};

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado. Envie x-user-id ou user_id.' });
    }

    const { barbearia } = await getUsuarioBarbearia(usuarioId, barbearia_id);
    const assinatura = await findCurrentSubscription(barbearia.id);

    if (!assinatura || !SUBSCRIPTION_ALLOWED_STATUS.includes(normalizarTexto(assinatura.status))) {
      return res.status(404).json({ error: 'Nenhuma assinatura ativa, em carência ou aguardando aprovação encontrada para cancelamento.' });
    }

    if (!assinatura.stripe_subscription_id) {
      return res.status(400).json({ error: 'Assinatura sem vínculo Stripe para cancelamento.' });
    }

    if (assinatura.cancel_at_period_end) {
      return res.json({
        message: 'O cancelamento desta assinatura já está agendado para o fim do ciclo.',
        cancel_at_period_end: true,
        current_period_end: assinatura.current_period_end,
        status: normalizarStatusLocal(assinatura.status),
      });
    }

    const stripe = getStripeClient();
    const updated = await stripe.subscriptions.update(assinatura.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await upsertAssinaturaRecord({
      existing: assinatura,
      usuarioId: assinatura.usuario_id,
      barbeariaId: assinatura.barbearia_id,
      planKey: assinatura.plan_key,
      status: updated.status,
      trialEnd: assinatura.trial_end,
      currentPeriodStart: assinatura.current_period_start,
      currentPeriodEnd: toDateOrNull(updated.current_period_end) || assinatura.current_period_end,
      cancelAtPeriodEnd: true,
      provider: 'stripe',
      paymentMethod: 'card',
      providerCustomerId: assinatura.provider_customer_id,
      providerSubscriptionId: assinatura.provider_subscription_id || assinatura.stripe_subscription_id,
      providerPriceId: assinatura.provider_price_id || assinatura.stripe_price_id,
      providerCheckoutUrl: assinatura.provider_checkout_url,
      providerPayload: {
        ...(assinatura.provider_payload || {}),
        cancel_at_period_end: true,
      },
      stripeCustomerId: assinatura.stripe_customer_id,
      stripeSubscriptionId: assinatura.stripe_subscription_id,
      stripePriceId: assinatura.stripe_price_id,
    });

    return res.json({
      message: 'Assinatura configurada para cancelamento ao fim do ciclo.',
      cancel_at_period_end: true,
      current_period_end: toDateOrNull(updated.current_period_end),
      status: normalizarStatusLocal(updated.status),
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao cancelar assinatura.' });
  }
}

async function syncBotSubscriptionData(req, res) {
  try {
    const usuarioId = normalizarTexto(req.auth?.id || req.headers['x-user-id'] || req.body?.user_id);
    const barbeariaId = normalizarTexto(req.body?.barbearia_id || req.query?.barbearia_id);

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado. Envie x-user-id ou user_id.' });
    }

    const { barbearia } = await getUsuarioBarbearia(usuarioId, barbeariaId);
    const sync = await safeSyncBarbeariaToBot(barbearia.id);

    return res.json({
      ok: true,
      barbearia_id: barbearia.id,
      sync,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao sincronizar dados com o bot.' });
  }
}

async function markEventProcessed(eventId, eventType, payload) {
  const result = await pool.query(
    `INSERT INTO webhook_events (stripe_event_id, event_type, payload)
     VALUES ($1, $2, $3)
     ON DUPLICATE KEY UPDATE stripe_event_id = stripe_event_id`,
    [eventId, eventType, JSON.stringify(payload)]
  );

  return result.rowCount > 0;
}

async function stripeWebhook(req, res) {
  try {
    await ensureSubscriptionSchema();

    let event;
    const stripe = getStripeClient();
    const signature = req.headers['stripe-signature'];

    if (config.stripe.webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
    } else {
      const payloadText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});
      event = JSON.parse(payloadText || '{}');
    }

    if (!event?.id || !event?.type) {
      return res.status(400).json({ error: 'Evento Stripe inválido.' });
    }

    const inserted = await markEventProcessed(event.id, event.type, event.data?.object || {});
    if (!inserted) {
      return res.json({ received: true, duplicated: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session?.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncFromStripeSubscriptionObject(subscription, {
            usuarioId: session?.metadata?.usuario_id,
            barbeariaId: session?.metadata?.barbearia_id,
            planKey: session?.metadata?.plan_key,
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncFromStripeSubscriptionObject(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const assinatura = await findExistingSubscriptionRecord({
          stripeSubscriptionId: invoice?.subscription,
        });

        if (assinatura) {
          const graceEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await upsertAssinaturaRecord({
            existing: assinatura,
            usuarioId: assinatura.usuario_id,
            barbeariaId: assinatura.barbearia_id,
            planKey: assinatura.plan_key,
            status: 'grace_period',
            trialEnd: assinatura.trial_end,
            currentPeriodStart: assinatura.current_period_start,
            currentPeriodEnd: assinatura.current_period_end,
            cancelAtPeriodEnd: assinatura.cancel_at_period_end,
            provider: 'stripe',
            paymentMethod: 'card',
            providerCustomerId: assinatura.provider_customer_id || assinatura.stripe_customer_id,
            providerSubscriptionId: assinatura.provider_subscription_id || assinatura.stripe_subscription_id,
            providerPriceId: assinatura.provider_price_id || assinatura.stripe_price_id,
            providerCheckoutUrl: assinatura.provider_checkout_url,
            providerPayload: {
              ...(assinatura.provider_payload || {}),
              invoice_payment_failed: invoice,
            },
            stripeCustomerId: assinatura.stripe_customer_id,
            stripeSubscriptionId: assinatura.stripe_subscription_id,
            stripePriceId: assinatura.stripe_price_id,
            graceEndsAt,
          });
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const assinatura = await findExistingSubscriptionRecord({
          stripeSubscriptionId: invoice?.subscription,
        });

        if (assinatura) {
          await upsertAssinaturaRecord({
            existing: assinatura,
            usuarioId: assinatura.usuario_id,
            barbeariaId: assinatura.barbearia_id,
            planKey: assinatura.plan_key,
            status: 'active',
            trialEnd: assinatura.trial_end,
            currentPeriodStart: assinatura.current_period_start || new Date(),
            currentPeriodEnd: assinatura.current_period_end || adicionarMeses(new Date(), 1),
            cancelAtPeriodEnd: assinatura.cancel_at_period_end,
            provider: 'stripe',
            paymentMethod: 'card',
            providerCustomerId: assinatura.provider_customer_id || assinatura.stripe_customer_id,
            providerSubscriptionId: assinatura.provider_subscription_id || assinatura.stripe_subscription_id,
            providerPriceId: assinatura.provider_price_id || assinatura.stripe_price_id,
            providerCheckoutUrl: assinatura.provider_checkout_url,
            providerPayload: {
              ...(assinatura.provider_payload || {}),
              invoice_paid: invoice,
            },
            stripeCustomerId: assinatura.stripe_customer_id,
            stripeSubscriptionId: assinatura.stripe_subscription_id,
            stripePriceId: assinatura.stripe_price_id,
          });
        }
        break;
      }
      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Falha ao processar webhook Stripe.' });
  }
}

module.exports = {
  createCheckoutSession,
  getCurrentSubscription,
  createCustomerPortal,
  cancelSubscription,
  syncBotSubscriptionData,
  stripeWebhook,
};
