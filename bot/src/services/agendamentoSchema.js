const pool = require('../config/database');

let ensurePromise = null;

async function executarGarantiasSchema() {
  await pool.query(`
    ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS cliente_nome_externo TEXT,
    ADD COLUMN IF NOT EXISTS cliente_telefone_externo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS origem VARCHAR(30) DEFAULT 'app',
    ADD COLUMN IF NOT EXISTS chatbot_session_id CHAR(36),
    ADD COLUMN IF NOT EXISTS servico_nome_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS servico_preco_snapshot NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS avaliacao_nota INTEGER,
    ADD COLUMN IF NOT EXISTS avaliacao_comentario TEXT,
    ADD COLUMN IF NOT EXISTS avaliacao_registrada_em DATETIME
  `);
}

async function ensureAgendamentoSchema() {
  if (!ensurePromise) {
    ensurePromise = executarGarantiasSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

module.exports = {
  ensureAgendamentoSchema,
};
