'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { listLocalAgendamentos } from '@/lib/agendamentos'
import { Calendar, Users, Scissors, Plus, CheckCircle, XCircle, Clock, Settings, Store } from 'lucide-react'

type StatusAgenda = 'confirmado' | 'pendente' | 'cancelado'

type Agendamento = {
  id: string | number
  cliente_nome: string
  servico: string
  hora: string
  status: StatusAgenda
  data: string
}

type Servico = {
  id: number
  nome: string
  preco: number
  duracao: number
}

type AuthUser = {
  id?: string | number
  nome?: string
  tipo?: string
}

type BarbeariaPerfil = {
  id: string | number
  nome: string
  usuario_id?: string | number
}

type TipoServicoInline = 'cabelo' | 'cabelo_sobrancelha' | 'barba' | 'cabelo_barba' | 'corte_feminino'

const SERVICO_POR_TIPO_INLINE: Record<TipoServicoInline, { nome: string }> = {
  cabelo: { nome: 'Cabelo' },
  cabelo_sobrancelha: { nome: 'Cabelo + Sobrancelha' },
  barba: { nome: 'Barba' },
  cabelo_barba: { nome: 'Cabelo + Barba' },
  corte_feminino: { nome: 'Corte Feminino' },
}

type AuthState = {
  user?: AuthUser
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

export default function BarbeariaDashboard() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth() as AuthState
  const [activeTab, setActiveTab] = useState('agenda')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbearia, setBarbearia] = useState<BarbeariaPerfil | null>(null)
  const [mostrarNovoServico, setMostrarNovoServico] = useState(false)
  const [novoServico, setNovoServico] = useState({
    tipo: 'cabelo' as TipoServicoInline,
    preco: '',
    duracao: '40',
  })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }

    if (user?.tipo === 'cliente') {
      window.location.href = '/perfil'
      return
    }

    const carregarDashboard = async () => {
      try {
        setLoading(true)
        setErro('')

        const respostaBarbearias = await ApiService.listBarbearias()
        const listaBarbearias = Array.isArray(respostaBarbearias?.barbearias) ? respostaBarbearias.barbearias : []

        const barbeariaDoUsuario = listaBarbearias.find((item: any) => String(item?.usuario_id) === String(user?.id)) || null
        setBarbearia(barbeariaDoUsuario)

        if (!barbeariaDoUsuario) {
          setAgendamentos([])
          setServicos([])
          return
        }

        const locais = listLocalAgendamentos()
          .filter((item) => item?.barbearia_nome === barbeariaDoUsuario.nome)
          .map((item) => ({
            id: item.id,
            cliente_nome: item.cliente_nome || 'Cliente',
            servico: item.servico_nome || 'Servico agendado',
            hora: item.hora,
            status: (item.status === 'agendado' ? 'pendente' : 'confirmado') as StatusAgenda,
            data: item.data,
          }))

        setAgendamentos(locais)

        try {
          const respostaServicos = await ApiService.listServicos(barbeariaDoUsuario.id)
          const listaServicos = Array.isArray(respostaServicos?.servicos) ? respostaServicos.servicos : []

          setServicos(
            listaServicos.map((servico: any) => ({
              id: servico.id,
              nome: servico.nome,
              preco: Number(servico.preco || 0),
              duracao: Number(servico.duracao_minutos || 0),
            }))
          )
        } catch {
          setServicos([])
        }
      } catch {
        setErro('Nao foi possivel carregar os dados da sua barbearia agora.')
      } finally {
        setLoading(false)
      }
    }

    carregarDashboard()
  }, [authLoading, isAuthenticated, user?.tipo])

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const getStatusColor = (status: StatusAgenda) => {
    switch (status) {
      case 'confirmado': return 'bg-green-500'
      case 'pendente': return 'bg-yellow-500'
      case 'cancelado': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: StatusAgenda) => {
    switch (status) {
      case 'confirmado': return <CheckCircle className="w-4 h-4" />
      case 'pendente': return <Clock className="w-4 h-4" />
      case 'cancelado': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const criarServicoInline = async () => {
    if (!barbearia?.id) {
      setErro('Cadastre sua barbearia antes de criar servicos.')
      return
    }

    const preco = Number(String(novoServico.preco).replace(',', '.'))
    const duracao = Number(novoServico.duracao)

    if (Number.isNaN(preco) || preco <= 0) {
      setErro('Informe um valor valido para o servico.')
      return
    }

    if (Number.isNaN(duracao) || duracao <= 0) {
      setErro('Informe uma duracao valida em minutos.')
      return
    }

    const nome = SERVICO_POR_TIPO_INLINE[novoServico.tipo].nome

    try {
      const resposta = await ApiService.createServico(barbearia.id, {
        nome,
        descricao: `Servico ${nome}`,
        preco,
        duracao_minutos: duracao,
      })

      const criado = resposta?.servico
      if (criado) {
        setServicos((prev) => [
          ...prev,
          {
            id: criado.id,
            nome: criado.nome,
            preco: Number(criado.preco || preco),
            duracao: Number(criado.duracao_minutos || duracao),
          },
        ])
      }

      setNovoServico({ tipo: 'cabelo', preco: '', duracao: '40' })
      setMostrarNovoServico(false)
      setErro('')
    } catch (error: any) {
      setErro(error?.message || 'Nao foi possivel criar o servico.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                <span className="text-lg font-bold">Meu Barbeiro</span>
              </Link>
              <div className="hidden md:block border-l border-zinc-700 pl-3 min-w-0">
                <h1 className="text-base font-semibold truncate">{barbearia?.nome || 'Minha Barbearia'}</h1>
                <p className="text-xs text-zinc-400">Bem-vindo, {user?.nome || 'Barbeiro'}</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-5 text-sm">
              <Link href="/" className="text-zinc-300 hover:text-white transition">Início</Link>
              <Link href="/buscar" className="text-zinc-300 hover:text-white transition">Buscar</Link>
              <Link href="/barbearia" className="text-white font-medium">Barbearia</Link>
            </nav>

            <div className="flex items-center gap-2">
              <Link href="/barberia/configurar" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800">
                <Settings className="w-4 h-4" />
                Configurar
              </Link>
              <button onClick={handleLogout} className="text-sm text-zinc-400 hover:text-white">
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-zinc-900/60 border-b border-zinc-800 pt-20">
        <div className="max-w-6xl mx-auto flex gap-2 px-4 py-2">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 ${
              activeTab === 'agenda' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('servicos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 ${
              activeTab === 'servicos' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 ${
              activeTab === 'clientes' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {erro && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {erro}
          </div>
        )}

        {!barbearia && !erro && (
          <div className="mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5 flex items-start gap-3">
            <Store className="w-5 h-5 mt-0.5 text-yellow-300" />
            <div>
              <p className="font-medium text-yellow-100">Voce ainda nao tem uma barbearia cadastrada.</p>
              <p className="text-sm text-yellow-200/80 mt-1">Acesse Configurar para criar sua barbearia e cadastrar seus servicos.</p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Agendamentos</p>
            <p className="text-2xl font-bold mt-1">{agendamentos.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Servicos</p>
            <p className="text-2xl font-bold mt-1">{servicos.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Pendentes</p>
            <p className="text-2xl font-bold mt-1">{agendamentos.filter((a) => a.status === 'pendente').length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Confirmados</p>
            <p className="text-2xl font-bold mt-1">{agendamentos.filter((a) => a.status === 'confirmado').length}</p>
          </div>
        </div>

        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Hoje - 14/03</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium" disabled>
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>

            {agendamentos.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Nenhum agendamento encontrado ainda.
              </div>
            )}

            {agendamentos.map((agenda) => (
              <div key={agenda.id} className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{agenda.cliente_nome}</p>
                  <p className="text-sm text-zinc-400">{agenda.servico}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{agenda.hora}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(agenda.status)} text-white`}>
                    {getStatusIcon(agenda.status)}
                    {agenda.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Meus Serviços</h2>
              <button
                onClick={() => setMostrarNovoServico((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>

            {mostrarNovoServico && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
                <p className="text-sm text-zinc-300">Criar novo servico sem sair desta pagina</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <select
                    value={novoServico.tipo}
                    onChange={(e) => setNovoServico((prev) => ({ ...prev, tipo: e.target.value as TipoServicoInline }))}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                  >
                    <option value="cabelo">Cabelo</option>
                    <option value="cabelo_sobrancelha">Cabelo + Sobrancelha</option>
                    <option value="barba">Barba</option>
                    <option value="cabelo_barba">Cabelo + Barba</option>
                    <option value="corte_feminino">Corte Feminino</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={novoServico.preco}
                    onChange={(e) => setNovoServico((prev) => ({ ...prev, preco: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                    placeholder="Valor do corte"
                  />
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={novoServico.duracao}
                    onChange={(e) => setNovoServico((prev) => ({ ...prev, duracao: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                    placeholder="Duracao (min)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={criarServicoInline}
                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium"
                  >
                    Salvar servico
                  </button>
                  <button
                    onClick={() => setMostrarNovoServico(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-700 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {servicos.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Nenhum servico cadastrado. Clique em Novo para adicionar seu primeiro servico.
              </div>
            )}

            {servicos.map((servico) => (
              <div key={servico.id} className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{servico.nome}</p>
                  <p className="text-sm text-zinc-400">{servico.duracao} min</p>
                </div>
                <p className="font-bold">R$ {servico.preco}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="text-center py-12 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cliente cadastrado ainda.</p>
            <p className="text-sm mt-2">Os clientes aparecem quando fazem um agendamento.</p>
          </div>
        )}
      </div>
    </main>
  )
}
