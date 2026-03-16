const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper para obter token
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper para fazer fetch com auth
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Tratamento de erros
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erro na requisição' }));
    throw new Error(error.error || 'Erro na requisição');
  }

  return res.json();
};

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

  // ============ BARBEARIAS ============
  static async listBarbearias() {
    return fetchWithAuth('/barbearias');
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

  // ============ SERVIÇOS ============
  static async listServicos(barbeariaId) {
    return fetchWithAuth(`/servicos/${barbeariaId}/servicos`);
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

  static async getAgendamento(id) {
    return fetchWithAuth(`/agendamentos/${id}`);
  }

  static async createAgendamento(data) {
    return fetchWithAuth('/agendamentos', {
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

  // ============ WHATSAPP ============
  static async gerarLinkWhatsApp(telefone, tipo, dados) {
    return fetchWithAuth('/whatsapp/gerar-link', {
      method: 'POST',
      body: JSON.stringify({ telefone, tipo, dados }),
    });
  }
}

export default ApiService;
