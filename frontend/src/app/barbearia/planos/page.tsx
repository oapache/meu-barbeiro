'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Crown, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'

type AuthUser = {
  id?: string | number
  tipo?: string
  nome?: string
  email?: string
  telefone?: string
  tax_id?: string
  billing_address?: {
    zipcode?: string
    street?: string
    number?: string
    neighborhood?: string
    city?: string
    state?: string
    complement?: string
  }
}

type Subscription = {
  status?: string
  plan_key?: string
  provider?: string
  payment_method?: string
  current_period_end?: string
  trial_end?: string
  cancel_at_period_end?: boolean
}

const PLANOS = [
  {
    key: 'professionals_1',
    title: '1 Profissional',
    price: 'R$ 34,90/mês',
    afterTrial: 'Após 7 dias grátis: R$ 34,90/mês',
    description: 'Perfeito para barbeiros autônomos e operações solo.',
    highlights: [
      'Todos os recursos premium incluídos',
      'Agenda, catálogo e equipe em um só painel',
      'Suporte para operação diária',
    ],
  },
  {
    key: 'professionals_2_5',
    title: '2 a 5 Profissionais',
    price: 'R$ 69,90/mês',
    afterTrial: 'Após 7 dias grátis: R$ 69,90/mês',
    description: 'O melhor encaixe para barbearias em fase de crescimento.',
    badge: 'Mais escolhido',
    highlights: [
      'Todos os recursos premium incluídos',
      'Escala ideal para equipes enxutas',
      'Suporte para operação diária',
    ],
  },
  {
    key: 'professionals_6_15',
    title: '6 a 15 Profissionais',
    price: 'R$ 119,90/mês',
    afterTrial: 'Após 7 dias grátis: R$ 119,90/mês',
    description: 'Feito para casas com agenda intensa e time robusto.',
    highlights: [
      'Todos os recursos premium incluídos',
      'Estrutura preparada para operação recorrente',
      'Suporte para operação diária',
    ],
  },
  {
    key: 'professionals_15_plus',
    title: '+15 Profissionais',
    price: 'R$ 159,90/mês',
    afterTrial: 'Após 7 dias grátis: R$ 159,90/mês',
    description: 'Para operações maiores que precisam de escala sem perder ritmo.',
    highlights: [
      'Todos os recursos premium incluídos',
      'Pensado para equipes amplas e alta demanda',
      'Suporte para operação diária',
    ],
  },
]

const PLAN_LABELS: Record<string, string> = {
  free: 'Sem plano ativo',
  professionals_1: '1 profissional',
  professionals_2_5: '2 a 5 profissionais',
  professionals_6_15: '6 a 15 profissionais',
  professionals_15_plus: '+15 profissionais',
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Assinatura ativa',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  trialing: {
    label: 'Em período grátis',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  past_due: {
    label: 'Pagamento pendente',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  pending: {
    label: 'Aguardando confirmação',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  canceled: {
    label: 'Cancelada',
    className: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  },
  inactive: {
    label: 'Inativa',
    className: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  },
}

const formatarDataBr = (valor?: string) => {
  if (!valor) return '-'
  const dt = new Date(valor)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('pt-BR')
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

const getRedirectLoginUrl = () => {
  if (typeof window === 'undefined') return '/login?redirect=/barbearia/planos'
  return `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
}

const getRequestedBarbeariaId = () => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  return String(url.searchParams.get('barbearia') || '').trim()
}

export default function PlanosAssinaturaPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth() as {
    user?: AuthUser
    isAuthenticated: boolean
    loading: boolean
    logout: () => void
  }

  const [loading, setLoading] = useState(true)
  const [barbeariaId, setBarbeariaId] = useState<string>('')
  const [barbeariaNome, setBarbeariaNome] = useState<string>('')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [semBarbearia, setSemBarbearia] = useState(false)
  const [erro, setErro] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null)
  const [acaoLoading, setAcaoLoading] = useState('')
  const [authRedirecting, setAuthRedirecting] = useState(false)
  const statusAtual = subscription?.status || 'inactive'
  const planoAtualKey = subscription?.plan_key || 'free'
  const providerAtual = subscription?.provider || 'stripe'
  const planoAtualLabel = PLAN_LABELS[planoAtualKey] || planoAtualKey
  const statusMeta = STATUS_META[statusAtual] || STATUS_META.inactive
  const canManageBilling = ['active', 'trialing', 'past_due'].includes(statusAtual)
  const portalDisponivel = canManageBilling && providerAtual === 'stripe'
  const dataResumoPrincipal = statusAtual === 'trialing' ? subscription?.trial_end : subscription?.current_period_end
  const resumoPeriodoLabel = statusAtual === 'trialing' ? 'Fim do período grátis' : 'Fim do ciclo'
  const cancelamentoAgendado = subscription?.cancel_at_period_end === true
  const diasRestantesTrial = useMemo(() => calcularDiasRestantesTrial(subscription?.trial_end), [subscription?.trial_end])
  const statusLabelAtual = statusAtual === 'trialing'
    ? formatarLabelTrialRestante(diasRestantesTrial)
    : statusMeta.label
  const heroTrialLabel = statusAtual === 'trialing'
    ? formatarLabelTrialRestante(diasRestantesTrial)
    : '7 dias grátis'

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (authLoading) return

    if (!isAuthenticated) {
      setAuthRedirecting(true)
      window.location.replace(getRedirectLoginUrl())
      return
    }

  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) return

    const carregar = async () => {
      try {
        setLoading(true)
        setErro('')
        setFeedback((atual) => atual?.type === 'info' ? atual : null)
        setSemBarbearia(false)

        const respostaBarbearias = await ApiService.listMyBarbearias()
        const lista = Array.isArray(respostaBarbearias?.barbearias) ? respostaBarbearias.barbearias : []
        const requestedBarbeariaId = getRequestedBarbeariaId()
        const solicitada = lista.find((item: any) => String(item?.id || '') === requestedBarbeariaId)
        const minha = solicitada || lista[0]

        if (!minha?.id) {
          setSemBarbearia(true)
          setSubscription({ status: 'inactive', plan_key: 'free' })
          return
        }

        const id = String(minha.id)
        setBarbeariaId(id)
        setBarbeariaNome(String(minha.nome || 'Minha barbearia'))

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          if (url.searchParams.get('barbearia') !== id) {
            url.searchParams.set('barbearia', id)
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
          }
        }

        const atual = await ApiService.getCurrentSubscription({ userId: user?.id, barbeariaId: id })
        setSubscription(atual?.subscription || {
          status: atual?.status,
          plan_key: atual?.plan_key,
        })
      } catch (error: any) {
        const message = error?.message || 'Não foi possível carregar os planos agora.'
        if (message.toLowerCase().includes('usuário não autenticado')) {
          logout()
          setAuthRedirecting(true)
          window.location.replace(getRedirectLoginUrl())
          return
        }

        setErro(message)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [authLoading, isAuthenticated, user?.id, logout])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (authLoading || !isAuthenticated) return

    const url = new URL(window.location.href)
    const checkout = String(url.searchParams.get('checkout') || '').trim()
    if (checkout !== 'cancel') return

    setFeedback({
      type: 'info',
      message: 'Checkout cancelado. Nenhuma alteração foi feita na sua assinatura.',
    })

    url.searchParams.delete('checkout')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [authLoading, isAuthenticated])

  const iniciarCheckout = async (planKey: string) => {
    try {
      setAcaoLoading(`stripe:${planKey}`)
      setErro('')
      setFeedback(null)

      const resposta = await ApiService.createSubscriptionCheckoutSession({
        userId: user?.id,
        planKey,
        barbeariaId,
      })

      if (!resposta?.checkout_url) {
        throw new Error('Checkout Stripe não retornou URL de redirecionamento.')
      }

      window.location.href = resposta.checkout_url
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível iniciar a assinatura agora.')
    } finally {
      setAcaoLoading('')
    }
  }

  const abrirPortal = async () => {
    try {
      setAcaoLoading('portal')
      setErro('')
      setFeedback(null)

      const resposta = await ApiService.createSubscriptionCustomerPortal({
        userId: user?.id,
        barbeariaId,
      })

      if (!resposta?.portal_url) {
        throw new Error('Não foi possível abrir o portal de cobrança.')
      }

      window.location.href = resposta.portal_url
    } catch (error: any) {
      setErro(error?.message || 'Falha ao abrir portal de cobrança.')
    } finally {
      setAcaoLoading('')
    }
  }

  const cancelarAssinatura = async () => {
    try {
      setAcaoLoading('cancel')
      setErro('')
      setFeedback(null)

      const resposta = await ApiService.cancelCurrentSubscription({
        userId: user?.id,
        barbeariaId,
      })

      setSubscription((atual) => ({
        ...(atual || {}),
        status: resposta?.status || atual?.status || statusAtual,
        current_period_end: resposta?.current_period_end || atual?.current_period_end,
        cancel_at_period_end: resposta?.cancel_at_period_end === true,
      }))
      setFeedback({
        type: 'success',
        message: resposta?.message || 'Cancelamento agendado para o fim do ciclo.',
      })

      const atual = await ApiService.getCurrentSubscription({ userId: user?.id, barbeariaId })
      setSubscription(atual?.subscription || {
        status: atual?.status,
        plan_key: atual?.plan_key,
      })
    } catch (error: any) {
      setErro(error?.message || 'Falha ao cancelar assinatura.')
    } finally {
      setAcaoLoading('')
    }
  }

  if (authLoading || authRedirecting || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-black px-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 px-6 py-5 text-sm text-zinc-300 shadow-2xl shadow-black/30">
            Redirecionando para a área correta...
          </div>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 px-6 py-5 text-sm text-zinc-300 shadow-2xl shadow-black/30">
            Carregando planos...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">O Corte Certo</p>
            <h1 className="mt-2 text-xl font-semibold sm:text-2xl">Planos da sua barbearia</h1>
          </div>

          <Link
            href="/barbearia"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-zinc-900"
          >
            Voltar ao painel
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_36%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))] p-6 sm:p-8">
              <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-400/10 blur-3xl" />

              <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Assinatura premium</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                Escolha um plano que acompanhe o ritmo da sua equipe
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Todos os planos liberam os mesmos recursos premium da plataforma O Corte Certo. O que muda é só a quantidade de profissionais que sua operação precisa suportar.
              </p>
              {barbeariaNome ? (
                <p className="mt-3 text-sm font-medium text-emerald-100">
                  Operação selecionada: {barbeariaNome}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {heroTrialLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-zinc-300">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Mesmo pacote premium em todos os planos
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-zinc-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  7 dias de carência após falha de pagamento
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Agenda premium</p>
                  <p className="mt-2 text-sm text-white">Organize horários, clientes e operação diária sem sair do painel.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Equipe liberada</p>
                  <p className="mt-2 text-sm text-white">Cadastre profissionais, serviços, fotos e escale sua estrutura com segurança.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Cobrança simples</p>
                  <p className="mt-2 text-sm text-white">Gerencie assinatura, período grátis e renovação com poucos toques.</p>
                </div>
              </div>
            </section>

            <aside className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/30">
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>
                {statusLabelAtual}
              </div>

              <h2 className="mt-4 text-2xl font-semibold">Resumo da assinatura</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {statusAtual === 'trialing'
                  ? `Seu período grátis já está ativo.${diasRestantesTrial !== null ? ` Restam ${diasRestantesTrial} ${diasRestantesTrial === 1 ? 'dia' : 'dias'} para configurar equipe, catálogo e operação antes da primeira cobrança.` : ' Aproveite para configurar equipe, catálogo e operação antes da primeira cobrança.'}`
                  : canManageBilling
                    ? 'Sua assinatura premium está liberada e pronta para sustentar a rotina da barbearia.'
                    : 'Escolha o plano ideal para liberar os recursos premium da sua barbearia.'}
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
                      <Crown className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Plano atual</p>
                      <p className="mt-2 text-lg font-semibold text-white">{planoAtualLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-2 text-zinc-300">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{resumoPeriodoLabel}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatarDataBr(dataResumoPrincipal)}</p>
                    </div>
                  </div>
                </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-2 text-zinc-300">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Cobrança</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {cancelamentoAgendado
                          ? 'Cancelamento agendado para o fim do ciclo.'
                          : canManageBilling
                            ? 'Sua assinatura segue gerenciável no Stripe.'
                            : 'Ative um plano para liberar os recursos premium.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {canManageBilling && (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={abrirPortal}
                    disabled={acaoLoading === 'portal' || !portalDisponivel}
                    className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {acaoLoading === 'portal' ? 'Abrindo portal...' : 'Gerenciar no Stripe'}
                  </button>
                  <button
                    onClick={cancelarAssinatura}
                    disabled={acaoLoading === 'cancel' || cancelamentoAgendado}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      cancelamentoAgendado
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-100'
                      : 'border border-red-500/35 text-red-200 hover:bg-red-500/10'
                    }`}
                  >
                    {acaoLoading === 'cancel'
                      ? 'Cancelando...'
                      : cancelamentoAgendado
                        ? 'Cancelamento agendado'
                        : 'Cancelar no fim do ciclo'}
                  </button>
                </div>
              )}
            </aside>
          </div>

          {semBarbearia && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
              <p className="text-sm font-medium">Cadastre sua barbearia antes de assinar um plano.</p>
              <p className="mt-2 text-sm text-amber-100/80">
                Depois do cadastro, você poderá escolher o plano e iniciar o período grátis sem sair do fluxo profissional.
              </p>
              <Link
                href="/barberia/configurar"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Cadastrar barbearia
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {erro && (
            <div className="rounded-3xl border border-red-500/35 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {erro}
            </div>
          )}

          {feedback && (
            <div
              className={`rounded-3xl px-5 py-4 text-sm ${
                feedback.type === 'success'
                  ? 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
                  : 'border border-amber-500/35 bg-amber-500/10 text-amber-100'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLANOS.map((plano) => {
              const isCurrentPlan = canManageBilling && planoAtualKey === plano.key
              const stripeBusy = acaoLoading === `stripe:${plano.key}`
              const disabled = Boolean(acaoLoading) || semBarbearia || isCurrentPlan

              return (
                <article
                  key={plano.key}
                  className={`relative overflow-hidden rounded-3xl border p-5 shadow-2xl shadow-black/20 transition-all duration-200 sm:p-6 ${
                    isCurrentPlan
                      ? 'border-emerald-400/40 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(180deg,_rgba(18,18,20,0.98),_rgba(7,7,9,1))]'
                      : 'border-white/10 bg-zinc-950/85'
                  }`}
                >
                  <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-500/8 blur-3xl" />

                  <div className="relative min-h-[32px]">
                    {isCurrentPlan ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Plano atual
                      </span>
                    ) : plano.badge ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
                        {plano.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="relative mt-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Plano profissional</p>
                    <h3 className="mt-2 text-2xl font-semibold">{plano.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{plano.description}</p>
                    <p className="mt-5 text-3xl font-semibold text-white">{plano.price}</p>
                    <p className="mt-3 text-sm font-medium text-emerald-300">{plano.afterTrial}</p>
                  </div>

                  <ul className="relative mt-5 space-y-3 text-sm text-zinc-300">
                    {plano.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="relative mt-6 w-full cursor-default rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100"
                    >
                      Esse é o seu plano atual
                    </button>
                  ) : (
                    <div className="relative mt-6 grid gap-2">
                      <button
                        onClick={() => iniciarCheckout(plano.key)}
                        disabled={disabled}
                        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-60"
                      >
                        {semBarbearia ? 'Cadastre sua barbearia' : stripeBusy ? 'Abrindo Stripe...' : 'Assinar agora'}
                      </button>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <p className="relative mt-3 text-xs leading-5 text-emerald-100/80">
                      Seu acesso premium já está ativo neste plano.
                    </p>
                  )}

                  {!isCurrentPlan && (
                    <p className="relative mt-3 text-xs leading-5 text-zinc-500">
                      Pagamento processado pelo Stripe com 7 dias grátis antes da primeira cobrança.
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
