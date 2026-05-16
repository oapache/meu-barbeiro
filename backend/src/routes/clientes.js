const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente');
const { authenticateRequired } = require('../middleware/auth');

router.get('/info/:id', authenticateRequired, clienteController.getCliente);
router.get('/:barbeariaId', authenticateRequired, clienteController.listClientes);

module.exports = router;
