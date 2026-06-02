require('dotenv').config();
const pool = require('../src/config/database');

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando ao banco...');
    
    // Tabela usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255),
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        tipo VARCHAR(20) DEFAULT 'cliente',
        avatar_url TEXT,
        preferencias JSON DEFAULT (JSON_OBJECT()),
        tax_id TEXT,
        billing_address JSON DEFAULT (JSON_OBJECT()),
        terms_accepted_at DATETIME,
        terms_version VARCHAR(50),
        privacy_accepted_at DATETIME,
        privacy_version VARCHAR(50),
        legal_acceptance_ip VARCHAR(100),
        legal_acceptance_user_agent TEXT,
        stripe_customer_id TEXT,
        subscription_plan VARCHAR(255) DEFAULT 'free',
        subscription_status VARCHAR(255) DEFAULT 'inactive',
        subscription_trial_ends_at DATETIME,
        subscription_grace_ends_at DATETIME,
        subscription_current_period_end DATETIME,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela usuarios criada');

    await client.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS preferencias JSON DEFAULT (JSON_OBJECT()),
      ADD COLUMN IF NOT EXISTS tax_id TEXT,
      ADD COLUMN IF NOT EXISTS billing_address JSON DEFAULT (JSON_OBJECT()),
      ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME,
      ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50),
      ADD COLUMN IF NOT EXISTS privacy_accepted_at DATETIME,
      ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(50),
      ADD COLUMN IF NOT EXISTS legal_acceptance_ip VARCHAR(100),
      ADD COLUMN IF NOT EXISTS legal_acceptance_user_agent TEXT,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255) DEFAULT 'inactive',
      ADD COLUMN IF NOT EXISTS subscription_trial_ends_at DATETIME,
      ADD COLUMN IF NOT EXISTS subscription_grace_ends_at DATETIME,
      ADD COLUMN IF NOT EXISTS subscription_current_period_end DATETIME
    `);
    
    // Tabela barbearias
    await client.query(`
      CREATE TABLE IF NOT EXISTS barbearias (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        usuario_id CHAR(36) REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        endereco TEXT,
        logo_url TEXT,
        horario_abertura TIME DEFAULT '09:00',
        horario_fechamento TIME DEFAULT '20:00',
        horarios_semana JSON,
        whatsapp_link TEXT,
        nota_media NUMERIC(10, 2) DEFAULT 0,
        total_avaliacoes INTEGER DEFAULT 0,
        subscription_plan VARCHAR(255) DEFAULT 'free',
        subscription_status VARCHAR(255) DEFAULT 'inactive',
        premium_locked_at DATETIME,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela barbearias criada');

    await client.query(`
      ALTER TABLE barbearias
      ADD COLUMN IF NOT EXISTS nota_media NUMERIC(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_avaliacoes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(255) DEFAULT 'inactive',
      ADD COLUMN IF NOT EXISTS premium_locked_at DATETIME,
      ADD COLUMN IF NOT EXISTS chatbot_mode VARCHAR(255) DEFAULT 'legacy',
      ADD COLUMN IF NOT EXISTS chatbot_enabled TINYINT(1) DEFAULT true
    `);
    
    // Tabela servicos
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        imagem_url TEXT,
        preco DECIMAL(10, 2) NOT NULL,
        duracao_minutos INTEGER DEFAULT 30,
        ativo TINYINT(1) DEFAULT true,
        created_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela servicos criada');

    await client.query(`
      ALTER TABLE servicos
      ADD COLUMN IF NOT EXISTS imagem_url TEXT,
      ADD COLUMN IF NOT EXISTS pausado_por_assinatura TINYINT(1) DEFAULT false,
      ADD COLUMN IF NOT EXISTS ativo_antes_pausa_assinatura TINYINT(1)
    `);
    
    // Tabela agendamentos
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        servico_id CHAR(36) REFERENCES servicos(id),
        cliente_id CHAR(36) REFERENCES usuarios(id),
        cliente_nome_externo TEXT,
        cliente_telefone_externo VARCHAR(20),
        barbeiro_id CHAR(36) REFERENCES usuarios(id),
        data DATE NOT NULL,
        hora TIME NOT NULL,
        status VARCHAR(20) DEFAULT 'pendente',
        chatbot_session_id CHAR(36),
        servico_nome_snapshot TEXT,
        servico_preco_snapshot NUMERIC(10, 2),
        avaliacao_nota INTEGER,
        avaliacao_comentario TEXT,
        avaliacao_registrada_em DATETIME,
        observacoes TEXT,
        origem VARCHAR(30) DEFAULT 'app',
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela agendamentos criada');

    await client.query(`
      ALTER TABLE agendamentos
      ADD COLUMN IF NOT EXISTS cliente_nome_externo TEXT,
      ADD COLUMN IF NOT EXISTS cliente_telefone_externo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS origem VARCHAR(30) DEFAULT 'app',
      ADD COLUMN IF NOT EXISTS chatbot_session_id CHAR(36),
      ADD COLUMN IF NOT EXISTS servico_nome_snapshot TEXT,
      ADD COLUMN IF NOT EXISTS servico_preco_snapshot NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS avaliacao_nota INTEGER,
      ADD COLUMN IF NOT EXISTS avaliacao_comentario TEXT,
      ADD COLUMN IF NOT EXISTS avaliacao_registrada_em DATETIME
    `);
    
    // Tabela fidelidade
    await client.query(`
      CREATE TABLE IF NOT EXISTS fidelidade (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        cliente_id CHAR(36) REFERENCES usuarios(id) ON DELETE CASCADE,
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        pontos INTEGER DEFAULT 0,
        total_gasto DECIMAL(10, 2) DEFAULT 0,
        ultima_compra DATETIME,
        created_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela fidelidade criada');

    // Tabela barbearia_detalhes
    await client.query(`
      CREATE TABLE IF NOT EXISTS barbearia_detalhes (
        barbearia_id CHAR(36) PRIMARY KEY REFERENCES barbearias(id) ON DELETE CASCADE,
        amenidades JSON DEFAULT (JSON_ARRAY()),
        profissionais JSON DEFAULT (JSON_ARRAY()),
        avaliacoes JSON DEFAULT (JSON_ARRAY()),
        banner_url VARCHAR(255) DEFAULT '',
        galeria JSON DEFAULT (JSON_ARRAY()),
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela barbearia_detalhes criada');

    // Tabela assinaturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS assinaturas (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        usuario_id CHAR(36) REFERENCES usuarios(id) ON DELETE CASCADE,
        stripe_customer_id TEXT,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        stripe_price_id TEXT,
        plan_key TEXT,
        status VARCHAR(255) DEFAULT 'inactive',
        trial_end DATETIME,
        current_period_start DATETIME,
        current_period_end DATETIME,
        cancel_at_period_end TINYINT(1) DEFAULT false,
        provider VARCHAR(255) DEFAULT 'stripe',
        payment_method VARCHAR(255) DEFAULT 'card',
        provider_customer_id TEXT,
        provider_subscription_id TEXT,
        provider_price_id TEXT,
        provider_checkout_url TEXT,
        provider_payload JSON DEFAULT (JSON_OBJECT()),
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela assinaturas criada');

    await client.query(`
      ALTER TABLE assinaturas
      ADD COLUMN IF NOT EXISTS provider VARCHAR(255) DEFAULT 'stripe',
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255) DEFAULT 'card',
      ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
      ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT,
      ADD COLUMN IF NOT EXISTS provider_payload JSON DEFAULT (JSON_OBJECT())
    `);

    // Tabela webhook_events
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type TEXT,
        payload JSON,
        processed_at DATETIME DEFAULT NOW(),
        created_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela webhook_events criada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_chatbot_conversations (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        contact_name VARCHAR(255),
        stage VARCHAR(50) DEFAULT 'idle',
        payload JSON DEFAULT (JSON_OBJECT()),
        status VARCHAR(20) DEFAULT 'active',
        last_inbound_message TEXT,
        last_outbound_message TEXT,
        last_interaction_at DATETIME DEFAULT NOW(),
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW(),
        UNIQUE (barbearia_id, phone_number)
      )
    `);
    console.log('✅ Tabela whatsapp_chatbot_conversations criada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_chatbot_sessions (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        phone_hash VARCHAR(64) NOT NULL,
        phone_masked VARCHAR(32),
        contact_name_masked TEXT,
        entry_intent TEXT,
        current_stage VARCHAR(255) DEFAULT 'idle',
        status VARCHAR(255) DEFAULT 'active',
        outcome_code TEXT,
        agendamento_id CHAR(36) REFERENCES agendamentos(id) ON DELETE SET NULL,
        review_status VARCHAR(255) DEFAULT 'pending',
        reviewed_intent TEXT,
        review_notes TEXT,
        ideal_response TEXT,
        reviewed_by TEXT,
        reviewed_at DATETIME,
        started_at DATETIME DEFAULT NOW(),
        ended_at DATETIME,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela whatsapp_chatbot_sessions criada');

    await client.query(`
      ALTER TABLE whatsapp_chatbot_sessions
      ADD COLUMN IF NOT EXISTS review_status VARCHAR(255) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS reviewed_intent TEXT,
      ADD COLUMN IF NOT EXISTS review_notes TEXT,
      ADD COLUMN IF NOT EXISTS ideal_response TEXT,
      ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
      ADD COLUMN IF NOT EXISTS reviewed_at DATETIME
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_chatbot_turns (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        session_id CHAR(36) REFERENCES whatsapp_chatbot_sessions(id) ON DELETE CASCADE,
        direction TEXT NOT NULL,
        text_masked TEXT,
        stage_before TEXT,
        stage_after TEXT,
        detected_intent TEXT,
        slots_json JSON DEFAULT (JSON_OBJECT()),
        result_code TEXT,
        send_status TEXT,
        created_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela whatsapp_chatbot_turns criada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS estoque_produtos (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        categoria VARCHAR(100),
        descricao TEXT,
        imagem_url TEXT,
        quantidade_item NUMERIC(10, 2) DEFAULT 1,
        unidade VARCHAR(30) DEFAULT 'un',
        estoque_atual NUMERIC(10, 2) DEFAULT 0,
        estoque_minimo NUMERIC(10, 2) DEFAULT 0,
        custo_unitario NUMERIC(10, 2) DEFAULT 0,
        preco_venda NUMERIC(10, 2) DEFAULT 0,
        fornecedor VARCHAR(255),
        localizacao VARCHAR(255),
        observacoes TEXT,
        ativo TINYINT(1) DEFAULT true,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela estoque_produtos criada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        barbearia_id CHAR(36) REFERENCES barbearias(id) ON DELETE CASCADE,
        produto_id CHAR(36) REFERENCES estoque_produtos(id) ON DELETE CASCADE,
        tipo VARCHAR(30) NOT NULL,
        quantidade NUMERIC(10, 2) NOT NULL,
        custo_unitario NUMERIC(10, 2),
        preco_unitario NUMERIC(10, 2),
        valor_total NUMERIC(10, 2),
        estoque_anterior NUMERIC(10, 2),
        estoque_posterior NUMERIC(10, 2),
        motivo TEXT,
        referencia_tipo VARCHAR(50),
        referencia_id TEXT,
        profissional_id TEXT,
        profissional_nome TEXT,
        movimentado_em DATETIME,
        observacoes TEXT,
        created_by CHAR(36) REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela estoque_movimentacoes criada');
    
    console.log('\n🎉 Todas as tabelas criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();
