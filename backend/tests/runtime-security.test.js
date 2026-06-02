process.env.DATABASE_SKIP_INIT = 'true';

const {
  validateRuntimeSecurity,
} = require('../src/config/runtimeSecurity');
const {
  authorizeServiceToken,
} = require('../src/services/serviceTokenAuth');

describe('runtime security hardening', () => {
  it('permite desenvolvimento sem JWT explícito', () => {
    expect(() => validateRuntimeSecurity({
      serviceName: 'backend',
      nodeEnv: 'development',
      jwtSecret: '',
    })).not.toThrow();
  });

  it('bloqueia produção sem JWT_SECRET', () => {
    expect(() => validateRuntimeSecurity({
      serviceName: 'backend',
      nodeEnv: 'production',
      jwtSecret: '',
    })).toThrow(/JWT_SECRET/);
  });

  it('bloqueia produção com JWT_SECRET placeholder', () => {
    expect(() => validateRuntimeSecurity({
      serviceName: 'backend',
      nodeEnv: 'production',
      jwtSecret: 'meubarbeiro-secret-key',
    })).toThrow(/JWT_SECRET/);
  });

  it('aceita produção com JWT_SECRET forte', () => {
    expect(() => validateRuntimeSecurity({
      serviceName: 'backend',
      nodeEnv: 'production',
      jwtSecret: 'super-secret-1234567890',
    })).not.toThrow();
  });
});

describe('service token auth', () => {
  it('retorna 503 quando o token interno não está configurado', () => {
    expect(authorizeServiceToken({
      configuredToken: '',
      authorizationHeader: 'Bearer abc',
      missingTokenMessage: 'BOT_SERVICE_TOKEN ausente.',
    })).toEqual({
      ok: false,
      status: 503,
      error: 'BOT_SERVICE_TOKEN ausente.',
    });
  });

  it('retorna 401 quando o token interno é inválido', () => {
    expect(authorizeServiceToken({
      configuredToken: 'segredo-interno',
      authorizationHeader: 'Bearer outro-token',
      missingTokenMessage: 'BOT_SERVICE_TOKEN ausente.',
    })).toEqual({
      ok: false,
      status: 401,
      error: 'Token interno do bot inválido.',
    });
  });

  it('aceita o token interno válido', () => {
    expect(authorizeServiceToken({
      configuredToken: 'segredo-interno',
      authorizationHeader: 'Bearer segredo-interno',
      missingTokenMessage: 'BOT_SERVICE_TOKEN ausente.',
    })).toEqual({
      ok: true,
    });
  });
});
