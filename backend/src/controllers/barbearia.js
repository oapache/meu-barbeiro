const pool = require('../config/database');

async function listBarbearias(req, res) {
  try {
    const { busca, nota_min, ordenar } = req.query;
    
    let query = 'SELECT * FROM barbearias WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (busca) {
      query += ` AND (nome ILIKE $${paramCount} OR endereco ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
      paramCount++;
    }
    
    if (nota_min) {
      query += ` AND nota >= $${paramCount}`;
      params.push(nota_min);
      paramCount++;
    }
    
    if (ordenar === 'nota') {
      query += ' ORDER BY nota DESC';
    } else if (ordenar === 'distancia') {
      query += ' ORDER BY created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    const result = await pool.query(query, params);
    res.json({ barbearias: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar barbearias' });
  }
}

async function createBarbearia(req, res) {
  try {
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id, logo_url } = req.body;
    
    if (!nome || !usuario_id) {
      return res.status(400).json({ error: 'Nome e usuário são obrigatórios' });
    }
    
    const result = await pool.query(
      `INSERT INTO barbearias (nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome, telefone || '', endereco || '', horario_abertura || '09:00', horario_fechamento || '20:00', usuario_id, logo_url || null]
    );
    
    res.status(201).json({ barbearia: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar barbearia' });
  }
}

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

async function updateBarbearia(req, res) {
  try {
    const { id } = req.params;
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link, logo_url } = req.body;
    
    const result = await pool.query(
      `UPDATE barbearias SET nome=$1, telefone=$2, endereco=$3, horario_abertura=$4, 
       horario_fechamento=$5, whatsapp_link=$6, logo_url=$7, updated_at=NOW() 
       WHERE id=$8 RETURNING *`,
      [nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link, logo_url, id]
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

module.exports = { listBarbearias, createBarbearia, getBarbearia, updateBarbearia, deleteBarbearia };
