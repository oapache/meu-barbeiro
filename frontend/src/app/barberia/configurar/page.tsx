'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { Save, Upload, Phone, MapPin, Clock } from 'lucide-react'

type UsuarioLogado = {
  id?: string | number
}

type FormBarbearia = {
  nome: string
  telefone: string
  whatsapp: string
  endereco: string
  horario_abertura: string
  horario_fechamento: string
  logo_url: string
}

export default function ConfigurarPage() {
  const router = useRouter()
  const { user } = useAuth() as { user?: UsuarioLogado }
  const [loading, setLoading] = useState(false)
  const [loadingInicial, setLoadingInicial] = useState(true)
  const [message, setMessage] = useState('')
  const [barbeariaId, setBarbeariaId] = useState<string | number | null>(null)

  const [form, setForm] = useState<FormBarbearia>({
    nome: '',
    telefone: '',
    whatsapp: '',
    endereco: '',
    horario_abertura: '',
    horario_fechamento: '',
    logo_url: '',
  })

  useEffect(() => {
    const carregarBarbearia = async () => {
      if (!user?.id) {
        setLoadingInicial(false)
        return
      }

      try {
        const resposta = await ApiService.listBarbearias()
        const lista = Array.isArray(resposta?.barbearias) ? resposta.barbearias : []
        const atual = lista.find((item: any) => String(item?.usuario_id) === String(user.id))

        if (atual) {
          setBarbeariaId(atual.id)
          setForm({
            nome: atual.nome || '',
            telefone: atual.telefone || '',
            whatsapp: atual.whatsapp_link || '',
            endereco: atual.endereco || '',
            horario_abertura: atual.horario_abertura || '',
            horario_fechamento: atual.horario_fechamento || '',
            logo_url: atual.logo_url || '',
          })
        }
      } catch {
        setMessage('Nao foi possivel carregar os dados atuais da barbearia.')
      } finally {
        setLoadingInicial(false)
      }
    }

    carregarBarbearia()
  }, [user?.id])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const payload = {
        nome: form.nome,
        telefone: form.telefone,
        endereco: form.endereco,
        horario_abertura: form.horario_abertura || '09:00',
        horario_fechamento: form.horario_fechamento || '20:00',
        usuario_id: user?.id,
        logo_url: form.logo_url || null,
        whatsapp_link: form.whatsapp || null,
      }

      if (!form.nome.trim()) {
        throw new Error('Informe o nome da barbearia.')
      }

      if (!user?.id) {
        throw new Error('Usuario invalido para salvar barbearia.')
      }

      if (barbeariaId) {
        await ApiService.updateBarbearia(barbeariaId, payload)
      } else {
        const criado = await ApiService.createBarbearia(payload)
        const novoId = criado?.barbearia?.id
        if (novoId) {
          setBarbeariaId(novoId)
        }
      }

      setMessage('Salvo com sucesso!')
    } catch (error: any) {
      setMessage(error?.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setForm({ ...form, logo_url: url })
    }
  }

  if (loadingInicial) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-300">Carregando configuracoes...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg md:text-2xl font-bold">Configurar Barbearia</h1>
          <button
            onClick={() => router.push('/barbearia')}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Voltar
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg ${
            message.includes('sucesso') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-xl p-6 sticky top-6">
              <h2 className="font-medium mb-4">Logo da Barbearia</h2>

              <div className="w-28 h-28 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden mb-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-sm text-center px-2">Sem logo</span>
                )}
              </div>

              <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition w-fit">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Alterar logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-zinc-500 mt-2">PNG, JPG ate 5MB</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium">Dados da Barbearia</h2>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Ex: Barbearia Alfa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="(11) 99999-9999"
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
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="5511999999999"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereco
                </label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Rua, numero, bairro, cidade"
                />
              </div>
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horarios de Funcionamento
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Abertura</label>
                  <input
                    type="time"
                    value={form.horario_abertura}
                    onChange={(e) => setForm({ ...form, horario_abertura: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Fechamento</label>
                  <input
                    type="time"
                    value={form.horario_fechamento}
                    onChange={(e) => setForm({ ...form, horario_fechamento: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
