require('dotenv').config();

const pool = require('../src/config/database');

async function main() {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    console.log('MySQL conectado:', result.rows[0]);
    await pool.end();
  } catch (error) {
    console.error('Falha ao conectar no MySQL:', error.message);
    process.exitCode = 1;
  }
}

main();
