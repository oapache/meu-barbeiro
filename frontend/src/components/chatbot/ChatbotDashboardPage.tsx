'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ApiService from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Home as HomeIcon,
  Loader2,
  Menu,
  Power,
  QrCode,
  RefreshCw,
  Scissors,
  Shield,
  Sparkles,
  Smartphone,
  X,
} from 'lucide-react'

type BotStatus =
  | 'idle'
  | 'starting'
  | 'qr_ready'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'error'

type ChatbotBotState = {
  status: BotStatus
  lastMessage: string
  lastError: string
  qrCodeDataUrl: string
  loadingPercent: number
  isAuthenticated: boolean
  requestedPhoneNumber: string
  phoneNumber: string
  pushName: string
  updatedAt: string
  hasQrCode: boolean
}

type ChatbotToast = {
  id: number
  title: string
  description: string
  tone: 'success' | 'info'
  visible: boolean
}

type ChatbotBarbearia = {
  id: string | number
  nome?: string
  telefone?: string
  whatsapp_link?: string
  usuario_id?: string | number
  subscription_status?: string
  subscription_plan?: string
  chatbot_mode?: string
  chatbot_enabled?: boolean
  updated_at?: string
  created_at?: string
}

type ChatbotSettings = {
  mode?: string
  enabled?: boolean
}

type ChatbotSubscriptionResumo = {
  status?: string
  plan_key?: string
  subscription?: {
    status?: string
    plan_key?: string
  }
}

type ChatbotMetrics = {
  live_conversations?: number
  human_handoff_open?: number
  awaiting_review?: number
  completed_conversations?: number
  whatsapp_bookings?: number
  abandoned_conversations?: number
  outbound_sent?: number
  outbound_failed?: number
  whatsapp_reviews_avg?: number
  conversion_rate?: number
  send_success_rate?: number
  review_queue_total?: number
  abandoned_review_queue?: number
  handoff_review_queue?: number
  send_failure_sessions?: number
  conflict_sessions?: number
}

type ChatbotSessionItem = {
  id: string
  contact_name?: string
  phone_masked?: string
  stage?: string
  status?: string
  outcome_code?: string
  last_inbound_preview?: string
  last_outbound_preview?: string
  linked_agendamento_id?: string
  linked_agendamento_status?: string
  linked_agendamento_rating?: number | null
  review_status?: 'pending' | 'reviewed'
  review_priority?: 'normal' | 'medium' | 'high' | 'critical'
  review_reasons?: string[]
  outbound_failed_count?: number
  conflict_count?: number
  updated_at?: string
}

type ChatbotTurn = {
  id: string
  direction: 'inbound' | 'outbound'
  text_masked?: string
  stage_before?: string
  stage_after?: string
  detected_intent?: string
  slots_json?: Record<string, unknown>
  result_code?: string
  send_status?: string
  created_at?: string
}

type ChatbotSessionDetail = {
  session?: {
    id: string
    contact_name?: string
    phone_masked?: string
    entry_intent?: string
    stage?: string
    status?: string
    outcome_code?: string
    review_status?: 'pending' | 'reviewed'
    started_at?: string
    ended_at?: string
    created_at?: string
    updated_at?: string
  } | null
  turns?: ChatbotTurn[]
  linked_agendamento?: {
    id: string
    status?: string
    data?: string
    hora?: string
    servico_nome?: string
    avaliacao_nota?: number | null
  } | null
  diagnostics?: {
    outbound_failed_count?: number
    conflict_count?: number
    review_reasons?: string[]
    requires_review?: boolean
  } | null
  review?: {
    status?: 'pending' | 'reviewed'
    reviewed_intent?: string
    review_notes?: string
    ideal_response?: string
    reviewed_by?: string
    reviewed_at?: string | null
  } | null
}

const STATUS_META: Record<BotStatus, { label: string; className: string }> = {
  idle: {
    label: 'Parado',
    className: 'border-zinc-700 bg-zinc-900 text-zinc-200',
  },
  starting: {
    label: 'Preparando',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  qr_ready: {
    label: 'QR pronto',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  authenticated: {
    label: 'QR lido',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  ready: {
    label: 'Conectado',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  disconnected: {
    label: 'Desconectado',
    className: 'border-red-500/30 bg-red-500/10 text-red-200',
  },
  error: {
    label: 'Erro',
    className: 'border-red-500/30 bg-red-500/10 text-red-200',
  },
}

const STORAGE_PHONE_PREFIX = 'meu-barbeiro-chatbot-phone'
const CHATBOT_STATUS_REFRESH_INTERVAL_MS = 10000
const CHATBOT_PANEL_REFRESH_INTERVAL_MS = 60000
const BOT_SUBSCRIPTION_ALLOWED_STATUSES = ['active', 'trialing', 'past_due', 'grace_period']
const REVIEW_REASON_LABELS: Record<string, string> = {
  send_failure: 'Falha de envio',
  abandoned: 'Abandono',
  human_handoff: 'Atendimento manual',
  time_conflict: 'Conflito de horario',
}

const getStoragePhoneKey = (barbeariaId = '') => {
  const id = String(barbeariaId || '').trim()
  return id ? `${STORAGE_PHONE_PREFIX}:${id}` : STORAGE_PHONE_PREFIX
}

const getChatbotLoginRedirectUrl = () => {
  if (typeof window === 'undefined') return '/login?redirect=/chatbot'
  return `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
}

const getRequestedBarbeariaId = () => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  return String(url.searchParams.get('barbearia') || '').trim()
}

const selecionarBarbeariaDoUsuario = (barbearias: ChatbotBarbearia[], userId?: string | number) => {
  const lista = Array.isArray(barbearias) ? [...barbearias] : []
  if (!lista.length) return null

  return lista.sort((a, b) => {
    const statusA = a.subscription_status === 'active' ? 2 : a.subscription_status === 'trialing' ? 1 : 0
    const statusB = b.subscription_status === 'active' ? 2 : b.subscription_status === 'trialing' ? 1 : 0

    if (statusA !== statusB) return statusB - statusA

    const dataA = new Date(a.updated_at || a.created_at || 0).getTime()
    const dataB = new Date(b.updated_at || b.created_at || 0).getTime()
    return dataB - dataA
  })[0]
}

const formatarDataHora = (valor: string) => {
  if (!valor) return 'Agora mesmo'

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(valor))
  } catch {
    return valor
  }
}

const formatarReviewReason = (valor = '') => REVIEW_REASON_LABELS[String(valor || '').trim()] || 'Verificar sessão'

const limparTelefone = (valor = '') => String(valor || '').replace(/\D/g, '').slice(0, 13)

const formatarTelefone = (valor = '') => {
  const numero = limparTelefone(valor)

  if (!numero) return ''
  if (numero.length === 13) {
    return `+${numero.slice(0, 2)} (${numero.slice(2, 4)}) ${numero.slice(4, 9)}-${numero.slice(9)}`
  }
  if (numero.length === 12) {
    return `+${numero.slice(0, 2)} (${numero.slice(2, 4)}) ${numero.slice(4, 8)}-${numero.slice(8)}`
  }
  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`
  }
  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`
  }

  return numero
}

export default function ChatbotDashboardPage() {
  const { user, loading: authLoading } = useAuth() as {
    user?: { id?: string | number; nome?: string; tipo?: string }
    loading: boolean
  }
  const previousStatusRef = useRef<BotStatus | null>(null)
  const toastTimeoutsRef = useRef<number[]>([])
  const statusRequestInFlightRef = useRef(false)
  const panelRequestInFlightRef = useRef(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bot, setBot] = useState<ChatbotBotState | null>(null)
  const [barbearia, setBarbearia] = useState<ChatbotBarbearia | null>(null)
  const [barbeariaLoading, setBarbeariaLoading] = useState(true)
  const [barbeariaErro, setBarbeariaErro] = useState('')
  const [loadingAction, setLoadingAction] = useState<'start' | 'reset' | 'stop' | ''>('')
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [erro, setErro] = useState('')
  const [toasts, setToasts] = useState<ChatbotToast[]>([])
  const [settings, setSettings] = useState<ChatbotSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [subscriptionResumo, setSubscriptionResumo] = useState<ChatbotSubscriptionResumo | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [subscriptionCheckFailed, setSubscriptionCheckFailed] = useState(false)
  const [metrics, setMetrics] = useState<ChatbotMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [queueOnly, setQueueOnly] = useState(false)
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'pending' | 'reviewed'>('pending')
  const [sessions, setSessions] = useState<ChatbotSessionItem[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionDetail, setSessionDetail] = useState<ChatbotSessionDetail | null>(null)
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [reviewStatusValue, setReviewStatusValue] = useState<'pending' | 'reviewed'>('pending')
  const [reviewNotesValue, setReviewNotesValue] = useState('')
  const [savingReview, setSavingReview] = useState(false)

  const barbeariaId = String(barbearia?.id || '').trim()
  const barbeariaNome = barbearia?.nome || 'Minha barbearia'
  const numeroPublicoBarbearia = limparTelefone(barbearia?.whatsapp_link || barbearia?.telefone || '')
  const storagePhoneKey = useMemo(() => getStoragePhoneKey(barbeariaId), [barbeariaId])
  const statusAtual = bot?.status || 'idle'
  const statusExibido: BotStatus = statusAtual
  const statusMeta = STATUS_META[statusExibido]
  const barbeariaConfigurada = Boolean(barbeariaId)
  const phoneNumberDigits = limparTelefone(phoneNumber)
  const phoneNumberLabel = formatarTelefone(phoneNumberDigits)
  const requestedPhoneLabel = formatarTelefone(bot?.requestedPhoneNumber || phoneNumberDigits)
  const telefonePublicoLabel = formatarTelefone(numeroPublicoBarbearia)
  const connectedPhoneLabel = formatarTelefone(bot?.phoneNumber || '')
  const chatbotEnabled = settings?.enabled ?? barbearia?.chatbot_enabled ?? true
  const assinaturaStatusAtual = String(
    subscriptionResumo?.status ||
    subscriptionResumo?.subscription?.status ||
    barbearia?.subscription_status ||
    ''
  ).trim()
  const assinaturaPermiteOperacaoBot = subscriptionCheckFailed || BOT_SUBSCRIPTION_ALLOWED_STATUSES.includes(assinaturaStatusAtual)

  const barbeariaResolvida = !barbeariaLoading && !authLoading

  const feedbackAtual = !barbeariaResolvida
    ? {
        title: 'Carregando barbearia',
        description: 'Estamos identificando o estabelecimento vinculado a este usuário antes de abrir o chatbot.',
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
      }
    : !barbeariaConfigurada
    ? {
        title: 'Cadastre sua barbearia para ativar o chatbot',
        description: 'Essa tela agora funciona por estabelecimento. Cadastre a barbearia primeiro e depois conecte o número do bot.',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
      }
    : !chatbotEnabled
      ? {
          title: 'Chatbot pausado manualmente',
          description: 'O atendimento automático desta barbearia está pausado. Reative quando quiser voltar a receber mensagens.',
          className: 'border-zinc-600 bg-zinc-900 text-zinc-100',
        }
    : subscriptionLoading
      ? {
          title: 'Validando assinatura',
          description: 'Estamos conferindo se o teste grátis ou o plano atual libera a conexão do WhatsApp.',
          className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        }
    : !assinaturaPermiteOperacaoBot
      ? {
          title: 'Teste grátis ou assinatura necessária',
          description: 'Ative o teste grátis ou regularize o plano para conectar o bot do WhatsApp.',
          className: 'border-red-500/30 bg-red-500/10 text-red-100',
        }
    : statusExibido === 'starting'
        ? {
            title: 'Preparando a sessão do WhatsApp',
            description: `Estamos abrindo o ambiente do bot da ${barbeariaNome} e aguardando o QR Code ficar pronto.`,
            className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
          }
        : statusExibido === 'qr_ready'
          ? {
              title: 'QR Code pronto para leitura',
              description: `Abra o WhatsApp do número ${requestedPhoneLabel || 'informado'} e leia o QR Code desta barbearia.`,
              className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
            }
          : statusExibido === 'authenticated'
            ? {
                title: 'QR Code lido com sucesso',
                description: 'A leitura foi reconhecida. Estamos finalizando a conexão com o WhatsApp desta barbearia.',
                className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
              }
            : statusExibido === 'ready'
              ? {
                  title: 'WhatsApp conectado com sucesso',
                  description: `QR lido com sucesso e sessão ativa${connectedPhoneLabel ? ` para ${connectedPhoneLabel}` : ''}.`,
                  className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
                }
              : statusExibido === 'error'
                ? {
                    title: 'A conexão encontrou um erro',
                    description: bot?.lastError || 'Revise a sessão e gere um novo QR Code se necessário.',
                    className: 'border-red-500/30 bg-red-500/10 text-red-100',
                  }
                : statusExibido === 'disconnected'
                  ? {
                      title: 'Sessão desconectada',
                      description: bot?.lastMessage || 'Informe o número novamente e gere um novo QR Code para reconectar.',
                      className: 'border-red-500/30 bg-red-500/10 text-red-100',
                    }
                  : null

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/buscar', label: 'Buscar' },
    { href: '/barbearia', label: 'Painel' },
  ]

  const cardsResumo = [
    { label: 'Barbearia ativa', value: barbeariaNome },
    { label: 'Número do bot', value: requestedPhoneLabel || 'Aguardando número' },
    { label: 'Telefone público', value: telefonePublicoLabel || 'Não configurado' },
    { label: 'Número conectado', value: connectedPhoneLabel || 'Ainda não conectado' },
    { label: 'Última atualização', value: formatarDataHora(bot?.updatedAt || '') },
  ]

  const cardsMetricas = [
    { label: 'Conversas ao vivo', value: String(metrics?.live_conversations || 0) },
    { label: 'Pendências', value: String(metrics?.review_queue_total || 0) },
    { label: 'Agendamentos via bot', value: String(metrics?.whatsapp_bookings || 0) },
    { label: 'Avaliação média', value: Number(metrics?.whatsapp_reviews_avg || 0).toFixed(1) },
    { label: 'Falhas de envio', value: String(metrics?.outbound_failed || 0) },
    { label: 'Entrega WhatsApp', value: `${Number(metrics?.send_success_rate || 0).toFixed(1)}%` },
  ]

  const etapas = [
    {
      titulo: '1. Número do bot',
      descricao: barbeariaConfigurada
        ? requestedPhoneLabel
          ? `${barbeariaNome} vai usar ${requestedPhoneLabel} como WhatsApp de atendimento. Mantenha esse aparelho por perto para ler o QR Code.`
          : `Informe o número que vai responder os clientes da ${barbeariaNome}. Use DDI e DDD, por exemplo: 5511999999999.`
        : 'Cadastre a barbearia para liberar o chatbot.',
      ativo: Boolean(barbeariaConfigurada && requestedPhoneLabel),
    },
    {
      titulo: '2. QR Code lido',
      descricao:
        statusExibido === 'authenticated' || statusExibido === 'ready'
          ? 'Leitura reconhecida com sucesso.'
          : statusExibido === 'qr_ready'
            ? 'No WhatsApp, abra Aparelhos conectados e leia o QR Code desta tela.'
            : 'Depois de informar o número, clique em pedir QR Code para iniciar a conexão.',
      ativo: statusExibido === 'qr_ready' || statusExibido === 'authenticated' || statusExibido === 'ready',
    },
    {
      titulo: '3. Sessão conectada',
      descricao: connectedPhoneLabel
        ? `${connectedPhoneLabel} está pronto para atender os clientes pelo bot.`
        : 'Quando a sessão ficar pronta, faça um teste enviando mensagem de outro celular.',
      ativo: statusExibido === 'ready',
    },
  ]

  const guiaUso = [
    {
      titulo: 'Prepare a barbearia antes de ligar',
      descricao: 'Revise serviços, preços, duração dos cortes, profissionais e horários. O bot usa essas informações para oferecer horários corretos ao cliente.',
    },
    {
      titulo: 'Conecte um WhatsApp de atendimento',
      descricao: 'Digite o número com DDI e DDD, peça o QR Code e leia pelo WhatsApp em Aparelhos conectados. Evite usar um número pessoal da equipe.',
    },
    {
      titulo: 'Teste como se fosse um cliente',
      descricao: 'Depois que aparecer como conectado, envie uma mensagem de outro celular perguntando por horários, serviços e agendamento.',
    },
    {
      titulo: 'Acompanhe quando precisar agir',
      descricao: 'Use os cards de sessão e indicadores para ver conexão, erros de envio e conversas que precisam de atenção manual.',
    },
  ]

  const removerToast = (id: number) => {
    setToasts((atual) => atual.map((toast) => (toast.id === id ? { ...toast, visible: false } : toast)))

    const timeoutId = window.setTimeout(() => {
      setToasts((atual) => atual.filter((toast) => toast.id !== id))
    }, 320)

    toastTimeoutsRef.current.push(timeoutId)
  }

  const adicionarToast = (title: string, description: string, tone: 'success' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)

    setToasts((atual) => [...atual, { id, title, description, tone, visible: false }])

    const showTimeout = window.setTimeout(() => {
      setToasts((atual) => atual.map((toast) => (toast.id === id ? { ...toast, visible: true } : toast)))
    }, 20)

    const hideTimeout = window.setTimeout(() => {
      removerToast(id)
    }, 4200)

    toastTimeoutsRef.current.push(showTimeout, hideTimeout)
  }

  useEffect(() => {
    if (menuAberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [menuAberto])

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      toastTimeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user?.id) {
      window.location.href = getChatbotLoginRedirectUrl()
      return
    }

  }, [authLoading, user?.id])

  useEffect(() => {
    let ativo = true

    const carregarBarbearia = async () => {
      if (authLoading) return

      if (!user?.id) {
        if (!ativo) return
        setBarbearia(null)
        setBarbeariaErro('Sessao de usuario indisponivel.')
        setBarbeariaLoading(false)
        return
      }

      setBarbeariaLoading(true)
      setBarbeariaErro('')

      try {
        const resposta = await ApiService.listMyBarbearias()
        if (!ativo) return

        const lista = Array.isArray(resposta) ? resposta : Array.isArray(resposta?.barbearias) ? resposta.barbearias : []
        const requestedBarbeariaId = getRequestedBarbeariaId()
        const solicitada = lista.find((item) => (
          String(item?.id || '').trim() === requestedBarbeariaId
        ))
        const barbeariaDoUsuario = solicitada || selecionarBarbeariaDoUsuario(lista, user.id)

        if (barbeariaDoUsuario?.id && typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          const barbeariaIdAtual = String(barbeariaDoUsuario.id)
          if (url.searchParams.get('barbearia') !== barbeariaIdAtual) {
            url.searchParams.set('barbearia', barbeariaIdAtual)
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
          }
        }

        setBarbearia(barbeariaDoUsuario || null)
      } catch (error) {
        if (!ativo) return
        setBarbearia(null)
        setBarbeariaErro(error instanceof Error ? error.message : 'Não foi possível carregar a barbearia do usuário.')
      } finally {
        if (ativo) setBarbeariaLoading(false)
      }
    }

    carregarBarbearia()

    return () => {
      ativo = false
    }
  }, [authLoading, user?.id])

  useEffect(() => {
    let ativo = true

    const carregarAssinatura = async () => {
      if (!barbeariaId || !user?.id) {
        setSubscriptionResumo(null)
        setSubscriptionLoading(false)
        return
      }

      setSubscriptionLoading(true)
      setSubscriptionCheckFailed(false)

      try {
        const resposta = await ApiService.getCurrentSubscription({
          userId: user.id,
          barbeariaId,
        })

        if (!ativo) return
        setSubscriptionResumo(resposta || null)
      } catch {
        if (!ativo) return
        setSubscriptionResumo(null)
        setSubscriptionCheckFailed(true)
      } finally {
        if (ativo) setSubscriptionLoading(false)
      }
    }

    carregarAssinatura()

    return () => {
      ativo = false
    }
  }, [barbeariaId, user?.id])

  useEffect(() => {
    if (!barbeariaId) {
      setPhoneNumber('')
      return
    }

    const numeroCadastrado = limparTelefone(barbearia?.whatsapp_link || barbearia?.telefone || '')
    const telefoneSalvo = window.localStorage.getItem(storagePhoneKey)

    if (telefoneSalvo) {
      setPhoneNumber(limparTelefone(telefoneSalvo))
      return
    }

    if (numeroCadastrado) {
      setPhoneNumber(numeroCadastrado)
    }
  }, [barbeariaId, barbearia?.telefone, barbearia?.whatsapp_link, storagePhoneKey])

  useEffect(() => {
    if (!barbeariaId) return

    if (!phoneNumberDigits) {
      window.localStorage.removeItem(storagePhoneKey)
      return
    }

    window.localStorage.setItem(storagePhoneKey, phoneNumberDigits)
  }, [barbeariaId, phoneNumberDigits, storagePhoneKey])

  useEffect(() => {
    let ativo = true

    const carregarStatus = async (silencioso = false) => {
      if (statusRequestInFlightRef.current) return

      if (!barbeariaConfigurada) {
        if (!silencioso) setLoadingStatus(false)
        if (ativo) {
          setBot(null)
          previousStatusRef.current = null
        }
        return
      }

      if (!silencioso) setLoadingStatus(true)
      statusRequestInFlightRef.current = true

      try {
        const resposta = await ApiService.getChatbotWhatsAppStatus(barbeariaId)
        if (!ativo) return

        const botAtual = resposta?.bot || null
        setBot(botAtual)
        setErro('')

        if (botAtual?.requestedPhoneNumber) {
          setPhoneNumber((valorAtual) => valorAtual || limparTelefone(botAtual.requestedPhoneNumber))
        }
      } catch (error) {
        if (!ativo) return
        setErro(error instanceof Error ? error.message : 'Não foi possível consultar o status do bot.')
      } finally {
        statusRequestInFlightRef.current = false
        if (ativo && !silencioso) setLoadingStatus(false)
      }
    }

    carregarStatus()
    const interval = barbeariaConfigurada
      ? window.setInterval(() => carregarStatus(true), CHATBOT_STATUS_REFRESH_INTERVAL_MS)
      : null

    return () => {
      ativo = false
      if (interval) window.clearInterval(interval)
    }
  }, [barbeariaConfigurada, barbeariaId])

  useEffect(() => {
    let ativo = true

    const carregarPainelOperacional = async (silencioso = false) => {
      if (panelRequestInFlightRef.current) return

      if (!barbeariaId) {
        if (ativo) {
          setSettings(null)
          setMetrics(null)
          setSessions([])
          setSelectedSessionId('')
          setSessionDetail(null)
        }
        return
      }

      if (!silencioso) {
        setSettingsLoading(true)
        setMetricsLoading(true)
        setSessionsLoading(true)
      }
      panelRequestInFlightRef.current = true

      try {
        const [settingsResponse, metricsResponse, sessionsResponse] = await Promise.all([
          ApiService.getChatbotSettings(barbeariaId),
          ApiService.getChatbotMetrics(barbeariaId),
          ApiService.listChatbotSessions(barbeariaId, {
            limit: 12,
            offset: 0,
            queueOnly,
            reviewStatus: queueOnly ? reviewStatusFilter : undefined,
          }),
        ])

        if (!ativo) return

        setSettings(settingsResponse?.settings || null)
        const nextSessions = Array.isArray(sessionsResponse?.sessions) ? sessionsResponse.sessions : []
        setMetrics(metricsResponse?.metrics || null)
        setSessions(nextSessions)
        setSessionError('')

        setSelectedSessionId((current) => {
          if (current && nextSessions.some((item) => item.id === current)) return current
          return nextSessions[0]?.id || ''
        })
      } catch (error) {
        if (!ativo) return
        setSessionError(error instanceof Error ? error.message : 'Não foi possível carregar as sessões do chatbot.')
      } finally {
        panelRequestInFlightRef.current = false
        if (ativo && !silencioso) {
          setSettingsLoading(false)
          setMetricsLoading(false)
          setSessionsLoading(false)
        }
      }
    }

    carregarPainelOperacional()
    const interval = barbeariaId
      ? window.setInterval(() => carregarPainelOperacional(true), CHATBOT_PANEL_REFRESH_INTERVAL_MS)
      : null

    return () => {
      ativo = false
      if (interval) window.clearInterval(interval)
    }
  }, [barbeariaId, queueOnly, reviewStatusFilter])

  useEffect(() => {
    let ativo = true

    const carregarDetalheSessao = async () => {
      if (!barbeariaId || !selectedSessionId) {
        if (ativo) setSessionDetail(null)
        return
      }

      setSessionDetailLoading(true)
      try {
        const response = await ApiService.getChatbotSessionDetail(selectedSessionId, barbeariaId)
        if (!ativo) return
        setSessionDetail(response || null)
      } catch (error) {
        if (!ativo) return
        setSessionDetail(null)
        setSessionError(error instanceof Error ? error.message : 'Não foi possível carregar o detalhe da sessão.')
      } finally {
        if (ativo) setSessionDetailLoading(false)
      }
    }

    carregarDetalheSessao()

    return () => {
      ativo = false
    }
  }, [barbeariaId, selectedSessionId])

  useEffect(() => {
    setReviewStatusValue(sessionDetail?.review?.status || 'pending')
    setReviewNotesValue(sessionDetail?.review?.review_notes || '')
  }, [sessionDetail?.review?.status, sessionDetail?.review?.review_notes])

  useEffect(() => {
    if (!bot?.status) return

    const statusAnterior = previousStatusRef.current
    const statusAtualBot = bot.status

    if (statusAnterior === null) {
      previousStatusRef.current = statusAtualBot
      return
    }

    if (statusAnterior !== statusAtualBot) {
      if (statusAtualBot === 'authenticated') {
        adicionarToast(
          'QR Code lido com sucesso',
          'Leitura reconhecida. Estamos finalizando a conexão com o WhatsApp.',
        )
      }

      if (statusAtualBot === 'ready') {
        if (statusAnterior === 'qr_ready') {
          adicionarToast(
            'QR Code lido com sucesso',
            'Leitura reconhecida. A sessão avançou para a etapa final da conexão.',
          )
        }

        adicionarToast(
          'WhatsApp conectado com sucesso',
          connectedPhoneLabel
            ? `Sessão ativa e pronta para uso com o número ${connectedPhoneLabel}.`
            : 'Sessão ativa e pronta para uso.',
        )
      }
    }

    previousStatusRef.current = statusAtualBot
  }, [bot?.status, connectedPhoneLabel])

  const executarAcao = async (tipo: 'start' | 'reset' | 'stop') => {
    if (!barbeariaConfigurada) {
      setErro('Cadastre a barbearia antes de iniciar o chatbot.')
      return
    }

    if ((tipo === 'start' || tipo === 'reset') && !phoneNumberDigits) {
      setErro('Informe o número do WhatsApp do bot antes de pedir o QR Code.')
      return
    }

    setLoadingAction(tipo)
    try {
      const resposta =
        tipo === 'start'
          ? await ApiService.startChatbotWhatsApp(phoneNumberDigits, barbeariaId)
          : tipo === 'reset'
            ? await ApiService.resetChatbotWhatsApp(phoneNumberDigits, barbeariaId)
            : await ApiService.stopChatbotWhatsApp(barbeariaId)

      setBot(resposta?.bot || null)
      setErro('')
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível executar a ação no bot.')
    } finally {
      setLoadingAction('')
    }
  }

  const salvarConfiguracoes = async (nextSettings: Partial<ChatbotSettings>) => {
    if (!barbeariaId) return

    setSettingsSaving(true)
    try {
      const response = await ApiService.updateChatbotSettings(barbeariaId, nextSettings)
      setSettings(response?.settings || null)
      setBarbearia((current) =>
        current
          ? {
              ...current,
              chatbot_mode: response?.settings?.mode || current.chatbot_mode,
              chatbot_enabled: response?.settings?.enabled ?? current.chatbot_enabled,
            }
          : current
      )

      if (nextSettings.enabled === false) {
        setBot((current) =>
          current
            ? {
                ...current,
                status: 'idle',
                lastMessage: 'Chatbot pausado manualmente para esta barbearia.',
                qrCodeDataUrl: '',
                hasQrCode: false,
              }
            : current
        )
      }

      adicionarToast(
        'Configuração atualizada',
        nextSettings.enabled === false
          ? 'O atendimento automático foi pausado para esta barbearia.'
          : 'As configurações operacionais do chatbot foram salvas com sucesso.',
      )
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar as configurações do chatbot.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const salvarRevisao = async () => {
    if (!barbeariaId || !selectedSessionId) return

    setSavingReview(true)
    try {
      const response = await ApiService.updateChatbotSessionReview(selectedSessionId, barbeariaId, {
        review_status: reviewStatusValue,
        review_notes: reviewNotesValue,
      })

      setSessionDetail(response || null)
      setSessions((current) =>
        current.map((item) =>
          item.id === selectedSessionId
            ? {
                ...item,
                review_status: reviewStatusValue,
              }
            : item
        )
      )

      adicionarToast(
        'Observação salva',
        reviewStatusValue === 'reviewed'
          ? 'A sessão foi marcada como resolvida.'
          : 'A observação foi salva e a sessão continua pendente.',
      )
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Não foi possível salvar a observação da sessão.')
    } finally {
      setSavingReview(false)
    }
  }

  return (
    <main className="min-h-screen bg-black pb-12 text-white">
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-24 z-[70] flex w-[min(92vw,380px)] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 ${
              toast.tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-50 shadow-emerald-950/40'
                : 'border-sky-500/30 bg-sky-500/12 text-sky-50 shadow-sky-950/40'
            } ${toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  toast.tone === 'success'
                    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
                    : 'border-sky-400/30 bg-sky-400/15 text-sky-200'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-1 text-sm text-white/80">{toast.description}</p>
              </div>
              <button
                type="button"
                onClick={() => removerToast(toast.id)}
                className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute left-[-80px] top-1/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-2 md:gap-3">
            <img
              src="/logo.png"
              alt="O Corte Certo"
              className="h-10 w-10 rounded-full border-2 border-white object-cover md:h-14 md:w-14"
            />
            <div>
              <p className="text-base font-bold text-white md:text-lg">O Corte Certo</p>
              <p className="text-xs text-zinc-500">Central do WhatsApp</p>
            </div>
          </Link>

          <nav className="hidden gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-300 transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/chatbot" className="text-sm font-medium text-white">
              Chatbot
            </Link>
          </nav>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 text-white transition-transform active:scale-95 md:hidden"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          >
            {menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/90 backdrop-blur-lg transition-all duration-300 md:hidden ${
          menuAberto ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={() => setMenuAberto(false)}
      >
        <nav
          className={`flex h-full flex-col items-center justify-center gap-8 transition-transform duration-300 ${
            menuAberto ? 'translate-y-0' : '-translate-y-8'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuAberto(false)}
              className="text-2xl font-semibold text-white transition-colors hover:text-zinc-300"
            >
              {link.label}
            </Link>
          ))}
            <Link
              href="/chatbot"
              onClick={() => setMenuAberto(false)}
              className="text-2xl font-semibold text-emerald-300"
            >
              Chatbot
          </Link>
        </nav>
      </div>

      <section className="relative px-4 pt-20 md:pt-24">
        <div className="mx-auto grid max-w-6xl items-start gap-5 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/12 via-zinc-950 to-black p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-28 w-28 translate-x-1/4 -translate-y-1/4 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">
                <Sparkles className="h-3 w-3" />
                Guia de uso do WhatsApp
              </div>

              <h1 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
                Conecte o WhatsApp e use o bot no dia a dia
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
                Prepare a barbearia, leia o QR Code, teste a primeira conversa e acompanhe quando o atendimento precisar de atenção.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href={barbeariaConfigurada ? '/barbearia' : '/barbearia/configurar'}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-zinc-200 active:scale-[0.98]"
                >
                  <Scissors className="h-4 w-4" />
                  {barbeariaConfigurada ? 'Voltar ao painel' : 'Configurar barbearia'}
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
                >
                  <HomeIcon className="h-4 w-4" />
                  Ir para a home
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Primeiro uso</p>
                <h2 className="mt-1.5 text-lg font-semibold">Como operar o bot</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                Leia na ordem
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {guiaUso.map((item, index) => (
                <div
                  key={item.titulo}
                  className="rounded-xl border border-white/10 bg-zinc-900 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-[11px] font-semibold text-emerald-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.titulo}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">{item.descricao}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">Checklist de conexão</p>
                <div className="mt-2.5 space-y-2">
                  {etapas.map((etapa) => (
                    <div key={etapa.titulo} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${etapa.ativo ? 'text-emerald-300' : 'text-zinc-600'}`} />
                      <div>
                        <p className={etapa.ativo ? 'font-medium text-white' : 'font-medium text-zinc-400'}>{etapa.titulo}</p>
                        <p className="text-xs text-zinc-500">{etapa.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {feedbackAtual && (
        <section className="relative px-4 pt-6">
          <div className="mx-auto max-w-6xl">
            <div className={`rounded-3xl border p-5 ${feedbackAtual.className}`}>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{feedbackAtual.title}</p>
                  <p className="mt-1 text-sm opacity-90">{feedbackAtual.description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="relative px-4 pb-6 pt-6">
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              WhatsApp que vai atender clientes
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="tel"
                inputMode="numeric"
                value={phoneNumberLabel}
                onChange={(event) => setPhoneNumber(limparTelefone(event.target.value))}
                placeholder={barbeariaConfigurada ? 'Ex.: 5511999999999' : 'Cadastre a barbearia primeiro'}
                disabled={barbeariaLoading || !barbeariaConfigurada}
                className="w-full rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
              <button
                onClick={() => {
                  if (barbeariaId) {
                    window.localStorage.removeItem(storagePhoneKey)
                    setPhoneNumber(numeroPublicoBarbearia)
                  } else {
                    setPhoneNumber('')
                  }
                  setErro('')
                }}
                className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200 transition-colors hover:bg-zinc-900 disabled:opacity-40"
                disabled={barbeariaLoading || !barbeariaConfigurada || !numeroPublicoBarbearia}
              >
                Usar telefone público
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              {barbeariaConfigurada ? (
                numeroPublicoBarbearia ? (
                  <>
                    O número do bot pode ser diferente do telefone público da <span className="text-zinc-300">{barbeariaNome}</span>. O telefone público atual é <span className="text-zinc-300">{telefonePublicoLabel}</span>.
                  </>
                ) : (
                  <>
                    Informe o número que vai ler o QR Code desta barbearia. Ele será usado como número do bot.
                  </>
                )
              ) : (
                <>
                  Cadastre a barbearia antes de gerar o QR Code. Exemplo de número do bot: <span className="text-zinc-300">5511999999999</span>.
                </>
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => executarAcao('start')}
                disabled={
                  loadingAction !== '' ||
                  barbeariaLoading ||
                  subscriptionLoading ||
                  !phoneNumberDigits ||
                  !barbeariaConfigurada ||
                  !assinaturaPermiteOperacaoBot ||
                  !chatbotEnabled
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition-all duration-200 disabled:opacity-40"
              >
                {loadingAction === 'start' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                Pedir QR Code
              </button>
              <button
                onClick={() => executarAcao('reset')}
                disabled={
                  loadingAction !== '' ||
                  barbeariaLoading ||
                  subscriptionLoading ||
                  !phoneNumberDigits ||
                  !barbeariaConfigurada ||
                  !assinaturaPermiteOperacaoBot ||
                  !chatbotEnabled
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/40 px-4 py-3 text-sm text-amber-200 transition-all duration-200 hover:bg-amber-500/10 disabled:opacity-40"
              >
                {loadingAction === 'reset' ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Gerar novo QR
              </button>
              <button
                onClick={() => executarAcao('stop')}
                disabled={loadingAction !== '' || barbeariaLoading || !barbeariaConfigurada}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-900 disabled:opacity-40"
              >
                {loadingAction === 'stop' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Parar bot
              </button>
            </div>

            {barbeariaErro && (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                {barbeariaErro}
              </div>
            )}

            {erro && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {erro}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {cardsResumo.map((card) => (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">{card.label}</p>
                  <p className="mt-3 text-sm font-medium text-white">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">Operação do WhatsApp</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Indicadores do atendimento</h3>
                </div>
                {(metricsLoading || settingsLoading) && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cardsMetricas.map((card) => (
                  <div key={card.label} className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Status do atendimento</p>
                    <h4 className="mt-2 text-base font-semibold text-white">Chatbot da barbearia</h4>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                      Pause ou reative o atendimento automático sem desconectar as demais configurações da barbearia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => salvarConfiguracoes({ enabled: !chatbotEnabled })}
                    disabled={settingsSaving || !barbeariaConfigurada}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-40 ${
                      chatbotEnabled
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15'
                        : 'border-zinc-700 bg-black/40 text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {settingsSaving ? 'Salvando...' : chatbotEnabled ? 'Chatbot ligado' : 'Chatbot pausado'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">QR Code da sessão</p>
                <h2 className="mt-1 text-lg font-semibold">Leitura e confirmação</h2>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-zinc-900"
              >
                {loadingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Atualizar
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-dashed border-zinc-800 bg-black/40 p-4">
              {barbeariaLoading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
                  <p className="mt-4 text-sm text-zinc-300">Carregando a barbearia do usuário...</p>
                  <p className="mt-2 max-w-xs text-sm text-zinc-500">
                    Estamos buscando o estabelecimento correto antes de abrir a sessão do chatbot.
                  </p>
                </div>
              ) : !barbeariaConfigurada ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <Shield className="h-10 w-10 text-amber-400" />
                  <p className="mt-4 text-sm text-zinc-300">Nenhuma barbearia está configurada para este usuário.</p>
                  <p className="mt-2 max-w-xs text-sm text-zinc-500">
                    Configure a barbearia no painel antes de iniciar o chatbot.
                  </p>
                </div>
              ) : bot?.qrCodeDataUrl ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-white p-4">
                    <img
                      src={bot.qrCodeDataUrl}
                      alt="QR Code do bot do WhatsApp"
                      className="mx-auto h-auto w-full max-w-xs"
                    />
                  </div>
                  <p className="text-sm text-zinc-300">
                    Abra o WhatsApp do número <span className="font-medium text-white">{requestedPhoneLabel || 'informado'}</span>, vá em{' '}
                    <span className="font-medium text-white">Aparelhos conectados</span> e leia este QR.
                  </p>
                </div>
              ) : statusExibido === 'authenticated' ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">QR Code lido com sucesso</p>
                  <p className="mt-2 max-w-sm text-sm text-zinc-400">
                    A leitura já foi reconhecida. Agora estamos finalizando a autenticação da sessão.
                  </p>
                </div>
              ) : statusExibido === 'ready' ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">WhatsApp conectado</p>
                  <p className="mt-2 max-w-sm text-sm text-zinc-400">
                    QR lido com sucesso e sessão conectada{connectedPhoneLabel ? ` para ${connectedPhoneLabel}` : ''}.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <QrCode className="h-10 w-10 text-zinc-600" />
                  <p className="mt-4 text-sm text-zinc-300">Nenhum QR disponível no momento.</p>
                  <p className="mt-2 max-w-xs text-sm text-zinc-500">
                    Informe o WhatsApp de atendimento acima e clique em pedir QR Code para preparar a sessão.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Resumo da sessão</p>
                <h2 className="mt-1 text-lg font-semibold">Detalhes operacionais</h2>
              </div>
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>
                {statusMeta.label}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Mensagem atual</p>
                <p className="mt-2 text-sm text-white">{bot?.lastMessage || 'Aguardando a escolha do número e do QR Code.'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Erro</p>
                <p className="mt-2 text-sm text-white">{bot?.lastError || 'Nenhum erro registrado.'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Nome do perfil</p>
                <p className="mt-2 text-sm text-white">{bot?.pushName || 'Ainda não disponível'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Fila operacional</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Sessões recentes</h2>
              </div>
              {sessionsLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setQueueOnly(false)}
                className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                  queueOnly ? 'border-white/10 bg-black/30 text-zinc-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                }`}
              >
                Todas as sessoes
              </button>
              <button
                type="button"
                onClick={() => setQueueOnly(true)}
                className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                  queueOnly ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-black/30 text-zinc-400'
                }`}
              >
                Pendências
              </button>
              <select
                value={reviewStatusFilter}
                onChange={(event) => setReviewStatusFilter(event.target.value as 'pending' | 'reviewed')}
                className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none"
              >
                <option value="pending">Pendentes</option>
                <option value="reviewed">Resolvidas</option>
              </select>
            </div>

            {sessionError && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {sessionError}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-sm text-zinc-400">
                  Nenhuma sessão registrada ainda para esta barbearia.
                </div>
              ) : (
                sessions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSessionId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      selectedSessionId === item.id
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-white/10 bg-zinc-900/80 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.contact_name || 'Cliente anonimizado'}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                          {item.phone_masked || 'Telefone mascarado'} • {item.stage || 'idle'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-zinc-300">
                          {item.status || 'active'}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] ${
                            item.review_status === 'reviewed'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                              : item.review_priority === 'critical'
                                ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                : item.review_priority === 'high'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                                  : 'border-white/10 bg-black/40 text-zinc-300'
                          }`}
                        >
                          {item.review_status === 'reviewed' ? 'Resolvida' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-zinc-300">
                      {item.last_outbound_preview || item.last_inbound_preview || 'Sem mensagem registrada.'}
                    </p>
                    {!!item.review_reasons?.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.review_reasons.map((reason) => (
                          <span
                            key={`${item.id}-${reason}`}
                            className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100"
                          >
                            {formatarReviewReason(reason)}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            <Link
              href="/barbearia"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200"
            >
              Voltar ao painel principal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Sessão selecionada</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Detalhe operacional</h2>
              </div>
              {sessionDetailLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
            </div>

            {!selectedSessionId || !sessionDetail?.session ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-sm text-zinc-400">
                Selecione uma sessão para acompanhar o contexto anonimizado.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Contato</p>
                  <p className="mt-2 text-sm text-white">
                    {sessionDetail.session.contact_name || 'Cliente anonimizado'} • {sessionDetail.session.phone_masked || 'Telefone mascarado'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Estado atual</p>
                  <p className="mt-2 text-sm text-white">
                    {sessionDetail.session.stage || 'idle'} • {sessionDetail.session.status || 'active'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Agendamento vinculado</p>
                  <p className="mt-2 text-sm text-white">
                    {sessionDetail.linked_agendamento
                      ? `${sessionDetail.linked_agendamento.servico_nome || 'Serviço'} • ${sessionDetail.linked_agendamento.data || '--'} ${sessionDetail.linked_agendamento.hora || ''}`
                      : 'Nenhum agendamento vinculado ainda.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Alertas da conversa</p>
                  {sessionDetail.diagnostics?.review_reasons?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sessionDetail.diagnostics.review_reasons.map((reason) => (
                        <span
                          key={`detail-${reason}`}
                          className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100"
                        >
                          {formatarReviewReason(reason)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-400">Nenhum alerta automático para esta sessão.</p>
                  )}
                  <p className="mt-3 text-xs text-zinc-500">
                    Falhas de envio: {sessionDetail.diagnostics?.outbound_failed_count || 0} • Conflitos: {sessionDetail.diagnostics?.conflict_count || 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Acompanhamento interno</p>
                      <p className="mt-2 text-sm text-zinc-400">Marque a sessão como resolvida e registre uma observação para a equipe.</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] ${
                        reviewStatusValue === 'reviewed'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                      }`}
                    >
                      {reviewStatusValue === 'reviewed' ? 'Resolvida' : 'Pendente'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs uppercase tracking-wide text-zinc-500">Status</label>
                      <select
                        value={reviewStatusValue}
                        onChange={(event) => setReviewStatusValue(event.target.value as 'pending' | 'reviewed')}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="pending">Pendente</option>
                        <option value="reviewed">Resolvida</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wide text-zinc-500">Observação interna</label>
                      <textarea
                        value={reviewNotesValue}
                        onChange={(event) => setReviewNotesValue(event.target.value)}
                        rows={4}
                        placeholder="Descreva qualquer ponto que a equipe precisa acompanhar."
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={salvarRevisao}
                      disabled={savingReview}
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition-all duration-200 disabled:opacity-40"
                    >
                      {savingReview ? 'Salvando...' : 'Salvar observação'}
                    </button>

                    {sessionDetail.review?.reviewed_at && (
                      <p className="text-xs text-zinc-500">
                        Última observação salva em {formatarDataHora(sessionDetail.review.reviewed_at)}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
            <p className="text-sm text-zinc-400">Timeline anonimizada</p>
            <div className="mt-5 space-y-3">
              {sessionDetail?.turns?.length ? (
                sessionDetail.turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={`rounded-2xl border p-4 ${
                      turn.direction === 'inbound'
                        ? 'border-sky-500/20 bg-sky-500/5'
                        : 'border-emerald-500/20 bg-emerald-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">
                        {turn.direction === 'inbound' ? 'Cliente' : 'Bot'}
                      </p>
                      <p className="text-xs text-zinc-500">{turn.created_at ? formatarDataHora(turn.created_at) : 'Agora'}</p>
                    </div>
                    <p className="mt-2 text-sm text-white">{turn.text_masked || 'Sem conteudo registrado.'}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {turn.stage_before || 'idle'} → {turn.stage_after || turn.stage_before || 'idle'}
                      {turn.result_code ? ` • ${turn.result_code}` : ''}
                      {turn.send_status ? ` • ${turn.send_status}` : ''}
                    </p>
                    {!!turn.slots_json && Object.keys(turn.slots_json).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(turn.slots_json).map(([key, value]) => (
                          <span
                            key={`${turn.id}-${key}`}
                            className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-300"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-sm text-zinc-400">
                  Ainda não há mensagens registradas para esta sessão.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
