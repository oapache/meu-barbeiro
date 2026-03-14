const express = require('express');
const router = express.Router();
const servicoController = require('../controllers/servico');

router.get('/:barbeariaId/servicos', servicoController.listServicos);
router.post('/:barbeariaId/servicos', servicoController.createServico);
router.put('/:id', servicoController.updateServico);
router.delete('/:id', servicoController.deleteServico);

module.exports = router;
