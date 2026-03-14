/**
 * Testes Unitários - Controller de Barbearias
 */

const mockPool = {
  query: jest.fn()
};

jest.mock('../src/config/database', () => mockPool);

const barbeariaController = require('../src/controllers/barbearia');

describe('Controller de Barbearias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listBarbearias', () => {
    it('deve listar todas as barbearias', async () => {
      const req = { query: {} };
      const res = {
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', nome: 'Barbearia 1' },
          { id: '2', nome: 'Barbearia 2' }
        ]
      });

      await barbeariaController.listBarbearias(req, res);

      expect(res.json).toHaveBeenCalledWith({
        barbearias: expect.arrayContaining([
          expect.objectContaining({ nome: 'Barbearia 1' })
        ])
      });
    });

    it('deve filtrar por busca', async () => {
      const req = { query: { busca: 'João' } };
      const res = {
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', nome: 'Barbearia do João' }]
      });

      await barbeariaController.listBarbearias(req, res);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%João%'])
      );
    });
  });

  describe('createBarbearia', () => {
    it('deve criar barbearia com dados válidos', async () => {
      const req = {
        body: {
          nome: 'Barbearia Nova',
          telefone: '11999999999',
          endereco: 'Rua nova, 123',
          usuario_id: 'user-123'
        }
      };
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'nova-barbearia',
          nome: 'Barbearia Nova',
          telefone: '11999999999'
        }]
      });

      await barbeariaController.createBarbearia(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          barbearia: expect.objectContaining({ nome: 'Barbearia Nova' })
        })
      );
    });

    it('deve retornar erro se nome não fornecido', async () => {
      const req = { body: { usuario_id: 'user-123' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await barbeariaController.createBarbearia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getBarbearia', () => {
    it('deve retornar barbearia pelo ID', async () => {
      const req = { params: { id: 'barbearia-1' } };
      const res = {
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'barbearia-1', nome: 'Barbearia Encontrada' }]
      });

      await barbeariaController.getBarbearia(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          barbearia: expect.objectContaining({ id: 'barbearia-1' })
        })
      );
    });

    it('deve retornar 404 se não encontrada', async () => {
      const req = { params: { id: 'inexistente' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await barbeariaController.getBarbearia(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateBarbearia', () => {
    it('deve atualizar barbearia', async () => {
      const req = {
        params: { id: 'barbearia-1' },
        body: { nome: 'Nome Atualizado' }
      };
      const res = {
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'barbearia-1', nome: 'Nome Atualizado' }]
      });

      await barbeariaController.updateBarbearia(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          barbearia: expect.objectContaining({ nome: 'Nome Atualizado' })
        })
      );
    });
  });

  describe('deleteBarbearia', () => {
    it('deve deletar barbearia', async () => {
      const req = { params: { id: 'barbearia-1' } };
      const res = {
        json: jest.fn()
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'barberia-1', nome: 'Barber Deletada' }]
      });

      await barbeariaController.deleteBarbearia(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Barbearia removida com sucesso' })
      );
    });
  });
});
