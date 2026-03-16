'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { Save, Upload, Phone, MapPin, Clock, BadgeCheck } from 'lucide-react'

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
  imagem: string
}

type TipoServico = 'cabelo' | 'cabelo_sobrancelha' | 'barba' | 'cabelo_barba' | 'corte_feminino'

const OPCOES_SERVICO: Array<{ value: TipoServico; label: string; image: string }> = [
  { value: 'cabelo', label: 'Cabelo', image: '/service-icons/cabelo.png' },
  { value: 'cabelo_sobrancelha', label: 'Cabelo + Sobrancelha', image: '/service-icons/cabelo-sobrancelha.png' },
  { value: 'barba', label: 'Barba', image: '/service-icons/barba.png' },
  { value: 'cabelo_barba', label: 'Cabelo + Barba', image: '/service-icons/cabelo-barba.png' },
  { value: 'corte_feminino', label: 'Corte Feminino', image: '/service-icons/corte-feminino.png' },
]

const SERVICO_POR_TIPO: Record<TipoServico, { nome: string; imagem: string }> = {
  cabelo: { nome: 'Cabelo', imagem: '/service-icons/cabelo.png' },
  cabelo_sobrancelha: { nome: 'Cabelo + Sobrancelha', imagem: '/service-icons/cabelo-sobrancelha.png' },
  barba: { nome: 'Barba', imagem: '/service-icons/barba.png' },
  cabelo_barba: { nome: 'Cabelo + Barba', imagem: '/service-icons/cabelo-barba.png' },
  corte_feminino: { nome: 'Corte Feminino', imagem: '/service-icons/corte-feminino.png' },
}

const inferirImagemServico = (nomeServico: string) => {
  const nomeNormalizado = String(nomeServico || '').toLowerCase()

  if (nomeNormalizado.includes('feminino')) return '/service-icons/corte-feminino.png'
  if (nomeNormalizado.includes('cabelo') && nomeNormalizado.includes('barba')) return '/service-icons/cabelo-barba.png'
  if (nomeNormalizado.includes('sobrancelha')) return '/service-icons/cabelo-sobrancelha.png'
  if (nomeNormalizado.includes('barba')) return '/service-icons/barba.png'
  if (nomeNormalizado.includes('cabelo')) return '/service-icons/cabelo.png'

  return '/service-icons/cabelo.png'
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
  const [novoServico, setNovoServico] = useState({ tipo: 'cabelo' as TipoServico, preco: '', duracao: '40' })

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

  useEffect(() => {
    const carregarBarbearia = async () => {
      if (!user?.id) {
        setLoadingInicial(false)
        return
      }

      try {
        const resposta = await ApiService.listBarbearias()
        const lista = Array.isArray(resposta?.barbearias) ? resposta.barbearias : []
        const atual = lista.find((item: any) => String(item?.usuario_id) === String(user.id))

        if (atual) {
          setBarbeariaId(atual.id)
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
            logo_url: atual.logo_url || '',
          })

          if (Array.isArray(atual.horarios_semana) && atual.horarios_semana.length === 7) {
            setHorarios(
              atual.horarios_semana.map((dia: any) => ({
                key: String(dia?.key || ''),
                label: String(dia?.label || ''),
                fechado: Boolean(dia?.fechado),
                abertura: String(dia?.abertura || ''),
                fechamento: String(dia?.fechamento || ''),
              }))
            )
          }

          try {
            const respostaServicos = await ApiService.listServicos(atual.id)
            const listaServicos = Array.isArray(respostaServicos?.servicos) ? respostaServicos.servicos : []
            setServicos(
              listaServicos.map((servico: any) => {
                const imagem = inferirImagemServico(String(servico?.nome || ''))

                return {
                  id: String(servico.id),
                  nome: String(servico.nome || ''),
                  preco: Number(servico.preco || 0),
                  duracao_minutos: Number(servico.duracao_minutos || 30),
                  imagem,
                }
              })
            )
          } catch {
            setServicos([])
          }
        }
      } catch {
        setMessage('Nao foi possivel carregar os dados atuais da barbearia.')
      } finally {
        setLoadingInicial(false)
      }
    }

    carregarBarbearia()
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    const storageKey = `barbearia_profissionais_${barbeariaId || user.id}`
    const salvo = localStorage.getItem(storageKey)
    if (!salvo) return

    try {
      const parsed = JSON.parse(salvo)
      if (Array.isArray(parsed)) {
        setProfissionais(parsed.filter((item) => item?.nome && item?.cargo))
      }
    } catch {
      // ignore parse error
    }
  }, [barbeariaId, user?.id])

  useEffect(() => {
    if (!user?.id) return
    const storageKey = `barbearia_avaliacoes_${barbeariaId || user.id}`
    const salvo = localStorage.getItem(storageKey)
    if (!salvo) return

    try {
      const parsed = JSON.parse(salvo)
      if (Array.isArray(parsed)) {
        setAvaliacoes(parsed.filter((item) => item?.autor && item?.comentario))
      }
    } catch {
      // ignore parse error
    }
  }, [barbeariaId, user?.id])

  useEffect(() => {
    if (!user?.id) return
    const storageKey = `barbearia_amenidades_${barbeariaId || user.id}`
    const salvo = localStorage.getItem(storageKey)
    if (!salvo) return

    try {
      const parsed = JSON.parse(salvo)
      if (Array.isArray(parsed)) {
        setAmenidadesSelecionadas(parsed.filter((item) => typeof item === 'string'))
      }
    } catch {
      // ignore parse error
    }
  }, [barbeariaId, user?.id])

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
    if (!novoProfissional.nome.trim() || !novoProfissional.cargo.trim()) return

    setProfissionais((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        nome: novoProfissional.nome.trim(),
        cargo: novoProfissional.cargo.trim(),
        experiencia: novoProfissional.experiencia.trim() || 'Experiencia nao informada',
      },
    ])

    setNovoProfissional({ nome: '', cargo: '', experiencia: '' })
  }

  const removerProfissional = (id: string) => {
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
    const precoNumero = Number(String(novoServico.preco).replace(',', '.'))
    const duracaoNumero = Number(novoServico.duracao)

    if (Number.isNaN(precoNumero) || precoNumero <= 0) {
      setMessage('Defina o valor do servico (ex: 45).')
      return
    }

    if (Number.isNaN(duracaoNumero) || duracaoNumero <= 0) {
      setMessage('Defina a duracao em minutos.')
      return
    }

    if (!barbeariaId) {
      setMessage('Salve os dados da barbearia antes de cadastrar servicos.')
      return
    }

    try {
      const modelo = SERVICO_POR_TIPO[novoServico.tipo]
      const resposta = await ApiService.createServico(barbeariaId, {
        nome: modelo.nome,
        descricao: `Servico ${modelo.nome}`,
        preco: precoNumero,
        duracao_minutos: duracaoNumero,
      })

      const criado = resposta?.servico
      if (criado) {
        setServicos((prev) => [
          ...prev,
          {
            id: String(criado.id),
            nome: String(criado.nome || modelo.nome),
            preco: Number(criado.preco || precoNumero),
            duracao_minutos: Number(criado.duracao_minutos || duracaoNumero),
            imagem: modelo.imagem,
          },
        ])
      }

      setNovoServico({ tipo: 'cabelo', preco: '', duracao: '40' })
      setMessage('Servico cadastrado com sucesso.')
    } catch (error: any) {
      setMessage(error?.message || 'Nao foi possivel cadastrar o servico.')
    }
  }

  const removerServico = async (id: string) => {
    try {
      await ApiService.deleteServico(id)
      setServicos((prev) => prev.filter((servico) => servico.id !== id))
    } catch {
      setMessage('Nao foi possivel remover o servico.')
    }
  }

  const buscarCep = async () => {
    const cepNumerico = form.cep.replace(/\D/g, '')
    if (cepNumerico.length !== 8) {
      setMessage('Informe um CEP valido com 8 digitos.')
      return
    }

    try {
      setLoadingCep(true)
      setMessage('')
      const resposta = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`)
      const dados = await resposta.json()

      if (dados.erro) {
        throw new Error('CEP nao encontrado.')
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
      setMessage(error?.message || 'Nao foi possivel consultar o CEP.')
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
    if (!form.cep || form.cep.replace(/\D/g, '').length !== 8) return 'CEP invalido.'
    if (!form.rua.trim()) return 'Informe a rua.'
    if (!form.numero.trim()) return 'Informe o numero.'
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
      if (dia.abertura >= dia.fechamento) return `Horario invalido em ${dia.label}.`
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

      const diasAbertos = horarios.filter((dia) => !dia.fechado)
      const primeiraAbertura = diasAbertos
        .map((dia) => dia.abertura)
        .sort()[0]
      const ultimoFechamento = diasAbertos
        .map((dia) => dia.fechamento)
        .sort()
        .reverse()[0]

      const enderecoCompleto = montarEndereco(form)

      const payload = {
        nome: form.nome,
        telefone: form.telefone,
        endereco: enderecoCompleto,
        horario_abertura: primeiraAbertura || '09:00',
        horario_fechamento: ultimoFechamento || '20:00',
        usuario_id: user?.id,
        logo_url: form.logo_url || null,
        whatsapp_link: form.whatsapp || null,
        horarios_semana: horarios,
      }

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

      const storageKey = `barbearia_horarios_${finalBarbeariaId || user.id}`
      localStorage.setItem(storageKey, JSON.stringify(horarios))
      const amenidadesKey = `barbearia_amenidades_${finalBarbeariaId || user.id}`
      localStorage.setItem(amenidadesKey, JSON.stringify(amenidadesSelecionadas))
      const profissionaisKey = `barbearia_profissionais_${finalBarbeariaId || user.id}`
      localStorage.setItem(profissionaisKey, JSON.stringify(profissionais))
      const avaliacoesKey = `barbearia_avaliacoes_${finalBarbeariaId || user.id}`
      localStorage.setItem(avaliacoesKey, JSON.stringify(avaliacoes))

      setMessage('Salvo com sucesso!')
    } catch (error: any) {
      setMessage(error?.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setForm({ ...form, logo_url: url })
    }
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

              <div className="w-28 h-28 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden mb-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500 text-sm text-center px-2">Sem logo</span>
                )}
              </div>

              <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition w-fit">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Alterar logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-zinc-500 mt-2">PNG, JPG ate 5MB</p>
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
                Horarios de Funcionamento (por dia)
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
                        <span className="text-zinc-500">ate</span>
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
              <h2 className="font-medium">Servicos</h2>
              <p className="text-sm text-zinc-400">Clique em novo servico para definir tipo, imagem e valor do corte.</p>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                <p className="text-sm font-medium text-white">Novo servico</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                    <select
                      value={novoServico.tipo}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, tipo: e.target.value as TipoServico }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                    >
                      {OPCOES_SERVICO.map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Valor (cliente define)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={novoServico.preco}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, preco: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                      placeholder="Ex: 45"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Duracao (min)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={novoServico.duracao}
                      onChange={(e) => setNovoServico((prev) => ({ ...prev, duracao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={SERVICO_POR_TIPO[novoServico.tipo].imagem}
                    alt={SERVICO_POR_TIPO[novoServico.tipo].nome}
                    className="w-14 h-14 rounded-lg object-cover border border-zinc-700"
                  />
                  <div className="text-sm text-zinc-300">
                    <p>{SERVICO_POR_TIPO[novoServico.tipo].nome}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={adicionarServico}
                  className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                >
                  Novo servico
                </button>
              </div>

              {servicos.length > 0 ? (
                <div className="space-y-2">
                  {servicos.map((servico) => (
                    <div key={servico.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={servico.imagem} alt={servico.nome} className="w-12 h-12 rounded-lg object-cover border border-zinc-700" />
                        <div>
                          <p className="font-medium text-white">{servico.nome}</p>
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
                <p className="text-sm text-zinc-400">Nenhum servico cadastrado ainda.</p>
              )}
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <h2 className="font-medium">Comodidades</h2>
              <p className="text-sm text-zinc-400">Selecione as comodidades que seu espaco oferece.</p>

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
              <h2 className="font-medium">Profissionais</h2>
              <p className="text-sm text-zinc-400">Adicione os barbeiros que atendem na barbearia.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={novoProfissional.nome}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, nome: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Nome"
                />
                <input
                  type="text"
                  value={novoProfissional.cargo}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, cargo: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Cargo"
                />
                <input
                  type="text"
                  value={novoProfissional.experiencia}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, experiencia: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                  placeholder="Ex: 6 anos"
                />
              </div>

              <button
                type="button"
                onClick={adicionarProfissional}
                className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800"
              >
                Adicionar profissional
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
              <h2 className="font-medium">Avaliacoes</h2>
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
