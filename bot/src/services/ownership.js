const pool = require('../config/database');

function normalizarId(value) {
  const id = String(value || '').trim();
  return id || '';
}

async function listOwnedBarbearias(userId) {
  const usuarioId = normalizarId(userId);
  if (!usuarioId) return [];

  const result = await pool.query(
    `SELECT *
     FROM barbearias
     WHERE usuario_id = $1
     ORDER BY updated_at DESC, created_at DESC`,
    [usuarioId]
  );

  return result.rows;
}

async function getOwnedBarbearia(userId, barbeariaId) {
  const usuarioId = normalizarId(userId);
  const estabelecimentoId = normalizarId(barbeariaId);

  if (!usuarioId || !estabelecimentoId) return null;

  const result = await pool.query(
    `SELECT *
     FROM barbearias
     WHERE id = $1
       AND usuario_id = $2
     LIMIT 1`,
    [estabelecimentoId, usuarioId]
  );

  return result.rows[0] || null;
}

async function assertBarbeariaOwner(userId, barbeariaId) {
  const barbearia = await getOwnedBarbearia(userId, barbeariaId);

  if (!barbearia) {
    const error = new Error('Voce nao tem permissao para acessar esta barbearia.');
    error.code = 'BARBEARIA_FORBIDDEN';
    throw error;
  }

  return barbearia;
}

async function getOwnedServico(userId, servicoId) {
  const usuarioId = normalizarId(userId);
  const itemId = normalizarId(servicoId);

  if (!usuarioId || !itemId) return null;

  const result = await pool.query(
    `SELECT s.*, b.usuario_id
     FROM servicos s
     INNER JOIN barbearias b ON b.id = s.barbearia_id
     WHERE s.id = $1
       AND b.usuario_id = $2
     LIMIT 1`,
    [itemId, usuarioId]
  );

  return result.rows[0] || null;
}

async function assertServicoOwner(userId, servicoId) {
  const servico = await getOwnedServico(userId, servicoId);

  if (!servico) {
    const error = new Error('Voce nao tem permissao para alterar este servico.');
    error.code = 'SERVICO_FORBIDDEN';
    throw error;
  }

  return servico;
}

async function getOwnedEstoqueProduto(userId, produtoId) {
  const usuarioId = normalizarId(userId);
  const itemId = normalizarId(produtoId);

  if (!usuarioId || !itemId) return null;

  const result = await pool.query(
    `SELECT p.*, b.usuario_id
     FROM estoque_produtos p
     INNER JOIN barbearias b ON b.id = p.barbearia_id
     WHERE p.id = $1
       AND b.usuario_id = $2
     LIMIT 1`,
    [itemId, usuarioId]
  );

  return result.rows[0] || null;
}

async function assertEstoqueProdutoOwner(userId, produtoId) {
  const produto = await getOwnedEstoqueProduto(userId, produtoId);

  if (!produto) {
    const error = new Error('Voce nao tem permissao para alterar este produto do estoque.');
    error.code = 'ESTOQUE_PRODUTO_FORBIDDEN';
    throw error;
  }

  return produto;
}

async function getOwnedAgendamento(userId, agendamentoId) {
  const usuarioId = normalizarId(userId);
  const itemId = normalizarId(agendamentoId);

  if (!usuarioId || !itemId) return null;

  const result = await pool.query(
    `SELECT a.*, b.usuario_id
     FROM agendamentos a
     INNER JOIN barbearias b ON b.id = a.barbearia_id
     WHERE a.id = $1
       AND b.usuario_id = $2
     LIMIT 1`,
    [itemId, usuarioId]
  );

  return result.rows[0] || null;
}

async function assertAgendamentoOwner(userId, agendamentoId) {
  const agendamento = await getOwnedAgendamento(userId, agendamentoId);

  if (!agendamento) {
    const error = new Error('Voce nao tem permissao para gerenciar este agendamento.');
    error.code = 'AGENDAMENTO_FORBIDDEN';
    throw error;
  }

  return agendamento;
}

async function canAccessCliente(userId, clienteId) {
  const usuarioId = normalizarId(userId);
  const idCliente = normalizarId(clienteId);

  if (!usuarioId || !idCliente) return false;
  if (usuarioId === idCliente) return true;

  const result = await pool.query(
    `SELECT 1
     FROM agendamentos a
     INNER JOIN barbearias b ON b.id = a.barbearia_id
     WHERE a.cliente_id = $1
       AND b.usuario_id = $2
     LIMIT 1`,
    [idCliente, usuarioId]
  );

  return result.rows.length > 0;
}

module.exports = {
  listOwnedBarbearias,
  getOwnedBarbearia,
  assertBarbeariaOwner,
  getOwnedServico,
  assertServicoOwner,
  getOwnedEstoqueProduto,
  assertEstoqueProdutoOwner,
  getOwnedAgendamento,
  assertAgendamentoOwner,
  canAccessCliente,
};
