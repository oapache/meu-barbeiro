'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function BarbeariaPage() {
  const [activeTab, setActiveTab] = useState<'servicos' | 'profissionais' | 'avaliacoes'>('servicos')

  // Dados da barbearia (mock - depois virá da API)
  const barbearia = {
    id: '1',
    nome: 'Barbearia do João',
    nota: 4.8,
    imagem: '/logo.jpg',
    descricao: 'Na Barbearia do João, nossa missão é elevar a autoestima de nossos clientes, proporcionando um atendimento excepcional com qualidade e agilidade.',
    telefone: '(11) 99999-9999',
    whatsapp: '551199999999',
    endereco: 'Rua das Barbas, 123 - São Paulo, SP',
    latitude: -23.6457634,
    longitude: -46.49981689,
    comodidades: {
      wifi: true,
      estacionamento: false,
      acessibilidade: true,
      atende_criancas: true
    },
    servicos: [
      { id: '1', nome: 'Corte Masculino', preco: 45, duracao: 30 },
      { id: '2', nome: 'Barba', preco: 35, duracao: 20 },
      { id: '3', nome: 'Corte + Barba', preco: 70, duracao: 45 },
      { id: '4', nome: 'Sobrancelha', preco: 20, duracao: 10 },
      { id: '5', nome: 'Pezinho', preco: 25, duracao: 15 },
    ],
    profissionais: [
      { id: '1', nome: 'João Silva', especialidade: 'Corte e Barba' },
      { id: '2', nome: 'Pedro Santos', especialidade: 'Corte Moderno' },
    ]
  }

  const gerarLinkWhatsApp = () => {
    const mensagem = encodeURIComponent('Olá! Gostaria de agendar um serviço.')
    return `https://wa.me/${barbearia.whatsapp}?text=${mensagem}`
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/buscar" className="text-gray-600">
            ← Voltar
          </Link>
          <span className="font-medium truncate">{barbearia.nome}</span>
          <button className="text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Banner */}
      <div className="pt-14 h-48 bg-gray-200 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">✂️</span>
        </div>
      </div>

      {/* Info Principal */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-4">
          <img 
            src={barbearia.imagem} 
            alt={barbearia.nome}
            className="w-16 h-16 rounded-full object-cover -mt-8 border-4 border-white shadow-md"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{barbearia.nome}</h1>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-500">★</span>
              <span className="font-medium">{barbearia.nota}</span>
              <span className="text-gray-500 text-sm">(48 avaliações)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('servicos')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'servicos' ? 'border-black text-black' : 'border-transparent text-gray-500'
            }`}
          >
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('profissionais')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'profissionais' ? 'border-black text-black' : 'border-transparent text-gray-500'
            }`}
          >
            Profissionais
          </button>
          <button
            onClick={() => setActiveTab('avaliacoes')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'avaliacoes' ? 'border-black text-black' : 'border-transparent text-gray-500'
            }`}
          >
            Avaliações
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-4 pb-24">
        {activeTab === 'servicos' && (
          <div className="space-y-3">
            {/* Descrição */}
            <p className="text-gray-600 text-sm mb-4">{barbearia.descricao}</p>

            {/* Comodidades */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {barbearia.comodidades.wifi && (
                <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">📶</span>
                  <span className="text-xs">Wi-fi</span>
                </div>
              )}
              {barbearia.comodidades.estacionamento && (
                <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">🅿️</span>
                  <span className="text-xs">Estac.</span>
                </div>
              )}
              {barbearia.comodidades.acessibilidade && (
                <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">♿</span>
                  <span className="text-xs">Acess.</span>
                </div>
              )}
              {barbearia.comodidades.atende_criancas && (
                <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-lg">
                  <span className="text-xl">👶</span>
                  <span className="text-xs">Kids</span>
                </div>
              )}
            </div>

            {/* Lista de Serviços */}
            <h2 className="font-semibold mb-3">Serviços</h2>
            {barbearia.servicos.map((servico) => (
              <div key={servico.id} className="flex justify-between items-center p-3 border rounded-xl">
                <div>
                  <p className="font-medium">{servico.nome}</p>
                  <p className="text-sm text-gray-500">{servico.duracao} min</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">R$ {servico.preco}</p>
                  <button className="text-sm text-blue-600 font-medium">
                    Agendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profissionais' && (
          <div className="space-y-3">
            {barbearia.profissionais.map((prof) => (
              <div key={prof.id} className="flex items-center gap-3 p-3 border rounded-xl">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-lg">👨‍💇</span>
                </div>
                <div>
                  <p className="font-medium">{prof.nome}</p>
                  <p className="text-sm text-gray-500">{prof.especialidade}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'avaliacoes' && (
          <div className="text-center py-8 text-gray-500">
            <p>Avaliações em breve...</p>
          </div>
        )}
      </div>

      {/* Detalhes - Lateral */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Localização */}
          <div className="flex items-start gap-3">
            <span className="text-gray-400">📍</span>
            <div className="flex-1">
              <p className="text-sm">{barbearia.endereco}</p>
            </div>
          </div>
          {/* Contato */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400">📱</span>
            <a href={`tel:${barbearia.telefone}`} className="text-sm text-blue-600">
              {barbearia.telefone}
            </a>
          </div>
        </div>
      </div>

      {/* Botão Flutuante Agendar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <a 
            href={gerarLinkWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 text-white py-3 rounded-full font-medium text-center flex items-center justify-center gap-2"
          >
            <span>💬</span>
            Agendar
          </a>
          <button className="px-4 py-3 border rounded-full">
            <span>📅</span>
          </button>
        </div>
      </div>
    </main>
  )
}
