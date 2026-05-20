const WhatsAppService = require('./whatsapp');
const { getQueues, getQueueEvents, buildJobId } = require('../queues/whatsappQueues');
const {
  readBotState,
  writeBotState,
  toPublicState,
  listActiveSessionIds,
} = require('./botStateStore');
const {
  normalizarBarbeariaId,
  prepararTelefone,
  validarAssinaturaParaBot,
  validarChatbotHabilitado,
} = require('./baileysRuntime');
const { getBarbeariaSubscriptionAccess } = require('./subscriptionAccess');
const { getChatbotOperationalSettings } = require('./chatbotTraining');

const WHATSAPP_BOT_ALLOWED_STATUSES = ['active', 'trialing', 'past_due'];
const RECOVERABLE_STALE_STATUSES = new Set(['ready', 'authenticated', 'starting', 'qr_ready']);

function assinaturaPermiteBot(status) {
  return WHATSAPP_BOT_ALLOWED_STATUSES.includes(String(status || '').trim());
}

function criarErroAssinaturaBloqueandoBot(status) {
  const statusNormalizado = String(status || 'inactive').trim() || 'inactive';
  const error = new Error(
    statusNormalizado === 'grace_period'
      ? 'A assinatura venceu e o bot do WhatsApp foi desconectado. Regularize o plano para reconectar.'
      : 'A assinatura desta barbearia não permite manter o bot do WhatsApp conectado.'
  );

  error.code = 'WHATSAPP_BOT_SUBSCRIPTION_BLOCKED';
  error.subscriptionStatus = statusNormalizado;
  return error;
}

async function getBotState(barbeariaId) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId);
  const state = await recoverStaleBotState(normalizedBarbeariaId, await readBotState(normalizedBarbeariaId));
  return toPublicState(state);
}

async function waitForJobResult(queue, job, timeoutMs = 10000) {
  const events = getQueueEvents(queue.name);

  try {
    return await job.waitUntilFinished(events, timeoutMs);
  } catch {
    return null;
  }
}

async function enqueueReconnectJob(normalizedBarbeariaId, reason = 'status-recover') {
  const queues = getQueues();
  return queues.session.add('reconnect', {
    barbeariaId: normalizedBarbeariaId,
  }, {
    jobId: buildJobId([reason, normalizedBarbeariaId, Date.now(), Math.random().toString(36).slice(2, 8)]),
  });
}

async function recoverStaleBotState(normalizedBarbeariaId, state = {}) {
  if (!normalizedBarbeariaId || !RECOVERABLE_STALE_STATUSES.has(String(state.status || ''))) {
    return state;
  }

  if (!state.requestedPhoneNumber) {
    return state;
  }

  const activeSessionIds = await listActiveSessionIds().catch(() => []);
  if (activeSessionIds.includes(normalizedBarbeariaId)) {
    return state;
  }

  const recoveringState = await writeBotState(normalizedBarbeariaId, {
    status: 'starting',
    isAuthenticated: false,
    qrCodeDataUrl: '',
    qrCodeText: '',
    loadingPercent: 35,
    lastError: '',
    lastMessage: 'Sessão do WhatsApp sem runtime ativo. Reconectando automaticamente...',
  });

  await enqueueReconnectJob(normalizedBarbeariaId).catch(async (error) => {
    await writeBotState(normalizedBarbeariaId, {
      status: 'error',
      loadingPercent: 0,
      lastError: error?.message || 'Falha ao enfileirar reconexão do WhatsApp.',
      lastMessage: 'Não foi possível reconectar automaticamente. Gere um novo QR Code.',
    }).catch(() => undefined);
  });

  return recoveringState;
}

async function enqueueSessionJob(name, data = {}, { wait = true } = {}) {
  const queues = getQueues();
  const normalizedBarbeariaId = normalizarBarbeariaId(data.barbeariaId, { required: true });
  const job = await queues.session.add(name, {
    ...data,
    barbeariaId: normalizedBarbeariaId,
  }, {
    jobId: buildJobId([name, normalizedBarbeariaId, Date.now()]),
  });

  if (wait) {
    const result = await waitForJobResult(queues.session, job, 12000);
    if (result) return toPublicState(result);
  }

  return getBotState(normalizedBarbeariaId);
}

async function startBot({ barbeariaId, phoneNumber } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const requestedPhoneNumber = prepararTelefone(phoneNumber, { required: true });

  await validarAssinaturaParaBot(normalizedBarbeariaId);
  await validarChatbotHabilitado(normalizedBarbeariaId);
  await writeBotState(normalizedBarbeariaId, {
    status: 'starting',
    requestedPhoneNumber,
    lastError: '',
    lastMessage: `Solicitação de conexão enviada ao worker para ${WhatsAppService.formatarTelefone(requestedPhoneNumber)}...`,
    loadingPercent: 5,
    reconnectAttempts: 0,
  });

  return enqueueSessionJob('start', {
    barbeariaId: normalizedBarbeariaId,
    phoneNumber: requestedPhoneNumber,
  });
}

async function stopBot({ barbeariaId, logout = false, reasonMessage = '' } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  await writeBotState(normalizedBarbeariaId, {
    status: logout ? 'disconnected' : 'idle',
    lastMessage: reasonMessage || (logout ? 'Solicitação de desconexão enviada ao worker.' : 'Solicitação para parar o bot enviada ao worker.'),
  });

  return enqueueSessionJob('stop', {
    barbeariaId: normalizedBarbeariaId,
    logout,
    reasonMessage,
  });
}

async function resetBotSession({ barbeariaId, phoneNumber } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const requestedPhoneNumber = prepararTelefone(phoneNumber, { required: true });

  await validarAssinaturaParaBot(normalizedBarbeariaId);
  await validarChatbotHabilitado(normalizedBarbeariaId);
  await writeBotState(normalizedBarbeariaId, {
    status: 'starting',
    requestedPhoneNumber,
    qrCodeDataUrl: '',
    qrCodeText: '',
    lastMessage: `Solicitação de novo QR Code enviada ao worker para ${WhatsAppService.formatarTelefone(requestedPhoneNumber)}...`,
    loadingPercent: 5,
    reconnectAttempts: 0,
  });

  return enqueueSessionJob('reset', {
    barbeariaId: normalizedBarbeariaId,
    phoneNumber: requestedPhoneNumber,
  }, { wait: false });
}

async function sendTextMessage({ barbeariaId, phoneNumber, message, telemetry } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const mensagem = String(message || '').trim();
  const telefone = String(phoneNumber || '').trim();

  if (!mensagem) {
    return {
      sent: false,
      reason: 'EMPTY_MESSAGE',
      error: 'A mensagem do WhatsApp está vazia.',
      barbeariaId: normalizedBarbeariaId,
    };
  }

  if (!telefone || !WhatsAppService.validarTelefone(telefone)) {
    return {
      sent: false,
      reason: 'INVALID_PHONE',
      error: 'Número de destino inválido para o WhatsApp.',
      barbeariaId: normalizedBarbeariaId,
    };
  }

  const queues = getQueues();
  const normalizedPhone = WhatsAppService.limparTelefone(telefone);
  const job = await queues.outbound.add('send-message', {
    barbeariaId: normalizedBarbeariaId,
    phoneNumber: normalizedPhone,
    message: mensagem,
    telemetry: telemetry || {},
  });

  const result = await waitForJobResult(queues.outbound, job, 15000);
  if (result) return result;

  return {
    sent: false,
    queued: true,
    reason: 'QUEUED',
    error: '',
    phoneNumber: normalizedPhone,
    barbeariaId: normalizedBarbeariaId,
    jobId: job.id,
  };
}

async function disconnectBotPorAssinatura({ barbeariaId, subscriptionStatus } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const statusNormalizado = String(subscriptionStatus || 'inactive').trim() || 'inactive';
  const mensagem =
    statusNormalizado === 'grace_period'
      ? 'Assinatura vencida. O bot do WhatsApp foi desconectado até a regularização do plano.'
      : 'Assinatura inativa. O bot do WhatsApp foi desconectado.';

  return stopBot({
    barbeariaId: normalizedBarbeariaId,
    logout: true,
    reasonMessage: mensagem,
  });
}

async function sincronizarBotComAssinatura(barbeariaId) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const acessoAssinatura = await getBarbeariaSubscriptionAccess(normalizedBarbeariaId);
  const settings = await getChatbotOperationalSettings(normalizedBarbeariaId).catch(() => ({ enabled: true }));

  if (!acessoAssinatura) {
    return getBotState(normalizedBarbeariaId);
  }

  if (!settings.enabled) {
    return stopBot({
      barbeariaId: normalizedBarbeariaId,
      logout: false,
      reasonMessage: 'Chatbot pausado para esta barbearia.',
    });
  }

  if (!assinaturaPermiteBot(acessoAssinatura.status)) {
    throw criarErroAssinaturaBloqueandoBot(acessoAssinatura.status);
  }

  return getBotState(normalizedBarbeariaId);
}

async function getSessionStats() {
  const activeSessionIds = await listActiveSessionIds().catch(() => []);
  return {
    activeSessions: activeSessionIds.length,
    activeSessionIds,
  };
}

module.exports = {
  getBotState,
  startBot,
  stopBot,
  resetBotSession,
  sendTextMessage,
  validarAssinaturaParaBot,
  validarChatbotHabilitado,
  disconnectBotPorAssinatura,
  sincronizarBotComAssinatura,
  getSessionStats,
};
