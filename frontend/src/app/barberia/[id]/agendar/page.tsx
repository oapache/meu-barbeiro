'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { Calendar, Clock, Check, X, User, MapPin, Phone, Mail } from 'lucide-react'

type Servico = {
  id: string
  nome: string
  preco: number
  duracao: number
}

type DataOption = {
  data: string
  dia: number
  semana: string
}

type AuthUser = {
  nome?: string
}

type AuthState = {
  user?: AuthUser
}

export default function AgendamentoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth() as AuthState
  const [step, setStep] = useState(1)
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horaSelecionada, setHoraSelecionada] = useState('')
  const [loading, setLoading] = useState(false)

  // Dados mockados (depois da API)
  const barbearia = {
    id: params.id,
    nome: 'Barbearia do João',
    telefone: '5511999999999',
    whatsapp: '5511999999999',
    endereco: 'Rua das Barbas, 123 - São Paulo, SP',
    servicos: [
      { id: '1', nome: 'Corte Masculino', preco: 45, duracao: 30 },
      { id: '2', nome: 'Barba', preco: 35, duracao: 20 },
      { id: '3', nome: 'Corte + Barba', preco: 70, duracao: 45 },
      { id: '4', nome: 'Sobrancelha', preco: 20, duracao: 10 },
    ],
    horarios: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']
  }

  // Gerar datas dos próximos 14 dias
  const datas = useMemo(() => {
    const dias: DataOption[] = []
    for (let i = 1; i <= 14; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      if (date.getDay() !== 0) { // Não domingo
        dias.push({
          data: date.toISOString().split('T')[0],
          dia: date.getDate(),
          semana: date.toLocaleDateString('pt-BR', { weekday: 'short' })
        })
      }
    }
    return dias
  }, [])

  const handleAgendar = async () => {
    if (!servicoSelecionado || !dataSelecionada || !horaSelecionada) return
    
    setLoading(true)
    try {
      // Gerar link WhatsApp
      const linkWhatsApp = await ApiService.gerarLinkWhatsApp(
        barbearia.whatsapp,
        'agendamento',
        {
          nomeCliente: user?.nome || 'Cliente',
          servico: servicoSelecionado.nome,
          data: dataSelecionada,
          hora: horaSelecionada,
          nomeBarbearia: barbearia.nome
        }
      )
      
      // Redirecionar para WhatsApp
      if (linkWhatsApp.link) {
        window.location.href = linkWhatsApp.link
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black border-b border-white/10 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-400">
            ←
          </button>
          <h1 className="text-lg font-bold">Agendar</h1>
        </div>
      </header>

      <div className="pt-16 max-w-2xl mx-auto px-4 pb-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-white' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Escolher Serviço */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Escolha o serviço</h2>
            {barbearia.servicos.map((servico) => (
              <button
                key={servico.id}
                onClick={() => setServicoSelecionado(servico)}
                className={`w-full p-4 rounded-xl border text-left transition ${
                  servicoSelecionado?.id === servico.id 
                    ? 'border-white bg-zinc-900' 
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{servico.nome}</p>
                    <p className="text-sm text-zinc-400">{servico.duracao} min</p>
                  </div>
                  <p className="font-bold">R$ {servico.preco}</p>
                </div>
              </button>
            ))}
            
            <button 
              onClick={() => servicoSelecionado && setStep(2)}
              disabled={!servicoSelecionado}
              className="w-full py-3 bg-white text-black rounded-full font-medium disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: Escolher Data e Hora */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Escolha data e horário</h2>
            
            {/*Datas */}
            <div>
              <p className="text-sm text-zinc-400 mb-2">Data</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {datas.map((d) => (
                  <button
                    key={d.data}
                    onClick={() => setDataSelecionada(d.data)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center transition ${
                      dataSelecionada === d.data
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 border border-zinc-800'
                    }`}
                  >
                    <span className="text-xs">{d.semana}</span>
                    <span className="font-bold">{d.dia}</span>
                  </button>
                ))}
              </div>
            </div>

            {/*Horários */}
            {dataSelecionada && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Horário</p>
                <div className="grid grid-cols-4 gap-2">
                  {barbearia.horarios.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => setHoraSelecionada(hora)}
                      className={`py-2 rounded-lg text-sm font-medium transition ${
                        horaSelecionada === hora
                          ? 'bg-white text-black'
                          : 'bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      {hora}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-zinc-700 rounded-full font-medium"
              >
                Voltar
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={!dataSelecionada || !horaSelecionada}
                className="flex-1 py-3 bg-white text-black rounded-full font-medium disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmar */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Confirmar agendamento</h2>
            
            <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-400">Serviço</span>
                <span className="font-medium">{servicoSelecionado?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Data</span>
                <span className="font-medium">
                  {new Date(dataSelecionada).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Horário</span>
                <span className="font-medium">{horaSelecionada}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-3">
                <span className="text-zinc-400">Total</span>
                <span className="font-bold">R$ {servicoSelecionado?.preco}</span>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-sm text-green-400">
                O agendamento será confirmado via WhatsApp
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-zinc-700 rounded-full font-medium"
              >
                Voltar
              </button>
              <button 
                onClick={handleAgendar}
                disabled={loading}
                className="flex-1 py-3 bg-green-500 text-white rounded-full font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Enviando...' : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Agendar via WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
