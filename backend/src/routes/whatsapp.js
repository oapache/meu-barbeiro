const express = require('express');
const router = express.Router();
const WhatsAppService = require('../services/whatsapp');

/**
 * POST /api/whatsapp/gerar-link
 * Gera link de WhatsApp para agendamento
 */
router.post('/gerar-link', (req, res) => {
  try {
    const { telefone, mensagem, tipo } = req.body;
    
    if (!telefone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' });
    }
    
    if (!WhatsAppService.validarTelefone(telefone)) {
      return res.status(400).json({ error: 'Telefone inválido' });
    }
    
    let mensagemFinal = mensagem;
    
    // Gerar template automaticamente se especificado
    if (tipo === 'agendamento' && req.body.dados) {
      mensagemFinal = WhatsAppService.templateAgendamento(req.body.dados);
    } else if (tipo === 'lembrete' && req.body.dados) {
      mensagemFinal = WhatsAppService.templateLembrete(req.body.dados);
    } else if (tipo === 'confirmacao' && req.body.dados) {
      mensagemFinal = WhatsAppService.templateConfirmacao(req.body.dados);
    }
    
    const link = WhatsAppService.gerarLink(telefone, mensagemFinal);
    
    res.json({
      success: true,
      link,
      telefone,
      mensagem: mensagemFinal
    });
  } catch (error) {
    console.error('Erro ao gerar link WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao gerar link' });
  }
});

/**
 * POST /api/whatsapp/validar-telefone
 * Valida formato do telefone
 */
router.post('/validar-telefone', (req, res) => {
  const { telefone } = req.body;
  
  if (!telefone) {
    return res.status(400).json({ error: 'Telefone é obrigatório' });
  }
  
  const valido = WhatsAppService.validarTelefone(telefone);
  
  res.json({
    valido,
    telefone: telefone.replace(/\D/g, '')
  });
});

module.exports = router;
