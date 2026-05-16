const express = require('express');
const config = require('../config');
const { getBarbeariaSyncPayload } = require('../services/botSync');
const pool = require('../config/database');

const router = express.Router();

function requireServiceToken(req, res, next) {
  if (!config.bot?.serviceToken) {
    return res.status(503).json({ error: 'BOT_SERVICE_TOKEN não configurado na API principal.' });
  }

  const authHeader = String(req.headers?.authorization || '').trim();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  if (token !== config.bot.serviceToken) {
    return res.status(401).json({ error: 'Token interno do bot inválido.' });
  }

  next();
}

function parseLimit(value) {
  const limit = Number(value || 100);
  if (!Number.isFinite(limit)) return 100;
  return Math.min(500, Math.max(1, Math.floor(limit)));
}

function parseSince(value) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function listChangedBarbeariaIds({ since, limit }) {
  if (!since) {
    const result = await pool.query(
      `SELECT id
       FROM barbearias
       ORDER BY updated_at DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => row.id).filter(Boolean);
  }

  const result = await pool.query(
    `SELECT id
     FROM (
       SELECT b.id, b.updated_at
       FROM barbearias b
       WHERE b.updated_at >= $1 OR b.created_at >= $1

       UNION

       SELECT b.id, u.updated_at
       FROM usuarios u
       INNER JOIN barbearias b ON b.usuario_id = u.id
       WHERE u.updated_at >= $1 OR u.created_at >= $1

       UNION

       SELECT b.id, a.updated_at
       FROM assinaturas a
       INNER JOIN barbearias b ON b.id = a.barbearia_id
       WHERE a.updated_at >= $1 OR a.created_at >= $1
     ) changed
     GROUP BY id
     ORDER BY MAX(updated_at) DESC
     LIMIT $2`,
    [since, limit]
  );

  return result.rows.map((row) => row.id).filter(Boolean);
}

router.use(requireServiceToken);

router.get('/sync/changes', async (req, res) => {
  try {
    const since = parseSince(req.query?.since);
    const limit = parseLimit(req.query?.limit);
    const ids = await listChangedBarbeariaIds({ since, limit });
    const items = [];

    for (const id of ids) {
      const payload = await getBarbeariaSyncPayload(id);
      if (payload?.user && payload?.barbearia) {
        items.push(payload);
      }
    }

    res.json({
      ok: true,
      since: since ? since.toISOString() : null,
      next_since: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Não foi possível listar mudanças para o bot.' });
  }
});

module.exports = router;
