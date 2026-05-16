const jwt = require('jsonwebtoken');
const config = require('../config');

function buildAuthUserPayload(user = {}) {
  return {
    id: String(user.id || '').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    nome: String(user.nome || '').trim(),
    tipo: String(user.tipo || '').trim() || 'cliente',
  };
}

function signAuthToken(user = {}) {
  const payload = buildAuthUserPayload(user);

  if (!payload.id) {
    throw new Error('Nao foi possivel assinar o token sem o id do usuario.');
  }

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

function verifyAuthToken(token = '') {
  return jwt.verify(String(token || '').trim(), config.jwt.secret);
}

module.exports = {
  buildAuthUserPayload,
  signAuthToken,
  verifyAuthToken,
};
