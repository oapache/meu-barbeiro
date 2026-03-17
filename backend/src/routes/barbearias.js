const express = require('express');
const router = express.Router();
const barbeariaController = require('../controllers/barbearia');

// GET /api/barbearias - Lista todas
router.get('/', barbeariaController.listBarbearias);

// GET /api/barbearias/stats - Estatisticas publicas
router.get('/stats', barbeariaController.getPublicStats);

// POST /api/barbearias - Cria nova
router.post('/', barbeariaController.createBarbearia);

// GET /api/barbearias/:id - Busca por ID
router.get('/:id', barbeariaController.getBarbearia);

// GET /api/barbearias/:id/detalhes - Busca bloco de detalhes (amenidades, equipe, avaliacoes, banner, galeria)
router.get('/:id/detalhes', barbeariaController.getBarbeariaDetalhes);

// PUT /api/barbearias/:id - Atualiza
router.put('/:id', barbeariaController.updateBarbearia);

// PUT /api/barbearias/:id/detalhes - Atualiza bloco de detalhes
router.put('/:id/detalhes', barbeariaController.updateBarbeariaDetalhes);

// DELETE /api/barbearias/:id - Remove
router.delete('/:id', barbeariaController.deleteBarbearia);

module.exports = router;
