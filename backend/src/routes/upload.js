const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateRequired } = require('../middleware/auth');
const { assertBarbeariaOwner } = require('../services/ownership');

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

function getPublicBaseUrl(req) {
  const configuredUrl = normalizeBaseUrl(process.env.API_PUBLIC_URL || process.env.APP_API_URL);
  if (configuredUrl) return configuredUrl;

  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const safeProtocol = process.env.NODE_ENV === 'production' && protocol === 'http' ? 'https' : protocol;
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').trim();

  return normalizeBaseUrl(`${safeProtocol}://${host}`);
}

/**
 * POST /api/upload
 * Upload de imagem
 */
router.post(
  '/',
  authenticateRequired,
  async (req, res, next) => {
    try {
      const uploadScope = String(req.get('x-upload-scope') || '').trim();
      const barbeariaId = String(req.get('x-barbearia-id') || '').trim();

      if (!uploadScope.startsWith('barbearia') && !barbeariaId) {
        return next();
      }

      if (!barbeariaId) {
        return res.status(400).json({ error: 'Informe a barbearia para validar este upload.' });
      }

      await assertBarbeariaOwner(req.auth?.id, barbeariaId);

      return next();
    } catch (error) {
      const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
      return res.status(status).json({ error: error?.message || 'Não foi possível validar o upload agora.' });
    }
  },
  upload.single('file'),
  (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não enviado' });
  }

  const baseUrl = getPublicBaseUrl(req);
  const url = `${baseUrl}/uploads/${req.file.filename}`;

  return res.status(201).json({
    message: 'Upload realizado com sucesso',
    url,
    filename: req.file.filename,
  });
});

module.exports = router;
