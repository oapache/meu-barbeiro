const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiService {
  // Usuários
  static async register(data) {
    const res = await fetch(`${API_URL}/usuarios/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  static async login(email, senha) {
    const res = await fetch(`${API_URL}/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    return res.json();
  }

  // Barbearias
  static async listBarbearias() {
    const res = await fetch(`${API_URL}/barbearias`);
    return res.json();
  }

  static async createBarbearia(data) {
    const res = await fetch(`${API_URL}/barbearias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  // Serviços
  static async listServicos(barbeariaId) {
    const res = await fetch(`${API_URL}/barbearias/${barbeariaId}/servicos`);
    return res.json();
  }

  static async createServico(barbeariaId, data) {
    const res = await fetch(`${API_URL}/barbearias/${barbeariaId}/servicos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  // Agendamentos
  static async listAgendamentos(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_URL}/agendamentos?${params}`);
    return res.json();
  }

  static async createAgendamento(data) {
    const res = await fetch(`${API_URL}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  static async updateAgendamento(id, data) {
    const res = await fetch(`${API_URL}/agendamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  // WhatsApp
  static async gerarLinkWhatsApp(telefone, tipo, dados) {
    const res = await fetch(`${API_URL}/whatsapp/gerar-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, tipo, dados })
    });
    return res.json();
  }
}

export default ApiService;
