const pool = require('../config/database');

// Listar clientes de uma barbearia
async function listClientes(req, res) {
  try {
    const { barbeariaId } = req.params;
    
    // Buscar clientes que já fizeram agendamentos nessa barbearia
    const result = await pool.query(
      `SELECT DISTINCT u.id, u.nome, u.email, u.telefone, u.created_at,
       COUNT(a.id) as total_atendimentos,
       MAX(a.data) as ultimo_atendimento
       FROM usuarios u
       JOIN agendamentos a ON a.cliente_id = u.id
       WHERE a.barbearia_id = $1
       GROUP BY u.id, u.nome, u.email, u.telefone, u.created_at
       ORDER BY ultimo_atendimento DESC`,
      [barbeariaId]
    );
    
    res.json({ clientes: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
}

// Buscar cliente por ID
async function getCliente(req, res) {
  try {
    const { id } = req.params;
    
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
