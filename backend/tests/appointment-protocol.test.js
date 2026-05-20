process.env.DATABASE_SKIP_INIT = 'true';

const WhatsAppService = require('../src/services/whatsapp');
const {
  gerarProtocoloAtendimento,
  normalizarProtocoloAtendimento,
} = require('../src/services/appointmentProtocol');
const pool = require('../src/config/database');

describe('protocolo de atendimento de agendamentos', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('gera protocolo numerico de 6 digitos', () => {
    expect(gerarProtocoloAtendimento(() => 0)).toBe('100000');
    expect(gerarProtocoloAtendimento(() => 0.999999)).toBe('999999');
  });

  it('normaliza protocolo digitado pelo cliente', () => {
    expect(normalizarProtocoloAtendimento('Protocolo 483-921')).toBe('483921');
    expect(normalizarProtocoloAtendimento('abc')).toBe('');
  });

  it('monta mensagem de remarcacao com protocolo e horario antigo/novo', () => {
    const mensagem = WhatsAppService.templateAgendamentoRemarcadoCliente({
      nomeCliente: 'Pablo',
      nomeBarbearia: 'BarbeariaDoET',
      servico: 'Corte Careca',
      protocoloAtendimento: '483921',
      dataAnterior: '2026-05-20',
      horaAnterior: '17:00',
      data: '2026-05-20',
      hora: '09:00',
      enderecoBarbearia: 'Rua Teste, 123',
    });

    expect(mensagem).toContain('foi remarcado');
    expect(mensagem).toContain('*Protocolo:* 483921');
    expect(mensagem).toContain('*De:* 20/05 às 17:00');
    expect(mensagem).toContain('*Para:* 20/05 às 09:00');
    expect(mensagem).toContain('responda com o protocolo *483921*');
  });
});
