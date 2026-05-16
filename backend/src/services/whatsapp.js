/**
 * Serviço de WhatsApp - Click to Chat
 * 
 * Gera links diretos para WhatsApp da barbearia
 * Não requer API paga!
 */

class WhatsAppService {
  static limparTelefone(telefone = '') {
    return String(telefone || '').replace(/\D/g, '');
  }

  static formatarDataBR(dataISO = '') {
    const match = String(dataISO || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(dataISO || '');
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  static formatarDataCurtaBR(dataISO = '') {
    const match = String(dataISO || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(dataISO || '');
    return `${match[3]}/${match[2]}`;
  }

  static formatarTelefone(telefone = '') {
    const numero = this.limparTelefone(telefone);
    if (numero.length === 13) {
      return `+${numero.slice(0, 2)} (${numero.slice(2, 4)}) ${numero.slice(4, 9)}-${numero.slice(9)}`;
    }
    if (numero.length === 12) {
      return `+${numero.slice(0, 2)} (${numero.slice(2, 4)}) ${numero.slice(4, 8)}-${numero.slice(8)}`;
    }
    if (numero.length === 11) {
      return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
    }
    if (numero.length === 10) {
      return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
    }
    return String(telefone || '');
  }

  /**
   * Gera link de Click to Chat
   * @param {string} telefone - Número da barbearia (só números com DDI)
   * @param {string} mensagem - Mensagem padrão
   * @returns {string} Link para WhatsApp
   */
  static gerarLink(telefone, mensagem = '') {
    const numeroLimpo = this.limparTelefone(telefone);
    if (!numeroLimpo) return null;
    
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
    return this.templateAgendamentoBarbearia(dados);
  }

  static templateAgendamentoCliente(dados) {
    const {
      nomeCliente,
      servico,
      data,
      hora,
      nomeBarbearia,
      enderecoBarbearia,
      barbeiroNome,
    } = dados;

    const dataFormatada = this.formatarDataCurtaBR(data);
    const profissional = barbeiroNome ? `\n*Profissional:* ${barbeiroNome}` : '';
    const endereco = enderecoBarbearia ? `\n*Local:* ${enderecoBarbearia}` : '';

    return `Olá ${nomeCliente || 'cliente'}! Seu agendamento na *${nomeBarbearia || 'barbearia'}* foi confirmado.

*Serviço:* ${servico || 'Serviço agendado'}
*Data:* ${dataFormatada}
*Hora:* ${hora || '--:--'}${profissional}${endereco}

Se precisar ajustar ou remarcar, é só responder por aqui.`;
  }

  static templateAgendamentoBarbearia(dados) {
    const {
      nomeCliente,
      telefoneCliente,
      servico,
      data,
      hora,
      nomeBarbearia,
      enderecoBarbearia,
      barbeiroNome,
    } = dados;

    const dataFormatada = this.formatarDataBR(data);
    const profissional = barbeiroNome ? `\n*Profissional:* ${barbeiroNome}` : '';
    const endereco = enderecoBarbearia ? `\n*Endereço:* ${enderecoBarbearia}` : '';
    const telefone = telefoneCliente ? `\n*Telefone cliente:* ${this.formatarTelefone(telefoneCliente)}` : '';

    return `Novo agendamento pelo site na *${nomeBarbearia || 'barbearia'}*.

*Cliente:* ${nomeCliente || 'Cliente'}${telefone}
*Serviço:* ${servico || 'Serviço agendado'}
*Data:* ${dataFormatada}
*Hora:* ${hora || '--:--'}${profissional}${endereco}

Origem: site`;
  }

  static templateSolicitarAvaliacaoCliente(dados) {
    const {
      nomeCliente,
      servico,
      nomeBarbearia,
      data,
      hora,
    } = dados;

    const dataFormatada = this.formatarDataCurtaBR(data);
    const detalhesAtendimento = [
      servico ? `*Serviço:* ${servico}` : '',
      dataFormatada ? `*Data:* ${dataFormatada}` : '',
      hora ? `*Hora:* ${hora}` : '',
    ].filter(Boolean).join('\n');

    return `Olá ${nomeCliente || 'cliente'}! Seu atendimento na *${nomeBarbearia || 'barbearia'}* foi concluído.${detalhesAtendimento ? `\n\n${detalhesAtendimento}` : ''}\n\nDe *1 a 5*, qual nota você dá para a sua experiência hoje?\n\nResponda apenas com um número:\n*1* - ruim\n*2* - abaixo do esperado\n*3* - bom\n*4* - muito bom\n*5* - excelente`;
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
*Data:* ${this.formatarDataBR(data)}
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
*Data:* ${this.formatarDataBR(data)}
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
    return regex.test(this.limparTelefone(telefone));
  }

  static gerarPayloadAgendamento(dados) {
    const telefoneCliente = String(dados?.telefoneCliente || '');
    const telefoneBarbearia = String(dados?.telefoneBarbearia || '');

    const payload = {
      cliente: null,
      barbearia: null,
    };

    if (telefoneCliente && this.validarTelefone(telefoneCliente)) {
      const mensagemCliente = this.templateAgendamentoCliente(dados);
      payload.cliente = {
        telefone: this.limparTelefone(telefoneCliente),
        mensagem: mensagemCliente,
        link: this.gerarLink(telefoneCliente, mensagemCliente),
      };
    }

    if (telefoneBarbearia && this.validarTelefone(telefoneBarbearia)) {
      const mensagemBarbearia = this.templateAgendamentoBarbearia(dados);
      payload.barbearia = {
        telefone: this.limparTelefone(telefoneBarbearia),
        mensagem: mensagemBarbearia,
        link: this.gerarLink(telefoneBarbearia, mensagemBarbearia),
      };
    }

    return payload;
  }
}

module.exports = WhatsAppService;
