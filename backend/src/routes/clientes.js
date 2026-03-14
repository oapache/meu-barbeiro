const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente');

router.get('/:barbeariaId', clienteController.listClientes);
router.get('/info/:id', clienteController.getCliente);

module.exports = router;
