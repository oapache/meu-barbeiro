'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Calendar, Camera, Clock, LogOut, Save, Sparkles, User, XCircle } from 'lucide-react'
import ApiService from '@/services/api'
import AccessibilityShortcuts from '@/components/AccessibilityShortcuts'

type AgendaStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | 'em_atendimento' | 'faltou'
type PerfilTab = 'agenda' | 'historico' | 'perfil'

type AgendaItem = {
  id: string | number
  barbearia_nome?: string
  barbearia?: string
  servico_nome?: string
  servico?: string
  data: string
  hora: string
  status: AgendaStatus
  observacoes?: string | null
}

type PreferenciasCliente = {
  servicosFavoritos: string[]
  diasPreferidos: string[]
  periodoPreferido: 'flexivel' | 'manha' | 'tarde' | 'noite'
  observacoes: string
}

type AuthUser = {
  id?: string
  nome?: string
  email?: string
  telefone?: string
  tipo?: string
  avatar_url?: string | null
  preferencias?: Partial<PreferenciasCliente> | null
}

type AuthState = {
  user?: AuthUser
  logout: () => void
  updateUser: (user: AuthUser) => AuthUser | null
  isAuthenticated: boolean
  loading: boolean
}

const SERVICOS_PREFERIDOS = ['Corte', 'Barba', 'Corte + Barba', 'Pigmentacao', 'Sobrancelha', 'Acabamento']
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const PREFERENCIAS_PADRAO: PreferenciasCliente = { servicosFavoritos: [], diasPreferidos: [], periodoPreferido: 'flexivel', observacoes: '' }

const hojeISO = () => {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

const formatarDataBr = (dataISO: string) => {
  const [ano, mes, dia] = String(dataISO || '').slice(0, 10).split('-')
  if (!ano || !mes || !dia) return dataISO
  return `${dia}/${mes}/${ano}`
}

const formatarDataCurta = (dataISO: string) => {
  const [ano, mes, dia] = String(dataISO || '').slice(0, 10).split('-')
  if (!ano || !mes || !dia) return dataISO
  return `${dia}/${mes}`
}

const formatarHoraBr = (hora: string) => String(hora || '').slice(0, 5)
const normalizarTelefone = (telefone: string) => String(telefone || '').replace(/\D/g, '')

const isPersistableMediaUrl = (value: string) => {
  const url = String(value || '').trim()
  if (!url) return false

  return (
    url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('/uploads/')
    || url.startsWith('/api/uploads/')
  )
}

const normalizarMediaUrl = (value: string) => {
  const url = String(value || '').trim()
  if (!url) return ''
  return isPersistableMediaUrl(url) ? url : ''
}

const formatarTelefone = (telefone: string) => {
  const numero = normalizarTelefone(telefone)
  if (numero.length === 11) return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`
  if (numero.length === 10) return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`
  return telefone || 'Sem telefone'
}

const normalizarStatus = (status: string): AgendaStatus => {
  if (status === 'confirmado' || status === 'agendado') return 'confirmado'
  if (status === 'cancelado') return 'cancelado'
  if (status === 'concluido') return 'concluido'
  if (status === 'em_atendimento') return 'em_atendimento'
  if (status === 'faltou') return 'faltou'
  return 'pendente'
}

const statusMeta = (status: AgendaStatus) => {
  switch (status) {
    case 'confirmado':
      return { label: 'Confirmado', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' }
    case 'pendente':
      return { label: 'Pendente', className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200' }
    case 'em_atendimento':
      return { label: 'Em atendimento', className: 'border-sky-500/30 bg-sky-500/10 text-sky-200' }
    case 'concluido':
      return { label: 'Concluido', className: 'border-white/10 bg-white/10 text-white' }
    case 'faltou':
      return { label: 'Faltou', className: 'border-orange-500/30 bg-orange-500/10 text-orange-200' }
    default:
      return { label: 'Cancelado', className: 'border-red-500/30 bg-red-500/10 text-red-200' }
  }
}

const normalizarPreferencias = (preferencias: Partial<PreferenciasCliente> | null | undefined): PreferenciasCliente => ({
  servicosFavoritos: Array.isArray(preferencias?.servicosFavoritos) ? preferencias.servicosFavoritos.map(String) : [],
  diasPreferidos: Array.isArray(preferencias?.diasPreferidos) ? preferencias.diasPreferidos.map(String) : [],
  periodoPreferido: ['flexivel', 'manha', 'tarde', 'noite'].includes(String(preferencias?.periodoPreferido || ''))
    ? (String(preferencias?.periodoPreferido) as PreferenciasCliente['periodoPreferido'])
    : 'flexivel',
  observacoes: String(preferencias?.observacoes || ''),
})

const iniciaisNome = (nome: string) => {
  const partes = String(nome || '').trim().split(' ').filter(Boolean)
  if (partes.length === 0) return 'SB'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase()
}

export default function PerfilPage() {
  const { user, logout, updateUser, isAuthenticated, loading: authLoading } = useAuth() as unknown as AuthState
  const [activeTab, setActiveTab] = useState<PerfilTab>('agenda')
  const [agendamentos, setAgendamentos] = useState<AgendaItem[]>([])
  const [agendaLoading, setAgendaLoading] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [erroAgenda, setErroAgenda] = useState('')
  const [erroPerfil, setErroPerfil] = useState('')
  const [sucessoPerfil, setSucessoPerfil] = useState('')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [arquivoAvatar, setArquivoAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [preferencias, setPreferencias] = useState<PreferenciasCliente>(PREFERENCIAS_PADRAO)
  const inputAvatarRef = useRef<HTMLInputElement | null>(null)
  const hoje = useMemo(() => hojeISO(), [])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login?redirect=%2Fperfil'
      return
    }

    if (!authLoading && user?.tipo === 'barbeiro') {
      window.location.href = '/barbearia'
    }
  }, [authLoading, isAuthenticated, user?.tipo])

  useEffect(() => {
    setNome(String(user?.nome || ''))
    setTelefone(String(user?.telefone || ''))
    setPreferencias(normalizarPreferencias(user?.preferencias))
    setAvatarPreview(normalizarMediaUrl(String(user?.avatar_url || '')))
    setArquivoAvatar(null)
  }, [user?.nome, user?.telefone, user?.preferencias, user?.avatar_url])

  useEffect(() => {
    const loadAgendamentos = async () => {
      if (!user?.id) {
        setAgendamentos([])
        setAgendaLoading(false)
        return
      }

      setAgendaLoading(true)
      try {
        const apiResult = await ApiService.listAgendamentos({ cliente_id: user.id })
        const apiList = Array.isArray(apiResult?.agendamentos) ? apiResult.agendamentos : []
        setAgendamentos(apiList.map((item: any) => ({
          ...item,
          data: String(item?.data || '').slice(0, 10),
          hora: String(item?.hora || ''),
          status: normalizarStatus(String(item?.status || 'pendente')),
        })))
      } catch {
        setAgendamentos([])
      } finally {
        setAgendaLoading(false)
      }
    }

    if (!authLoading && isAuthenticated) {
      loadAgendamentos()
    }
  }, [authLoading, isAuthenticated, user?.id])

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const proximosAgendamentos = useMemo(
    () => agendamentos.filter((item) => ['pendente', 'confirmado', 'em_atendimento'].includes(item.status)).sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`)),
    [agendamentos]
  )

  const historicoAgendamentos = useMemo(
    () => agendamentos.filter((item) => ['concluido', 'cancelado', 'faltou'].includes(item.status) || item.data < hoje).sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`)),
    [agendamentos, hoje]
  )

  const proximoAgendamento = proximosAgendamentos[0] || null
  const nomePareceEmail = nome.includes('@')
  const barbeariasVisitadas = useMemo(() => new Set(agendamentos.map((item) => String(item.barbearia_nome || item.barbearia || '')).filter(Boolean)).size, [agendamentos])
  const servicoMaisUsado = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const item of historicoAgendamentos) {
      const servico = String(item.servico_nome || item.servico || item.observacoes || '').trim()
      if (!servico) continue
      mapa.set(servico, (mapa.get(servico) || 0) + 1)
    }
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Ainda sem historico'
  }, [historicoAgendamentos])

  const togglePreferenciaLista = (campo: 'servicosFavoritos' | 'diasPreferidos', valor: string) => {
    setPreferencias((prev) => {
      const lista = prev[campo]
      return {
        ...prev,
        [campo]: lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor],
      }
    })
  }

  const persistirPerfil = async (options?: { avatarUrlOverride?: string; successMessage?: string }) => {
    if (!user?.id) return
    const nomeFinal = String(nome || user?.nome || '').trim()

    if (!nomeFinal) {
      setErroPerfil('Informe seu nome para atualizar o perfil.')
      return null
    }

    setSalvandoPerfil(true)
    setErroPerfil('')
    if (options?.successMessage !== null) {
      setSucessoPerfil('')
    }

    try {
      let avatarUrl = normalizarMediaUrl(options?.avatarUrlOverride ?? String(user?.avatar_url || ''))
      if (!options?.avatarUrlOverride && arquivoAvatar) {
        const upload = await ApiService.uploadImagem(arquivoAvatar)
        avatarUrl = normalizarMediaUrl(String(upload?.url || '').trim())
      }

      const response = await ApiService.updateUsuario(user.id, {
        nome: nomeFinal,
        telefone: normalizarTelefone(telefone),
        avatar_url: avatarUrl || null,
        preferencias,
      })

      if (response?.usuario) {
        updateUser(response.usuario)
        setArquivoAvatar(null)
        setAvatarPreview(normalizarMediaUrl(String(response.usuario.avatar_url || '')))
        setSucessoPerfil(options?.successMessage || 'Perfil atualizado com sucesso.')
        return response.usuario
      }
    } catch (error: any) {
      setErroPerfil(error?.message || 'Nao foi possivel salvar o perfil agora.')
    } finally {
      setSalvandoPerfil(false)
    }

    return null
  }

  const handleAvatarChange = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    const avatarAnterior = normalizarMediaUrl(String(user?.avatar_url || ''))
    const previewLocal = URL.createObjectURL(file)

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setArquivoAvatar(file)
    setAvatarPreview(previewLocal)
    setErroPerfil('')
    setSucessoPerfil('')

    try {
      const upload = await ApiService.uploadImagem(file)
      const avatarUrl = normalizarMediaUrl(String(upload?.url || ''))

      if (!avatarUrl) {
        throw new Error('Nao foi possivel obter a URL da foto enviada.')
      }

      const usuarioAtualizado = await persistirPerfil({
        avatarUrlOverride: avatarUrl,
        successMessage: 'Foto salva com sucesso.',
      })

      if (!usuarioAtualizado) {
        throw new Error('Nao foi possivel salvar a foto agora.')
      }

      URL.revokeObjectURL(previewLocal)
    } catch (error: any) {
      setArquivoAvatar(null)
      setAvatarPreview(avatarAnterior)
      URL.revokeObjectURL(previewLocal)
      setErroPerfil(error?.message || 'Nao foi possivel salvar a foto agora.')
    } finally {
      if (event?.target) {
        event.target.value = ''
      }
    }
  }

  const handleSalvarPerfil = async () => {
    await persistirPerfil()
  }

  const handleCancelarAgendamento = async (agenda: AgendaItem) => {
    if (!confirm('Deseja realmente desmarcar este agendamento?')) return

    const idStr = String(agenda.id)
    setCancelandoId(idStr)
    setErroAgenda('')

    try {
      await ApiService.cancelAgendamento(agenda.id)
      setAgendamentos((prev) => prev.map((item) => (String(item.id) === idStr ? { ...item, status: 'cancelado' } : item)))
    } catch {
      setErroAgenda('Nao foi possivel desmarcar o agendamento agora.')
    } finally {
      setCancelandoId(null)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  if (authLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="O Corte Certo" className="w-9 h-9 rounded-full object-cover border border-white/20" />
            <div className="min-w-0">
              <p className="text-base font-bold truncate">O Corte Certo</p>
              <p className="text-xs text-zinc-500 truncate">Perfil do cliente</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-zinc-300 hover:text-white transition">Inicio</Link>
            <Link href="/buscar" className="text-zinc-300 hover:text-white transition">Buscar</Link>
            <Link href="/perfil" className="text-white font-medium">Perfil</Link>
          </nav>

          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-zinc-300 hover:text-white text-sm transition">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <section className="pt-24 px-4 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_36%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))] p-5 sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                  {avatarPreview ? <img src={avatarPreview} alt={nome || 'Cliente'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-2xl font-semibold">{iniciaisNome(nome || user?.nome || 'Cliente')}</div>}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Minha conta</p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold leading-tight">{nome || 'Cliente O Corte Certo'}</h1>
                  <p className="mt-2 break-all text-sm text-zinc-300">{user?.email || 'email@exemplo.com'}</p>
                  <p className="mt-1 text-sm text-zinc-400">{telefone ? formatarTelefone(telefone) : 'Adicione seu WhatsApp para confirmar horarios com facilidade.'}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 xl:w-[420px] xl:flex-shrink-0">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Proximo horario</p>
                  <p className="mt-2 text-base font-semibold text-white">{proximoAgendamento ? `${formatarDataCurta(proximoAgendamento.data)} as ${formatarHoraBr(proximoAgendamento.hora)}` : 'Sem reserva'}</p>
                  <p className="mt-1 text-sm text-zinc-400">{proximoAgendamento?.barbearia_nome || proximoAgendamento?.barbearia || 'Quando voce reservar, aparece aqui.'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Historico</p>
                  <p className="mt-2 text-base font-semibold text-white">{historicoAgendamentos.length} atendimento(s)</p>
                  <p className="mt-1 text-sm text-zinc-400">Servico mais usado: {servicoMaisUsado}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Barbearias</p>
                  <p className="mt-2 text-base font-semibold text-white">{barbeariasVisitadas}</p>
                  <p className="mt-1 text-sm text-zinc-400">Locais onde voce ja marcou horario.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(280px,_320px)_minmax(0,_1fr)]">
            <aside className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-400">Preferencias salvas</p>
                    <p className="mt-1 text-lg font-semibold text-white">Seu perfil esta deixando de ser simples</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Servicos preferidos</p>
                    <p className="mt-2 text-sm text-zinc-300">{preferencias.servicosFavoritos.length > 0 ? preferencias.servicosFavoritos.join(', ') : 'Defina o que voce mais gosta para personalizar sua conta.'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Dias e periodo</p>
                    <p className="mt-2 text-sm text-zinc-300">{preferencias.diasPreferidos.length > 0 ? preferencias.diasPreferidos.join(', ') : 'Dias ainda nao definidos'}</p>
                    <p className="mt-1 text-sm text-zinc-400">Periodo: {preferencias.periodoPreferido === 'flexivel' ? 'Flexivel' : preferencias.periodoPreferido === 'manha' ? 'Manha' : preferencias.periodoPreferido === 'tarde' ? 'Tarde' : 'Noite'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Observacoes</p>
                    <p className="mt-2 text-sm text-zinc-300">{preferencias.observacoes || 'Anote estilo preferido, sensibilidade da pele, maquina favorita ou o tipo de atendimento que voce busca.'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/85 p-5">
                <p className="text-sm text-zinc-400">O que melhora com isso</p>
                <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                  <li>Seu nome correto passa a aparecer nos agendamentos vinculados a sua conta.</li>
                  <li>Voce ganha foto de perfil e identidade visual no app.</li>
                  <li>Suas preferencias ficam salvas para proximos atendimentos.</li>
                </ul>
              </div>
            </aside>

            <div className="min-w-0 rounded-3xl border border-zinc-800 bg-zinc-950/85 overflow-hidden">
              <div className="border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {([
                    ['agenda', 'Proximos horarios'],
                    ['historico', 'Historico'],
                    ['perfil', 'Minha conta'],
                  ] as Array<[PerfilTab, string]>).map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${activeTab === tab ? 'bg-white text-black' : 'bg-black/30 text-zinc-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {erroAgenda && <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{erroAgenda}</div>}
                {erroPerfil && activeTab === 'perfil' && <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{erroPerfil}</div>}
                {sucessoPerfil && activeTab === 'perfil' && <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{sucessoPerfil}</div>}

                {activeTab === 'agenda' && (
                  <div className="space-y-3">
                    {agendaLoading && <div className="text-sm text-zinc-400">Carregando agendamentos...</div>}
                    {!agendaLoading && proximosAgendamentos.length === 0 && <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-400">Nenhum agendamento proximo. Aproveite para deixar seu perfil completo e buscar novos horarios.</div>}
                    {proximosAgendamentos.map((agenda) => {
                      const status = statusMeta(agenda.status)
                      return (
                        <div key={agenda.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-white">{agenda.barbearia_nome || agenda.barbearia || 'Barbearia'}</p>
                              <p className="mt-1 text-sm text-zinc-400">{agenda.servico_nome || agenda.servico || agenda.observacoes || 'Servico agendado'}</p>
                              <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-400">
                                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatarDataBr(agenda.data)}</span>
                                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatarHoraBr(agenda.hora)}</span>
                              </div>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${status.className}`}>{status.label}</span>
                          </div>
                          <div className="mt-4 border-t border-white/10 pt-4">
                            <button onClick={() => handleCancelarAgendamento(agenda)} disabled={cancelandoId === String(agenda.id) || agenda.status === 'cancelado'} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-60">
                              <XCircle className="h-3.5 w-3.5" />
                              {cancelandoId === String(agenda.id) ? 'Desmarcando...' : 'Desmarcar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTab === 'historico' && (
                  <div className="space-y-3">
                    {!agendaLoading && historicoAgendamentos.length === 0 && <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-400">Ainda nao ha historico concluido ou cancelado.</div>}
                    {historicoAgendamentos.map((item) => {
                      const status = statusMeta(item.status)
                      return (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-white">{item.servico_nome || item.servico || item.observacoes || 'Servico'}</p>
                            <p className="mt-1 text-sm text-zinc-400">{item.barbearia_nome || item.barbearia || 'Barbearia'} • {formatarDataBr(item.data)} • {formatarHoraBr(item.hora)}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${status.className}`}>{status.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {activeTab === 'perfil' && (
                  <div className="space-y-6">
                    <div className="grid gap-6 2xl:grid-cols-[minmax(280px,_340px)_minmax(0,_1fr)]">
                      <div className="min-w-0 rounded-3xl border border-white/10 bg-black/30 p-5">
                        <p className="text-sm font-medium text-zinc-300">Foto e dados principais</p>
                        <div className="mt-5 flex flex-col items-center gap-4 text-center">
                          <div className="h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                            {avatarPreview ? <img src={avatarPreview} alt={nome || 'Cliente'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl font-semibold text-white">{iniciaisNome(nome || user?.nome || 'Cliente')}</div>}
                          </div>
                          <input ref={inputAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                          <button type="button" onClick={() => inputAvatarRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
                            <Camera className="h-4 w-4" />
                            {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
                          </button>
                        </div>

                        <div className="mt-5 space-y-4">
                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">Nome completo</label>
                            <input value={nome} onChange={(e) => { setNome(e.target.value); setSucessoPerfil('') }} className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20" placeholder="Como voce quer aparecer no app" />
                            {nomePareceEmail && <p className="mt-2 text-xs text-yellow-200">Seu nome atual parece ser um e-mail. Atualize aqui para ele aparecer corretamente nos agendamentos.</p>}
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">WhatsApp</label>
                            <input value={telefone} onChange={(e) => { setTelefone(e.target.value.replace(/\D/g, '')); setSucessoPerfil('') }} className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20" placeholder="5511999999999" maxLength={13} />
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                            <p className="text-sm font-medium text-white">E-mail da conta</p>
                            <p className="mt-1 break-all text-sm text-zinc-400">{user?.email || 'Sem e-mail'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 rounded-3xl border border-white/10 bg-black/30 p-5">
                        <p className="text-sm font-medium text-zinc-300">Preferencias para proximos atendimentos</p>
                        <p className="mt-2 text-sm text-zinc-500">Agora o cliente pode salvar foto, nome e preferencias reais no perfil.</p>
                        <div className="mt-5 space-y-5">
                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">Servicos que voce mais procura</label>
                            <div className="flex flex-wrap gap-2">
                              {SERVICOS_PREFERIDOS.map((servico) => {
                                const ativo = preferencias.servicosFavoritos.includes(servico)
                                return <button key={servico} type="button" onClick={() => togglePreferenciaLista('servicosFavoritos', servico)} className={`rounded-full border px-3 py-2 text-sm transition ${ativo ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-black/30 text-zinc-300 hover:bg-zinc-900'}`}>{servico}</button>
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">Dias preferidos</label>
                            <div className="flex flex-wrap gap-2">
                              {DIAS_SEMANA.map((dia) => {
                                const ativo = preferencias.diasPreferidos.includes(dia)
                                return <button key={dia} type="button" onClick={() => togglePreferenciaLista('diasPreferidos', dia)} className={`rounded-full border px-3 py-2 text-sm transition ${ativo ? 'border-white bg-white text-black' : 'border-white/10 bg-black/30 text-zinc-300 hover:bg-zinc-900'}`}>{dia}</button>
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">Periodo preferido</label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {([
                                ['flexivel', 'Flexivel'],
                                ['manha', 'Manha'],
                                ['tarde', 'Tarde'],
                                ['noite', 'Noite'],
                              ] as Array<[PreferenciasCliente['periodoPreferido'], string]>).map(([valor, label]) => (
                                <button key={valor} type="button" onClick={() => setPreferencias((prev) => ({ ...prev, periodoPreferido: valor }))} className={`rounded-2xl border px-3 py-3 text-sm transition ${preferencias.periodoPreferido === valor ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-black/30 text-zinc-300 hover:bg-zinc-900'}`}>{label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm text-zinc-400">Observacoes pessoais</label>
                            <textarea value={preferencias.observacoes} onChange={(e) => setPreferencias((prev) => ({ ...prev, observacoes: e.target.value }))} rows={5} className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20" placeholder="Ex.: prefiro tesoura no topo, pele sensivel na barba, gosto de atendimento no fim da tarde." />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/30 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">Salve seu perfil para refletir no sistema</p>
                        <p className="mt-1 text-sm text-zinc-400">Depois de salvar, o nome atualizado passa a ser a referencia dos seus agendamentos.</p>
                      </div>
                      <button type="button" onClick={handleSalvarPerfil} disabled={salvandoPerfil} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto lg:flex-shrink-0">
                        <Save className="h-4 w-4" />
                        {salvandoPerfil ? 'Salvando...' : 'Salvar perfil'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2 md:hidden">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link href="/" className="flex flex-col items-center gap-1 p-2 text-zinc-400"><span className="text-xs">Inicio</span></Link>
          <Link href="/buscar" className="flex flex-col items-center gap-1 p-2 text-zinc-400"><span className="text-xs">Buscar</span></Link>
          <Link href="/perfil" className="flex flex-col items-center gap-1 p-2 text-white"><User className="w-5 h-5" /><span className="text-xs">Perfil</span></Link>
        </div>
      </nav>

      <AccessibilityShortcuts mobileOffsetClass="bottom-24" />
    </main>
  )
}
