/**
 * Testes Unitários - Serviço de WhatsApp
 */

const WhatsAppService = require('../src/services/whatsapp');

describe('WhatsAppService', () => {
  describe('gerarLink', () => {
    it('deve gerar link válido com telefone e mensagem', () => {
      const telefone = '551199999999';
      const mensagem = 'Olá, gostaria de agendar';
      
      const link = WhatsAppService.gerarLink(telefone, mensagem);
      
      expect(link).toContain('wa.me/551199999999');
      expect(link).toContain(encodeURIComponent(mensagem));
    });

    it('deve funcionar sem mensagem', () => {
      const telefone = '551199999999';
      
      const link = WhatsAppService.gerarLink(telefone);
      
      expect(link).toContain('wa.me/551199999999');
    });

    it('deve limpar caracteres especiais do telefone', () => {
      const telefone = '+55 (11) 99999-9999';
      const mensagem = 'Teste';
      
      const link = WhatsAppService.gerarLink(telefone, mensagem);
      
      expect(link).toContain('wa.me/');
      expect(link).not.toContain('+');
      expect(link).not.toContain('(');
      expect(link).not.toContain(')');
      expect(link).not.toContain('-');
    });
  });

  describe('templateAgendamento', () => {
    it('deve gerar template de agendamento correto', () => {
      const dados = {
        nomeCliente: 'João',
        servico: 'Corte',
        data: '15/03',
        hora: '14:00',
        nomeBarbearia: 'Barbearia do João'
      };
      
      const template = WhatsAppService.templateAgendamento(dados);
      
      expect(template).toContain('João');
      expect(template).toContain('Corte');
      expect(template).toContain('15/03');
      expect(template).toContain('14:00');
      expect(template).toContain('Barbearia do João');
    });
  });

  describe('templateLembrete', () => {
    it('deve gerar template de lembrete correto', () => {
      const dados = {
        nomeCliente: 'Maria',
        servico: 'Barba',
        data: '16/03',
        hora: '10:00',
        nomeBarbearia: 'Barbearia Moderno'
      };
      
      const template = WhatsAppService.templateLembrete(dados);
      
      expect(template).toContain('Maria');
      expect(template).toContain('Lembrete');
      expect(template).toContain('Barba');
    });
  });

  describe('templateConfirmacao', () => {
    it('deve gerar template de confirmação correto', () => {
      const dados = {
        nomeCliente: 'Pedro',
        servico: 'Corte + Barba',
        data: '17/03',
        hora: '15:30',
        nomeBarbearia: 'Barbearia Central'
      };
      
      const template = WhatsAppService.templateConfirmacao(dados);
      
      expect(template).toContain('Pedro');
      expect(template).toContain('Confirmado');
      expect(template).toContain('Corte + Barba');
    });
  });

  describe('validarTelefone', () => {
    it('deve validar telefones corretos', () => {
      expect(WhatsAppService.validarTelefone('551199999999')).toBe(true);
      expect(WhatsAppService.validarTelefone('+551199999999')).toBe(true);
      expect(WhatsAppService.validarTelefone('11999999999')).toBe(true);
    });

    it('deve invalidar telefones incorretos', () => {
      expect(WhatsAppService.validarTelefone('123')).toBe(false);
      expect(WhatsAppService.validarTelefone('')).toBe(false);
      expect(WhatsAppService.validarTelefone('abcdefghij')).toBe(false);
    });
  });
});
