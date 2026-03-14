const express = require('express');
const router = express.Router();
const barbeariaController = require('../controllers/barbearia');

// GET /api/barbearias - Lista todas
router.get('/', barbeariaController.listBarbearias);

// POST /api/barbearias - Cria nova
router.post('/', barbeariaController.createBarbearia);

// GET /api/barbearias/:id - Busca por ID
router.get('/:id', barbeariaController.getBarbearia);

// PUT /api/barbearias/:id - Atualiza
router.put('/:id', barbeariaController.updateBarbearia);

// DELETE /api/barbearias/:id - Remove
router.delete('/:id', barbeariaController.deleteBarbearia);

module.exports = router;
