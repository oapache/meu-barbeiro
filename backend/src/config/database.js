require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.error('[DB.CONFIG] Variavel DATABASE_URL/NEON_DATABASE_URL ausente.');
  console.error('[DB.CONFIG] Crie backend/.env e configure a string de conexao PostgreSQL.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (error) => {
  console.error('[DB.POOL] Erro inesperado no pool de conexao:', error.message);
});

module.exports = pool;
