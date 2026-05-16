const express = require('express');
const router = express.Router();
const barbeariaController = require('../controllers/barbearia');
const { authenticateRequired } = require('../middleware/auth');

// GET /api/barbearias - Lista todas
router.get('/', barbeariaController.listBarbearias);

// GET /api/barbearias/stats - Estatisticas publicas
router.get('/stats', barbeariaController.getPublicStats);

// GET /api/barbearias/mine - Lista privadas do dono autenticado
router.get('/mine', authenticateRequired, barbeariaController.listMinhasBarbearias);

// POST /api/barbearias - Cria nova
router.post('/', authenticateRequired, barbeariaController.createBarbearia);

// GET /api/barbearias/:id - Busca por ID
router.get('/:id', barbeariaController.getBarbearia);

// GET /api/barbearias/:id/detalhes - Busca bloco de detalhes (amenidades, equipe, avaliacoes, banner, galeria)
router.get('/:id/detalhes', barbeariaController.getBarbeariaDetalhes);

// PUT /api/barbearias/:id - Atualiza
router.put('/:id', authenticateRequired, barbeariaController.updateBarbearia);

// PUT /api/barbearias/:id/detalhes - Atualiza bloco de detalhes
router.put('/:id/detalhes', authenticateRequired, barbeariaController.updateBarbeariaDetalhes);

// DELETE /api/barbearias/:id - Remove
router.delete('/:id', authenticateRequired, barbeariaController.deleteBarbearia);

module.exports = router;
