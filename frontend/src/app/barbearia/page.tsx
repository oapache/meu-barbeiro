'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BarbeariaPage() {
  const [activeTab, setActiveTab] = useState<'agenda' | 'servicos' | 'clientes'>('agenda')
  const [barbearia, setBarbearia] = useState(null)
  const [agendamentos, setAgendamentos] = useState([])
  const [servicos, setServicos] = useState([])

  // Mock data - depois substitui por API
  const mockBarbearia = {
    id: '1',
    nome: 'Barbearia do João',
    telefone: '5511999999999',
    whatsapp_link: '5511999999999',
    endereco: 'Rua das Barbas, 123 - São Paulo, SP',
  }

  const mockServicos = [
    { id: 1, nome: 'Corte Masculino', preco: 45, duracao_minutos: 30 },
    { id: 2, nome: 'Barba', preco: 35, duracao_minutos: 20 },
    { id: 3, nome: 'Corte + Barba', preco: 70, duracao_minutos: 45 },
  ]

  const mockAgendamentos = [
    { id: 1, cliente_nome: 'Pedro', servico_nome: 'Corte Masculino', hora: '14:00', status: 'confirmado', data: '2026-03-14' },
    { id: 2, cliente_nome: 'Maria', servico_nome: 'Barba', hora: '15:00', status: 'pendente', data: '2026-03-14' },
    { id: 3, cliente_nome: 'Carlos', servico_nome: 'Corte + Barba', hora: '16:00', status: 'pendente', data: '2026-03-14' },
  ]

  useEffect(() => {
    setBarbearia(mockBarbearia)
    setServicos(mockServicos)
    setAgendamentos(mockAgendamentos)
  }, [])

  const gerarLinkWhatsApp = () => {
    if (!barbearia?.whatsapp_link) return '#'
    const mensagem = encodeURIComponent('Olá! Gostaria de agendar um horário.')
    return `https://wa.me/${barbearia.whatsapp_link.replace(/\D/g, '')}?text=${mensagem}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white px-4 py-4">
        <div className="max-w-sm mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{barbearia?.nome || 'Carregando...'}</h1>
            <p className="text-xs text-gray-400">Dashboard</p>
          </div>
          <Link href="/login" className="text-sm text-gray-400">
            Sair
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-sm mx-auto flex">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'agenda' ? 'border-black text-black' : 'border-transparent text-gray-500'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('servicos')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'servicos' ? 'border-black text-black' : 'border-transparent text-gray-500'
            }`}
          >
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'clientes' ? 'border-black text-black' : 'border-transparent text-gray-500'
            }`}
          >
            Clientes
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-sm mx-auto px-4 py-4">
        {activeTab === 'agenda' && (
          <div className="space-y-3">
            <h2 className="font-medium text-gray-700 mb-3">Hoje - 14/03</h2>
            {agendamentos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum agendamento hoje</p>
            ) : (
              agendamentos.map((agenda) => (
                <div key={agenda.id} className="card flex justify-between items-center">
                  <div>
                    <p className="font-medium">{agenda.cliente_nome}</p>
                    <p className="text-sm text-gray-500">{agenda.servico_nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{agenda.hora}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agenda.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {agenda.status}
                    </span>
                  </div>
                </div>
              ))
            )}
            <button className="btn-primary w-full mt-4">
              + Novo Agendamento
            </button>
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="space-y-3">
            {servicos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum serviço cadastrado</p>
            ) : (
              servicos.map((servico) => (
                <div key={servico.id} className="card flex justify-between items-center">
                  <div>
                    <p className="font-medium">{servico.nome}</p>
                    <p className="text-sm text-gray-500">{servico.duracao_minutos} min</p>
                  </div>
                  <p className="font-bold">R$ {servico.preco}</p>
                </div>
              ))
            )}
            <button className="btn-secondary w-full mt-4">
              + Adicionar Serviço
            </button>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum cliente cadastrado ainda.</p>
            <p className="text-sm mt-2">Os clientes aparecem quando fazem um agendamento.</p>
          </div>
        )}
      </main>

      {/* WhatsApp Link Flutuante */}
      <div className="fixed bottom-4 right-4">
        <a
          href={gerarLinkWhatsApp()}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
        >
          <span className="text-2xl">💬</span>
        </a>
      </div>
    </div>
  )
}
