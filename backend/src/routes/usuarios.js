const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario');
const { authenticateRequired } = require('../middleware/auth');

router.post('/register', usuarioController.register);
router.post('/login', usuarioController.login);
router.get('/me', authenticateRequired, usuarioController.getMe);
router.get('/:id', authenticateRequired, usuarioController.getUsuario);
router.put('/:id', authenticateRequired, usuarioController.updateUsuario);

module.exports = router;
