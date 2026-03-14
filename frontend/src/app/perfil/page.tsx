'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { User, Calendar, Star, Settings, LogOut, Clock, MapPin } from 'lucide-react'

export default function PerfilPage() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('agendamentos')

  // Dados mockados
  const agendamentos = [
    { id: 1, barbearia: 'Barbearia do João', servico: 'Corte Masculino', data: '2026-03-10', hora: '14:00', status: 'concluido' },
    { id: 2, barbearia: 'Barbearia Moderno', servico: 'Barba', data: '2026-02-28', hora: '10:00', status: 'concluido' },
    { id: 3, barbearia: 'Barbearia do João', servico: 'Corte + Barba', data: '2026-03-20', hora: '15:00', status: 'agendado' },
  ]

  const fidelidade = {
    pontos: 150,
    proximoPremio: 200,
    cortesGratis: 1,
    historico: [
      { pontos: 50, motivo: 'Corte Masculino', data: '10/03/2026' },
      { pontos: 30, motivo: 'Barba', data: '28/02/2026' },
      { pontos: 70, motivo: 'Corte + Barba', data: '15/02/2026' },
    ]
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [authLoading, isAuthenticated])

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
      <header className="fixed top-0 w-full bg-black border-b border-white/10 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold">Meu Perfil</h1>
          <button onClick={handleLogout} className="text-zinc-400">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Perfil */}
      <section className="pt-20 px-4 pb-6">
        <div className="max-w-2xl mx-auto">
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
      </section>

      {/* Fidelidade */}
      <section className="px-4 pb-6">
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl p-4 border border-amber-500/30">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm text-amber-400">Programa de Fidelidade</p>
              <p className="text-2xl font-bold">{fidelidade.pontos} pontos</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Próximo prêmio</p>
              <p className="font-medium">{fidelidade.proximoPremio - fidelidade.pontos} pontos</p>
            </div>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div 
              className="bg-amber-500 h-2 rounded-full" 
              style={{ width: `${(fidelidade.pontos / fidelidade.proximoPremio) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            {fidelidade.cortesGratis} corte{ fidelidade.cortesGratis !== 1 ? 's' : '' } grátis disponível{fidelidade.cortesGratis !== 1 ? 's' : ''}!
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'agendamentos' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Agendamentos
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'historico' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            <Star className="w-4 h-4" />
            Histórico
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'agendamentos' && (
          <div className="space-y-3">
            {agendamentos.map((agenda) => (
              <div key={agenda.id} className="bg-zinc-900 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{agenda.barbearia}</p>
                    <p className="text-sm text-zinc-400">{agenda.servico}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    agenda.status === 'agendado' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {agenda.status === 'agendado' ? 'Agendado' : 'Concluído'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
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
            {fidelidade.historico.map((item, index) => (
              <div key={index} className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.motivo}</p>
                  <p className="text-sm text-zinc-400">{item.data}</p>
                </div>
                <span className="text-amber-400 font-bold">+{item.pontos}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2">
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
