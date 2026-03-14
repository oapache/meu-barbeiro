require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  console.log('🔄 Testando conexão com Neon...');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Conectado com sucesso!');
    console.log('Resultado:', result);
    process.exit(0);
  } catch (error) {
    console.log('❌ Erro ao conectar:', error.message);
    process.exit(1);
  }
}

testConnection();
