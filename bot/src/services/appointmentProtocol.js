const crypto = require('crypto');

const PROTOCOL_MIN = 100000;
const PROTOCOL_MAX_EXCLUSIVE = 1000000;

function gerarProtocoloAtendimento() {
  return String(crypto.randomInt(PROTOCOL_MIN, PROTOCOL_MAX_EXCLUSIVE));
}

function normalizarProtocoloAtendimento(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(0, 20) : '';
}

module.exports = {
  gerarProtocoloAtendimento,
  normalizarProtocoloAtendimento,
};
