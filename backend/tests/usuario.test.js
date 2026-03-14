/**
 * Testes Unitários - API de Usuários
 */

const bcrypt = require('bcryptjs');

// Mock do pool de banco de dados
const mockPool = {
  query: jest.fn()
};

// Mock do módulo
jest.mock('../src/config/database', () => mockPool);

const usuarioController = require('../src/controllers/usuario');

describe('Controller de Usuário', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve criar um novo usuário com dados válidos', async () => {
      const req = {
        body: {
          nome: 'João Silva',
          email: 'joao@teste.com',
          senha: '123456',
          telefone: '11999999999',
          tipo: 'cliente'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock: email não existe
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Verificar email
        .mockResolvedValueOnce({ rows: [{ id: '1', nome: 'João Silva', email: 'joao@teste.com' }] }); // Insert

      await usuarioController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario: expect.objectContaining({
            nome: 'João Silva',
            email: 'joao@teste.com'
          })
        })
      );
    });

    it('deve retornar erro se email já existe', async () => {
      const req = {
        body: {
          nome: 'João Silva',
          email: 'joao@teste.com',
          senha: '123456'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock: email já existe
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });

      await usuarioController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email já cadastrado' });
    });

    it('deve retornar erro se nome não fornecido', async () => {
      const req = {
        body: {
          email: 'joao@teste.com',
          senha: '123456'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await usuarioController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const req = {
        body: {
          email: 'joao@teste.com',
          senha: '123456'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const senhaHash = await bcrypt.hash('123456', 10);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '1',
          nome: 'João',
          email: 'joao@teste.com',
          senha_hash: senhaHash
        }]
      });

      await usuarioController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario: expect.objectContaining({
            email: 'joao@teste.com'
          })
        })
      );
    });

    it('deve retornar erro com email inválido', async () => {
      const req = {
        body: {
          email: 'invalido@teste.com',
          senha: '123456'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await usuarioController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
    });
  });
});
