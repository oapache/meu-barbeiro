const pool = require('../config/database');

let ensurePromise = null;

async function executarGarantiasSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS estoque_produtos (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
      nome VARCHAR(255) NOT NULL,
      sku VARCHAR(100),
      categoria VARCHAR(100),
      descricao TEXT,
      imagem_url TEXT,
      quantidade_item NUMERIC(10, 2) DEFAULT 1,
      unidade VARCHAR(30) DEFAULT 'un',
      estoque_atual NUMERIC(10, 2) DEFAULT 0,
      estoque_minimo NUMERIC(10, 2) DEFAULT 0,
      custo_unitario NUMERIC(10, 2) DEFAULT 0,
      preco_venda NUMERIC(10, 2) DEFAULT 0,
      fornecedor VARCHAR(255),
      localizacao VARCHAR(255),
      observacoes TEXT,
      ativo TINYINT(1) DEFAULT true,
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE estoque_produtos
    ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(100),
    ADD COLUMN IF NOT EXISTS descricao TEXT,
    ADD COLUMN IF NOT EXISTS imagem_url TEXT,
    ADD COLUMN IF NOT EXISTS quantidade_item NUMERIC(10, 2) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS unidade VARCHAR(30) DEFAULT 'un',
    ADD COLUMN IF NOT EXISTS estoque_atual NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estoque_minimo NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255),
    ADD COLUMN IF NOT EXISTS localizacao VARCHAR(255),
    ADD COLUMN IF NOT EXISTS observacoes TEXT,
    ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT NOW()
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
      produto_id CHAR(36) REFERENCES estoque_produtos(id) ON DELETE CASCADE,
      tipo VARCHAR(30) NOT NULL,
      quantidade NUMERIC(10, 2) NOT NULL,
      custo_unitario NUMERIC(10, 2),
      preco_unitario NUMERIC(10, 2),
      valor_total NUMERIC(10, 2),
      estoque_anterior NUMERIC(10, 2),
      estoque_posterior NUMERIC(10, 2),
      motivo TEXT,
      referencia_tipo VARCHAR(50),
      referencia_id TEXT,
      profissional_id TEXT,
      profissional_nome TEXT,
      movimentado_em DATETIME,
      observacoes TEXT,
      created_by CHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE estoque_movimentacoes
    ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS estoque_anterior NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS estoque_posterior NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS motivo TEXT,
    ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(50),
    ADD COLUMN IF NOT EXISTS referencia_id TEXT,
    ADD COLUMN IF NOT EXISTS profissional_id TEXT,
    ADD COLUMN IF NOT EXISTS profissional_nome TEXT,
    ADD COLUMN IF NOT EXISTS movimentado_em DATETIME,
    ADD COLUMN IF NOT EXISTS observacoes TEXT,
    ADD COLUMN IF NOT EXISTS created_by CHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_estoque_produtos_barbearia
      ON estoque_produtos (barbearia_id, ativo, updated_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_barbearia
      ON estoque_movimentacoes (barbearia_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_produto
      ON estoque_movimentacoes (produto_id, created_at DESC)
  `);
}

async function ensureEstoqueSchema() {
  if (!ensurePromise) {
    ensurePromise = executarGarantiasSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

module.exports = {
  ensureEstoqueSchema,
};
