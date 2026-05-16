const { verifyAuthToken } = require('../services/authTokens');

function extractBearerToken(req) {
  const authHeader = String(req.headers?.authorization || '').trim();
  if (!authHeader) return '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
}

function authenticateOptional(req, res, next) {
  const token = extractBearerToken(req);

  req.token = token || null;
  req.auth = null;

  if (!token) {
    next();
    return;
  }

  try {
    req.auth = verifyAuthToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sessao invalida ou expirada. Faca login novamente.' });
  }
}

function authenticateRequired(req, res, next) {
  return authenticateOptional(req, res, () => {
    if (!req.auth?.id) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' });
    }

    next();
  });
}

module.exports = authenticateRequired;
module.exports.extractBearerToken = extractBearerToken;
module.exports.authenticateOptional = authenticateOptional;
module.exports.authenticateRequired = authenticateRequired;
