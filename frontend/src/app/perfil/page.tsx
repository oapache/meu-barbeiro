'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { User, Calendar, Star, LogOut, Clock } from 'lucide-react'
import ApiService from '@/services/api'
import { listLocalAgendamentosByCliente } from '@/lib/agendamentos'

type AgendaStatus = 'agendado' | 'concluido' | 'cancelado' | 'pendente'

type AgendaItem = {
  id: string | number
  barbearia_id?: string
  barbearia_nome?: string
  barbearia?: string
  servico_nome?: string
  servico?: string
  data: string
  hora: string
  status: AgendaStatus
  observacoes?: string | null
  cliente_id?: string
}

type AuthUser = {
  id?: string
  nome?: string
  email?: string
  telefone?: string
  tipo?: string
}

type AuthState = {
  user?: AuthUser
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

export default function PerfilPage() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth() as AuthState
  const [activeTab, setActiveTab] = useState('agendamentos')
  const [agendamentos, setAgendamentos] = useState<AgendaItem[]>([])
  const [agendaLoading, setAgendaLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login'
      return
    }

    if (!authLoading && user?.tipo === 'barbeiro') {
      window.location.href = '/barbearia'
    }
  }, [authLoading, isAuthenticated, user?.tipo])

  useEffect(() => {
    const loadAgendamentos = async () => {
      if (!user?.id) {
        setAgendamentos([])
        setAgendaLoading(false)
        return
      }

      setAgendaLoading(true)

      const locais = listLocalAgendamentosByCliente(user.id)

      try {
        const apiResult = await ApiService.listAgendamentos({ cliente_id: user.id })
        const apiList = Array.isArray(apiResult?.agendamentos) ? apiResult.agendamentos : []
        const merged = [...locais, ...apiList]
        const unique = merged.filter((item, index, arr) => arr.findIndex((x) => String(x.id) === String(item.id)) === index)
        setAgendamentos(unique)
      } catch {
        setAgendamentos(locais)
      } finally {
        setAgendaLoading(false)
      }
    }

    if (!authLoading && isAuthenticated) {
      loadAgendamentos()
    }
  }, [authLoading, isAuthenticated, user?.id])

  const proximosAgendamentos = agendamentos.filter((item) => item.status === 'agendado' || item.status === 'pendente')
  const historicoAgendamentos = agendamentos.filter((item) => item.status === 'concluido' || item.status === 'cancelado')

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  if (authLoading) {
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold">Meu Perfil</h1>
          <button onClick={handleLogout} className="text-zinc-400">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <section className="pt-24 px-4 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="bg-zinc-900 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="w-10 h-10 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{user?.nome || 'Cliente'}</h2>
                  <p className="text-zinc-400 text-sm">{user?.email || 'email@exemplo.com'}</p>
                  <p className="text-zinc-400 text-sm">{user?.telefone || '(11) 99999-9999'}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-5 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm text-zinc-400">Resumo de agendamentos</p>
                  <p className="text-3xl font-bold leading-none mt-1">{agendamentos.length}</p>
                  <p className="text-zinc-300 text-xs mt-1">registros no app</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-400">Próximos</p>
                  <p className="font-medium">{proximosAgendamentos.length}</p>
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-white h-2.5 rounded-full"
                  style={{ width: `${agendamentos.length > 0 ? (proximosAgendamentos.length / agendamentos.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-3">
                Programa de fidelidade desativado temporariamente.
              </p>
            </div>
          </aside>

          <div className="lg:col-span-8 bg-zinc-900/70 border border-white/10 rounded-2xl overflow-hidden">
            <div className="border-b border-white/10">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('agendamentos')}
                  className={`flex-1 py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
                    activeTab === 'agendamentos' ? 'border-white text-white bg-zinc-900' : 'border-transparent text-zinc-500'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Agendamentos
                </button>
                <button
                  onClick={() => setActiveTab('historico')}
                  className={`flex-1 py-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
                    activeTab === 'historico' ? 'border-white text-white bg-zinc-900' : 'border-transparent text-zinc-500'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Histórico
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {agendaLoading && (
                <div className="text-sm text-zinc-400">Carregando agendamentos...</div>
              )}

              {activeTab === 'agendamentos' && (
                <div className="space-y-3">
                  {!agendaLoading && proximosAgendamentos.length === 0 && (
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 text-zinc-400 text-sm">
                      Nenhum agendamento próximo.
                    </div>
                  )}

                  {proximosAgendamentos.map((agenda) => (
                    <div key={agenda.id} className="bg-black/30 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-base">{agenda.barbearia_nome || agenda.barbearia || 'Barbearia'}</p>
                          <p className="text-sm text-zinc-400">{agenda.servico_nome || agenda.servico || agenda.observacoes || 'Serviço agendado'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          agenda.status === 'agendado' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {agenda.status === 'agendado' ? 'Agendado' : 'Concluído'}
                        </span>
                      </div>
                      <div className="flex items-center gap-5 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(agenda.data).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {agenda.hora}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'historico' && (
                <div className="space-y-3">
                  {!agendaLoading && historicoAgendamentos.length === 0 && (
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 text-zinc-400 text-sm">
                      Ainda não há histórico concluído/cancelado.
                    </div>
                  )}

                  {historicoAgendamentos.map((item) => (
                    <div key={item.id} className="bg-black/30 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.servico_nome || item.servico || item.observacoes || 'Serviço'}</p>
                        <p className="text-sm text-zinc-400">{new Date(item.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.status === 'cancelado' ? 'text-red-400 bg-red-500/20' : 'text-green-400 bg-green-500/20'}`}>
                        {item.status === 'cancelado' ? 'Cancelado' : 'Concluído'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2 md:hidden">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-zinc-400">
            <span className="text-xs">Início</span>
          </Link>
          <Link href="/buscar" className="flex flex-col items-center gap-1 p-2 text-zinc-400">
            <span className="text-xs">Buscar</span>
          </Link>
          <Link href="/perfil" className="flex flex-col items-center gap-1 p-2 text-white">
            <User className="w-5 h-5" />
            <span className="text-xs">Perfil</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
