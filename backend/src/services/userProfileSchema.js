const pool = require('../config/database');

let ensurePromise = null;

async function executarGarantiasSchema() {
  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS preferencias JSON DEFAULT (JSON_OBJECT()),
    ADD COLUMN IF NOT EXISTS tax_id TEXT,
    ADD COLUMN IF NOT EXISTS billing_address JSON DEFAULT (JSON_OBJECT())
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
