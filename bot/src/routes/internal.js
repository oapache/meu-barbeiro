const express = require('express');
const config = require('../config');
const { authorizeServiceToken } = require('../services/serviceTokenAuth');
const { sendTextMessage, disconnectBotPorAssinatura } = require('../services/whatsappBot');
const { registrarSolicitacaoAvaliacaoPendente } = require('../services/chatbotConversation');
const {
  upsertUser,
  upsertBarbearia,
  upsertSubscription,
  bootstrapBarbershop,
} = require('../services/syncBridge');

const router = express.Router();

function requireServiceToken(req, res, next) {
  const authResult = authorizeServiceToken({
    configuredToken: config.botServiceToken,
    authorizationHeader: req.headers?.authorization,
    missingTokenMessage: 'BOT_SERVICE_TOKEN não configurado no serviço do bot.',
  });

  if (!authResult.ok) {
    return res.status(authResult.status).json({ error: authResult.error });
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

router.post('/sync/user', async (req, res) => {
  try {
    const result = await upsertUser(req.body?.user || req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível sincronizar o usuário no bot.' });
  }
});

router.post('/sync/barbershop', async (req, res) => {
  try {
    const result = await upsertBarbearia(req.body?.barbearia || req.body?.barbershop || req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível sincronizar a barbearia no bot.' });
  }
});

router.post('/sync/subscription', async (req, res) => {
  try {
    const result = await upsertSubscription(req.body?.subscription || req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível sincronizar a assinatura no bot.' });
  }
});

router.post('/sync/bootstrap-barbershop', async (req, res) => {
  try {
    const result = await bootstrapBarbershop(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Não foi possível sincronizar os dados da barbearia no bot.' });
  }
});

module.exports = router;
