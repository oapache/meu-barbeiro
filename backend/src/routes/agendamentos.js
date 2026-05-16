const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamento');
const { authenticateOptional, authenticateRequired } = require('../middleware/auth');

router.get('/disponibilidade', agendamentoController.listDisponibilidadePublica);
router.get('/', authenticateOptional, agendamentoController.listAgendamentos);
router.post('/', authenticateRequired, agendamentoController.createAgendamento);
router.post('/por-email', authenticateRequired, agendamentoController.createAgendamentoByEmail);
router.put('/:id', authenticateRequired, agendamentoController.updateAgendamento);
router.delete('/:id', authenticateRequired, agendamentoController.deleteAgendamento);

module.exports = router;
