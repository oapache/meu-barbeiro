const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateRuntimeSecurity,
} = require('../src/config/runtimeSecurity');
const {
  authorizeServiceToken,
} = require('../src/services/serviceTokenAuth');

test('permite desenvolvimento sem segredos explícitos', () => {
  assert.doesNotThrow(() => validateRuntimeSecurity({
    serviceName: 'bot',
    nodeEnv: 'development',
    jwtSecret: '',
    serviceToken: '',
    requireServiceToken: true,
  }));
});

test('bloqueia produção sem JWT_SECRET no bot', () => {
  assert.throws(() => validateRuntimeSecurity({
    serviceName: 'bot',
    nodeEnv: 'production',
    jwtSecret: '',
    serviceToken: 'token-interno',
    requireServiceToken: true,
  }), /JWT_SECRET/);
});

test('bloqueia produção sem BOT_SERVICE_TOKEN no bot', () => {
  assert.throws(() => validateRuntimeSecurity({
    serviceName: 'bot',
    nodeEnv: 'production',
    jwtSecret: 'super-secret-1234567890',
    serviceToken: '',
    requireServiceToken: true,
  }), /BOT_SERVICE_TOKEN/);
});

test('aceita produção com JWT e token interno válidos', () => {
  assert.doesNotThrow(() => validateRuntimeSecurity({
    serviceName: 'bot',
    nodeEnv: 'production',
    jwtSecret: 'super-secret-1234567890',
    serviceToken: 'token-interno',
    requireServiceToken: true,
  }));
});

test('service token auth falha fechado sem token configurado', () => {
  assert.deepEqual(authorizeServiceToken({
    configuredToken: '',
    authorizationHeader: 'Bearer abc',
    missingTokenMessage: 'BOT_SERVICE_TOKEN ausente.',
  }), {
    ok: false,
    status: 503,
    error: 'BOT_SERVICE_TOKEN ausente.',
  });
});

test('service token auth rejeita token inválido', () => {
  assert.deepEqual(authorizeServiceToken({
    configuredToken: 'segredo-interno',
    authorizationHeader: 'Bearer outro-token',
    missingTokenMessage: 'BOT_SERVICE_TOKEN ausente.',
  }), {
    ok: false,
    status: 401,
    error: 'Token interno do bot inválido.',
  });
});

test('service token auth aceita token válido', () => {
  assert.deepEqual(authorizeServiceToken({
    configuredToken: 'segredo-interno',
    authorizationHeader: 'Bearer segredo-interno',
    missingTokenMessage: 'BOT_SERVICE_TOKEN ausente.',
  }), {
    ok: true,
  });
});
