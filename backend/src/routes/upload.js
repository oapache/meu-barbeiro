const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

/**
 * POST /api/upload
 * Upload de imagem
 */
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não enviado' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;

  return res.status(201).json({
    message: 'Upload realizado com sucesso',
    url,
    filename: req.file.filename,
  });
});

module.exports = router;
