const DEFAULT_JWT_SECRET = 'meubarbeiro-secret-key';

const PLACEHOLDER_JWT_SECRETS = new Set([
  '',
  DEFAULT_JWT_SECRET,
  'changeme',
  'change-me',
  'your-jwt-secret',
  'jwt-secret',
  'secret',
]);

const PLACEHOLDER_SERVICE_TOKENS = new Set([
  '',
  'changeme',
  'change-me',
  'mesmo_token_do_backend',
  'your-bot-service-token',
  'bot-service-token',
]);

function normalizeValue(value = '') {
  return String(value || '').trim();
}

function isPlaceholder(value = '', placeholders = PLACEHOLDER_JWT_SECRETS) {
  const normalized = normalizeValue(value).toLowerCase();
  return placeholders.has(normalized);
}

function validateRuntimeSecurity(options = {}) {
  const serviceName = normalizeValue(options.serviceName) || 'service';
  const nodeEnv = normalizeValue(options.nodeEnv).toLowerCase() || 'development';
  const jwtSecret = normalizeValue(options.jwtSecret);
  const serviceToken = normalizeValue(options.serviceToken);

  if (nodeEnv !== 'production') return;

  if (isPlaceholder(jwtSecret, PLACEHOLDER_JWT_SECRETS)) {
    throw new Error(`[SECURITY] ${serviceName}: JWT_SECRET ausente ou inseguro para produção.`);
  }

  if (options.requireServiceToken && isPlaceholder(serviceToken, PLACEHOLDER_SERVICE_TOKENS)) {
    throw new Error(`[SECURITY] ${serviceName}: BOT_SERVICE_TOKEN ausente ou inseguro para produção.`);
  }
}

module.exports = {
  DEFAULT_JWT_SECRET,
  validateRuntimeSecurity,
};
