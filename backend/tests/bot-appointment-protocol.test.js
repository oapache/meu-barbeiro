process.env.DATABASE_SKIP_INIT = 'true';

const { serializarAgendamento } = require('../../bot/src/services/backendAppointments');
const pool = require('../../bot/src/config/database');

describe('sincronizacao de protocolo entre bot e API principal', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('envia o protocolo_atendimento no payload sincronizado pelo bot', () => {
    const payload = serializarAgendamento({
      id: 'agendamento-1',
      barbearia_id: 'barbearia-1',
      data: '2026-05-20',
      hora: '09:00',
      protocoloAtendimento: '483921',
    });

    expect(payload.protocolo_atendimento).toBe('483921');
  });
});
