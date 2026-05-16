const pool = require('../config/database');

let ensurePromise = null;

async function ensureServicoAvailabilitySchema() {
  await pool.query(`
    ALTER TABLE servicos
    ADD COLUMN IF NOT EXISTS pausado_por_assinatura TINYINT(1) DEFAULT false,
    ADD COLUMN IF NOT EXISTS ativo_antes_pausa_assinatura TINYINT(1)
  `);
}

function ensureServicoAvailabilitySchemaOnce() {
  if (!ensurePromise) {
    ensurePromise = ensureServicoAvailabilitySchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

async function pauseServicosBySubscription(barbeariaId) {
  if (!barbeariaId) return;

  await ensureServicoAvailabilitySchemaOnce();

  await pool.query(
    `UPDATE servicos
     SET ativo_antes_pausa_assinatura = CASE
           WHEN pausado_por_assinatura THEN ativo_antes_pausa_assinatura
           ELSE ativo
         END,
         pausado_por_assinatura = true,
         ativo = false
     WHERE barbearia_id = $1`,
    [barbeariaId]
  );
}

async function resumeServicosBySubscription(barbeariaId) {
  if (!barbeariaId) return;

  await ensureServicoAvailabilitySchemaOnce();

  await pool.query(
    `UPDATE servicos
     SET ativo = COALESCE(ativo_antes_pausa_assinatura, ativo),
         pausado_por_assinatura = false,
         ativo_antes_pausa_assinatura = NULL
     WHERE barbearia_id = $1
       AND pausado_por_assinatura = true`,
    [barbeariaId]
  );
}

module.exports = {
  ensureServicoAvailabilitySchema: ensureServicoAvailabilitySchemaOnce,
  pauseServicosBySubscription,
  resumeServicosBySubscription,
};
