const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { ensureUserProfileSchema } = require('../services/userProfileSchema');
const { signAuthToken } = require('../services/authTokens');
const { safeSyncUserToBot } = require('../services/botSync');
const {
  validarAceiteLegalCadastro,
  montarRegistroAceiteLegal,
} = require('../services/legalConsent');

function normalizarTexto(value) {
  return String(value || '').trim();
}

function normalizarEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isPersistableMediaUrl(value) {
  const url = normalizarTexto(value);
  if (!url) return false;

  return (
    url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('/uploads/')
    || url.startsWith('/api/uploads/')
  );
}

function normalizarMediaUrl(value) {
  const url = normalizarTexto(value);
  if (!url) return null;
  return isPersistableMediaUrl(url) ? url : null;
}

function obterIpRequisicao(req) {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || null;
}

function serializarUsuario(row) {
  if (!row) return row;
  return {
    ...row,
    avatar_url: normalizarMediaUrl(row.avatar_url),
    tax_id: normalizarTexto(row.tax_id),
    billing_address: row.billing_address || {},
  };
}

/**
 * POST /api/usuarios/register
 * Cria novo usuário
 */
async function register(req, res) {
  try {
    await ensureUserProfileSchema();

    const {
      nome,
      email,
      senha,
      telefone,
      tipo,
      tax_id,
      billing_address,
      termsAccepted,
      privacyAccepted,
    } = req.body;
    console.debug('[USUARIO.register] Entrada', {
      nomeLength: nome?.length || 0,
      email,
      hasSenha: Boolean(senha),
      telefoneLength: telefone?.length || 0,
      tipo: tipo || 'cliente',
    });
    
    if (!nome || !email || !senha) {
      console.info('[USUARIO.register] Validação falhou: campos obrigatórios ausentes');
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const validacaoAceiteLegal = validarAceiteLegalCadastro({ termsAccepted, privacyAccepted });
    if (!validacaoAceiteLegal.ok) {
      console.info('[USUARIO.register] Validação falhou: aceite legal ausente', { email });
      return res.status(validacaoAceiteLegal.status).json({ error: validacaoAceiteLegal.error });
    }
    
    // Verificar se email já existe
    console.debug('[USUARIO.register] Consultando email existente');
    const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.info('[USUARIO.register] Email já cadastrado', { email });
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Criptografar senha
    console.debug('[USUARIO.register] Gerando hash da senha');
    const senhaHash = await bcrypt.hash(senha, 10);
    const aceiteLegal = montarRegistroAceiteLegal({
      ipAddress: obterIpRequisicao(req),
      userAgent: req.headers?.['user-agent'],
    });
    
    console.debug('[USUARIO.register] Inserindo novo usuário');
    const result = await pool.query(
      `INSERT INTO usuarios (
         nome, email, senha_hash, telefone, tipo, tax_id, billing_address,
         terms_accepted_at, terms_version, privacy_accepted_at, privacy_version,
         legal_acceptance_ip, legal_acceptance_user_agent
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, nome, email, telefone, tipo, avatar_url, preferencias,
                 tax_id, billing_address,
                 terms_accepted_at, terms_version, privacy_accepted_at, privacy_version,
                 subscription_plan, subscription_status,
                 subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end,
                 created_at`,
      [
        nome,
        email,
        senhaHash,
        telefone || null,
        tipo || 'cliente',
        normalizarTexto(tax_id) || null,
        billing_address || {},
        new Date(aceiteLegal.terms_accepted_at),
        aceiteLegal.terms_version,
        new Date(aceiteLegal.privacy_accepted_at),
        aceiteLegal.privacy_version,
        aceiteLegal.legal_acceptance_ip,
        aceiteLegal.legal_acceptance_user_agent,
      ]
    );

    console.info('[USUARIO.register] Usuário criado com sucesso', {
      id: result.rows[0]?.id,
      email: result.rows[0]?.email,
      tipo: result.rows[0]?.tipo,
    });

    const usuario = serializarUsuario(result.rows[0]);
    await safeSyncUserToBot(usuario);
    const token = signAuthToken(usuario);

    res.status(201).json({ usuario, token });
  } catch (error) {
    console.error('[USUARIO.register] Falha inesperada', {
      code: error?.code,
      message: error?.message,
      detail: error?.detail,
      routine: error?.routine,
    }, error);
    const isDbUnavailable = error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND';

    if (isDbUnavailable) {
      return res.status(503).json({
        error: 'Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.'
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
    await ensureUserProfileSchema();

    const { email, senha } = req.body;
    console.debug('[USUARIO.login] Entrada', {
      email,
      hasSenha: Boolean(senha),
    });
    
    if (!email || !senha) {
      console.info('[USUARIO.login] Validação falhou: email/senha ausentes');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    console.debug('[USUARIO.login] Buscando usuário por email');
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.info('[USUARIO.login] Usuário não encontrado', { email });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const usuario = result.rows[0];
    console.debug('[USUARIO.login] Validando hash de senha', { userId: usuario.id });
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    
    if (!senhaValida) {
      console.info('[USUARIO.login] Senha inválida', { userId: usuario.id, email });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Retornar sem senha
    const { senha_hash, ...usuarioSemSenha } = usuario;
    console.info('[USUARIO.login] Login concluído', { userId: usuarioSemSenha.id, email: usuarioSemSenha.email });
    const usuarioSerializado = serializarUsuario(usuarioSemSenha);
    await safeSyncUserToBot(usuarioSerializado);
    const token = signAuthToken(usuarioSerializado);
    res.json({ usuario: usuarioSerializado, token });
  } catch (error) {
    console.error('[USUARIO.login] Falha inesperada', {
      code: error?.code,
      message: error?.message,
      detail: error?.detail,
      routine: error?.routine,
    }, error);
    const isDbUnavailable = error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND';

    if (isDbUnavailable) {
      return res.status(503).json({
        error: 'Ocorreu um erro ao processar sua solicitação. Tente novamente em instantes.'
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
    await ensureUserProfileSchema();

    const { id } = req.params;
    if (!req.auth?.id || String(req.auth.id) !== String(id)) {
      return res.status(403).json({ error: 'Voce so pode acessar o proprio perfil.' });
    }

    const result = await pool.query(
      `SELECT id, nome, email, telefone, tipo, avatar_url, preferencias,
              tax_id, billing_address,
              subscription_plan, subscription_status,
              subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end,
              created_at
       FROM usuarios WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json({ usuario: serializarUsuario(result.rows[0]) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

async function getMe(req, res) {
  try {
    await ensureUserProfileSchema();

    const userId = String(req.auth?.id || '').trim();
    if (!userId) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' });
    }

    const result = await pool.query(
      `SELECT id, nome, email, telefone, tipo, avatar_url, preferencias,
              tax_id, billing_address,
              subscription_plan, subscription_status,
              subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end,
              created_at
       FROM usuarios
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ usuario: serializarUsuario(result.rows[0]) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário autenticado' });
  }
}

/**
 * PUT /api/usuarios/:id
 * Atualiza usuário
 */
async function updateUsuario(req, res) {
  try {
    await ensureUserProfileSchema();

    const { id } = req.params;
    if (!req.auth?.id || String(req.auth.id) !== String(id)) {
      return res.status(403).json({ error: 'Voce so pode atualizar o proprio perfil.' });
    }

    const { nome, email, telefone, avatar_url, preferencias, tax_id, billing_address } = req.body;
    const atualResult = await pool.query(
      'SELECT id, email, avatar_url, preferencias, telefone, nome, tax_id, billing_address FROM usuarios WHERE id = $1 LIMIT 1',
      [id]
    );

    if (atualResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const atual = atualResult.rows[0];
    const avatarUrlFinal = avatar_url === undefined ? normalizarMediaUrl(atual.avatar_url) : normalizarMediaUrl(avatar_url);
    const emailFinal = email === undefined ? normalizarEmail(atual.email) : normalizarEmail(email);
    const telefoneFinal = telefone === undefined ? atual.telefone : telefone || null;
    const preferenciasFinais = preferencias === undefined ? (atual.preferencias || {}) : (preferencias || {});
    const taxIdFinal = tax_id === undefined ? normalizarTexto(atual.tax_id) : normalizarTexto(tax_id);
    const billingAddressFinal = billing_address === undefined ? (atual.billing_address || {}) : (billing_address || {});
    const nomeFinal = String(nome || atual.nome || '').trim();

    if (!nomeFinal) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    if (!emailFinal) {
      return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    const emailExistente = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 AND id <> $2 LIMIT 1',
      [emailFinal, id]
    );

    if (emailExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    const result = await pool.query(
      `UPDATE usuarios
       SET nome=$1, email=$2, telefone=$3, avatar_url=$4, preferencias=$5, tax_id=$6, billing_address=$7, updated_at=NOW()
       WHERE id=$8
       RETURNING id, nome, email, telefone, tipo, avatar_url, preferencias,
                            tax_id, billing_address,
                            subscription_plan, subscription_status,
                            subscription_trial_ends_at, subscription_grace_ends_at, subscription_current_period_end`,
      [nomeFinal, emailFinal, telefoneFinal, avatarUrlFinal, preferenciasFinais, taxIdFinal || null, billingAddressFinal, id]
    );
    
    res.json({ usuario: serializarUsuario(result.rows[0]) });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

module.exports = { register, login, getUsuario, getMe, updateUsuario };
