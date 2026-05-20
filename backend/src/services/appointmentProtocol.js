const crypto = require('crypto');
const pool = require('../config/database');

const PROTOCOL_MIN = 100000;
const PROTOCOL_MAX_EXCLUSIVE = 1000000;

function gerarProtocoloAtendimento(random = Math.random) {
  const value = typeof random === 'function' ? Number(random()) : Math.random();
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999999) : Math.random();
  return String(Math.floor(safeValue * (PROTOCOL_MAX_EXCLUSIVE - PROTOCOL_MIN)) + PROTOCOL_MIN);
}

function gerarProtocoloSeguro() {
  return String(crypto.randomInt(PROTOCOL_MIN, PROTOCOL_MAX_EXCLUSIVE));
}

function normalizarProtocoloAtendimento(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(0, 20) : '';
}

async function gerarProtocoloAtendimentoUnico(executor = pool) {
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    const protocolo = gerarProtocoloSeguro();
    const existente = await executor.query(
      'SELECT id FROM agendamentos WHERE protocolo_atendimento = $1 LIMIT 1',
      [protocolo]
    );

    if (existente.rows.length === 0) {
      return protocolo;
    }
  }

  throw new Error('Não foi possível gerar um protocolo de atendimento único.');
}

module.exports = {
  gerarProtocoloAtendimento,
  gerarProtocoloAtendimentoUnico,
  normalizarProtocoloAtendimento,
};
