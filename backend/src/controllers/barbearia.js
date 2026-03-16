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

async function getPublicStats(req, res) {
  try {
    const [barbeariasResult, clientesResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM barbearias'),
      pool.query("SELECT COUNT(*)::int AS total FROM usuarios WHERE tipo = 'cliente'"),
    ]);

    const totalBarbearias = Number(barbeariasResult.rows?.[0]?.total || 0);
    const totalClientes = Number(clientesResult.rows?.[0]?.total || 0);

    const notaResult = await pool.query(
      'SELECT COALESCE(AVG(NULLIF(nota, 0)), 0)::numeric(10,2) AS media FROM barbearias'
    );

    const notaMedia = Number(notaResult.rows?.[0]?.media || 0);

    res.json({
      stats: {
        total_barbearias: totalBarbearias,
        total_clientes: totalClientes,
        nota_media: notaMedia,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao carregar estatisticas publicas' });
  }
}

async function createBarbearia(req, res) {
  try {
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id, logo_url, horarios_semana } = req.body;

    if (!nome || !usuario_id) {
      return res.status(400).json({ error: 'Nome e usuário são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO barbearias (nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id, logo_url, horarios_semana)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome, telefone || '', endereco || '', horario_abertura || '09:00', horario_fechamento || '20:00', usuario_id, logo_url || null, horarios_semana ? JSON.stringify(horarios_semana) : null]
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
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link, logo_url, horarios_semana } = req.body;

    const result = await pool.query(
      `UPDATE barbearias SET nome=$1, telefone=$2, endereco=$3, horario_abertura=$4,
       horario_fechamento=$5, whatsapp_link=$6, logo_url=$7, horarios_semana=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link, logo_url, horarios_semana ? JSON.stringify(horarios_semana) : null, id]
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

module.exports = { listBarbearias, getPublicStats, createBarbearia, getBarbearia, updateBarbearia, deleteBarbearia };
