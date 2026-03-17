require('dotenv').config();
const pool = require('../src/config/database');

const horarios = [
  { key: 'segunda', label: 'Segunda-feira', fechado: false, abertura: '09:00', fechamento: '18:00' },
  { key: 'terca', label: 'Terca-feira', fechado: false, abertura: '09:00', fechamento: '18:00' },
  { key: 'quarta', label: 'Quarta-feira', fechado: false, abertura: '09:00', fechamento: '18:00' },
  { key: 'quinta', label: 'Quinta-feira', fechado: false, abertura: '09:00', fechamento: '18:00' },
  { key: 'sexta', label: 'Sexta-feira', fechado: false, abertura: '09:00', fechamento: '18:00' },
  { key: 'sabado', label: 'Sabado', fechado: false, abertura: '09:00', fechamento: '18:00' },
  { key: 'domingo', label: 'Domingo', fechado: true, abertura: '', fechamento: '' },
];

async function populate() {
  try {
    const result = await pool.query(
      'UPDATE barbearias SET horarios_semana = $1 WHERE horarios_semana IS NULL RETURNING id, nome',
      [JSON.stringify(horarios)]
    );
    console.log('Atualizados:', result.rows.length);
    result.rows.forEach(b => console.log(' -', b.id, '|', b.nome));
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

populate();