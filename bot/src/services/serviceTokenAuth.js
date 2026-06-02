const crypto = require('crypto');

function extractBearerToken(authorizationHeader = '') {
  const authHeader = String(authorizationHeader || '').trim();
  if (!authHeader) return '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
}

function buildDigest(value = '') {
  return crypto.createHash('sha256').update(String(value || '').trim()).digest();
}

function tokensMatch(expected = '', received = '') {
  const normalizedExpected = String(expected || '').trim();
  const normalizedReceived = String(received || '').trim();

  if (!normalizedExpected || !normalizedReceived) return false;

  return crypto.timingSafeEqual(
    buildDigest(normalizedExpected),
    buildDigest(normalizedReceived)
  );
}

function authorizeServiceToken(options = {}) {
  const configuredToken = String(options.configuredToken || '').trim();
  if (!configuredToken) {
    return {
      ok: false,
      status: 503,
      error: String(options.missingTokenMessage || 'BOT_SERVICE_TOKEN não configurado.'),
    };
  }

  const receivedToken = extractBearerToken(options.authorizationHeader);
  if (!tokensMatch(configuredToken, receivedToken)) {
    return {
      ok: false,
      status: 401,
      error: 'Token interno do bot inválido.',
    };
  }

  return { ok: true };
}

module.exports = {
  authorizeServiceToken,
  extractBearerToken,
  tokensMatch,
};
