'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Save, Upload, Phone, MapPin, Clock } from 'lucide-react'

export default function ConfigurarPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const [form, setForm] = useState({
    nome: 'Barbearia do João',
    telefone: '(11) 99999-9999',
    whatsapp: '5511999999999',
    endereco: 'Rua das Barbas, 123 - São Paulo, SP',
    horario_abertura: '09:00',
    horario_fechamento: '20:00',
    logo_url: '/logo.jpg'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage('Salvo com sucesso!')
    } catch (error) {
      setMessage('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Simular upload - em produção, enviar para API
      const url = URL.createObjectURL(file)
      setForm({ ...form, logo_url: url })
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold">Configurar Barbearia</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg ${
            message.includes('sucesso') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo */}
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="font-medium mb-4">Logo da Barbearia</h2>
            
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden">
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              </div>
              
              <div>
                <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Alterar logo</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-zinc-500 mt-2">PNG, JPG até 5MB</p>
              </div>
            </div>
          </div>

          {/* Dados principais */}
          <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
            <h2 className="font-medium">Dados da Barbearia</h2>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({...form, nome: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                WhatsApp
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({...form, whatsapp: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                placeholder="5511999999999"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço
              </label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => setForm({...form, endereco: e.target.value})}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
              />
            </div>
          </div>

          {/* Horários */}
          <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
            <h2 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horários de Funcionamento
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Abertura</label>
                <input
                  type="time"
                  value={form.horario_abertura}
                  onChange={(e) => setForm({...form, horario_abertura: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Fechamento</label>
                <input
                  type="time"
                  value={form.horario_fechamento}
                  onChange={(e) => setForm({...form, horario_fechamento: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Salvar */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </main>
  )
}
