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
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold">{barbearia?.nome || 'Minha Barbearia'}</h1>
            <p className="text-xs text-zinc-400">Bem-vindo, {user?.nome || 'Barbeiro'}</p>
          </div>
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
      </header>

      {/* Tabs */}
      <div className="bg-zinc-900/60 border-b border-zinc-800">
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
              <Link href="/barberia/configurar" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" />
                Novo
              </Link>
            </div>

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
