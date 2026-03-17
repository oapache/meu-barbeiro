require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

const shouldUseSsl = (() => {
  const sslFlag = String(process.env.DATABASE_SSL || '').toLowerCase();
  if (sslFlag === 'false' || sslFlag === '0' || sslFlag === 'off') return false;
  if (!connectionString) return true;
  return !/localhost|127\.0\.0\.1/i.test(connectionString);
})();

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
