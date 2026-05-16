const express = require('express');
const router = express.Router();
const servicoController = require('../controllers/servico');
const { authenticateOptional, authenticateRequired } = require('../middleware/auth');

router.get('/:barbeariaId/servicos', authenticateOptional, servicoController.listServicos);
router.post('/:barbeariaId/servicos', authenticateRequired, servicoController.createServico);
router.put('/:id', authenticateRequired, servicoController.updateServico);
router.delete('/:id', authenticateRequired, servicoController.deleteServico);

module.exports = router;
