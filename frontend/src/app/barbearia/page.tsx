'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { Calendar, Users, Scissors, Plus, CheckCircle, XCircle, Clock, Settings, Store, Trash2, RefreshCw, X } from 'lucide-react'

type StatusAgenda = 'confirmado' | 'pendente' | 'cancelado'

type Agendamento = {
  id: string | number
  cliente_nome: string
  servico: string
  servico_preco?: number
  hora: string
  status: StatusAgenda
  data: string
  barbeiro_nome?: string
}

type Servico = {
  id: number
  nome: string
  preco: number
  duracao: number
}

type Barbeiro = {
  id: string
  nome: string
  foto_url: string
  descricao: string
  cargo: string
  experiencia: string
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

const SERVICO_POR_TIPO_INLINE: Record<TipoServicoInline, { nome: string; imagem: string }> = {
  cabelo: { nome: 'Cabelo', imagem: '/service-icons/cabelo.png' },
  cabelo_sobrancelha: { nome: 'Cabelo + Sobrancelha', imagem: '/service-icons/cabelo-sobrancelha.png' },
  barba: { nome: 'Barba', imagem: '/service-icons/barba.png' },
  cabelo_barba: { nome: 'Cabelo + Barba', imagem: '/service-icons/cabelo-barba.png' },
  corte_feminino: { nome: 'Corte Feminino', imagem: '/service-icons/corte-feminino.png' },
}

const OPCOES_SERVICO_INLINE: TipoServicoInline[] = [
  'cabelo',
  'cabelo_sobrancelha',
  'barba',
  'cabelo_barba',
  'corte_feminino',
]

const iniciaisNome = (nome: string) => {
  const partes = String(nome || '').trim().split(' ').filter(Boolean)
  if (partes.length === 0) return 'BB'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase()
}

const hojeISO = () => {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const formatarDataCurta = (dataISO: string) => {
  if (!dataISO) return '--/--'
  const [ano, mes, dia] = dataISO.split('-')
  if (!ano || !mes || !dia) return dataISO
  return `${dia}/${mes}`
}

const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

const formatarHoraCurta = (hora: string) => String(hora || '').slice(0, 5)

const normalizarTexto = (valor: string) => String(valor || '').trim().toLowerCase()

const formatarMesAno = (mesISO: string) => {
  const [ano, mes] = String(mesISO || '').split('-')
  if (!ano || !mes) return mesISO

  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const idx = Number(mes) - 1
  const nomeMes = meses[idx] || mes
  return `${nomeMes}/${ano}`
}

const normalizarHora = (valor: unknown, fallback: string) => {
  const texto = String(valor || '').trim().slice(0, 5)
  return /^\d{2}:\d{2}$/.test(texto) ? texto : fallback
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

const normalizarStatusAgenda = (status: string): StatusAgenda => {
  if (status === 'cancelado') return 'cancelado'
  if (status === 'confirmado') return 'confirmado'
  return 'pendente'
}

const barbeiroFromObservacoes = (observacoes: string) => {
  const match = String(observacoes || '').match(/Barbeiro:\s*(.+)$/i)
  return match?.[1]?.trim() || ''
}

const chaveUnicaAgendamento = (item: Agendamento) => {
  return [
    String(item.data || ''),
    String(item.hora || ''),
    String(item.cliente_nome || '').toLowerCase(),
    String(item.servico || '').toLowerCase(),
  ].join('|')
}

const normalizarDataISO = (valor: unknown) => {
  if (!valor) return ''

  if (valor instanceof Date) {
    const ano = valor.getUTCFullYear()
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(valor.getUTCDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  const texto = String(valor)
  const match = texto.match(/(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || texto.slice(0, 10)
}

const ordenarAgenda = (a: Agendamento, b: Agendamento) => {
  const dataA = `${a?.data || ''}T${a?.hora || '00:00'}`
  const dataB = `${b?.data || ''}T${b?.hora || '00:00'}`
  return dataA.localeCompare(dataB)
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
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [barbearia, setBarbearia] = useState<BarbeariaPerfil | null>(null)
  const [mostrarNovoServico, setMostrarNovoServico] = useState(false)
  const [mostrarNovoBarbeiro, setMostrarNovoBarbeiro] = useState(false)
  const [novoServico, setNovoServico] = useState({
    tipo: 'cabelo' as TipoServicoInline,
    preco: '',
    duracao: '40',
  })
  const [novoBarbeiro, setNovoBarbeiro] = useState({
    nome: '',
    descricao: '',
  })
  const [fotoBarbeiroArquivo, setFotoBarbeiroArquivo] = useState<File | null>(null)
  const [enviandoFotoBarbeiro, setEnviandoFotoBarbeiro] = useState(false)
  const [barbeirosInicializados, setBarbeirosInicializados] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [agendaRefreshKey, setAgendaRefreshKey] = useState(0)
  const [remarcarAgendamento, setRemarcarAgendamento] = useState<Agendamento | null>(null)
  const [remarcarData, setRemarcarData] = useState('')
  const [remarcarHora, setRemarcarHora] = useState('')
  const [remarcarLoading, setRemarcarLoading] = useState(false)
  const [mostrarNovoAgendamento, setMostrarNovoAgendamento] = useState(false)
  const [novoAgendamento, setNovoAgendamento] = useState({
    cliente_email: '',
    servico_id: '',
    barbeiro_id: '',
    data: '',
    hora: '',
  })
  const [novoAgendamentoLoading, setNovoAgendamentoLoading] = useState(false)
  const hoje = useMemo(() => hojeISO(), [])

  const horarioAbertura = normalizarHora((barbearia as any)?.horario_abertura, '09:00')
  const horarioFechamento = normalizarHora((barbearia as any)?.horario_fechamento, '18:00')
  const horariosAgendamentoManual = useMemo(
    () => gerarHorariosIntervalo(horarioAbertura, horarioFechamento, 30),
    [horarioAbertura, horarioFechamento]
  )

  const agendamentosHoje = useMemo(
    () => agendamentos.filter((item) => item.data === hoje && item.status !== 'cancelado').sort(ordenarAgenda),
    [agendamentos, hoje]
  )

  const proximosAgendamentos = useMemo(
    () => agendamentos.filter((item) => item.data > hoje && item.status !== 'cancelado').sort(ordenarAgenda),
    [agendamentos, hoje]
  )

  const historicoAgendamentos = useMemo(
    () => agendamentos
      .filter((item) => item.status === 'cancelado' || item.data < hoje)
      .sort((a, b) => ordenarAgenda(b, a)),
    [agendamentos, hoje]
  )

  const clientesConcluidos = useMemo(
    () => agendamentos
      .filter((item) => item.status === 'confirmado' || (item.status !== 'cancelado' && item.data < hoje))
      .sort((a, b) => ordenarAgenda(b, a)),
    [agendamentos, hoje]
  )

  const servicoPrecoPorNome = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const servico of servicos) {
      mapa.set(normalizarTexto(servico.nome), Number(servico.preco || 0))
    }
    return mapa
  }, [servicos])

  const obterValorAgendamento = (agenda: Agendamento) => {
    const valorDireto = Number(agenda.servico_preco || 0)
    if (valorDireto > 0) return valorDireto

    const porNome = servicoPrecoPorNome.get(normalizarTexto(agenda.servico))
    return Number(porNome || 0)
  }

  const saldoDia = useMemo(
    () => agendamentosHoje.reduce((acc, agenda) => acc + obterValorAgendamento(agenda), 0),
    [agendamentosHoje, servicoPrecoPorNome]
  )

  const mesAtual = useMemo(() => hoje.slice(0, 7), [hoje])

  const saldoMesAtual = useMemo(
    () => agendamentos
      .filter((agenda) => agenda.status !== 'cancelado' && String(agenda.data || '').startsWith(mesAtual))
      .reduce((acc, agenda) => acc + obterValorAgendamento(agenda), 0),
    [agendamentos, mesAtual, servicoPrecoPorNome]
  )

  const extratoMensal = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>()

    for (const agenda of agendamentos) {
      if (agenda.status === 'cancelado') continue
      const mes = String(agenda.data || '').slice(0, 7)
      if (!mes) continue

      const atual = mapa.get(mes) || { total: 0, qtd: 0 }
      atual.total += obterValorAgendamento(agenda)
      atual.qtd += 1
      mapa.set(mes, atual)
    }

    return Array.from(mapa.entries())
      .map(([mes, dados]) => ({ mes, total: dados.total, qtd: dados.qtd }))
      .sort((a, b) => b.mes.localeCompare(a.mes))
  }, [agendamentos, servicoPrecoPorNome])

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

        let remotos: Agendamento[] = []
        try {
          const respostaAgendamentos = await ApiService.listAgendamentos({ barbearia_id: String(barbeariaDoUsuario.id) })
          let listaRemota = Array.isArray(respostaAgendamentos?.agendamentos) ? respostaAgendamentos.agendamentos : []

          if (listaRemota.length === 0) {
            const respostaGlobal = await ApiService.listAgendamentos()
            const listaGlobal = Array.isArray(respostaGlobal?.agendamentos) ? respostaGlobal.agendamentos : []
            listaRemota = listaGlobal.filter((item: any) => (
              String(item?.barbearia_id || '') === String(barbeariaDoUsuario.id || '') ||
              String(item?.barbearia_nome || '') === String(barbeariaDoUsuario.nome || '')
            ))
          }

          remotos = listaRemota.map((item: any) => ({
            id: item.id,
            cliente_nome: item.cliente_nome || 'Cliente',
            servico: item.servico_nome || item.observacoes || 'Serviço agendado',
            servico_preco: Number(item.servico_preco || 0),
            hora: String(item.hora || ''),
            status: normalizarStatusAgenda(String(item.status || 'pendente')),
            data: normalizarDataISO(item.data),
            barbeiro_nome: item.barbeiro_nome || barbeiroFromObservacoes(item.observacoes || ''),
          }))
        } catch {
          remotos = []
        }

        const unificados = remotos.sort(ordenarAgenda)
        const vistos = new Set<string>()
        const deduplicados: Agendamento[] = []

        for (const item of unificados) {
          const chave = chaveUnicaAgendamento(item)
          if (vistos.has(chave)) continue
          vistos.add(chave)
          deduplicados.push(item)
        }

        setAgendamentos(deduplicados)

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
        setErro('Não foi possível carregar os dados da sua barbearia agora.')
      } finally {
        setLoading(false)
      }
    }

    carregarDashboard()
  }, [authLoading, isAuthenticated, user?.tipo, user?.id, agendaRefreshKey])

  useEffect(() => {
    const refreshAgenda = () => setAgendaRefreshKey((prev) => prev + 1)
    window.addEventListener('focus', refreshAgenda)

    return () => {
      window.removeEventListener('focus', refreshAgenda)
    }
  }, [])

  useEffect(() => {
    const donoId = String(barbearia?.id || user?.id || '')
    if (!donoId) return

    const carregarEquipe = async () => {
      try {
        const resposta = await ApiService.getBarbeariaDetalhes(donoId)
        const equipe = Array.isArray(resposta?.detalhes?.profissionais)
          ? resposta.detalhes.profissionais
          : []

        setBarbeiros(
          equipe
            .filter((item: any) => item?.nome)
            .map((item: any) => ({
              id: String(item.id || `barbeiro-${Date.now()}`),
              nome: String(item.nome || ''),
              foto_url: String(item.foto_url || ''),
              descricao: String(item.descricao || ''),
              cargo: String(item.cargo || item.descricao || 'Barbeiro'),
              experiencia: String(item.experiencia || item.descricao || ''),
            }))
        )
      } catch {
        setBarbeiros([])
      } finally {
        setBarbeirosInicializados(true)
      }
    }

    carregarEquipe()
  }, [barbearia?.id, user?.id])

  useEffect(() => {
    if (!barbeirosInicializados) return

    const donoId = String(barbearia?.id || user?.id || '')
    if (!donoId) return

    ApiService.updateBarbeariaDetalhes(donoId, {
      profissionais: barbeiros,
    }).catch(() => {
      // Evita quebrar a UX caso a sincronizacao falhe.
    })
  }, [barbeiros, barbeirosInicializados, barbearia?.id, user?.id])

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

  const handleCancelarAgendamento = async (agenda: Agendamento) => {
    if (!confirm(`Desmarcar agendamento de ${agenda.cliente_nome}?`)) return

    try {
      const idStr = String(agenda.id)
      if (idStr.startsWith('ag-')) {
        setAgendamentos((prev) => prev.map((item) => (
          item.id === agenda.id ? { ...item, status: 'cancelado' } : item
        )))
      } else {
        await ApiService.cancelAgendamento(agenda.id)
        setAgendamentos((prev) => prev.map((item) => (
          item.id === agenda.id ? { ...item, status: 'cancelado' } : item
        )))
      }
      setErro('')
    } catch {
      setErro('Não foi possível desmarcar o agendamento.')
    }
  }

  const abrirRemarcar = (agenda: Agendamento) => {
    setRemarcarAgendamento(agenda)
    setRemarcarData(agenda.data)
    setRemarcarHora(agenda.hora)
  }

  const handleRemarcarAgendamento = async () => {
    if (!remarcarAgendamento || !remarcarData || !remarcarHora) return

    setRemarcarLoading(true)
    try {
      const idStr = String(remarcarAgendamento.id)
      if (idStr.startsWith('ag-')) {
        setAgendamentos((prev) =>
          prev.map((item) =>
            item.id === remarcarAgendamento.id
              ? { ...item, data: remarcarData, hora: remarcarHora }
              : item
          )
        )
      } else {
        await ApiService.updateAgendamento(remarcarAgendamento.id, {
          status: remarcarAgendamento.status,
          data: remarcarData,
          hora: remarcarHora,
        })
        setAgendaRefreshKey((prev) => prev + 1)
      }
      setRemarcarAgendamento(null)
      setErro('')
    } catch {
      setErro('Não foi possível remarcar o agendamento.')
    } finally {
      setRemarcarLoading(false)
    }
  }

  const criarServicoInline = async () => {
    if (!barbearia?.id) {
      setErro('Cadastre sua barbearia antes de criar serviços.')
      return
    }

    const preco = Number(String(novoServico.preco).replace(',', '.'))
    const duracao = Number(novoServico.duracao)

    if (Number.isNaN(preco) || preco <= 0) {
      setErro('Informe um valor válido para o serviço.')
      return
    }

    if (Number.isNaN(duracao) || duracao <= 0) {
      setErro('Informe uma duração válida em minutos.')
      return
    }

    const nome = SERVICO_POR_TIPO_INLINE[novoServico.tipo].nome

    try {
      const resposta = await ApiService.createServico(barbearia.id, {
        nome,
        descricao: `Serviço ${nome}`,
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
      setErro(error?.message || 'Não foi possível criar o serviço.')
    }
  }

  const adicionarBarbeiro = () => {
    const nome = novoBarbeiro.nome.trim()
    if (!nome) {
      setErro('Informe o nome do barbeiro.')
      return
    }

    const salvar = async () => {
      const descricao = novoBarbeiro.descricao.trim()
      let fotoUrl = ''

      try {
        if (fotoBarbeiroArquivo) {
          setEnviandoFotoBarbeiro(true)
          const respostaUpload = await ApiService.uploadImagem(fotoBarbeiroArquivo)
          fotoUrl = String(respostaUpload?.url || '').trim()
        }

        const novo: Barbeiro = {
          id: `barbeiro-${Date.now()}`,
          nome,
          foto_url: fotoUrl,
          descricao,
          cargo: descricao || 'Barbeiro',
          experiencia: descricao || '',
        }

        setBarbeiros((prev) => [...prev, novo])
        setNovoBarbeiro({ nome: '', descricao: '' })
        setFotoBarbeiroArquivo(null)
        setMostrarNovoBarbeiro(false)
        setErro('')
      } catch (error: any) {
        setErro(error?.message || 'Não foi possível enviar a foto do barbeiro.')
      } finally {
        setEnviandoFotoBarbeiro(false)
      }
    }

    salvar()
  }

  const removerBarbeiro = (id: string) => {
    setBarbeiros((prev) => prev.filter((item) => item.id !== id))
  }

  const abrirNovoAgendamento = () => {
    setNovoAgendamento({
      cliente_email: '',
      servico_id: String(servicos[0]?.id || ''),
      barbeiro_id: String(barbeiros[0]?.id || ''),
      data: hoje,
      hora: horariosAgendamentoManual[0] || '09:00',
    })
    setMostrarNovoAgendamento(true)
  }

  const salvarNovoAgendamento = async () => {
    if (!barbearia?.id) {
      setErro('Cadastre sua barbearia antes de criar agendamentos.')
      return
    }

    if (!novoAgendamento.cliente_email || !novoAgendamento.servico_id || !novoAgendamento.data || !novoAgendamento.hora) {
      setErro('Preencha e-mail, serviço, data e horário.')
      return
    }

    setNovoAgendamentoLoading(true)
    try {
      await ApiService.createAgendamentoByEmail({
        barbearia_id: barbearia.id,
        cliente_email: novoAgendamento.cliente_email,
        servico_id: novoAgendamento.servico_id,
        barbeiro_id: novoAgendamento.barbeiro_id || null,
        data: novoAgendamento.data,
        hora: novoAgendamento.hora,
        observacoes: 'Agendado manualmente pela barbearia',
      })

      setMostrarNovoAgendamento(false)
      setAgendaRefreshKey((prev) => prev + 1)
      setErro('')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível agendar por e-mail.')
    } finally {
      setNovoAgendamentoLoading(false)
    }
  }



  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Sou Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                <span className="text-lg font-bold">Sou Barbeiro</span>
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
              <Link href="/barbearia/planos" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800">
                <Store className="w-4 h-4" />
                Planos
              </Link>
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
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 ${
              activeTab === 'historico' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            Histórico
          </button>
          <button
            onClick={() => setActiveTab('extrato')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 ${
              activeTab === 'extrato' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Extrato
          </button>
          <button
            onClick={() => setActiveTab('barbeiros')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 ${
              activeTab === 'barbeiros' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
            }`}
          >
            <Users className="w-4 h-4" />
            Barbeiros
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
              <p className="font-medium text-yellow-100">Você ainda não tem uma barbearia cadastrada.</p>
              <p className="text-sm text-yellow-200/80 mt-1">Acesse Configurar para criar sua barbearia e cadastrar seus serviços.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Hoje</p>
            <p className="text-2xl font-bold mt-1">{agendamentosHoje.length}</p>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Saldo do Dia</p>
            <p className="text-2xl font-bold mt-1">{formatarMoeda(saldoDia)}</p>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Pendentes</p>
            <p className="text-2xl font-bold mt-1">{agendamentosHoje.filter((a) => a.status === 'pendente').length}</p>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Saldo do Mês</p>
            <p className="text-2xl font-bold mt-1">{formatarMoeda(saldoMesAtual)}</p>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Próximos</p>
            <p className="text-2xl font-bold mt-1">{proximosAgendamentos.length}</p>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Serviços</p>
            <p className="text-2xl font-bold mt-1">{servicos.length}</p>
          </div>
        </div>

        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Hoje - {formatarDataCurta(hoje)}</h2>
              <button
                onClick={abrirNovoAgendamento}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>

            {agendamentosHoje.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Nenhum agendamento para hoje.
              </div>
            )}

            {agendamentosHoje.map((agenda) => (
              <div key={agenda.id} className="bg-zinc-900 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{agenda.cliente_nome}</p>
                    <p className="text-sm text-zinc-400">{agenda.servico}</p>
                    <p className="text-xs text-emerald-400">{formatarMoeda(obterValorAgendamento(agenda))}</p>
                    {agenda.barbeiro_nome && <p className="text-xs text-zinc-500">Barbeiro: {agenda.barbeiro_nome}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatarHoraCurta(agenda.hora)}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(agenda.status)} text-white`}>
                      {getStatusIcon(agenda.status)}
                      {agenda.status}
                    </span>
                  </div>
                </div>
                {agenda.status !== 'cancelado' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => abrirRemarcar(agenda)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Remarcar
                    </button>
                    <button
                      onClick={() => handleCancelarAgendamento(agenda)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Desmarcar
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Próximos dias</h3>
              {proximosAgendamentos.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                  Sem agendamentos futuros no momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {proximosAgendamentos.slice(0, 5).map((agenda) => (
                    <div key={agenda.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{agenda.cliente_nome}</p>
                          <p className="text-xs text-zinc-400">{agenda.servico}</p>
                          <p className="text-xs text-emerald-400">{formatarMoeda(obterValorAgendamento(agenda))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatarDataCurta(agenda.data)} {formatarHoraCurta(agenda.hora)}</p>
                          <p className="text-xs text-zinc-500">{agenda.status}</p>
                        </div>
                      </div>
                      {agenda.status !== 'cancelado' && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-800">
                          <button
                            onClick={() => abrirRemarcar(agenda)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Remarcar
                          </button>
                          <button
                            onClick={() => handleCancelarAgendamento(agenda)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Desmarcar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Histórico</h2>

            {historicoAgendamentos.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Sem histórico de agendamentos ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {historicoAgendamentos.map((agenda) => (
                  <div key={agenda.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{agenda.cliente_nome}</p>
                      <p className="text-xs text-zinc-400">{agenda.servico}</p>
                      <p className="text-xs text-emerald-400">{formatarMoeda(obterValorAgendamento(agenda))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatarDataCurta(agenda.data)} {formatarHoraCurta(agenda.hora)}</p>
                      <p className={`text-xs ${agenda.status === 'cancelado' ? 'text-red-400' : 'text-zinc-500'}`}>
                        {agenda.status === 'cancelado' ? 'DESMARCADO' : 'FINALIZADO'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'extrato' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Extrato</h2>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Mês Atual</p>
                <p className="text-sm text-zinc-400 mt-1">{formatarMesAno(mesAtual)}</p>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{formatarMoeda(saldoMesAtual)}</p>
            </div>

            {extratoMensal.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Sem dados financeiros ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {extratoMensal.map((item) => (
                  <div key={item.mes} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatarMesAno(item.mes)}</p>
                      <p className="text-xs text-zinc-400">{item.qtd} agendamento(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400">{formatarMoeda(item.total)}</p>
                  </div>
                ))}
              </div>
            )}
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
                <p className="text-sm text-zinc-300">Criar novo serviço sem sair desta página</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {OPCOES_SERVICO_INLINE.map((tipo) => {
                    const item = SERVICO_POR_TIPO_INLINE[tipo]
                    const selecionado = novoServico.tipo === tipo
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setNovoServico((prev) => ({ ...prev, tipo }))}
                        className={`rounded-lg border p-2 text-center transition ${selecionado ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800/70'}`}
                      >
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          className="w-12 h-12 rounded-md object-cover mx-auto mb-2 border border-zinc-700"
                        />
                        <p className="text-xs text-zinc-200 leading-tight">{item.nome}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
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
                    placeholder="Duração (min)"
                  />
                </div>
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 flex items-center gap-3">
                  <img
                    src={SERVICO_POR_TIPO_INLINE[novoServico.tipo].imagem}
                    alt={SERVICO_POR_TIPO_INLINE[novoServico.tipo].nome}
                    className="w-12 h-12 rounded-md object-cover border border-zinc-700"
                  />
                  <div>
                    <p className="text-sm font-medium">{SERVICO_POR_TIPO_INLINE[novoServico.tipo].nome}</p>
                    <p className="text-xs text-zinc-400">Serviço selecionado</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={criarServicoInline}
                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium"
                  >
                    Salvar serviço
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
                Nenhum serviço cadastrado. Clique em Novo para adicionar seu primeiro serviço.
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Clientes (somente concluídos)</h2>

            {clientesConcluidos.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 rounded-xl border border-zinc-800 bg-zinc-900">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum atendimento concluído ainda.</p>
                <p className="text-sm mt-2">Aqui aparecem somente clientes com atendimento concluído.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clientesConcluidos.map((agenda) => (
                  <div key={agenda.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-sm font-medium">{agenda.cliente_nome}</p>
                    <p className="text-xs text-zinc-400">{agenda.servico}</p>
                    <p className="text-xs text-emerald-400">{formatarMoeda(obterValorAgendamento(agenda))}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-zinc-500">{formatarDataCurta(agenda.data)} {formatarHoraCurta(agenda.hora)}</p>
                      <p className="text-xs font-semibold text-green-400">CONCLUIDO</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'barbeiros' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Barbeiros</h2>
              <button
                onClick={() => setMostrarNovoBarbeiro((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>

            {mostrarNovoBarbeiro && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
                <p className="text-sm text-zinc-300">Adicionar barbeiro da equipe</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={novoBarbeiro.nome}
                    onChange={(e) => setNovoBarbeiro((prev) => ({ ...prev, nome: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                    placeholder="Nome"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoBarbeiroArquivo(e.target.files?.[0] || null)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                    placeholder="Foto (opcional)"
                  />
                  <input
                    type="text"
                    value={novoBarbeiro.descricao}
                    onChange={(e) => setNovoBarbeiro((prev) => ({ ...prev, descricao: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                    placeholder="Descricao (opcional)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={adicionarBarbeiro}
                    disabled={enviandoFotoBarbeiro}
                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium"
                  >
                    {enviandoFotoBarbeiro ? 'Enviando foto...' : 'Salvar barbeiro'}
                  </button>
                  <button
                    onClick={() => setMostrarNovoBarbeiro(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-700 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {barbeiros.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Nenhum barbeiro cadastrado. Clique em Novo para adicionar.
              </div>
            )}

            {barbeiros.map((barbeiro) => (
              <div key={barbeiro.id} className="bg-zinc-900 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {barbeiro.foto_url ? (
                    <img
                      src={barbeiro.foto_url}
                      alt={barbeiro.nome}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-100">
                      {iniciaisNome(barbeiro.nome)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{barbeiro.nome}</p>
                    <p className="text-sm text-zinc-400 truncate">{barbeiro.descricao || 'Barbeiro da equipe'}</p>
                  </div>
                </div>

                <button
                  onClick={() => removerBarbeiro(barbeiro.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {remarcarAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Remarcar agendamento</h3>
              <button onClick={() => setRemarcarAgendamento(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-zinc-800 p-3 space-y-1 text-sm">
              <p className="font-medium">{remarcarAgendamento.cliente_nome}</p>
              <p className="text-zinc-400">{remarcarAgendamento.servico}</p>
              <p className="text-zinc-500">Atual: {formatarDataCurta(remarcarAgendamento.data)} {formatarHoraCurta(remarcarAgendamento.hora)}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nova data</label>
                <input
                  type="date"
                  value={remarcarData}
                  onChange={(e) => setRemarcarData(e.target.value)}
                  min={hoje}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Novo horário</label>
                <select
                  value={remarcarHora}
                  onChange={(e) => setRemarcarHora(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                >
                  {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRemarcarAgendamento(null)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemarcarAgendamento}
                disabled={remarcarLoading || !remarcarData || !remarcarHora}
                className="flex-1 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-50"
              >
                {remarcarLoading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarNovoAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Agendar por e-mail</h3>
              <button onClick={() => setMostrarNovoAgendamento(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={novoAgendamento.cliente_email}
                onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, cliente_email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                placeholder="E-mail do cliente na plataforma"
              />

              <select
                value={novoAgendamento.servico_id}
                onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, servico_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
              >
                <option value="">Selecione o serviço</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={String(servico.id)}>
                    {servico.nome} - {formatarMoeda(servico.preco)}
                  </option>
                ))}
              </select>

              <select
                value={novoAgendamento.barbeiro_id}
                onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, barbeiro_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
              >
                <option value="">Sem barbeiro especifico</option>
                {barbeiros.map((barbeiro) => (
                  <option key={barbeiro.id} value={String(barbeiro.id)}>{barbeiro.nome}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  min={hoje}
                  value={novoAgendamento.data}
                  onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, data: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                />
                <select
                  value={novoAgendamento.hora}
                  onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
                >
                  {horariosAgendamentoManual.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMostrarNovoAgendamento(false)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoAgendamento}
                disabled={novoAgendamentoLoading}
                className="flex-1 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-50"
              >
                {novoAgendamentoLoading ? 'Salvando...' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

