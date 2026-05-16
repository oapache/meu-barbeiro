require('dotenv').config();
const pool = require('../src/config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE barbearias
      ADD COLUMN IF NOT EXISTS horarios_semana JSON
    `);
    console.log('Coluna horarios_semana adicionada com sucesso.');
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
