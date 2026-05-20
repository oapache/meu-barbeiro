const pool = require('../config/database');
const WhatsAppService = require('./whatsapp');
const { ensureAgendamentoSchema } = require('./agendamentoSchema');
const { registrarAvaliacaoAtendimento, normalizarAvaliacaoNota } = require('./barbeariaRatings');
const {
  markAppointmentBackendSyncStatus,
  syncAppointmentToBackend,
} = require('./backendAppointments');
const {
  ensureChatbotTrainingSchema,
  getChatbotOperationalSettings,
  ensureChatbotSession,
  updateChatbotSessionState,
  logChatbotTurn,
} = require('./chatbotTraining');

const CHATBOT_SITE_URL = process.env.CHATBOT_SITE_URL || 'https://ocortecerto.com';
const DAY_KEY_BY_INDEX = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const WEEKDAY_ALIASES = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  'segunda-feira': 1,
  seg: 1,
  terca: 2,
  'terca-feira': 2,
  ter: 2,
  quarta: 3,
  'quarta-feira': 3,
  qua: 3,
  quinta: 4,
  'quinta-feira': 4,
  qui: 4,
  sexta: 5,
  'sexta-feira': 5,
  sex: 5,
  sabado: 6,
  sab: 6,
};
const RESET_KEYWORDS = ['agendar', 'menu', 'reiniciar', 'recomecar', 'recomecar', 'novo horario', 'novo agendamento'];
const CANCEL_KEYWORDS = ['cancelar', 'parar', 'sair'];
const HUMAN_HELP_KEYWORDS = ['atendente', 'humano', 'equipe', 'manual'];
const CONFIRM_KEYWORDS = ['1', 'sim', 'confirmar', 'confirmo', 'ok', 'fechar'];
const CHANGE_KEYWORDS = ['2', 'trocar', 'alterar', 'outro horario', 'outro', 'mudar'];
const PRICE_KEYWORDS = ['preco', 'valor', 'quanto', 'custa'];
const AVAILABILITY_KEYWORDS = ['horario', 'horarios', 'agenda', 'disponivel', 'disponiveis', 'vaga', 'vagas'];

let ensureConversationSchemaPromise = null;

function normalizarTexto(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function capitalizarNome(valor = '') {
  return String(valor || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(' ');
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

function formatarDataCurtaBR(dataISO = '') {
  const match = String(dataISO || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(dataISO || '');
  return `${match[3]}/${match[2]}`;
}

function formatarDuracao(duracaoMinutos) {
  const total = Number(duracaoMinutos || 0);
  if (!total || total <= 0) return '30 min';

  const horas = Math.floor(total / 60);
  const minutos = total % 60;

  if (horas > 0 && minutos > 0) {
    return `${horas}h ${minutos}min`;
  }

  if (horas > 0) {
    return `${horas}h`;
  }

  return `${minutos} min`;
}

function horaParaMinutos(hora = '') {
  const [horas, minutos] = String(hora || '').slice(0, 5).split(':').map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;
  return horas * 60 + minutos;
}

function minutosParaHora(totalMinutos) {
  const horas = String(Math.floor(totalMinutos / 60)).padStart(2, '0');
  const minutos = String(totalMinutos % 60).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function normalizarHora(valor, fallback = '') {
  const texto = String(valor || '').trim().slice(0, 5);
  return /^\d{2}:\d{2}$/.test(texto) ? texto : fallback;
}

function gerarHorariosIntervalo(inicio, fim, intervaloMinutos = 30) {
  const inicioMin = horaParaMinutos(inicio);
  const fimMin = horaParaMinutos(fim);

  if (inicioMin === null || fimMin === null || fimMin <= inicioMin) {
    return [];
  }

  const horarios = [];
  for (let atual = inicioMin; atual <= fimMin; atual += intervaloMinutos) {
    horarios.push(minutosParaHora(atual));
  }

  return horarios;
}

function obterFaixaDoDia(dataISO, horariosSemana, aberturaPadrao, fechamentoPadrao) {
  if (!dataISO) return { abertura: aberturaPadrao, fechamento: fechamentoPadrao };

  const data = new Date(`${dataISO}T12:00:00`);
  const keyDia = DAY_KEY_BY_INDEX[data.getDay()];
  const itemDia = Array.isArray(horariosSemana)
    ? horariosSemana.find((item) => String(item?.key || '') === keyDia)
    : null;

  if (!itemDia) {
    return { abertura: aberturaPadrao, fechamento: fechamentoPadrao };
  }

  if (itemDia.fechado) {
    return null;
  }

  return {
    abertura: normalizarHora(itemDia.abertura, aberturaPadrao),
    fechamento: normalizarHora(itemDia.fechamento, fechamentoPadrao),
  };
}

function parseDateInput(texto, referencia = new Date()) {
  const normalizado = normalizarTexto(texto);
  const hoje = new Date(referencia);
  hoje.setHours(0, 0, 0, 0);

  if (normalizado === '1' || /\bhoje\b/.test(normalizado)) {
    return formatarDataISO(hoje);
  }

  if (normalizado === '2' || /\bamanha\b/.test(normalizado)) {
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    return formatarDataISO(amanha);
  }

  const weekdayIndex = Object.entries(WEEKDAY_ALIASES)
    .find(([alias]) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(normalizado))?.[1];
  if (weekdayIndex !== undefined) {
    const data = new Date(hoje);
    const deslocamento = (weekdayIndex - hoje.getDay() + 7) % 7 || 7;
    data.setDate(hoje.getDate() + deslocamento);
    return formatarDataISO(data);
  }

  const match = String(texto || '').trim().match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!match) return '';

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const anoInformado = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : hoje.getFullYear();

  if (!dia || !mes || !anoInformado) return '';

  const data = new Date(anoInformado, mes - 1, dia);
  data.setHours(0, 0, 0, 0);

  if (Number.isNaN(data.getTime()) || data.getDate() !== dia || data.getMonth() !== mes - 1) {
    return '';
  }

  if (data < hoje && !match[3]) {
    data.setFullYear(data.getFullYear() + 1);
  }

  return formatarDataISO(data);
}

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseOptionSelection(texto, opcoes) {
  const valor = String(texto || '').trim();
  const normalizado = normalizarTexto(valor);

  if (!valor || !Array.isArray(opcoes) || opcoes.length === 0) return null;

  const comoNumero = Number(valor);
  if (Number.isInteger(comoNumero) && comoNumero >= 1 && comoNumero <= opcoes.length) {
    return opcoes[comoNumero - 1];
  }

  return opcoes.find((opcao) => {
    const nomeOpcao = normalizarTexto(opcao?.label || opcao?.nome || opcao?.hora || '');
    return normalizado === nomeOpcao || nomeOpcao.includes(normalizado) || normalizado.includes(nomeOpcao);
  }) || null;
}

function parseReviewScore(texto) {
  const valor = String(texto || '').trim();
  if (!valor) return null;

  const direto = normalizarAvaliacaoNota(valor);
  if (direto) return direto;

  const match = valor.match(/\b([1-5])\b/);
  return match ? normalizarAvaliacaoNota(match[1]) : null;
}

function parsePeriodOfDay(texto) {
  const normalizado = normalizarTexto(texto);

  if (!normalizado) return '';
  if (normalizado.includes('manha') || normalizado.includes('de manha')) return 'manha';
  if (normalizado.includes('tarde')) return 'tarde';
  if (normalizado.includes('noite') || normalizado.includes('a noite')) return 'noite';
  if (normalizado.includes('depois das 18') || normalizado.includes('apos as 18')) return 'noite';

  return '';
}

function parseTimeInput(texto) {
  const normalizado = normalizarTexto(texto);
  if (normalizado.includes('depois das 18') || normalizado.includes('apos as 18')) {
    return '18:00';
  }

  const match = String(texto || '').match(/\b([01]?\d|2[0-3])(?::?([0-5]\d))\b/);
  if (!match) return '';

  const horas = String(Number(match[1])).padStart(2, '0');
  const minutos = String(match[2] || '00').padStart(2, '0');
  return `${horas}:${minutos}`;
}

function filtrarHorariosPorPeriodo(horarios = [], periodo = '') {
  if (!periodo) return Array.isArray(horarios) ? horarios : [];

  const intervalos = {
    manha: [0, 11 * 60 + 59],
    tarde: [12 * 60, 17 * 60 + 59],
    noite: [18 * 60, 23 * 60 + 59],
  };

  const faixa = intervalos[periodo];
  if (!faixa) return Array.isArray(horarios) ? horarios : [];

  return (Array.isArray(horarios) ? horarios : []).filter((hora) => {
    const minutos = horaParaMinutos(hora);
    return minutos !== null && minutos >= faixa[0] && minutos <= faixa[1];
  });
}

function findServiceByText(servicos = [], texto = '') {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return null;

  const tokenizar = (value = '') =>
    normalizarTexto(value)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 2);

  const textoTokens = new Set(tokenizar(normalizado));
  const candidatos = (Array.isArray(servicos) ? servicos : [])
    .map((servico) => {
      const nome = normalizarTexto(servico?.nome || servico?.label || '');
      if (!nome) return null;

      const matchExato = normalizado === nome;
      const incluiTexto = nome.includes(normalizado);
      const incluiServico = normalizado.includes(nome);
      const nomeTokens = tokenizar(nome);
      const matchedTokens = nomeTokens.filter((token) => textoTokens.has(token));
      const allTokensPresent = nomeTokens.length > 0 && matchedTokens.length === nomeTokens.length;

      if (!matchExato && !incluiTexto && !incluiServico && matchedTokens.length === 0) {
        return null;
      }

      let score = 0;
      if (matchExato) score += 1000;
      if (allTokensPresent) score += 500 + nomeTokens.length * 10;
      if (incluiServico) score += 300 + nome.length;
      if (incluiTexto) score += 150 + nome.length;
      score += matchedTokens.length * 25;

      return {
        servico,
        nome,
        score,
        matchedTokenCount: matchedTokens.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.matchedTokenCount !== a.matchedTokenCount) return b.matchedTokenCount - a.matchedTokenCount;
      if (b.score !== a.score) return b.score - a.score;
      return b.nome.length - a.nome.length;
    });

  return candidatos[0]?.servico || null;
}

function mergeCanonicalSlots(payload = {}, analysis = {}, servicoEncontrado = null) {
  const slots = analysis?.slots || {};
  const proximoPayload = {
    ...(payload || {}),
    lastIntent: analysis?.globalIntent || 'unknown',
    confidence: Number(analysis?.confidence || 0),
    candidates: Array.isArray(analysis?.candidates) ? analysis.candidates : [],
  };

  if (servicoEncontrado) {
    proximoPayload.desiredServiceId = servicoEncontrado.id;
    proximoPayload.desiredServiceName = servicoEncontrado.nome;
    proximoPayload.servicoId = servicoEncontrado.id;
    proximoPayload.servicoNome = servicoEncontrado.nome;
    proximoPayload.servicoDuracao = servicoEncontrado.duracao;
    proximoPayload.servicoPreco = servicoEncontrado.preco;
  }

  if (slots.desiredDate) {
    proximoPayload.desiredDate = slots.desiredDate;
  }

  if (slots.desiredTime) {
    proximoPayload.desiredTime = slots.desiredTime;
  }

  if (slots.desiredPeriod) {
    proximoPayload.desiredPeriod = slots.desiredPeriod;
  }

  if (slots.preferredBarber) {
    proximoPayload.preferredBarber = slots.preferredBarber;
  }

  return proximoPayload;
}

function analyzeInboundMessage({ text, stage, payload, services }) {
  const texto = String(text || '').trim();
  const normalizado = normalizarTexto(texto);
  const servicos = Array.isArray(services) ? services : [];
  const servicoEncontrado = findServiceByText(servicos, texto);
  const desiredDate = parseDateInput(texto);
  const desiredTime = parseTimeInput(texto);
  const desiredPeriod = parsePeriodOfDay(texto);
  const reviewScore = parseReviewScore(texto);

  let globalIntent = 'unknown';

  if (!normalizado) {
    globalIntent = 'unknown';
  } else if (HUMAN_HELP_KEYWORDS.includes(normalizado)) {
    globalIntent = 'handoff';
  } else if (CANCEL_KEYWORDS.includes(normalizado)) {
    globalIntent = 'cancel_flow';
  } else if (RESET_KEYWORDS.includes(normalizado)) {
    globalIntent = 'restart_flow';
  } else if (stage === 'awaiting_review' && reviewScore) {
    globalIntent = 'review_score';
  } else if (CONFIRM_KEYWORDS.includes(normalizado)) {
    globalIntent = 'confirm';
  } else if (PRICE_KEYWORDS.some((item) => normalizado.includes(item))) {
    globalIntent = 'ask_price';
  } else if (servicoEncontrado && stage !== 'awaiting_name') {
    globalIntent = 'change_service';
  } else if (desiredTime && String(payload?.selectedDate || payload?.desiredDate || '').trim()) {
    globalIntent = 'change_time';
  } else if (desiredDate && String(payload?.servicoId || payload?.desiredServiceId || '').trim()) {
    globalIntent = 'change_date';
  } else if ((desiredDate || desiredPeriod) && AVAILABILITY_KEYWORDS.some((item) => normalizado.includes(item))) {
    globalIntent = 'ask_available_times';
  } else if (desiredDate) {
    globalIntent = 'book';
  }

  if (stage === 'awaiting_service' && servicoEncontrado) {
    globalIntent = 'book';
  }

  return {
    globalIntent,
    confidence: servicoEncontrado || desiredDate || desiredTime || reviewScore ? 0.88 : 0.45,
    repairHint: globalIntent === 'unknown' ? 'ask_clarification' : undefined,
    candidates: servicoEncontrado ? [servicoEncontrado.nome] : [],
    slots: {
      desiredServiceId: servicoEncontrado?.id,
      desiredServiceName: servicoEncontrado?.nome,
      desiredDate,
      desiredPeriod,
      desiredTime,
      preferredBarber: '',
      reviewScore: reviewScore || undefined,
    },
  };
}

async function ensureConversationSchema() {
  if (!ensureConversationSchemaPromise) {
    ensureConversationSchemaPromise = (async () => {
      await ensureAgendamentoSchema();
      await ensureChatbotTrainingSchema();
      await pool.query(`
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
    })().catch((error) => {
      ensureConversationSchemaPromise = null;
      throw error;
    });
  }

  return ensureConversationSchemaPromise;
}

async function getBarbearia(barbeariaId) {
  const result = await pool.query(
    `SELECT id, nome, endereco, telefone, whatsapp_link, horario_abertura, horario_fechamento, horarios_semana
     FROM barbearias
     WHERE id = $1
     LIMIT 1`,
    [barbeariaId]
  );

  return result.rows[0] || null;
}

function montarMensagemAtendimentoHumano(barbearia) {
  const telefone = String(barbearia?.telefone || '').trim();
  const telefoneFormatado = telefone ? WhatsAppService.formatarTelefone(telefone) : '';
  const linkWhatsApp = String(barbearia?.whatsapp_link || '').trim();

  const canais = [];
  if (telefoneFormatado) {
    canais.push(`Telefone: ${telefoneFormatado}`);
  }
  if (linkWhatsApp) {
    canais.push(`WhatsApp: ${linkWhatsApp}`);
  }

  const detalhesCanais = canais.length > 0
    ? `\n\n*Contato da equipe*\n${canais.join('\n')}`
    : '';

  return `Perfeito. Vou encerrar o agendamento automático para você seguir com atendimento manual.${detalhesCanais}\n\nSe quiser retomar o agendamento automático depois, é só enviar *agendar*.`;
}

function montarMensagemAvaliacaoRecebida({ nomeBarbearia, nota }) {
  return `Obrigado pela sua avaliação! Registramos sua nota *${nota}/5* para a *${nomeBarbearia || 'barbearia'}*.\n\nSe quiser agendar novamente no futuro, é só responder *agendar*.`;
}

async function registrarAvaliacaoWhatsApp({
  barbeariaId,
  agendamentoId,
  phoneNumber,
  contactName,
  nota,
}) {
  await ensureAgendamentoSchema();

  const agendamentoResult = await pool.query(
    `SELECT
       a.id,
       a.status,
       a.data,
       a.barbearia_id,
       a.avaliacao_comentario,
       COALESCE(a.cliente_telefone_externo, '') AS cliente_telefone_externo,
       COALESCE(u.telefone, '') AS cliente_telefone_cadastrado,
       COALESCE(a.servico_nome_snapshot, s.nome, NULLIF(a.observacoes, '')) AS servico_nome
     FROM agendamentos a
     LEFT JOIN usuarios u ON u.id = a.cliente_id
     LEFT JOIN servicos s ON s.id = a.servico_id
     WHERE a.id = $1
       AND a.barbearia_id = $2
     LIMIT 1`,
    [agendamentoId, barbeariaId]
  );

  const agendamento = agendamentoResult.rows[0];
  if (!agendamento) {
    return { ok: false, error: 'Não encontrei o atendimento relacionado a esta avaliação.' };
  }

  const telefoneRecebido = WhatsAppService.limparTelefone(phoneNumber);
  const telefonesValidos = [
    agendamento.cliente_telefone_externo,
    agendamento.cliente_telefone_cadastrado,
  ]
    .map((item) => WhatsAppService.limparTelefone(item))
    .filter(Boolean)
    .flatMap((item) => {
      const variantes = new Set([item]);
      if (item.startsWith('55')) {
        variantes.add(item.slice(2));
      } else {
        variantes.add(`55${item}`);
      }
      return Array.from(variantes);
    });

  if (!telefoneRecebido || !telefonesValidos.includes(telefoneRecebido)) {
    return { ok: false, error: 'Não consegui validar o telefone desta avaliação.' };
  }

  if (String(agendamento.status || '') !== 'concluido') {
    return { ok: false, error: 'Este atendimento ainda não está concluído para receber uma avaliação.' };
  }

  const notaFinal = normalizarAvaliacaoNota(nota);
  if (!notaFinal) {
    return { ok: false, error: 'Envie uma nota válida de 1 a 5.' };
  }

  const autor = capitalizarNome(contactName || '') || 'Cliente';

  const atualizadoResult = await pool.query(
    `UPDATE agendamentos
     SET avaliacao_nota = $1,
         avaliacao_registrada_em = COALESCE(avaliacao_registrada_em, NOW()),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [notaFinal, agendamentoId]
  );

  const rating = await registrarAvaliacaoAtendimento({
    barbeariaId,
    agendamentoId,
    autor,
    nota: notaFinal,
    comentario: agendamento.avaliacao_comentario,
    data: agendamento.data,
  });

  return {
    ok: true,
    nota: notaFinal,
    servicoNome: String(agendamento.servico_nome || 'Serviço'),
    agendamento: atualizadoResult.rows[0] || null,
    rating,
  };
}

async function registrarSolicitacaoAvaliacaoPendente({
  barbeariaId,
  phoneNumber,
  contactName,
  agendamentoId,
  servicoNome,
  dataISO,
  hora,
  outboundMessage,
}) {
  const telefone = WhatsAppService.limparTelefone(phoneNumber);
  if (!telefone) {
    throw new Error('Telefone inválido para registrar a solicitação de avaliação.');
  }

  const session = await ensureChatbotSession({
    barbeariaId,
    phoneNumber: telefone,
    contactName: capitalizarNome(contactName || ''),
    entryIntent: 'review_score',
    currentStage: 'awaiting_review',
    forceNew: true,
  }).catch(() => null);

  const conversation = await saveConversation(barbeariaId, telefone, {
    contactName: capitalizarNome(contactName || ''),
    stage: 'awaiting_review',
    replacePayload: true,
    payload: {
      reviewAgendamentoId: String(agendamentoId || ''),
      reviewServicoNome: String(servicoNome || ''),
      reviewData: String(dataISO || ''),
      reviewHora: String(hora || ''),
    },
    status: 'active',
    lastOutboundMessage: String(outboundMessage || '').trim(),
  });

  await updateChatbotSessionState({
    sessionId: session?.id,
    currentStage: 'awaiting_review',
    status: 'active',
    agendamentoId: agendamentoId || null,
  }).catch(() => undefined);

  await logChatbotTurn({
    sessionId: session?.id,
    direction: 'outbound',
    text: outboundMessage,
    contactName,
    stageBefore: 'idle',
    stageAfter: 'awaiting_review',
    detectedIntent: 'review_score',
    slots: {
      reviewAgendamentoId: String(agendamentoId || ''),
      reviewServicoNome: String(servicoNome || ''),
      reviewData: String(dataISO || ''),
      reviewHora: String(hora || ''),
    },
    resultCode: 'REVIEW_REQUEST_SENT',
    sendStatus: 'sent',
  }).catch(() => undefined);

  return conversation;
}

async function listActiveServices(barbeariaId) {
  const result = await pool.query(
    `SELECT id, nome, preco, duracao_minutos
     FROM servicos
     WHERE barbearia_id = $1 AND ativo = true
     ORDER BY nome`,
    [barbeariaId]
  );

  return result.rows.map((item) => ({
    id: String(item.id),
    nome: String(item.nome || 'Servico'),
    preco: Number(item.preco || 0),
    duracao: Number(item.duracao_minutos || 30),
    label: String(item.nome || 'Servico'),
  }));
}

async function getConversation(barbeariaId, phoneNumber) {
  await ensureConversationSchema();

  const result = await pool.query(
    `SELECT *
     FROM whatsapp_chatbot_conversations
     WHERE barbearia_id = $1 AND phone_number = $2
     LIMIT 1`,
    [barbeariaId, phoneNumber]
  );

  const conversa = result.rows[0];
  if (!conversa) return null;

  return {
    ...conversa,
    payload: conversa.payload && typeof conversa.payload === 'object' ? conversa.payload : {},
  };
}

async function saveConversation(barbeariaId, phoneNumber, patch = {}) {
  await ensureConversationSchema();

  const atual = await getConversation(barbeariaId, phoneNumber);
  const payloadAtual = atual?.payload && typeof atual.payload === 'object' ? atual.payload : {};
  const payloadFinal = patch.replacePayload
    ? (patch.payload || {})
    : { ...payloadAtual, ...(patch.payload || {}) };

  const contactName = patch.contactName !== undefined
    ? patch.contactName
    : (atual?.contact_name || '');
  const stage = patch.stage !== undefined ? patch.stage : (atual?.stage || 'idle');
  const status = patch.status !== undefined ? patch.status : (atual?.status || 'active');
  const lastInboundMessage = patch.lastInboundMessage !== undefined
    ? patch.lastInboundMessage
    : (atual?.last_inbound_message || '');
  const lastOutboundMessage = patch.lastOutboundMessage !== undefined
    ? patch.lastOutboundMessage
    : (atual?.last_outbound_message || '');

  await pool.query(
    `INSERT INTO whatsapp_chatbot_conversations (
       barbearia_id,
       phone_number,
       contact_name,
       stage,
       payload,
       status,
       last_inbound_message,
       last_outbound_message,
       last_interaction_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       contact_name = VALUES(contact_name),
       stage = VALUES(stage),
       payload = VALUES(payload),
       status = VALUES(status),
       last_inbound_message = VALUES(last_inbound_message),
       last_outbound_message = VALUES(last_outbound_message),
       last_interaction_at = NOW(),
       updated_at = NOW()`,
    [
      barbeariaId,
      phoneNumber,
      contactName || null,
      stage,
      JSON.stringify(payloadFinal || {}),
      status,
      lastInboundMessage || null,
      lastOutboundMessage || null,
    ]
  );

  const result = await pool.query(
    `SELECT *
     FROM whatsapp_chatbot_conversations
     WHERE barbearia_id = $1
       AND phone_number = $2
     LIMIT 1`,
    [barbeariaId, phoneNumber]
  );

  return {
    ...result.rows[0],
    payload: payloadFinal,
  };
}

function montarMensagemServicos(nomeContato, servicos) {
  const itens = servicos
    .slice(0, 8)
    .map((servico, index) => `${index + 1}. ${servico.nome} — ${formatarMoeda(servico.preco)} • ${formatarDuracao(servico.duracao)}`)
    .join('\n');

  return `Perfeito, ${nomeContato}! Qual serviço você quer agendar?\n\n${itens}\n\nVocê pode responder com o número ou com o nome do serviço.\nSe preferir atendimento manual, responda *atendente*.`;
}

function montarMensagemData(nomeServico, duracaoServico) {
  return `Ótimo. Vamos agendar *${nomeServico}*.\n\n*Duração aproximada:* ${formatarDuracao(duracaoServico)}\n\nAgora me diga a data desejada.\nVocê pode responder *hoje*, *amanhã* ou enviar no formato *DD/MM*.\nExemplo: *01/10*.`;
}

function montarMensagemHorarios(dataISO, horarios) {
  const itens = horarios
    .map((hora, index) => `${index + 1}. ${hora}`)
    .join('\n');

  return `Aqui estão os horários disponíveis para *${formatarDataCurtaBR(dataISO)}*:\n\n${itens}\n\nOs horários são atualizados em tempo real.\nResponda com o número ou com o horário desejado.`;
}

function montarMensagemConfirmacao({ nomeContato, nomeServico, dataISO, hora, duracaoServico, precoServico, barbearia }) {
  const endereco = barbearia?.endereco ? `\n*Local:* ${barbearia.endereco}` : '';
  const duracao = duracaoServico ? `\n*Duração:* ${formatarDuracao(duracaoServico)}` : '';
  const preco = precoServico !== undefined && precoServico !== null ? `\n*Valor:* ${formatarMoeda(precoServico)}` : '';

  return `Só confirmando os detalhes do seu agendamento:\n\n*Nome:* ${nomeContato}\n*Serviço:* ${nomeServico}${duracao}${preco}\n*Data:* ${formatarDataCurtaBR(dataISO)}\n*Hora:* ${hora}${endereco}\n\nSe estiver tudo certo, responda *1* para confirmar.\nSe quiser escolher outro horário, responda *2*.`;
}

async function listarHorariosDisponiveis(barbearia, servico, dataISO) {
  const aberturaPadrao = normalizarHora(barbearia?.horario_abertura, '09:00');
  const fechamentoPadrao = normalizarHora(barbearia?.horario_fechamento, '18:00');
  const horariosSemana = Array.isArray(barbearia?.horarios_semana) ? barbearia.horarios_semana : [];
  const faixa = obterFaixaDoDia(dataISO, horariosSemana, aberturaPadrao, fechamentoPadrao);

  if (!faixa) {
    return [];
  }

  const intervalosBase = gerarHorariosIntervalo(faixa.abertura, faixa.fechamento, 30);
  const duracaoServico = Number(servico?.duracao || 30);
  const fechamentoMin = horaParaMinutos(faixa.fechamento);

  const agendamentosResult = await pool.query(
    `SELECT a.hora, COALESCE(s.duracao_minutos, 30) AS duracao_minutos
     FROM agendamentos a
     LEFT JOIN servicos s ON s.id = a.servico_id
     WHERE a.barbearia_id = $1
       AND a.data = $2
       AND a.status NOT IN ('cancelado', 'faltou')`,
    [barbearia.id, dataISO]
  );

  const ocupados = agendamentosResult.rows
    .map((item) => {
      const inicio = horaParaMinutos(item.hora);
      const duracao = Number(item.duracao_minutos || 30);
      if (inicio === null) return null;

      return {
        inicio,
        fim: inicio + duracao,
      };
    })
    .filter(Boolean);

  const agora = new Date();
  const hojeISO = formatarDataISO(agora);
  const limiteHoje = agora.getHours() * 60 + agora.getMinutes() + 30;

  return intervalosBase.filter((hora) => {
    const inicio = horaParaMinutos(hora);
    if (inicio === null) return false;

    const fim = inicio + duracaoServico;
    if (fechamentoMin !== null && fim > fechamentoMin) {
      return false;
    }

    if (dataISO === hojeISO && inicio <= limiteHoje) {
      return false;
    }

    return !ocupados.some((ocupado) => inicio < ocupado.fim && fim > ocupado.inicio);
  });
}

async function sugerirProximasDatasDisponiveis(barbearia, servico, dataBaseISO, limite = 3) {
  const base = dataBaseISO ? new Date(`${dataBaseISO}T12:00:00`) : new Date();
  const sugestoes = [];

  for (let offset = 0; offset < 14 && sugestoes.length < limite; offset += 1) {
    const data = new Date(base);
    data.setDate(base.getDate() + offset);
    const dataISO = formatarDataISO(data);
    const horarios = await listarHorariosDisponiveis(barbearia, servico, dataISO);

    if (horarios.length > 0) {
      sugestoes.push({ dataISO, horarios });
    }
  }

  return sugestoes;
}

async function criarAgendamentoExterno({
  barbeariaId,
  nomeContato,
  telefoneContato,
  servico,
  dataISO,
  hora,
  sessionId,
}) {
  await ensureAgendamentoSchema();

  const conflito = await pool.query(
    `SELECT id
     FROM agendamentos
     WHERE barbearia_id = $1
       AND data = $2
       AND hora = $3
       AND status != $4
     LIMIT 1`,
    [barbeariaId, dataISO, hora, 'cancelado']
  );

  if (conflito.rows.length > 0) {
    return {
      created: false,
      reason: 'TIME_CONFLICT',
    };
  }

  const result = await pool.query(
    `INSERT INTO agendamentos (
       barbearia_id,
       servico_id,
       servico_nome_snapshot,
       servico_preco_snapshot,
       cliente_id,
       cliente_nome_externo,
       cliente_telefone_externo,
       data,
       hora,
       status,
       chatbot_session_id,
       observacoes,
       origem,
       backend_sync_status
      )
     VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, 'pendente', $9, $10, 'whatsapp', 'pending')
      RETURNING *`,
    [
      barbeariaId,
      servico.id,
      servico.nome,
      Number(servico.preco || 0),
      nomeContato,
      telefoneContato,
      dataISO,
      hora,
      sessionId || null,
      'Agendado automaticamente pelo WhatsApp',
    ]
  );

  const agendamento = result.rows[0];
  try {
    const backendSync = await syncAppointmentToBackend(agendamento);
    if (backendSync?.agendamento) {
      await markAppointmentBackendSyncStatus(agendamento.id, 'synced');
      return {
        created: true,
        agendamento: backendSync.agendamento,
      };
    }

    const syncError = new Error('API principal confirmou a chamada, mas nao retornou o agendamento sincronizado.');
    syncError.code = 'BACKEND_SYNC_EMPTY_RESPONSE';
    throw syncError;
  } catch (error) {
    console.error('[CHATBOT_CONVERSATION] Falha ao sincronizar agendamento com a API principal', {
      barbeariaId,
      agendamentoId: agendamento?.id,
      code: error?.code,
      status: error?.status,
      message: error?.message,
    }, error);

    await markAppointmentBackendSyncStatus(agendamento?.id, 'failed', error?.message || 'Falha ao sincronizar com a agenda principal.')
      .catch(() => undefined);

    await pool.query(
      `UPDATE agendamentos
       SET status = 'cancelado',
           observacoes = CONCAT(
             COALESCE(observacoes, ''),
             CASE WHEN observacoes IS NULL OR observacoes = '' THEN '' ELSE '\n' END,
             $2
           ),
           updated_at = NOW()
       WHERE id = $1`,
      [
        agendamento?.id,
        error?.code === 'TIME_CONFLICT'
          ? 'Cancelado automaticamente: conflito na agenda principal.'
          : 'Cancelado automaticamente: falha ao sincronizar com a agenda principal.',
      ]
    ).catch(() => undefined);

    return {
      created: false,
      reason: error?.code === 'TIME_CONFLICT' ? 'TIME_CONFLICT' : 'SYNC_FAILED',
      error: error?.message || 'Falha ao sincronizar com a agenda principal.',
    };
  }

  return {
    created: true,
    agendamento,
  };
}

async function responder(sendReply, message, saveState, replyMeta = {}) {
  await sendReply(message, replyMeta);
  if (saveState) {
    await saveState({ lastOutboundMessage: message });
  }
}

async function iniciarFluxo({ barbearia, phoneNumber, pushName, sendReply, sessionId, detectedIntent }) {
  const nomeInicial = capitalizarNome(pushName || '');
  const mensagem = `Olá! Aqui é a assistente da *${barbearia.nome || 'barbearia'}*.\n\nVou te ajudar a agendar seu horário por aqui em poucos passos.\nSe preferir atendimento manual, responda *atendente* a qualquer momento.\n\nPara começar, me diga seu nome.`;

  await saveConversation(barbearia.id, phoneNumber, {
    contactName: nomeInicial,
    stage: 'awaiting_name',
    replacePayload: true,
    payload: {},
    status: 'active',
    lastInboundMessage: '',
    lastOutboundMessage: mensagem,
  });

  await sendReply(mensagem, {
    sessionId,
    contactName: nomeInicial,
    stageBefore: 'idle',
    stageAfter: 'awaiting_name',
    detectedIntent,
    resultCode: 'FLOW_STARTED',
    slots: {},
  });
}

async function handleGlobalInterruption({
  mode,
  analysis,
  conversa,
  barbearia,
  pushName,
  sendReply,
  salvarEstado,
}) {
  if (mode !== 'trained' || !analysis) return false;

  const stageBefore = String(conversa?.stage || 'idle');
  const payloadAtual = conversa?.payload || {};
  const nomeContato = conversa?.contact_name || capitalizarNome(pushName || '') || 'Cliente';
  const servicos = Array.isArray(payloadAtual?.servicos) ? payloadAtual.servicos : await listActiveServices(barbearia.id);
  const servicoAtual = payloadAtual?.servicoId
    ? servicos.find((item) => String(item.id) === String(payloadAtual.servicoId))
    : null;
  const servicoDetectado = analysis?.slots?.desiredServiceId
    ? servicos.find((item) => String(item.id) === String(analysis.slots.desiredServiceId))
    : findServiceByText(servicos, analysis?.slots?.desiredServiceName || '');
  const servicoEfetivo = servicoDetectado || servicoAtual;

  if (analysis.globalIntent === 'ask_price') {
    const mensagem = servicoEfetivo
      ? `O valor atual de *${servicoEfetivo.nome}* é *${formatarMoeda(servicoEfetivo.preco)}* e a duração média é *${formatarDuracao(servicoEfetivo.duracao)}*.\n\nSe quiser, eu já posso seguir com o agendamento.`
      : `Claro. Aqui está o nosso catálogo atual:\n\n${servicos
          .slice(0, 8)
          .map((servico, index) => `${index + 1}. ${servico.nome} — ${formatarMoeda(servico.preco)} • ${formatarDuracao(servico.duracao)}`)
          .join('\n')}`;

    await responder(sendReply, mensagem, (patch) => salvarEstado({
      payload: mergeCanonicalSlots(payloadAtual, analysis, servicoEfetivo),
      ...patch,
    }), {
      stageBefore,
      stageAfter: stageBefore,
      detectedIntent: analysis.globalIntent,
      resultCode: 'ASK_PRICE',
      slots: analysis.slots,
    });

    return true;
  }

  if (analysis.globalIntent === 'change_service' && servicoEfetivo) {
    const mensagem = montarMensagemData(servicoEfetivo.nome, servicoEfetivo.duracao);
    await responder(sendReply, mensagem, (patch) => salvarEstado({
      stage: 'awaiting_date',
      payload: {
        ...mergeCanonicalSlots(payloadAtual, analysis, servicoEfetivo),
        servicos,
        availableSlots: [],
      },
      ...patch,
    }), {
      stageBefore,
      stageAfter: 'awaiting_date',
      detectedIntent: analysis.globalIntent,
      resultCode: 'CHANGE_SERVICE',
      slots: analysis.slots,
    });
    return true;
  }

  if (
    ['change_date', 'ask_available_times'].includes(analysis.globalIntent)
    && servicoEfetivo
    && (analysis.slots.desiredDate || payloadAtual?.selectedDate || payloadAtual?.desiredDate)
  ) {
    const dataISO = analysis.slots.desiredDate || payloadAtual?.selectedDate || payloadAtual?.desiredDate;
    let horarios = await listarHorariosDisponiveis(barbearia, servicoEfetivo, dataISO);
    if (analysis.slots.desiredPeriod) {
      horarios = filtrarHorariosPorPeriodo(horarios, analysis.slots.desiredPeriod);
    }

    if (horarios.length === 0) {
      const mensagem = `Nao encontrei horarios livres para *${formatarDataCurtaBR(dataISO)}* nesse recorte.\n\nMe envie outra data ou outro periodo que eu consulto novamente.`;
      await responder(sendReply, mensagem, (patch) => salvarEstado({
        stage: 'awaiting_date',
        payload: {
          ...mergeCanonicalSlots(payloadAtual, analysis, servicoEfetivo),
          servicos,
          availableSlots: [],
        },
        ...patch,
      }), {
        stageBefore,
        stageAfter: 'awaiting_date',
        detectedIntent: analysis.globalIntent,
        resultCode: 'CHANGE_DATE_NO_SLOTS',
        slots: analysis.slots,
      });
      return true;
    }

    const mensagem = montarMensagemHorarios(dataISO, horarios);
    await responder(sendReply, mensagem, (patch) => salvarEstado({
      stage: 'awaiting_time',
      payload: {
        ...mergeCanonicalSlots(payloadAtual, analysis, servicoEfetivo),
        servicos,
        selectedDate: dataISO,
        availableSlots: horarios,
      },
      ...patch,
    }), {
      stageBefore,
      stageAfter: 'awaiting_time',
      detectedIntent: analysis.globalIntent,
      resultCode: 'CHANGE_DATE',
      slots: analysis.slots,
    });
    return true;
  }

  if (
    analysis.globalIntent === 'change_time'
    && servicoEfetivo
    && (payloadAtual?.selectedDate || analysis.slots.desiredDate || payloadAtual?.desiredDate)
  ) {
    const dataISO = payloadAtual?.selectedDate || analysis.slots.desiredDate || payloadAtual?.desiredDate;
    let horarios = await listarHorariosDisponiveis(barbearia, servicoEfetivo, dataISO);
    if (analysis.slots.desiredPeriod) {
      horarios = filtrarHorariosPorPeriodo(horarios, analysis.slots.desiredPeriod);
    }

    const horaDesejada = analysis.slots.desiredTime;
    if (horaDesejada && horarios.includes(horaDesejada)) {
      const mensagem = montarMensagemConfirmacao({
        nomeContato,
        nomeServico: servicoEfetivo.nome,
        dataISO,
        hora: horaDesejada,
        duracaoServico: servicoEfetivo.duracao,
        precoServico: servicoEfetivo.preco,
        barbearia,
      });

      await responder(sendReply, mensagem, (patch) => salvarEstado({
        stage: 'awaiting_confirmation',
        payload: {
          ...mergeCanonicalSlots(payloadAtual, analysis, servicoEfetivo),
          servicos,
          selectedDate: dataISO,
          selectedTime: horaDesejada,
          availableSlots: horarios,
        },
        ...patch,
      }), {
        stageBefore,
        stageAfter: 'awaiting_confirmation',
        detectedIntent: analysis.globalIntent,
        resultCode: 'CHANGE_TIME_DIRECT',
        slots: analysis.slots,
      });
      return true;
    }

    const mensagem = montarMensagemHorarios(dataISO, horarios);
    await responder(sendReply, mensagem, (patch) => salvarEstado({
      stage: 'awaiting_time',
      payload: {
        ...mergeCanonicalSlots(payloadAtual, analysis, servicoEfetivo),
        servicos,
        selectedDate: dataISO,
        availableSlots: horarios,
      },
      ...patch,
    }), {
      stageBefore,
      stageAfter: 'awaiting_time',
      detectedIntent: analysis.globalIntent,
      resultCode: 'CHANGE_TIME_LIST',
      slots: analysis.slots,
    });
    return true;
  }

  return false;
}

async function handleIncomingMessage({ barbeariaId, phoneNumber, message, pushName, sendReply }) {
  await ensureConversationSchema();

  const telefone = WhatsAppService.limparTelefone(phoneNumber);
  const texto = String(message || '').trim();
  const textoNormalizado = normalizarTexto(texto);

  if (!telefone || !texto) return;

  const barbearia = await getBarbearia(barbeariaId);
  if (!barbearia) return;

  let conversa = await getConversation(barbearia.id, telefone);
  const settings = await getChatbotOperationalSettings(barbearia.id).catch(() => ({
    mode: 'legacy',
    enabled: true,
  }));
  if (!settings.enabled) return;

  const servicosAnalise = Array.isArray(conversa?.payload?.servicos)
    ? conversa.payload.servicos
    : [];
  const analysis = analyzeInboundMessage({
    text: texto,
    stage: conversa?.stage || 'idle',
    payload: conversa?.payload || {},
    services: servicosAnalise,
  });

  const deveIniciarNovoFluxo =
    !conversa
    || !conversa.stage
    || conversa.stage === 'idle'
    || conversa.stage === 'completed'
    || RESET_KEYWORDS.includes(textoNormalizado);

  const session = await ensureChatbotSession({
    barbeariaId: barbearia.id,
    phoneNumber: telefone,
    contactName: conversa?.contact_name || pushName || '',
    entryIntent: analysis.globalIntent,
    currentStage: deveIniciarNovoFluxo ? 'awaiting_name' : (conversa?.stage || 'idle'),
    forceNew: deveIniciarNovoFluxo,
  }).catch(() => null);

  await logChatbotTurn({
    sessionId: session?.id,
    direction: 'inbound',
    text: texto,
    contactName: conversa?.contact_name || pushName || '',
    stageBefore: conversa?.stage || 'idle',
    stageAfter: conversa?.stage || 'idle',
    detectedIntent: analysis.globalIntent,
    slots: analysis.slots,
    resultCode: 'INBOUND_RECEIVED',
  }).catch(() => undefined);

  const sendReplyWithTelemetry = async (reply, meta = {}) => sendReply(reply, {
    sessionId: session?.id,
    contactName: meta.contactName || conversa?.contact_name || pushName || '',
    stageBefore: meta.stageBefore || conversa?.stage || 'idle',
    stageAfter: meta.stageAfter,
    detectedIntent: meta.detectedIntent || analysis.globalIntent,
    resultCode: meta.resultCode,
    slots: meta.slots || analysis.slots,
  }).finally(() => {
    const nextStage = meta.stageAfter || meta.stageBefore || conversa?.stage || 'idle';
    const statusMap = {
      completed: 'completed',
      human_handoff: 'human_handoff',
    };
    const outcomeMap = {
      FLOW_STARTED: null,
      HUMAN_HANDOFF: 'HUMAN_HANDOFF',
      CANCEL_FLOW: 'CANCEL_FLOW',
      BOOKED: 'BOOKED',
      REVIEW_CAPTURED: 'REVIEW_CAPTURED',
    };

    return updateChatbotSessionState({
      sessionId: session?.id,
      currentStage: nextStage,
      status: statusMap[nextStage] || 'active',
      outcomeCode: outcomeMap[meta.resultCode] || undefined,
      end: ['completed', 'human_handoff'].includes(nextStage),
    }).catch(() => undefined);
  });

  if (conversa?.stage === 'human_handoff' && !RESET_KEYWORDS.includes(textoNormalizado)) {
    await updateChatbotSessionState({
      sessionId: session?.id,
      currentStage: 'human_handoff',
      status: 'human_handoff',
    }).catch(() => undefined);
    return;
  }

  if (deveIniciarNovoFluxo) {
    await iniciarFluxo({
      barbearia,
      phoneNumber: telefone,
      pushName,
      sendReply: sendReplyWithTelemetry,
      sessionId: session?.id,
      detectedIntent: analysis.globalIntent,
    });
    await updateChatbotSessionState({
      sessionId: session?.id,
      currentStage: 'awaiting_name',
      status: 'active',
    }).catch(() => undefined);
    return;
  }

  if (HUMAN_HELP_KEYWORDS.includes(textoNormalizado)) {
    const mensagem = montarMensagemAtendimentoHumano(barbearia);
    await saveConversation(barbearia.id, telefone, {
      stage: 'human_handoff',
      replacePayload: false,
      status: 'active',
      lastInboundMessage: texto,
      lastOutboundMessage: mensagem,
    });
    await updateChatbotSessionState({
      sessionId: session?.id,
      currentStage: 'human_handoff',
      status: 'human_handoff',
      outcomeCode: 'HUMAN_HANDOFF',
      end: true,
    }).catch(() => undefined);
    await sendReplyWithTelemetry(mensagem, {
      stageBefore: conversa?.stage || 'idle',
      stageAfter: 'human_handoff',
      resultCode: 'HUMAN_HANDOFF',
    });
    return;
  }

  if (CANCEL_KEYWORDS.includes(textoNormalizado)) {
    const mensagem = `Tudo certo. Vou encerrar este atendimento automático por aqui.\n\nQuando quiser agendar novamente, é só responder *agendar*.\nSe preferir acompanhar online, acesse ${CHATBOT_SITE_URL}.`;
    await saveConversation(barbearia.id, telefone, {
      stage: 'completed',
      replacePayload: true,
      payload: {},
      status: 'active',
      lastInboundMessage: texto,
      lastOutboundMessage: mensagem,
    });
    await updateChatbotSessionState({
      sessionId: session?.id,
      currentStage: 'completed',
      status: 'completed',
      outcomeCode: 'CANCEL_FLOW',
      end: true,
    }).catch(() => undefined);
    await sendReplyWithTelemetry(mensagem, {
      stageBefore: conversa?.stage || 'idle',
      stageAfter: 'completed',
      resultCode: 'CANCEL_FLOW',
    });
    return;
  }

  const salvarEstado = (patch = {}) => saveConversation(barbearia.id, telefone, {
    ...patch,
    lastInboundMessage: texto,
  });

  if (conversa?.payload) {
    const servicoEncontrado = servicosAnalise.length > 0
      ? (analysis?.slots?.desiredServiceId
          ? servicosAnalise.find((item) => String(item.id) === String(analysis.slots.desiredServiceId))
          : findServiceByText(servicosAnalise, analysis?.slots?.desiredServiceName || ''))
      : null;
    conversa = {
      ...conversa,
      payload: mergeCanonicalSlots(conversa.payload, analysis, servicoEncontrado),
    };
  }

  const interrompeu = await handleGlobalInterruption({
    mode: settings.mode,
    analysis,
    conversa,
    barbearia,
    pushName,
    sendReply: sendReplyWithTelemetry,
    salvarEstado,
  });
  if (interrompeu) {
    return;
  }

  switch (conversa.stage) {
    case 'awaiting_review': {
      const nota = parseReviewScore(texto);

      if (!nota) {
        const mensagem = `Para registrar sua avaliação, responda apenas com uma nota de *1 a 5*.\n\n*1* - ruim\n*2* - abaixo do esperado\n*3* - bom\n*4* - muito bom\n*5* - excelente`;
        await responder(sendReplyWithTelemetry, mensagem, salvarEstado);
        return;
      }

      const avaliacao = await registrarAvaliacaoWhatsApp({
        barbeariaId: barbearia.id,
        agendamentoId: conversa.payload?.reviewAgendamentoId,
        phoneNumber: telefone,
        contactName: conversa.contact_name || pushName || '',
        nota,
      });

      if (!avaliacao.ok) {
        await responder(sendReplyWithTelemetry, avaliacao.error || 'Não consegui registrar sua avaliação agora. Tente novamente em instantes.', salvarEstado);
        return;
      }

      const mensagem = montarMensagemAvaliacaoRecebida({
        nomeBarbearia: barbearia.nome,
        nota: avaliacao.nota,
      });

      await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
        stage: 'completed',
        replacePayload: true,
        payload: {
          ultimoAgendamentoId: conversa.payload?.reviewAgendamentoId || null,
          ultimaAvaliacaoNota: avaliacao.nota,
        },
        ...patch,
      }), {
        stageBefore: 'awaiting_review',
        stageAfter: 'completed',
        resultCode: 'REVIEW_CAPTURED',
        slots: analysis.slots,
      });
      return;
    }

    case 'awaiting_name': {
      const nomeContato = capitalizarNome(texto) || capitalizarNome(pushName || '') || 'Cliente';
      const servicos = await listActiveServices(barbearia.id);

      if (servicos.length === 0) {
        const mensagem = `No momento, a agenda automática está temporariamente indisponível porque ainda não há serviços ativos cadastrados.\n\nSe preferir, fale com a equipe da *${barbearia.nome}* ou acompanhe por ${CHATBOT_SITE_URL}.`;
        await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
          contactName: nomeContato,
          stage: 'completed',
          replacePayload: true,
          payload: {},
          ...patch,
        }), {
          stageBefore: 'awaiting_name',
          stageAfter: 'completed',
          resultCode: 'NO_ACTIVE_SERVICES',
        });
        return;
      }

      const mensagem = montarMensagemServicos(nomeContato, servicos);
      await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
        contactName: nomeContato,
        stage: 'awaiting_service',
        replacePayload: true,
        payload: {
          servicos,
        },
        ...patch,
      }), {
        stageBefore: 'awaiting_name',
        stageAfter: 'awaiting_service',
        resultCode: 'CAPTURED_NAME',
      });
      return;
    }

    case 'awaiting_service': {
      const servicos = Array.isArray(conversa.payload?.servicos) ? conversa.payload.servicos : await listActiveServices(barbearia.id);
      const selecionado = parseOptionSelection(texto, servicos);

      if (!selecionado) {
        const nomeContato = conversa.contact_name || capitalizarNome(pushName || '') || 'Cliente';
        const mensagem = `Não consegui identificar o serviço que você quer agendar.\n\n${montarMensagemServicos(nomeContato, servicos)}`;
        await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
          payload: { servicos },
          ...patch,
        }));
        return;
      }

      if (settings.mode === 'trained' && analysis?.slots?.desiredDate) {
        let horariosDiretos = await listarHorariosDisponiveis(barbearia, selecionado, analysis.slots.desiredDate);
        if (analysis.slots.desiredPeriod) {
          horariosDiretos = filtrarHorariosPorPeriodo(horariosDiretos, analysis.slots.desiredPeriod);
        }

        if (horariosDiretos.length > 0) {
          const mensagemDireta = montarMensagemHorarios(analysis.slots.desiredDate, horariosDiretos);
          await responder(sendReplyWithTelemetry, mensagemDireta, (patch) => salvarEstado({
            stage: 'awaiting_time',
            payload: {
              ...mergeCanonicalSlots(conversa.payload, analysis, selecionado),
              servicos,
              servicoId: selecionado.id,
              servicoNome: selecionado.nome,
              servicoDuracao: selecionado.duracao,
              servicoPreco: selecionado.preco,
              selectedDate: analysis.slots.desiredDate,
              availableSlots: horariosDiretos,
            },
            ...patch,
          }), {
            stageBefore: 'awaiting_service',
            stageAfter: 'awaiting_time',
            resultCode: 'SERVICE_AND_DATE_CAPTURED',
            slots: analysis.slots,
          });
          return;
        }
      }

      const mensagem = montarMensagemData(selecionado.nome, selecionado.duracao);
      await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
        stage: 'awaiting_date',
        payload: {
          servicos,
          servicoId: selecionado.id,
          servicoNome: selecionado.nome,
          servicoDuracao: selecionado.duracao,
          servicoPreco: selecionado.preco,
          availableSlots: [],
        },
        ...patch,
      }), {
        stageBefore: 'awaiting_service',
        stageAfter: 'awaiting_date',
        resultCode: 'SERVICE_SELECTED',
      });
      return;
    }

    case 'awaiting_date': {
      const dataISO = parseDateInput(texto);
      const servico = {
        id: String(conversa.payload?.servicoId || ''),
        nome: String(conversa.payload?.servicoNome || 'Serviço'),
        duracao: Number(conversa.payload?.servicoDuracao || 30),
      };

      if (!dataISO) {
        const mensagem = `Não entendi a data informada.\n\nResponda com *hoje*, *amanhã* ou envie no formato *DD/MM*.\nExemplo: *01/10*.`;
        await responder(sendReplyWithTelemetry, mensagem, salvarEstado);
        return;
      }

      const horarios = await listarHorariosDisponiveis(barbearia, servico, dataISO);

      if (horarios.length === 0) {
        const sugestoes = await sugerirProximasDatasDisponiveis(barbearia, servico, dataISO, 3);
        const listaSugestoes = sugestoes
          .map((item) => `- ${formatarDataCurtaBR(item.dataISO)}${item.horarios?.[0] ? ` a partir de ${item.horarios[0]}` : ''}`)
          .join('\n');
        const mensagem = sugestoes.length > 0
          ? `No momento, ${formatarDataCurtaBR(dataISO)} está sem horários livres para esse serviço.\n\nPosso te oferecer estas próximas opções:\n${listaSugestoes}\n\nMe envie a nova data no formato *DD/MM*.`
          : `No momento, essa data está sem horários livres para esse serviço.\n\nMe envie outra data no formato *DD/MM* e eu consulto a agenda novamente.`;

        await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
          payload: {
            ...conversa.payload,
            availableSlots: [],
          },
          ...patch,
        }), {
          stageBefore: 'awaiting_date',
          stageAfter: 'awaiting_date',
          resultCode: 'DATE_NO_SLOTS',
        });
        return;
      }

      const mensagem = montarMensagemHorarios(dataISO, horarios);
      await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
        stage: 'awaiting_time',
        payload: {
          ...conversa.payload,
          selectedDate: dataISO,
          availableSlots: horarios,
        },
        ...patch,
      }), {
        stageBefore: 'awaiting_date',
        stageAfter: 'awaiting_time',
        resultCode: 'DATE_SELECTED',
      });
      return;
    }

    case 'awaiting_time': {
      const availableSlots = Array.isArray(conversa.payload?.availableSlots)
        ? conversa.payload.availableSlots.map((hora) => ({ hora, label: hora }))
        : [];
      const selecionado = parseOptionSelection(texto, availableSlots);

      if (!selecionado) {
        const mensagem = `Não consegui identificar o horário desejado.\n\n${montarMensagemHorarios(conversa.payload?.selectedDate, availableSlots.map((item) => item.hora))}`;
        await responder(sendReplyWithTelemetry, mensagem, salvarEstado);
        return;
      }

      const horaEscolhida = selecionado.hora;
      const mensagem = montarMensagemConfirmacao({
        nomeContato: conversa.contact_name || capitalizarNome(pushName || '') || 'Cliente',
        nomeServico: conversa.payload?.servicoNome || 'Serviço',
        dataISO: conversa.payload?.selectedDate || '',
        hora: horaEscolhida,
        duracaoServico: Number(conversa.payload?.servicoDuracao || 0),
        precoServico: Number(conversa.payload?.servicoPreco || 0),
        barbearia,
      });

      await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
        stage: 'awaiting_confirmation',
        payload: {
          ...conversa.payload,
          selectedTime: horaEscolhida,
        },
        ...patch,
      }), {
        stageBefore: 'awaiting_time',
        stageAfter: 'awaiting_confirmation',
        resultCode: 'TIME_SELECTED',
      });
      return;
    }

    case 'awaiting_confirmation': {
      if (CHANGE_KEYWORDS.includes(textoNormalizado)) {
        const horarios = Array.isArray(conversa.payload?.availableSlots) ? conversa.payload.availableSlots : [];
        const mensagem = montarMensagemHorarios(conversa.payload?.selectedDate || '', horarios);

        await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
          stage: 'awaiting_time',
          ...patch,
        }), {
          stageBefore: 'awaiting_confirmation',
          stageAfter: 'awaiting_time',
          resultCode: 'CHANGE_TIME',
        });
        return;
      }

      if (!CONFIRM_KEYWORDS.includes(textoNormalizado)) {
        const mensagem = `Para seguir, responda com *1* para confirmar ou *2* para escolher outro horário.`;
        await responder(sendReplyWithTelemetry, mensagem, salvarEstado);
        return;
      }

      const servico = {
        id: String(conversa.payload?.servicoId || ''),
        nome: String(conversa.payload?.servicoNome || 'Serviço'),
        preco: Number(conversa.payload?.servicoPreco || 0),
        duracao: Number(conversa.payload?.servicoDuracao || 30),
      };
      const dataISO = String(conversa.payload?.selectedDate || '');
      const hora = String(conversa.payload?.selectedTime || '');
      const nomeContato = conversa.contact_name || capitalizarNome(pushName || '') || 'Cliente';

      const criacao = await criarAgendamentoExterno({
        barbeariaId: barbearia.id,
        nomeContato,
        telefoneContato: telefone,
        servico,
        dataISO,
        hora,
        sessionId: session?.id,
      });

      if (!criacao.created) {
        if (criacao.reason === 'SYNC_FAILED') {
          const mensagem = `Não consegui finalizar o agendamento na agenda principal da *${barbearia.nome}* agora.\n\nPor segurança, nenhum horário foi confirmado. Tente novamente em alguns instantes ou fale com a equipe da barbearia.`;

          await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
            stage: 'awaiting_confirmation',
            ...patch,
          }), {
            stageBefore: 'awaiting_confirmation',
            stageAfter: 'awaiting_confirmation',
            resultCode: 'BOOKING_SYNC_FAILED',
          });
          return;
        }

        const horariosAtualizados = await listarHorariosDisponiveis(barbearia, { ...servico, duracao: Number(conversa.payload?.servicoDuracao || 30) }, dataISO);
        const mensagem = horariosAtualizados.length > 0
          ? `Esse horário acabou de ficar indisponível enquanto eu finalizava a confirmação.\n\n${montarMensagemHorarios(dataISO, horariosAtualizados)}`
          : `Esse horário acabou de ficar indisponível enquanto eu finalizava a confirmação.\n\nMe envie outra data no formato *DD/MM* para eu buscar novas opções.`;

        await responder(sendReplyWithTelemetry, mensagem, (patch) => salvarEstado({
          stage: horariosAtualizados.length > 0 ? 'awaiting_time' : 'awaiting_date',
          payload: {
            ...conversa.payload,
            availableSlots: horariosAtualizados,
          },
          ...patch,
        }), {
          stageBefore: 'awaiting_confirmation',
          stageAfter: horariosAtualizados.length > 0 ? 'awaiting_time' : 'awaiting_date',
          resultCode: 'TIME_CONFLICT',
        });
        return;
      }

      await updateChatbotSessionState({
        sessionId: session?.id,
        agendamentoId: criacao.agendamento?.id || null,
      }).catch(() => undefined);

      const mensagemConfirmacao = `${WhatsAppService.templateAgendamentoCliente({
        nomeCliente: nomeContato,
        servico: conversa.payload?.servicoNome || 'Serviço agendado',
        data: dataISO,
        hora,
        nomeBarbearia: barbearia.nome,
        enderecoBarbearia: barbearia.endereco,
      })}\n\nSe preferir acompanhar sua reserva ou solicitar remarcação online, acesse ${CHATBOT_SITE_URL}.`;

      await responder(sendReplyWithTelemetry, mensagemConfirmacao, (patch) => salvarEstado({
        stage: 'completed',
        replacePayload: true,
        payload: {
          ultimoAgendamentoId: criacao.agendamento?.id || null,
        },
        ...patch,
      }), {
        stageBefore: 'awaiting_confirmation',
        stageAfter: 'completed',
        resultCode: 'BOOKED',
      });
      return;
    }

    default: {
      await iniciarFluxo({
        barbearia,
        phoneNumber: telefone,
        pushName,
        sendReply: sendReplyWithTelemetry,
        sessionId: session?.id,
        detectedIntent: analysis.globalIntent,
      });
    }
  }
}

module.exports = {
  ensureConversationSchema,
  handleIncomingMessage,
  registrarSolicitacaoAvaliacaoPendente,
  montarMensagemHorarios,
  parseDateInput,
  parsePeriodOfDay,
  parseTimeInput,
  findServiceByText,
  analyzeInboundMessage,
};
