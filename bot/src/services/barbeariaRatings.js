const pool = require('../config/database');

let ensurePromise = null;

function toArraySafe(value) {
  return Array.isArray(value) ? value : [];
}

function toStringSafe(value) {
  return String(value || '').trim();
}

function normalizarAvaliacaoNota(value) {
  if (value === undefined || value === null || value === '') return null;

  const nota = Number(value);
  if (!Number.isFinite(nota)) return null;

  const inteira = Math.round(nota);
  if (inteira < 1 || inteira > 5) return null;
  return inteira;
}

function formatarDataAvaliacao(value) {
  const data = value ? new Date(value) : new Date();
  if (Number.isNaN(data.getTime())) {
    return new Date().toLocaleDateString('pt-BR');
  }

  return data.toLocaleDateString('pt-BR');
}

async function executarGarantiasSchema() {
  await pool.query(`
    ALTER TABLE barbearias
    ADD COLUMN IF NOT EXISTS nota_media NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_avaliacoes INTEGER DEFAULT 0
  `);

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

async function ensureBarbeariaRatingSchema() {
  if (!ensurePromise) {
    ensurePromise = executarGarantiasSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

async function syncBarbeariaRating(barbeariaId, db = pool) {
  await ensureBarbeariaRatingSchema();

  const detalhesResult = await db.query(
    `SELECT avaliacoes
     FROM barbearia_detalhes
     WHERE barbearia_id = $1
     LIMIT 1`,
    [barbeariaId]
  );

  const avaliacoes = toArraySafe(detalhesResult.rows?.[0]?.avaliacoes);
  const notasValidas = avaliacoes
    .map((item) => normalizarAvaliacaoNota(item?.nota))
    .filter((nota) => nota !== null);

  const totalAvaliacoes = notasValidas.length;
  const notaMedia = totalAvaliacoes > 0
    ? Number((notasValidas.reduce((acc, nota) => acc + nota, 0) / totalAvaliacoes).toFixed(2))
    : 0;

  await db.query(
    `UPDATE barbearias
     SET nota_media = $1,
         total_avaliacoes = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [notaMedia, totalAvaliacoes, barbeariaId]
  );

  return {
    nota_media: notaMedia,
    total_avaliacoes: totalAvaliacoes,
  };
}

async function registrarAvaliacaoAtendimento({
  barbeariaId,
  agendamentoId,
  autor,
  nota,
  comentario,
  data,
}, db = pool) {
  await ensureBarbeariaRatingSchema();

  const notaNormalizada = normalizarAvaliacaoNota(nota);
  if (!notaNormalizada) {
    throw new Error('A nota da avaliação deve estar entre 1 e 5.');
  }

  const detalhesResult = await db.query(
    `SELECT avaliacoes
     FROM barbearia_detalhes
     WHERE barbearia_id = $1
     LIMIT 1`,
    [barbeariaId]
  );

  const avaliacoesAtuais = toArraySafe(detalhesResult.rows?.[0]?.avaliacoes);
  const chaveAvaliacao = `agendamento:${agendamentoId}`;
  const indiceExistente = avaliacoesAtuais.findIndex((item) => (
    String(item?.agendamento_id || '') === String(agendamentoId)
    || String(item?.id || '') === chaveAvaliacao
  ));

  const avaliacaoExistente = indiceExistente >= 0 ? avaliacoesAtuais[indiceExistente] : null;
  const agoraIso = new Date().toISOString();

  const avaliacao = {
    id: toStringSafe(avaliacaoExistente?.id) || chaveAvaliacao,
    agendamento_id: String(agendamentoId),
    autor: toStringSafe(autor) || toStringSafe(avaliacaoExistente?.autor) || 'Cliente',
    nota: notaNormalizada,
    comentario: toStringSafe(comentario) || toStringSafe(avaliacaoExistente?.comentario),
    data: toStringSafe(avaliacaoExistente?.data) || formatarDataAvaliacao(data),
    origem: 'atendimento_concluido',
    created_at: toStringSafe(avaliacaoExistente?.created_at) || agoraIso,
    updated_at: agoraIso,
  };

  const avaliacoesAtualizadas = [...avaliacoesAtuais];
  if (indiceExistente >= 0) {
    avaliacoesAtualizadas[indiceExistente] = avaliacao;
  } else {
    avaliacoesAtualizadas.unshift(avaliacao);
  }

  await db.query(
    `INSERT INTO barbearia_detalhes (barbearia_id, avaliacoes)
     VALUES ($1, $2)
     ON DUPLICATE KEY UPDATE
       avaliacoes = VALUES(avaliacoes),
       updated_at = NOW()`,
    [barbeariaId, JSON.stringify(avaliacoesAtualizadas)]
  );

  return syncBarbeariaRating(barbeariaId, db);
}

module.exports = {
  ensureBarbeariaRatingSchema,
  normalizarAvaliacaoNota,
  registrarAvaliacaoAtendimento,
  syncBarbeariaRating,
};
