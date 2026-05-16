const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '');

const API_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || 'https://api.ocortecerto.com/api');
const BOT_API_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_BOT_API_URL || API_URL);
const pendingGetRequests = new Map();
export const AUTH_TOKEN_STORAGE_KEY = 'meu-barbeiro-auth-token'

// Helper para obter token
export const getToken = () => {
  if (typeof window === 'undefined') return ''
  return String(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '').trim()
}

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') return

  const valor = String(token || '').trim()
  if (!valor) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, valor)
}

const optimizeImageFile = async (file, options = {}) => {
  if (
    typeof window === 'undefined'
    || typeof Image === 'undefined'
    || !file?.type?.startsWith('image/')
    || file.type === 'image/gif'
    || file.type === 'image/svg+xml'
  ) {
    return file
  }

  const maxDimension = Number(options.maxDimension || 1600)
  const quality = Math.min(0.92, Math.max(0.65, Number(options.quality || 0.82)))
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Não foi possível otimizar esta imagem.'))
      img.src = objectUrl
    })

    const originalWidth = Number(image.naturalWidth || image.width || 0)
    const originalHeight = Number(image.naturalHeight || image.height || 0)
    if (!originalWidth || !originalHeight) return file

    const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight))
    const width = Math.max(1, Math.round(originalWidth * scale))
    const height = Math.max(1, Math.round(originalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality)
    })

    if (!blob || blob.size >= file.size) return file

    const baseName = String(file.name || 'imagem').replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// Helper para fazer fetch com auth
const fetchJsonWithAuth = async (baseUrl, endpoint, options = {}) => {
  const token = getToken();
  const method = String(options.method || 'GET').toUpperCase();
  const isGet = method === 'GET' && !options.body;
  const requestKey = isGet ? `${baseUrl}${endpoint}|${token || 'anon'}` : '';

  if (requestKey && pendingGetRequests.has(requestKey)) {
    return pendingGetRequests.get(requestKey);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const request = (async () => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      method,
      headers,
    });

    // Tratamento de erros
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(error.error || 'Erro na requisição');
    }

    return res.json();
  })();

  if (requestKey) {
    pendingGetRequests.set(requestKey, request);
    request.then(
      () => pendingGetRequests.delete(requestKey),
      () => pendingGetRequests.delete(requestKey)
    );
  }

  return request;
};

const fetchWithAuth = (endpoint, options = {}) => fetchJsonWithAuth(API_URL, endpoint, options);
const fetchBotWithAuth = (endpoint, options = {}) => fetchJsonWithAuth(BOT_API_URL, endpoint, options);

class ApiService {
  // ============ AUTH ============
  static async register(data) {
    return fetchWithAuth('/usuarios/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async login(email, senha) {
    return fetchWithAuth('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  }

  static async getMe() {
    return fetchWithAuth('/usuarios/me');
  }

  static async getUsuario(id) {
    return fetchWithAuth(`/usuarios/${id}`);
  }

  static async updateUsuario(id, data) {
    return fetchWithAuth(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ BARBEARIAS ============
  static async listBarbearias() {
    return fetchWithAuth('/barbearias');
  }

  static async listMyBarbearias() {
    return fetchWithAuth('/barbearias/mine')
  }

  static async getPublicStats() {
    return fetchWithAuth('/barbearias/stats');
  }

  static async getBarbearia(id) {
    return fetchWithAuth(`/barbearias/${id}`);
  }

  static async createBarbearia(data) {
    return fetchWithAuth('/barbearias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateBarbearia(id, data) {
    return fetchWithAuth(`/barbearias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getBarbeariaDetalhes(id) {
    return fetchWithAuth(`/barbearias/${id}/detalhes`);
  }

  static async updateBarbeariaDetalhes(id, data) {
    return fetchWithAuth(`/barbearias/${id}/detalhes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============ ASSINATURAS (STRIPE) ============
  static async createSubscriptionCheckoutSession({ userId, planKey, barbeariaId } = {}) {
    return fetchWithAuth('/subscriptions/checkout-session', {
      method: 'POST',
      headers: {
        'x-user-id': String(userId || ''),
      },
      body: JSON.stringify({
        user_id: userId,
        plan_key: planKey,
        barbearia_id: barbeariaId,
      }),
    });
  }

  static async getCurrentSubscription({ userId, barbeariaId, refreshFromStripe, checkoutSessionId } = {}) {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', String(userId));
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId));
    if (refreshFromStripe) params.set('sync', 'true');
    if (checkoutSessionId) params.set('checkout_session_id', String(checkoutSessionId));
    const query = params.toString();

    return fetchWithAuth(`/subscriptions/current${query ? `?${query}` : ''}`, {
      headers: {
        'x-user-id': String(userId || ''),
      },
    });
  }

  static async createSubscriptionCustomerPortal({ userId, barbeariaId }) {
    return fetchWithAuth('/subscriptions/customer-portal', {
      method: 'POST',
      headers: {
        'x-user-id': String(userId || ''),
      },
      body: JSON.stringify({ user_id: userId, barbearia_id: barbeariaId }),
    });
  }

  static async cancelCurrentSubscription({ userId, barbeariaId }) {
    return fetchWithAuth('/subscriptions/cancel', {
      method: 'POST',
      headers: {
        'x-user-id': String(userId || ''),
      },
      body: JSON.stringify({ user_id: userId, barbearia_id: barbeariaId }),
    });
  }

  // ============ ESTOQUE ============
  static async getEstoqueResumo(barbeariaId) {
    return fetchWithAuth(`/estoque/${barbeariaId}/resumo`)
  }

  static async listEstoqueProdutos(barbeariaId, options = {}) {
    const params = new URLSearchParams()
    if (options.q) params.set('q', String(options.q))
    if (options.status) params.set('status', String(options.status))
    if (options.includeInactive) params.set('include_inactive', 'true')
    const query = params.toString()
    return fetchWithAuth(`/estoque/${barbeariaId}/produtos${query ? `?${query}` : ''}`)
  }

  static async createEstoqueProduto(barbeariaId, data) {
    return fetchWithAuth(`/estoque/${barbeariaId}/produtos`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async updateEstoqueProduto(id, data) {
    return fetchWithAuth(`/estoque/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  static async deleteEstoqueProduto(id) {
    return fetchWithAuth(`/estoque/produtos/${id}`, {
      method: 'DELETE',
    })
  }

  static async createEstoqueMovimentacao(id, data) {
    return fetchWithAuth(`/estoque/produtos/${id}/movimentacoes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async listEstoqueMovimentacoes(barbeariaId, options = {}) {
    const params = new URLSearchParams()
    if (options.produtoId) params.set('produto_id', String(options.produtoId))
    if (options.limit) params.set('limit', String(options.limit))
    const query = params.toString()
    return fetchWithAuth(`/estoque/${barbeariaId}/movimentacoes${query ? `?${query}` : ''}`)
  }

  // ============ SERVIÇOS ============
  static async listServicos(barbeariaId, options = {}) {
    const params = new URLSearchParams();
    if (options.ativo !== undefined) {
      params.set('ativo', String(options.ativo));
    }
    if (options.includeInactive) {
      params.set('include_inactive', 'true');
    }

    const query = params.toString();
    return fetchWithAuth(`/servicos/${barbeariaId}/servicos${query ? `?${query}` : ''}`);
  }

  static async createServico(barbeariaId, data) {
    return fetchWithAuth(`/servicos/${barbeariaId}/servicos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateServico(id, data) {
    return fetchWithAuth(`/servicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteServico(id) {
    return fetchWithAuth(`/servicos/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ AGENDAMENTOS ============
  static async listAgendamentos(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return fetchWithAuth(`/agendamentos?${params}`);
  }

  static async getAgendamentoDisponibilidade(barbeariaId, data) {
    const params = new URLSearchParams()
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId))
    if (data) params.set('data', String(data))
    return fetchWithAuth(`/agendamentos/disponibilidade?${params.toString()}`)
  }

  static async getAgendamento(id) {
    return fetchWithAuth(`/agendamentos/${id}`);
  }

  static async createAgendamento(data) {
    return fetchWithAuth('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async createAgendamentoByEmail(data) {
    return fetchWithAuth('/agendamentos/por-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateAgendamento(id, data) {
    return fetchWithAuth(`/agendamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async cancelAgendamento(id) {
    return fetchWithAuth(`/agendamentos/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ CLIENTES ============
  static async listClientes(barbeariaId) {
    return fetchWithAuth(`/clientes/${barbeariaId}`);
  }

  static async getCliente(id) {
    return fetchWithAuth(`/clientes/info/${id}`);
  }

  // ============ WHATSAPP ============
  static async gerarLinkWhatsApp(telefone, tipo, dados) {
    return fetchWithAuth('/whatsapp/gerar-link', {
      method: 'POST',
      body: JSON.stringify({ telefone, tipo, dados }),
    });
  }

  // ============ CHATBOT / BOT WHATSAPP ============
  static async getChatbotWhatsAppStatus(barbeariaId) {
    const params = new URLSearchParams();
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId));
    const query = params.toString();

    return fetchBotWithAuth(`/chatbot/whatsapp/status${query ? `?${query}` : ''}`);
  }

  static async startChatbotWhatsApp(phoneNumber, barbeariaId) {
    return fetchBotWithAuth('/chatbot/whatsapp/start', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        barbearia_id: barbeariaId || null,
      }),
    });
  }

  static async resetChatbotWhatsApp(phoneNumber, barbeariaId) {
    return fetchBotWithAuth('/chatbot/whatsapp/reset', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        barbearia_id: barbeariaId || null,
      }),
    });
  }

  static async stopChatbotWhatsApp(barbeariaId) {
    return fetchBotWithAuth('/chatbot/whatsapp/stop', {
      method: 'POST',
      body: JSON.stringify({
        barbearia_id: barbeariaId || null,
      }),
    });
  }

  static async getAdminWhatsAppStatus(barbeariaId) {
    return this.getChatbotWhatsAppStatus(barbeariaId);
  }

  static async startAdminWhatsApp(phoneNumber, barbeariaId) {
    return this.startChatbotWhatsApp(phoneNumber, barbeariaId);
  }

  static async resetAdminWhatsApp(phoneNumber, barbeariaId) {
    return this.resetChatbotWhatsApp(phoneNumber, barbeariaId);
  }

  static async stopAdminWhatsApp(barbeariaId) {
    return this.stopChatbotWhatsApp(barbeariaId);
  }

  static async getChatbotMetrics(barbeariaId, options = {}) {
    const params = new URLSearchParams()
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId))
    if (options.from) params.set('from', String(options.from))
    if (options.to) params.set('to', String(options.to))
    return fetchBotWithAuth(`/chatbot/metrics?${params.toString()}`)
  }

  static async getChatbotSettings(barbeariaId) {
    const params = new URLSearchParams()
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId))
    return fetchBotWithAuth(`/chatbot/settings?${params.toString()}`)
  }

  static async updateChatbotSettings(barbeariaId, data = {}) {
    return fetchBotWithAuth('/chatbot/settings', {
      method: 'PUT',
      body: JSON.stringify({
        barbearia_id: barbeariaId || null,
        ...data,
      }),
    })
  }

  static async listChatbotSessions(barbeariaId, options = {}) {
    const params = new URLSearchParams()
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId))
    if (options.status) params.set('status', String(options.status))
    if (options.stage) params.set('stage', String(options.stage))
    if (options.reviewStatus) params.set('review_status', String(options.reviewStatus))
    if (options.queueOnly) params.set('queue_only', 'true')
    if (options.q) params.set('q', String(options.q))
    if (options.limit) params.set('limit', String(options.limit))
    if (options.offset) params.set('offset', String(options.offset))
    return fetchBotWithAuth(`/chatbot/sessions?${params.toString()}`)
  }

  static async getChatbotSessionDetail(sessionId, barbeariaId) {
    const params = new URLSearchParams()
    if (barbeariaId) params.set('barbearia_id', String(barbeariaId))
    const query = params.toString()
    return fetchBotWithAuth(`/chatbot/sessions/${sessionId}${query ? `?${query}` : ''}`)
  }

  static async updateChatbotSessionReview(sessionId, barbeariaId, data = {}) {
    return fetchBotWithAuth(`/chatbot/sessions/${sessionId}/review`, {
      method: 'PUT',
      body: JSON.stringify({
        barbearia_id: barbeariaId || null,
        ...data,
      }),
    })
  }

  // ============ UPLOAD ============
  static async uploadImagem(file, options = {}) {
    const token = getToken();
    const { barbeariaId, scope } = options || {};
    const uploadFile = await optimizeImageFile(file, options);
    const formData = new FormData();
    formData.append('file', uploadFile);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (barbeariaId) {
      headers['x-barbearia-id'] = String(barbeariaId);
    }
    if (scope) {
      headers['x-upload-scope'] = String(scope);
    }

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro no upload' }));
      throw new Error(error.error || 'Erro no upload');
    }

    return res.json();
  }
}

export default ApiService;
