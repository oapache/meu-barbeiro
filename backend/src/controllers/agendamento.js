const pool = require('../config/database');
const WhatsAppService = require('../services/whatsapp');

/**
 * GET /api/agendamentos
 * Lista agendamentos (com filtros)
 */
async function listAgendamentos(req, res) {
  try {
    const { barbearia_id, cliente_id, data, status } = req.query;
    
    let query = `
      SELECT
        a.*,
        b.nome AS barbearia_nome,
        c.nome AS cliente_nome,
        s.nome AS servico_nome,
        s.preco AS servico_preco,
        br.nome AS barbeiro_nome
      FROM agendamentos a
      LEFT JOIN barbearias b ON b.id = a.barbearia_id
      LEFT JOIN usuarios c ON c.id = a.cliente_id
      LEFT JOIN servicos s ON s.id = a.servico_id
      LEFT JOIN usuarios br ON br.id = a.barbeiro_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (barbearia_id) {
      query += ` AND a.barbearia_id = $${paramCount}`;
      params.push(barbearia_id);
      paramCount++;
    }
    
    if (cliente_id) {
      query += ` AND a.cliente_id = $${paramCount}`;
      params.push(cliente_id);
      paramCount++;
    }
    
    if (data) {
      query += ` AND a.data = $${paramCount}`;
      params.push(data);
      paramCount++;
    }
    
    if (status) {
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ' ORDER BY a.data, a.hora';
    
    const result = await pool.query(query, params);
    res.json({ agendamentos: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
}

/**
 * POST /api/agendamentos
 * Cria novo agendamento
 */
async function createAgendamento(req, res) {
  try {
    const { barbearia_id, servico_id, cliente_id, barbeiro_id, data, hora, observacoes } = req.body;
    
    if (!barbearia_id || !data || !hora) {
      return res.status(400).json({ error: 'Barbearia, data e hora são obrigatórios' });
    }
    
    // Verificar se horário está disponível
    const conflito = await pool.query(
      'SELECT id FROM agendamentos WHERE barbearia_id = $1 AND data = $2 AND hora = $3 AND status != $4',
      [barbearia_id, data, hora, 'cancelado']
    );
    
    if (conflito.rows.length > 0) {
      return res.status(400).json({ error: 'Horário não disponível' });
    }
    
    const result = await pool.query(
      `INSERT INTO agendamentos (barbearia_id, servico_id, cliente_id, barbeiro_id, data, hora, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [barbearia_id, servico_id || null, cliente_id || null, barbeiro_id || null, data, hora, observacoes || null]
    );
    
    // Se tiver cliente, gerar link WhatsApp para confirmar
    let whatsappLink = null;
    if (cliente_id) {
      const cliente = await pool.query('SELECT * FROM usuarios WHERE id = $1', [cliente_id]);
      const barbearia = await pool.query('SELECT nome, whatsapp_link FROM barbearias WHERE id = $1', [barbearia_id]);
      
      if (cliente.rows.length > 0 && barbearia.rows.length > 0) {
        const mensagem = WhatsAppService.templateAgendamento({
          nomeCliente: cliente.rows[0].nome,
          servico: 'Serviço agendado',
          data,
          hora,
          nomeBarbearia: barbearia.rows[0].nome
        });
        
        if (barbearia.rows[0].whatsapp_link) {
          whatsappLink = WhatsAppService.gerarLink(barbearia.rows[0].whatsapp_link, mensagem);
        }
      }
    }
    
    res.status(201).json({ agendamento: result.rows[0], whatsappLink });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
}

/**
 * POST /api/agendamentos/por-email
 * Cria agendamento buscando cliente por email
 */
async function createAgendamentoByEmail(req, res) {
  try {
    const { barbearia_id, servico_id, cliente_email, barbeiro_id, data, hora, observacoes } = req.body;

    if (!barbearia_id || !servico_id || !cliente_email || !data || !hora) {
      return res.status(400).json({ error: 'Barbearia, serviço, email, data e hora são obrigatórios' });
    }

    const clienteResult = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE LOWER(email) = LOWER($1) AND tipo = 'cliente' LIMIT 1",
      [cliente_email]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado com este e-mail na plataforma' });
    }

    const cliente = clienteResult.rows[0];

    const conflito = await pool.query(
      'SELECT id FROM agendamentos WHERE barbearia_id = $1 AND data = $2 AND hora = $3 AND status != $4',
      [barbearia_id, data, hora, 'cancelado']
    );

    if (conflito.rows.length > 0) {
      return res.status(400).json({ error: 'Horário não disponível' });
    }

    const result = await pool.query(
      `INSERT INTO agendamentos (barbearia_id, servico_id, cliente_id, barbeiro_id, data, hora, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [barbearia_id, servico_id, cliente.id, barbeiro_id || null, data, hora, observacoes || null]
    );

    res.status(201).json({ agendamento: result.rows[0], cliente });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento por e-mail' });
  }
}

/**
 * PUT /api/agendamentos/:id
 * Atualiza agendamento (confirma/cancela)
 */
async function updateAgendamento(req, res) {
  try {
    const { id } = req.params;
    const { status, hora, data } = req.body;
    
    const result = await pool.query(
      `UPDATE agendamentos SET status=$1, data=$2, hora=$3, updated_at=NOW() 
       WHERE id=$4 RETURNING *`,
      [status, data, hora, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ agendamento: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
}

/**
 * DELETE /api/agendamentos/:id
 * Cancela agendamento
 */
async function deleteAgendamento(req, res) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE agendamentos SET status = 'cancelado', updated_at=NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento cancelado', agendamento: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
}

module.exports = { listAgendamentos, createAgendamento, createAgendamentoByEmail, updateAgendamento, deleteAgendamento };
