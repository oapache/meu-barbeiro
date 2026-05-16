'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { SERVICE_BY_TYPE, SERVICE_OPTIONS, getServiceImageByName, getServiceImageValueForSave, getServiceNameForTypeChange, type TipoServicoCatalog } from '@/lib/serviceCatalog'
import ApiService from '@/services/api'
import { Save, Upload, Phone, MapPin, Clock, BadgeCheck, Lock, Wallet } from 'lucide-react'

type UsuarioLogado = {
  id?: string | number
}

type FormBarbearia = {
  nome: string
  telefone: string
  whatsapp: string
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  horario_abertura: string
  horario_fechamento: string
  logo_url: string
}

type HorarioDia = {
  key: string
  label: string
  fechado: boolean
  abertura: string
  fechamento: string
}

type Profissional = {
  id: string
  nome: string
  cargo: string
  experiencia: string
}

type Avaliacao = {
  id: string
  autor: string
  nota: number
  comentario: string
  data: string
}

type ServicoItem = {
  id: string
  nome: string
  preco: number
  duracao_minutos: number
  imagem: string | null
  ativo?: boolean
  pausado_por_assinatura?: boolean
}

type SubscriptionResumo = {
  status?: string
  plan_key?: string
}

const PREMIUM_UNLOCKED_STATUSES = ['active', 'trialing', 'past_due']
const PLAN_MAX_PROFISSIONAIS: Record<string, number> = {
  free: 0,
  professionals_1: 1,
  professionals_2_5: 5,
  professionals_6_15: 15,
  professionals_15_plus: 999,
}

const AMENIDADES_PADRAO = [
  'Wi-Fi',
  'Ar-condicionado',
  'Acessibilidade',
  'Pagamento por cartao',
  'Cafe',
  'Estacionamento',
]

const DIAS_SEMANA: Array<{ key: string; label: string }> = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terca-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sabado' },
  { key: 'domingo', label: 'Domingo' },
]

const criarHorariosPadrao = (): HorarioDia[] =>
  DIAS_SEMANA.map((dia) => ({
    key: dia.key,
    label: dia.label,
    fechado: dia.key === 'domingo',
    abertura: '09:00',
    fechamento: '18:00',
  }))

const parseArraySafe = (value: unknown): any[] => {
  if (Array.isArray(value)) return value

  let current = value
  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof current !== 'string') break

    const trimmed = current.trim()
    if (!trimmed) return []

    try {
      current = JSON.parse(trimmed)
    } catch {
      return []
    }

    if (Array.isArray(current)) return current
  }

  return Array.isArray(current) ? current : []
}

const normalizarBoolean = (value: unknown) => value === true || value === 1 || ['1', 'true', 'sim', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())

const mascaraCep = (valor: string) => {
  const numeros = valor.replace(/\D/g, '').slice(0, 8)
  if (numeros.length <= 5) return numeros
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}

const montarEndereco = (form: FormBarbearia) => {
  const parteRua = `${form.rua}, ${form.numero}`
  const parteComplemento = form.complemento ? ` - ${form.complemento}` : ''
  const parteCidade = `${form.bairro}, ${form.cidade}/${form.estado}`
  const parteCep = form.cep ? ` - CEP ${form.cep}` : ''
  return `${parteRua}${parteComplemento}, ${parteCidade}${parteCep}`
}

const parseEndereco = (endereco: string) => {
  const cepMatch = endereco.match(/CEP\s*(\d{5}-?\d{3})/)
  const cep = cepMatch ? mascaraCep(cepMatch[1]) : ''
  const semCep = endereco.replace(/\s*-?\s*CEP\s*\d{5}-?\d{3}/, '').trim()

  const partes = semCep.split(',').map((s) => s.trim())

  let rua = ''
  let numero = ''
  let complemento = ''
  let bairro = ''
  let cidade = ''
  let estado = ''

  if (partes.length >= 3) {
    rua = partes[0] || ''

    const segundaParte = partes[1] || ''
    const compMatch = segundaParte.match(/^(.+?)\s*-\s*(.+)$/)
    if (compMatch) {
      numero = compMatch[1].trim()
      complemento = compMatch[2].trim()
    } else {
      numero = segundaParte
    }

    const cidadeUf = partes[partes.length - 1] || ''
    const ufMatch = cidadeUf.match(/^(.+?)\/([A-Za-z]{2})$/)
    if (ufMatch) {
      cidade = ufMatch[1].trim()
      estado = ufMatch[2].toUpperCase()
    } else {
      cidade = cidadeUf
    }

    if (partes.length >= 4) {
      bairro = partes[partes.length - 2] || ''
    }
  }

  return { rua, numero, complemento, bairro, cidade, estado, cep }
}

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
  if (!isPersistableMediaUrl(url)) return ''
  if (
    url.startsWith('http://')
    && !url.includes('localhost')
    && !url.includes('127.0.0.1')
  ) {
    return `https://${url.slice('http://'.length)}`
  }
  return url
}

const formatarMensagemLimiteProfissionais = (limite: number) => {
  if (!Number.isFinite(limite) || limite <= 0) {
    return 'Seu plano atual não permite cadastrar novos barbeiros.'
  }

  if (limite === 1) {
    return 'Seu plano atual permite apenas 1 barbeiro. Troque para o próximo plano para montar uma equipe maior.'
  }

  return `Seu plano atual permite até ${limite} barbeiros. Troque de plano para ampliar a equipe.`
}

export default function ConfigurarPage() {
  const router = useRouter()
  const { user } = useAuth() as { user?: UsuarioLogado }
  const [loading, setLoading] = useState(false)
  const [loadingInicial, setLoadingInicial] = useState(true)
  const [loadingCep, setLoadingCep] = useState(false)
  const [message, setMessage] = useState('')
  const [barbeariaId, setBarbeariaId] = useState<string | number | null>(null)
  const [horarios, setHorarios] = useState<HorarioDia[]>(criarHorariosPadrao())
  const [amenidadesSelecionadas, setAmenidadesSelecionadas] = useState<string[]>([])
  const [amenidadeCustom, setAmenidadeCustom] = useState('')
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', cargo: '', experiencia: '' })
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [novaAvaliacao, setNovaAvaliacao] = useState({ autor: '', nota: '5', comentario: '' })
  const [servicos, setServicos] = useState<ServicoItem[]>([])
  const [novoServico, setNovoServico] = useState({ tipo: 'cabelo' as TipoServicoCatalog, nome: SERVICE_BY_TYPE.cabelo.nome, preco: '', duracao: '40' })
  const [bannerUrl, setBannerUrl] = useState('')
  const [galeria, setGaleria] = useState<string[]>([])
  const [enviandoBanner, setEnviandoBanner] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [subscriptionResumo, setSubscriptionResumo] = useState<SubscriptionResumo | null>(null)

  const [form, setForm] = useState<FormBarbearia>({
    nome: '',
    telefone: '',
    whatsapp: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    horario_abertura: '',
    horario_fechamento: '',
    logo_url: '',
  })

  const assinaturaPremiumLiberada = PREMIUM_UNLOCKED_STATUSES.includes(String(subscriptionResumo?.status || '').trim())
  const limiteProfissionaisPlano = PLAN_MAX_PROFISSIONAIS[String(subscriptionResumo?.plan_key || 'free').trim()] ?? 0
  const equipeAtingiuLimitePlano = assinaturaPremiumLiberada
    && limiteProfissionaisPlano > 0
    && profissionais.length >= limiteProfissionaisPlano
  const assinaturaResumoLabel = assinaturaPremiumLiberada ? 'Recursos premium liberados' : 'Sem assinatura ativa'
  const assinaturaResumoDescricao = assinaturaPremiumLiberada
    ? 'Fotos, serviços e equipe estão liberados para este perfil.'
    : 'Você pode configurar nome, endereço, telefone, horários, comodidades, avaliações, logo, banner e galeria. Novos serviços e novos barbeiros exigem assinatura. Se o plano vencer, os serviços atuais ficam pausados e voltam automaticamente quando o pagamento for regularizado.'

  const abrirPlanos = () => router.push('/barbearia/planos')

  const avisarBloqueioPremium = (recurso: string) => {
    setMessage(`${recurso} fica disponível com assinatura ativa. Os dados básicos da barbearia continuam liberados.`)
  }

  const montarPayloadBarbearia = (logoUrlOverride?: string) => {
    const diasAbertos = horarios.filter((dia) => !dia.fechado)
    const primeiraAbertura = diasAbertos.map((dia) => dia.abertura).sort()[0]
    const ultimoFechamento = diasAbertos.map((dia) => dia.fechamento).sort().reverse()[0]

    return {
      nome: form.nome,
      telefone: form.telefone,
      endereco: montarEndereco(form),
      horario_abertura: primeiraAbertura || '09:00',
      horario_fechamento: ultimoFechamento || '20:00',
      usuario_id: user?.id,
      logo_url: normalizarMediaUrl(logoUrlOverride ?? form.logo_url) || null,
      whatsapp_link: form.whatsapp || null,
      horarios_semana: horarios,
    }
  }

  const montarPayloadDetalhes = (overrides?: { bannerUrl?: string; galeriaAtualizada?: string[] }) => ({
    amenidades: amenidadesSelecionadas,
    profissionais,
    avaliacoes,
    banner_url: normalizarMediaUrl(overrides?.bannerUrl ?? bannerUrl),
    galeria: (overrides?.galeriaAtualizada ?? galeria).map(normalizarMediaUrl).filter(Boolean),
  })

  useEffect(() => {
    const carregarBarbearia = async () => {
      if (!user?.id) {
        setLoadingInicial(false)
        return
      }

      try {
        const resposta = await ApiService.listMyBarbearias()
        const lista = Array.isArray(resposta?.barbearias) ? resposta.barbearias : []
        const atual = lista.find((item: any) => String(item?.usuario_id) === String(user.id))

        if (atual) {
          setBarbeariaId(atual.id)
          setSubscriptionResumo({
            status: String(atual.subscription_status || 'inactive'),
            plan_key: String(atual.subscription_plan || 'free'),
          })
          const enderecoParseado = parseEndereco(atual.endereco || '')
          setForm({
            nome: atual.nome || '',
            telefone: atual.telefone || '',
            whatsapp: atual.whatsapp_link || '',
            cep: enderecoParseado.cep,
            rua: enderecoParseado.rua,
            numero: enderecoParseado.numero,
            complemento: enderecoParseado.complemento,
            bairro: enderecoParseado.bairro,
            cidade: enderecoParseado.cidade,
            estado: enderecoParseado.estado,
            horario_abertura: (atual.horario_abertura || '').replace(/:\d{2}$/, ''),
            horario_fechamento: (atual.horario_fechamento || '').replace(/:\d{2}$/, ''),
            logo_url: normalizarMediaUrl(atual.logo_url || ''),
          })

          const horariosSemanaAtuais = parseArraySafe(atual.horarios_semana)
          if (horariosSemanaAtuais.length === 7) {
            setHorarios(
              horariosSemanaAtuais.map((dia: any) => ({
                key: String(dia?.key || ''),
                label: String(dia?.label || ''),
                fechado: normalizarBoolean(dia?.fechado),
                abertura: String(dia?.abertura || ''),
                fechamento: String(dia?.fechamento || ''),
              }))
            )
          }

          try {
            const respostaServicos = await ApiService.listServicos(atual.id, { includeInactive: true })
            const listaServicos = Array.isArray(respostaServicos?.servicos) ? respostaServicos.servicos : []
            setServicos(
              listaServicos.map((servico: any) => {
                const imagem = servico?.imagem_url || getServiceImageByName(String(servico?.nome || ''), servico?.imagem_url)

                return {
                  id: String(servico.id),
                  nome: String(servico.nome || ''),
                  preco: Number(servico.preco || 0),
                  duracao_minutos: Number(servico.duracao_minutos || 30),
                  imagem: servico?.imagem_url || null,
                  ativo: servico?.ativo !== false,
                  pausado_por_assinatura: servico?.pausado_por_assinatura === true,
                }
              })
            )
          } catch {
            setServicos([])
          }

          try {
            const respostaDetalhes = await ApiService.getBarbeariaDetalhes(atual.id)
            const detalhes = respostaDetalhes?.detalhes || {}

            if (Array.isArray(detalhes?.profissionais)) {
              setProfissionais(detalhes.profissionais.filter((item: any) => item?.nome && item?.cargo))
            }

            if (Array.isArray(detalhes?.avaliacoes)) {
              setAvaliacoes(detalhes.avaliacoes.filter((item: any) => item?.autor && item?.comentario))
            }

            if (Array.isArray(detalhes?.amenidades)) {
              setAmenidadesSelecionadas(detalhes.amenidades.filter((item: any) => typeof item === 'string'))
            }

            setBannerUrl(normalizarMediaUrl(String(detalhes?.banner_url || '')))

            if (Array.isArray(detalhes?.galeria)) {
              setGaleria(
                detalhes.galeria
                  .filter((item: any) => typeof item === 'string')
                  .map((item: string) => normalizarMediaUrl(item))
                  .filter(Boolean)
              )
            }
          } catch {
            // Mantem tela editavel mesmo sem detalhes salvos.
          }

          try {
            const respostaAssinatura = await ApiService.getCurrentSubscription({
              userId: user.id,
              barbeariaId: atual.id,
            })

            setSubscriptionResumo({
              status: String(respostaAssinatura?.status || atual.subscription_status || 'inactive'),
              plan_key: String(respostaAssinatura?.plan_key || atual.subscription_plan || 'free'),
            })
          } catch {
            // Mantem o status carregado da barbearia se a consulta da assinatura falhar.
          }
        } else {
          setSubscriptionResumo({ status: 'inactive', plan_key: 'free' })
        }
      } catch {
        setMessage('Não foi possível carregar os dados atuais da barbearia.')
      } finally {
        setLoadingInicial(false)
      }
    }

    carregarBarbearia()
  }, [user?.id])

  const alternarAmenidade = (amenidade: string) => {
    setAmenidadesSelecionadas((prev) => {
      if (prev.includes(amenidade)) {
        return prev.filter((item) => item !== amenidade)
      }
      return [...prev, amenidade]
    })
  }

  const adicionarAmenidadeCustom = () => {
    const valor = amenidadeCustom.trim()
    if (!valor) return

    if (!amenidadesSelecionadas.includes(valor)) {
      setAmenidadesSelecionadas((prev) => [...prev, valor])
    }

    setAmenidadeCustom('')
  }

  const adicionarProfissional = () => {
    if (!assinaturaPremiumLiberada) {
      avisarBloqueioPremium('Adicionar barbeiros')
      return
    }

    if (equipeAtingiuLimitePlano) {
      setMessage(formatarMensagemLimiteProfissionais(limiteProfissionaisPlano))
      return
    }

    if (!novoProfissional.nome.trim() || !novoProfissional.cargo.trim()) return

    setProfissionais((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        nome: novoProfissional.nome.trim(),
        cargo: novoProfissional.cargo.trim(),
        experiencia: novoProfissional.experiencia.trim() || 'Experiência não informada',
      },
    ])

    setNovoProfissional({ nome: '', cargo: '', experiencia: '' })
  }

  const removerProfissional = (id: string) => {
    if (!assinaturaPremiumLiberada) {
      avisarBloqueioPremium('Alterar a equipe')
      return
    }

    setProfissionais((prev) => prev.filter((item) => item.id !== id))
  }

  const adicionarAvaliacao = () => {
    if (!novaAvaliacao.autor.trim() || !novaAvaliacao.comentario.trim()) return

    const nota = Number(novaAvaliacao.nota)

    setAvaliacoes((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        autor: novaAvaliacao.autor.trim(),
        nota: Number.isNaN(nota) ? 5 : Math.min(5, Math.max(1, nota)),
        comentario: novaAvaliacao.comentario.trim(),
        data: new Date().toLocaleDateString('pt-BR'),
      },
    ])

    setNovaAvaliacao({ autor: '', nota: '5', comentario: '' })
  }

  const removerAvaliacao = (id: string) => {
    setAvaliacoes((prev) => prev.filter((item) => item.id !== id))
  }

  const adicionarServico = async () => {
    if (!assinaturaPremiumLiberada) {
      avisarBloqueioPremium('Adicionar serviços')
      return
    }

    const precoNumero = Number(String(novoServico.preco).replace(',', '.'))
    const duracaoNumero = Number(novoServico.duracao)

    if (Number.isNaN(precoNumero) || precoNumero <= 0) {
      setMessage('Defina o valor do serviço (ex: 45).')
      return
    }

    if (Number.isNaN(duracaoNumero) || duracaoNumero <= 0) {
      setMessage('Defina a duração em minutos.')
      return
    }

    if (!barbeariaId) {
      setMessage('Salve os dados da barbearia antes de cadastrar serviços.')
      return
    }

    try {
      const modelo = SERVICE_BY_TYPE[novoServico.tipo]
      const nome = String(novoServico.nome || '').trim() || modelo.nome
      const resposta = await ApiService.createServico(barbeariaId, {
        nome,
        descricao: `Serviço ${nome}`,
        imagem_url: getServiceImageValueForSave(novoServico.tipo),
        preco: precoNumero,
        duracao_minutos: duracaoNumero,
      })

      const criado = resposta?.servico
      if (criado) {
        setServicos((prev) => [
          ...prev,
          {
            id: String(criado.id),
            nome: String(criado.nome || nome),
            preco: Number(criado.preco || precoNumero),
            duracao_minutos: Number(criado.duracao_minutos || duracaoNumero),
            imagem: String(criado.imagem_url || getServiceImageValueForSave(novoServico.tipo)),
          },
        ])
      }

      setNovoServico({ tipo: 'cabelo', nome: SERVICE_BY_TYPE.cabelo.nome, preco: '', duracao: '40' })
      setMessage('Serviço cadastrado com sucesso.')
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível cadastrar o serviço.')
    }
  }

  const removerServico = async (id: string) => {
    if (!assinaturaPremiumLiberada) {
      avisarBloqueioPremium('Alterar o catálogo de serviços')
      return
    }

    try {
      await ApiService.deleteServico(id)
      setServicos((prev) => prev.filter((servico) => servico.id !== id))
    } catch {
      setMessage('Não foi possível remover o serviço.')
    }
  }

  const buscarCep = async () => {
    const cepNumerico = form.cep.replace(/\D/g, '')
    if (cepNumerico.length !== 8) {
      setMessage('Informe um CEP válido com 8 dígitos.')
      return
    }

    try {
      setLoadingCep(true)
      setMessage('')
      const resposta = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`)
      const dados = await resposta.json()

      if (dados.erro) {
        throw new Error('CEP não encontrado.')
      }

      setForm((prev) => ({
        ...prev,
        cep: mascaraCep(cepNumerico),
        rua: dados.logradouro || prev.rua,
        bairro: dados.bairro || prev.bairro,
        cidade: dados.localidade || prev.cidade,
        estado: dados.uf || prev.estado,
      }))
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível consultar o CEP.')
    } finally {
      setLoadingCep(false)
    }
  }

  const atualizarHorarioDia = (key: string, campo: 'fechado' | 'abertura' | 'fechamento', valor: boolean | string) => {
    setHorarios((prev) =>
      prev.map((dia) => {
        if (dia.key !== key) return dia
        if (campo === 'fechado') {
          return { ...dia, fechado: Boolean(valor) }
        }
        return { ...dia, [campo]: String(valor) }
      })
    )
  }

  const validarEndereco = () => {
    if (!form.cep || form.cep.replace(/\D/g, '').length !== 8) return 'CEP inválido.'
    if (!form.rua.trim()) return 'Informe a rua.'
    if (!form.numero.trim()) return 'Informe o número.'
    if (!form.bairro.trim()) return 'Informe o bairro.'
    if (!form.cidade.trim()) return 'Informe a cidade.'
    if (!form.estado.trim() || form.estado.trim().length !== 2) return 'Informe o estado com 2 letras.'
    return null
  }

  const validarHorarios = () => {
    const diasAbertos = horarios.filter((dia) => !dia.fechado)
    if (diasAbertos.length === 0) return 'Configure ao menos um dia de funcionamento.'

    for (const dia of diasAbertos) {
      if (!dia.abertura || !dia.fechamento) return `Defina abertura e fechamento para ${dia.label}.`
      if (dia.abertura >= dia.fechamento) return `Horário inválido em ${dia.label}.`
    }

    return null
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const erroEndereco = validarEndereco()
      if (erroEndereco) {
        throw new Error(erroEndereco)
      }

      const erroHorarios = validarHorarios()
      if (erroHorarios) {
        throw new Error(erroHorarios)
      }

      if (amenidadesSelecionadas.length === 0) {
        throw new Error('Selecione ao menos uma comodidade.')
      }

      const payload = montarPayloadBarbearia()

      if (!form.nome.trim()) {
        throw new Error('Informe o nome da barbearia.')
      }

      if (!user?.id) {
        throw new Error('Usuario invalido para salvar barbearia.')
      }

      let finalBarbeariaId: string | number | null = barbeariaId

      if (finalBarbeariaId) {
        await ApiService.updateBarbearia(finalBarbeariaId, payload)
      } else {
        const criado = await ApiService.createBarbearia(payload)
        const novoId = criado?.barbearia?.id
        if (novoId) {
          setBarbeariaId(novoId)
          finalBarbeariaId = novoId
        }
      }

      if (!finalBarbeariaId) {
        throw new Error('Não foi possível identificar a barbearia para salvar os detalhes.')
      }

      await ApiService.updateBarbeariaDetalhes(finalBarbeariaId, {
        ...montarPayloadDetalhes(),
      })

      setMessage('Salvo com sucesso!')
    } catch (error: any) {
      setMessage(error?.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!barbeariaId) {
      setMessage('Salve os dados básicos da barbearia antes de enviar a logo.')
      return
    }

    try {
      setEnviandoLogo(true)
      const resposta = await ApiService.uploadImagem(file, {
        barbeariaId,
        scope: 'barbearia-media',
        maxDimension: 900,
        quality: 0.86,
      })
      const url = String(resposta?.url || '')

      if (!url) {
        throw new Error('Não foi possível obter a URL do logo enviado.')
      }

      await ApiService.updateBarbearia(barbeariaId, montarPayloadBarbearia(url))
      setForm((prev) => ({ ...prev, logo_url: url }))
      setMessage('Logo enviada e salva com sucesso.')
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível enviar o logo.')
    } finally {
      setEnviandoLogo(false)
    }
  }

  const handleBannerUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!barbeariaId) {
      setMessage('Salve os dados básicos da barbearia antes de enviar o banner.')
      return
    }

    try {
      setEnviandoBanner(true)
      const resposta = await ApiService.uploadImagem(file, {
        barbeariaId,
        scope: 'barbearia-media',
        maxDimension: 1800,
        quality: 0.82,
      })
      const url = normalizarMediaUrl(String(resposta?.url || ''))
      if (!url) {
        throw new Error('Não foi possível obter a URL do banner enviado.')
      }

      await ApiService.updateBarbeariaDetalhes(barbeariaId, montarPayloadDetalhes({ bannerUrl: url }))
      setBannerUrl(url)
      setMessage('Banner enviado e salvo com sucesso.')
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível enviar o banner.')
    } finally {
      setEnviandoBanner(false)
    }
  }

  const handleGaleriaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!barbeariaId) {
      setMessage('Salve os dados básicos da barbearia antes de enviar a galeria.')
      return
    }

    try {
      setEnviandoGaleria(true)
      const urls: string[] = []
      for (const file of files) {
        const resposta = await ApiService.uploadImagem(file, {
          barbeariaId,
          scope: 'barbearia-media',
          maxDimension: 1600,
          quality: 0.82,
        })
        const url = String(resposta?.url || '')
        if (url) urls.push(url)
      }

      if (urls.length > 0) {
        const galeriaAtualizada = [...galeria, ...urls.map(normalizarMediaUrl).filter(Boolean)]
        await ApiService.updateBarbeariaDetalhes(barbeariaId, montarPayloadDetalhes({ galeriaAtualizada }))
        setGaleria(galeriaAtualizada)
      }
      setMessage('Galeria enviada e salva com sucesso.')
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível enviar imagens da galeria.')
    } finally {
      setEnviandoGaleria(false)
    }
  }

  const removerImagemGaleria = (url: string) => {
    setGaleria((prev) => prev.filter((item) => item !== url))
  }

  const qualidadeEndereco = Boolean(
    form.cep && form.rua && form.numero && form.bairro && form.cidade && form.estado
  )
  const qualidadeHorarios = horarios.some((dia) => !dia.fechado)
  const qualidadeCadastro = qualidadeEndereco && qualidadeHorarios && amenidadesSelecionadas.length > 0 && Boolean(form.nome.trim())

  if (loadingInicial) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-zinc-300">Carregando configuracoes...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg md:text-2xl font-bold">Configurar Barbearia</h1>
          <button
            onClick={() => router.push('/barbearia')}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Voltar
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg ${
            message.includes('sucesso') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-xl p-6 sticky top-6">
              <h2 className="font-medium mb-4">Logo da Barbearia</h2>

              <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${qualidadeCadastro ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  {qualidadeCadastro ? 'Perfil com qualidade para clientes' : 'Complete os dados para transmitir qualidade'}
                </div>
              </div>

              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${assinaturaPremiumLiberada ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
                <div className="flex items-start gap-3">
                  {assinaturaPremiumLiberada ? <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium">{assinaturaResumoLabel}</p>
                    <p className="mt-1 text-xs leading-5 opacity-90">{assinaturaResumoDescricao}</p>
                    {!assinaturaPremiumLiberada && (
                      <button
                        type="button"
                        onClick={abrirPlanos}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-black/20 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-black/30"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Ver planos
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-28 h-28 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden mb-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-sm text-center px-2">Sem logo</span>
                )}
              </div>

              <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition w-fit">
                <Upload className="w-4 h-4" />
                <span className="text-sm">{enviandoLogo ? 'Enviando logo...' : 'Alterar logo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={enviandoLogo}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-zinc-500 mt-2">
                PNG, JPG ou WebP até 5MB. A imagem é otimizada automaticamente antes do envio.
              </p>

              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium text-zinc-200">Banner de fundo</h3>
                <div className="h-24 w-full rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-zinc-500">Sem banner</div>
                  )}
                </div>
                <label className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition w-fit text-sm">
                  <Upload className="w-4 h-4" />
                  {enviandoBanner ? 'Enviando...' : 'Enviar banner'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                    disabled={enviandoBanner}
                  />
                </label>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium text-zinc-200">Galeria</h3>
                <label className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition w-fit text-sm">
                  <Upload className="w-4 h-4" />
                  {enviandoGaleria ? 'Enviando imagens...' : 'Adicionar imagens'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGaleriaUpload}
                    className="hidden"
                    disabled={enviandoGaleria}
                  />
                </label>
                {galeria.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {galeria.map((url) => (
                      <div key={url} className="relative rounded-lg overflow-hidden border border-zinc-700 h-20">
                        <img src={url} alt="Galeria" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removerImagemGaleria(url)}
                          className="absolute top-1 right-1 text-xs bg-black/70 px-2 py-0.5 rounded text-white"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium">Dados da Barbearia</h2>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Ex: Barbearia Alfa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="5511999999999"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm text-zinc-400 mb-1">CEP</label>
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: mascaraCep(e.target.value) })}
                    onBlur={buscarCep}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                    placeholder="00000-000"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={buscarCep}
                    disabled={loadingCep}
                    className="h-12 px-4 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {loadingCep ? 'Buscando CEP...' : 'Buscar CEP'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Rua
                </label>
                <input
                  type="text"
                  value={form.rua}
                  onChange={(e) => setForm({ ...form, rua: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Rua"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Numero</label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                    placeholder="56"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-400 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={form.complemento}
                    onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                    placeholder="Sala, referencia, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm text-zinc-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">UF</label>
                  <input
                    type="text"
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários de Funcionamento (por dia)
              </h2>

              <div className="space-y-3">
                {horarios.map((dia) => (
                  <div key={dia.key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      <div className="w-full md:w-44 text-sm font-medium">{dia.label}</div>
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={dia.fechado}
                          onChange={(e) => atualizarHorarioDia(dia.key, 'fechado', e.target.checked)}
                        />
                        Fechado
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={dia.abertura}
                          disabled={dia.fechado}
                          onChange={(e) => atualizarHorarioDia(dia.key, 'abertura', e.target.value)}
                          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:opacity-50"
                        />
                        <span className="text-zinc-500">até</span>
                        <input
                          type="time"
                          value={dia.fechamento}
                          disabled={dia.fechado}
                          onChange={(e) => atualizarHorarioDia(dia.key, 'fechamento', e.target.value)}
                          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-medium">Serviços</h2>
                  <p className="text-sm text-zinc-400">Clique em novo serviço para definir tipo, imagem e valor do corte.</p>
                </div>
                {!assinaturaPremiumLiberada && (
                  <button
                    type="button"
                    onClick={abrirPlanos}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/15"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Adicionar serviços exige assinatura
                  </button>
                )}
              </div>

              <div className={`rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${assinaturaPremiumLiberada ? '' : 'opacity-70'}`}>
                <p className="text-sm font-medium text-white">Novo serviço</p>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Foto de referência</p>
                  <p className="text-xs text-zinc-400">Escolha a imagem base e personalize o nome do serviço como quiser.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {SERVICE_OPTIONS.map((opcao) => {
                    const item = SERVICE_BY_TYPE[opcao.value]
                    const selecionado = novoServico.tipo === opcao.value

                    return (
                      <button
                        key={opcao.value}
                        type="button"
                        disabled={!assinaturaPremiumLiberada}
                        onClick={() => setNovoServico((prev) => ({
                          ...prev,
                          tipo: opcao.value,
                          nome: getServiceNameForTypeChange(prev.nome, prev.tipo, opcao.value),
                        }))}
                        className={`rounded-lg border p-2 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${selecionado ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800/70'}`}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-xs text-zinc-400 mb-1">Nome exibido</label>
                    <input
                      type="text"
                      value={novoServico.nome}
                      disabled={!assinaturaPremiumLiberada}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Ex: Corte seg a quinta"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Valor (cliente define)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={novoServico.preco}
                      disabled={!assinaturaPremiumLiberada}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, preco: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Ex: 45"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Duração (min)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={novoServico.duracao}
                      disabled={!assinaturaPremiumLiberada}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, duracao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {SERVICE_BY_TYPE[novoServico.tipo].imagem ? (
                    <img
                      src={SERVICE_BY_TYPE[novoServico.tipo].imagem || ''}
                      alt={SERVICE_BY_TYPE[novoServico.tipo].nome}
                      className="w-14 h-14 rounded-lg object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-950 text-[10px] text-zinc-400">
                      Sem foto
                    </div>
                  )}
                  <div className="text-sm text-zinc-300">
                    <p>{novoServico.nome || SERVICE_BY_TYPE[novoServico.tipo].nome}</p>
                    <p className="text-xs text-zinc-400">Referência visual: {SERVICE_BY_TYPE[novoServico.tipo].nome}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={assinaturaPremiumLiberada ? adicionarServico : abrirPlanos}
                  className={`px-4 py-2 rounded-lg border ${assinaturaPremiumLiberada ? 'border-zinc-700 hover:bg-zinc-800' : 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'}`}
                >
                  {assinaturaPremiumLiberada ? 'Novo serviço' : 'Liberar com assinatura'}
                </button>
              </div>

              {servicos.length > 0 ? (
                <div className="space-y-2">
                  {servicos.map((servico) => (
                    <div key={servico.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {getServiceImageByName(servico.nome, servico.imagem) ? (
                          <img
                            src={getServiceImageByName(servico.nome, servico.imagem) || ''}
                            alt={servico.nome}
                            className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900 text-[10px] text-zinc-400">
                            Sem foto
                          </div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">{servico.nome}</p>
                            {servico.pausado_por_assinatura && (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                                Pausado pela assinatura
                              </span>
                            )}
                            {!servico.pausado_por_assinatura && servico.ativo === false && (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">{servico.duracao_minutos} min</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">R$ {servico.preco.toFixed(2)}</p>
                        <button type="button" onClick={() => removerServico(servico.id)} className="text-xs text-red-400 hover:text-red-300">Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Nenhum serviço cadastrado ainda.</p>
              )}
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium">Comodidades</h2>
              <p className="text-sm text-zinc-400">Selecione as comodidades que seu espaço oferece.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AMENIDADES_PADRAO.map((amenidade) => (
                  <label key={amenidade} className="inline-flex items-center gap-2 text-sm text-zinc-200 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={amenidadesSelecionadas.includes(amenidade)}
                      onChange={() => alternarAmenidade(amenidade)}
                    />
                    {amenidade}
                  </label>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={amenidadeCustom}
                  onChange={(e) => setAmenidadeCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      adicionarAmenidadeCustom()
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Adicionar comodidade personalizada"
                />
                <button
                  type="button"
                  onClick={adicionarAmenidadeCustom}
                  className="px-4 py-3 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                >
                  Adicionar
                </button>
              </div>

              {amenidadesSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {amenidadesSelecionadas.map((amenidade) => (
                    <button
                      key={amenidade}
                      type="button"
                      onClick={() => alternarAmenidade(amenidade)}
                      className="text-xs rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-300 hover:text-white"
                    >
                      {amenidade} x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-medium">Profissionais</h2>
                  <p className="text-sm text-zinc-400">Adicione os barbeiros que atendem na barbearia.</p>
                </div>
                {!assinaturaPremiumLiberada && (
                  <button
                    type="button"
                    onClick={abrirPlanos}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/15"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Novos barbeiros exigem assinatura
                  </button>
                )}
                {assinaturaPremiumLiberada && equipeAtingiuLimitePlano && (
                  <button
                    type="button"
                    onClick={abrirPlanos}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/15"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Ampliar plano para mais barbeiros
                  </button>
                )}
              </div>

              {assinaturaPremiumLiberada && limiteProfissionaisPlano > 0 && (
                <div className={`rounded-lg border px-3 py-2 text-sm ${equipeAtingiuLimitePlano ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-zinc-800 bg-zinc-950 text-zinc-300'}`}>
                  {equipeAtingiuLimitePlano
                    ? formatarMensagemLimiteProfissionais(limiteProfissionaisPlano)
                    : `Plano atual: até ${limiteProfissionaisPlano} ${limiteProfissionaisPlano === 1 ? 'barbeiro' : 'barbeiros'} na equipe.`}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={novoProfissional.nome}
                  disabled={!assinaturaPremiumLiberada}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, nome: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Nome"
                />
                <input
                  type="text"
                  value={novoProfissional.cargo}
                  disabled={!assinaturaPremiumLiberada}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, cargo: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Cargo"
                />
                <input
                  type="text"
                  value={novoProfissional.experiencia}
                  disabled={!assinaturaPremiumLiberada}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, experiencia: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Ex: 6 anos"
                />
              </div>

              <button
                type="button"
                onClick={assinaturaPremiumLiberada ? (equipeAtingiuLimitePlano ? abrirPlanos : adicionarProfissional) : abrirPlanos}
                className={`px-4 py-2 rounded-lg border ${
                  !assinaturaPremiumLiberada
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
                    : equipeAtingiuLimitePlano
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
                      : 'border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {!assinaturaPremiumLiberada
                  ? 'Liberar com assinatura'
                  : equipeAtingiuLimitePlano
                    ? 'Ampliar plano'
                    : 'Adicionar profissional'}
              </button>

              {profissionais.length > 0 && (
                <div className="space-y-2">
                  {profissionais.map((profissional) => (
                    <div key={profissional.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{profissional.nome}</p>
                        <p className="text-sm text-zinc-300">{profissional.cargo}</p>
                        <p className="text-xs text-zinc-500">{profissional.experiencia}</p>
                      </div>
                      <button type="button" onClick={() => removerProfissional(profissional.id)} className="text-xs text-red-400 hover:text-red-300">Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium">Avaliações</h2>
              <p className="text-sm text-zinc-400">Cadastre depoimentos para exibir na pagina publica.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={novaAvaliacao.autor}
                  onChange={(e) => setNovaAvaliacao((prev) => ({ ...prev, autor: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Nome do cliente"
                />
                <select
                  value={novaAvaliacao.nota}
                  onChange={(e) => setNovaAvaliacao((prev) => ({ ...prev, nota: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                >
                  <option value="5">5 estrelas</option>
                  <option value="4">4 estrelas</option>
                  <option value="3">3 estrelas</option>
                  <option value="2">2 estrelas</option>
                  <option value="1">1 estrela</option>
                </select>
                <button
                  type="button"
                  onClick={adicionarAvaliacao}
                  className="px-4 py-3 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                >
                  Adicionar avaliacao
                </button>
              </div>

              <textarea
                value={novaAvaliacao.comentario}
                onChange={(e) => setNovaAvaliacao((prev) => ({ ...prev, comentario: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                placeholder="Comentario"
                rows={3}
              />

              {avaliacoes.length > 0 && (
                <div className="space-y-2">
                  {avaliacoes.map((avaliacao) => (
                    <div key={avaliacao.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{avaliacao.autor} - {'★'.repeat(avaliacao.nota)}</p>
                        <p className="text-xs text-zinc-500">{avaliacao.data}</p>
                        <p className="text-sm text-zinc-300 mt-1">{avaliacao.comentario}</p>
                      </div>
                      <button type="button" onClick={() => removerAvaliacao(avaliacao.id)} className="text-xs text-red-400 hover:text-red-300">Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

