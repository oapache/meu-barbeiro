process.env.DATABASE_SKIP_INIT = 'true';

const {
  LEGAL_TERMS_VERSION,
  LEGAL_PRIVACY_VERSION,
  validarAceiteLegalCadastro,
  montarRegistroAceiteLegal,
} = require('../src/services/legalConsent');

describe('aceite legal LGPD no cadastro', () => {
  it('bloqueia cadastro sem aceite dos termos e da politica de privacidade', () => {
    const resultado = validarAceiteLegalCadastro({
      termsAccepted: true,
      privacyAccepted: false,
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.status).toBe(400);
    expect(resultado.error).toContain('Termos de Uso');
    expect(resultado.error).toContain('Política de Privacidade');
  });

  it('registra versao, data, IP e user-agent do aceite', () => {
    const acceptedAt = new Date('2026-05-23T12:00:00.000Z');
    const registro = montarRegistroAceiteLegal({
      acceptedAt,
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 Teste',
    });

    expect(registro).toEqual({
      terms_accepted_at: '2026-05-23T12:00:00.000Z',
      terms_version: LEGAL_TERMS_VERSION,
      privacy_accepted_at: '2026-05-23T12:00:00.000Z',
      privacy_version: LEGAL_PRIVACY_VERSION,
      legal_acceptance_ip: '203.0.113.10',
      legal_acceptance_user_agent: 'Mozilla/5.0 Teste',
    });
  });
});
