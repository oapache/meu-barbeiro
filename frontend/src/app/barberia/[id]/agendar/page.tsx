'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

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

type BarbeiroOption = {
  id: string
  nome: string
}

type AuthUser = {
  id?: string
  nome?: string
}

type AuthState = {
  user?: AuthUser
  isAuthenticated: boolean
  loading: boolean
}

type HorarioSemanaItem = {
  key?: string
  fechado?: boolean
  abertura?: string
  fechamento?: string
}

const formatarDataLocalISO = (date: Date) => {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const formatarDataBr = (dataISO: string) => {
  const [ano, mes, dia] = String(dataISO || '').split('-')
  if (!ano || !mes || !dia) return dataISO
  return `${dia}/${mes}/${ano}`
}

const gerarHorariosIntervalo = (inicio: string, fim: string, intervaloMinutos = 30) => {
  const [hInicio, mInicio] = inicio.split(':').map(Number)
  const [hFim, mFim] = fim.split(':').map(Number)

  const inicioMin = hInicio * 60 + mInicio
  const fimMin = hFim * 60 + mFim
  const horarios: string[] = []

  for (let min = inicioMin; min <= fimMin; min += intervaloMinutos) {
    const h = String(Math.floor(min / 60)).padStart(2, '0')
    const m = String(min % 60).padStart(2, '0')
    horarios.push(`${h}:${m}`)
  }

  return horarios
}

const HORARIOS_PADRAO = gerarHorariosIntervalo('09:00', '18:00', 30)
const DAY_KEY_BY_INDEX = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

const normalizarHora = (valor: unknown, fallback: string) => {
  const texto = String(valor || '').trim().slice(0, 5)
  return /^\d{2}:\d{2}$/.test(texto) ? texto : fallback
}

const normalizarHoraCurta = (valor: unknown) => {
  const texto = String(valor || '').trim().slice(0, 5)
  return /^\d{2}:\d{2}$/.test(texto) ? texto : ''
}

const obterFaixaDoDia = (
  dataISO: string,
  horariosSemana: HorarioSemanaItem[],
  aberturaPadrao: string,
  fechamentoPadrao: string
) => {
  if (!dataISO) return { abertura: aberturaPadrao, fechamento: fechamentoPadrao }

  const diaDate = new Date(`${dataISO}T12:00:00`)
  const keyDia = DAY_KEY_BY_INDEX[diaDate.getDay()]
  const itemDia = horariosSemana.find((item) => String(item?.key || '') === keyDia)

  if (!itemDia) return { abertura: aberturaPadrao, fechamento: fechamentoPadrao }
  if (itemDia.fechado) return null

  return {
    abertura: normalizarHora(itemDia.abertura, aberturaPadrao),
    fechamento: normalizarHora(itemDia.fechamento, fechamentoPadrao),
  }
}

export default function AgendamentoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth() as AuthState
  const [step, setStep] = useState(1)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horaSelecionada, setHoraSelecionada] = useState('')
  const [loading, setLoading] = useState(false)
  const [erroAgendamento, setErroAgendamento] = useState('')
  const [barbeiros, setBarbeiros] = useState<BarbeiroOption[]>([])
  const [horariosSemana, setHorariosSemana] = useState<HorarioSemanaItem[]>([])
  const [aberturaPadrao, setAberturaPadrao] = useState('09:00')
  const [fechamentoPadrao, setFechamentoPadrao] = useState('18:00')
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([])
  const [dataInicioVisivel, setDataInicioVisivel] = useState(0)
  const [datasPorPagina, setDatasPorPagina] = useState(8)

  const [barbearia, setBarbearia] = useState({
    id: params.id,
    nome: 'Barbearia',
    servicos: [] as Servico[],
    horarios: HORARIOS_PADRAO,
  })

  const servicoIdPreSelecionado = searchParams.get('servicoId')
  const redirectPath = useMemo(() => {
    const query = searchParams.toString()
    return query ? `/barberia/${params.id}/agendar?${query}` : `/barberia/${params.id}/agendar`
  }, [params.id, searchParams])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregandoDados(true)

        let nomeBarbearia = 'Barbearia'
        try {
          const detalhe = await ApiService.getBarbearia(params.id)
          const barbeariaApi = detalhe?.barbearia
          nomeBarbearia = barbeariaApi?.nome || nomeBarbearia

          const abertura = normalizarHora(barbeariaApi?.horario_abertura, '09:00')
          const fechamento = normalizarHora(barbeariaApi?.horario_fechamento, '18:00')
          setAberturaPadrao(abertura)
          setFechamentoPadrao(fechamento)

          const semana = Array.isArray(barbeariaApi?.horarios_semana) ? barbeariaApi.horarios_semana : []
          setHorariosSemana(semana)
        } catch {
          // Mantem fallback local.
        }

        let servicosCarregados: Servico[] = []
        try {
          const respostaServicos = await ApiService.listServicos(params.id)
          const lista = Array.isArray(respostaServicos?.servicos) ? respostaServicos.servicos : []
          servicosCarregados = lista.map((servico: any) => ({
            id: String(servico.id),
            nome: String(servico.nome || 'Serviço'),
            preco: Number(servico.preco || 0),
            duracao: Number(servico.duracao_minutos || 30),
          }))
        } catch {
          servicosCarregados = []
        }

        let equipeCarregada: BarbeiroOption[] = []
        try {
          const respostaDetalhes = await ApiService.getBarbeariaDetalhes(params.id)
          const profissionais = Array.isArray(respostaDetalhes?.detalhes?.profissionais)
            ? respostaDetalhes.detalhes.profissionais
            : []

          equipeCarregada = profissionais
            .filter((item: any) => item?.nome)
            .map((item: any) => ({
              id: String(item.id || `barbeiro-${Date.now()}`),
              nome: String(item.nome || ''),
            }))
        } catch {
          equipeCarregada = []
        }

        setBarbeiros(equipeCarregada)

        setBarbearia((prev) => ({
          ...prev,
          id: params.id,
          nome: nomeBarbearia,
          servicos: servicosCarregados,
        }))

        if (servicoIdPreSelecionado) {
          const preSelecionado = servicosCarregados.find((item) => item.id === servicoIdPreSelecionado)
          if (preSelecionado) {
            setServicoSelecionado(preSelecionado)
            setStep(2)
          }
        }
      } finally {
        setCarregandoDados(false)
      }
    }

    carregarDados()
  }, [params.id, servicoIdPreSelecionado])

  const barbeiroSelecionado = barbeiros.find((item) => item.id === barbeiroSelecionadoId) || null
  const barbeiroEfetivo = barbeiroSelecionado || (barbeiros.length === 1 ? barbeiros[0] : null)

  useEffect(() => {
    if (barbeiros.length === 0) {
      if (barbeiroSelecionadoId) setBarbeiroSelecionadoId('')
      return
    }

    if (barbeiros.length === 1) {
      const unicoId = barbeiros[0].id
      if (barbeiroSelecionadoId !== unicoId) {
        setBarbeiroSelecionadoId(unicoId)
      }
      return
    }

    if (barbeiroSelecionadoId && !barbeiros.some((item) => item.id === barbeiroSelecionadoId)) {
      setBarbeiroSelecionadoId('')
    }
  }, [barbeiros, barbeiroSelecionadoId])

  // Gerar datas dos próximos 14 dias
  const datas = useMemo(() => {
    const dias: DataOption[] = []
    for (let i = 1; i <= 14; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      if (date.getDay() !== 0) { // Não domingo
        dias.push({
          data: formatarDataLocalISO(date),
          dia: date.getDate(),
          semana: date.toLocaleDateString('pt-BR', { weekday: 'short' })
        })
      }
    }
    return dias
  }, [])

  useEffect(() => {
    const definirTamanhoPagina = () => {
      setDatasPorPagina(window.innerWidth < 768 ? 4 : 8)
    }

    definirTamanhoPagina()
    window.addEventListener('resize', definirTamanhoPagina)
    return () => window.removeEventListener('resize', definirTamanhoPagina)
  }, [])

  useEffect(() => {
    const limiteMaximo = Math.max(0, datas.length - datasPorPagina)
    if (dataInicioVisivel > limiteMaximo) {
      setDataInicioVisivel(limiteMaximo)
    }
  }, [dataInicioVisivel, datas.length, datasPorPagina])

  const datasVisiveis = useMemo(() => {
    return datas.slice(dataInicioVisivel, dataInicioVisivel + datasPorPagina)
  }, [datas, dataInicioVisivel, datasPorPagina])

  const podeVoltarDatas = dataInicioVisivel > 0
  const podeAvancarDatas = dataInicioVisivel + datasPorPagina < datas.length

  const navegarDatas = (direcao: 'prev' | 'next') => {
    setDataInicioVisivel((atual) => {
      const limiteMaximo = Math.max(0, datas.length - datasPorPagina)
      if (direcao === 'prev') return Math.max(0, atual - 1)
      return Math.min(limiteMaximo, atual + 1)
    })
  }

  useEffect(() => {
    const carregarHorariosOcupados = async () => {
      if (!dataSelecionada) {
        setHorasOcupadas([])
        return
      }

      try {
        const resposta = await ApiService.listAgendamentos({
          barbearia_id: String(barbearia.id),
          data: dataSelecionada,
        })

        const listaApi = Array.isArray(resposta?.agendamentos) ? resposta.agendamentos : []
        const remotos = listaApi
          .filter((item: any) => String(item?.status || '') !== 'cancelado')
          .map((item: any) => normalizarHoraCurta(item?.hora))
          .filter(Boolean) as string[]

        setHorasOcupadas(Array.from(new Set(remotos)).sort((a, b) => a.localeCompare(b)))
      } catch {
        setHorasOcupadas([])
      }
    }

    carregarHorariosOcupados()
  }, [dataSelecionada, barbearia.id])

  const horariosDisponiveis = useMemo(() => {
    const faixa = obterFaixaDoDia(dataSelecionada, horariosSemana, aberturaPadrao, fechamentoPadrao)
    if (!faixa) return []
    const base = gerarHorariosIntervalo(faixa.abertura, faixa.fechamento, 30)
    const ocupadasSet = new Set(horasOcupadas)
    return base.filter((hora) => !ocupadasSet.has(hora))
  }, [dataSelecionada, horariosSemana, aberturaPadrao, fechamentoPadrao, horasOcupadas])

  useEffect(() => {
    if (horaSelecionada && !horariosDisponiveis.includes(horaSelecionada)) {
      setHoraSelecionada('')
    }
  }, [horaSelecionada, horariosDisponiveis])

  const handleAgendar = async () => {
    if (!user?.id || !servicoSelecionado || !dataSelecionada || !horaSelecionada) return
    if (barbeiros.length > 0 && !barbeiroEfetivo?.id) return
    
    setLoading(true)
    setErroAgendamento('')
    try {
      const payload = {
        barbearia_id: barbearia.id,
        barbearia_nome: barbearia.nome,
        servico_id: servicoSelecionado.id,
        servico_nome: servicoSelecionado.nome,
        servico_preco: servicoSelecionado.preco,
        barbeiro_id: barbeiroEfetivo?.id || null,
        barbeiro_nome: barbeiroEfetivo?.nome || null,
        cliente_id: user.id,
        cliente_nome: user?.nome || 'Cliente',
        data: dataSelecionada,
        hora: horaSelecionada,
        observacoes: null,
      }

      await ApiService.createAgendamento({
        barbearia_id: payload.barbearia_id,
        servico_id: payload.servico_id,
        cliente_id: payload.cliente_id,
        barbeiro_id: payload.barbeiro_id,
        data: payload.data,
        hora: payload.hora,
        observacoes: payload.barbeiro_nome ? `${payload.servico_nome} | Barbeiro: ${payload.barbeiro_nome}` : payload.servico_nome,
      })

      router.push('/perfil?agendado=1')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível confirmar o agendamento.'
      setErroAgendamento(message)
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
        {authLoading && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            Verificando autenticacao...
          </div>
        )}

        {!authLoading && !isAuthenticated && (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-100">
              <p className="font-medium">Para agendar, você precisa entrar ou criar uma conta.</p>
              <p className="text-sm text-yellow-200/80 mt-1">Após autenticar, você volta para este agendamento automaticamente.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 font-medium text-black"
              >
                Entrar
              </Link>
              <Link
                href={`/cadastro?redirect=${encodeURIComponent(redirectPath)}`}
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-4 py-3 font-medium text-white"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}

        {!authLoading && isAuthenticated && (
          <>
        {carregandoDados && (
          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            Carregando opcoes de agendamento...
          </div>
        )}

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
            {barbearia.servicos.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                Nenhum serviço disponível para agendamento no momento.
              </div>
            )}
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
            <h2 className="text-xl font-bold mb-4">Escolha barbeiro, data e horário</h2>

            {barbeiros.length > 0 && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Barbeiro</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {barbeiros.map((barbeiro) => (
                    <button
                      key={barbeiro.id}
                      onClick={() => setBarbeiroSelecionadoId(barbeiro.id)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition text-left ${
                        barbeiroSelecionadoId === barbeiro.id
                          ? 'bg-white text-black'
                          : 'bg-zinc-900 border border-zinc-800'
                      }`}
                    >
                      {barbeiro.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/*Datas */}
            <div>
              <p className="text-sm text-zinc-400 mb-2">Data</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navegarDatas('prev')}
                  disabled={!podeVoltarDatas}
                  className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Data anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 grid grid-cols-4 md:grid-cols-8 gap-2">
                {datasVisiveis.map((d) => (
                  <button
                    key={d.data}
                    onClick={() => setDataSelecionada(d.data)}
                    className={`h-16 rounded-lg flex flex-col items-center justify-center transition ${
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

                <button
                  type="button"
                  onClick={() => navegarDatas('next')}
                  disabled={!podeAvancarDatas}
                  className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Próxima data"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/*Horários */}
            {dataSelecionada && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Horário</p>
                {horariosDisponiveis.length === 0 && (
                  <div className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
                    Sem horários disponíveis nesta data.
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {horariosDisponiveis.map((hora) => (
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
                disabled={!dataSelecionada || !horaSelecionada || (barbeiros.length > 0 && !barbeiroSelecionadoId)}
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
                <span className="text-zinc-400">Barbeiro</span>
                <span className="font-medium">{barbeiroEfetivo?.nome || 'A definir'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Data</span>
                <span className="font-medium">
                  {formatarDataBr(dataSelecionada)}
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

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-sm text-blue-400">
                O agendamento será salvo diretamente no app.
              </p>
            </div>

            {erroAgendamento && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {erroAgendamento}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-zinc-700 rounded-full font-medium"
              >
                Voltar
              </button>
              <button 
                onClick={handleAgendar}
                disabled={loading || !user?.id}
                className="flex-1 py-3 bg-white text-black rounded-full font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Salvando...' : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirmar Agendamento
                  </>
                )}
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </main>
  )
}

