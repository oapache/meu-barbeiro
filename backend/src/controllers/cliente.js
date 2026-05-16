const pool = require('../config/database');
const { ensureAgendamentoSchema } = require('../services/agendamentoSchema');
const { assertBarbeariaOwner, canAccessCliente } = require('../services/ownership');

// Listar clientes de uma barbearia
async function listClientes(req, res) {
  try {
    await ensureAgendamentoSchema();

    const { barbeariaId } = req.params;
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);
    
    const result = await pool.query(
      `SELECT
         COALESCE(CAST(u.id AS CHAR), CONCAT('wa:', REGEXP_REPLACE(COALESCE(a.cliente_telefone_externo, ''), '[^0-9]', ''))) AS id,
         COALESCE(u.nome, a.cliente_nome_externo, 'Cliente') AS nome,
         COALESCE(u.email, '') AS email,
         COALESCE(u.telefone, a.cliente_telefone_externo, '') AS telefone,
         MIN(COALESCE(u.created_at, a.created_at)) AS created_at,
         COUNT(a.id) AS total_atendimentos,
         MAX(a.data) AS ultimo_atendimento
       FROM agendamentos a
       LEFT JOIN usuarios u ON u.id = a.cliente_id
       WHERE a.barbearia_id = $1
         AND (a.cliente_id IS NOT NULL OR a.cliente_nome_externo IS NOT NULL)
       GROUP BY
         COALESCE(CAST(u.id AS CHAR), CONCAT('wa:', REGEXP_REPLACE(COALESCE(a.cliente_telefone_externo, ''), '[^0-9]', ''))),
         COALESCE(u.nome, a.cliente_nome_externo, 'Cliente'),
         COALESCE(u.email, ''),
         COALESCE(u.telefone, a.cliente_telefone_externo, '')
       ORDER BY ultimo_atendimento DESC`,
      [barbeariaId]
    );
    
    res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao listar clientes' });
  }
}

// Buscar cliente por ID
async function getCliente(req, res) {
  try {
    const { id } = req.params;
    const permitido = await canAccessCliente(req.auth?.id, id);

    if (!permitido) {
      return res.status(403).json({ error: 'Voce nao tem permissao para acessar este cliente.' });
    }
    
    const result = await pool.query(
      'SELECT id, nome, email, telefone, created_at FROM usuarios WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
}

module.exports = { listClientes, getCliente };
