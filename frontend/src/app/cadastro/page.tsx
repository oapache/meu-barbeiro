'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import ProfessionalAccessShell from '@/components/auth/ProfessionalAccessShell'
import { useAuth, getRedirectByUserType } from '@/context/AuthContext'

function CadastroPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const redirect = searchParams.get('redirect') || ''
  const tipoInicial =
    searchParams.get('tipo') === 'barbeiro' || redirect.startsWith('/barbearia') ? 'barbeiro' : 'cliente'

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [tipo, setTipo] = useState<'cliente' | 'barbeiro'>(tipoInicial)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isProfessionalAccess = tipo === 'barbeiro'

  const loginHref = useMemo(() => {
    const params = new URLSearchParams()
    if (redirect) params.set('redirect', redirect)
    const query = params.toString()
    return query ? `/login?${query}` : '/login'
  }, [redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!termsAccepted || !privacyAccepted) {
      setError('Para criar sua conta, aceite os Termos de Uso e a Política de Privacidade.')
      return
    }

    setLoading(true)

    try {
      const result = await register({ nome, email, telefone, senha, tipo, termsAccepted, privacyAccepted })
      const fallbackRoute = getRedirectByUserType(result.usuario)
      const requestedProfessionalRoute = redirect.startsWith('/barbearia')
      const canAccessRequestedRoute = !requestedProfessionalRoute || result.usuario?.tipo === 'barbeiro'

      router.push(canAccessRequestedRoute && redirect ? redirect : fallbackRoute)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const heroCards =
    tipo === 'barbeiro'
      ? [
          {
            label: 'Agenda',
            description: 'Organize horários, encaixes e a rotina do salão com mais controle.',
          },
          {
            label: 'Clientes',
            description: 'Acompanhe recorrência, contatos e preferências em poucos cliques.',
          },
          {
            label: 'Financeiro',
            description: 'Visualize metas, ticket médio e movimentação do dia sem planilhas.',
          },
        ]
      : [
          {
            label: 'Agenda',
            description: 'Marque horários, acompanhe confirmações e não perca seus atendimentos.',
          },
          {
            label: 'Favoritos',
            description: 'Guarde barbearias, profissionais e serviços para voltar rápido depois.',
          },
          {
            label: 'Histórico',
            description: 'Centralize experiências anteriores e mantenha sua rotina mais prática.',
          },
        ]

  return (
    <ProfessionalAccessShell
      audienceLabel={isProfessionalAccess ? 'Área da barbearia' : 'Cadastro na plataforma'}
      currentLabel="Criar conta"
      navLinks={[{ href: '/buscar', label: 'Buscar' }]}
      heroEyebrow={tipo === 'barbeiro' ? 'Novo acesso profissional' : 'Nova conta na plataforma'}
      heroTitle={
        tipo === 'barbeiro'
          ? 'Crie seu acesso e comece a operar sua barbearia em um só painel'
          : 'Crie sua conta e acompanhe seus horários com mais praticidade'
      }
      heroDescription={
        tipo === 'barbeiro'
          ? 'Monte sua presença profissional, organize atendimento, acompanhe clientes e deixe o painel pronto para o dia a dia da barbearia.'
          : 'Cadastre-se para descobrir novas barbearias, salvar preferências e controlar sua rotina de agendamentos sem complicação.'
      }
      heroCards={heroCards}
      panelEyebrow={tipo === 'barbeiro' ? 'Criar conta profissional' : 'Criar nova conta'}
      panelTitle={tipo === 'barbeiro' ? 'Comece seu acesso como barbeiro' : 'Abra sua conta em poucos passos'}
      panelDescription={
        tipo === 'barbeiro'
          ? 'Preencha seus dados, crie seu acesso profissional e siga direto para a área da barbearia.'
          : 'Crie sua conta para entrar, salvar seus dados e continuar a experiência sem refazer etapas.'
      }
      panelContent={
        <div className="space-y-5">
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/10 bg-black/35 p-2">
            <button
              type="button"
              onClick={() => setTipo('cliente')}
              className={`rounded-[18px] px-4 py-3 text-sm font-medium transition-all ${
                tipo === 'cliente' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => setTipo('barbeiro')}
              className={`rounded-[18px] px-4 py-3 text-sm font-medium transition-all ${
                tipo === 'barbeiro' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Barbeiro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white/25 focus:ring-2 focus:ring-white/10"
                placeholder="João Silva"
                required
              />
            </div>

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
              <label className="mb-2 block text-sm font-medium text-zinc-300">WhatsApp</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white/25 focus:ring-2 focus:ring-white/10"
                placeholder="5511999999999"
                maxLength={13}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 pr-12 text-base text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white/25 focus:ring-2 focus:ring-white/10"
                  placeholder="••••••••"
                  minLength={6}
                  required
                  autoComplete="new-password"
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

            <div className="space-y-3 rounded-[22px] border border-white/10 bg-black/35 p-4 text-sm leading-6 text-zinc-300">
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black text-emerald-400 accent-emerald-400"
                  required
                />
                <span>
                  Li e aceito os{' '}
                  <Link href="/termos-de-uso" className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                    Termos de Uso
                  </Link>
                  .
                </span>
              </label>

              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black text-emerald-400 accent-emerald-400"
                  required
                />
                <span>
                  Li e estou ciente da{' '}
                  <Link href="/politica-de-privacidade" className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                    Política de Privacidade
                  </Link>{' '}
                  e do tratamento dos meus dados.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !termsAccepted || !privacyAccepted}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-base font-semibold text-black transition-all duration-200 hover:bg-zinc-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Criando acesso...'
                : tipo === 'barbeiro'
                  ? 'Criar conta e abrir a área da barbearia'
                  : 'Criar conta e continuar'}
            </button>
          </form>
        </div>
      }
      panelFooter={
        <div className="space-y-4">
          <Link
            href={loginHref}
            className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/40 px-5 py-4 text-white transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-500/8"
          >
            <div>
              <p className="text-lg font-semibold text-white">Já possuo conta</p>
              <p className="mt-1 text-sm text-zinc-400">
                {tipo === 'barbeiro'
                  ? 'Entrar e abrir meu painel da barbearia.'
                  : 'Entrar e continuar com meu perfil atual.'}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-emerald-300" />
          </Link>

          <p className="text-sm leading-7 text-zinc-500">
            {tipo === 'barbeiro'
              ? 'Se você quer agendar como cliente, pode continuar criando uma conta de cliente e usar o perfil padrão.'
              : 'Se depois você quiser gerenciar uma barbearia, basta criar um acesso profissional e seguir para o painel.'}
          </p>
        </div>
      }
    />
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroPageContent />
    </Suspense>
  )
}
