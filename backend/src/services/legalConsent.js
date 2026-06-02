const LEGAL_TERMS_VERSION = 'terms-2026-05-23';
const LEGAL_PRIVACY_VERSION = 'privacy-2026-05-23';

function normalizarBooleano(value) {
  if (value === true) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'on', 'yes', 'sim'].includes(normalized);
  }

  return false;
}

function validarAceiteLegalCadastro(payload = {}) {
  const aceitouTermos = normalizarBooleano(payload.termsAccepted);
  const aceitouPrivacidade = normalizarBooleano(payload.privacyAccepted);

  if (!aceitouTermos || !aceitouPrivacidade) {
    return {
      ok: false,
      status: 400,
      error: 'Para criar sua conta, aceite os Termos de Uso e a Política de Privacidade.',
    };
  }

  return { ok: true };
}

function limparTexto(value, maxLength) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function montarRegistroAceiteLegal({
  acceptedAt = new Date(),
  ipAddress = null,
  userAgent = null,
} = {}) {
  const date = acceptedAt instanceof Date ? acceptedAt : new Date(acceptedAt);
  const acceptedAtIso = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();

  return {
    terms_accepted_at: acceptedAtIso,
    terms_version: LEGAL_TERMS_VERSION,
    privacy_accepted_at: acceptedAtIso,
    privacy_version: LEGAL_PRIVACY_VERSION,
    legal_acceptance_ip: limparTexto(ipAddress, 100),
    legal_acceptance_user_agent: limparTexto(userAgent, 500),
  };
}

module.exports = {
  LEGAL_TERMS_VERSION,
  LEGAL_PRIVACY_VERSION,
  validarAceiteLegalCadastro,
  montarRegistroAceiteLegal,
};
