const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * POST /api/usuarios/register
 * Cria novo usuário
 */
async function register(req, res) {
  try {
    const { nome, email, senha, telefone, tipo } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    
    // Verificar se email já existe
    const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);
    
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, email, telefone, tipo,
                 subscription_plan, subscription_status,
                 subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end,
                 created_at`,
      [nome, email, senhaHash, telefone || null, tipo || 'cliente']
    );
    
    res.status(201).json({ usuario: result.rows[0] });
  } catch (error) {
    const isDbUnavailable = error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND';

    if (isDbUnavailable) {
      return res.status(503).json({
        error: 'Banco indisponível. Configure DATABASE_URL no backend/.env e tente novamente.'
      });
    }

    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

/**
 * POST /api/usuarios/login
 * Login de usuário
 */
async function login(req, res) {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Retornar sem senha
    const { senha_hash, ...usuarioSemSenha } = usuario;
    res.json({ usuario: usuarioSemSenha });
  } catch (error) {
    const isDbUnavailable = error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND';

    if (isDbUnavailable) {
      return res.status(503).json({
        error: 'Banco indisponível. Configure DATABASE_URL no backend/.env e tente novamente.'
      });
    }

    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

/**
 * GET /api/usuarios/:id
 * Busca usuário por ID
 */
async function getUsuario(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, nome, email, telefone, tipo, avatar_url,
              subscription_plan, subscription_status,
              subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end,
              created_at
       FROM usuarios WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json({ usuario: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

/**
 * PUT /api/usuarios/:id
 * Atualiza usuário
 */
async function updateUsuario(req, res) {
  try {
    const { id } = req.params;
    const { nome, telefone, avatar_url } = req.body;
    
    const result = await pool.query(
      `UPDATE usuarios SET nome=$1, telefone=$2, avatar_url=$3, updated_at=NOW() 
       WHERE id=$4 RETURNING id, nome, email, telefone, tipo, avatar_url,
                            subscription_plan, subscription_status,
                            subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end`,
      [nome, telefone, avatar_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json({ usuario: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

module.exports = { register, login, getUsuario, updateUsuario };
