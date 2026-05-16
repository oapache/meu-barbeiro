'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import ProfessionalAccessShell from '@/components/auth/ProfessionalAccessShell'
import { useAuth, getRedirectByUserType } from '@/context/AuthContext'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const redirect = searchParams.get('redirect') || ''
  const isProfessionalAccess = redirect.startsWith('/barbearia')

  const cadastroHref = useMemo(() => {
    const params = new URLSearchParams()

    if (redirect) params.set('redirect', redirect)
    if (isProfessionalAccess) params.set('tipo', 'barbeiro')

    const query = params.toString()
    return query ? `/cadastro?${query}` : '/cadastro'
  }, [redirect, isProfessionalAccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(email, password)
      const fallbackRoute = getRedirectByUserType(result.usuario)
      const requestedProfessionalRoute = redirect.startsWith('/barbearia')
      const canAccessRequestedRoute = !requestedProfessionalRoute || result.usuario?.tipo === 'barbeiro'

      router.push(canAccessRequestedRoute && redirect ? redirect : fallbackRoute)
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const heroCards = isProfessionalAccess
    ? [
        {
          label: 'Agenda',
          description: 'Visualize horários, pendências e próximos atendimentos.',
        },
        {
          label: 'Clientes',
          description: 'Acompanhe recorrência, contatos e histórico.',
        },
        {
          label: 'Extrato',
          description: 'Consulte faturamento, ticket médio e previsões.',
        },
      ]
    : [
        {
          label: 'Busca',
          description: 'Encontre as melhores barbearias e compare opções perto de você.',
        },
        {
          label: 'Agenda',
          description: 'Acompanhe os próximos horários e o histórico dos seus atendimentos.',
        },
        {
          label: 'Perfil',
          description: 'Centralize dados da conta, favoritos e benefícios em um só lugar.',
        },
      ]

  return (
    <ProfessionalAccessShell
      audienceLabel={isProfessionalAccess ? 'Área da barbearia' : 'Acesso à plataforma'}
      currentLabel="Entrar"
      navLinks={[{ href: '/buscar', label: 'Buscar' }]}
      heroEyebrow={isProfessionalAccess ? 'Painel profissional' : 'Acesso à plataforma'}
      heroTitle={
        isProfessionalAccess
          ? 'Sua agenda, clientes e caixa em um só lugar'
          : 'Entre para gerenciar seus horários e descobertas em um só lugar'
      }
      heroDescription={
        isProfessionalAccess
          ? 'Acesse o painel da sua barbearia para organizar horários, acompanhar clientes e visualizar o desempenho do dia.'
          : 'Entre na sua conta para continuar agendando, salvar barbearias favoritas e acompanhar tudo sem perder contexto.'
      }
      heroCards={heroCards}
      panelEyebrow={isProfessionalAccess ? 'Entrar como barbeiro' : 'Entrar na conta'}
      panelTitle={isProfessionalAccess ? 'Abra seu painel profissional' : 'Volte para a sua conta'}
      panelDescription={
        isProfessionalAccess
          ? 'Use seu acesso profissional para voltar ao painel da barbearia e continuar exatamente de onde parou.'
          : 'Se você já tem acesso, entre agora e continue sua experiência sem refazer etapas.'
      }
      panelContent={
        <div className="space-y-5">
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white/25 focus:ring-2 focus:ring-white/10"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 pr-12 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white/25 focus:ring-2 focus:ring-white/10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-base font-semibold text-black transition-all duration-200 hover:bg-zinc-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Entrando...'
                : isProfessionalAccess
                  ? 'Entrar e abrir meu painel'
                  : 'Entrar e continuar'}
            </button>
          </form>
        </div>
      }
      panelFooter={
        <div className="space-y-4">
          <Link
            href={cadastroHref}
            className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/40 px-5 py-4 text-white transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-500/8"
          >
            <div>
              <p className="text-lg font-semibold text-white">Criar uma conta</p>
              <p className="mt-1 text-sm text-zinc-400">
                {isProfessionalAccess
                  ? 'Começar meu acesso profissional como barbeiro.'
                  : 'Criar um novo acesso e continuar depois.'}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-emerald-300" />
          </Link>

          <p className="text-sm leading-7 text-zinc-500">
            {isProfessionalAccess
              ? 'Se você quer marcar um horário como cliente, o caminho ideal continua sendo pelo perfil do cliente.'
              : 'Se você está entrando para gerenciar uma barbearia, crie uma conta profissional e siga para o painel.'}
          </p>
        </div>
      }
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
