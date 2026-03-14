const pool = require('../config/database');

/**
 * GET /api/barbearias/:barbeariaId/servicos
 * Lista serviços de uma barbearia
 */
async function listServicos(req, res) {
  try {
    const { barbeariaId } = req.params;
    const result = await pool.query(
      'SELECT * FROM servicos WHERE barbearia_id = $1 AND ativo = true ORDER BY nome',
      [barbeariaId]
    );
    res.json({ servicos: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
}

/**
 * POST /api/barbearias/:barbeariaId/servicos
 * Cria novo serviço
 */
async function createServico(req, res) {
  try {
    const { barbeariaId } = req.params;
    const { nome, descricao, preco, duracao_minutos } = req.body;
    
    if (!nome || !preco) {
      return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }
    
    const result = await pool.query(
      `INSERT INTO servicos (barbearia_id, nome, descricao, preco, duracao_minutos)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [barbeariaId, nome, descricao || null, preco, duracao_minutos || 30]
    );
    
    res.status(201).json({ servico: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
}

/**
 * PUT /api/servicos/:id
 * Atualiza serviço
 */
async function updateServico(req, res) {
  try {
    const { id } = req.params;
    const { nome, descricao, preco, duracao_minutos, ativo } = req.body;
    
    const result = await pool.query(
      `UPDATE servicos SET nome=$1, descricao=$2, preco=$3, duracao_minutos=$4, ativo=$5
       WHERE id=$6 RETURNING *`,
      [nome, descricao, preco, duracao_minutos, ativo !== undefined ? ativo : true, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    res.json({ servico: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
}

/**
 * DELETE /api/servicos/:id
 * Remove (desativa) serviço
 */
async function deleteServico(req, res) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE servicos SET ativo = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    res.json({ message: 'Serviço removido com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao remover serviço' });
  }
}

module.exports = { listServicos, createServico, updateServico, deleteServico };
