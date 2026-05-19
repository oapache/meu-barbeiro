require('dotenv').config();

function parseList(value, fallback = []) {
  const items = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

function unique(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function originVariants(url = '') {
  const origin = String(url || '').replace(/\/+$/, '');
  if (!origin) return [];

  const variants = [origin];
  if (origin === 'https://ocortecerto.com') variants.push('https://www.ocortecerto.com');
  if (origin === 'https://www.ocortecerto.com') variants.push('https://ocortecerto.com');

  return variants;
}

const appUrl = process.env.APP_URL || 'https://ocortecerto.com';
const backendApiUrl = String(process.env.BACKEND_API_URL || process.env.API_PUBLIC_URL || 'https://api.ocortecerto.com/api').replace(/\/+$/, '');
const configuredCorsOrigins = parseList(process.env.CORS_ORIGIN);

module.exports = {
  port: process.env.BOT_PORT || process.env.PORT || 3010,
  nodeEnv: process.env.NODE_ENV || 'production',
  appUrl,
  cors: {
    origins: unique([
      ...configuredCorsOrigins,
      ...originVariants(appUrl),
      'https://api.ocortecerto.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ]),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'meubarbeiro-secret-key',
    expiresIn: '7d',
  },
  botServiceToken: process.env.BOT_SERVICE_TOKEN || '',
  backendSync: {
    apiUrl: backendApiUrl,
    enabled: process.env.BOT_BACKEND_SYNC_ENABLED !== 'false',
    intervalMs: Number(process.env.BOT_BACKEND_SYNC_INTERVAL_MS || process.env.BOT_SCHEDULER_INTERVAL_MS || 60000),
    limit: Number(process.env.BOT_BACKEND_SYNC_LIMIT || 200),
    overlapMinutes: Number(process.env.BOT_BACKEND_SYNC_OVERLAP_MINUTES || 5),
    statePath: process.env.BOT_BACKEND_SYNC_STATE_PATH || '.bot_sync_state.json',
    timeoutMs: Number(process.env.BOT_BACKEND_SYNC_TIMEOUT_MS || 15000),
  },
  redis: {
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB || 0),
  },
  bot: {
    workerId: process.env.BOT_WORKER_ID || 'worker-a',
    maxSessions: Number(process.env.BOT_MAX_SESSIONS || 40),
    authDataPath: process.env.BOT_AUTH_DATA_PATH || '.baileys_auth',
    sendDelayMinMs: Number(process.env.BOT_SEND_DELAY_MIN_MS || 800),
    sendDelayMaxMs: Number(process.env.BOT_SEND_DELAY_MAX_MS || 2500),
    inboundConcurrency: Number(process.env.BOT_INBOUND_CONCURRENCY || 5),
    outboundConcurrency: Number(process.env.BOT_OUTBOUND_CONCURRENCY || 3),
    sessionConcurrency: Number(process.env.BOT_SESSION_CONCURRENCY || 2),
    schedulerIntervalMs: Number(process.env.BOT_SCHEDULER_INTERVAL_MS || 60000),
    staleSessionMinutes: Number(process.env.BOT_STALE_SESSION_MINUTES || 180),
    qrTtlMs: Number(process.env.BOT_QR_TTL_MS || 120000),
  },
};
