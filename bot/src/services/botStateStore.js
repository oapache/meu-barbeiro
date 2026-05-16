const { getRedisConnection } = require('../config/redis');

const STATE_PREFIX = 'ocorte:bot:state:';
const ACTIVE_SESSIONS_KEY = 'ocorte:bot:sessions:active';
const STATE_TTL_SECONDS = 60 * 60 * 24 * 7;

function stateKey(barbeariaId) {
  return `${STATE_PREFIX}${String(barbeariaId || '').trim()}`;
}

function criarEstadoBase(barbeariaId = '') {
  const normalizedBarbeariaId = String(barbeariaId || '').trim();

  return {
    barbeariaId: normalizedBarbeariaId,
    status: 'idle',
    lastMessage: 'Bot parado.',
    lastError: '',
    qrCodeDataUrl: '',
    qrCodeText: '',
    loadingPercent: 0,
    isAuthenticated: false,
    requestedPhoneNumber: '',
    phoneNumber: '',
    pushName: '',
    queueDepth: 0,
    updatedAt: new Date().toISOString(),
  };
}

async function readBotState(barbeariaId) {
  const normalizedBarbeariaId = String(barbeariaId || '').trim();
  if (!normalizedBarbeariaId) return criarEstadoBase('');

  const redis = getRedisConnection();
  const raw = await redis.get(stateKey(normalizedBarbeariaId));
  if (!raw) return criarEstadoBase(normalizedBarbeariaId);

  try {
    return {
      ...criarEstadoBase(normalizedBarbeariaId),
      ...JSON.parse(raw),
      barbeariaId: normalizedBarbeariaId,
    };
  } catch {
    return criarEstadoBase(normalizedBarbeariaId);
  }
}

async function writeBotState(barbeariaId, patch = {}) {
  const normalizedBarbeariaId = String(barbeariaId || '').trim();
  const current = await readBotState(normalizedBarbeariaId);
  const next = {
    ...current,
    ...patch,
    barbeariaId: normalizedBarbeariaId,
    updatedAt: new Date().toISOString(),
  };

  const redis = getRedisConnection();
  await redis.set(stateKey(normalizedBarbeariaId), JSON.stringify(next), 'EX', STATE_TTL_SECONDS);

  if (['ready', 'starting', 'qr_ready', 'authenticated'].includes(next.status)) {
    await redis.sadd(ACTIVE_SESSIONS_KEY, normalizedBarbeariaId);
  }

  return next;
}

async function removeActiveSession(barbeariaId) {
  const redis = getRedisConnection();
  await redis.srem(ACTIVE_SESSIONS_KEY, String(barbeariaId || '').trim());
}

async function listActiveSessionIds() {
  const redis = getRedisConnection();
  return redis.smembers(ACTIVE_SESSIONS_KEY);
}

function toPublicState(state) {
  const { qrCodeText, ...publicState } = state || {};
  return {
    ...publicState,
    hasQrCode: Boolean(publicState.qrCodeDataUrl),
    qrCodeText: undefined,
  };
}

module.exports = {
  criarEstadoBase,
  readBotState,
  writeBotState,
  removeActiveSession,
  listActiveSessionIds,
  toPublicState,
};
