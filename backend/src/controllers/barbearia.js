const pool = require('../config/database');

const DETALHES_DEFAULT = {
  amenidades: [],
  profissionais: [],
  avaliacoes: [],
  banner_url: '',
  galeria: [],
};

async function ensureDetalhesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS barbearia_detalhes (
      barbearia_id UUID PRIMARY KEY REFERENCES barbearias(id) ON DELETE CASCADE,
      amenidades JSONB DEFAULT '[]'::jsonb,
      profissionais JSONB DEFAULT '[]'::jsonb,
      avaliacoes JSONB DEFAULT '[]'::jsonb,
      banner_url TEXT DEFAULT '',
      galeria JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

function toArraySafe(value) {
  return Array.isArray(value) ? value : [];
}

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

    const colunaNotaResult = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'barbearias' AND column_name IN ('nota_media', 'nota')
       ORDER BY CASE WHEN column_name = 'nota_media' THEN 0 ELSE 1 END
       LIMIT 1`
    );

    let notaMedia = 0;
    const colunaNota = colunaNotaResult.rows?.[0]?.column_name;

    if (colunaNota) {
      const notaResult = await pool.query(
        `SELECT COALESCE(AVG(NULLIF(${colunaNota}, 0)), 0)::numeric(10,2) AS media FROM barbearias`
      );
      notaMedia = Number(notaResult.rows?.[0]?.media || 0);
    }

    res.json({
      stats: {
        total_barbearias: totalBarbearias,
        total_clientes: totalClientes,
        nota_media: notaMedia,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas públicas' });
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

async function getBarbeariaDetalhes(req, res) {
  try {
    const { id } = req.params;

    await ensureDetalhesTable();

    const result = await pool.query(
      `SELECT amenidades, profissionais, avaliacoes, banner_url, galeria
       FROM barbearia_detalhes
       WHERE barbearia_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({ detalhes: DETALHES_DEFAULT });
    }

    const row = result.rows[0] || {};

    res.json({
      detalhes: {
        amenidades: toArraySafe(row.amenidades),
        profissionais: toArraySafe(row.profissionais),
        avaliacoes: toArraySafe(row.avaliacoes),
        banner_url: String(row.banner_url || ''),
        galeria: toArraySafe(row.galeria),
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da barbearia' });
  }
}

async function updateBarbeariaDetalhes(req, res) {
  try {
    const { id } = req.params;
    const { amenidades, profissionais, avaliacoes, banner_url, galeria } = req.body || {};

    await ensureDetalhesTable();

    const atualResult = await pool.query(
      `SELECT amenidades, profissionais, avaliacoes, banner_url, galeria
       FROM barbearia_detalhes
       WHERE barbearia_id = $1`,
      [id]
    );

    const atual = atualResult.rows[0] || DETALHES_DEFAULT;

    const amenidadesFinal = amenidades === undefined ? toArraySafe(atual.amenidades) : toArraySafe(amenidades);
    const profissionaisFinal = profissionais === undefined ? toArraySafe(atual.profissionais) : toArraySafe(profissionais);
    const avaliacoesFinal = avaliacoes === undefined ? toArraySafe(atual.avaliacoes) : toArraySafe(avaliacoes);
    const bannerUrlFinal = banner_url === undefined ? String(atual.banner_url || '') : String(banner_url || '');
    const galeriaFinal = galeria === undefined ? toArraySafe(atual.galeria) : toArraySafe(galeria);

    await pool.query(
      `INSERT INTO barbearia_detalhes (barbearia_id, amenidades, profissionais, avaliacoes, banner_url, galeria)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (barbearia_id)
       DO UPDATE SET
         amenidades = EXCLUDED.amenidades,
         profissionais = EXCLUDED.profissionais,
         avaliacoes = EXCLUDED.avaliacoes,
         banner_url = EXCLUDED.banner_url,
         galeria = EXCLUDED.galeria,
         updated_at = NOW()`,
      [
        id,
        JSON.stringify(amenidadesFinal),
        JSON.stringify(profissionaisFinal),
        JSON.stringify(avaliacoesFinal),
        bannerUrlFinal,
        JSON.stringify(galeriaFinal),
      ]
    );

    const atualizado = await pool.query(
      `SELECT amenidades, profissionais, avaliacoes, banner_url, galeria
       FROM barbearia_detalhes
       WHERE barbearia_id = $1`,
      [id]
    );

    const row = atualizado.rows[0] || {};

    res.json({
      detalhes: {
        amenidades: toArraySafe(row.amenidades),
        profissionais: toArraySafe(row.profissionais),
        avaliacoes: toArraySafe(row.avaliacoes),
        banner_url: String(row.banner_url || ''),
        galeria: toArraySafe(row.galeria),
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar detalhes da barbearia' });
  }
}

module.exports = {
  listBarbearias,
  getPublicStats,
  createBarbearia,
  getBarbearia,
  updateBarbearia,
  deleteBarbearia,
  getBarbeariaDetalhes,
  updateBarbeariaDetalhes,
};
