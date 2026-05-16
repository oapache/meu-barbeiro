const pool = require('../config/database');

const PREMIUM_UNLOCKED_STATUSES = ['active', 'trialing', 'past_due', 'grace_period'];
const MANAGEMENT_UNLOCKED_STATUSES = ['active', 'trialing', 'past_due'];
const PLAN_PROFESSIONAL_LIMITS = {
  free: 0,
  professionals_1: 1,
  professionals_2_5: 5,
  professionals_6_15: 15,
  professionals_15_plus: 999,
};

function hasPremiumFeatureAccess(status) {
  return PREMIUM_UNLOCKED_STATUSES.includes(String(status || '').trim());
}

function hasManagementAccess(status) {
  return MANAGEMENT_UNLOCKED_STATUSES.includes(String(status || '').trim());
}

function getMaxProfessionalsForPlan(planKey) {
  const normalizedPlanKey = String(planKey || '').trim();
  return PLAN_PROFESSIONAL_LIMITS[normalizedPlanKey] ?? 0;
}

async function getBarbeariaSubscriptionAccess(barbeariaId) {
  if (!barbeariaId) return null;

  const result = await pool.query(
    `SELECT
        b.id,
        b.subscription_status,
        b.subscription_plan,
        (
          SELECT a.status
          FROM assinaturas a
          WHERE a.barbearia_id = b.id
          ORDER BY a.updated_at DESC, a.created_at DESC
          LIMIT 1
        ) AS assinatura_status,
        (
          SELECT a.plan_key
          FROM assinaturas a
          WHERE a.barbearia_id = b.id
          ORDER BY a.updated_at DESC, a.created_at DESC
          LIMIT 1
        ) AS assinatura_plan_key
     FROM barbearias b
     WHERE b.id = $1
     LIMIT 1`,
    [barbeariaId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] || {};
  const status = row.assinatura_status || row.subscription_status || 'inactive';
  const planKey = row.assinatura_plan_key || row.subscription_plan || 'free';

  return {
    barbeariaId: row.id,
    status,
    planKey,
    maxProfessionals: getMaxProfessionalsForPlan(planKey),
    premiumUnlocked: hasPremiumFeatureAccess(status),
    managementUnlocked: hasManagementAccess(status),
  };
}

module.exports = {
  PREMIUM_UNLOCKED_STATUSES,
  MANAGEMENT_UNLOCKED_STATUSES,
  PLAN_PROFESSIONAL_LIMITS,
  hasPremiumFeatureAccess,
  hasManagementAccess,
  getMaxProfessionalsForPlan,
  getBarbeariaSubscriptionAccess,
};
