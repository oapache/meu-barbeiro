'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

export default function ServicosManager() {
  const { user, isAuthenticated } = useAuth()
  const [servicos, setServicos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao_minutos: '30'
  })

  // Dados mockados
  useEffect(() => {
    setServicos([
      { id: 1, nome: 'Corte Masculino', descricao: 'Corte moderno', preco: 45, duracao_minutos: 30, ativo: true },
      { id: 2, nome: 'Barba', descricao: 'Barba completa', preco: 35, duracao_minutos: 20, ativo: true },
      { id: 3, nome: 'Corte + Barba', descricao: 'Combo', preco: 70, duracao_minutos: 45, ativo: true },
    ])
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (editando) {
        // Editar
        setServicos(servicos.map(s => s.id === editando ? { ...s, ...form } : s))
      } else {
        // Criar
        const novo = { ...form, id: Date.now(), ativo: true }
        setServicos([...servicos, novo])
      }
      
      setForm({ nome: '', descricao: '', preco: '', duracao_minutos: '30' })
      setShowForm(false)
      setEditando(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (servico) => {
    setForm({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: servico.preco.toString(),
      duracao_minutos: servico.duracao_minutos.toString()
    })
    setEditando(servico.id)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover este serviço?')) {
      setServicos(servicos.filter(s => s.id !== id))
    }
  }

  const handleToggleAtivo = (id) => {
    setServicos(servicos.map(s => s.id === id ? { ...s, ativo: !s.ativo } : s))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Meus Serviços</h2>
        <button 
          onClick={() => { setShowForm(true); setEditando(null); setForm({ nome: '', descricao: '', preco: '', duracao_minutos: '30' })}}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{editando ? 'Editar Serviço' : 'Novo Serviço'}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditando(null) }} className="text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Nome do serviço</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({...form, nome: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
              placeholder="Corte Masculino"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({...form, descricao: e.target.value})}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
              placeholder="Corte moderno com máquina"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm({...form, preco: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                placeholder="45.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Duração (min)</label>
              <input
                type="number"
                value={form.duracao_minutos}
                onChange={(e) => setForm({...form, duracao_minutos: e.target.value})}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                placeholder="30"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-white text-black rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Salvando...' : editando ? 'Salvar' : 'Criar Serviço'}
          </button>
        </form>
      )}

      {/* Lista de serviços */}
      <div className="space-y-2">
        {servicos.map((servico) => (
          <div key={servico.id} className={`bg-zinc-900 rounded-xl p-4 flex justify-between items-center ${!servico.ativo ? 'opacity-50' : ''}`}>
            <div className="flex-1">
              <p className="font-medium">{servico.nome}</p>
              <p className="text-sm text-zinc-400">{servico.duracao_minutos} min</p>
            </div>
            <p className="font-bold mr-4">R$ {servico.preco}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleToggleAtivo(servico.id)}
                className={`p-2 rounded-lg ${servico.ativo ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                title={servico.ativo ? 'Ativo' : 'Inativo'}
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleEdit(servico)}
                className="p-2 bg-zinc-800 rounded-lg text-zinc-400"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(servico.id)}
                className="p-2 bg-red-500/20 rounded-lg text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
