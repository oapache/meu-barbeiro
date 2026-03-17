const pool = require('../config/database');
const config = require('../config');
const { getStripeClient } = require('../services/stripe');

const PLAN_MAP = {
  professionals_1: {
    key: 'professionals_1',
    label: '1_profissional',
    maxProfessionals: 1,
  },
  professionals_2_5: {
    key: 'professionals_2_5',
    label: '2_a_5_profissionais',
    maxProfessionals: 5,
  },
  professionals_6_15: {
    key: 'professionals_6_15',
    label: '6_a_15_profissionais',
    maxProfessionals: 15,
  },
  professionals_15_plus: {
    key: 'professionals_15_plus',
    label: 'mais_de_15_profissionais',
    maxProfessionals: 999,
  },
};

const SUBSCRIPTION_ALLOWED_STATUS = ['trialing', 'active', 'past_due'];

async function ensureSubscriptionSchema() {
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS subscription_grace_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE
  `);

  await pool.query(`
    ALTER TABLE barbearias
    ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS premium_locked_at TIMESTAMP WITH TIME ZONE
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assinaturas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
      usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      stripe_price_id TEXT,
      plan_key TEXT,
      status TEXT DEFAULT 'inactive',
      trial_end TIMESTAMP WITH TIME ZONE,
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      cancel_at_period_end BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_event_id TEXT UNIQUE NOT NULL,
      event_type TEXT,
      payload JSONB,
      processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

function getAuthenticatedUserId(req) {
  const fromHeader = req.headers['x-user-id'];
  const fromBody = req.body?.user_id;
  const fromQuery = req.query?.user_id;
  return String(fromHeader || fromBody || fromQuery || '').trim();
}

function getPlanDefinition(planKey) {
  const plan = PLAN_MAP[planKey];
  if (!plan) {
    throw new Error('Plano inválido. Use professionals_1, professionals_2_5, professionals_6_15 ou professionals_15_plus.');
  }

  const priceId = config.stripe.prices[plan.key];
  if (!priceId) {
    throw new Error(`Price do Stripe não configurado para o plano ${plan.key}.`);
  }

  const promoCoupon = config.stripe.promoCoupons[plan.key] || '';

  return {
    ...plan,
    priceId,
    promoCoupon,
  };
}

async function getUsuarioBarbearia(usuarioId, barbeariaIdFromBody) {
  const usuarioResult = await pool.query(
    'SELECT id, nome, email, stripe_customer_id FROM usuarios WHERE id = $1 LIMIT 1',
    [usuarioId]
  );

  if (usuarioResult.rows.length === 0) {
    throw new Error('Usuário não encontrado para assinatura.');
  }

  const usuario = usuarioResult.rows[0];

  const barbeariaResult = await pool.query(
    `SELECT id, nome, usuario_id, subscription_plan, subscription_status
     FROM barbearias
     WHERE id = COALESCE($1::uuid, id) AND usuario_id = $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [barbeariaIdFromBody || null, usuarioId]
  );

  if (barbeariaResult.rows.length === 0) {
    throw new Error('Barbearia não encontrada para este usuário.');
  }

  return {
    usuario,
    barbearia: barbeariaResult.rows[0],
  };
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
}) {
  await pool.query(
    `INSERT INTO assinaturas (
      usuario_id,
      barbearia_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      plan_key,
      status,
      trial_end,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (stripe_subscription_id)
    DO UPDATE SET
      stripe_price_id = EXCLUDED.stripe_price_id,
      plan_key = EXCLUDED.plan_key,
      status = EXCLUDED.status,
      trial_end = EXCLUDED.trial_end,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at = NOW()`,
    [
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
      Boolean(cancelAtPeriodEnd),
    ]
  );

  await pool.query(
    `UPDATE usuarios
     SET stripe_customer_id = $1,
         subscription_plan = $2,
         subscription_status = $3,
         subscription_trial_ends_at = $4,
         subscription_current_period_end = $5,
         subscription_grace_ends_at = CASE WHEN $3 IN ('active','trialing') THEN NULL ELSE subscription_grace_ends_at END,
         updated_at = NOW()
     WHERE id = $6`,
    [
      stripeCustomerId,
      planKey,
      status,
      trialEnd,
      currentPeriodEnd,
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
    [planKey, status, barbeariaId]
  );
}

function toDateOrNull(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
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
    const stripe = getStripeClient();

    let stripeCustomerId = usuario.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: usuario.nome || 'Barbeiro',
        email: usuario.email || undefined,
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
    if (plan.promoCoupon) {
      discounts.push({ coupon: plan.promoCoupon });
    }

    const successUrl = `${config.stripe.appUrl}/barbearia?checkout=success`;
    const cancelUrl = `${config.stripe.appUrl}/barbearia/planos?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      ...(discounts.length > 0 ? { discounts } : {}),
      subscription_data: {
        trial_period_days: 7,
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
    });

    return res.status(201).json({
      checkout_url: session.url,
      session_id: session.id,
      plan_key: plan.key,
      trial_days: 7,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao criar Checkout Session de assinatura.' });
  }
}

async function getCurrentSubscription(req, res) {
  try {
    await ensureSubscriptionSchema();

    const usuarioId = getAuthenticatedUserId(req);
    const barbeariaIdFromQuery = req.query?.barbearia_id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado. Envie x-user-id ou user_id.' });
    }

    const { barbearia } = await getUsuarioBarbearia(usuarioId, barbeariaIdFromQuery);

    const assinaturaResult = await pool.query(
      `SELECT *
       FROM assinaturas
       WHERE barbearia_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [barbearia.id]
    );

    const assinatura = assinaturaResult.rows[0] || null;

    return res.json({
      barbearia_id: barbearia.id,
      subscription: assinatura,
      status: assinatura?.status || barbearia.subscription_status || 'inactive',
      plan_key: assinatura?.plan_key || barbearia.subscription_plan || 'free',
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

    const { usuario } = await getUsuarioBarbearia(usuarioId, barbearia_id);

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

    const assinaturaResult = await pool.query(
      `SELECT *
       FROM assinaturas
       WHERE barbearia_id = $1
         AND status = ANY($2::text[])
       ORDER BY updated_at DESC
       LIMIT 1`,
      [barbearia.id, SUBSCRIPTION_ALLOWED_STATUS]
    );

    if (assinaturaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma assinatura ativa/trial encontrada para cancelamento.' });
    }

    const assinatura = assinaturaResult.rows[0];
    if (!assinatura.stripe_subscription_id) {
      return res.status(400).json({ error: 'Assinatura sem vinculo Stripe para cancelamento.' });
    }

    const stripe = getStripeClient();
    const updated = await stripe.subscriptions.update(assinatura.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await pool.query(
      `UPDATE assinaturas
       SET cancel_at_period_end = true,
           status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [updated.status, assinatura.id]
    );

    return res.json({
      message: 'Assinatura configurada para cancelamento ao fim do ciclo.',
      cancel_at_period_end: true,
      current_period_end: toDateOrNull(updated.current_period_end),
      status: updated.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Erro ao cancelar assinatura.' });
  }
}

async function markEventProcessed(eventId, eventType, payload) {
  const result = await pool.query(
    `INSERT INTO webhook_events (stripe_event_id, event_type, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING stripe_event_id`,
    [eventId, eventType, JSON.stringify(payload)]
  );

  return result.rows.length > 0;
}

async function syncFromSubscriptionObject(subscription) {
  const metadata = subscription?.metadata || {};
  const usuarioId = String(metadata.usuario_id || '').trim();
  const barbeariaId = String(metadata.barbearia_id || '').trim();
  const planKey = String(metadata.plan_key || '').trim() || 'free';

  if (!usuarioId || !barbeariaId) return;

  await upsertAssinaturaFromStripe({
    usuarioId,
    barbeariaId,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items?.data?.[0]?.price?.id || null,
    planKey,
    status: subscription.status,
    trialEnd: toDateOrNull(subscription.trial_end),
    currentPeriodStart: toDateOrNull(subscription.current_period_start),
    currentPeriodEnd: toDateOrNull(subscription.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
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
        const subscriptionId = session.subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncFromSubscriptionObject(subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncFromSubscriptionObject(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const assinaturaResult = await pool.query(
            `SELECT id, usuario_id, barbearia_id, plan_key
             FROM assinaturas
             WHERE stripe_subscription_id = $1
             LIMIT 1`,
            [subscriptionId]
          );

          if (assinaturaResult.rows.length > 0) {
            const assinatura = assinaturaResult.rows[0];
            const graceEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await pool.query(
              `UPDATE assinaturas
               SET status = 'grace_period', updated_at = NOW()
               WHERE id = $1`,
              [assinatura.id]
            );

            await pool.query(
              `UPDATE usuarios
               SET subscription_status = 'grace_period',
                   subscription_grace_ends_at = $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [graceEnds, assinatura.usuario_id]
            );

            await pool.query(
              `UPDATE barbearias
               SET subscription_status = 'grace_period',
                   updated_at = NOW()
               WHERE id = $1`,
              [assinatura.barbearia_id]
            );
          }
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const assinaturaResult = await pool.query(
            `SELECT id, usuario_id, barbearia_id
             FROM assinaturas
             WHERE stripe_subscription_id = $1
             LIMIT 1`,
            [subscriptionId]
          );

          if (assinaturaResult.rows.length > 0) {
            const assinatura = assinaturaResult.rows[0];

            await pool.query(
              `UPDATE assinaturas
               SET status = 'active', updated_at = NOW()
               WHERE id = $1`,
              [assinatura.id]
            );

            await pool.query(
              `UPDATE usuarios
               SET subscription_status = 'active',
                   subscription_grace_ends_at = NULL,
                   updated_at = NOW()
               WHERE id = $1`,
              [assinatura.usuario_id]
            );

            await pool.query(
              `UPDATE barbearias
               SET subscription_status = 'active',
                   premium_locked_at = NULL,
                   updated_at = NOW()
               WHERE id = $1`,
              [assinatura.barbearia_id]
            );
          }
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
  stripeWebhook,
};
