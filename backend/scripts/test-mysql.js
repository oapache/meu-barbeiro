require('dotenv').config();

const pool = require('../src/config/database');

async function testConnection() {
  console.log('🔄 Testando conexão com MySQL...');

  try {
    const result = await pool.query('SELECT 1 AS test');
    console.log('✅ Conectado com sucesso!');
    console.log('Resultado:', result.rows);
    process.exitCode = 0;
  } catch (error) {
    console.log('❌ Erro ao conectar:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
