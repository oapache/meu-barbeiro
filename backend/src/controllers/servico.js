const pool = require('../config/database');

// Listar serviços de uma barbearia
async function listServicos(req, res) {
  try {
    const { barbeariaId } = req.params;
    const { ativo } = req.query;
    
    let query = 'SELECT * FROM servicos WHERE barbearia_id = $1';
    const params = [barbeariaId];
    
    if (ativo !== undefined) {
      query += ' AND ativo = $2';
      params.push(ativo === 'true');
    }
    
    query += ' ORDER BY nome';
    
    const result = await pool.query(query, params);
    res.json({ servicos: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar serviços' });
  }
}

// Criar serviço
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

// Atualizar serviço
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

// Deletar (desativar) serviço
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
