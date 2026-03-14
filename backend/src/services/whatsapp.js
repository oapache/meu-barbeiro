/**
 * Serviço de WhatsApp - Click to Chat
 * 
 * Gera links diretos para WhatsApp da barbearia
 * Não requer API paga!
 */

class WhatsAppService {
  /**
   * Gera link de Click to Chat
   * @param {string} telefone - Número da barbearia (só números com DDI)
   * @param {string} mensagem - Mensagem padrão
   * @returns {string} Link para WhatsApp
   */
  static gerarLink(telefone, mensagem = '') {
    // Remove tudo que não for número
    const numeroLimpo = telefone.replace(/\D/g, '');
    
    // Codifica a mensagem para URL
    const mensagemEncoded = encodeURIComponent(mensagem);
    
    // Gera link
    return `https://wa.me/${numeroLimpo}?text=${mensagemEncoded}`;
  }

  /**
   * Gera template de mensagem para agendamento
   * @param {object} dados - Dados do agendamento
   * @returns {string} Mensagem formatada
   */
  static templateAgendamento(dados) {
    const { nomeCliente, servico, data, hora, nomeBarbearia } = dados;
    
    return `Olá! Gostaria de agendar um *${servico}* na *${nomeBarbearia}*.

*Nome:* ${nomeCliente}
*Data:* ${data}
*Hora:* ${hora}

Aguardo confirmação! ✂️`;
  }

  /**
   * Gera template para lembrete
   * @param {object} dados - Dados do agendamento
   * @returns {string} Mensagem de lembrete
   */
  static templateLembrete(dados) {
    const { nomeCliente, servico, data, hora, nomeBarbearia } = dados;
    
    return `Olá ${nomeCliente}! 🕒

Lembrete do seu agendamento:

*Serviço:* ${servico}
*Barbearia:* ${nomeBarbearia}
*Data:* ${data}
*Hora:* ${hora}

Nos vemos lá! ✂️`;
  }

  /**
   * Gera template para confirmação
   * @param {object} dados - Dados do agendamento
   * @returns {string} Mensagem de confirmação
   */
  static templateConfirmacao(dados) {
    const { nomeCliente, servico, data, hora, nomeBarbearia } = dados;
    
    return `✅ *Agendamento Confirmado!*

*Cliente:* ${nomeCliente}
*Serviço:* ${servico}
*Barbearia:* ${nomeBarbearia}
*Data:* ${data}
*Hora:* ${hora}

Obrigado pela preferência! 😊`;
  }

  /**
   * Valida número de telefone
   * @param {string} telefone - Número a validar
   * @returns {boolean}
   */
  static validarTelefone(telefone) {
    // Aceita: +5511999999999 ou 5511999999999 ou 11999999999
    const regex = /^\+?[\d]{10,15}$/;
    return regex.test(telefone.replace(/\D/g, ''));
  }
}

module.exports = WhatsAppService;
