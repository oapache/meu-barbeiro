'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'

type AuthUser = {
  id?: string | number
  tipo?: string
  nome?: string
}

type Subscription = {
  status?: string
  plan_key?: string
  current_period_end?: string
  trial_end?: string
  cancel_at_period_end?: boolean
}

const PLANOS = [
  {
    key: 'professionals_1',
    title: '1 Profissional',
    price: 'R$ 34,90/mês',
    firstMonth: '1º mês: R$ 25,00',
    description: 'Mesmo pacote de recursos premium. O que muda é apenas a quantidade de funcionários.',
  },
  {
    key: 'professionals_2_5',
    title: '2 a 5 Profissionais',
    price: 'R$ 69,90/mês',
    firstMonth: '1º mês: R$ 49,00',
    description: 'Mesmo pacote de recursos premium. O que muda é apenas a quantidade de funcionários.',
  },
  {
    key: 'professionals_6_15',
    title: '6 a 15 Profissionais',
    price: 'R$ 119,90/mês',
    firstMonth: '1º mês: R$ 89,00',
    description: 'Mesmo pacote de recursos premium. O que muda é apenas a quantidade de funcionários.',
  },
  {
    key: 'professionals_15_plus',
    title: '+15 Profissionais',
    price: 'R$ 159,90/mês',
    firstMonth: '1º mês: R$ 129,00',
    description: 'Mesmo pacote de recursos premium. O que muda é apenas a quantidade de funcionários.',
  },
]

const formatarDataBr = (valor?: string) => {
  if (!valor) return '-'
  const dt = new Date(valor)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('pt-BR')
}

export default function PlanosAssinaturaPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth() as {
    user?: AuthUser
    isAuthenticated: boolean
    loading: boolean
  }

  const [loading, setLoading] = useState(true)
  const [barbeariaId, setBarbeariaId] = useState<string>('')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [semBarbearia, setSemBarbearia] = useState(false)
  const [erro, setErro] = useState('')
  const [acaoLoading, setAcaoLoading] = useState('')

  const statusAtual = subscription?.status || 'inactive'
  const statusLabel: Record<string, string> = {
    active: 'Ativa',
    trialing: 'Em período grátis',
    past_due: 'Pagamento pendente',
    canceled: 'Cancelada',
    inactive: 'Inativa',
  }
  const canManageBilling = ['active', 'trialing', 'past_due'].includes(statusAtual)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/barbearia/planos'
      return
    }

    if (user?.tipo !== 'barbeiro') {
      window.location.href = '/perfil'
      return
    }

    const carregar = async () => {
      try {
        setLoading(true)
        setErro('')
        setSemBarbearia(false)

        const respostaBarbearias = await ApiService.listBarbearias()
        const lista = Array.isArray(respostaBarbearias?.barbearias) ? respostaBarbearias.barbearias : []
        const minha = lista.find((item: any) => String(item?.usuario_id) === String(user?.id))

        if (!minha?.id) {
          setSemBarbearia(true)
          setSubscription({ status: 'inactive', plan_key: 'free' })
          return
        }

        const id = String(minha.id)
        setBarbeariaId(id)

        const atual = await ApiService.getCurrentSubscription({ userId: user?.id, barbeariaId: id })
        setSubscription(atual?.subscription || {
          status: atual?.status,
          plan_key: atual?.plan_key,
        })
      } catch (error: any) {
        setErro(error?.message || 'Não foi possível carregar os planos agora.')
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [authLoading, isAuthenticated, user?.id, user?.tipo])

  const iniciarCheckout = async (planKey: string) => {
    try {
      setAcaoLoading(planKey)
      setErro('')

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
      setErro(error?.message || 'Não foi possível iniciar checkout de assinatura.')
    } finally {
      setAcaoLoading('')
    }
  }

  const abrirPortal = async () => {
    try {
      setAcaoLoading('portal')
      setErro('')
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
      await ApiService.cancelCurrentSubscription({
        userId: user?.id,
        barbeariaId,
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

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Carregando planos...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Assinatura da Barbearia</h1>
          <Link href="/barbearia" className="text-sm text-zinc-300 hover:text-white">Voltar</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-lg font-semibold mb-3">Resumo da assinatura</h2>
          <p className="text-sm text-zinc-300">Status atual: <span className="font-semibold text-white">{statusLabel[statusAtual] || statusAtual}</span></p>
          <p className="text-sm text-zinc-400">Plano atual: {subscription?.plan_key || 'free'}</p>
          <p className="text-sm text-zinc-400">Fim do ciclo: {formatarDataBr(subscription?.current_period_end)}</p>
          <p className="text-xs text-zinc-400 mt-2">Todos os planos possuem as mesmas funcionalidades premium. A diferença é apenas a quantidade de funcionários.</p>
          <p className="text-sm text-emerald-300 mt-2">7 dias grátis em qualquer plano.</p>
          <p className="text-xs text-zinc-500 mt-1">Após falha de pagamento, o sistema entra em carência de 7 dias antes de bloquear funcionalidades premium.</p>

          {canManageBilling && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={abrirPortal}
                disabled={acaoLoading === 'portal'}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-sm disabled:opacity-50"
              >
                {acaoLoading === 'portal' ? 'Abrindo portal...' : 'Gerenciar no Stripe'}
              </button>
              <button
                onClick={cancelarAssinatura}
                disabled={acaoLoading === 'cancel'}
                className="px-4 py-2 rounded-lg border border-red-500/40 text-red-300 text-sm disabled:opacity-50"
              >
                {acaoLoading === 'cancel' ? 'Cancelando...' : 'Cancelar no fim do ciclo'}
              </button>
            </div>
          )}
        </div>

        {semBarbearia && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-100 font-medium">Cadastre sua barbearia antes de assinar um plano.</p>
            <p className="text-xs text-amber-200/80 mt-1">Depois do cadastro, você poderá escolher o plano e iniciar o período grátis.</p>
            <Link href="/barberia/configurar" className="inline-block mt-3 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors">
              Cadastrar barbearia
            </Link>
          </div>
        )}

        {erro && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{erro}</div>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANOS.map((plano) => (
            <article key={plano.key} className={`rounded-xl border p-4 flex flex-col ${subscription?.plan_key === plano.key ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
              <h2 className="text-lg font-semibold">{plano.title}</h2>
              <p className="text-zinc-300 mt-2">{plano.price}</p>
              <p className="text-emerald-300 text-sm">{plano.firstMonth}</p>
              <p className="text-xs text-zinc-400 mt-2 flex-1">{plano.description}</p>
              <button
                onClick={() => iniciarCheckout(plano.key)}
                disabled={Boolean(acaoLoading) || semBarbearia}
                className="mt-4 px-3 py-2 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-60"
              >
                {semBarbearia ? 'Cadastre sua barbearia' : acaoLoading === plano.key ? 'Redirecionando...' : 'Assinar este plano'}
              </button>
            </article>
          ))}
        </div>

      </section>
    </main>
  )
}
