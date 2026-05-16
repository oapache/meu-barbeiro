const express = require('express');
const config = require('../config');
const { sendTextMessage, disconnectBotPorAssinatura } = require('../services/whatsappBot');
const { registrarSolicitacaoAvaliacaoPendente } = require('../services/chatbotConversation');

const router = express.Router();

function requireServiceToken(req, res, next) {
  if (!config.botServiceToken) {
    return next();
  }

  const authHeader = String(req.headers?.authorization || '').trim();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  if (token !== config.botServiceToken) {
    return res.status(401).json({ error: 'Token interno do bot inválido.' });
  }

  next();
}

router.use(requireServiceToken);

router.post('/messages/send', async (req, res) => {
  try {
    const result = await sendTextMessage({
      barbeariaId: req.body?.barbeariaId || req.body?.barbearia_id,
      phoneNumber: req.body?.phoneNumber || req.body?.telefone,
      message: req.body?.message || req.body?.mensagem,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível enviar a mensagem pelo bot.' });
  }
});

router.post('/review-requests', async (req, res) => {
  try {
    const result = await registrarSolicitacaoAvaliacaoPendente(req.body || {});
    res.json({ ok: true, conversation: result || null });
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível registrar a solicitação de avaliação.' });
  }
});

router.post('/subscription/disconnect', async (req, res) => {
  try {
    const result = await disconnectBotPorAssinatura({
      barbeariaId: req.body?.barbeariaId || req.body?.barbearia_id,
      subscriptionStatus: req.body?.subscriptionStatus || req.body?.subscription_status,
    });

    res.json({ bot: result || null });
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível desconectar o bot por assinatura.' });
  }
});

module.exports = router;
