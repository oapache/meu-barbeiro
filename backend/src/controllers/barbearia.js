const pool = require('../config/database');
const { getBarbeariaSubscriptionAccess } = require('../services/subscriptionAccess');
const { ensureBarbeariaRatingSchema, syncBarbeariaRating } = require('../services/barbeariaRatings');
const { listOwnedBarbearias, assertBarbeariaOwner } = require('../services/ownership');
const { safeSyncBarbeariaToBot } = require('../services/botSync');

const DETALHES_DEFAULT = {
  amenidades: [],
  profissionais: [],
  avaliacoes: [],
  banner_url: '',
  galeria: [],
};

let ensureDetalhesTablePromise = null;

async function executarGarantiasDetalhesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS barbearia_detalhes (
      barbearia_id CHAR(36) PRIMARY KEY REFERENCES barbearias(id) ON DELETE CASCADE,
      amenidades JSON DEFAULT (JSON_ARRAY()),
      profissionais JSON DEFAULT (JSON_ARRAY()),
      avaliacoes JSON DEFAULT (JSON_ARRAY()),
      banner_url VARCHAR(255) DEFAULT '',
      galeria JSON DEFAULT (JSON_ARRAY()),
      created_at DATETIME DEFAULT NOW(),
      updated_at DATETIME DEFAULT NOW()
    )
  `);
}

async function ensureDetalhesTable() {
  if (!ensureDetalhesTablePromise) {
    ensureDetalhesTablePromise = executarGarantiasDetalhesTable().catch((error) => {
      ensureDetalhesTablePromise = null;
      throw error;
    });
  }

  return ensureDetalhesTablePromise;
}

function toStringSafe(value) {
  return String(value || '').trim();
}

function parseJsonSafe(value) {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value) || typeof value === 'object') return value;

  let current = value;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof current !== 'string') break;

    const trimmed = current.trim();
    if (!trimmed) return null;

    try {
      current = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  return current;
}

function toArraySafe(value) {
  const parsed = parseJsonSafe(value);
  return Array.isArray(parsed) ? parsed : [];
}

function toBooleanSafe(value) {
  if (value === true || value === 1) return true;
  return ['1', 'true', 'sim', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function normalizarHorariosSemana(value) {
  return toArraySafe(value)
    .filter((dia) => dia && typeof dia === 'object')
    .map((dia) => {
      const intervalos = toArraySafe(dia.intervalos || dia.periodos || dia.horarios)
        .filter((intervalo) => intervalo && typeof intervalo === 'object')
        .map((intervalo) => ({
          abertura: toStringSafe(intervalo.abertura || intervalo.inicio),
          fechamento: toStringSafe(intervalo.fechamento || intervalo.fim),
        }))
        .filter((intervalo) => intervalo.abertura && intervalo.fechamento);

      return {
        ...dia,
        key: toStringSafe(dia.key),
        label: toStringSafe(dia.label),
        fechado: toBooleanSafe(dia.fechado),
        abertura: toStringSafe(dia.abertura),
        fechamento: toStringSafe(dia.fechamento),
        ...(intervalos.length > 0 ? { intervalos } : {}),
      };
    });
}

function normalizarGaleria(value) {
  return toArraySafe(value)
    .map((item) => toStringSafe(item))
    .filter(Boolean);
}

function isPersistableMediaUrl(value) {
  const url = toStringSafe(value);
  if (!url) return false;

  return (
    url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('/uploads/')
    || url.startsWith('/api/uploads/')
  );
}

function normalizarMediaUrl(value) {
  const url = toStringSafe(value);
  if (!url) return '';
  if (!isPersistableMediaUrl(url)) return '';

  if (
    url.startsWith('http://')
    && !url.includes('localhost')
    && !url.includes('127.0.0.1')
  ) {
    return `https://${url.slice('http://'.length)}`;
  }

  return url;
}

function normalizarGaleriaPersistivel(value) {
  return toArraySafe(value)
    .map((item) => normalizarMediaUrl(item))
    .filter(Boolean);
}

function formatarLimiteProfissionaisMensagem(maxProfessionals) {
  if (!Number.isFinite(maxProfessionals) || maxProfessionals <= 0) {
    return 'Seu plano atual não permite cadastrar novos barbeiros.';
  }

  if (maxProfessionals === 1) {
    return 'Seu plano atual permite apenas 1 barbeiro na equipe. Troque de plano para adicionar mais profissionais.';
  }

  return `Seu plano atual permite até ${maxProfessionals} barbeiros na equipe. Troque de plano para adicionar mais profissionais.`;
}

function serializarBarbearia(row) {
  if (!row) return row;
  return {
    ...row,
    logo_url: normalizarMediaUrl(row.logo_url),
    horarios_semana: normalizarHorariosSemana(row.horarios_semana),
    nota_media: Number(row.nota_media ?? row.nota ?? 0),
    total_avaliacoes: Number(row.total_avaliacoes || 0),
  };
}

function serializarBarbeariaPublica(row) {
  if (!row) return row;

  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone || '',
    endereco: row.endereco || '',
    logo_url: normalizarMediaUrl(row.logo_url),
    horario_abertura: row.horario_abertura || '',
    horario_fechamento: row.horario_fechamento || '',
    horarios_semana: normalizarHorariosSemana(row.horarios_semana),
    whatsapp_link: row.whatsapp_link || '',
    nota_media: Number(row.nota_media ?? row.nota ?? 0),
    total_avaliacoes: Number(row.total_avaliacoes || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializarBarbeariaPrivada(row) {
  if (!row) return row;

  return {
    ...serializarBarbeariaPublica(row),
    usuario_id: row.usuario_id || null,
    subscription_plan: row.subscription_plan || 'free',
    subscription_status: row.subscription_status || 'inactive',
    premium_locked_at: row.premium_locked_at || null,
    chatbot_mode: row.chatbot_mode || 'legacy',
    chatbot_enabled: row.chatbot_enabled !== false,
  };
}

function serializarDetalhes(row) {
  return {
    amenidades: toArraySafe(row?.amenidades),
    profissionais: toArraySafe(row?.profissionais),
    avaliacoes: toArraySafe(row?.avaliacoes),
    banner_url: normalizarMediaUrl(row?.banner_url),
    galeria: normalizarGaleriaPersistivel(row?.galeria),
  };
}

async function listBarbearias(req, res) {
  try {
    await ensureBarbeariaRatingSchema();

    const { busca, nota_min, ordenar } = req.query;

    let query = `SELECT
      id,
      nome,
      telefone,
      endereco,
      logo_url,
      horario_abertura,
      horario_fechamento,
      horarios_semana,
      whatsapp_link,
      nota_media,
      total_avaliacoes,
      created_at,
      updated_at
    FROM barbearias
    WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (busca) {
      query += ` AND (nome ILIKE $${paramCount} OR endereco ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
      paramCount++;
    }

    if (nota_min) {
      query += ` AND COALESCE(nota_media, 0) >= $${paramCount}`;
      params.push(nota_min);
      paramCount++;
    }

    if (ordenar === 'nota') {
      query += ' ORDER BY COALESCE(nota_media, 0) DESC, created_at DESC';
    } else if (ordenar === 'distancia') {
      query += ' ORDER BY created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json({ barbearias: result.rows.map(serializarBarbeariaPublica) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar barbearias' });
  }
}

async function listMinhasBarbearias(req, res) {
  try {
    await ensureBarbeariaRatingSchema();

    const usuarioId = String(req.auth?.id || '').trim();
    const barbearias = await listOwnedBarbearias(usuarioId);

    res.json({ barbearias: barbearias.map(serializarBarbeariaPrivada) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar as barbearias do usuario' });
  }
}

async function getPublicStats(req, res) {
  try {
    await ensureBarbeariaRatingSchema();

    const [barbeariasResult, clientesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM barbearias'),
      pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE tipo = 'cliente'"),
    ]);

    const totalBarbearias = Number(barbeariasResult.rows?.[0]?.total || 0);
    const totalClientes = Number(clientesResult.rows?.[0]?.total || 0);
    const notaResult = await pool.query(
      'SELECT COALESCE(AVG(NULLIF(nota_media, 0)), 0) AS media FROM barbearias'
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
    res.status(500).json({ error: 'Erro ao carregar estatísticas públicas' });
  }
}

async function createBarbearia(req, res) {
  try {
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, logo_url, horarios_semana } = req.body;
    const logoUrlFinal = normalizarMediaUrl(logo_url);
    const horariosSemanaFinal = normalizarHorariosSemana(horarios_semana);
    const usuarioId = String(req.auth?.id || '').trim();

    if (!nome || !usuarioId) {
      return res.status(400).json({ error: 'Nome e usuario sao obrigatorios' });
    }

    if (logoUrlFinal) {
      return res.status(403).json({
        error: 'Envio de logo disponível apenas com assinatura ativa.',
      });
    }

    const result = await pool.query(
      `INSERT INTO barbearias (nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id, logo_url, horarios_semana)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome, telefone || '', endereco || '', horario_abertura || '09:00', horario_fechamento || '20:00', usuarioId, logoUrlFinal || null, horariosSemanaFinal.length > 0 ? JSON.stringify(horariosSemanaFinal) : null]
    );

    const barbearia = serializarBarbeariaPrivada(result.rows[0]);
    await safeSyncBarbeariaToBot(barbearia.id);

    res.status(201).json({ barbearia });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar barbearia' });
  }
}

async function getBarbearia(req, res) {
  try {
    await ensureBarbeariaRatingSchema();

    const { id } = req.params;
    const result = await pool.query(
      `SELECT
         id,
         nome,
         telefone,
         endereco,
         logo_url,
         horario_abertura,
         horario_fechamento,
         horarios_semana,
         whatsapp_link,
         nota_media,
         total_avaliacoes,
         created_at,
         updated_at
       FROM barbearias
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }
    
    res.json({ barbearia: serializarBarbeariaPublica(result.rows[0]) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar barbearia' });
  }
}

async function updateBarbearia(req, res) {
  try {
    const { id } = req.params;
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link, logo_url, horarios_semana } = req.body;

    const atual = await assertBarbeariaOwner(req.auth?.id, id);
    const acessoAssinatura = await getBarbeariaSubscriptionAccess(id);

    if (!acessoAssinatura) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }

    const nomeFinal = nome === undefined ? atual.nome : nome;
    const telefoneFinal = telefone === undefined ? atual.telefone : telefone;
    const enderecoFinal = endereco === undefined ? atual.endereco : endereco;
    const horarioAberturaFinal = horario_abertura === undefined ? atual.horario_abertura : horario_abertura;
    const horarioFechamentoFinal = horario_fechamento === undefined ? atual.horario_fechamento : horario_fechamento;
    const whatsappLinkFinal = whatsapp_link === undefined ? atual.whatsapp_link : whatsapp_link;
    const logoUrlFinal = logo_url === undefined ? normalizarMediaUrl(atual.logo_url) : normalizarMediaUrl(logo_url);
    const horariosSemanaFinal = horarios_semana === undefined
      ? normalizarHorariosSemana(atual.horarios_semana)
      : normalizarHorariosSemana(horarios_semana);

    const result = await pool.query(
      `UPDATE barbearias SET nome=$1, telefone=$2, endereco=$3, horario_abertura=$4,
       horario_fechamento=$5, whatsapp_link=$6, logo_url=$7, horarios_semana=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [
        nomeFinal,
        telefoneFinal,
        enderecoFinal,
        horarioAberturaFinal,
        horarioFechamentoFinal,
        whatsappLinkFinal,
        logoUrlFinal || null,
        horariosSemanaFinal.length > 0 ? JSON.stringify(horariosSemanaFinal) : null,
        id,
      ]
    );
    
    const barbearia = serializarBarbeariaPrivada(result.rows[0]);
    await safeSyncBarbeariaToBot(barbearia.id);

    res.json({ barbearia });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao atualizar barbearia' });
  }
}

async function deleteBarbearia(req, res) {
  try {
    const { id } = req.params;
    await assertBarbeariaOwner(req.auth?.id, id);
    const result = await pool.query('DELETE FROM barbearias WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }
    
    res.json({ message: 'Barbearia removida com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao remover barbearia' });
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
      return res.json({ detalhes: serializarDetalhes(DETALHES_DEFAULT) });
    }

    const row = result.rows[0] || {};

    res.json({ detalhes: serializarDetalhes(row) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da barbearia' });
  }
}

async function updateBarbeariaDetalhes(req, res) {
  try {
    const { id } = req.params;
    const { amenidades, profissionais, avaliacoes, banner_url, galeria } = req.body || {};

    await ensureBarbeariaRatingSchema();
    await ensureDetalhesTable();
    await assertBarbeariaOwner(req.auth?.id, id);

    const atualResult = await pool.query(
      `SELECT amenidades, profissionais, avaliacoes, banner_url, galeria
       FROM barbearia_detalhes
       WHERE barbearia_id = $1`,
      [id]
    );

    const atual = atualResult.rows[0] || DETALHES_DEFAULT;
    const acessoAssinatura = await getBarbeariaSubscriptionAccess(id);

    if (!acessoAssinatura) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }

    const bannerUrlFinal = banner_url === undefined
      ? normalizarMediaUrl(atual.banner_url)
      : normalizarMediaUrl(banner_url);
    const galeriaFinal = galeria === undefined
      ? normalizarGaleriaPersistivel(atual.galeria)
      : normalizarGaleriaPersistivel(galeria);

    if (!acessoAssinatura.premiumUnlocked) {
      const houveNovoProfissional = profissionais !== undefined
        && toArraySafe(profissionais).length > toArraySafe(atual.profissionais).length;

      if (houveNovoProfissional) {
        return res.status(403).json({
          error: 'Adicione uma assinatura para cadastrar novos barbeiros.',
        });
      }

    }

    const amenidadesFinal = amenidades === undefined ? toArraySafe(atual.amenidades) : toArraySafe(amenidades);
    const profissionaisFinal = profissionais === undefined ? toArraySafe(atual.profissionais) : toArraySafe(profissionais);
    const avaliacoesFinal = avaliacoes === undefined ? toArraySafe(atual.avaliacoes) : toArraySafe(avaliacoes);

    if (acessoAssinatura.premiumUnlocked) {
      const quantidadeAtualProfissionais = toArraySafe(atual.profissionais).length;
      const quantidadeFinalProfissionais = profissionaisFinal.length;
      const limiteProfissionais = Number(acessoAssinatura.maxProfessionals || 0);
      const excedeuLimiteDoPlano = limiteProfissionais > 0
        && quantidadeFinalProfissionais > limiteProfissionais
        && quantidadeFinalProfissionais > quantidadeAtualProfissionais;

      if (excedeuLimiteDoPlano) {
        return res.status(403).json({
          error: formatarLimiteProfissionaisMensagem(limiteProfissionais),
        });
      }
    }

    await pool.query(
      `INSERT INTO barbearia_detalhes (barbearia_id, amenidades, profissionais, avaliacoes, banner_url, galeria)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON DUPLICATE KEY UPDATE
         amenidades = VALUES(amenidades),
         profissionais = VALUES(profissionais),
         avaliacoes = VALUES(avaliacoes),
         banner_url = VALUES(banner_url),
         galeria = VALUES(galeria),
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
    await syncBarbeariaRating(id);

    const row = atualizado.rows[0] || {};
    res.json({ detalhes: serializarDetalhes(row) });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao atualizar detalhes da barbearia' });
  }
}

module.exports = {
  listBarbearias,
  listMinhasBarbearias,
  getPublicStats,
  createBarbearia,
  getBarbearia,
  updateBarbearia,
  deleteBarbearia,
  getBarbeariaDetalhes,
  updateBarbeariaDetalhes,
};
