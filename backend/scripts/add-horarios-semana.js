require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE barbearias
      ADD COLUMN IF NOT EXISTS horarios_semana JSONB
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