'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { carregarImagemComoDataUrl, desenharCabecalhoPdf, desenharCardResumoPdf, desenharRodapePdf } from '@/lib/pdfBranding'
import { SERVICE_BY_TYPE, SERVICE_OPTIONS, getServiceImageByName, getServiceImageValueForSave, getServiceNameForTypeChange, inferServiceType, type TipoServicoCatalog } from '@/lib/serviceCatalog'
import { Calendar, Users, Scissors, Plus, CheckCircle, XCircle, Clock, Settings, Store, Trash2, RefreshCw, X, Search, Phone, Mail, Play, Wallet, TrendingUp, AlertTriangle, UserRound, ArrowRight, Pencil, BellRing, BellOff, ChevronLeft, ChevronRight } from 'lucide-react'

type StatusAgenda = 'confirmado' | 'pendente' | 'cancelado' | 'em_atendimento' | 'concluido' | 'faltou'

type ActiveTab = 'agenda' | 'servicos' | 'historico' | 'extrato' | 'barbeiros' | 'clientes'

type FiltroAgenda = 'todos' | 'pendente' | 'confirmado' | 'em_atendimento' | 'concluido'
type FiltroExtrato = '7d' | '30d' | 'mes'

type Agendamento = {
  id: string | number
  cliente_id?: string | number
  cliente_nome: string
  cliente_telefone?: string
  servico: string
  servico_preco?: number
  hora: string
  status: StatusAgenda
  data: string
  barbeiro_nome?: string
  origem?: string
}

type Servico = {
  id: number
  nome: string
  descricao?: string
  imagem?: string | null
  preco: number
  duracao: number
  ativo?: boolean
  pausado_por_assinatura?: boolean
  ativo_antes_pausa_assinatura?: boolean | null
}

type Barbeiro = {
  id: string
  nome: string
  foto_url: string
  descricao: string
  cargo: string
  experiencia: string
}

type ProdutoEstoque = {
  id: string
  nome: string
  categoria?: string
  quantidade_item?: number
  unidade?: string
  estoque_atual: number
  custo_unitario: number
  preco_venda: number
  sem_estoque?: boolean
  estoque_baixo?: boolean
}

type MovimentacaoEstoque = {
  id: string | number
  tipo: string
  quantidade: number
  valor_total?: number | null
  preco_unitario?: number | null
  custo_unitario?: number | null
  movimentado_em?: string | null
  created_at?: string | null
  produto_id?: string | number
  produto_nome?: string
  profissional_id?: string | null
  profissional_nome?: string | null
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
  telefone?: string
  endereco?: string
  horario_abertura?: string
  horario_fechamento?: string
  whatsapp_link?: string
  logo_url?: string
}

type ClienteCadastro = {
  id: string
  nome: string
  email: string
  telefone: string
  total_atendimentos: number
  ultimo_atendimento: string
}

type ClienteResumo = {
  chave: string
  id?: string
  nome: string
  email: string
  telefone: string
  totalAtendimentos: number
  totalGasto: number
  ultimaVisita: string
  proximaVisita: string
  servicoFavorito: string
  cancelamentos: number
  faltas: number
  perfil: 'novo' | 'recorrente' | 'vip'
}

type PermissaoNotificacao = NotificationPermission | 'unsupported'

type ToastNovoAgendamento = {
  titulo: string
  descricao: string
}

type SubscriptionResumo = {
  id?: string | number
  status?: string
  plan_key?: string
  provider?: string
  stripe_subscription_id?: string
  trial_end?: string
  current_period_end?: string
  cancel_at_period_end?: boolean
}

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

const formatarDataCompleta = (dataISO: string) => {
  if (!dataISO) return '--/--/----'
  const [ano, mes, dia] = dataISO.split('-')
  if (!ano || !mes || !dia) return dataISO
  return `${dia}/${mes}/${ano}`
}

const formatarDataAssinatura = (valor?: string) => {
  if (!valor) return ''
  const dt = new Date(valor)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('pt-BR')
}

const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

const formatarHoraCurta = (hora: string) => String(hora || '').slice(0, 5)

const horaAtualInput = () => {
  const agora = new Date()
  return `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
}

const construirDataHoraLocalIso = (dataISO: string, hora: string) => {
  const [ano, mes, dia] = String(dataISO || '').split('-').map(Number)
  const [horas, minutos] = String(hora || '').split(':').map(Number)
  if (!ano || !mes || !dia) return ''

  const data = new Date(ano, (mes || 1) - 1, dia, horas || 0, minutos || 0, 0, 0)
  if (Number.isNaN(data.getTime())) return ''
  return data.toISOString()
}

const calcularDiasRestantesTrial = (valor?: string) => {
  if (!valor) return null
  const dt = new Date(valor)
  if (Number.isNaN(dt.getTime())) return null

  const hoje = new Date()
  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimInicio = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  const diferenca = Math.ceil((fimInicio.getTime() - hojeInicio.getTime()) / (1000 * 60 * 60 * 24))

  return Math.max(0, diferenca)
}

const formatarLabelTrialRestante = (diasRestantes: number | null) => {
  if (diasRestantes === null) return 'Em período grátis'
  if (diasRestantes <= 0) return 'Último dia do teste'
  if (diasRestantes === 1) return '1 dia restante no teste'
  return `${diasRestantes} dias restantes no teste`
}

const normalizarTexto = (valor: string) => String(valor || '').trim().toLowerCase()

const formatarMesAno = (mesISO: string) => {
  const [ano, mes] = String(mesISO || '').split('-')
  if (!ano || !mes) return mesISO

  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const idx = Number(mes) - 1
  const nomeMes = meses[idx] || mes
  return `${nomeMes}/${ano}`
}

const obterMesAnteriorISO = (mesISO: string) => {
  const [anoTexto, mesTexto] = String(mesISO || '').split('-')
  const ano = Number(anoTexto)
  const mes = Number(mesTexto)
  if (!ano || !mes) return ''

  if (mes === 1) {
    return `${ano - 1}-12`
  }

  return `${ano}-${String(mes - 1).padStart(2, '0')}`
}

const calcularVariacaoPercentual = (atual: number, anterior: number) => {
  if (!anterior) {
    return atual > 0 ? 100 : 0
  }

  return ((atual - anterior) / anterior) * 100
}

const formatarVariacaoPercentual = (valor: number) => {
  const arredondado = Math.round(valor)
  return `${arredondado > 0 ? '+' : ''}${arredondado}%`
}

const normalizarNomeArquivo = (valor: string) => {
  return String(valor || 'extrato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

const obterDiasNoMes = (mesISO: string) => {
  const [ano, mes] = String(mesISO || '').split('-').map(Number)
  if (!ano || !mes) return 30
  return new Date(ano, mes, 0).getDate()
}

const GRAFICO_EXTRATO = {
  width: 720,
  height: 280,
  paddingTop: 16,
  paddingRight: 18,
  paddingBottom: 28,
  paddingLeft: 18,
}

const calcularPontosGrafico = (
  valores: number[],
  maxValor: number,
  width = GRAFICO_EXTRATO.width,
  height = GRAFICO_EXTRATO.height
) => {
  if (!Array.isArray(valores) || valores.length === 0) return []

  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = GRAFICO_EXTRATO
  const larguraUtil = width - paddingLeft - paddingRight
  const alturaUtil = height - paddingTop - paddingBottom
  const stepX = valores.length > 1 ? larguraUtil / (valores.length - 1) : 0
  const teto = Math.max(maxValor, 1)

  return valores.map((valor, indice) => {
    const x = paddingLeft + stepX * indice
    const proporcao = Math.min(1, Math.max(0, Number(valor || 0) / teto))
    const y = height - paddingBottom - proporcao * alturaUtil
    return { x, y }
  })
}

const construirLinhaSuave = (pontos: Array<{ x: number; y: number }>) => {
  if (pontos.length === 0) return ''
  if (pontos.length === 1) return `M ${pontos[0].x.toFixed(2)} ${pontos[0].y.toFixed(2)}`

  let path = `M ${pontos[0].x.toFixed(2)} ${pontos[0].y.toFixed(2)}`

  for (let i = 0; i < pontos.length - 1; i += 1) {
    const atual = pontos[i]
    const proximo = pontos[i + 1]
    const pontoMedioX = (atual.x + proximo.x) / 2
    const pontoMedioY = (atual.y + proximo.y) / 2
    path += ` Q ${atual.x.toFixed(2)} ${atual.y.toFixed(2)} ${pontoMedioX.toFixed(2)} ${pontoMedioY.toFixed(2)}`
  }

  const ultimo = pontos[pontos.length - 1]
  path += ` T ${ultimo.x.toFixed(2)} ${ultimo.y.toFixed(2)}`
  return path
}

const construirAreaSuave = (pontos: Array<{ x: number; y: number }>, baseY: number) => {
  if (pontos.length === 0) return ''

  const linha = construirLinhaSuave(pontos)
  const primeiro = pontos[0]
  const ultimo = pontos[pontos.length - 1]

  return `${linha} L ${ultimo.x.toFixed(2)} ${baseY.toFixed(2)} L ${primeiro.x.toFixed(2)} ${baseY.toFixed(2)} Z`
}

const normalizarHora = (valor: unknown, fallback: string) => {
  const texto = String(valor || '').trim().slice(0, 5)
  return /^\d{2}:\d{2}$/.test(texto) ? texto : fallback
}

const criarLinkWhatsApp = (telefone: string, mensagem: string) => {
  const numero = String(telefone || '').replace(/\D/g, '')
  if (!numero) return '#'
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

const formatarTelefone = (telefone: string) => {
  const numero = String(telefone || '').replace(/\D/g, '')
  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`
  }
  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`
  }
  return telefone || 'Sem telefone'
}

const montarMensagemClienteAgendamento = (
  agenda: Agendamento,
  contatoCliente: ClienteCadastro | undefined,
  barbearia: BarbeariaPerfil | null
) => {
  const profissional = agenda.barbeiro_nome ? `\n*Profissional:* ${agenda.barbeiro_nome}` : ''
  const endereco = barbearia?.endereco ? `\n*Local:* ${barbearia.endereco}` : ''
  const nomeCliente = contatoCliente?.nome || agenda.cliente_nome || 'cliente'

  return `Olá ${nomeCliente}! Seu horário foi registrado na *${barbearia?.nome || 'barbearia'}*.

*Serviço:* ${agenda.servico}
*Data:* ${formatarDataCurta(agenda.data)}
*Hora:* ${formatarHoraCurta(agenda.hora)}${profissional}${endereco}

Se precisar remarcar, responda por aqui.`
}

const montarMensagemBarbeariaAgendamento = (
  agenda: Agendamento,
  contatoCliente: ClienteCadastro | undefined,
  barbearia: BarbeariaPerfil | null
) => {
  const telefoneCliente = contatoCliente?.telefone ? `\n*Telefone cliente:* ${formatarTelefone(contatoCliente.telefone)}` : ''
  const profissional = agenda.barbeiro_nome ? `\n*Profissional:* ${agenda.barbeiro_nome}` : ''
  const endereco = barbearia?.endereco ? `\n*Endereço:* ${barbearia.endereco}` : ''

  return `Novo agendamento pelo site na *${barbearia?.nome || 'barbearia'}*.

*Cliente:* ${agenda.cliente_nome}${telefoneCliente}
*Serviço:* ${agenda.servico}
*Data:* ${formatarDataCurta(agenda.data)}
*Hora:* ${formatarHoraCurta(agenda.hora)}${profissional}${endereco}

Origem: site`
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
  if (status === 'em_atendimento') return 'em_atendimento'
  if (status === 'concluido') return 'concluido'
  if (status === 'faltou') return 'faltou'
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

const chaveClienteAgenda = (agenda: Agendamento) => {
  const clienteId = String(agenda.cliente_id || '').trim()
  if (clienteId) return `id:${clienteId}`

  const telefone = String(agenda.cliente_telefone || '').replace(/\D/g, '')
  if (telefone) return `tel:${telefone}`

  const nome = normalizarTexto(agenda.cliente_nome)
  if (nome) return `nome:${nome}`

  return `agenda:${String(agenda.id || '')}`
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

const normalizarAgendamentosApi = (listaRemota: any[] = []): Agendamento[] => {
  const remotos = listaRemota.map((item: any) => ({
    id: item.id,
    cliente_id: item.cliente_id || '',
    cliente_nome: item.cliente_nome || 'Cliente',
    cliente_telefone: item.cliente_telefone || item.cliente_telefone_externo || '',
    servico: item.servico_nome || item.observacoes || 'Serviço agendado',
    servico_preco: Number(item.servico_preco || 0),
    hora: String(item.hora || ''),
    status: normalizarStatusAgenda(String(item.status || 'pendente')),
    data: normalizarDataISO(item.data),
    barbeiro_nome: item.barbeiro_nome || barbeiroFromObservacoes(item.observacoes || ''),
    origem: String(item.origem || 'app'),
  }))

  const vistos = new Set<string>()
  const deduplicados: Agendamento[] = []

  for (const item of remotos.sort(ordenarAgenda)) {
    const chave = chaveUnicaAgendamento(item)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    deduplicados.push(item)
  }

  return deduplicados
}

const statusLabel = (status: StatusAgenda) => {
  switch (status) {
    case 'confirmado':
      return 'Confirmado'
    case 'pendente':
      return 'Pendente'
    case 'cancelado':
      return 'Cancelado'
    case 'em_atendimento':
      return 'Em atendimento'
    case 'concluido':
      return 'Concluído'
    case 'faltou':
      return 'Faltou'
    default:
      return status
  }
}

const agendaContaComoHistorico = (agenda: Agendamento, hoje: string) => {
  if (agenda.status === 'cancelado' || agenda.status === 'faltou' || agenda.status === 'concluido') return true
  return agenda.data < hoje
}

const agendaContaComoReceitaRealizada = (agenda: Agendamento, hoje: string) => {
  if (agenda.status === 'cancelado' || agenda.status === 'faltou') return false
  if (agenda.status === 'concluido') return true
  return agenda.data < hoje
}

const ALERTAS_BARBEARIA_STORAGE_KEY = 'soubarbeiro:barbearia-alertas'
const AGENDA_REFRESH_INTERVAL_MS = 60000
const STATUS_ASSINATURA_LIBERADA = ['active', 'trialing', 'past_due']
const ASSINATURA_CHECKOUT_SYNC_MAX_RETRIES = 5
const ASSINATURA_CHECKOUT_SYNC_DELAY_MS = 1500
const ASSINATURA_BOAS_VINDAS_STORAGE_PREFIX = 'soubarbeiro:subscription-welcome:'

const chaveMonitoramentoAgendamento = (agenda: Agendamento) => {
  return String(agenda.id || chaveUnicaAgendamento(agenda))
}

const podeRemarcarAgendamento = (agenda: Agendamento) => {
  return !['cancelado', 'concluido'].includes(agenda.status)
}

const podeDesmarcarAgendamento = (agenda: Agendamento) => {
  return !['cancelado', 'concluido'].includes(agenda.status)
}

const PLANO_ASSINATURA_LABEL: Record<string, string> = {
  free: 'Sem plano ativo',
  professionals_1: '1 profissional',
  professionals_2_5: '2 a 5 profissionais',
  professionals_6_15: '6 a 15 profissionais',
  professionals_15_plus: '+15 profissionais',
}

const PLANO_ASSINATURA_MAX_PROFISSIONAIS: Record<string, number> = {
  free: 0,
  professionals_1: 1,
  professionals_2_5: 5,
  professionals_6_15: 15,
  professionals_15_plus: 999,
}

const STATUS_ASSINATURA_LABEL: Record<string, string> = {
  active: 'Assinatura ativa',
  trialing: '7 dias grátis',
  past_due: 'Pagamento pendente',
  pending: 'Aguardando aprovação',
  grace_period: 'Período de carência',
  canceled: 'Cancelada',
  inactive: 'Sem assinatura',
}

const aguardar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const obterResumoAssinaturaResposta = (resposta: any): SubscriptionResumo => {
  if (resposta?.subscription) {
    return {
      ...resposta.subscription,
      status: resposta.subscription.status || resposta.status || 'inactive',
      plan_key: resposta.subscription.plan_key || resposta.plan_key || 'free',
    }
  }

  return {
    status: resposta?.status || 'inactive',
    plan_key: resposta?.plan_key || 'free',
  }
}

const obterContextoCheckoutAssinatura = () => {
  if (typeof window === 'undefined') {
    return {
      checkoutSuccess: false,
      checkoutSessionId: '',
    }
  }

  const params = new URLSearchParams(window.location.search)
  return {
    checkoutSuccess: params.get('checkout') === 'success',
    checkoutSessionId: String(params.get('session_id') || '').trim(),
  }
}

const removerCheckoutAssinaturaDaUrl = () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  url.searchParams.delete('checkout')
  url.searchParams.delete('session_id')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

const obterChaveBoasVindasAssinatura = (barbeariaId: string | number) => {
  return `${ASSINATURA_BOAS_VINDAS_STORAGE_PREFIX}${String(barbeariaId)}`
}

const obterFingerprintBoasVindasAssinatura = (subscription: SubscriptionResumo | null) => {
  if (!subscription) return ''

  return [
    String(subscription.stripe_subscription_id || subscription.id || ''),
    String(subscription.plan_key || 'free'),
    String(subscription.status || 'inactive'),
    String(subscription.current_period_end || ''),
  ].join(':')
}

const carregarResumoAssinaturaAtual = async ({
  userId,
  barbeariaId,
  forceStripeSync = false,
  checkoutSessionId = '',
}: {
  userId?: string | number
  barbeariaId: string
  forceStripeSync?: boolean
  checkoutSessionId?: string
}) => {
  const respostaAssinatura = await ApiService.getCurrentSubscription({
    userId,
    barbeariaId,
    refreshFromStripe: forceStripeSync,
    checkoutSessionId,
  })

  return obterResumoAssinaturaResposta(respostaAssinatura)
}

const classificarCliente = (totalAtendimentos: number, totalGasto: number): ClienteResumo['perfil'] => {
  if (totalAtendimentos >= 6 || totalGasto >= 300) return 'vip'
  if (totalAtendimentos >= 3 || totalGasto >= 120) return 'recorrente'
  return 'novo'
}

const normalizarMovimentacaoEstoque = (item: any): MovimentacaoEstoque => ({
  id: item?.id || `mov-${Date.now()}`,
  tipo: String(item?.tipo || ''),
  quantidade: Number(item?.quantidade || 0),
  valor_total: item?.valor_total === null || item?.valor_total === undefined ? null : Number(item.valor_total || 0),
  preco_unitario: item?.preco_unitario === null || item?.preco_unitario === undefined ? null : Number(item.preco_unitario || 0),
  custo_unitario: item?.custo_unitario === null || item?.custo_unitario === undefined ? null : Number(item.custo_unitario || 0),
  movimentado_em: item?.movimentado_em ? String(item.movimentado_em) : null,
  created_at: item?.created_at ? String(item.created_at) : null,
  produto_id: item?.produto_id || '',
  produto_nome: String(item?.produto_nome || ''),
  profissional_id: item?.profissional_id ? String(item.profissional_id) : null,
  profissional_nome: item?.profissional_nome ? String(item.profissional_nome) : null,
})

const obterDataMovimentacaoISO = (movimentacao: MovimentacaoEstoque) => (
  normalizarDataISO(movimentacao.movimentado_em || movimentacao.created_at || '')
)

const normalizarEquipeBarbearia = (equipe: any[]): Barbeiro[] => (
  (Array.isArray(equipe) ? equipe : [])
    .filter((item) => item?.nome)
    .map((item) => ({
      id: String(item.id || `barbeiro-${Date.now()}`),
      nome: String(item.nome || ''),
      foto_url: String(item.foto_url || ''),
      descricao: String(item.descricao || ''),
      cargo: String(item.cargo || item.descricao || 'Barbeiro'),
      experiencia: String(item.experiencia || item.descricao || ''),
    }))
)

const formatarMensagemLimiteProfissionais = (limite: number) => {
  if (!Number.isFinite(limite) || limite <= 0) {
    return 'Seu plano atual não permite cadastrar novos barbeiros.'
  }

  if (limite === 1) {
    return 'Seu plano atual permite apenas 1 barbeiro. Troque para o próximo plano para montar uma equipe maior.'
  }

  return `Seu plano atual permite até ${limite} barbeiros. Troque de plano para ampliar a equipe.`
}

type AuthState = {
  user?: AuthUser
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

export default function BarbeariaDashboard() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth() as AuthState
  const [activeTab, setActiveTab] = useState<ActiveTab>('agenda')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientesCadastrados, setClientesCadastrados] = useState<ClienteCadastro[]>([])
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [barbearia, setBarbearia] = useState<BarbeariaPerfil | null>(null)
  const [subscriptionResumo, setSubscriptionResumo] = useState<SubscriptionResumo | null>(null)
  const [mostrarNovoServico, setMostrarNovoServico] = useState(false)
  const [mostrarNovoBarbeiro, setMostrarNovoBarbeiro] = useState(false)
  const [novoServico, setNovoServico] = useState({
    tipo: 'cabelo' as TipoServicoCatalog,
    nome: SERVICE_BY_TYPE.cabelo.nome,
    preco: '',
    duracao: '40',
  })
  const [servicoEmEdicaoId, setServicoEmEdicaoId] = useState<number | null>(null)
  const [edicaoServico, setEdicaoServico] = useState({
    tipo: 'cabelo' as TipoServicoCatalog,
    nome: SERVICE_BY_TYPE.cabelo.nome,
    preco: '',
    duracao: '40',
  })
  const [salvandoServico, setSalvandoServico] = useState(false)
  const [removendoServicoId, setRemovendoServicoId] = useState<number | null>(null)
  const [novoBarbeiro, setNovoBarbeiro] = useState({
    nome: '',
    descricao: '',
  })
  const [fotoBarbeiroArquivo, setFotoBarbeiroArquivo] = useState<File | null>(null)
  const [enviandoFotoBarbeiro, setEnviandoFotoBarbeiro] = useState(false)
  const [erro, setErro] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [alertasAtivos, setAlertasAtivos] = useState(false)
  const [permissaoNotificacao, setPermissaoNotificacao] = useState<PermissaoNotificacao>('unsupported')
  const [toastNovoAgendamento, setToastNovoAgendamento] = useState<ToastNovoAgendamento | null>(null)
  const [checkoutSuccessPendente, setCheckoutSuccessPendente] = useState(false)
  const [mostrarBoasVindasAssinatura, setMostrarBoasVindasAssinatura] = useState(false)
  const [agendaRefreshKey, setAgendaRefreshKey] = useState(0)
  const [remarcarAgendamento, setRemarcarAgendamento] = useState<Agendamento | null>(null)
  const [remarcarData, setRemarcarData] = useState('')
  const [remarcarHora, setRemarcarHora] = useState('')
  const [remarcarLoading, setRemarcarLoading] = useState(false)
  const [mostrarNovoMenu, setMostrarNovoMenu] = useState(false)
  const [mostrarNovoAgendamento, setMostrarNovoAgendamento] = useState(false)
  const [mostrarNovaVenda, setMostrarNovaVenda] = useState(false)
  const [buscaAgenda, setBuscaAgenda] = useState('')
  const [filtroAgenda, setFiltroAgenda] = useState<FiltroAgenda>('todos')
  const [novoAgendamento, setNovoAgendamento] = useState({
    cliente_email: '',
    servico_id: '',
    barbeiro_id: '',
    data: '',
    hora: '',
  })
  const [novoAgendamentoLoading, setNovoAgendamentoLoading] = useState(false)
  const [produtosEstoqueVenda, setProdutosEstoqueVenda] = useState<ProdutoEstoque[]>([])
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState<MovimentacaoEstoque[]>([])
  const [carregandoProdutosVenda, setCarregandoProdutosVenda] = useState(false)
  const [novaVenda, setNovaVenda] = useState({
    produto_id: '',
    barbeiro_id: '',
    quantidade: '1',
    data: hojeISO(),
    hora: horaAtualInput(),
  })
  const [novaVendaLoading, setNovaVendaLoading] = useState(false)
  const [assinaturaActionLoading, setAssinaturaActionLoading] = useState(false)
  const [mesExtratoSelecionado, setMesExtratoSelecionado] = useState('')
  const [filtroExtrato, setFiltroExtrato] = useState<FiltroExtrato>('mes')
  const [diaHoverExtrato, setDiaHoverExtrato] = useState<number | null>(null)
  const [exportandoExtratoPdf, setExportandoExtratoPdf] = useState(false)
  const secaoAtivaRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const agendamentosConhecidosRef = useRef<Set<string>>(new Set())
  const monitoramentoAgendaInicializadoRef = useRef(false)
  const dashboardCarregadoRef = useRef(false)
  const agendaRefreshInFlightRef = useRef(false)
  const toastNovoAgendamentoTimeoutRef = useRef<number | null>(null)
  const hoje = useMemo(() => hojeISO(), [])

  const horarioAbertura = normalizarHora((barbearia as any)?.horario_abertura, '09:00')
  const horarioFechamento = normalizarHora((barbearia as any)?.horario_fechamento, '18:00')
  const horariosAgendamentoManual = useMemo(
    () => gerarHorariosIntervalo(horarioAbertura, horarioFechamento, 30),
    [horarioAbertura, horarioFechamento]
  )
  const produtoVendaSelecionado = useMemo(
    () => produtosEstoqueVenda.find((item) => String(item.id) === String(novaVenda.produto_id)) || null,
    [produtosEstoqueVenda, novaVenda.produto_id]
  )
  const quantidadeVendaNumero = useMemo(() => Number(novaVenda.quantidade || 0), [novaVenda.quantidade])
  const vendaExcedeEstoque = useMemo(
    () => Boolean(produtoVendaSelecionado && quantidadeVendaNumero > Number(produtoVendaSelecionado.estoque_atual || 0)),
    [produtoVendaSelecionado, quantidadeVendaNumero]
  )

  const resumoPermissaoNotificacao = useMemo(() => {
    if (permissaoNotificacao === 'granted') return 'notificação do navegador liberada'
    if (permissaoNotificacao === 'denied') return 'notificação do navegador bloqueada'
    if (permissaoNotificacao === 'default') return 'notificação do navegador pendente'
    return 'somente aviso visual neste dispositivo'
  }, [permissaoNotificacao])

  const subscriptionStatus = subscriptionResumo?.status || 'inactive'
  const subscriptionPlanKey = subscriptionResumo?.plan_key || 'free'
  const subscriptionTrialDaysLeft = useMemo(
    () => calcularDiasRestantesTrial(subscriptionResumo?.trial_end),
    [subscriptionResumo?.trial_end]
  )
  const subscriptionStatusLabel = subscriptionStatus === 'trialing'
    ? formatarLabelTrialRestante(subscriptionTrialDaysLeft)
    : (STATUS_ASSINATURA_LABEL[subscriptionStatus] || subscriptionStatus)
  const subscriptionPlanLabel = PLANO_ASSINATURA_LABEL[subscriptionPlanKey] || subscriptionPlanKey
  const subscriptionMaxProfessionals = PLANO_ASSINATURA_MAX_PROFISSIONAIS[subscriptionPlanKey] ?? 0
  const subscriptionTrialEndLabel = formatarDataAssinatura(subscriptionResumo?.trial_end)
  const subscriptionPeriodEndLabel = formatarDataAssinatura(subscriptionResumo?.current_period_end)
  const assinaturaPodeGerenciar = STATUS_ASSINATURA_LIBERADA.includes(subscriptionStatus)
  const gestaoOperacionalLiberada = STATUS_ASSINATURA_LIBERADA.includes(subscriptionStatus)
  const recursosPremiumLiberados = gestaoOperacionalLiberada
  const painelModoConsulta = !gestaoOperacionalLiberada
  const equipeAtingiuLimitePlano = recursosPremiumLiberados
    && subscriptionMaxProfessionals > 0
    && barbeiros.length >= subscriptionMaxProfessionals
  const equipeAcimaDoLimitePlano = recursosPremiumLiberados
    && subscriptionMaxProfessionals > 0
    && barbeiros.length > subscriptionMaxProfessionals
  const assinaturaChipClassName = assinaturaPodeGerenciar
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : subscriptionStatus === 'grace_period'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-zinc-700 bg-zinc-900/80 text-zinc-300'

  const prepararAudioAlertas = async () => {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return false

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext()
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      return audioContextRef.current.state === 'running'
    } catch {
      return false
    }
  }

  const tocarSomNovoAgendamento = async () => {
    if (!alertasAtivos) return

    const audioPronto = await prepararAudioAlertas()
    if (!audioPronto || !audioContextRef.current) return

    const contexto = audioContextRef.current
    const inicio = contexto.currentTime
    const notas = [880, 1174, 1568]

    notas.forEach((frequencia, indice) => {
      const oscilador = contexto.createOscillator()
      const ganho = contexto.createGain()
      const inicioNota = inicio + indice * 0.12

      oscilador.type = 'sine'
      oscilador.frequency.setValueAtTime(frequencia, inicioNota)
      ganho.gain.setValueAtTime(0.0001, inicioNota)
      ganho.gain.exponentialRampToValueAtTime(0.08, inicioNota + 0.02)
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicioNota + 0.18)

      oscilador.connect(ganho)
      ganho.connect(contexto.destination)
      oscilador.start(inicioNota)
      oscilador.stop(inicioNota + 0.2)
    })
  }

  const mostrarNotificacaoNativa = (titulo: string, descricao: string) => {
    if (
      !alertasAtivos ||
      permissaoNotificacao !== 'granted' ||
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      document.visibilityState === 'visible'
    ) {
      return
    }

    const notificacao = new Notification(titulo, {
      body: descricao,
      icon: '/logo.png',
      tag: 'soubarbeiro-novo-agendamento',
    })

    notificacao.onclick = () => {
      window.focus()
      notificacao.close()
    }
  }

  const dispararAlertaNovoAgendamento = (novosAgendamentos: Agendamento[], barbeariaAtual: BarbeariaPerfil | null) => {
    if (novosAgendamentos.length === 0) return

    const destaque = [...novosAgendamentos].sort(ordenarAgenda)[0]
    const titulo = novosAgendamentos.length > 1 ? `${novosAgendamentos.length} novos agendamentos` : 'Novo agendamento'
    const detalhesDestaque = `${destaque.cliente_nome} • ${formatarDataCurta(destaque.data)} às ${formatarHoraCurta(destaque.hora)}`
    const descricao = novosAgendamentos.length > 1
      ? `${detalhesDestaque} e mais ${novosAgendamentos.length - 1} reserva(s) no painel.`
      : `${detalhesDestaque} para ${destaque.servico}.`

    setToastNovoAgendamento({ titulo, descricao })
    void tocarSomNovoAgendamento()
    mostrarNotificacaoNativa(
      barbeariaAtual?.nome ? `${titulo} em ${barbeariaAtual.nome}` : titulo,
      descricao
    )
  }

  const sincronizarMonitoramentoAgendamentos = (lista: Agendamento[], barbeariaAtual: BarbeariaPerfil | null) => {
    const ativos = lista.filter((agenda) => agenda.status !== 'cancelado')
    const chavesAtuais = new Set(ativos.map(chaveMonitoramentoAgendamento))

    if (!monitoramentoAgendaInicializadoRef.current) {
      agendamentosConhecidosRef.current = chavesAtuais
      monitoramentoAgendaInicializadoRef.current = true
      return
    }

    const novosAgendamentos = ativos.filter((agenda) => !agendamentosConhecidosRef.current.has(chaveMonitoramentoAgendamento(agenda)))
    agendamentosConhecidosRef.current = chavesAtuais

    if (novosAgendamentos.length > 0) {
      dispararAlertaNovoAgendamento(novosAgendamentos, barbeariaAtual)
    }
  }

  const alternarAlertasAgendamento = async () => {
    const proximoEstado = !alertasAtivos
    setAlertasAtivos(proximoEstado)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ALERTAS_BARBEARIA_STORAGE_KEY, proximoEstado ? '1' : '0')
    }

    if (!proximoEstado) return

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        const permissao = await Notification.requestPermission()
        setPermissaoNotificacao(permissao)
      } catch {
        setPermissaoNotificacao('default')
      }
    }

    await prepararAudioAlertas()
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    setAlertasAtivos(window.localStorage.getItem(ALERTAS_BARBEARIA_STORAGE_KEY) === '1')
    setPermissaoNotificacao('Notification' in window ? Notification.permission : 'unsupported')
  }, [])

  useEffect(() => {
    if (!checkoutSuccessPendente || !barbearia?.id || !subscriptionResumo) return
    if (!STATUS_ASSINATURA_LIBERADA.includes(String(subscriptionResumo.status || '').trim())) return
    if (typeof window === 'undefined') return

    const storageKey = obterChaveBoasVindasAssinatura(barbearia.id)
    const fingerprint = obterFingerprintBoasVindasAssinatura(subscriptionResumo)

    if (!fingerprint) return

    if (window.localStorage.getItem(storageKey) !== fingerprint) {
      window.localStorage.setItem(storageKey, fingerprint)
      setMostrarBoasVindasAssinatura(true)
    }

    removerCheckoutAssinaturaDaUrl()
    setCheckoutSuccessPendente(false)
  }, [
    checkoutSuccessPendente,
    barbearia?.id,
    subscriptionResumo,
  ])

  const abrirCentralAssinatura = async () => {
    if (!barbearia?.id || !user?.id) {
      window.location.href = '/barbearia/planos'
      return
    }

    if (!assinaturaPodeGerenciar) {
      window.location.href = '/barbearia/planos'
      return
    }

    if (String(subscriptionResumo?.provider || 'stripe').trim() !== 'stripe') {
      window.location.href = '/barbearia/planos'
      return
    }

    try {
      setAssinaturaActionLoading(true)
      const resposta = await ApiService.createSubscriptionCustomerPortal({
        userId: user.id,
        barbeariaId: String(barbearia.id),
      })

      if (!resposta?.portal_url) {
        throw new Error('Não foi possível abrir a central de cobrança agora.')
      }

      window.location.href = resposta.portal_url
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível abrir a central de cobrança agora.')
    } finally {
      setAssinaturaActionLoading(false)
    }
  }

  useEffect(() => {
    if (!gestaoOperacionalLiberada && (activeTab === 'servicos' || activeTab === 'barbeiros')) {
      setActiveTab('agenda')
    }
  }, [gestaoOperacionalLiberada, activeTab])

  const abrirPlanosAssinatura = () => {
    window.location.href = '/barbearia/planos'
  }

  const avisarBloqueioPremium = (recurso: string) => {
    setErro(`${recurso} está disponível com assinatura ativa. Os dados básicos da barbearia continuam liberados.`)
  }

  const avisarModoConsulta = () => {
    setErro('Assinatura inativa. O painel está em modo consulta até a regularização do pagamento.')
  }

  useEffect(() => {
    if (!toastNovoAgendamento) return

    if (toastNovoAgendamentoTimeoutRef.current) {
      window.clearTimeout(toastNovoAgendamentoTimeoutRef.current)
    }

    toastNovoAgendamentoTimeoutRef.current = window.setTimeout(() => {
      setToastNovoAgendamento(null)
    }, 7000)

    return () => {
      if (toastNovoAgendamentoTimeoutRef.current) {
        window.clearTimeout(toastNovoAgendamentoTimeoutRef.current)
      }
    }
  }, [toastNovoAgendamento])

  useEffect(() => {
    return () => {
      if (toastNovoAgendamentoTimeoutRef.current) {
        window.clearTimeout(toastNovoAgendamentoTimeoutRef.current)
      }

      const contexto = audioContextRef.current
      audioContextRef.current = null
      if (contexto && contexto.state !== 'closed') {
        contexto.close().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    agendamentosConhecidosRef.current = new Set()
    monitoramentoAgendaInicializadoRef.current = false
  }, [barbearia?.id])

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
      .filter((item) => agendaContaComoHistorico(item, hoje))
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
  const limiteInatividade = useMemo(() => {
    const data = new Date()
    data.setDate(data.getDate() - 30)
    return data.toISOString().slice(0, 10)
  }, [])
  const horaAtual = useMemo(() => new Date().toTimeString().slice(0, 5), [agendaRefreshKey, agendamentos.length])

  const faturamentoPrevistoMes = useMemo(
    () => agendamentos
      .filter((agenda) => agenda.status !== 'cancelado' && agenda.status !== 'faltou' && String(agenda.data || '').startsWith(mesAtual))
      .reduce((acc, agenda) => acc + obterValorAgendamento(agenda), 0),
    [agendamentos, mesAtual, servicoPrecoPorNome]
  )

  const vendasEstoqueMesAtual = useMemo(
    () => movimentacoesEstoque.filter((movimentacao) => (
      normalizarTexto(movimentacao.tipo).toLowerCase() === 'venda'
      && obterDataMovimentacaoISO(movimentacao).startsWith(mesAtual)
    )),
    [movimentacoesEstoque, mesAtual]
  )

  const faturamentoVendasMes = useMemo(
    () => vendasEstoqueMesAtual.reduce((acc, movimentacao) => acc + Number(movimentacao.valor_total || 0), 0),
    [vendasEstoqueMesAtual]
  )

  const faturamentoRealizadoMes = useMemo(
    () => (
      agendamentos
        .filter((agenda) => String(agenda.data || '').startsWith(mesAtual) && agendaContaComoReceitaRealizada(agenda, hoje))
        .reduce((acc, agenda) => acc + obterValorAgendamento(agenda), 0)
      + faturamentoVendasMes
    ),
    [agendamentos, mesAtual, hoje, servicoPrecoPorNome, faturamentoVendasMes]
  )

  const registrosRealizadosMes = useMemo(
    () => (
      agendamentos.filter((agenda) => agendaContaComoReceitaRealizada(agenda, hoje) && String(agenda.data || '').startsWith(mesAtual)).length
      + vendasEstoqueMesAtual.length
    ),
    [agendamentos, hoje, mesAtual, vendasEstoqueMesAtual]
  )

  const ticketMedioMes = useMemo(
    () => (registrosRealizadosMes > 0 ? faturamentoRealizadoMes / registrosRealizadosMes : 0),
    [faturamentoRealizadoMes, registrosRealizadosMes]
  )

  const clientesAtivosMes = useMemo(
    () => new Set(
      agendamentos
        .filter((agenda) => String(agenda.data || '').startsWith(mesAtual) && agenda.status !== 'cancelado')
        .map((agenda) => chaveClienteAgenda(agenda))
        .filter(Boolean)
    ).size,
    [agendamentos, mesAtual]
  )

  const ocupacaoHoje = useMemo(
    () => (horariosAgendamentoManual.length > 0 ? Math.min(100, Math.round((agendamentosHoje.length / horariosAgendamentoManual.length) * 100)) : 0),
    [agendamentosHoje.length, horariosAgendamentoManual.length]
  )

  const confirmacoesPendentes = useMemo(
    () => agendamentos.filter((agenda) => agenda.status === 'pendente' && agenda.data >= hoje).length,
    [agendamentos, hoje]
  )

  const atendimentosEmAndamento = useMemo(
    () => agendamentosHoje.filter((agenda) => agenda.status === 'em_atendimento').length,
    [agendamentosHoje]
  )

  const atrasadosHoje = useMemo(
    () => agendamentosHoje.filter((agenda) => ['pendente', 'confirmado'].includes(agenda.status) && formatarHoraCurta(agenda.hora) < horaAtual).length,
    [agendamentosHoje, horaAtual]
  )

  const proximoAtendimento = useMemo(() => {
    const referencia = `${hoje}T${horaAtual}`
    return (
      [...agendamentosHoje, ...proximosAgendamentos]
        .filter((agenda) => !['cancelado', 'concluido', 'faltou'].includes(agenda.status))
        .find((agenda) => `${agenda.data}T${formatarHoraCurta(agenda.hora)}` >= referencia) ||
      agendamentosHoje[0] ||
      proximosAgendamentos[0] ||
      null
    )
  }, [agendamentosHoje, proximosAgendamentos, hoje, horaAtual])

  const contatosClientesPorNome = useMemo(() => {
    const mapa = new Map<string, ClienteCadastro>()
    for (const cliente of clientesCadastrados) {
      const chave = normalizarTexto(cliente.nome)
      if (!chave) continue
      mapa.set(chave, cliente)
    }
    return mapa
  }, [clientesCadastrados])

  const contatosClientesPorId = useMemo(() => {
    const mapa = new Map<string, ClienteCadastro>()
    for (const cliente of clientesCadastrados) {
      const chave = String(cliente.id || '').trim()
      if (!chave) continue
      mapa.set(chave, cliente)
    }
    return mapa
  }, [clientesCadastrados])

  const agendamentosHojeFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaAgenda)
    return agendamentosHoje.filter((agenda) => {
      if (filtroAgenda !== 'todos' && agenda.status !== filtroAgenda) return false
      if (!termo) return true
      return (
        normalizarTexto(agenda.cliente_nome).includes(termo) ||
        normalizarTexto(agenda.servico).includes(termo) ||
        normalizarTexto(agenda.barbeiro_nome || '').includes(termo)
      )
    })
  }, [agendamentosHoje, buscaAgenda, filtroAgenda])

  const extratoMensal = useMemo(() => {
    const mapa = new Map<string, {
      totalPrevisto: number
      totalRealizado: number
      qtd: number
      seriePrevisto: number[]
      serieRealizado: number[]
      serieAtendimentos: number[]
    }>()

    for (const agenda of agendamentos) {
      if (agenda.status === 'cancelado') continue
      const mes = String(agenda.data || '').slice(0, 7)
      if (!mes) continue
      const diaIndice = Math.max(0, Number(String(agenda.data || '').slice(8, 10)) - 1)

      const atual = mapa.get(mes) || {
        totalPrevisto: 0,
        totalRealizado: 0,
        qtd: 0,
        seriePrevisto: Array.from({ length: obterDiasNoMes(mes) }, () => 0),
        serieRealizado: Array.from({ length: obterDiasNoMes(mes) }, () => 0),
        serieAtendimentos: Array.from({ length: obterDiasNoMes(mes) }, () => 0),
      }
      if (agenda.status !== 'faltou') {
        const valor = obterValorAgendamento(agenda)
        atual.totalPrevisto += valor
        atual.seriePrevisto[diaIndice] = (atual.seriePrevisto[diaIndice] || 0) + valor
        atual.serieAtendimentos[diaIndice] = (atual.serieAtendimentos[diaIndice] || 0) + 1
      }
      if (agendaContaComoReceitaRealizada(agenda, hoje)) {
        const valor = obterValorAgendamento(agenda)
        atual.totalRealizado += valor
        atual.serieRealizado[diaIndice] = (atual.serieRealizado[diaIndice] || 0) + valor
      }
      atual.qtd += 1
      mapa.set(mes, atual)
    }

    for (const movimentacao of movimentacoesEstoque) {
      if (normalizarTexto(movimentacao.tipo).toLowerCase() !== 'venda') continue

      const dataMovimentacao = obterDataMovimentacaoISO(movimentacao)
      const mes = String(dataMovimentacao || '').slice(0, 7)
      if (!mes) continue

      const diaIndice = Math.max(0, Number(String(dataMovimentacao || '').slice(8, 10)) - 1)
      const atual = mapa.get(mes) || {
        totalPrevisto: 0,
        totalRealizado: 0,
        qtd: 0,
        seriePrevisto: Array.from({ length: obterDiasNoMes(mes) }, () => 0),
        serieRealizado: Array.from({ length: obterDiasNoMes(mes) }, () => 0),
        serieAtendimentos: Array.from({ length: obterDiasNoMes(mes) }, () => 0),
      }

      const valor = Number(movimentacao.valor_total || 0)
      atual.totalRealizado += valor
      atual.serieRealizado[diaIndice] = (atual.serieRealizado[diaIndice] || 0) + valor
      atual.serieAtendimentos[diaIndice] = (atual.serieAtendimentos[diaIndice] || 0) + 1
      atual.qtd += 1
      mapa.set(mes, atual)
    }

    return Array.from(mapa.entries())
      .map(([mes, dados]) => ({
        mes,
        totalPrevisto: dados.totalPrevisto,
        totalRealizado: dados.totalRealizado,
        qtd: dados.qtd,
        seriePrevisto: dados.seriePrevisto,
        serieRealizado: dados.serieRealizado,
        serieAtendimentos: dados.serieAtendimentos,
      }))
      .sort((a, b) => b.mes.localeCompare(a.mes))
  }, [agendamentos, hoje, servicoPrecoPorNome, movimentacoesEstoque])

  useEffect(() => {
    if (extratoMensal.length === 0) {
      if (mesExtratoSelecionado) setMesExtratoSelecionado('')
      return
    }

    const mesPadrao = extratoMensal.find((item) => item.mes === mesAtual)?.mes || extratoMensal[0]?.mes || ''
    if (!mesExtratoSelecionado || !extratoMensal.some((item) => item.mes === mesExtratoSelecionado)) {
      setMesExtratoSelecionado(mesPadrao)
    }
  }, [extratoMensal, mesAtual, mesExtratoSelecionado])

  useEffect(() => {
    setDiaHoverExtrato(null)
  }, [mesExtratoSelecionado])

  const extratoMesSelecionado = useMemo(
    () => extratoMensal.find((item) => item.mes === mesExtratoSelecionado) || extratoMensal[0] || null,
    [extratoMensal, mesExtratoSelecionado]
  )

  const indiceMesExtratoSelecionado = useMemo(
    () => extratoMensal.findIndex((item) => item.mes === mesExtratoSelecionado),
    [extratoMensal, mesExtratoSelecionado]
  )

  const extratoPeriodoAtual = useMemo(() => {
    if (!extratoMesSelecionado) return null

    const totalDias = extratoMesSelecionado.seriePrevisto.length
    const indiceFimNatural = extratoMesSelecionado.mes === mesAtual
      ? Math.max(0, Math.min(Number(hoje.slice(8, 10)) - 1, totalDias - 1))
      : totalDias - 1

    const quantidadeDiasFiltro = filtroExtrato === '7d'
      ? 7
      : filtroExtrato === '30d'
        ? 30
        : indiceFimNatural + 1

    const indiceInicial = filtroExtrato === 'mes'
      ? 0
      : Math.max(0, indiceFimNatural - quantidadeDiasFiltro + 1)

    const dias = Array.from({ length: indiceFimNatural - indiceInicial + 1 }, (_, offset) => {
      const indiceOriginal = indiceInicial + offset
      const diaMes = indiceOriginal + 1
      return {
        indiceOriginal,
        diaMes,
        dataISO: `${extratoMesSelecionado.mes}-${String(diaMes).padStart(2, '0')}`,
        previsto: extratoMesSelecionado.seriePrevisto[indiceOriginal] || 0,
        realizado: extratoMesSelecionado.serieRealizado[indiceOriginal] || 0,
        atendimentos: extratoMesSelecionado.serieAtendimentos[indiceOriginal] || 0,
      }
    })

    const totalPrevisto = dias.reduce((acc, item) => acc + item.previsto, 0)
    const totalRealizado = dias.reduce((acc, item) => acc + item.realizado, 0)
    const totalAtendimentos = dias.reduce((acc, item) => acc + item.atendimentos, 0)
    const ticketMedio = totalAtendimentos > 0 ? totalRealizado / totalAtendimentos : 0
    const primeiroDia = dias[0]
    const ultimoDia = dias[dias.length - 1]
    const labelPeriodo = filtroExtrato === 'mes'
      ? extratoMesSelecionado.mes === mesAtual
        ? `Mês atual até ${formatarDataCurta(ultimoDia?.dataISO || hoje)}`
        : `Mês completo ${formatarMesAno(extratoMesSelecionado.mes)}`
      : `${formatarDataCurta(primeiroDia?.dataISO || '')} a ${formatarDataCurta(ultimoDia?.dataISO || '')}`

    return {
      dias,
      indiceInicial,
      indiceFimNatural,
      totalPrevisto,
      totalRealizado,
      totalAtendimentos,
      ticketMedio,
      labelPeriodo,
    }
  }, [extratoMesSelecionado, filtroExtrato, hoje, mesAtual])

  useEffect(() => {
    setDiaHoverExtrato(null)
  }, [mesExtratoSelecionado, filtroExtrato])

  const diaDestaqueExtrato = useMemo(() => {
    if (!extratoPeriodoAtual) return 0
    if (diaHoverExtrato !== null) {
      return Math.max(0, Math.min(diaHoverExtrato, extratoPeriodoAtual.dias.length - 1))
    }

    return Math.max(0, extratoPeriodoAtual.dias.length - 1)
  }, [diaHoverExtrato, extratoPeriodoAtual])

  const graficoExtrato = useMemo(() => {
    if (!extratoPeriodoAtual) return null

    const seriePrevisto = extratoPeriodoAtual.dias.map((item) => item.previsto)
    const serieRealizado = extratoPeriodoAtual.dias.map((item) => item.realizado)
    const maxValor = Math.max(...seriePrevisto, ...serieRealizado, 1)
    const previstoPontos = calcularPontosGrafico(seriePrevisto, maxValor)
    const realizadoPontos = calcularPontosGrafico(serieRealizado, maxValor)
    const baseY = GRAFICO_EXTRATO.height - GRAFICO_EXTRATO.paddingBottom
    const linhasHorizontais = Array.from({ length: 4 }, (_, indice) => {
      const proporcao = indice / 3
      const y = GRAFICO_EXTRATO.paddingTop + proporcao * (baseY - GRAFICO_EXTRATO.paddingTop)
      const valor = Math.round(maxValor * (1 - proporcao))
      return { y, valor }
    })

    const totalDias = extratoPeriodoAtual.dias.length
    const quantidadeMarcadoresX = totalDias <= 10 ? totalDias : 6
    const marcadoresX = Array.from({ length: quantidadeMarcadoresX }, (_, indice) => {
      if (quantidadeMarcadoresX === 1) return 0
      return Math.round(((totalDias - 1) * indice) / (quantidadeMarcadoresX - 1))
    }).filter((indice, posicao, arr) => arr.indexOf(indice) === posicao)

    return {
      maxValor,
      previstoPontos,
      realizadoPontos,
      previstoPath: construirLinhaSuave(previstoPontos),
      previstoAreaPath: construirAreaSuave(previstoPontos, baseY),
      realizadoPath: construirLinhaSuave(realizadoPontos),
      baseY,
      linhasHorizontais,
      marcadoresX,
    }
  }, [extratoPeriodoAtual])

  const resumoDiaExtrato = useMemo(() => {
    if (!extratoPeriodoAtual || !graficoExtrato) return null

    const dia = extratoPeriodoAtual.dias[diaDestaqueExtrato]
    if (!dia) return null

    const pontoPrevisto = graficoExtrato.previstoPontos[diaDestaqueExtrato]
    const pontoRealizado = graficoExtrato.realizadoPontos[diaDestaqueExtrato]
    const pontoBase = pontoRealizado && dia.realizado > 0 ? pontoRealizado : pontoPrevisto

    return {
      ...dia,
      ponto: pontoBase,
    }
  }, [diaDestaqueExtrato, extratoPeriodoAtual, graficoExtrato])

  const tooltipGraficoExtratoAtivo = diaHoverExtrato !== null

  const comparacaoMesAnterior = useMemo(() => {
    if (!extratoMesSelecionado) return null

    const mesAnterior = obterMesAnteriorISO(extratoMesSelecionado.mes)
    const dadosMesAnterior = extratoMensal.find((item) => item.mes === mesAnterior) || null
    const totalPrevistoAnterior = dadosMesAnterior?.totalPrevisto || 0
    const totalRealizadoAnterior = dadosMesAnterior?.totalRealizado || 0
    const quantidadeAnterior = dadosMesAnterior?.qtd || 0

    return {
      mesAnterior,
      labelMesAnterior: dadosMesAnterior ? formatarMesAno(dadosMesAnterior.mes) : 'Mês anterior sem base',
      totalPrevistoAnterior,
      totalRealizadoAnterior,
      quantidadeAnterior,
      variacaoPrevisto: calcularVariacaoPercentual(extratoMesSelecionado.totalPrevisto, totalPrevistoAnterior),
      variacaoRealizado: calcularVariacaoPercentual(extratoMesSelecionado.totalRealizado, totalRealizadoAnterior),
      variacaoQuantidade: calcularVariacaoPercentual(extratoMesSelecionado.qtd, quantidadeAnterior),
    }
  }, [extratoMesSelecionado, extratoMensal])

  const clientesResumo = useMemo(() => {
    const mapa = new Map<string, ClienteResumo & { servicosMapa: Map<string, number> }>()

    for (const cliente of clientesCadastrados) {
      const chaveId = String(cliente.id || '').trim()
      const chaveNome = normalizarTexto(cliente.nome)
      const chave = chaveId ? `id:${chaveId}` : `nome:${chaveNome}`
      if (!chave) continue

      mapa.set(chave, {
        chave,
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        totalAtendimentos: 0,
        totalGasto: 0,
        ultimaVisita: normalizarDataISO(cliente.ultimo_atendimento),
        proximaVisita: '',
        servicoFavorito: '',
        cancelamentos: 0,
        faltas: 0,
        perfil: 'novo',
        servicosMapa: new Map<string, number>(),
      })
    }

    for (const agenda of agendamentos) {
      const chave = chaveClienteAgenda(agenda)
      if (!chave) continue

      const atual = mapa.get(chave) || {
        chave,
        nome: agenda.cliente_nome,
        email: '',
        telefone: agenda.cliente_telefone || '',
        totalAtendimentos: 0,
        totalGasto: 0,
        ultimaVisita: '',
        proximaVisita: '',
        servicoFavorito: '',
        cancelamentos: 0,
        faltas: 0,
        perfil: 'novo' as ClienteResumo['perfil'],
        servicosMapa: new Map<string, number>(),
      }

      if (agenda.status === 'cancelado') {
        atual.cancelamentos += 1
      } else if (agenda.status === 'faltou') {
        atual.faltas += 1
      } else if (agendaContaComoReceitaRealizada(agenda, hoje)) {
        atual.totalAtendimentos += 1
        atual.totalGasto += obterValorAgendamento(agenda)
        if (!atual.ultimaVisita || `${agenda.data}T${agenda.hora}` > `${atual.ultimaVisita}T00:00`) {
          atual.ultimaVisita = agenda.data
        }

        const totalServico = atual.servicosMapa.get(agenda.servico) || 0
        atual.servicosMapa.set(agenda.servico, totalServico + 1)
      }

      if (agenda.status !== 'cancelado' && agenda.status !== 'faltou' && agenda.data > hoje) {
        if (!atual.proximaVisita || `${agenda.data}T${agenda.hora}` < `${atual.proximaVisita}T23:59`) {
          atual.proximaVisita = agenda.data
        }
      }

      mapa.set(chave, atual)
    }

    return Array.from(mapa.values())
      .map((cliente) => {
        const cadastroRelacionado = clientesCadastrados.find((item) => {
          const itemId = String(item.id || '').trim()
          if (cliente.id && itemId && cliente.id === itemId) return true
          return normalizarTexto(item.nome) === normalizarTexto(cliente.nome)
        })

        const servicoFavorito = Array.from(cliente.servicosMapa.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem histórico'

        return {
          chave: cliente.chave,
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          totalAtendimentos: cliente.totalAtendimentos || Number(cadastroRelacionado?.total_atendimentos || 0),
          totalGasto: cliente.totalGasto,
          ultimaVisita: cliente.ultimaVisita,
          proximaVisita: cliente.proximaVisita,
          servicoFavorito,
          cancelamentos: cliente.cancelamentos,
          faltas: cliente.faltas,
          perfil: classificarCliente(
            cliente.totalAtendimentos || Number(cadastroRelacionado?.total_atendimentos || 0),
            cliente.totalGasto
          ),
        }
      })
      .sort((a, b) => {
        if (a.proximaVisita && !b.proximaVisita) return -1
        if (!a.proximaVisita && b.proximaVisita) return 1
        if (a.totalGasto !== b.totalGasto) return b.totalGasto - a.totalGasto
        return (b.ultimaVisita || '').localeCompare(a.ultimaVisita || '')
      })
  }, [agendamentos, clientesCadastrados, hoje, servicoPrecoPorNome])

  const clientesRecorrentes = useMemo(
    () => clientesResumo.filter((cliente) => cliente.perfil !== 'novo').length,
    [clientesResumo]
  )

  const clientesVip = useMemo(
    () => clientesResumo.filter((cliente) => cliente.perfil === 'vip').length,
    [clientesResumo]
  )

  const clientesSemRetorno = useMemo(
    () => clientesResumo.filter((cliente) => !cliente.proximaVisita && cliente.ultimaVisita && cliente.ultimaVisita <= limiteInatividade).length,
    [clientesResumo, limiteInatividade]
  )
  const loginRedirectHref = '/login?redirect=%2Fbarbearia'
  const cadastroRedirectHref = '/cadastro?redirect=%2Fbarbearia&tipo=barbeiro'

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      return
    }

    if (user?.tipo === 'cliente') {
      window.location.href = '/perfil'
      return
    }

    const carregarDashboard = async () => {
      const primeiraCarga = !dashboardCarregadoRef.current

      try {
        if (primeiraCarga) {
          setLoading(true)
        }
        setErro('')

        const respostaBarbearias = await ApiService.listMyBarbearias()
        const listaBarbearias = Array.isArray(respostaBarbearias?.barbearias) ? respostaBarbearias.barbearias : []

        const barbeariaDoUsuario = listaBarbearias.find((item: any) => String(item?.usuario_id) === String(user?.id)) || null
        const checkoutContext = obterContextoCheckoutAssinatura()
        setBarbearia(barbeariaDoUsuario)
        setCheckoutSuccessPendente(checkoutContext.checkoutSuccess)

        if (!barbeariaDoUsuario) {
          setCheckoutSuccessPendente(false)
          setSubscriptionResumo({ status: 'inactive', plan_key: 'free' })
          setAgendamentos([])
          setServicos([])
          setClientesCadastrados([])
          setMovimentacoesEstoque([])
          agendamentosConhecidosRef.current = new Set()
          monitoramentoAgendaInicializadoRef.current = false
          return
        }

        try {
          const barbeariaId = String(barbeariaDoUsuario.id)
          let resumoAssinatura = await carregarResumoAssinaturaAtual({
            userId: user?.id,
            barbeariaId,
            forceStripeSync: checkoutContext.checkoutSuccess,
            checkoutSessionId: checkoutContext.checkoutSessionId,
          })

          if (checkoutContext.checkoutSuccess) {
            let tentativa = 0

            while (
              tentativa < ASSINATURA_CHECKOUT_SYNC_MAX_RETRIES &&
              !STATUS_ASSINATURA_LIBERADA.includes(String(resumoAssinatura?.status || '').trim())
            ) {
              tentativa += 1
              await aguardar(ASSINATURA_CHECKOUT_SYNC_DELAY_MS)
              resumoAssinatura = await carregarResumoAssinaturaAtual({
                userId: user?.id,
                barbeariaId,
                forceStripeSync: true,
                checkoutSessionId: checkoutContext.checkoutSessionId,
              })
            }

            if (!STATUS_ASSINATURA_LIBERADA.includes(String(resumoAssinatura?.status || '').trim())) {
              setErro('Recebemos o retorno do checkout, mas a assinatura ainda está sendo confirmada. Atualize novamente em alguns instantes.')
            }
          }

          setSubscriptionResumo(resumoAssinatura)
        } catch {
          setSubscriptionResumo({ status: 'inactive', plan_key: 'free' })
        }

        let deduplicados: Agendamento[] = []
        let agendamentosCarregadosComSucesso = false
        try {
          const respostaAgendamentos = await ApiService.listAgendamentos({ barbearia_id: String(barbeariaDoUsuario.id) })
          const listaRemota = Array.isArray(respostaAgendamentos?.agendamentos) ? respostaAgendamentos.agendamentos : []
          deduplicados = normalizarAgendamentosApi(listaRemota)
          agendamentosCarregadosComSucesso = true
        } catch {
          deduplicados = []
        }

        setAgendamentos(deduplicados)
        if (agendamentosCarregadosComSucesso) {
          sincronizarMonitoramentoAgendamentos(deduplicados, barbeariaDoUsuario)
        }

        try {
          const respostaServicos = await ApiService.listServicos(barbeariaDoUsuario.id, { includeInactive: true })
          const listaServicos = Array.isArray(respostaServicos?.servicos) ? respostaServicos.servicos : []

          setServicos(
            listaServicos.map((servico: any) => ({
              id: servico.id,
              nome: servico.nome,
              descricao: servico.descricao || '',
              imagem: servico.imagem_url || null,
              preco: Number(servico.preco || 0),
              duracao: Number(servico.duracao_minutos || 0),
              ativo: servico.ativo !== false,
              pausado_por_assinatura: servico.pausado_por_assinatura === true,
              ativo_antes_pausa_assinatura: servico.ativo_antes_pausa_assinatura,
            }))
          )
        } catch {
          setServicos([])
        }

        try {
          const respostaClientes = await ApiService.listClientes(barbeariaDoUsuario.id)
          const listaClientes = Array.isArray(respostaClientes?.clientes) ? respostaClientes.clientes : []

          setClientesCadastrados(
            listaClientes.map((cliente: any) => ({
              id: String(cliente.id || ''),
              nome: String(cliente.nome || 'Cliente'),
              email: String(cliente.email || ''),
              telefone: String(cliente.telefone || ''),
              total_atendimentos: Number(cliente.total_atendimentos || 0),
              ultimo_atendimento: normalizarDataISO(cliente.ultimo_atendimento),
            }))
          )
        } catch {
          setClientesCadastrados([])
        }

        try {
          const respostaMovimentacoes = await ApiService.listEstoqueMovimentacoes(String(barbeariaDoUsuario.id), { limit: 1000 })
          const listaMovimentacoes = Array.isArray(respostaMovimentacoes?.movimentacoes) ? respostaMovimentacoes.movimentacoes : []
          setMovimentacoesEstoque(listaMovimentacoes.map(normalizarMovimentacaoEstoque))
        } catch {
          setMovimentacoesEstoque([])
        }
      } catch {
        setErro('Não foi possível carregar os dados da sua barbearia agora.')
      } finally {
        dashboardCarregadoRef.current = true
        setLoading(false)
      }
    }

    carregarDashboard()
  }, [authLoading, isAuthenticated, user?.tipo, user?.id])

  useEffect(() => {
    if (!agendaRefreshKey) return
    if (authLoading || !isAuthenticated || user?.tipo === 'cliente') return
    const barbeariaAtual = barbearia
    if (!barbeariaAtual?.id || agendaRefreshInFlightRef.current) return

    let ativo = true
    agendaRefreshInFlightRef.current = true

    const carregarAgendaLeve = async () => {
      try {
        const respostaAgendamentos = await ApiService.listAgendamentos({ barbearia_id: String(barbeariaAtual.id) })
        if (!ativo) return

        const listaRemota = Array.isArray(respostaAgendamentos?.agendamentos) ? respostaAgendamentos.agendamentos : []
        const deduplicados = normalizarAgendamentosApi(listaRemota)
        setAgendamentos(deduplicados)
        sincronizarMonitoramentoAgendamentos(deduplicados, barbeariaAtual)
      } catch {
        // Mantem a agenda atual quando um refresh silencioso falha.
      } finally {
        agendaRefreshInFlightRef.current = false
      }
    }

    carregarAgendaLeve()

    return () => {
      ativo = false
    }
  }, [agendaRefreshKey, authLoading, isAuthenticated, user?.tipo, barbearia?.id])

  useEffect(() => {
    if (authLoading || !isAuthenticated || user?.tipo === 'cliente') return

    const intervalo = window.setInterval(() => {
      setAgendaRefreshKey((prev) => prev + 1)
    }, AGENDA_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalo)
    }
  }, [authLoading, isAuthenticated, user?.tipo])

  useEffect(() => {
    const refreshAgenda = () => setAgendaRefreshKey((prev) => prev + 1)
    window.addEventListener('focus', refreshAgenda)

    return () => {
      window.removeEventListener('focus', refreshAgenda)
    }
  }, [])

  useEffect(() => {
    const barbeariaId = String(barbearia?.id || '')
    if (!barbeariaId) return

    const carregarEquipe = async () => {
      try {
        const resposta = await ApiService.getBarbeariaDetalhes(barbeariaId)
        const equipe = Array.isArray(resposta?.detalhes?.profissionais)
          ? resposta.detalhes.profissionais
          : []

        setBarbeiros(normalizarEquipeBarbearia(equipe))
      } catch {
        setBarbeiros([])
      }
    }

    carregarEquipe()
  }, [barbearia?.id])

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const getStatusColor = (status: StatusAgenda) => {
    switch (status) {
      case 'confirmado':
        return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
      case 'pendente':
        return 'border border-yellow-500/30 bg-yellow-500/15 text-yellow-200'
      case 'cancelado':
        return 'border border-red-500/30 bg-red-500/15 text-red-200'
      case 'em_atendimento':
        return 'border border-sky-500/30 bg-sky-500/15 text-sky-200'
      case 'concluido':
        return 'border border-zinc-700 bg-zinc-800 text-zinc-200'
      case 'faltou':
        return 'border border-orange-500/30 bg-orange-500/15 text-orange-200'
      default:
        return 'border border-zinc-700 bg-zinc-800 text-zinc-200'
    }
  }

  const getStatusIcon = (status: StatusAgenda) => {
    switch (status) {
      case 'confirmado': return <CheckCircle className="w-4 h-4" />
      case 'pendente': return <Clock className="w-4 h-4" />
      case 'cancelado': return <XCircle className="w-4 h-4" />
      case 'em_atendimento': return <Play className="w-4 h-4" />
      case 'concluido': return <CheckCircle className="w-4 h-4" />
      case 'faltou': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getPerfilCliente = (perfil: ClienteResumo['perfil']) => {
    switch (perfil) {
      case 'vip':
        return { label: 'VIP', className: 'border border-amber-500/30 bg-amber-500/10 text-amber-200' }
      case 'recorrente':
        return { label: 'Recorrente', className: 'border border-sky-500/30 bg-sky-500/10 text-sky-200' }
      default:
        return { label: 'Novo', className: 'border border-zinc-700 bg-zinc-800 text-zinc-300' }
    }
  }

  const atualizarStatusAgendamento = async (agenda: Agendamento, status: StatusAgenda, mensagemErro: string) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    try {
      setFeedback('')
      const idStr = String(agenda.id)

      if (idStr.startsWith('ag-')) {
        setAgendamentos((prev) => prev.map((item) => (
          item.id === agenda.id ? { ...item, status } : item
        )))
      } else {
        await ApiService.updateAgendamento(agenda.id, {
          status,
          data: agenda.data,
          hora: agenda.hora,
        })
        setAgendamentos((prev) => prev.map((item) => (
          item.id === agenda.id ? { ...item, status } : item
        )))
      }

      setErro('')
    } catch {
      setErro(mensagemErro)
    }
  }

  const abrirConclusaoAgendamento = async (agenda: Agendamento) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    const idStr = String(agenda.id)
    if (idStr.startsWith('ag-')) {
      setFeedback('')
      setErro('Este agendamento ainda não foi sincronizado. Atualize a agenda antes de concluir e solicitar a avaliação.')
      return
    }

    try {
      setFeedback('')

      const resposta = await ApiService.updateAgendamento(agenda.id, {
        status: 'concluido',
        data: agenda.data,
        hora: agenda.hora,
      })

      setAgendamentos((prev) => prev.map((item) => (
        item.id === agenda.id
          ? { ...item, status: 'concluido' }
          : item
      )))

      if (resposta?.reviewRequest?.sent) {
        setErro('')
        setFeedback('Atendimento concluído. Pedido de avaliação enviado no WhatsApp do cliente.')
        return
      }

      if (resposta?.reviewRequest?.attempted || resposta?.reviewRequest?.reason) {
        setFeedback('')
        setErro(resposta?.reviewRequest?.error || 'Atendimento concluído, mas não foi possível solicitar a avaliação no WhatsApp do cliente.')
        return
      }

      setErro('')
      setFeedback('Atendimento concluído.')
    } catch {
      setErro('Não foi possível concluir o atendimento.')
      setFeedback('')
    }
  }

  const abrirWhatsAppCliente = (telefone: string, mensagem: string) => {
    const link = criarLinkWhatsApp(telefone, mensagem)
    if (link === '#') return
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const abrirWhatsAppBarbearia = (mensagem: string) => {
    const telefone = String(barbearia?.whatsapp_link || barbearia?.telefone || '')
    const link = criarLinkWhatsApp(telefone, mensagem)
    if (link === '#') return
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const obterContatoCliente = (agenda: Agendamento) => {
    const porId = agenda.cliente_id ? contatosClientesPorId.get(String(agenda.cliente_id)) : undefined
    if (porId) return porId
    const porNome = contatosClientesPorNome.get(normalizarTexto(agenda.cliente_nome))
    if (porNome) return porNome
    if (!agenda.cliente_telefone) return undefined

    return {
      id: String(agenda.cliente_id || `wa-${agenda.cliente_telefone}`),
      nome: agenda.cliente_nome,
      email: '',
      telefone: agenda.cliente_telefone,
      total_atendimentos: 0,
      ultimo_atendimento: agenda.data,
    }
  }

  const handleCancelarAgendamento = async (agenda: Agendamento) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

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
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    setRemarcarAgendamento(agenda)
    setRemarcarData(agenda.data)
    setRemarcarHora(agenda.hora)
  }

  const handleRemarcarAgendamento = async () => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    if (!remarcarAgendamento || !remarcarData || !remarcarHora) return

    setRemarcarLoading(true)
    try {
      const idStr = String(remarcarAgendamento.id)
      const statusRemarcado: StatusAgenda = remarcarAgendamento.status === 'faltou'
        ? 'pendente'
        : remarcarAgendamento.status

      if (idStr.startsWith('ag-')) {
        setAgendamentos((prev) =>
          prev.map((item) =>
            item.id === remarcarAgendamento.id
              ? { ...item, data: remarcarData, hora: remarcarHora, status: statusRemarcado }
              : item
          )
        )
      } else {
        await ApiService.updateAgendamento(remarcarAgendamento.id, {
          status: statusRemarcado,
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
    if (!recursosPremiumLiberados) {
      avisarBloqueioPremium('Adicionar novos serviços')
      return
    }

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

    const modelo = SERVICE_BY_TYPE[novoServico.tipo]
    const nome = String(novoServico.nome || '').trim() || modelo.nome

    try {
      const resposta = await ApiService.createServico(barbearia.id, {
        nome,
        descricao: `Serviço ${nome}`,
        imagem_url: getServiceImageValueForSave(novoServico.tipo),
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
            descricao: criado.descricao || `Serviço ${nome}`,
            imagem: criado.imagem_url || getServiceImageValueForSave(novoServico.tipo),
            preco: Number(criado.preco || preco),
            duracao: Number(criado.duracao_minutos || duracao),
            ativo: criado.ativo !== false,
          },
        ])
      }

      setNovoServico({ tipo: 'cabelo', nome: SERVICE_BY_TYPE.cabelo.nome, preco: '', duracao: '40' })
      setMostrarNovoServico(false)
      setErro('')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível criar o serviço.')
    }
  }

  const iniciarEdicaoServico = (servico: Servico) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    setMostrarNovoServico(false)
    setServicoEmEdicaoId(servico.id)
    setEdicaoServico({
      tipo: inferServiceType(servico.nome, servico.imagem),
      nome: servico.nome,
      preco: String(servico.preco || ''),
      duracao: servico.duracao ? String(servico.duracao) : '40',
    })
    setErro('')
  }

  const cancelarEdicaoServico = () => {
    setServicoEmEdicaoId(null)
    setEdicaoServico({ tipo: 'cabelo', nome: SERVICE_BY_TYPE.cabelo.nome, preco: '', duracao: '40' })
  }

  const salvarEdicaoServico = async (servicoAtual: Servico) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    const nome = edicaoServico.nome.trim()
    const modelo = SERVICE_BY_TYPE[edicaoServico.tipo]
    const preco = Number(String(edicaoServico.preco).replace(',', '.'))
    const duracao = Number(edicaoServico.duracao)

    if (!nome) {
      setErro('Informe o nome do serviço.')
      return
    }

    if (Number.isNaN(preco) || preco <= 0) {
      setErro('Informe um valor válido para o serviço.')
      return
    }

    if (Number.isNaN(duracao) || duracao <= 0) {
      setErro('Informe uma duração válida em minutos.')
      return
    }

    try {
      setSalvandoServico(true)
      const resposta = await ApiService.updateServico(servicoAtual.id, {
        nome,
        descricao: servicoAtual.descricao || `Serviço ${nome}`,
        imagem_url: getServiceImageValueForSave(edicaoServico.tipo),
        preco,
        duracao_minutos: duracao,
        ativo: servicoAtual.ativo !== false,
      })

      const atualizado = resposta?.servico
      setServicos((prev) =>
        prev.map((servico) =>
          servico.id === servicoAtual.id
            ? {
                ...servico,
                nome: atualizado?.nome || nome,
                descricao: atualizado?.descricao || servico.descricao || `Serviço ${nome}`,
                imagem: atualizado?.imagem_url || getServiceImageValueForSave(edicaoServico.tipo),
                preco: Number(atualizado?.preco || preco),
                duracao: Number(atualizado?.duracao_minutos || duracao),
                ativo: atualizado?.ativo !== false,
              }
            : servico
        )
      )

      cancelarEdicaoServico()
      setErro('')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível atualizar o serviço.')
    } finally {
      setSalvandoServico(false)
    }
  }

  const removerServico = async (servicoAtual: Servico) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    const confirmou = window.confirm(`Excluir o serviço "${servicoAtual.nome}"?`)
    if (!confirmou) return

    try {
      setRemovendoServicoId(servicoAtual.id)
      await ApiService.deleteServico(servicoAtual.id)
      setServicos((prev) => prev.filter((servico) => servico.id !== servicoAtual.id))
      if (servicoEmEdicaoId === servicoAtual.id) {
        cancelarEdicaoServico()
      }
      setErro('')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível excluir o serviço.')
    } finally {
      setRemovendoServicoId(null)
    }
  }

  const salvarEquipeBarbearia = async (proximaEquipe: Barbeiro[]) => {
    const barbeariaId = String(barbearia?.id || '')
    if (!barbeariaId) {
      throw new Error('Cadastre sua barbearia antes de atualizar a equipe.')
    }

    const resposta = await ApiService.updateBarbeariaDetalhes(barbeariaId, {
      profissionais: proximaEquipe,
    })

    const equipePersistida = normalizarEquipeBarbearia(resposta?.detalhes?.profissionais || proximaEquipe)
    setBarbeiros(equipePersistida)
    return equipePersistida
  }

  const adicionarBarbeiro = () => {
    if (!recursosPremiumLiberados) {
      avisarBloqueioPremium('Adicionar novos barbeiros e fotos da equipe')
      return
    }

    if (equipeAtingiuLimitePlano) {
      setErro(formatarMensagemLimiteProfissionais(subscriptionMaxProfessionals))
      setMostrarNovoBarbeiro(false)
      return
    }

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
          const respostaUpload = await ApiService.uploadImagem(fotoBarbeiroArquivo, {
            barbeariaId: barbearia?.id,
            scope: 'barbearia-premium',
          })
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

        await salvarEquipeBarbearia([...barbeiros, novo])
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

  const removerBarbeiro = async (id: string) => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    try {
      setFeedback('')
      await salvarEquipeBarbearia(barbeiros.filter((item) => item.id !== id))
      setErro('')
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível atualizar a equipe.')
    }
  }

  const abrirNovoRegistro = () => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    setMostrarNovoMenu(true)
  }

  const abrirNovoAgendamento = () => {
    setMostrarNovoMenu(false)

    setNovoAgendamento({
      cliente_email: '',
      servico_id: String(servicos[0]?.id || ''),
      barbeiro_id: String(barbeiros[0]?.id || ''),
      data: hoje,
      hora: horariosAgendamentoManual[0] || '09:00',
    })
    setMostrarNovoAgendamento(true)
  }

  const abrirNovaVenda = async () => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    if (!barbearia?.id) {
      setErro('Cadastre sua barbearia antes de registrar uma venda.')
      return
    }

    try {
      setCarregandoProdutosVenda(true)
      setErro('')
      const resposta = await ApiService.listEstoqueProdutos(String(barbearia.id))
      const lista = (Array.isArray(resposta?.produtos) ? resposta.produtos : [])
        .filter((item: ProdutoEstoque) => Number(item.estoque_atual || 0) > 0)

      if (lista.length === 0) {
        setErro('Cadastre itens no estoque com saldo disponível antes de registrar uma venda.')
        setMostrarNovoMenu(false)
        return
      }

      setProdutosEstoqueVenda(lista)
      setNovaVenda({
        produto_id: String(lista[0]?.id || ''),
        barbeiro_id: String(barbeiros[0]?.id || ''),
        quantidade: '1',
        data: hoje,
        hora: horaAtualInput(),
      })
      setMostrarNovoMenu(false)
      setMostrarNovaVenda(true)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível preparar o registro de venda.')
    } finally {
      setCarregandoProdutosVenda(false)
    }
  }

  const navegarParaAba = (tab: ActiveTab) => {
    if (!gestaoOperacionalLiberada && (tab === 'servicos' || tab === 'barbeiros')) {
      avisarModoConsulta()
      return
    }

    setActiveTab(tab)
    secaoAtivaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selecionarMesExtratoPorIndice = (indice: number) => {
    const item = extratoMensal[indice]
    if (!item) return
    setMesExtratoSelecionado(item.mes)
  }

  const atualizarDiaHoverExtrato = (clientX: number, largura: number, esquerda: number) => {
    if (!extratoPeriodoAtual || largura <= 0) return

    const proporcaoBruta = (clientX - esquerda) / largura
    const proporcao = Math.min(1, Math.max(0, proporcaoBruta))
    const indice = Math.round(proporcao * Math.max(0, extratoPeriodoAtual.dias.length - 1))
    setDiaHoverExtrato(indice)
  }

  const handleGraficoExtratoMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    atualizarDiaHoverExtrato(event.clientX, rect.width, rect.left)
  }

  const exportarExtratoPdf = async () => {
    if (!extratoPeriodoAtual || !extratoMesSelecionado) {
      setErro('Sem dados suficientes para exportar o extrato.')
      return
    }

    setExportandoExtratoPdf(true)

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])

      const autoTable = autoTableModule.default
      const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const logoLojaUrl = String(barbearia?.logo_url || '').trim()
      const logoDataUrl = logoLojaUrl ? await carregarImagemComoDataUrl(logoLojaUrl).catch(() => '') : ''
      const larguraPagina = documento.internal.pageSize.getWidth()
      const alturaPagina = documento.internal.pageSize.getHeight()
      const margem = 14
      const larguraUtil = larguraPagina - margem * 2
      const cabecalho = desenharCabecalhoPdf({
        documento,
        margem,
        larguraPagina,
        titulo: 'Extrato Financeiro',
        subtitulo: 'Relatório financeiro consolidado da operação, com comparativo entre previsão, realizado e evolução do período.',
        estabelecimentoNome: barbearia?.nome || 'O Corte Certo',
        estabelecimentoEndereco: barbearia?.endereco || '',
        logoDataUrl,
        fallbackIniciais: iniciaisNome(barbearia?.nome || 'Loja'),
        chips: [
          { label: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`, tone: 'accent' },
          { label: filtroExtrato === 'mes' ? 'Filtro: Mês' : filtroExtrato === '30d' ? 'Filtro: 30 dias' : 'Filtro: 7 dias' },
          { label: `Período: ${extratoPeriodoAtual.labelPeriodo}`, tone: 'light' },
        ],
      })

      const cardY = cabecalho.chipsBottomY + 8
      const cardGap = 4
      const cardWidth = (larguraUtil - cardGap * 3) / 4
      desenharCardResumoPdf({
        documento,
        x: margem,
        y: cardY,
        largura: cardWidth,
        titulo: 'Previsto no período',
        valor: formatarMoeda(extratoPeriodoAtual.totalPrevisto),
        subtitulo: extratoPeriodoAtual.labelPeriodo,
        tone: 'accent',
      })
      desenharCardResumoPdf({
        documento,
        x: margem + cardWidth + cardGap,
        y: cardY,
        largura: cardWidth,
        titulo: 'Realizado no período',
        valor: formatarMoeda(extratoPeriodoAtual.totalRealizado),
        subtitulo: `${extratoPeriodoAtual.totalAtendimentos} registro(s)`,
        tone: 'dark',
      })
      desenharCardResumoPdf({
        documento,
        x: margem + (cardWidth + cardGap) * 2,
        y: cardY,
        largura: cardWidth,
        titulo: 'Ticket médio',
        valor: formatarMoeda(extratoPeriodoAtual.ticketMedio),
        subtitulo: 'Base no realizado',
        tone: 'light',
      })
      desenharCardResumoPdf({
        documento,
        x: margem + (cardWidth + cardGap) * 3,
        y: cardY,
        largura: cardWidth,
        titulo: 'Comparação mensal',
        valor: comparacaoMesAnterior ? formatarVariacaoPercentual(comparacaoMesAnterior.variacaoRealizado) : '0%',
        subtitulo: comparacaoMesAnterior ? `vs ${comparacaoMesAnterior.labelMesAnterior}` : 'Sem base anterior',
        tone: 'accent',
      })

      const linhasComparacao = comparacaoMesAnterior
        ? [
            ['Previsto atual', formatarMoeda(extratoMesSelecionado.totalPrevisto), 'Previsto mês anterior', formatarMoeda(comparacaoMesAnterior.totalPrevistoAnterior)],
            ['Realizado atual', formatarMoeda(extratoMesSelecionado.totalRealizado), 'Realizado mês anterior', formatarMoeda(comparacaoMesAnterior.totalRealizadoAnterior)],
            ['Variação realizado', formatarVariacaoPercentual(comparacaoMesAnterior.variacaoRealizado), 'Variação registros', formatarVariacaoPercentual(comparacaoMesAnterior.variacaoQuantidade)],
          ]
        : []

      autoTable(documento, {
        startY: cardY + 30,
        head: [['Comparativo', 'Atual', 'Base anterior', 'Valor']],
        body: linhasComparacao,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3.5,
          textColor: [24, 24, 27],
          lineColor: [228, 228, 231],
        },
        headStyles: {
          fillColor: [24, 24, 27],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: margem, right: margem },
      })

      const tabelaDias = extratoPeriodoAtual.dias.map((item) => ([
        formatarDataCompleta(item.dataISO),
        formatarMoeda(item.previsto),
        formatarMoeda(item.realizado),
        String(item.atendimentos),
      ]))

      autoTable(documento, {
        startY: (documento as any).lastAutoTable?.finalY ? (documento as any).lastAutoTable.finalY + 10 : cardY + 70,
        head: [['Data', 'Previsto', 'Realizado', 'Registros']],
        body: tabelaDias,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3.5,
          textColor: [24, 24, 27],
          lineColor: [228, 228, 231],
        },
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [244, 244, 245],
        },
        margin: { left: margem, right: margem },
      })

      const totalPaginas = documento.getNumberOfPages()
      for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
        documento.setPage(pagina)
        desenharRodapePdf({
          documento,
          pagina,
          totalPaginas,
          margem,
          larguraPagina,
          alturaPagina,
          rodapeEsquerda: barbearia?.nome || 'O Corte Certo',
          rodapeCentro: 'Relatório financeiro • ocortecerto.com',
        })
      }

      documento.save(
        `${normalizarNomeArquivo(barbearia?.nome || 'soubarbeiro')}-extrato-${extratoMesSelecionado.mes}-${filtroExtrato}.pdf`
      )
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível exportar o PDF do extrato.')
    } finally {
      setExportandoExtratoPdf(false)
    }
  }

  const salvarNovoAgendamento = async () => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

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
      const servicoSelecionado = servicos.find((item) => String(item.id) === String(novoAgendamento.servico_id)) || null

      await ApiService.createAgendamentoByEmail({
        barbearia_id: barbearia.id,
        cliente_email: novoAgendamento.cliente_email,
        servico_id: novoAgendamento.servico_id,
        servico_nome: servicoSelecionado?.nome || '',
        servico_preco: servicoSelecionado?.preco || 0,
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

  const salvarNovaVenda = async () => {
    if (!gestaoOperacionalLiberada) {
      avisarModoConsulta()
      return
    }

    if (!barbearia?.id) {
      setErro('Cadastre sua barbearia antes de registrar uma venda.')
      return
    }

    const quantidade = Number(novaVenda.quantidade || 0)
    if (!novaVenda.produto_id || !novaVenda.data || !novaVenda.hora || quantidade <= 0) {
      setErro('Preencha item, quantidade, data e horário para registrar a venda.')
      return
    }

    const produto = produtosEstoqueVenda.find((item) => String(item.id) === String(novaVenda.produto_id)) || null
    if (!produto) {
      setErro('Selecione um item válido do estoque.')
      return
    }

    if (quantidade > Number(produto.estoque_atual || 0)) {
      setErro('A quantidade informada é maior do que a quantidade em estoque.')
      return
    }

    const barbeiro = barbeiros.find((item) => String(item.id) === String(novaVenda.barbeiro_id)) || null

    setNovaVendaLoading(true)
    try {
      const resposta = await ApiService.createEstoqueMovimentacao(String(produto.id), {
        tipo: 'venda',
        quantidade,
        custo_unitario: Number(produto.custo_unitario || 0),
        preco_unitario: Number(produto.preco_venda || 0),
        motivo: 'Venda registrada no painel',
        referencia_tipo: 'dashboard_sale',
        profissional_id: novaVenda.barbeiro_id || null,
        profissional_nome: barbeiro?.nome || null,
        movimentado_em: construirDataHoraLocalIso(novaVenda.data, novaVenda.hora),
        observacoes: barbeiro?.nome
          ? `Venda registrada por ${barbeiro.nome} no painel.`
          : 'Venda registrada no painel.',
      })

      if (resposta?.movimentacao) {
        const movimentacaoNormalizada = normalizarMovimentacaoEstoque(resposta.movimentacao)
        setMovimentacoesEstoque((prev) => [movimentacaoNormalizada, ...prev])
      }

      if (resposta?.produto) {
        const produtoAtualizado = resposta.produto as ProdutoEstoque
        setProdutosEstoqueVenda((prev) => prev.map((item) => (
          String(item.id) === String(produtoAtualizado.id)
            ? {
                ...item,
                estoque_atual: Number(produtoAtualizado.estoque_atual || 0),
                sem_estoque: produtoAtualizado.sem_estoque,
                estoque_baixo: produtoAtualizado.estoque_baixo,
              }
            : item
        )))
      }

      setMostrarNovaVenda(false)
      setErro('')
      setFeedback(`Venda registrada para ${produto.nome} e estoque atualizado.`)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível registrar a venda.')
    } finally {
      setNovaVendaLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-black text-white">
        <header className="fixed top-0 w-full border-b border-white/10 bg-black/95 backdrop-blur-md z-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="O Corte Certo" className="h-10 w-10 rounded-full border border-white/20 object-cover" />
              <div>
                <p className="text-sm font-semibold">O Corte Certo</p>
                <p className="text-xs text-zinc-500">Área da barbearia</p>
              </div>
            </Link>

            <Link href="/buscar" className="text-sm text-zinc-400 hover:text-white transition">
              Buscar
            </Link>
          </div>
        </header>

        <section className="flex min-h-screen items-center px-4 pb-8 pt-24 sm:px-6">
          <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="order-2 rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_36%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))] p-5 sm:p-7 lg:order-1 lg:p-10">
              <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Painel profissional</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                Sua agenda, clientes e caixa em um só lugar
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-base">
                Acesse o painel da sua barbearia para organizar horários, acompanhar clientes e visualizar o desempenho do dia.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Agenda</p>
                  <p className="mt-2 text-sm text-white">Visualize horários, pendências e próximos atendimentos.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Clientes</p>
                  <p className="mt-2 text-sm text-white">Acompanhe recorrência, contatos e histórico.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Extrato</p>
                  <p className="mt-2 text-sm text-white">Consulte faturamento, ticket médio e previsões.</p>
                </div>
              </div>
            </div>

            <div className="order-1 rounded-3xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl shadow-black/30 sm:p-7 lg:order-2">
              <p className="text-sm font-medium text-zinc-400">Entrar como barbeiro</p>
              <h2 className="mt-2 text-2xl font-semibold">Escolha como você quer continuar</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Se você já tem acesso, entre agora. Se ainda não começou, crie sua conta profissional e volte para o painel.
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href={loginRedirectHref}
                  className="inline-flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-left text-black transition hover:bg-zinc-200 active:scale-[0.98]"
                >
                  <div>
                    <p className="text-base font-semibold">Já possuo conta</p>
                    <p className="mt-1 text-sm text-zinc-600">Entrar e abrir meu painel da barbearia.</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0" />
                </Link>

                <Link
                  href={cadastroRedirectHref}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-white/15 bg-zinc-950 px-4 py-4 text-left text-white transition hover:bg-zinc-900 active:scale-[0.98]"
                >
                  <div>
                    <p className="text-base font-semibold">Criar uma conta</p>
                    <p className="mt-1 text-sm text-zinc-400">Começar meu acesso profissional como barbeiro.</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-emerald-300" />
                </Link>
              </div>

              <p className="mt-5 text-xs leading-5 text-zinc-500">
                Se você quer marcar um horário como cliente, o caminho ideal continua sendo pelo perfil do cliente.
              </p>

              <Link href="/perfil" className="mt-4 inline-flex text-sm text-zinc-300 hover:text-white transition">
                Ir para o perfil do cliente
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }



  return (
    <main className="min-h-screen bg-black text-white">
      {mostrarBoasVindasAssinatura && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-500/30 bg-zinc-950 p-5 shadow-2xl shadow-black/40 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">
                  Assinatura confirmada
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-white">
                  Boas-vindas ao plano premium da sua barbearia
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {subscriptionStatus === 'trialing'
                    ? `Seu teste grátis já está ativo${subscriptionTrialEndLabel ? ` até ${subscriptionTrialEndLabel}` : ''}. Agora você pode liberar equipe, serviços, fotos e demais recursos premium.`
                    : 'Seu pagamento foi confirmado e os recursos premium já estão liberados para a sua operação.'}
                </p>
              </div>

              <button
                onClick={() => setMostrarBoasVindasAssinatura(false)}
                className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                aria-label="Fechar boas-vindas da assinatura"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Plano liberado</p>
              <p className="mt-2 text-lg font-semibold text-white">{subscriptionPlanLabel}</p>
              <p className="mt-2 text-sm text-zinc-300">
                {subscriptionStatus === 'trialing' && subscriptionTrialEndLabel
                  ? `Período grátis ativo até ${subscriptionTrialEndLabel}.`
                  : subscriptionPeriodEndLabel
                    ? `Próximo ciclo em ${subscriptionPeriodEndLabel}.`
                    : 'Sua assinatura já está pronta para uso no painel.'}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-medium text-white">Equipe e catálogo liberados</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Agora você pode adicionar novos barbeiros, montar serviços e publicar fotos da barbearia.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-medium text-white">Painel pronto para crescer</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Agenda, extrato, clientes e configurações seguem centralizados para você operar sem bloqueios.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => setMostrarBoasVindasAssinatura(false)}
                className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 active:scale-[0.98]"
              >
                Começar agora
              </button>
              <button
                onClick={() => {
                  setMostrarBoasVindasAssinatura(false)
                  window.location.href = '/barbearia/planos'
                }}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900 active:scale-[0.98]"
              >
                Ver detalhes da assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNovoAgendamento && (
        <div className="fixed right-3 top-20 z-[70] w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border border-emerald-500/30 bg-zinc-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{toastNovoAgendamento.titulo}</p>
              <p className="mt-1 text-sm leading-5 text-zinc-300">{toastNovoAgendamento.descricao}</p>
            </div>
            <button
              onClick={() => setToastNovoAgendamento(null)}
              className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
              aria-label="Fechar aviso de novo agendamento"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link href="/" className="flex-shrink-0">
                <img src="/logo.png" alt="O Corte Certo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-semibold truncate">{barbearia?.nome || 'Minha Barbearia'}</h1>
                <p className="text-[10px] sm:text-xs text-zinc-400 truncate">Olá, {user?.nome?.split(' ')[0] || 'Barbeiro'}</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-5 text-sm">
              <Link href="/" className="text-zinc-300 hover:text-white transition">Início</Link>
              <Link href="/buscar" className="text-zinc-300 hover:text-white transition">Buscar</Link>
              <Link href="/barbearia" className="text-white font-medium">Barbearia</Link>
              <Link href="/barbearia/planos" className="text-zinc-300 hover:text-white transition">Planos</Link>
              <Link href="/barbearia/estoque" className="text-zinc-300 hover:text-white transition">Estoque</Link>
              <Link href="/chatbot" className="text-zinc-300 hover:text-white transition">Chatbot</Link>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={abrirCentralAssinatura}
                disabled={assinaturaActionLoading}
                className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg border border-zinc-700 text-xs sm:text-sm hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
                title={assinaturaPodeGerenciar ? 'Gerenciar assinatura' : 'Ver planos'}
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">
                  {assinaturaActionLoading ? 'Abrindo...' : assinaturaPodeGerenciar ? 'Assinatura' : 'Planos'}
                </span>
              </button>
              <Link href="/barberia/configurar" className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-lg border border-zinc-700 text-xs sm:text-sm hover:bg-zinc-800 active:scale-[0.98]">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">Configurar</span>
              </Link>
              <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-white px-2 py-2 hidden sm:block">
                Sair
              </button>
            </div>
          </div>

          <div className="mt-2 hidden md:flex items-center gap-2 pl-[52px]">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${assinaturaChipClassName}`}>
              {subscriptionStatusLabel}
            </span>
            <span className="text-[11px] text-zinc-500">
              {subscriptionPlanLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-zinc-900/60 border-b border-zinc-800 pt-[60px] sm:pt-20 md:pt-28">
        <div className="max-w-6xl mx-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-w-max">
            <button
              onClick={() => navegarParaAba('agenda')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'agenda' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Agenda
            </button>
            <button
              disabled={!gestaoOperacionalLiberada}
              onClick={() => navegarParaAba('servicos')}
              title={!gestaoOperacionalLiberada ? 'Regularize a assinatura para gerenciar serviços.' : undefined}
              aria-disabled={!gestaoOperacionalLiberada}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] ${
                !gestaoOperacionalLiberada
                  ? 'cursor-not-allowed border-zinc-800 text-zinc-600'
                  : activeTab === 'servicos'
                    ? 'border-white text-white bg-zinc-800'
                    : 'border-zinc-700 text-zinc-400'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Serviços
            </button>
            <button
              onClick={() => navegarParaAba('historico')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'historico' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Histórico
            </button>
            <button
              onClick={() => navegarParaAba('extrato')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'extrato' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Extrato
            </button>
            <button
              disabled={!gestaoOperacionalLiberada}
              onClick={() => navegarParaAba('barbeiros')}
              title={!gestaoOperacionalLiberada ? 'Regularize a assinatura para gerenciar a equipe.' : undefined}
              aria-disabled={!gestaoOperacionalLiberada}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] ${
                !gestaoOperacionalLiberada
                  ? 'cursor-not-allowed border-zinc-800 text-zinc-600'
                  : activeTab === 'barbeiros'
                    ? 'border-white text-white bg-zinc-800'
                    : 'border-zinc-700 text-zinc-400'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Barbeiros
            </button>
            <button
              onClick={() => navegarParaAba('clientes')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap active:scale-[0.98] ${
                activeTab === 'clientes' ? 'border-white text-white bg-zinc-800' : 'border-zinc-700 text-zinc-400'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Clientes
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {erro && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {erro}
          </div>
        )}

        {feedback && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {feedback}
          </div>
        )}

        {!barbearia && !erro && (
          <div className="mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 sm:p-5 flex items-start gap-3">
            <Store className="w-5 h-5 mt-0.5 text-yellow-300 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-100 text-sm sm:text-base">Você ainda não tem uma barbearia cadastrada.</p>
              <p className="text-xs sm:text-sm text-yellow-200/80 mt-1">Acesse Configurar para criar sua barbearia e cadastrar seus serviços.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-400">
            Carregando dados da barbearia...
          </div>
        )}

        {painelModoConsulta && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Assinatura inativa. O painel está em modo consulta: agenda, clientes, extrato e histórico continuam visíveis, mas novas alterações ficam bloqueadas até a regularização do pagamento. Os serviços da barbearia ficam pausados e voltam automaticamente quando a assinatura for reativada.
          </div>
        )}

        <div className="mb-4 sm:mb-6 rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))] p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Resumo do dia</p>
              <h2 className="mt-2 text-xl sm:text-2xl font-semibold">Operação da barbearia em um só lugar</h2>
              <p className="mt-2 text-sm text-zinc-300">
                {proximoAtendimento
                  ? `Próximo atendimento: ${proximoAtendimento.cliente_nome} às ${formatarHoraCurta(proximoAtendimento.hora)} para ${proximoAtendimento.servico}.`
                  : 'Sua agenda está livre por enquanto. Aproveite para abrir horários e reativar clientes.'}
              </p>
            </div>

              <div className="flex max-w-xl flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={painelModoConsulta ? abrirPlanosAssinatura : abrirNovoRegistro}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium active:scale-[0.98] ${
                      painelModoConsulta
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-100'
                        : 'bg-white text-black'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    {painelModoConsulta ? 'Regularizar plano' : 'Novo'}
                  </button>
                  <button
                    onClick={alternarAlertasAgendamento}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                      alertasAtivos
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {alertasAtivos ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    {alertasAtivos ? 'Alertas ativos' : 'Ativar alertas'}
                  </button>
                </div>

                <p className="text-xs text-zinc-500">
                  O painel agora atualiza a agenda automaticamente. Avisos visuais aparecem aqui na tela e, com alertas ativos, tocamos som e tentamos usar o navegador.
                  {' '}
                  <span className="text-zinc-400">{resumoPermissaoNotificacao}.</span>
                </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Próximo cliente</p>
              <p className="mt-2 text-lg font-semibold text-white">{proximoAtendimento?.cliente_nome || 'Sem fila agora'}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {proximoAtendimento
                  ? `${formatarDataCurta(proximoAtendimento.data)} • ${formatarHoraCurta(proximoAtendimento.hora)}`
                  : 'Nenhum horário reservado'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Pendências</p>
              <p className="mt-2 text-lg font-semibold text-white">{confirmacoesPendentes} aguardando confirmação</p>
              <p className="mt-1 text-sm text-zinc-400">{atrasadosHoje} horário(s) já passaram do ponto hoje</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Ocupação do dia</p>
              <p className="mt-2 text-lg font-semibold text-white">{ocupacaoHoje}% dos horários tomados</p>
              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${ocupacaoHoje}%` }} />
              </div>
              <p className="mt-2 text-sm text-zinc-400">{agendamentosHoje.length} de {horariosAgendamentoManual.length} slots usados</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Ritmo atual</p>
              <p className="mt-2 text-lg font-semibold text-white">{atendimentosEmAndamento} em atendimento</p>
              <p className="mt-1 text-sm text-zinc-400">{proximosAgendamentos.length} reservas nos próximos dias</p>
            </div>
          </div>
        </div>

        {activeTab !== 'extrato' && (
          <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Previsto hoje</p>
              <p className="mt-2 text-xl font-semibold text-emerald-400">{formatarMoeda(saldoDia)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Realizado mês</p>
              <p className="mt-2 text-xl font-semibold text-emerald-400">{formatarMoeda(faturamentoRealizadoMes)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ticket médio</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatarMoeda(ticketMedioMes)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Clientes ativos</p>
              <p className="mt-2 text-xl font-semibold text-white">{clientesAtivosMes}</p>
            </div>
          </div>
        )}

        <div ref={secaoAtivaRef} className="scroll-mt-24">
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">Agenda de hoje - {formatarDataCurta(hoje)}</h2>
                <p className="mt-1 text-sm text-zinc-400">Filtre rapidamente por status, cliente, serviço ou barbeiro.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {([
                  ['todos', 'Todos'],
                  ['pendente', 'Pendentes'],
                  ['confirmado', 'Confirmados'],
                  ['em_atendimento', 'Em atendimento'],
                  ['concluido', 'Concluídos'],
                ] as Array<[FiltroAgenda, string]>).map(([valor, label]) => (
                  <button
                    key={valor}
                    onClick={() => setFiltroAgenda(valor)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${filtroAgenda === valor ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 sm:p-4">
              <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/30 px-3 py-2.5">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  value={buscaAgenda}
                  onChange={(e) => setBuscaAgenda(e.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                  placeholder="Buscar por cliente, serviço ou barbeiro"
                />
              </label>
            </div>

            {agendamentosHoje.length === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                <p className="text-base font-medium text-white">Nenhum agendamento para hoje.</p>
                <p className="mt-2 text-sm text-zinc-400">Use o botão de novo agendamento ou foque em reativar clientes sem retorno.</p>
              </div>
            )}

            {agendamentosHoje.length > 0 && agendamentosHojeFiltrados.length === 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
                <p className="text-base font-medium text-white">Nenhum resultado para o filtro atual.</p>
                <p className="mt-2 text-sm text-zinc-400">Limpe a busca ou troque o status para ver mais horários.</p>
              </div>
            )}

            {agendamentosHojeFiltrados.map((agenda) => {
              const contatoCliente = obterContatoCliente(agenda)
              const telefoneBarbearia = String(barbearia?.whatsapp_link || barbearia?.telefone || '')

              return (
                <div key={agenda.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex-shrink-0 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Horário</p>
                      <p className="mt-1 text-xl font-semibold text-white">{formatarHoraCurta(agenda.hora)}</p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-white truncate">{agenda.cliente_nome}</p>
                          <p className="mt-1 text-sm text-zinc-400">{agenda.servico}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            {agenda.barbeiro_nome && <span>c/ {agenda.barbeiro_nome}</span>}
                            {contatoCliente?.telefone && <span>{formatarTelefone(contatoCliente.telefone)}</span>}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusColor(agenda.status)}`}>
                            {getStatusIcon(agenda.status)}
                            {statusLabel(agenda.status)}
                          </span>
                          <p className="text-sm font-semibold text-emerald-400">{formatarMoeda(obterValorAgendamento(agenda))}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                        {gestaoOperacionalLiberada ? (
                          <>
                            {agenda.status === 'pendente' && (
                              <button
                                onClick={() => atualizarStatusAgendamento(agenda, 'confirmado', 'Não foi possível confirmar o agendamento.')}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Confirmar
                              </button>
                            )}

                            {agenda.status === 'confirmado' && (
                              <button
                                onClick={() => atualizarStatusAgendamento(agenda, 'em_atendimento', 'Não foi possível iniciar o atendimento.')}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/10"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Iniciar
                              </button>
                            )}

                            {['confirmado', 'em_atendimento'].includes(agenda.status) && (
                              <button
                                onClick={() => abrirConclusaoAgendamento(agenda)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-white hover:bg-zinc-800"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Concluir
                              </button>
                            )}

                            {['pendente', 'confirmado'].includes(agenda.status) && (
                              <button
                                onClick={() => atualizarStatusAgendamento(agenda, 'faltou', 'Não foi possível marcar este cliente como falta.')}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 px-3 py-2 text-xs text-orange-300 hover:bg-orange-500/10"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Faltou
                              </button>
                            )}

                            {podeRemarcarAgendamento(agenda) && (
                              <button
                                onClick={() => abrirRemarcar(agenda)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Remarcar
                              </button>
                            )}

                            {contatoCliente?.telefone && (
                              <button
                                onClick={() => abrirWhatsAppCliente(
                                  contatoCliente.telefone,
                                  montarMensagemClienteAgendamento(agenda, contatoCliente, barbearia)
                                )}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Cliente
                              </button>
                            )}

                            {telefoneBarbearia && (
                              <button
                                onClick={() => abrirWhatsAppBarbearia(montarMensagemBarbeariaAgendamento(agenda, contatoCliente, barbearia))}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                              >
                                <Store className="w-3.5 h-3.5" />
                                Barbearia
                              </button>
                            )}

                            {podeDesmarcarAgendamento(agenda) && (
                              <button
                                onClick={() => handleCancelarAgendamento(agenda)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Desmarcar
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-amber-200">
                            Assinatura inativa: este agendamento está disponível apenas para consulta.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">Próximos dias</h3>
              {proximosAgendamentos.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                  Sem agendamentos futuros no momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {proximosAgendamentos.slice(0, 5).map((agenda) => {
                    const contatoCliente = obterContatoCliente(agenda)
                    const telefoneBarbearia = String(barbearia?.whatsapp_link || barbearia?.telefone || '')

                    return (
                      <div key={agenda.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{agenda.cliente_nome}</p>
                            <p className="text-xs text-zinc-400">{agenda.servico}</p>
                            <p className="mt-1 text-xs text-emerald-400">{formatarMoeda(obterValorAgendamento(agenda))}</p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-sm font-semibold text-white">{formatarDataCurta(agenda.data)} {formatarHoraCurta(agenda.hora)}</p>
                            <p className="mt-1 text-xs text-zinc-500">{statusLabel(agenda.status)}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                          {gestaoOperacionalLiberada ? (
                            <>
                              {agenda.status === 'pendente' && (
                                <button
                                  onClick={() => atualizarStatusAgendamento(agenda, 'confirmado', 'Não foi possível confirmar o agendamento.')}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Confirmar
                                </button>
                              )}

                              {podeRemarcarAgendamento(agenda) && (
                                <button
                                  onClick={() => abrirRemarcar(agenda)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Remarcar
                                </button>
                              )}

                              {contatoCliente?.telefone && (
                                <button
                                  onClick={() => abrirWhatsAppCliente(
                                    contatoCliente.telefone,
                                    montarMensagemClienteAgendamento(agenda, contatoCliente, barbearia)
                                  )}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  Cliente
                                </button>
                              )}

                              {telefoneBarbearia && (
                                <button
                                  onClick={() => abrirWhatsAppBarbearia(montarMensagemBarbeariaAgendamento(agenda, contatoCliente, barbearia))}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                  <Store className="w-3.5 h-3.5" />
                                  Barbearia
                                </button>
                              )}

                              {podeDesmarcarAgendamento(agenda) && (
                                <button
                                  onClick={() => handleCancelarAgendamento(agenda)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Desmarcar
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-amber-200">
                              Assinatura inativa: os próximos horários ficam disponíveis apenas para leitura.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(agenda.status)}`}>
                        {getStatusIcon(agenda.status)}
                        {statusLabel(agenda.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'extrato' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold">Extrato</h2>
                  <p className="text-sm text-zinc-400">Analise o período, compare com o mês anterior e exporte o relatório em PDF.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end shrink-0">
                <div className="flex flex-wrap gap-2">
                  {([
                    ['7d', '7 dias'],
                    ['30d', '30 dias'],
                    ['mes', 'Mês'],
                  ] as Array<[FiltroExtrato, string]>).map(([valor, label]) => (
                    <button
                      key={valor}
                      onClick={() => setFiltroExtrato(valor)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        filtroExtrato === valor
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={exportarExtratoPdf}
                    disabled={exportandoExtratoPdf || !extratoPeriodoAtual}
                    className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-900 disabled:opacity-50"
                  >
                    {exportandoExtratoPdf ? 'Exportando PDF...' : 'Exportar PDF'}
                  </button>
                </div>

                {extratoMensal.length > 1 && (
                  <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 sm:min-w-[320px]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Mês base do gráfico</p>
                        <p className="mt-1 text-sm text-zinc-300">Escolha o período histórico que vai alimentar o gráfico.</p>
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400">
                        {extratoMensal.length} mês{extratoMensal.length > 1 ? 'es' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => selecionarMesExtratoPorIndice(Math.max(0, indiceMesExtratoSelecionado - 1))}
                        disabled={indiceMesExtratoSelecionado <= 0}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-40"
                        aria-label="Ir para mês mais recente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <select
                        value={mesExtratoSelecionado}
                        onChange={(e) => setMesExtratoSelecionado(e.target.value)}
                        className="h-10 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none"
                      >
                        {extratoMensal.map((item) => (
                          <option key={item.mes} value={item.mes}>
                            {formatarMesAno(item.mes)}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => selecionarMesExtratoPorIndice(Math.min(extratoMensal.length - 1, indiceMesExtratoSelecionado + 1))}
                        disabled={indiceMesExtratoSelecionado === -1 || indiceMesExtratoSelecionado >= extratoMensal.length - 1}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-40"
                        aria-label="Ir para mês mais antigo"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{extratoMensal[0] ? formatarMesAno(extratoMensal[0].mes) : '--'}</span>
                      <span>{extratoMesSelecionado ? formatarMesAno(extratoMesSelecionado.mes) : '--'}</span>
                      <span>{extratoMensal[extratoMensal.length - 1] ? formatarMesAno(extratoMensal[extratoMensal.length - 1].mes) : '--'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Previsto no período</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-emerald-400">{formatarMoeda(extratoPeriodoAtual?.totalPrevisto || 0)}</p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">{extratoPeriodoAtual?.labelPeriodo || 'Sem período selecionado'}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Realizado no período</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-white">{formatarMoeda(extratoPeriodoAtual?.totalRealizado || 0)}</p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">{extratoPeriodoAtual?.totalAtendimentos || 0} registro(s) computados</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Ticket médio</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-white">{formatarMoeda(extratoPeriodoAtual?.ticketMedio || 0)}</p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">Base no realizado do período</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Comparação com mês anterior</p>
                <p className={`mt-2 text-xl sm:text-2xl font-bold ${
                  (comparacaoMesAnterior?.variacaoRealizado || 0) >= 0 ? 'text-emerald-300' : 'text-red-300'
                }`}>
                  {comparacaoMesAnterior ? formatarVariacaoPercentual(comparacaoMesAnterior.variacaoRealizado) : '0%'}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-400">{comparacaoMesAnterior?.labelMesAnterior || 'Sem base anterior'}</p>
              </div>
            </div>

            {extratoMensal.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                Sem dados financeiros ainda.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,300px)] xl:items-start">
                    <div className="min-w-0 max-w-2xl">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Análise diária</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Fluxo financeiro com leitura por dia</h3>
                      <p className="mt-2 text-sm text-zinc-400">
                        Passe o mouse no gráfico para ver a data, o previsto, o realizado e quantos atendimentos entraram naquele dia.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Previsto
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-zinc-200">
                          <span className="h-2 w-2 rounded-full bg-white" />
                          Realizado
                        </span>
                      </div>
                    </div>

                    {resumoDiaExtrato && (
                      <div className="min-w-0 rounded-2xl border border-zinc-800 bg-black/30 p-4 xl:w-full">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                          {diaHoverExtrato !== null ? 'Dia analisado' : 'Dia em foco'}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatarDataCompleta(resumoDiaExtrato.dataISO)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatarMesAno(extratoMesSelecionado?.mes || '')}</p>

                        <div className="mt-4 grid grid-cols-2 gap-2.5">
                          <div className="min-w-0 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-emerald-200/70">Previsto</p>
                            <p className="mt-2 text-base font-semibold text-emerald-300 break-words">{formatarMoeda(resumoDiaExtrato.previsto)}</p>
                          </div>
                          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-400">Realizado</p>
                            <p className="mt-2 text-base font-semibold text-white break-words">{formatarMoeda(resumoDiaExtrato.realizado)}</p>
                          </div>
                          <div className="col-span-2 min-w-0 rounded-2xl border border-zinc-700 bg-zinc-950 p-3">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Atendimentos</p>
                            <p className="mt-2 text-base font-semibold text-white">{resumoDiaExtrato.atendimentos}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {graficoExtrato && resumoDiaExtrato && (
                    <div className="mt-4 rounded-3xl border border-zinc-800 bg-[linear-gradient(180deg,_rgba(9,9,11,0.96),_rgba(9,9,11,0.8))] p-3 sm:p-3.5">
                      <div className="relative">
                        {tooltipGraficoExtratoAtivo && (
                          <div
                            className="pointer-events-none absolute z-10 hidden rounded-2xl border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs shadow-2xl shadow-black/40 md:block"
                            style={{
                              left: `${Math.min(Math.max(((resumoDiaExtrato.ponto?.x || 0) / GRAFICO_EXTRATO.width) * 100, 12), 88)}%`,
                              top: `${Math.min(Math.max((((resumoDiaExtrato.ponto?.y || 0) - 18) / GRAFICO_EXTRATO.height) * 100, 10), 60)}%`,
                              transform: 'translate(-50%, -100%)',
                            }}
                          >
                            <p className="font-medium text-white">{formatarDataCompleta(resumoDiaExtrato.dataISO)}</p>
                            <p className="mt-1 text-emerald-300">Previsto: {formatarMoeda(resumoDiaExtrato.previsto)}</p>
                            <p className="text-zinc-200">Realizado: {formatarMoeda(resumoDiaExtrato.realizado)}</p>
                          </div>
                        )}

                        <svg
                          viewBox={`0 0 ${GRAFICO_EXTRATO.width} ${GRAFICO_EXTRATO.height}`}
                          className="h-[280px] w-full"
                          onMouseMove={handleGraficoExtratoMouseMove}
                          onMouseLeave={() => setDiaHoverExtrato(null)}
                          onClick={handleGraficoExtratoMouseMove}
                        >
                          <defs>
                            <linearGradient id="extratoAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(52, 211, 153, 0.28)" />
                              <stop offset="100%" stopColor="rgba(52, 211, 153, 0)" />
                            </linearGradient>
                          </defs>

                          {graficoExtrato.linhasHorizontais.map((linha) => (
                            <g key={`y-${linha.valor}`}>
                              <line
                                x1={GRAFICO_EXTRATO.paddingLeft}
                                x2={GRAFICO_EXTRATO.width - GRAFICO_EXTRATO.paddingRight}
                                y1={linha.y}
                                y2={linha.y}
                                stroke="rgba(255,255,255,0.08)"
                                strokeDasharray="4 6"
                              />
                              <text
                                x={GRAFICO_EXTRATO.width - GRAFICO_EXTRATO.paddingRight}
                                y={linha.y - 6}
                                textAnchor="end"
                                fill="rgba(161,161,170,0.8)"
                                fontSize="10"
                              >
                                {formatarMoeda(linha.valor)}
                              </text>
                            </g>
                          ))}

                          {graficoExtrato.marcadoresX.map((indiceDia) => {
                            const totalDias = Math.max(1, (extratoPeriodoAtual?.dias.length || 1) - 1)
                            const x =
                              GRAFICO_EXTRATO.paddingLeft +
                              ((GRAFICO_EXTRATO.width - GRAFICO_EXTRATO.paddingLeft - GRAFICO_EXTRATO.paddingRight) / totalDias) * indiceDia

                            return (
                              <g key={`x-${indiceDia}`}>
                                <text
                                  x={x}
                                  y={GRAFICO_EXTRATO.height - 10}
                                  textAnchor="middle"
                                  fill="rgba(113,113,122,0.9)"
                                  fontSize="10"
                                >
                                  {String(extratoPeriodoAtual?.dias[indiceDia]?.diaMes || indiceDia + 1).padStart(2, '0')}
                                </text>
                              </g>
                            )
                          })}

                          <path d={graficoExtrato.previstoAreaPath} fill="url(#extratoAreaGradient)" />
                          <path
                            d={graficoExtrato.previstoPath}
                            fill="none"
                            stroke="rgba(52, 211, 153, 0.96)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={graficoExtrato.realizadoPath}
                            fill="none"
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {tooltipGraficoExtratoAtivo && resumoDiaExtrato.ponto && (
                            <>
                              <line
                                x1={resumoDiaExtrato.ponto.x}
                                x2={resumoDiaExtrato.ponto.x}
                                y1={GRAFICO_EXTRATO.paddingTop}
                                y2={graficoExtrato.baseY}
                                stroke="rgba(255,255,255,0.14)"
                                strokeDasharray="4 6"
                              />
                              <circle
                                cx={graficoExtrato.previstoPontos[diaDestaqueExtrato]?.x}
                                cy={graficoExtrato.previstoPontos[diaDestaqueExtrato]?.y}
                                r="5"
                                fill="rgba(52, 211, 153, 1)"
                                stroke="rgba(9,9,11,1)"
                                strokeWidth="3"
                              />
                              <circle
                                cx={graficoExtrato.realizadoPontos[diaDestaqueExtrato]?.x}
                                cy={graficoExtrato.realizadoPontos[diaDestaqueExtrato]?.y}
                                r="4.25"
                                fill="rgba(255,255,255,1)"
                                stroke="rgba(9,9,11,1)"
                                strokeWidth="2.5"
                              />
                            </>
                          )}
                        </svg>
                      </div>

                      <p className="mt-3 text-xs text-zinc-500">
                        Leitura diária do mês selecionado. No desktop, passe o mouse; no celular, toque no gráfico para trocar o dia em foco.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Histórico disponível</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Quando sua base crescer, você pode navegar pelo seletor acima ou escolher direto na lista abaixo.
                    </p>
                  </div>

                  <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                    {extratoMensal.map((item) => {
                      const percentualRealizado =
                        item.totalPrevisto > 0 ? Math.min(100, Math.round((item.totalRealizado / item.totalPrevisto) * 100)) : 0

                      return (
                        <button
                          key={item.mes}
                          onClick={() => setMesExtratoSelecionado(item.mes)}
                          className={`w-full rounded-3xl border p-4 text-left transition ${
                            item.mes === mesExtratoSelecionado
                              ? 'border-emerald-500/30 bg-emerald-500/10'
                              : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">{formatarMesAno(item.mes)}</p>
                              <p className="mt-1 text-xs text-zinc-400">{item.qtd} agendamento(s)</p>
                            </div>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                item.mes === mesExtratoSelecionado
                                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                                  : 'border-zinc-700 text-zinc-400'
                              }`}
                            >
                              {item.mes === mesExtratoSelecionado ? 'No gráfico' : 'Selecionar'}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Previsto</p>
                              <p className="mt-2 text-sm font-semibold text-emerald-300">{formatarMoeda(item.totalPrevisto)}</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Realizado</p>
                              <p className="mt-2 text-sm font-semibold text-white">{formatarMoeda(item.totalRealizado)}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between text-[11px] text-zinc-500">
                              <span>Execução do mês</span>
                              <span>{percentualRealizado}% realizado</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-zinc-800">
                              <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${percentualRealizado}%` }} />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Meus Serviços</h2>
                {!recursosPremiumLiberados && (
                  <p className="mt-1 text-sm text-zinc-400">
                    Sem assinatura você ainda pode visualizar o catálogo atual, mas novos serviços ficam bloqueados.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (!recursosPremiumLiberados) {
                    abrirPlanosAssinatura()
                    return
                  }

                  cancelarEdicaoServico()
                  setMostrarNovoServico((prev) => !prev)
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${recursosPremiumLiberados ? 'bg-white text-black' : 'border border-amber-500/30 bg-amber-500/10 text-amber-100'}`}
              >
                <Plus className="w-4 h-4" />
                {recursosPremiumLiberados ? 'Novo' : 'Liberar'}
              </button>
            </div>

            {!recursosPremiumLiberados && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Novos serviços fazem parte da assinatura. Nome, telefone, endereço, horários e demais dados da barbearia continuam configuráveis normalmente.
              </div>
            )}

            {mostrarNovoServico && recursosPremiumLiberados && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
                <p className="text-sm text-zinc-300">Criar novo serviço sem sair desta página</p>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Foto de referência</p>
                  <p className="text-xs text-zinc-400">Escolha a imagem base e personalize o nome como preferir.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {SERVICE_OPTIONS.map((opcao) => {
                    const item = SERVICE_BY_TYPE[opcao.value]
                    const selecionado = novoServico.tipo === opcao.value
                    return (
                      <button
                        key={opcao.value}
                        type="button"
                        onClick={() => setNovoServico((prev) => ({
                          ...prev,
                          tipo: opcao.value,
                          nome: getServiceNameForTypeChange(prev.nome, prev.tipo, opcao.value),
                        }))}
                        className={`rounded-lg border p-2 text-center transition ${selecionado ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800/70'}`}
                      >
                        {item.imagem ? (
                          <img
                            src={item.imagem}
                            alt={item.nome}
                            className="w-12 h-12 rounded-md object-cover mx-auto mb-2 border border-zinc-700"
                          />
                        ) : (
                          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-zinc-600 bg-zinc-950 text-[10px] text-zinc-400">
                            Sem foto
                          </div>
                        )}
                        <p className="text-xs text-zinc-200 leading-tight">{item.nome}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Nome exibido</label>
                    <input
                      type="text"
                      value={novoServico.nome}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, nome: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                      placeholder="Ex: Corte seg a quinta"
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={novoServico.preco}
                    onChange={(e) => setNovoServico((prev) => ({ ...prev, preco: e.target.value }))}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                    placeholder="Valor do corte"
                  />
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={novoServico.duracao}
                    onChange={(e) => setNovoServico((prev) => ({ ...prev, duracao: e.target.value }))}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                    placeholder="Duração (min)"
                  />
                </div>
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 flex items-center gap-3">
                  {SERVICE_BY_TYPE[novoServico.tipo].imagem ? (
                    <img
                      src={SERVICE_BY_TYPE[novoServico.tipo].imagem || ''}
                      alt={SERVICE_BY_TYPE[novoServico.tipo].nome}
                      className="w-10 h-10 sm:w-10 sm:h-10 sm:w-12 sm:h-12 rounded-md object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-zinc-600 bg-zinc-950 text-[10px] text-zinc-400 sm:h-12 sm:w-12">
                      Sem foto
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{novoServico.nome || SERVICE_BY_TYPE[novoServico.tipo].nome}</p>
                    <p className="text-xs text-zinc-400">Referência visual: {SERVICE_BY_TYPE[novoServico.tipo].nome}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={criarServicoInline}
                    className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black active:scale-[0.98]"
                  >
                    Salvar serviço
                  </button>
                  <button
                    onClick={() => setMostrarNovoServico(false)}
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {servicos.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                {recursosPremiumLiberados
                  ? 'Nenhum serviço cadastrado. Clique em Novo para adicionar seu primeiro serviço.'
                  : 'Nenhum serviço cadastrado. Para criar seu catálogo de serviços, ative uma assinatura.'}
              </div>
            )}

            {servicos.map((servico) => (
              servicoEmEdicaoId === servico.id ? (
                <div key={servico.id} className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">Editar serviço</p>
                      <p className="text-sm text-zinc-400">Atualize nome, valor, duração e a foto de referência sem sair da página.</p>
                    </div>
                    <button
                      onClick={cancelarEdicaoServico}
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                      {SERVICE_OPTIONS.map((opcao) => {
                        const item = SERVICE_BY_TYPE[opcao.value]
                        const selecionado = edicaoServico.tipo === opcao.value

                        return (
                          <button
                            key={opcao.value}
                            type="button"
                            onClick={() => setEdicaoServico((prev) => ({
                              ...prev,
                              tipo: opcao.value,
                              nome: getServiceNameForTypeChange(prev.nome, prev.tipo, opcao.value),
                            }))}
                            className={`rounded-lg border p-2 text-center transition ${selecionado ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800/70'}`}
                          >
                            {item.imagem ? (
                              <img
                                src={item.imagem}
                                alt={item.nome}
                                className="w-12 h-12 rounded-md object-cover mx-auto mb-2 border border-zinc-700"
                              />
                            ) : (
                              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-zinc-600 bg-zinc-950 text-[10px] text-zinc-400">
                                Sem foto
                              </div>
                            )}
                            <p className="text-xs text-zinc-200 leading-tight">{item.nome}</p>
                          </button>
                        )
                      })}
                    </div>
                    <div className="md:col-span-3 rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 flex items-center gap-3">
                      {SERVICE_BY_TYPE[edicaoServico.tipo].imagem ? (
                        <img
                          src={SERVICE_BY_TYPE[edicaoServico.tipo].imagem || ''}
                          alt={SERVICE_BY_TYPE[edicaoServico.tipo].nome}
                          className="w-12 h-12 rounded-md object-cover border border-zinc-700"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-zinc-600 bg-zinc-950 text-[10px] text-zinc-400">
                          Sem foto
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{edicaoServico.nome || SERVICE_BY_TYPE[edicaoServico.tipo].nome}</p>
                        <p className="text-xs text-zinc-400">Referência visual: {SERVICE_BY_TYPE[edicaoServico.tipo].nome}</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={edicaoServico.nome}
                      onChange={(e) => setEdicaoServico((prev) => ({ ...prev, nome: e.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                      placeholder="Ex: Corte seg a quinta"
                    />
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={edicaoServico.preco}
                      onChange={(e) => setEdicaoServico((prev) => ({ ...prev, preco: e.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                      placeholder="Preço"
                    />
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={edicaoServico.duracao}
                      onChange={(e) => setEdicaoServico((prev) => ({ ...prev, duracao: e.target.value }))}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                      placeholder="Duração (min)"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => salvarEdicaoServico(servico)}
                      disabled={salvandoServico || removendoServicoId === servico.id}
                      className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50 active:scale-[0.98]"
                    >
                      {salvandoServico ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                    <button
                      onClick={() => removerServico(servico)}
                      disabled={salvandoServico || removendoServicoId === servico.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50 active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" />
                      {removendoServicoId === servico.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={servico.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {getServiceImageByName(servico.nome, servico.imagem) ? (
                      <img
                        src={getServiceImageByName(servico.nome, servico.imagem) || ''}
                        alt={servico.nome}
                        className="w-14 h-14 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-950 text-[10px] text-zinc-400">
                        Sem foto
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{servico.nome}</p>
                      <p className="text-sm text-zinc-400">{servico.duracao} min</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="font-bold">{formatarMoeda(servico.preco)}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => iniciarEdicaoServico(servico)}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 active:scale-[0.98]"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => removerServico(servico)}
                        disabled={removendoServicoId === servico.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50 active:scale-[0.98]"
                      >
                        <Trash2 className="w-4 h-4" />
                        {removendoServicoId === servico.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserRound className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-semibold">Clientes</h2>
                <p className="text-sm text-zinc-400">CRM leve com histórico, frequência e contato rápido.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Base ativa</p>
                <p className="mt-2 text-2xl font-bold text-white">{clientesResumo.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Recorrentes</p>
                <p className="mt-2 text-2xl font-bold text-white">{clientesRecorrentes}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">VIP</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">{clientesVip}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Sem retorno 30d</p>
                <p className="mt-2 text-2xl font-bold text-white">{clientesSemRetorno}</p>
              </div>
            </div>

            {clientesResumo.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-12 text-center text-zinc-500">
                <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Nenhum cliente com histórico ainda.</p>
                <p className="mt-2 text-sm">Conforme os atendimentos entrarem, este CRM vai mostrar frequência, gasto e contato.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientesResumo.map((cliente) => {
                  const perfil = getPerfilCliente(cliente.perfil)

                  return (
                    <div key={cliente.chave} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-white">{cliente.nome}</p>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${perfil.className}`}>
                              {perfil.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-400">Serviço favorito: {cliente.servicoFavorito}</p>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Visitas</p>
                              <p className="mt-1 text-lg font-semibold text-white">{cliente.totalAtendimentos}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Última visita</p>
                              <p className="mt-1 text-sm font-medium text-white">{cliente.ultimaVisita ? formatarDataCurta(cliente.ultimaVisita) : 'Sem histórico'}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Próxima reserva</p>
                              <p className="mt-1 text-sm font-medium text-white">{cliente.proximaVisita ? formatarDataCurta(cliente.proximaVisita) : 'Sem reserva'}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Ocorrências</p>
                              <p className="mt-1 text-sm font-medium text-white">{cliente.cancelamentos} cancelamento(s) • {cliente.faltas} falta(s)</p>
                            </div>
                          </div>
                        </div>

                        <div className="lg:text-right">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Total gasto</p>
                          <p className="mt-1 text-2xl font-bold text-emerald-400">{formatarMoeda(cliente.totalGasto)}</p>
                          <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Cliente com {cliente.totalAtendimentos} atendimento(s)
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                        {gestaoOperacionalLiberada ? (
                          <>
                            {cliente.telefone && (
                              <a
                                href={criarLinkWhatsApp(cliente.telefone, `Olá ${cliente.nome}! Passando para te convidar a agendar seu próximo horário na ${barbearia?.nome || 'barbearia'}.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {formatarTelefone(cliente.telefone)}
                              </a>
                            )}

                            {cliente.email && (
                              <a
                                href={`mailto:${cliente.email}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {cliente.email}
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-amber-200">
                            Assinatura inativa: os contatos seguem visíveis, mas as ações rápidas ficam bloqueadas até a regularização.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'barbeiros' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Barbeiros</h2>
                {!recursosPremiumLiberados && (
                  <p className="mt-1 text-sm text-zinc-400">
                    Você pode manter a configuração básica da barbearia, mas novos barbeiros e fotos da equipe exigem assinatura.
                  </p>
                )}
                {recursosPremiumLiberados && subscriptionMaxProfessionals > 0 && (
                  <p className={`mt-1 text-sm ${equipeAcimaDoLimitePlano ? 'text-amber-300' : 'text-zinc-400'}`}>
                    {equipeAcimaDoLimitePlano
                      ? `Sua equipe atual está acima do limite do plano ${subscriptionPlanLabel}. Remova profissionais extras ou troque de plano para regularizar.`
                      : `Plano atual: ${subscriptionPlanLabel}. Você pode cadastrar até ${subscriptionMaxProfessionals} ${subscriptionMaxProfessionals === 1 ? 'barbeiro' : 'barbeiros'} na equipe.`}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (!recursosPremiumLiberados) {
                    abrirPlanosAssinatura()
                    return
                  }

                  if (equipeAtingiuLimitePlano) {
                    setErro(formatarMensagemLimiteProfissionais(subscriptionMaxProfessionals))
                    abrirPlanosAssinatura()
                    return
                  }

                  setMostrarNovoBarbeiro((prev) => !prev)
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  !recursosPremiumLiberados
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : equipeAtingiuLimitePlano
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-100'
                      : 'bg-white text-black'
                }`}
              >
                <Plus className="w-4 h-4" />
                {!recursosPremiumLiberados
                  ? 'Liberar'
                  : equipeAtingiuLimitePlano
                    ? 'Ampliar plano'
                    : 'Novo'}
              </button>
            </div>

            {!recursosPremiumLiberados && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                A assinatura libera novos barbeiros e upload de fotos da equipe. Sem plano, a configuração básica da barbearia segue disponível.
              </div>
            )}

            {recursosPremiumLiberados && equipeAtingiuLimitePlano && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {formatarMensagemLimiteProfissionais(subscriptionMaxProfessionals)}
              </div>
            )}

            {mostrarNovoBarbeiro && recursosPremiumLiberados && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
                <p className="text-sm text-zinc-300">Adicionar barbeiro da equipe</p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={novoBarbeiro.nome}
                    onChange={(e) => setNovoBarbeiro((prev) => ({ ...prev, nome: e.target.value }))}
                    className="px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
                    placeholder="Nome"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoBarbeiroArquivo(e.target.files?.[0] || null)}
                    className="px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
                    placeholder="Foto (opcional)"
                  />
                  <input
                    type="text"
                    value={novoBarbeiro.descricao}
                    onChange={(e) => setNovoBarbeiro((prev) => ({ ...prev, descricao: e.target.value }))}
                    className="px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base sm:col-span-2 md:col-span-1"
                    placeholder="Descricao (opcional)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={adicionarBarbeiro}
                    disabled={enviandoFotoBarbeiro}
                    className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium active:scale-[0.98]"
                  >
                    {enviandoFotoBarbeiro ? 'Enviando foto...' : 'Salvar barbeiro'}
                  </button>
                  <button
                    onClick={() => setMostrarNovoBarbeiro(false)}
                    className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {barbeiros.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
                {recursosPremiumLiberados
                  ? 'Nenhum barbeiro cadastrado. Clique em Novo para adicionar.'
                  : 'Nenhum barbeiro cadastrado. Ative uma assinatura para montar sua equipe no painel.'}
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
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 sm:p-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold">Remarcar agendamento</h3>
              <button onClick={() => setRemarcarAgendamento(null)} className="p-1 text-zinc-400 hover:text-white">
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Novo horário</label>
                <select
                  value={remarcarHora}
                  onChange={(e) => setRemarcarHora(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-base"
                >
                  {horariosAgendamentoManual.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRemarcarAgendamento(null)}
                className="flex-1 rounded-lg border border-zinc-700 py-3 text-sm font-medium active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemarcarAgendamento}
                disabled={remarcarLoading || !remarcarData || !remarcarHora}
                className="flex-1 rounded-lg bg-white py-3 text-sm font-medium text-black disabled:opacity-50 active:scale-[0.98]"
              >
                {remarcarLoading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
          </div>
        )}
        </div>

        {mostrarNovoMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Novo</h3>
                <p className="mt-1 text-sm text-zinc-400">Escolha o que você quer registrar agora no painel.</p>
              </div>
              <button onClick={() => setMostrarNovoMenu(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={abrirNovoAgendamento}
                className="rounded-2xl border border-white/10 bg-zinc-800/70 p-4 text-left transition hover:border-white/20 hover:bg-zinc-800"
              >
                <div className="inline-flex rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-200">
                  <Calendar className="h-5 w-5" />
                </div>
                <p className="mt-4 text-base font-semibold text-white">Agendamento</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Abra um horário manualmente para um cliente já cadastrado por e-mail.</p>
              </button>

              <button
                onClick={() => void abrirNovaVenda()}
                disabled={carregandoProdutosVenda}
                className="rounded-2xl border border-white/10 bg-zinc-800/70 p-4 text-left transition hover:border-white/20 hover:bg-zinc-800 disabled:opacity-60"
              >
                <div className="inline-flex rounded-xl border border-sky-500/30 bg-sky-500/10 p-2 text-sky-200">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="mt-4 text-base font-semibold text-white">Venda</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Registre item vendido, horário e profissional para atualizar o estoque pela operação.</p>
              </button>
            </div>
          </div>
        </div>
      )}

        {mostrarNovoAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold">Agendar por e-mail</h3>
              <button onClick={() => setMostrarNovoAgendamento(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={novoAgendamento.cliente_email}
                onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, cliente_email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
                placeholder="E-mail do cliente na plataforma"
              />

              <select
                value={novoAgendamento.servico_id}
                onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, servico_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
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
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
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
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
                />
                <select
                  value={novoAgendamento.hora}
                  onChange={(e) => setNovoAgendamento((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
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
                className="flex-1 py-3 rounded-lg border border-zinc-700 text-sm font-medium active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoAgendamento}
                disabled={novoAgendamentoLoading}
                className="flex-1 py-3 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
              >
                {novoAgendamentoLoading ? 'Salvando...' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}

        {mostrarNovaVenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Registrar venda</h3>
                <p className="mt-1 text-sm text-zinc-400">Capture horário, barbeiro e item vendido para baixar o estoque.</p>
              </div>
              <button onClick={() => setMostrarNovaVenda(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={novaVenda.produto_id}
                onChange={(e) => setNovaVenda((prev) => ({ ...prev, produto_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
              >
                <option value="">Selecione o item do estoque</option>
                {produtosEstoqueVenda.map((produto) => (
                  <option key={produto.id} value={String(produto.id)}>
                    {produto.nome} • {formatarMoeda(produto.preco_venda)} • quantidade em estoque {produto.estoque_atual}
                  </option>
                ))}
              </select>

              <select
                value={novaVenda.barbeiro_id}
                onChange={(e) => setNovaVenda((prev) => ({ ...prev, barbeiro_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
              >
                <option value="">Sem barbeiro específico</option>
                {barbeiros.map((barbeiro) => (
                  <option key={barbeiro.id} value={String(barbeiro.id)}>{barbeiro.nome}</option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-2">
                <input
                  value={novaVenda.quantidade}
                  onChange={(e) => setNovaVenda((prev) => ({ ...prev, quantidade: e.target.value }))}
                  inputMode="decimal"
                  className={`w-full px-3 py-2.5 rounded-lg bg-zinc-800 border text-base ${
                    vendaExcedeEstoque
                      ? 'border-red-500/70 text-red-200 focus:border-red-400'
                      : 'border-zinc-700'
                  }`}
                  placeholder="Qtd"
                />
                <input
                  type="date"
                  max="9999-12-31"
                  value={novaVenda.data}
                  onChange={(e) => setNovaVenda((prev) => ({ ...prev, data: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
                />
                <input
                  type="time"
                  value={novaVenda.hora}
                  onChange={(e) => setNovaVenda((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-base"
                />
              </div>

              {produtoVendaSelecionado && (
                <div className={`rounded-xl border p-3 text-sm ${
                  vendaExcedeEstoque
                    ? 'border-red-500/30 bg-red-500/10 text-red-100'
                    : 'border-white/10 bg-zinc-800/60 text-zinc-300'
                }`}>
                  <p className="font-medium text-white">{produtoVendaSelecionado.nome}</p>
                  <p className={`mt-1 ${vendaExcedeEstoque ? 'text-red-200' : 'text-zinc-400'}`}>
                    {produtoVendaSelecionado.categoria || 'Sem categoria'} • quantidade em estoque {produtoVendaSelecionado.estoque_atual} • venda {formatarMoeda(produtoVendaSelecionado.preco_venda)}
                  </p>
                  {vendaExcedeEstoque ? (
                    <p className="mt-2 text-xs font-medium text-red-200">
                      A quantidade informada é maior do que a quantidade em estoque.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMostrarNovaVenda(false)}
                className="flex-1 py-3 rounded-lg border border-zinc-700 text-sm font-medium active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovaVenda}
                disabled={novaVendaLoading || vendaExcedeEstoque}
                className="flex-1 py-3 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
              >
                {novaVendaLoading ? 'Salvando...' : 'Registrar venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

