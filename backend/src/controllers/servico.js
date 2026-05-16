const pool = require('../config/database');
const { getBarbeariaSubscriptionAccess } = require('../services/subscriptionAccess');
const { ensureServicoAvailabilitySchema } = require('../services/servicoAvailability');
const { assertBarbeariaOwner, assertServicoOwner } = require('../services/ownership');

// Listar serviços de uma barbearia
async function listServicos(req, res) {
  try {
    const { barbeariaId } = req.params;
    const { ativo, include_inactive } = req.query;

    await ensureServicoAvailabilitySchema();

    const acessoAssinatura = await getBarbeariaSubscriptionAccess(barbeariaId);
    const incluirInativos = String(include_inactive || '').trim() === 'true';

    if (!acessoAssinatura) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }

    if (incluirInativos) {
      await assertBarbeariaOwner(req.auth?.id, barbeariaId);
    }

    if (!acessoAssinatura.managementUnlocked && !incluirInativos && ativo !== 'false') {
      return res.json({ servicos: [] });
    }
    
    let query = 'SELECT * FROM servicos WHERE barbearia_id = $1';
    const params = [barbeariaId];
    
    if (ativo !== undefined) {
      query += ' AND ativo = $2';
      params.push(ativo === 'true');
    } else if (!incluirInativos) {
      query += ' AND ativo = $2';
      params.push(true);
    }
    
    query += ' ORDER BY nome';
    
    const result = await pool.query(query, params);
    res.json({ servicos: result.rows });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao listar serviços' });
  }
}

// Criar serviço
async function createServico(req, res) {
  try {
    const { barbeariaId } = req.params;
    const { nome, descricao, imagem_url, preco, duracao_minutos } = req.body;
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);
    
    if (!nome || !preco) {
      return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }

    const acessoAssinatura = await getBarbeariaSubscriptionAccess(barbeariaId);
    if (!acessoAssinatura) {
      return res.status(404).json({ error: 'Barbearia não encontrada' });
    }

    if (!acessoAssinatura.managementUnlocked) {
      return res.status(403).json({
        error: 'Cadastre uma assinatura para adicionar novos serviços.',
      });
    }
    
    const result = await pool.query(
      `INSERT INTO servicos (barbearia_id, nome, descricao, imagem_url, preco, duracao_minutos)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [barbeariaId, nome, descricao || null, imagem_url || null, preco, duracao_minutos || 30]
    );
    
    res.status(201).json({ servico: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao criar serviço' });
  }
}

// Atualizar serviço
async function updateServico(req, res) {
  try {
    const { id } = req.params;
    const { nome, descricao, imagem_url, preco, duracao_minutos, ativo } = req.body;

    await ensureServicoAvailabilitySchema();
    const servicoAtual = await assertServicoOwner(req.auth?.id, id);
    const acessoAssinatura = await getBarbeariaSubscriptionAccess(servicoAtual.barbearia_id);
    if (!acessoAssinatura?.managementUnlocked) {
      return res.status(403).json({
        error: 'Regularize a assinatura para editar os serviços da barbearia.',
      });
    }
    
    const result = await pool.query(
      `UPDATE servicos SET nome=$1, descricao=$2, imagem_url=$3, preco=$4, duracao_minutos=$5, ativo=$6
       WHERE id=$7 RETURNING *`,
      [nome, descricao, imagem_url || null, preco, duracao_minutos, ativo !== undefined ? ativo : true, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    res.json({ servico: result.rows[0] });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'SERVICO_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao atualizar serviço' });
  }
}

// Deletar (desativar) serviço
async function deleteServico(req, res) {
  try {
    const { id } = req.params;

    await ensureServicoAvailabilitySchema();
    const servicoAtual = await assertServicoOwner(req.auth?.id, id);
    const acessoAssinatura = await getBarbeariaSubscriptionAccess(servicoAtual.barbearia_id);
    if (!acessoAssinatura?.managementUnlocked) {
      return res.status(403).json({
        error: 'Regularize a assinatura para alterar o catálogo de serviços.',
      });
    }
    
    const result = await pool.query(
      'UPDATE servicos SET ativo = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    res.json({ message: 'Serviço removido com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    const status = error?.code === 'SERVICO_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao remover serviço' });
  }
}

module.exports = { listServicos, createServico, updateServico, deleteServico };
