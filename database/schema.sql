-- Banco de Dados - Meu Barbeiro
-- PostgreSQL / Supabase

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  tipo VARCHAR(20) DEFAULT 'cliente', -- 'cliente' ou 'barbeiro'
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de barbearias
CREATE TABLE IF NOT EXISTS barbearias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  endereco TEXT,
  logo_url TEXT,
  horario_abertura TIME DEFAULT '09:00',
  horario_fechamento TIME DEFAULT '20:00',
  whatsapp_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES servicos(id),
  cliente_id UUID REFERENCES usuarios(id),
  barbeiro_id UUID REFERENCES usuarios(id),
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'confirmado', 'cancelado', 'concluido'
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de fidelidade
CREATE TABLE IF NOT EXISTS fidelidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  pontos INTEGER DEFAULT 0,
  total_gasto DECIMAL(10, 2) DEFAULT 0,
  ultima_compra TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_barbearias_usuario ON barbearias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_servicos_barbearia ON servicos(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia ON agendamentos(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_fidelidade_cliente ON fidelidade(cliente_id);
