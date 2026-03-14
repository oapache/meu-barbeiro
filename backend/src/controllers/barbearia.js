const pool = require('../config/database');

/**
 * GET /api/barbearias
 * Lista todas as barbearias
 */
async function listBarbearias(req, res) {
  try {
    const result = await pool.query('SELECT * FROM barbearias ORDER BY created_at DESC');
    res.json({ barbearias: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar barbearias' });
  }
}

/**
 * POST /api/barbearias
 * Cria nova barbearia
 */
async function createBarbearia(req, res) {
  try {
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id } = req.body;
    
    if (!nome || !usuario_id) {
      return res.status(400).json({ error: 'Nome e usuário são obrigatórios' });
    }
    
    const result = await pool.query(
      `INSERT INTO barbearias (nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome, telefone || '', endereco || '', horario_abertura || '09:00', horario_fechamento || '20:00', usuario_id]
    );
    
    res.status(201).json({ barbearia: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar barbearia' });
  }
}

/**
 * GET /api/barbearias/:id
 * Retorna uma barbearia pelo ID
 */
async function getBarbearia(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM barbearias WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }
    
    res.json({ barbearia: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar barbearia' });
  }
}

/**
 * PUT /api/barbearias/:id
 * Atualiza uma barbearia
 */
async function updateBarbearia(req, res) {
  try {
    const { id } = req.params;
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link } = req.body;
    
    const result = await pool.query(
      `UPDATE barbearias SET nome=$1, telefone=$2, endereco=$3, horario_abertura=$4, 
       horario_fechamento=$5, whatsapp_link=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }
    
    res.json({ barbearia: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar barbearia' });
  }
}

/**
 * DELETE /api/barbearias/:id
 * Remove uma barbearia
 */
async function deleteBarbearia(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM barbearias WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }
    
    res.json({ message: 'Barbearia removida com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao remover barbearia' });
  }
}

module.exports = {
  listBarbearias,
  createBarbearia,
  getBarbearia,
  updateBarbearia,
  deleteBarbearia
};
