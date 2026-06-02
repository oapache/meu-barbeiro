const pool = require('../config/database');

let ensurePromise = null;

async function executarGarantiasSchema() {
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS preferencias JSON DEFAULT (JSON_OBJECT()),
    ADD COLUMN IF NOT EXISTS tax_id TEXT,
    ADD COLUMN IF NOT EXISTS billing_address JSON DEFAULT (JSON_OBJECT()),
    ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME,
    ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50),
    ADD COLUMN IF NOT EXISTS privacy_accepted_at DATETIME,
    ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(50),
    ADD COLUMN IF NOT EXISTS legal_acceptance_ip VARCHAR(100),
    ADD COLUMN IF NOT EXISTS legal_acceptance_user_agent TEXT
  `);
}

async function ensureUserProfileSchema() {
  if (!ensurePromise) {
    ensurePromise = executarGarantiasSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

module.exports = {
  ensureUserProfileSchema,
};
