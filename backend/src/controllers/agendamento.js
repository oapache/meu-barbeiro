const pool = require('../config/database');
const WhatsAppService = require('../services/whatsapp');
const { ensureAgendamentoSchema } = require('../services/agendamentoSchema');
const {
  sendTextMessage,
  registrarSolicitacaoAvaliacaoPendente,
} = require('../services/botClient');
const {
  ensureBarbeariaRatingSchema,
  normalizarAvaliacaoNota,
  registrarAvaliacaoAtendimento,
} = require('../services/barbeariaRatings');
const { getBarbeariaSubscriptionAccess } = require('../services/subscriptionAccess');
const { assertBarbeariaOwner, assertAgendamentoOwner } = require('../services/ownership');

async function validarGestaoAgenda(barbeariaId) {
  const acessoAssinatura = await getBarbeariaSubscriptionAccess(barbeariaId);

  if (!acessoAssinatura) {
    return { ok: false, status: 404, error: 'Barbearia não encontrada.' };
  }

  if (!acessoAssinatura.managementUnlocked) {
    return {
      ok: false,
      status: 403,
      error: 'Assinatura inativa. A agenda está disponível apenas para consulta até a regularização do plano.',
    };
  }

  return { ok: true };
}

function normalizarServicoNome(value) {
  return String(value || '').trim();
}

function normalizarServicoPreco(value) {
  if (value === undefined || value === null || value === '') return null;

  const preco = Number(value);
  if (!Number.isFinite(preco) || preco < 0) return null;
  return Number(preco.toFixed(2));
}

async function obterSnapshotServico({
  barbeariaId,
  servicoId,
  servicoNome,
  servicoPreco,
}) {
  const nomeInformado = normalizarServicoNome(servicoNome);
  const precoInformado = normalizarServicoPreco(servicoPreco);

  if (servicoId) {
    const servicoResult = await pool.query(
      `SELECT id, nome, preco
       FROM servicos
       WHERE id = $1 AND barbearia_id = $2
       LIMIT 1`,
      [servicoId, barbeariaId]
    );

    if (servicoResult.rows.length === 0) {
      return { error: 'Serviço não encontrado para esta barbearia.' };
    }

    const servico = servicoResult.rows[0];

    return {
      servicoId: servico.id,
      servicoNomeSnapshot: normalizarServicoNome(servico.nome) || nomeInformado || 'Serviço agendado',
      servicoPrecoSnapshot: normalizarServicoPreco(servico.preco) ?? precoInformado,
    };
  }

  return {
    servicoId: null,
    servicoNomeSnapshot: nomeInformado || 'Serviço agendado',
    servicoPrecoSnapshot: precoInformado,
  };
}

async function normalizarBarbeiroUsuarioId(barbeiroId) {
  const id = String(barbeiroId || '').trim();
  if (!id) return null;

  const result = await pool.query(
    "SELECT id FROM usuarios WHERE id = $1 AND tipo = 'barbeiro' LIMIT 1",
    [id]
  );

  return result.rows[0]?.id || null;
}

async function montarPayloadWhatsAppAgendamento({
  barbearia_id,
  servico_id,
  servico_nome,
  cliente_id,
  barbeiro_id,
  data,
  hora,
}) {
  const resultadoVazio = { cliente: null, barbearia: null };

  const [clienteResult, barbeariaResult, servicoResult, barbeiroResult] = await Promise.all([
    cliente_id
      ? pool.query('SELECT id, nome, telefone FROM usuarios WHERE id = $1 LIMIT 1', [cliente_id])
      : Promise.resolve({ rows: [] }),
    barbearia_id
      ? pool.query('SELECT nome, endereco, whatsapp_link, telefone FROM barbearias WHERE id = $1 LIMIT 1', [barbearia_id])
      : Promise.resolve({ rows: [] }),
    servico_id
      ? pool.query('SELECT id, nome FROM servicos WHERE id = $1 LIMIT 1', [servico_id])
      : Promise.resolve({ rows: [] }),
    barbeiro_id
      ? pool.query('SELECT id, nome FROM usuarios WHERE id = $1 LIMIT 1', [barbeiro_id])
      : Promise.resolve({ rows: [] }),
  ]);

  const cliente = clienteResult.rows[0];
  const barbearia = barbeariaResult.rows[0];

  if (!cliente || !barbearia) {
    return resultadoVazio;
  }

  const servico = servicoResult.rows[0];
  const barbeiro = barbeiroResult.rows[0];

  return WhatsAppService.gerarPayloadAgendamento({
    nomeCliente: cliente.nome,
    telefoneCliente: cliente.telefone,
    servico: servico?.nome || normalizarServicoNome(servico_nome) || 'Serviço agendado',
    data,
    hora,
    nomeBarbearia: barbearia.nome,
    enderecoBarbearia: barbearia.endereco,
    telefoneBarbearia: barbearia.whatsapp_link || barbearia.telefone,
    barbeiroNome: barbeiro?.nome || '',
  });
}

async function enviarConfirmacaoAutomaticaAgendamento(barbeariaId, whatsappPayload) {
  if (!whatsappPayload?.cliente?.telefone || !whatsappPayload?.cliente?.mensagem) {
    return {
      sent: false,
      reason: 'NO_CLIENT_WHATSAPP',
      error: 'Cliente sem telefone valido para automacao do WhatsApp.',
    };
  }

  return sendTextMessage({
    barbeariaId,
    phoneNumber: whatsappPayload.cliente.telefone,
    message: whatsappPayload.cliente.mensagem,
  });
}

async function enviarConfirmacaoAutomaticaAgendamentoSeguro(barbeariaId, whatsappPayload) {
  try {
    return await enviarConfirmacaoAutomaticaAgendamento(barbeariaId, whatsappPayload);
  } catch (error) {
    console.warn('[AGENDAMENTO.whatsapp] Falha ao enviar confirmacao automatica', {
      barbeariaId,
      message: error?.message,
      status: error?.status,
    });

    return {
      sent: false,
      reason: 'BOT_CONFIRMATION_FAILED',
      error: error?.message || 'Nao foi possivel enviar a confirmacao automatica pelo WhatsApp.',
    };
  }
}

async function enviarSolicitacaoAvaliacaoConclusao({
  barbeariaId,
  phoneNumber,
  nomeCliente,
  nomeBarbearia,
  servicoNome,
  data,
  hora,
  agendamentoId,
}) {
  const telefone = String(phoneNumber || '').trim();

  if (!telefone || !WhatsAppService.validarTelefone(telefone)) {
    return {
      attempted: false,
      sent: false,
      reason: 'INVALID_PHONE',
      error: 'Cliente sem telefone válido para solicitar a avaliação no WhatsApp.',
    };
  }

  const mensagem = WhatsAppService.templateSolicitarAvaliacaoCliente({
    nomeCliente,
    servico: servicoNome,
    nomeBarbearia,
    data,
    hora,
  });

  const envio = await sendTextMessage({
    barbeariaId,
    phoneNumber: telefone,
    message: mensagem,
  });

  if (envio.sent) {
    await registrarSolicitacaoAvaliacaoPendente({
      barbeariaId,
      phoneNumber: telefone,
      contactName: nomeCliente,
      agendamentoId,
      servicoNome,
      dataISO: data,
      hora,
      outboundMessage: mensagem,
    });
  }

  return {
    attempted: true,
    ...envio,
  };
}

async function listDisponibilidadePublica(req, res) {
  try {
    await ensureAgendamentoSchema();

    const barbeariaId = String(req.query?.barbearia_id || req.query?.barbeariaId || '').trim();
    const data = String(req.query?.data || '').trim();

    if (!barbeariaId || !data) {
      return res.status(400).json({ error: 'Barbearia e data sao obrigatorias para consultar a disponibilidade.' });
    }

    const result = await pool.query(
      `SELECT a.hora
       FROM agendamentos a
       WHERE a.barbearia_id = $1
         AND a.data = $2
         AND a.status NOT IN ('cancelado', 'faltou')
       ORDER BY a.hora`,
      [barbeariaId, data]
    );

    const horariosOcupados = result.rows
      .map((item) => String(item.hora || '').slice(0, 5))
      .filter(Boolean);

    res.json({ horarios_ocupados: horariosOcupados });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao consultar disponibilidade' });
  }
}

/**
 * GET /api/agendamentos
 * Lista agendamentos (com filtros)
 */
async function listAgendamentos(req, res) {
  try {
    await ensureAgendamentoSchema();

    const { barbearia_id, cliente_id, data, status } = req.query;
    const authUserId = String(req.auth?.id || '').trim();

    if (!authUserId) {
      return res.status(401).json({ error: 'Autenticacao necessaria para consultar agendamentos.' });
    }

    const barbeariaId = String(barbearia_id || '').trim();
    const clienteId = String(cliente_id || '').trim();

    if (barbeariaId) {
      await assertBarbeariaOwner(authUserId, barbeariaId);
    } else if (clienteId) {
      if (clienteId !== authUserId) {
        return res.status(403).json({ error: 'Voce so pode consultar os seus proprios agendamentos.' });
      }
    } else {
      return res.status(400).json({ error: 'Informe uma barbearia ou um cliente para consultar a agenda.' });
    }
    
    let query = `
      SELECT
        a.*,
        b.nome AS barbearia_nome,
        COALESCE(c.nome, a.cliente_nome_externo, 'Cliente') AS cliente_nome,
        COALESCE(c.telefone, a.cliente_telefone_externo, '') AS cliente_telefone,
        COALESCE(a.servico_nome_snapshot, s.nome, NULLIF(a.observacoes, '')) AS servico_nome,
        COALESCE(a.servico_preco_snapshot, s.preco) AS servico_preco,
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
      params.push(barbeariaId);
      paramCount++;
    }
    
    if (clienteId) {
      query += ` AND a.cliente_id = $${paramCount}`;
      params.push(clienteId);
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
    const statusCode = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(statusCode).json({ error: error?.message || 'Erro ao listar agendamentos' });
  }
}

/**
 * POST /api/agendamentos
 * Cria novo agendamento
 */
async function createAgendamento(req, res) {
  try {
    await ensureAgendamentoSchema();

    const {
      barbearia_id,
      servico_id,
      servico_nome,
      servico_preco,
      barbeiro_id,
      data,
      hora,
      observacoes,
      origem,
    } = req.body;
    const clienteId = String(req.auth?.id || '').trim();
    
    if (!barbearia_id || !data || !hora) {
      return res.status(400).json({ error: 'Barbearia, data e hora são obrigatórios' });
    }

    if (!clienteId) {
      return res.status(401).json({ error: 'Autenticacao necessaria para agendar.' });
    }

    const validacaoGestao = await validarGestaoAgenda(barbearia_id);
    if (!validacaoGestao.ok) {
      return res.status(validacaoGestao.status).json({ error: validacaoGestao.error });
    }
    
    // Verificar se horário está disponível
    const conflito = await pool.query(
      'SELECT id FROM agendamentos WHERE barbearia_id = $1 AND data = $2 AND hora = $3 AND status != $4',
      [barbearia_id, data, hora, 'cancelado']
    );
    
    if (conflito.rows.length > 0) {
      return res.status(400).json({ error: 'Horário não disponível' });
    }

    const snapshotServico = await obterSnapshotServico({
      barbeariaId: barbearia_id,
      servicoId: servico_id,
      servicoNome: servico_nome,
      servicoPreco: servico_preco,
    });

    if (snapshotServico.error) {
      return res.status(400).json({ error: snapshotServico.error });
    }

    const barbeiroUsuarioId = await normalizarBarbeiroUsuarioId(barbeiro_id);
    
    const result = await pool.query(
      `INSERT INTO agendamentos (
         barbearia_id,
         servico_id,
         servico_nome_snapshot,
         servico_preco_snapshot,
         cliente_id,
         barbeiro_id,
         data,
         hora,
         observacoes,
         origem
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        barbearia_id,
        snapshotServico.servicoId,
        snapshotServico.servicoNomeSnapshot,
        snapshotServico.servicoPrecoSnapshot,
        clienteId,
        barbeiroUsuarioId,
        data,
        hora,
        observacoes || null,
        origem || 'app',
      ]
    );
    
    const whatsapp = await montarPayloadWhatsAppAgendamento({
      barbearia_id,
      servico_id: snapshotServico.servicoId,
      servico_nome: snapshotServico.servicoNomeSnapshot,
      cliente_id: clienteId,
      barbeiro_id: barbeiroUsuarioId,
      data,
      hora,
    });
    const whatsappAutomation = await enviarConfirmacaoAutomaticaAgendamentoSeguro(barbearia_id, whatsapp);

    res.status(201).json({
      agendamento: result.rows[0],
      whatsapp,
      whatsappAutomation,
      whatsappLink: whatsapp?.barbearia?.link || null,
    });
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
    await ensureAgendamentoSchema();

    const {
      barbearia_id,
      servico_id,
      servico_nome,
      servico_preco,
      cliente_email,
      barbeiro_id,
      data,
      hora,
      observacoes,
      origem,
    } = req.body;

    if (!barbearia_id || !servico_id || !cliente_email || !data || !hora) {
      return res.status(400).json({ error: 'Barbearia, serviço, email, data e hora são obrigatórios' });
    }

    await assertBarbeariaOwner(req.auth?.id, barbearia_id);

    const validacaoGestao = await validarGestaoAgenda(barbearia_id);
    if (!validacaoGestao.ok) {
      return res.status(validacaoGestao.status).json({ error: validacaoGestao.error });
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

    const snapshotServico = await obterSnapshotServico({
      barbeariaId: barbearia_id,
      servicoId: servico_id,
      servicoNome: servico_nome,
      servicoPreco: servico_preco,
    });

    if (snapshotServico.error) {
      return res.status(400).json({ error: snapshotServico.error });
    }

    const barbeiroUsuarioId = await normalizarBarbeiroUsuarioId(barbeiro_id);

    const result = await pool.query(
      `INSERT INTO agendamentos (
         barbearia_id,
         servico_id,
         servico_nome_snapshot,
         servico_preco_snapshot,
         cliente_id,
         barbeiro_id,
         data,
         hora,
         observacoes,
         origem
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        barbearia_id,
        snapshotServico.servicoId,
        snapshotServico.servicoNomeSnapshot,
        snapshotServico.servicoPrecoSnapshot,
        cliente.id,
        barbeiroUsuarioId,
        data,
        hora,
        observacoes || null,
        origem || 'painel',
      ]
    );

    const whatsapp = await montarPayloadWhatsAppAgendamento({
      barbearia_id,
      servico_id: snapshotServico.servicoId,
      servico_nome: snapshotServico.servicoNomeSnapshot,
      cliente_id: cliente.id,
      barbeiro_id: barbeiroUsuarioId,
      data,
      hora,
    });
    const whatsappAutomation = await enviarConfirmacaoAutomaticaAgendamentoSeguro(barbearia_id, whatsapp);

    res.status(201).json({
      agendamento: result.rows[0],
      cliente,
      whatsapp,
      whatsappAutomation,
      whatsappLink: whatsapp?.barbearia?.link || null,
    });
  } catch (error) {
    console.error('Erro:', error);
    const statusCode = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(statusCode).json({ error: error?.message || 'Erro ao criar agendamento por e-mail' });
  }
}

/**
 * PUT /api/agendamentos/:id
 * Atualiza agendamento (confirma/cancela)
 */
async function updateAgendamento(req, res) {
  let client;

  try {
    await ensureAgendamentoSchema();
    await ensureBarbeariaRatingSchema();

    const { id } = req.params;
    const { status, hora, data, avaliacao_nota, avaliacao_comentario } = req.body;
    await assertAgendamentoOwner(req.auth?.id, id);

    client = await pool.connect();
    await client.query('BEGIN');

    const atualResult = await client.query(
      `SELECT
         a.id,
         a.status,
         a.data,
         a.hora,
         a.barbearia_id,
         a.avaliacao_nota,
         a.avaliacao_comentario,
         a.avaliacao_registrada_em,
         COALESCE(c.nome, a.cliente_nome_externo, 'Cliente') AS cliente_nome,
         COALESCE(c.telefone, a.cliente_telefone_externo, '') AS cliente_telefone,
         COALESCE(a.servico_nome_snapshot, s.nome, NULLIF(a.observacoes, '')) AS servico_nome,
         COALESCE(b.nome, '') AS barbearia_nome
       FROM agendamentos a
       LEFT JOIN usuarios c ON c.id = a.cliente_id
       LEFT JOIN servicos s ON s.id = a.servico_id
       LEFT JOIN barbearias b ON b.id = a.barbearia_id
       WHERE a.id = $1
       LIMIT 1`,
      [id]
    );

    if (atualResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const atual = atualResult.rows[0];
    const validacaoGestao = await validarGestaoAgenda(atual.barbearia_id);
    if (!validacaoGestao.ok) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(validacaoGestao.status).json({ error: validacaoGestao.error });
    }

    const statusFinal = status === undefined || status === null || status === ''
      ? atual.status
      : String(status).trim().toLowerCase();
    const dataFinal = data === undefined || data === null || data === ''
      ? atual.data
      : String(data).trim();
    const horaFinal = hora === undefined || hora === null || hora === ''
      ? atual.hora
      : String(hora).trim();

    const statusValido = ['pendente', 'confirmado', 'cancelado', 'em_atendimento', 'concluido', 'faltou'].includes(statusFinal);
    if (!statusValido) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(400).json({ error: 'Status inválido' });
    }

    if (!dataFinal || !horaFinal) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(400).json({ error: 'Data e hora são obrigatórias' });
    }

    const notaInformada = avaliacao_nota !== undefined && avaliacao_nota !== null && avaliacao_nota !== '';
    const comentarioFinal = avaliacao_comentario === undefined || avaliacao_comentario === null
      ? String(atual.avaliacao_comentario || '').trim()
      : String(avaliacao_comentario || '').trim();

    let notaFinal = notaInformada
      ? normalizarAvaliacaoNota(avaliacao_nota)
      : normalizarAvaliacaoNota(atual.avaliacao_nota);

    if (notaInformada && notaFinal === null) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(400).json({ error: 'A nota da avaliação deve estar entre 1 e 5.' });
    }

    if (notaInformada && statusFinal !== 'concluido' && atual.status !== 'concluido') {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      return res.status(400).json({ error: 'A avaliação só pode ser registrada quando o atendimento for concluído.' });
    }

    const avaliacaoRegistradaEmFinal = notaFinal
      ? (atual.avaliacao_registrada_em || new Date().toISOString())
      : null;

    const alterouHorario = dataFinal !== atual.data || horaFinal !== atual.hora;
    if (alterouHorario) {
      const conflito = await client.query(
        `SELECT id
         FROM agendamentos
         WHERE barbearia_id = $1
           AND data = $2
           AND hora = $3
           AND status != $4
           AND id <> $5
         LIMIT 1`,
        [atual.barbearia_id, dataFinal, horaFinal, 'cancelado', id]
      );

      if (conflito.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        client = null;
        return res.status(400).json({ error: 'Horário não disponível' });
      }
    }

    const result = await client.query(
      `UPDATE agendamentos
       SET status = $1,
           data = $2,
           hora = $3,
           avaliacao_nota = $4,
           avaliacao_comentario = $5,
           avaliacao_registrada_em = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        statusFinal,
        dataFinal,
        horaFinal,
        notaFinal,
        comentarioFinal || null,
        avaliacaoRegistradaEmFinal,
        id,
      ]
    );

    const deveSolicitarAvaliacao = statusFinal === 'concluido' && atual.status !== 'concluido' && !notaFinal;

    let rating = null;
    if (statusFinal === 'concluido' && notaFinal) {
      rating = await registrarAvaliacaoAtendimento({
        barbeariaId: atual.barbearia_id,
        agendamentoId: id,
        autor: atual.cliente_nome,
        nota: notaFinal,
        comentario: comentarioFinal,
        data: dataFinal,
      }, client);
    }

    await client.query('COMMIT');
    client.release();
    client = null;

    let reviewRequest = null;
    if (deveSolicitarAvaliacao) {
      try {
        reviewRequest = await enviarSolicitacaoAvaliacaoConclusao({
          barbeariaId: atual.barbearia_id,
          phoneNumber: atual.cliente_telefone,
          nomeCliente: atual.cliente_nome,
          nomeBarbearia: atual.barbearia_nome,
          servicoNome: atual.servico_nome || 'Serviço',
          data: dataFinal,
          hora: horaFinal,
          agendamentoId: id,
        });
      } catch (reviewError) {
        console.error('Falha ao solicitar avaliação pós-atendimento:', reviewError);
        reviewRequest = {
          attempted: true,
          sent: false,
          reason: 'REVIEW_REQUEST_FAILED',
          error: reviewError?.message || 'Não foi possível solicitar a avaliação pelo WhatsApp.',
        };
      }
    }

    res.json({ agendamento: result.rows[0], rating, reviewRequest });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erro ao desfazer transação de agendamento:', rollbackError);
      }
      client.release();
    }
    console.error('Erro:', error);
    const statusCode = error?.code === 'AGENDAMENTO_FORBIDDEN' ? 403 : 500;
    res.status(statusCode).json({ error: error?.message || 'Erro ao atualizar agendamento' });
  }
}

/**
 * DELETE /api/agendamentos/:id
 * Cancela agendamento
 */
async function deleteAgendamento(req, res) {
  try {
    await ensureAgendamentoSchema();

    const { id } = req.params;
    await assertAgendamentoOwner(req.auth?.id, id);
    const atualResult = await pool.query(
      'SELECT id, barbearia_id FROM agendamentos WHERE id = $1 LIMIT 1',
      [id]
    );

    if (atualResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const validacaoGestao = await validarGestaoAgenda(atualResult.rows[0].barbearia_id);
    if (!validacaoGestao.ok) {
      return res.status(validacaoGestao.status).json({ error: validacaoGestao.error });
    }
    
    const result = await pool.query(
      "UPDATE agendamentos SET status = 'cancelado', updated_at=NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    res.json({ message: 'Agendamento cancelado', agendamento: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'AGENDAMENTO_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao cancelar agendamento' });
  }
}

module.exports = { listDisponibilidadePublica, listAgendamentos, createAgendamento, createAgendamentoByEmail, updateAgendamento, deleteAgendamento };
