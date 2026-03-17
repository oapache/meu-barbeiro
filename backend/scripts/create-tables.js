require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

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

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando ao banco...');
    
    // Tabela usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255),
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        tipo VARCHAR(20) DEFAULT 'cliente',
        avatar_url TEXT,
        stripe_customer_id TEXT,
        subscription_plan TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'inactive',
        subscription_trial_ends_at TIMESTAMP WITH TIME ZONE,
        subscription_grace_ends_at TIMESTAMP WITH TIME ZONE,
        subscription_current_period_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela usuarios criada');

    await client.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
      ADD COLUMN IF NOT EXISTS subscription_trial_ends_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS subscription_grace_ends_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE
    `);
    
    // Tabela barbearias
    await client.query(`
      CREATE TABLE IF NOT EXISTS barbearias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        endereco TEXT,
        logo_url TEXT,
        horario_abertura TIME DEFAULT '09:00',
        horario_fechamento TIME DEFAULT '20:00',
        horarios_semana JSONB,
        whatsapp_link TEXT,
        subscription_plan TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'inactive',
        premium_locked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela barbearias criada');

    await client.query(`
      ALTER TABLE barbearias
      ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
      ADD COLUMN IF NOT EXISTS premium_locked_at TIMESTAMP WITH TIME ZONE
    `);
    
    // Tabela servicos
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        preco DECIMAL(10, 2) NOT NULL,
        duracao_minutos INTEGER DEFAULT 30,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela servicos criada');
    
    // Tabela agendamentos
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
        servico_id UUID REFERENCES servicos(id),
        cliente_id UUID REFERENCES usuarios(id),
        barbeiro_id UUID REFERENCES usuarios(id),
        data DATE NOT NULL,
        hora TIME NOT NULL,
        status VARCHAR(20) DEFAULT 'pendente',
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela agendamentos criada');
    
    // Tabela fidelidade
    await client.query(`
      CREATE TABLE IF NOT EXISTS fidelidade (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
        pontos INTEGER DEFAULT 0,
        total_gasto DECIMAL(10, 2) DEFAULT 0,
        ultima_compra TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela fidelidade criada');

    // Tabela barbearia_detalhes
    await client.query(`
      CREATE TABLE IF NOT EXISTS barbearia_detalhes (
        barbearia_id UUID PRIMARY KEY REFERENCES barbearias(id) ON DELETE CASCADE,
        amenidades JSONB DEFAULT '[]'::jsonb,
        profissionais JSONB DEFAULT '[]'::jsonb,
        avaliacoes JSONB DEFAULT '[]'::jsonb,
        banner_url TEXT DEFAULT '',
        galeria JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela barbearia_detalhes criada');

    // Tabela assinaturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS assinaturas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
        usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT UNIQUE,
        stripe_price_id TEXT,
        plan_key TEXT,
        status TEXT DEFAULT 'inactive',
        trial_end TIMESTAMP WITH TIME ZONE,
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela assinaturas criada');

    // Tabela webhook_events
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stripe_event_id TEXT UNIQUE NOT NULL,
        event_type TEXT,
        payload JSONB,
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela webhook_events criada');
    
    console.log('\n🎉 Todas as tabelas criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();
