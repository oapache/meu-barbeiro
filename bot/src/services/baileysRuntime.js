const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');

const config = require('../config');
const WhatsAppService = require('./whatsapp');
const { handleIncomingMessage } = require('./chatbotConversation');
const {
  getChatbotOperationalSettings,
  logChatbotTurn,
} = require('./chatbotTraining');
const { getBarbeariaSubscriptionAccess } = require('./subscriptionAccess');
const {
  writeBotState,
  readBotState,
  removeActiveSession,
  listActiveSessionIds,
} = require('./botStateStore');
const { getQueues, buildJobId } = require('../queues/whatsappQueues');

const WHATSAPP_BOT_ALLOWED_STATUSES = ['active', 'trialing', 'past_due'];
const sessions = new Map();
const contactLocks = new Map();
const disconnectReasonNames = Object.entries(DisconnectReason || {}).reduce((acc, [name, value]) => {
  acc[value] = name;
  return acc;
}, {});

function normalizarBarbeariaId(barbeariaId, { required = false } = {}) {
  const valor = String(barbeariaId || '').trim();

  if (!valor && required) {
    throw new Error('Informe a barbearia antes de gerenciar o chatbot.');
  }

  return valor;
}

function sanitizarChaveBarbearia(barbeariaId) {
  return normalizarBarbeariaId(barbeariaId, { required: true }).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getAuthRootPath() {
  return config.bot.authDataPath
    ? path.resolve(process.cwd(), config.bot.authDataPath)
    : path.join(process.cwd(), '.baileys_auth');
}

function montarSessionPath(barbeariaId) {
  return path.join(getAuthRootPath(), `session-${sanitizarChaveBarbearia(barbeariaId)}`);
}

function prepararTelefone(phoneNumber, { required = false } = {}) {
  const valor = String(phoneNumber || '').trim();

  if (!valor) {
    if (required) throw new Error('Informe o número de telefone antes de pedir o QR Code.');
    return '';
  }

  if (!WhatsAppService.validarTelefone(valor)) {
    throw new Error('Informe um número de telefone válido para o WhatsApp.');
  }

  return WhatsAppService.limparTelefone(valor);
}

function assinaturaPermiteBot(status) {
  return WHATSAPP_BOT_ALLOWED_STATUSES.includes(String(status || '').trim());
}

function getDisconnectStatusCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode
    || lastDisconnect?.error?.status
    || lastDisconnect?.error?.statusCode
    || null;
}

function getDisconnectReasonName(statusCode) {
  return disconnectReasonNames[statusCode] || String(statusCode || 'unknown');
}

async function enqueueReconnectSession(barbeariaId, { reason = 'reconnect' } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const state = await readBotState(normalizedBarbeariaId);
  if (!state.requestedPhoneNumber) return null;

  const queues = getQueues();
  return queues.session.add('reconnect', { barbeariaId: normalizedBarbeariaId }, {
    jobId: buildJobId([reason, normalizedBarbeariaId, Date.now(), Math.random().toString(36).slice(2, 8)]),
  });
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

async function validarAssinaturaParaBot(barbeariaId) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const acessoAssinatura = await getBarbeariaSubscriptionAccess(normalizedBarbeariaId);

  if (!acessoAssinatura) {
    const error = new Error('Barbearia não encontrada para o bot do WhatsApp.');
    error.code = 'WHATSAPP_BOT_BARBEARIA_NOT_FOUND';
    throw error;
  }

  if (!assinaturaPermiteBot(acessoAssinatura.status)) {
    throw criarErroAssinaturaBloqueandoBot(acessoAssinatura.status);
  }

  return acessoAssinatura;
}

async function validarChatbotHabilitado(barbeariaId) {
  const settings = await getChatbotOperationalSettings(barbeariaId).catch(() => ({ enabled: true }));

  if (!settings.enabled) {
    const error = new Error('O chatbot desta barbearia esta pausado no momento.');
    error.code = 'WHATSAPP_BOT_DISABLED';
    throw error;
  }

  return settings;
}

function extractTextMessage(message = {}) {
  const content = message.message || {};

  if (content.conversation) return String(content.conversation || '').trim();
  if (content.extendedTextMessage?.text) return String(content.extendedTextMessage.text || '').trim();
  if (content.imageMessage?.caption) return String(content.imageMessage.caption || '').trim();
  if (content.videoMessage?.caption) return String(content.videoMessage.caption || '').trim();
  if (content.buttonsResponseMessage?.selectedDisplayText) return String(content.buttonsResponseMessage.selectedDisplayText || '').trim();
  if (content.listResponseMessage?.title) return String(content.listResponseMessage.title || '').trim();

  return '';
}

function limparJidParaTelefone(jid = '') {
  return WhatsAppService.limparTelefone(String(jid || '').split('@')[0].split(':')[0]);
}

function normalizarJidDestino(jid = '') {
  const valor = String(jid || '').trim();
  const [usuarioComDispositivo, servidor] = valor.split('@');
  const servidorNormalizado = String(servidor || '').trim();

  if (!usuarioComDispositivo || !['s.whatsapp.net', 'lid'].includes(servidorNormalizado)) {
    return '';
  }

  const usuario = WhatsAppService.limparTelefone(usuarioComDispositivo.split(':')[0].split('_')[0]);
  if (!usuario) return '';

  return `${usuario}@${servidorNormalizado}`;
}

function obterJidResposta(message = {}) {
  return normalizarJidDestino(message?.key?.senderPn)
    || normalizarJidDestino(message?.key?.participantPn)
    || normalizarJidDestino(message?.key?.remoteJid);
}

function obterTelefoneContato(message = {}) {
  const jidTelefone = normalizarJidDestino(message?.key?.senderPn)
    || normalizarJidDestino(message?.key?.participantPn);

  return limparJidParaTelefone(jidTelefone || message?.key?.remoteJid || '');
}

function jidParaTelefoneDestino(phoneNumber = '', destinationJid = '') {
  const jidNormalizado = normalizarJidDestino(destinationJid);
  if (jidNormalizado) return jidNormalizado;

  const normalizedPhone = WhatsAppService.limparTelefone(phoneNumber);
  return `${normalizedPhone}@s.whatsapp.net`;
}

function getSession(barbeariaId) {
  return sessions.get(sanitizarChaveBarbearia(barbeariaId));
}

function setSession(barbeariaId, session) {
  sessions.set(sanitizarChaveBarbearia(barbeariaId), session);
}

function deleteSession(barbeariaId) {
  sessions.delete(sanitizarChaveBarbearia(barbeariaId));
}

function getRuntimeStats() {
  return {
    sessions: sessions.size,
    activeSessionIds: Array.from(sessions.values()).map((session) => session.barbeariaId),
  };
}

async function enqueueInboundMessage(payload) {
  const queues = getQueues();
  await queues.inbound.add('incoming-message', payload, {
    jobId: buildJobId(['inbound', payload.barbeariaId, payload.messageId || Date.now()]),
  });
}

async function buildSocket(session) {
  const sessionPath = montarSessionPath(session.barbeariaId);
  fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ['O Corte Certo', 'Chrome', '1.0.0'],
    logger: pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' }),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update = {}) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 360 });
        await writeBotState(session.barbeariaId, {
          status: 'qr_ready',
          qrCodeDataUrl,
          qrCodeText: qr,
          loadingPercent: 0,
          isAuthenticated: false,
          lastError: '',
          lastMessage: session.requestedPhoneNumber
            ? `QR Code gerado. Leia com o WhatsApp do número ${WhatsAppService.formatarTelefone(session.requestedPhoneNumber)}.`
            : 'QR Code gerado. Leia com o WhatsApp do bot.',
        });
      } catch (error) {
        await writeBotState(session.barbeariaId, {
          status: 'error',
          lastError: error?.message || 'Não foi possível gerar o QR Code.',
          lastMessage: 'Falha ao gerar o QR Code.',
        });
      }
    }

    if (connection === 'connecting') {
      await writeBotState(session.barbeariaId, {
        status: 'starting',
        loadingPercent: 20,
        lastMessage: 'Conectando ao WhatsApp...',
      });
    }

    if (connection === 'open') {
      const connectedPhone = limparJidParaTelefone(sock.user?.id || '');
      await writeBotState(session.barbeariaId, {
        status: 'ready',
        isAuthenticated: true,
        qrCodeDataUrl: '',
        qrCodeText: '',
        loadingPercent: 100,
        phoneNumber: connectedPhone,
        pushName: String(sock.user?.name || sock.user?.verifiedName || ''),
        lastError: '',
        lastMessage: 'QR Code lido com sucesso. Bot conectado ao WhatsApp.',
      });
    }

    if (connection === 'close') {
      const statusCode = getDisconnectStatusCode(lastDisconnect);
      const reasonName = getDisconnectReasonName(statusCode);
      const manuallyStopping = session.stopping === true;
      const shouldReconnect = !manuallyStopping && statusCode !== DisconnectReason.loggedOut;
      const disconnectMessage = lastDisconnect?.error?.message || '';

      console.warn('[BAILEYS_RUNTIME] Sessão WhatsApp fechada', {
        barbeariaId: session.barbeariaId,
        statusCode,
        reasonName,
        shouldReconnect,
        manuallyStopping,
        message: disconnectMessage,
      });

      await writeBotState(session.barbeariaId, {
        status: shouldReconnect ? 'starting' : 'disconnected',
        isAuthenticated: false,
        qrCodeDataUrl: '',
        qrCodeText: '',
        loadingPercent: shouldReconnect ? 35 : 0,
        phoneNumber: shouldReconnect ? undefined : '',
        pushName: shouldReconnect ? undefined : '',
        lastMessage: shouldReconnect
          ? 'O WhatsApp reiniciou a conexão. Tentando reconectar automaticamente...'
          : 'Sessão desconectada.',
        lastError: shouldReconnect ? '' : disconnectMessage,
        disconnectReason: reasonName,
        disconnectStatusCode: statusCode,
      });

      deleteSession(session.barbeariaId);

      if (shouldReconnect) {
        await enqueueReconnectSession(session.barbeariaId, { reason: `close-${reasonName}` }).catch((error) => {
          console.error('[BAILEYS_RUNTIME] Falha ao reenfileirar reconexão', {
            barbeariaId: session.barbeariaId,
            message: error?.message,
          }, error);
        });
      } else {
        await removeActiveSession(session.barbeariaId);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages = [], type }) => {
    if (!['notify', 'append'].includes(type)) return;

    for (const message of messages) {
      const remoteJid = String(message?.key?.remoteJid || '');
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;
      if (message?.key?.fromMe) continue;

      const text = extractTextMessage(message);
      if (!text) continue;

      const phoneNumber = obterTelefoneContato(message);
      const destinationJid = obterJidResposta(message);
      if (!phoneNumber && !destinationJid) continue;

      await enqueueInboundMessage({
        barbeariaId: session.barbeariaId,
        phoneNumber,
        destinationJid,
        message: text,
        pushName: String(message.pushName || ''),
        messageId: String(message.key?.id || ''),
        timestamp: Number(message.messageTimestamp || Date.now()),
      });
    }
  });

  return sock;
}

async function startRuntimeSession({ barbeariaId, phoneNumber, force = false } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const requestedPhoneNumber = prepararTelefone(phoneNumber, { required: true });

  await validarAssinaturaParaBot(normalizedBarbeariaId);
  await validarChatbotHabilitado(normalizedBarbeariaId);

  const existing = getSession(normalizedBarbeariaId);
  if (existing?.sock && !force) {
    return readBotState(normalizedBarbeariaId);
  }

  if (sessions.size >= config.bot.maxSessions && !existing) {
    const error = new Error(`Este worker atingiu o limite de ${config.bot.maxSessions} sessões.`);
    error.code = 'WHATSAPP_WORKER_FULL';
    throw error;
  }

  await writeBotState(normalizedBarbeariaId, {
    status: 'starting',
    requestedPhoneNumber,
    lastError: '',
    qrCodeDataUrl: '',
    qrCodeText: '',
    loadingPercent: 10,
    lastMessage: `Inicializando cliente do WhatsApp para ${WhatsAppService.formatarTelefone(requestedPhoneNumber)}...`,
  });

  const session = {
    barbeariaId: normalizedBarbeariaId,
    requestedPhoneNumber,
    sock: null,
  };

  const sock = await buildSocket(session);
  session.sock = sock;
  setSession(normalizedBarbeariaId, session);

  return readBotState(normalizedBarbeariaId);
}

async function stopRuntimeSession({ barbeariaId, logout = false, reasonMessage = '' } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const session = getSession(normalizedBarbeariaId);
  const current = await readBotState(normalizedBarbeariaId);
  const finalMessage = String(reasonMessage || '').trim() || (logout ? 'Sessão desconectada.' : 'Bot parado.');

  if (session?.sock) {
    session.stopping = true;

    try {
      if (logout && typeof session.sock.logout === 'function') {
        await session.sock.logout();
      } else if (typeof session.sock.end === 'function') {
        session.sock.end(new Error(finalMessage));
      }
    } catch (error) {
      console.warn('[BAILEYS_RUNTIME] Falha ao encerrar sessão', {
        barbeariaId: normalizedBarbeariaId,
        message: error?.message,
      });
    }
  }

  deleteSession(normalizedBarbeariaId);

  if (logout) {
    try {
      fs.rmSync(montarSessionPath(normalizedBarbeariaId), { recursive: true, force: true });
    } catch (error) {
      console.warn('[BAILEYS_RUNTIME] Falha ao limpar auth state', error);
    }
  }

  await removeActiveSession(normalizedBarbeariaId);
  return writeBotState(normalizedBarbeariaId, {
    status: logout ? 'disconnected' : 'idle',
    isAuthenticated: false,
    qrCodeDataUrl: '',
    qrCodeText: '',
    requestedPhoneNumber: current.requestedPhoneNumber,
    phoneNumber: '',
    pushName: '',
    loadingPercent: 0,
    lastMessage: finalMessage,
  });
}

async function resetRuntimeSession({ barbeariaId, phoneNumber } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const requestedPhoneNumber = prepararTelefone(phoneNumber, { required: true });
  await stopRuntimeSession({ barbeariaId: normalizedBarbeariaId, logout: true, reasonMessage: 'Sessão local limpa.' });
  return startRuntimeSession({ barbeariaId: normalizedBarbeariaId, phoneNumber: requestedPhoneNumber, force: true });
}

function randomSendDelay() {
  const min = Math.max(0, Number(config.bot.sendDelayMinMs || 800));
  const max = Math.max(min, Number(config.bot.sendDelayMaxMs || 2500));
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function withContactLock(lockKey, task) {
  const previous = contactLocks.get(lockKey) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task).finally(() => {
    if (contactLocks.get(lockKey) === current) {
      contactLocks.delete(lockKey);
    }
  });

  contactLocks.set(lockKey, current);
  return current;
}

async function sendTextMessageNow({ barbeariaId, phoneNumber, destinationJid, message, telemetry = {} } = {}) {
  const normalizedBarbeariaId = normalizarBarbeariaId(barbeariaId, { required: true });
  const mensagem = String(message || '').trim();
  const telefone = String(phoneNumber || '').trim();
  const jidDestino = normalizarJidDestino(destinationJid);
  const normalizedPhone = WhatsAppService.limparTelefone(telefone || limparJidParaTelefone(jidDestino));

  return withContactLock(`${normalizedBarbeariaId}:${normalizedPhone || jidDestino}`, async () => {
    const settings = await getChatbotOperationalSettings(normalizedBarbeariaId).catch(() => ({ enabled: true }));

    if (!mensagem) {
      return { sent: false, reason: 'EMPTY_MESSAGE', error: 'A mensagem do WhatsApp está vazia.', barbeariaId: normalizedBarbeariaId };
    }

    if ((!telefone || !WhatsAppService.validarTelefone(telefone)) && !jidDestino) {
      return { sent: false, reason: 'INVALID_PHONE', error: 'Número de destino inválido para o WhatsApp.', barbeariaId: normalizedBarbeariaId };
    }

    if (!settings.enabled) {
      return { sent: false, reason: 'CHATBOT_DISABLED', error: 'O chatbot desta barbearia está pausado no momento.', barbeariaId: normalizedBarbeariaId };
    }

    try {
      await validarAssinaturaParaBot(normalizedBarbeariaId);
    } catch (error) {
      return {
        sent: false,
        reason: 'SUBSCRIPTION_BLOCKED',
        error: error?.message || 'A assinatura desta barbearia não permite usar o bot do WhatsApp.',
        barbeariaId: normalizedBarbeariaId,
      };
    }

    const session = getSession(normalizedBarbeariaId);
    const state = await readBotState(normalizedBarbeariaId);
    if (!session?.sock || state.status !== 'ready' || !state.isAuthenticated) {
      return {
        sent: false,
        reason: 'BOT_NOT_READY',
        error: 'O bot do WhatsApp não está conectado para esta barbearia.',
        barbeariaId: normalizedBarbeariaId,
        botStatus: state.status || 'idle',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, randomSendDelay()));

    try {
      const chatId = jidParaTelefoneDestino(normalizedPhone, jidDestino);
      const response = await session.sock.sendMessage(chatId, { text: mensagem });
      const result = {
        sent: true,
        phoneNumber: normalizedPhone,
        destinationJid: chatId,
        messageId: String(response?.key?.id || ''),
        timestamp: Date.now(),
        chatId,
        barbeariaId: normalizedBarbeariaId,
      };

      await writeBotState(normalizedBarbeariaId, {
        lastMessage: `Mensagem enviada para ${WhatsAppService.formatarTelefone(normalizedPhone)}.`,
      });

      if (telemetry?.sessionId) {
        await logChatbotTurn({
          sessionId: telemetry.sessionId,
          direction: 'outbound',
          text: mensagem,
          contactName: telemetry.contactName,
          stageBefore: telemetry.stageBefore,
          stageAfter: telemetry.stageAfter,
          detectedIntent: telemetry.detectedIntent,
          slots: telemetry.slots,
          resultCode: telemetry.resultCode || 'OUTBOUND_SENT',
          sendStatus: 'sent',
        }).catch(() => undefined);
      }

      return result;
    } catch (error) {
      console.error('[BAILEYS_RUNTIME] Falha ao enviar mensagem', {
        barbeariaId: normalizedBarbeariaId,
        phoneNumber: normalizedPhone,
        message: error?.message,
      }, error);

      if (telemetry?.sessionId) {
        await logChatbotTurn({
          sessionId: telemetry.sessionId,
          direction: 'outbound',
          text: mensagem,
          contactName: telemetry.contactName,
          stageBefore: telemetry.stageBefore,
          stageAfter: telemetry.stageAfter,
          detectedIntent: telemetry.detectedIntent,
          slots: telemetry.slots,
          resultCode: telemetry.resultCode || 'OUTBOUND_FAILED',
          sendStatus: 'SEND_FAILED',
        }).catch(() => undefined);
      }

      return {
        sent: false,
        reason: 'SEND_FAILED',
        error: error?.message || 'Não foi possível enviar a mensagem pelo WhatsApp.',
        phoneNumber: normalizedPhone,
        destinationJid: jidParaTelefoneDestino(normalizedPhone, jidDestino),
        barbeariaId: normalizedBarbeariaId,
      };
    }
  });
}

async function processInboundMessage(job) {
  const payload = job.data || {};
  const normalizedBarbeariaId = normalizarBarbeariaId(payload.barbeariaId, { required: true });

  await handleIncomingMessage({
    barbeariaId: normalizedBarbeariaId,
    phoneNumber: payload.phoneNumber,
    message: payload.message,
    pushName: payload.pushName || '',
    sendReply: async (reply, metadata = {}) => {
      const queues = getQueues();
      await queues.outbound.add('send-message', {
        barbeariaId: normalizedBarbeariaId,
        phoneNumber: payload.phoneNumber,
        destinationJid: payload.destinationJid,
        message: reply,
        telemetry: {
          sessionId: metadata.sessionId,
          contactName: metadata.contactName || payload.pushName || '',
          stageBefore: metadata.stageBefore,
          stageAfter: metadata.stageAfter,
          detectedIntent: metadata.detectedIntent,
          slots: metadata.slots,
          resultCode: metadata.resultCode || 'BOT_REPLY',
        },
      });
    },
  });

  await writeBotState(normalizedBarbeariaId, {
    lastMessage: `Fluxo automatico recebeu mensagem de ${WhatsAppService.formatarTelefone(payload.phoneNumber)}.`,
  });

  return { ok: true };
}

async function processOutboundMessage(job) {
  return sendTextMessageNow(job.data || {});
}

async function processSessionJob(job) {
  const data = job.data || {};

  if (job.name === 'start') {
    return startRuntimeSession(data);
  }

  if (job.name === 'reset') {
    return resetRuntimeSession(data);
  }

  if (job.name === 'stop') {
    return stopRuntimeSession(data);
  }

  if (job.name === 'reconnect') {
    const state = await readBotState(data.barbeariaId);
    if (!state.requestedPhoneNumber) return state;
    return startRuntimeSession({
      barbeariaId: data.barbeariaId,
      phoneNumber: state.requestedPhoneNumber,
    });
  }

  throw new Error(`Job de sessão desconhecido: ${job.name}`);
}

async function runSchedulerTick() {
  const activeIds = await listActiveSessionIds().catch(() => []);
  const states = [];

  for (const barbeariaId of activeIds) {
    const state = await readBotState(barbeariaId);
    states.push(state);

    if (state.status === 'qr_ready' && state.updatedAt) {
      const ageMs = Date.now() - new Date(state.updatedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs > config.bot.qrTtlMs) {
        await writeBotState(barbeariaId, {
          qrCodeDataUrl: '',
          qrCodeText: '',
          status: 'disconnected',
          lastMessage: 'QR Code expirado. Gere um novo QR Code para conectar o WhatsApp.',
        });
      }
    }

    if (state.status === 'disconnected' && state.requestedPhoneNumber) {
      await enqueueReconnectSession(barbeariaId, { reason: 'scheduler-reconnect' });
    }
  }

  return {
    activeSessions: activeIds.length,
    localRuntimeSessions: sessions.size,
    states: states.map((state) => ({
      barbeariaId: state.barbeariaId,
      status: state.status,
      updatedAt: state.updatedAt,
    })),
  };
}

module.exports = {
  normalizarBarbeariaId,
  prepararTelefone,
  validarAssinaturaParaBot,
  validarChatbotHabilitado,
  startRuntimeSession,
  stopRuntimeSession,
  resetRuntimeSession,
  processInboundMessage,
  processOutboundMessage,
  processSessionJob,
  runSchedulerTick,
  getRuntimeStats,
};
