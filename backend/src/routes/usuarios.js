const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario');

router.post('/register', usuarioController.register);
router.post('/login', usuarioController.login);
router.get('/:id', usuarioController.getUsuario);
router.put('/:id', usuarioController.updateUsuario);

module.exports = router;
