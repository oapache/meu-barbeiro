require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// Converter sintaxe $1, $2 para template literal
const sql = neon(process.env.DATABASE_URL);

// Wrapper para converter query com $1, $2 para template literal
const pool = {
  query: async (text, params = []) => {
    try {
      // Converter $1, $2, etc para placeholders
      let queryText = text;
      if (params.length > 0) {
        params.forEach((param, index) => {
          const placeholder = `$${index + 1}`;
          // Substitui $1, $2, etc por String(param)
          queryText = queryText.replace(placeholder, `'${String(param).replace(/'/g, "''")}'`);
        });
      }
      
      const result = await sql`${queryText}`;
      return { rows: result };
    } catch (error) {
      console.error('Query error:', error.message);
      throw error;
    }
  }
};

module.exports = pool;
