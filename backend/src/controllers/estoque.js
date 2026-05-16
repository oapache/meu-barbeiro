const pool = require('../config/database');
const { assertBarbeariaOwner } = require('../services/ownership');
const { ensureEstoqueSchema } = require('../services/estoqueSchema');

const TIPOS_POSITIVOS = new Set(['entrada', 'compra']);
const TIPOS_NEGATIVOS = new Set(['saida', 'consumo', 'perda', 'venda']);
const TIPOS_SUPORTADOS = new Set(['entrada', 'compra', 'saida', 'consumo', 'perda', 'ajuste', 'venda']);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizarTexto(value) {
  return String(value || '').trim();
}

function normalizarDecimal(value, fallback = 0) {
  return Number(toNumber(value, fallback).toFixed(2));
}

function serializarProduto(row) {
  if (!row) return row;
  const estoqueAtual = normalizarDecimal(row.estoque_atual);
  const estoqueMinimo = normalizarDecimal(row.estoque_minimo);
  const quantidadeItem = Math.max(0, normalizarDecimal(row.quantidade_item, 1));

  return {
    ...row,
    quantidade_item: quantidadeItem,
    estoque_atual: estoqueAtual,
    estoque_minimo: estoqueMinimo,
    custo_unitario: normalizarDecimal(row.custo_unitario),
    preco_venda: normalizarDecimal(row.preco_venda),
    estoque_baixo: estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo,
    sem_estoque: estoqueAtual <= 0,
  };
}

function serializarMovimentacao(row) {
  if (!row) return row;
  return {
    ...row,
    quantidade: normalizarDecimal(row.quantidade),
    custo_unitario: row.custo_unitario === null || row.custo_unitario === undefined ? null : normalizarDecimal(row.custo_unitario),
    preco_unitario: row.preco_unitario === null || row.preco_unitario === undefined ? null : normalizarDecimal(row.preco_unitario),
    valor_total: row.valor_total === null || row.valor_total === undefined ? null : normalizarDecimal(row.valor_total),
    estoque_anterior: row.estoque_anterior === null || row.estoque_anterior === undefined ? null : normalizarDecimal(row.estoque_anterior),
    estoque_posterior: row.estoque_posterior === null || row.estoque_posterior === undefined ? null : normalizarDecimal(row.estoque_posterior),
  };
}

async function getProdutoForUpdate(client, userId, produtoId) {
  const result = await client.query(
    `SELECT p.*
     FROM estoque_produtos p
     WHERE p.id = $1
     LIMIT 1
     FOR UPDATE`,
    [produtoId]
  );

  const produto = result.rows[0];

  if (!produto) {
    const error = new Error('Voce nao tem permissao para alterar este produto do estoque.')
    error.code = 'ESTOQUE_PRODUTO_FORBIDDEN'
    throw error
  }

  await assertBarbeariaOwner(userId, produto.barbearia_id);
  return produto;
}

async function listResumo(req, res) {
  try {
    await ensureEstoqueSchema();

    const { barbeariaId } = req.params;
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);

    const [metricasResult, movimentosResult] = await Promise.all([
      pool.query(
        `SELECT
           SUM(CASE WHEN ativo = true THEN 1 ELSE 0 END) AS total_produtos,
           SUM(CASE WHEN ativo = true AND estoque_atual <= 0 THEN 1 ELSE 0 END) AS sem_estoque,
           SUM(CASE WHEN ativo = true AND estoque_minimo > 0 AND estoque_atual <= estoque_minimo THEN 1 ELSE 0 END) AS estoque_baixo,
           COALESCE(SUM(CASE WHEN ativo = true THEN estoque_atual * custo_unitario ELSE 0 END), 0)::numeric(10,2) AS valor_total_estoque
         FROM estoque_produtos
         WHERE barbearia_id = $1`,
        [barbeariaId]
      ),
      pool.query(
        `SELECT m.*, p.nome AS produto_nome
         FROM estoque_movimentacoes m
         INNER JOIN estoque_produtos p ON p.id = m.produto_id
         WHERE m.barbearia_id = $1
         ORDER BY m.created_at DESC
         LIMIT 8`,
        [barbeariaId]
      ),
    ]);

    const metricas = metricasResult.rows[0] || {};
    res.json({
      resumo: {
        total_produtos: Number(metricas.total_produtos || 0),
        estoque_baixo: Number(metricas.estoque_baixo || 0),
        sem_estoque: Number(metricas.sem_estoque || 0),
        valor_total_estoque: normalizarDecimal(metricas.valor_total_estoque),
      },
      movimentacoes_recentes: movimentosResult.rows.map(serializarMovimentacao),
    });
  } catch (error) {
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao carregar resumo do estoque.' });
  }
}

async function listProdutos(req, res) {
  try {
    await ensureEstoqueSchema();

    const { barbeariaId } = req.params;
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);

    const { q, status, include_inactive } = req.query;
    const params = [barbeariaId];
    let idx = 2;
    let query = `
      SELECT *
      FROM estoque_produtos
      WHERE barbearia_id = $1
    `;

    if (String(include_inactive || '').trim() !== 'true') {
      query += ' AND ativo = true';
    }

    if (normalizarTexto(q)) {
      query += ` AND (
        nome ILIKE $${idx}
        OR COALESCE(sku, '') ILIKE $${idx}
        OR COALESCE(categoria, '') ILIKE $${idx}
        OR COALESCE(fornecedor, '') ILIKE $${idx}
      )`;
      params.push(`%${normalizarTexto(q)}%`);
      idx += 1;
    }

    if (status === 'low') {
      query += ' AND estoque_minimo > 0 AND estoque_atual <= estoque_minimo';
    } else if (status === 'out') {
      query += ' AND estoque_atual <= 0';
    }

    query += ' ORDER BY ativo DESC, updated_at DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json({ produtos: result.rows.map(serializarProduto) });
  } catch (error) {
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao listar produtos do estoque.' });
  }
}

async function createProduto(req, res) {
  const client = await pool.connect();

  try {
    await ensureEstoqueSchema();

    const { barbeariaId } = req.params;
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);

    const nome = normalizarTexto(req.body?.nome);
    if (!nome) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    const quantidadeItem = Math.max(0, normalizarDecimal(req.body?.quantidade_item, 1));
    const estoqueInicial = Math.max(0, normalizarDecimal(req.body?.estoque_atual));
    const custoUnitario = Math.max(0, normalizarDecimal(req.body?.custo_unitario));

    await client.query('BEGIN');

    const produtoResult = await client.query(
      `INSERT INTO estoque_produtos (
         barbearia_id, nome, sku, categoria, descricao, imagem_url, quantidade_item, unidade,
         estoque_atual, estoque_minimo, custo_unitario, preco_venda, fornecedor, localizacao, observacoes, ativo, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,NOW())
       RETURNING *`,
      [
        barbeariaId,
        nome,
        normalizarTexto(req.body?.sku) || null,
        normalizarTexto(req.body?.categoria) || null,
        normalizarTexto(req.body?.descricao) || null,
        normalizarTexto(req.body?.imagem_url) || null,
        quantidadeItem,
        normalizarTexto(req.body?.unidade) || 'un',
        estoqueInicial,
        Math.max(0, normalizarDecimal(req.body?.estoque_minimo)),
        custoUnitario,
        Math.max(0, normalizarDecimal(req.body?.preco_venda)),
        normalizarTexto(req.body?.fornecedor) || null,
        normalizarTexto(req.body?.localizacao) || null,
        normalizarTexto(req.body?.observacoes) || null,
      ]
    );

    const produto = produtoResult.rows[0];

    if (estoqueInicial > 0) {
      await client.query(
        `INSERT INTO estoque_movimentacoes (
           barbearia_id, produto_id, tipo, quantidade, custo_unitario, valor_total,
           estoque_anterior, estoque_posterior, motivo, referencia_tipo, observacoes, created_by
         )
         VALUES ($1,$2,'entrada',$3,$4,$5,0,$3,$6,'produto_inicial',$7,$8)`,
        [
          barbeariaId,
          produto.id,
          estoqueInicial,
          custoUnitario,
          normalizarDecimal(estoqueInicial * custoUnitario),
          'Estoque inicial do produto',
          'create_product',
          req.auth?.id || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ produto: serializarProduto(produto) });
  } catch (error) {
    await client.query('ROLLBACK');
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao criar produto do estoque.' });
  } finally {
    client.release();
  }
}

async function updateProduto(req, res) {
  const client = await pool.connect()

  try {
    await ensureEstoqueSchema();

    const { id } = req.params;
    await client.query('BEGIN')
    const produtoAtual = await getProdutoForUpdate(client, req.auth?.id, id)

    const nome = normalizarTexto(req.body?.nome || produtoAtual.nome);
    if (!nome) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    const estoqueAnterior = normalizarDecimal(produtoAtual.estoque_atual)
    const estoqueAtualizado = Math.max(0, normalizarDecimal(req.body?.estoque_atual, estoqueAnterior))
    const custoUnitario = Math.max(0, normalizarDecimal(req.body?.custo_unitario, produtoAtual.custo_unitario))
    const quantidadeItem = Math.max(0, normalizarDecimal(req.body?.quantidade_item, produtoAtual.quantidade_item || 1))

    const result = await client.query(
      `UPDATE estoque_produtos
       SET nome = $1,
           sku = $2,
           categoria = $3,
           descricao = $4,
           imagem_url = $5,
           quantidade_item = $6,
           unidade = $7,
           estoque_atual = $8,
           estoque_minimo = $9,
           custo_unitario = $10,
           preco_venda = $11,
           fornecedor = $12,
           localizacao = $13,
           observacoes = $14,
           ativo = $15,
           updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        nome,
        normalizarTexto(req.body?.sku) || null,
        normalizarTexto(req.body?.categoria) || null,
        normalizarTexto(req.body?.descricao) || null,
        normalizarTexto(req.body?.imagem_url) || null,
        quantidadeItem,
        normalizarTexto(req.body?.unidade) || produtoAtual.unidade || 'un',
        estoqueAtualizado,
        Math.max(0, normalizarDecimal(req.body?.estoque_minimo, produtoAtual.estoque_minimo)),
        custoUnitario,
        Math.max(0, normalizarDecimal(req.body?.preco_venda, produtoAtual.preco_venda)),
        normalizarTexto(req.body?.fornecedor) || null,
        normalizarTexto(req.body?.localizacao) || null,
        normalizarTexto(req.body?.observacoes) || null,
        req.body?.ativo === undefined ? produtoAtual.ativo !== false : req.body?.ativo !== false,
        id,
      ]
    );

    if (estoqueAtualizado !== estoqueAnterior) {
      await client.query(
        `INSERT INTO estoque_movimentacoes (
           barbearia_id, produto_id, tipo, quantidade, custo_unitario, valor_total,
           estoque_anterior, estoque_posterior, motivo, referencia_tipo, observacoes, created_by
         )
         VALUES ($1,$2,'ajuste',$3,$4,$5,$6,$7,$8,'update_product',$9,$10)`,
        [
          produtoAtual.barbearia_id,
          id,
          Math.abs(normalizarDecimal(estoqueAtualizado - estoqueAnterior)),
          custoUnitario,
          normalizarDecimal(Math.abs(estoqueAtualizado - estoqueAnterior) * custoUnitario),
          estoqueAnterior,
          estoqueAtualizado,
          'Ajuste manual pelo cadastro do produto',
          normalizarTexto(req.body?.observacoes) || null,
          req.auth?.id || null,
        ]
      )
    }

    await client.query('COMMIT')
    res.json({ produto: serializarProduto(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK')
    const status = error?.code === 'ESTOQUE_PRODUTO_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao atualizar produto do estoque.' });
  } finally {
    client.release()
  }
}

async function deleteProduto(req, res) {
  const client = await pool.connect()

  try {
    await ensureEstoqueSchema();

    const { id } = req.params;
    await client.query('BEGIN')
    const produtoAtual = await getProdutoForUpdate(client, req.auth?.id, id)

    if (normalizarDecimal(produtoAtual.estoque_atual) > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Zere o estoque deste item antes de inativar para manter o histórico correto.' })
    }

    const result = await client.query(
      `UPDATE estoque_produtos
       SET ativo = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT')
    res.json({ produto: serializarProduto(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK')
    const status = error?.code === 'ESTOQUE_PRODUTO_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao inativar produto do estoque.' });
  } finally {
    client.release()
  }
}

async function createMovimentacao(req, res) {
  const client = await pool.connect();

  try {
    await ensureEstoqueSchema();

    const { id } = req.params;
    const tipo = normalizarTexto(req.body?.tipo).toLowerCase();

    if (!TIPOS_SUPORTADOS.has(tipo)) {
      return res.status(400).json({ error: 'Tipo de movimentação inválido.' });
    }

    await client.query('BEGIN');
    const produtoAtual = await getProdutoForUpdate(client, req.auth?.id, id)
    const quantidadeInformada = normalizarDecimal(req.body?.quantidade);
    const estoqueAtual = normalizarDecimal(produtoAtual.estoque_atual);

    let delta = 0;
    if (TIPOS_POSITIVOS.has(tipo)) {
      delta = Math.abs(quantidadeInformada);
    } else if (TIPOS_NEGATIVOS.has(tipo)) {
      delta = -Math.abs(quantidadeInformada);
    } else {
      if (req.body?.estoque_final !== undefined) {
        delta = normalizarDecimal(req.body?.estoque_final) - estoqueAtual;
      } else {
        delta = quantidadeInformada;
      }
    }

    const estoquePosterior = normalizarDecimal(estoqueAtual + delta);
    if (estoquePosterior < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A movimentação deixaria o estoque negativo.' });
    }

    const quantidadeAbsoluta = Math.abs(delta);
    if (quantidadeAbsoluta <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Informe uma quantidade válida para movimentar.' });
    }

    const custoUnitario = req.body?.custo_unitario === undefined
      ? normalizarDecimal(produtoAtual.custo_unitario)
      : Math.max(0, normalizarDecimal(req.body?.custo_unitario));
    const precoUnitario = tipo === 'venda'
      ? (
          req.body?.preco_unitario === undefined
            ? Math.max(0, normalizarDecimal(produtoAtual.preco_venda))
            : Math.max(0, normalizarDecimal(req.body?.preco_unitario))
        )
      : (req.body?.preco_unitario === undefined ? null : Math.max(0, normalizarDecimal(req.body?.preco_unitario)));
    const valorTotal = tipo === 'venda'
      ? normalizarDecimal(quantidadeAbsoluta * Number(precoUnitario || 0))
      : normalizarDecimal(quantidadeAbsoluta * custoUnitario);
    const movimentadoEm = normalizarTexto(req.body?.movimentado_em) || null;
    const profissionalId = normalizarTexto(req.body?.profissional_id) || null;
    const profissionalNome = normalizarTexto(req.body?.profissional_nome) || null;

    await client.query(
      `UPDATE estoque_produtos
       SET estoque_atual = $1, updated_at = NOW()
       WHERE id = $2`,
      [estoquePosterior, id]
    );

    const movimentacaoResult = await client.query(
      `INSERT INTO estoque_movimentacoes (
         barbearia_id, produto_id, tipo, quantidade, custo_unitario, preco_unitario, valor_total,
         estoque_anterior, estoque_posterior, motivo, referencia_tipo, referencia_id, profissional_id, profissional_nome, movimentado_em, observacoes, created_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        produtoAtual.barbearia_id,
        id,
        tipo,
        quantidadeAbsoluta,
        custoUnitario,
        precoUnitario,
        valorTotal,
        estoqueAtual,
        estoquePosterior,
        normalizarTexto(req.body?.motivo) || null,
        normalizarTexto(req.body?.referencia_tipo) || null,
        normalizarTexto(req.body?.referencia_id) || null,
        profissionalId,
        profissionalNome,
        movimentadoEm,
        normalizarTexto(req.body?.observacoes) || null,
        req.auth?.id || null,
      ]
    );

    const produtoResult = await client.query(
      'SELECT * FROM estoque_produtos WHERE id = $1 LIMIT 1',
      [id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      produto: serializarProduto(produtoResult.rows[0]),
      movimentacao: serializarMovimentacao(movimentacaoResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const status = error?.code === 'ESTOQUE_PRODUTO_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao registrar movimentação do estoque.' });
  } finally {
    client.release();
  }
}

async function listMovimentacoes(req, res) {
  try {
    await ensureEstoqueSchema();

    const { barbeariaId } = req.params;
    await assertBarbeariaOwner(req.auth?.id, barbeariaId);

    const limit = Math.min(1000, Math.max(1, Number(req.query?.limit || 30)));
    const produtoId = normalizarTexto(req.query?.produto_id);
    const params = [barbeariaId];
    let idx = 2;
    let query = `
      SELECT m.*, p.nome AS produto_nome, p.sku AS produto_sku, p.categoria AS produto_categoria
      FROM estoque_movimentacoes m
      INNER JOIN estoque_produtos p ON p.id = m.produto_id
      WHERE m.barbearia_id = $1
    `;

    if (produtoId) {
      query += ` AND m.produto_id = $${idx}`;
      params.push(produtoId);
      idx += 1;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${idx}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ movimentacoes: result.rows.map(serializarMovimentacao) });
  } catch (error) {
    const status = error?.code === 'BARBEARIA_FORBIDDEN' ? 403 : 500;
    res.status(status).json({ error: error?.message || 'Erro ao listar movimentações do estoque.' });
  }
}

module.exports = {
  listResumo,
  listProdutos,
  createProduto,
  updateProduto,
  deleteProduto,
  createMovimentacao,
  listMovimentacoes,
};
