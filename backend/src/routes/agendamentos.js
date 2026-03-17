const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamento');

router.get('/', agendamentoController.listAgendamentos);
router.post('/', agendamentoController.createAgendamento);
router.post('/por-email', agendamentoController.createAgendamentoByEmail);
router.put('/:id', agendamentoController.updateAgendamento);
router.delete('/:id', agendamentoController.deleteAgendamento);

module.exports = router;
