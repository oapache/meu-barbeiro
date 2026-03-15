'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { listLocalAgendamentos } from '@/lib/agendamentos'
import { Calendar, Users, Scissors, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'

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
  nome?: string
  tipo?: string
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
    
    const locais = listLocalAgendamentos()
      .filter((item) => item?.barbearia_nome === 'Barbearia do João')
      .map((item) => ({
        id: item.id,
        cliente_nome: item.cliente_nome || 'Cliente',
        servico: item.servico_nome || 'Serviço agendado',
        hora: item.hora,
        status: (item.status === 'agendado' ? 'pendente' : 'confirmado') as StatusAgenda,
        data: item.data,
      }))

    setAgendamentos(locais)
    
    setServicos([
      { id: 1, nome: 'Corte Masculino', preco: 45, duracao: 30 },
      { id: 2, nome: 'Barba', preco: 35, duracao: 20 },
      { id: 3, nome: 'Corte + Barba', preco: 70, duracao: 45 },
    ])
    
    setLoading(false)
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
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Barbearia do João</h1>
            <p className="text-xs text-zinc-400">Bem-vindo, {user?.nome || 'Barbeiro'}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-zinc-400 hover:text-white">
            Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'agenda' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('servicos')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'servicos' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'clientes' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Hoje - 14/03</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>
            
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
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>
            
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

      {/* WhatsApp Flutuante */}
      <div className="fixed bottom-6 right-6">
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    </main>
  )
}
