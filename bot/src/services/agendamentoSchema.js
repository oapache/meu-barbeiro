const pool = require('../config/database');

let ensurePromise = null;

async function executarGarantiasSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS servicos (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      barbearia_id CHAR(36),
      nome VARCHAR(255) NOT NULL,
      descricao TEXT,
      imagem_url TEXT,
      preco DECIMAL(10, 2) NOT NULL DEFAULT 0,
      duracao_minutos INTEGER DEFAULT 30,
      ativo TINYINT(1) DEFAULT true,
      pausado_por_assinatura TINYINT(1) DEFAULT false,
      ativo_antes_pausa_assinatura TINYINT(1),
      created_at DATETIME DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      barbearia_id CHAR(36),
      servico_id CHAR(36),
      cliente_id CHAR(36),
      cliente_nome_externo TEXT,
      cliente_telefone_externo VARCHAR(20),
      barbeiro_id CHAR(36),
      data DATE NOT NULL,
      hora TIME NOT NULL,
      status VARCHAR(20) DEFAULT 'pendente',
      protocolo_atendimento VARCHAR(20),
      chatbot_session_id CHAR(36),
      servico_nome_snapshot TEXT,
      servico_preco_snapshot NUMERIC(10,2),
      avaliacao_nota INTEGER,
      avaliacao_comentario TEXT,
      avaliacao_registrada_em DATETIME,
      backend_sync_status VARCHAR(30) DEFAULT 'pending',
      backend_sync_error TEXT,
      backend_synced_at DATETIME,
      observacoes TEXT,
      origem VARCHAR(30) DEFAULT 'app',
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE servicos
    ADD COLUMN IF NOT EXISTS imagem_url TEXT,
    ADD COLUMN IF NOT EXISTS pausado_por_assinatura TINYINT(1) DEFAULT false,
    ADD COLUMN IF NOT EXISTS ativo_antes_pausa_assinatura TINYINT(1)
  `);

  await pool.query(`
    ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS cliente_nome_externo TEXT,
    ADD COLUMN IF NOT EXISTS cliente_telefone_externo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS origem VARCHAR(30) DEFAULT 'app',
    ADD COLUMN IF NOT EXISTS chatbot_session_id CHAR(36),
    ADD COLUMN IF NOT EXISTS protocolo_atendimento VARCHAR(20),
    ADD COLUMN IF NOT EXISTS servico_nome_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS servico_preco_snapshot NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS avaliacao_nota INTEGER,
    ADD COLUMN IF NOT EXISTS avaliacao_comentario TEXT,
    ADD COLUMN IF NOT EXISTS avaliacao_registrada_em DATETIME,
    ADD COLUMN IF NOT EXISTS backend_sync_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS backend_sync_error TEXT,
    ADD COLUMN IF NOT EXISTS backend_synced_at DATETIME
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamentos_protocolo_atendimento
    ON agendamentos (protocolo_atendimento)
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
