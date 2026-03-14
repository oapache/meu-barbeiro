const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'placeholder'
);

/**
 * GET /api/barbearias
 * Lista todas as barbearias
 */
async function listBarbearias(req, res) {
  try {
    const { data, error } = await supabase
      .from('barbearias')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ barbearias: data });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao listar barbearias' });
  }
}

/**
 * POST /api/barbearias
 * Cria nova barbearia
 */
async function createBarbearia(req, res) {
  try {
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, usuario_id } = req.body;
    
    if (!nome || !usuario_id) {
      return res.status(400).json({ error: 'Nome e usuário são obrigatórios' });
    }
    
    const { data, error } = await supabase
      .from('barbearias')
      .insert([{
        nome,
        telefone: telefone || '',
        endereco: endereco || '',
        horario_abertura: horario_abertura || '09:00',
        horario_fechamento: horario_fechamento || '20:00',
        usuario_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({ barbearia: data });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar barbearia' });
  }
}

/**
 * GET /api/barbearias/:id
 * Retorna uma barbearia pelo ID
 */
async function getBarbearia(req, res) {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('barbearias')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Barbearia não encontrada' });
    
    res.json({ barbearia: data });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar barbearia' });
  }
}

/**
 * PUT /api/barbearias/:id
 * Atualiza uma barbearia
 */
async function updateBarbearia(req, res) {
  try {
    const { id } = req.params;
    const { nome, telefone, endereco, horario_abertura, horario_fechamento, whatsapp_link } = req.body;
    
    const { data, error } = await supabase
      .from('barbearias')
      .update({
        nome,
        telefone,
        endereco,
        horario_abertura,
        horario_fechamento,
        whatsapp_link,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ barbearia: data });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao atualizar barbearia' });
  }
}

/**
 * DELETE /api/barbearias/:id
 * Remove uma barbearia
 */
async function deleteBarbearia(req, res) {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('barbearias')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ message: 'Barbearia removida com sucesso' });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao remover barbearia' });
  }
}

module.exports = {
  listBarbearias,
  createBarbearia,
  getBarbearia,
  updateBarbearia,
  deleteBarbearia
};
