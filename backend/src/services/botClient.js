const config = require('../config');

function buildBotUrl(path) {
  const baseUrl = String(config.bot?.serviceUrl || '').replace(/\/+$/, '');
  if (!baseUrl) return '';
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function requestBot(path, body = {}) {
  const url = buildBotUrl(path);
  if (!url) {
    return {
      skipped: true,
      sent: false,
      reason: 'BOT_SERVICE_URL_NOT_CONFIGURED',
    };
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (config.bot?.serviceToken) {
    headers.Authorization = `Bearer ${config.bot.serviceToken}`;
  }

  const timeoutMs = Number(process.env.BOT_SERVICE_TIMEOUT_MS || 5000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error || 'Falha ao comunicar com o serviço do bot.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function sendTextMessage({ barbeariaId, phoneNumber, message } = {}) {
  return requestBot('/api/chatbot/internal/messages/send', {
    barbeariaId,
    phoneNumber,
    message,
  });
}

async function registrarSolicitacaoAvaliacaoPendente(payload = {}) {
  return requestBot('/api/chatbot/internal/review-requests', payload);
}

async function disconnectBotPorAssinatura({ barbeariaId, subscriptionStatus } = {}) {
  return requestBot('/api/chatbot/internal/subscription/disconnect', {
    barbeariaId,
    subscriptionStatus,
  });
}

async function syncBotUser(user = {}) {
  return requestBot('/api/chatbot/internal/sync/user', { user });
}

async function syncBotBarbearia(barbearia = {}) {
  return requestBot('/api/chatbot/internal/sync/barbershop', { barbearia });
}

async function syncBotSubscription(subscription = {}) {
  return requestBot('/api/chatbot/internal/sync/subscription', { subscription });
}

async function bootstrapBotBarbearia(payload = {}) {
  return requestBot('/api/chatbot/internal/sync/bootstrap-barbershop', payload);
}

module.exports = {
  sendTextMessage,
  registrarSolicitacaoAvaliacaoPendente,
  disconnectBotPorAssinatura,
  syncBotUser,
  syncBotBarbearia,
  syncBotSubscription,
  bootstrapBotBarbearia,
};
