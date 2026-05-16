const express = require('express');
const WhatsAppService = require('../services/whatsapp');
const { authenticateRequired } = require('../middleware/auth');
const { assertBarbeariaOwner } = require('../services/ownership');
const {
  getChatbotOperationalSettings,
  updateChatbotOperationalSettings,
  getChatbotMetrics,
  listChatbotSessions,
  getChatbotSessionDetail,
  updateChatbotSessionReview,
} = require('../services/chatbotTraining');

const {
  getBotState,
  startBot,
  stopBot,
  resetBotSession,
  validarAssinaturaParaBot,
  sincronizarBotComAssinatura,
} = require('../services/whatsappBot');

const router = express.Router();
router.use(authenticateRequired);

function getRequestedPhoneNumber(req) {
  return String(req.body?.phoneNumber || req.body?.telefone || req.query?.phoneNumber || '').trim();
}

function getBarbeariaId(req) {
  return String(
    req.body?.barbearia_id ||
      req.body?.barbeariaId ||
      req.query?.barbearia_id ||
      req.query?.barbeariaId ||
      ''
  ).trim();
}

function validarBarbeariaObrigatoria(req, res) {
  const barbeariaId = getBarbeariaId(req);

  if (!barbeariaId) {
    res.status(400).json({ error: 'Informe a barbearia antes de gerenciar o chatbot.' });
    return null;
  }

  return barbeariaId;
}

async function validarAcessoBarbearia(req, res) {
  const barbeariaId = validarBarbeariaObrigatoria(req, res);
  if (!barbeariaId) return null;

  try {
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);
    return barbeariaId;
  } catch (error) {
    res.status(403).json({ error: error?.message || 'Voce nao tem permissao para gerenciar esta barbearia.' });
    return null;
  }
}

function validarTelefoneObrigatorio(req, res) {
  const phoneNumber = getRequestedPhoneNumber(req);

  if (!phoneNumber) {
    res.status(400).json({ error: 'Informe o número de telefone antes de pedir o QR Code.' });
    return null;
  }

  if (!WhatsAppService.validarTelefone(phoneNumber)) {
    res.status(400).json({ error: 'Informe um número de telefone válido para o WhatsApp.' });
    return null;
  }

  return phoneNumber;
}

router.get('/metrics', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const resposta = await getChatbotMetrics({
      barbeariaId,
      from: req.query?.from,
      to: req.query?.to,
    });

    res.json(resposta);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Nao foi possivel carregar as metricas do chatbot.' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const settings = await getChatbotOperationalSettings(barbeariaId);
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Nao foi possivel carregar as configuracoes do chatbot.' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const settings = await updateChatbotOperationalSettings(barbeariaId, {
      mode: req.body?.mode,
      enabled: req.body?.enabled,
    });

    if (settings.enabled === false) {
      await stopBot({ barbeariaId });
    }

    res.json({ settings });
  } catch (error) {
    const statusCode = error?.code === 'CHATBOT_SETTINGS_NOT_FOUND' ? 404 : 400;
    res.status(statusCode).json({ error: error?.message || 'Nao foi possivel atualizar as configuracoes do chatbot.' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const resposta = await listChatbotSessions({
      barbeariaId,
      status: req.query?.status,
      stage: req.query?.stage,
      reviewStatus: req.query?.review_status,
      queueOnly: String(req.query?.queue_only || '').toLowerCase() === 'true',
      q: req.query?.q,
      limit: req.query?.limit,
      offset: req.query?.offset,
    });

    res.json(resposta);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Nao foi possivel listar as sessoes do chatbot.' });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const detalhe = await getChatbotSessionDetail({
      sessionId: req.params.id,
      barbeariaId,
    });

    if (!detalhe) {
      return res.status(404).json({ error: 'Sessao nao encontrada para esta barbearia.' });
    }

    res.json(detalhe);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Nao foi possivel carregar o detalhe da sessao.' });
  }
});

router.put('/sessions/:id/review', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const detalhe = await updateChatbotSessionReview({
      sessionId: req.params.id,
      barbeariaId,
      reviewedIntent: req.body?.reviewed_intent,
      reviewNotes: req.body?.review_notes,
      idealResponse: req.body?.ideal_response,
      reviewStatus: req.body?.review_status,
      reviewedBy: req.auth?.id,
    });

    if (!detalhe) {
      return res.status(404).json({ error: 'Sessao nao encontrada para esta barbearia.' });
    }

    res.json(detalhe);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Nao foi possivel salvar a revisao da sessao.' });
  }
});

router.get('/whatsapp/status', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const bot = await sincronizarBotComAssinatura(barbeariaId);
    res.json({ bot });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Não foi possível consultar o status do bot.' });
  }
});

router.post('/whatsapp/start', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const phoneNumber = validarTelefoneObrigatorio(req, res);
    if (!phoneNumber) return;

    await validarAssinaturaParaBot(barbeariaId);
    const bot = await startBot({ barbeariaId, phoneNumber });
    res.json({ bot });
  } catch (error) {
    const statusCode =
      error?.code === 'WHATSAPP_BOT_SUBSCRIPTION_BLOCKED'
        ? 403
        : error?.code === 'WHATSAPP_BOT_DISABLED'
          ? 423
        : error?.code === 'WHATSAPP_BOT_BARBEARIA_NOT_FOUND'
          ? 404
          : 400;

    res.status(statusCode).json({ error: error?.message || 'Não foi possível iniciar o bot.' });
  }
});

router.post('/whatsapp/reset', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const phoneNumber = validarTelefoneObrigatorio(req, res);
    if (!phoneNumber) return;

    await validarAssinaturaParaBot(barbeariaId);
    const bot = await resetBotSession({ barbeariaId, phoneNumber });
    res.json({ bot });
  } catch (error) {
    const statusCode =
      error?.code === 'WHATSAPP_BOT_SUBSCRIPTION_BLOCKED'
        ? 403
        : error?.code === 'WHATSAPP_BOT_DISABLED'
          ? 423
        : error?.code === 'WHATSAPP_BOT_BARBEARIA_NOT_FOUND'
          ? 404
          : 400;

    res.status(statusCode).json({ error: error?.message || 'Não foi possível gerar um novo QR Code.' });
  }
});

router.post('/whatsapp/stop', async (req, res) => {
  try {
    const barbeariaId = await validarAcessoBarbearia(req, res);
    if (!barbeariaId) return;

    const bot = await stopBot({ barbeariaId });
    res.json({ bot });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Não foi possível parar o bot.' });
  }
});

module.exports = router;
