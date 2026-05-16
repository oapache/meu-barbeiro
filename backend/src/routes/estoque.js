const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque');
const { authenticateRequired } = require('../middleware/auth');

router.get('/:barbeariaId/resumo', authenticateRequired, estoqueController.listResumo);
router.get('/:barbeariaId/produtos', authenticateRequired, estoqueController.listProdutos);
router.post('/:barbeariaId/produtos', authenticateRequired, estoqueController.createProduto);
router.get('/:barbeariaId/movimentacoes', authenticateRequired, estoqueController.listMovimentacoes);
router.put('/produtos/:id', authenticateRequired, estoqueController.updateProduto);
router.delete('/produtos/:id', authenticateRequired, estoqueController.deleteProduto);
router.post('/produtos/:id/movimentacoes', authenticateRequired, estoqueController.createMovimentacao);

module.exports = router;
