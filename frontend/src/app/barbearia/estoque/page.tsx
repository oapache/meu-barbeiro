'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Boxes, ChevronDown, ChevronUp, Download, Package2, PencilLine, Plus, RefreshCcw, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { carregarImagemComoDataUrl, desenharCabecalhoPdf, desenharCardResumoPdf, desenharRodapePdf } from '@/lib/pdfBranding'

type AuthUser = {
  id?: string | number
  tipo?: string
}

type Produto = {
  id: string
  nome: string
  sku?: string
  categoria?: string
  quantidade_item?: number
  unidade?: string
  estoque_atual: number
  estoque_minimo: number
  custo_unitario: number
  preco_venda: number
  fornecedor?: string
  localizacao?: string
  observacoes?: string
  ativo?: boolean
  estoque_baixo?: boolean
  sem_estoque?: boolean
}

type Movimentacao = {
  id: string
  produto_id: string
  produto_nome?: string
  produto_categoria?: string
  tipo: string
  quantidade: number
  custo_unitario?: number | null
  preco_unitario?: number | null
  valor_total?: number | null
  movimentado_em?: string | null
  created_at: string
  profissional_nome?: string | null
  motivo?: string
  observacoes?: string
}

type ProdutoForm = {
  nome: string
  sku: string
  categoria: string
  quantidade_item: string
  unidade: string
  estoque_atual: string
  estoque_minimo: string
  custo_unitario: string
  preco_venda: string
  fornecedor: string
  localizacao: string
  observacoes: string
}

type MovimentoForm = {
  tipo: string
  quantidade: string
  estoque_final: string
  custo_unitario: string
  motivo: string
  observacoes: string
}

type DropdownOption = {
  value: string
  label: string
}

type PermissaoNotificacao = NotificationPermission | 'unsupported'

const FORM_PADRAO: ProdutoForm = {
  nome: '',
  sku: '',
  categoria: '',
  quantidade_item: '1',
  unidade: 'un',
  estoque_atual: '0',
  estoque_minimo: '0',
  custo_unitario: '0',
  preco_venda: '0',
  fornecedor: '',
  localizacao: '',
  observacoes: '',
}

const MOVIMENTO_PADRAO: MovimentoForm = {
  tipo: 'entrada',
  quantidade: '1',
  estoque_final: '',
  custo_unitario: '0',
  motivo: '',
  observacoes: '',
}

const ESTOQUE_ALERTAS_STORAGE_KEY = 'soubarbeiro:estoque-alertas'

const CATEGORIAS_SUGERIDAS: DropdownOption[] = [
  { value: 'Pomada e finalizador', label: 'Pomada e finalizador' },
  { value: 'Shampoo e cuidados', label: 'Shampoo e cuidados' },
  { value: 'Óleo e barba', label: 'Óleo e barba' },
  { value: 'Lâminas e descartáveis', label: 'Lâminas e descartáveis' },
  { value: 'Limpeza e higiene', label: 'Limpeza e higiene' },
  { value: 'Bebidas', label: 'Bebidas' },
  { value: 'Outros', label: 'Outros' },
]

const UNIDADES_DISPONIVEIS: DropdownOption[] = [
  { value: 'un', label: 'Unidade' },
  { value: 'ml', label: 'ml' },
  { value: 'g', label: 'g' },
  { value: 'cx', label: 'Caixa' },
  { value: 'pct', label: 'Pacote' },
  { value: 'kit', label: 'Kit' },
]

const MOVIMENTO_TIPOS: DropdownOption[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'compra', label: 'Compra' },
  { value: 'saida', label: 'Saída' },
  { value: 'consumo', label: 'Consumo' },
  { value: 'perda', label: 'Perda' },
  { value: 'ajuste', label: 'Ajuste' },
]

const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatarNumero = (valor: number) => new Intl.NumberFormat('pt-BR').format(Number(valor || 0))
const formatarDataHora = (valor?: string) => {
  if (!valor) return '-'
  const dt = new Date(valor)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('pt-BR')
}
const normalizarNomeArquivo = (valor: string) => String(valor || 'soubarbeiro').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
const iniciaisLoja = (valor: string) => {
  const partes = String(valor || '').trim().split(' ').filter(Boolean)
  if (partes.length === 0) return 'SB'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase()
}

const obterLabelCategoria = (valor?: string) => CATEGORIAS_SUGERIDAS.find((item) => item.value === valor)?.label || valor || 'Sem categoria'
const obterLabelUnidade = (valor?: string) => UNIDADES_DISPONIVEIS.find((item) => item.value === valor)?.label || valor || 'un'

const getRedirectLoginUrl = () => {
  if (typeof window === 'undefined') return '/login?redirect=/barbearia/estoque'
  return `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
}

const getRequestedBarbeariaId = () => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  return String(url.searchParams.get('barbearia') || '').trim()
}

function formatarQuantidadeItem(quantidade?: number, unidade?: string) {
  const quantidadeNormalizada = Number(quantidade || 0)
  const labelUnidade = obterLabelUnidade(unidade)

  if (quantidadeNormalizada <= 0) return labelUnidade
  if ((unidade || 'un') === 'un') return `${formatarNumero(quantidadeNormalizada)} ${quantidadeNormalizada === 1 ? 'unidade' : 'unidades'}`
  return `${formatarNumero(quantidadeNormalizada)} ${labelUnidade}`
}

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder: string
}) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selecionado = options.find((option) => option.value === value)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setAberto(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((prev) => !prev)}
        className={`grid min-h-[54px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
          aberto
            ? 'border-white/20 bg-zinc-900 text-white'
            : 'border-white/10 bg-black/35 text-white hover:border-white/20 hover:bg-zinc-900'
        }`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span className={`truncate text-left ${selecionado ? 'text-white' : 'text-zinc-500'}`}>{selecionado?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="max-h-72 overflow-y-auto p-2">
            {options.map((option) => {
              const ativo = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value)
                    setAberto(false)
                  }}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    ativo
                      ? 'bg-emerald-500/15 text-emerald-100'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                  role="option"
                  aria-selected={ativo}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EstoquePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth() as { user?: AuthUser; isAuthenticated: boolean; loading: boolean }

  const [loading, setLoading] = useState(true)
  const [authRedirecting, setAuthRedirecting] = useState(false)
  const [barbeariaId, setBarbeariaId] = useState('')
  const [barbeariaNome, setBarbeariaNome] = useState('')
  const [barbeariaEndereco, setBarbeariaEndereco] = useState('')
  const [barbeariaLogoUrl, setBarbeariaLogoUrl] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'low' | 'out'>('todos')
  const [resumo, setResumo] = useState({ total_produtos: 0, estoque_baixo: 0, sem_estoque: 0, valor_total_estoque: 0 })
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  const [form, setForm] = useState<ProdutoForm>(FORM_PADRAO)
  const [mostrarAvancado, setMostrarAvancado] = useState(false)
  const [movimentoProduto, setMovimentoProduto] = useState<Produto | null>(null)
  const [movimentoForm, setMovimentoForm] = useState<MovimentoForm>(MOVIMENTO_PADRAO)
  const [salvando, setSalvando] = useState(false)
  const [movimentando, setMovimentando] = useState(false)
  const [exportandoPdf, setExportandoPdf] = useState(false)
  const [alertasEstoqueAtivos, setAlertasEstoqueAtivos] = useState(false)
  const [permissaoNotificacao, setPermissaoNotificacao] = useState<PermissaoNotificacao>('unsupported')
  const estoqueCriticoNotificadoRef = useRef('')
  const categoriasDisponiveis = useMemo(() => (
    form.categoria && !CATEGORIAS_SUGERIDAS.some((item) => item.value === form.categoria)
      ? [...CATEGORIAS_SUGERIDAS, { value: form.categoria, label: form.categoria }]
      : CATEGORIAS_SUGERIDAS
  ), [form.categoria])
  const itensCriticos = useMemo(
    () => produtos.filter((produto) => produto.sem_estoque || produto.estoque_baixo),
    [produtos]
  )
  const resumoPermissaoNotificacao = useMemo(() => {
    if (permissaoNotificacao === 'granted') return 'notificação do navegador liberada'
    if (permissaoNotificacao === 'denied') return 'notificação do navegador bloqueada'
    if (permissaoNotificacao === 'default') return 'notificação do navegador pendente'
    return 'somente aviso visual nesta tela'
  }, [permissaoNotificacao])

  const carregar = async (idBarbearia: string, manterLoading = false) => {
    try {
      if (!manterLoading) setLoading(true)
      setErro('')

      const [resumoResposta, produtosResposta, movimentosResposta] = await Promise.all([
        ApiService.getEstoqueResumo(idBarbearia),
        ApiService.listEstoqueProdutos(idBarbearia, { q: busca, status: filtro === 'todos' ? '' : filtro }),
        ApiService.listEstoqueMovimentacoes(idBarbearia, { limit: 20 }),
      ])

      setResumo(resumoResposta?.resumo || { total_produtos: 0, estoque_baixo: 0, sem_estoque: 0, valor_total_estoque: 0 })
      setProdutos(Array.isArray(produtosResposta?.produtos) ? produtosResposta.produtos : [])
      setMovimentacoes(Array.isArray(movimentosResposta?.movimentacoes) ? movimentosResposta.movimentacoes : [])
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível carregar o estoque agora.')
    } finally {
      if (!manterLoading) setLoading(false)
    }
  }

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
    if (authLoading || !isAuthenticated) return

    const iniciar = async () => {
      try {
        const respostaBarbearias = await ApiService.listMyBarbearias()
        const lista = Array.isArray(respostaBarbearias?.barbearias) ? respostaBarbearias.barbearias : []
        const requestedBarbeariaId = getRequestedBarbeariaId()
        const solicitada = lista.find((item: any) => String(item?.id || '') === requestedBarbeariaId)
        const minha = solicitada || lista[0]
        if (!minha?.id) {
          setErro('Cadastre sua barbearia antes de usar o estoque.')
          setLoading(false)
          return
        }

        const id = String(minha.id)
        setBarbeariaId(id)
        setBarbeariaNome(String(minha.nome || 'O Corte Certo'))
        setBarbeariaEndereco(String(minha.endereco || ''))
        setBarbeariaLogoUrl(String(minha.logo_url || ''))

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          if (url.searchParams.get('barbearia') !== id) {
            url.searchParams.set('barbearia', id)
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
          }
        }

        await carregar(id)
      } catch (error: any) {
        setErro(error?.message || 'Falha ao preparar o estoque.')
        setLoading(false)
      }
    }

    iniciar()
  }, [authLoading, isAuthenticated, user?.id])

  useEffect(() => {
    if (!barbeariaId) return
    const timeout = window.setTimeout(() => {
      carregar(barbeariaId, true)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [busca, filtro, barbeariaId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    setAlertasEstoqueAtivos(window.localStorage.getItem(ESTOQUE_ALERTAS_STORAGE_KEY) === '1')
    setPermissaoNotificacao('Notification' in window ? Notification.permission : 'unsupported')
  }, [])

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !alertasEstoqueAtivos ||
      permissaoNotificacao !== 'granted' ||
      !('Notification' in window) ||
      itensCriticos.length === 0 ||
      loading
    ) {
      return
    }

    const fingerprint = itensCriticos
      .map((produto) => `${produto.id}:${produto.estoque_atual}:${produto.estoque_minimo}`)
      .join('|')

    if (!fingerprint || fingerprint === estoqueCriticoNotificadoRef.current) {
      return
    }

    estoqueCriticoNotificadoRef.current = fingerprint

    if (document.visibilityState === 'visible') {
      return
    }

    const destaque = itensCriticos.slice(0, 2).map((produto) => produto.nome).join(', ')
    const descricao = itensCriticos.length > 2
      ? `${destaque} e mais ${itensCriticos.length - 2} item(ns) chegaram no limite mínimo.`
      : `${destaque} chegaram no limite mínimo ou acabaram.`

    const notificacao = new Notification('Reposição de estoque', {
      body: descricao,
      icon: '/logo.png',
      tag: 'soubarbeiro-estoque-baixo',
    })

    notificacao.onclick = () => {
      window.focus()
      notificacao.close()
    }
  }, [alertasEstoqueAtivos, itensCriticos, loading, permissaoNotificacao])

  const alternarAlertasEstoque = async () => {
    const proximoEstado = !alertasEstoqueAtivos
    setAlertasEstoqueAtivos(proximoEstado)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ESTOQUE_ALERTAS_STORAGE_KEY, proximoEstado ? '1' : '0')
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
  }

  const preencherForm = (produto?: Produto | null) => {
    if (!produto) {
      setProdutoEmEdicao(null)
      setForm(FORM_PADRAO)
      setMostrarAvancado(false)
      return
    }

    setProdutoEmEdicao(produto)
    setMostrarAvancado(Boolean(
      produto.sku
      || produto.fornecedor
      || produto.localizacao
      || produto.observacoes
    ))
    setForm({
      nome: produto.nome || '',
      sku: produto.sku || '',
      categoria: produto.categoria || '',
      quantidade_item: String(produto.quantidade_item ?? 1),
      unidade: produto.unidade || 'un',
      estoque_atual: String(produto.estoque_atual ?? 0),
      estoque_minimo: String(produto.estoque_minimo ?? 0),
      custo_unitario: String(produto.custo_unitario ?? 0),
      preco_venda: String(produto.preco_venda ?? 0),
      fornecedor: produto.fornecedor || '',
      localizacao: produto.localizacao || '',
      observacoes: produto.observacoes || '',
    })
  }

  const salvarProduto = async () => {
    if (!barbeariaId) return
    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      const payload = {
        ...form,
        quantidade_item: Number(form.quantidade_item || 0),
        estoque_atual: Number(form.estoque_atual || 0),
        estoque_minimo: Number(form.estoque_minimo || 0),
        custo_unitario: Number(form.custo_unitario || 0),
        preco_venda: Number(form.preco_venda || 0),
      }

      if (produtoEmEdicao?.id) {
        await ApiService.updateEstoqueProduto(produtoEmEdicao.id, payload)
        setSucesso('Produto atualizado no estoque.')
      } else {
        await ApiService.createEstoqueProduto(barbeariaId, payload)
        setSucesso('Produto cadastrado no estoque.')
      }

      preencherForm(null)
      await carregar(barbeariaId, true)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar o produto.')
    } finally {
      setSalvando(false)
    }
  }

  const arquivarProduto = async (produto: Produto) => {
    if (!confirm(`Inativar ${produto.nome}? O item sai da lista operacional, mas o histórico continua salvo.`)) return
    try {
      setErro('')
      setSucesso('')
      await ApiService.deleteEstoqueProduto(produto.id)
      setSucesso('Item inativado na operação.')
      await carregar(barbeariaId, true)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível inativar o item.')
    }
  }

  const registrarMovimento = async () => {
    if (!movimentoProduto?.id) return
    try {
      setMovimentando(true)
      setErro('')
      setSucesso('')

      await ApiService.createEstoqueMovimentacao(movimentoProduto.id, {
        ...movimentoForm,
        quantidade: Number(movimentoForm.quantidade || 0),
        estoque_final: movimentoForm.estoque_final ? Number(movimentoForm.estoque_final) : undefined,
        custo_unitario: Number(movimentoForm.custo_unitario || 0),
      })

      setSucesso('Movimentação registrada com sucesso.')
      setMovimentoProduto(null)
      setMovimentoForm(MOVIMENTO_PADRAO)
      await carregar(barbeariaId, true)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível registrar a movimentação.')
    } finally {
      setMovimentando(false)
    }
  }

  const exportarMovimentacoesPdf = async () => {
    if (!barbeariaId) return

    try {
      setExportandoPdf(true)
      setErro('')

      const resposta = await ApiService.listEstoqueMovimentacoes(barbeariaId, { limit: 500 })
      const lista = Array.isArray(resposta?.movimentacoes) ? resposta.movimentacoes : []

      if (lista.length === 0) {
        setErro('Ainda não há movimentações para exportar em PDF.')
        return
      }

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])

      const autoTable = autoTableModule.default
      const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const logoDataUrl = barbeariaLogoUrl ? await carregarImagemComoDataUrl(barbeariaLogoUrl).catch(() => '') : ''
      const larguraPagina = documento.internal.pageSize.getWidth()
      const alturaPagina = documento.internal.pageSize.getHeight()
      const margem = 14
      const larguraUtil = larguraPagina - margem * 2
      const vendas = lista.filter((item) => String(item.tipo || '').toLowerCase() === 'venda')
      const entradas = lista.filter((item) => ['entrada', 'compra'].includes(String(item.tipo || '').toLowerCase()))
      const saidas = lista.filter((item) => ['saida', 'consumo', 'perda', 'ajuste'].includes(String(item.tipo || '').toLowerCase()))
      const valorVendido = vendas.reduce((acc, item) => acc + Number(item.valor_total || 0), 0)
      const ultimaMovimentacao = lista[0]

      const cabecalho = desenharCabecalhoPdf({
        documento,
        margem,
        larguraPagina,
        titulo: 'Extrato de Movimentações do Estoque',
        subtitulo: 'Relatório operacional para auditoria de entradas, saídas, vendas e ajustes do estoque da barbearia.',
        estabelecimentoNome: barbeariaNome || 'O Corte Certo',
        estabelecimentoEndereco: barbeariaEndereco || '',
        logoDataUrl,
        fallbackIniciais: iniciaisLoja(barbeariaNome || 'O Corte Certo'),
        chips: [
          { label: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`, tone: 'accent' },
          { label: `${lista.length} registro(s)` },
          { label: `Última movimentação: ${formatarDataHora(ultimaMovimentacao?.movimentado_em || ultimaMovimentacao?.created_at)}`, tone: 'light' },
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
        titulo: 'Registros exportados',
        valor: formatarNumero(lista.length),
        subtitulo: 'Base completa do relatório',
        tone: 'dark',
      })
      desenharCardResumoPdf({
        documento,
        x: margem + cardWidth + cardGap,
        y: cardY,
        largura: cardWidth,
        titulo: 'Vendas registradas',
        valor: formatarNumero(vendas.length),
        subtitulo: formatarMoeda(valorVendido),
        tone: 'accent',
      })
      desenharCardResumoPdf({
        documento,
        x: margem + (cardWidth + cardGap) * 2,
        y: cardY,
        largura: cardWidth,
        titulo: 'Entradas e compras',
        valor: formatarNumero(entradas.length),
        subtitulo: 'Reposição do estoque',
        tone: 'light',
      })
      desenharCardResumoPdf({
        documento,
        x: margem + (cardWidth + cardGap) * 3,
        y: cardY,
        largura: cardWidth,
        titulo: 'Saídas e ajustes',
        valor: formatarNumero(saidas.length),
        subtitulo: 'Consumo operacional',
        tone: 'light',
      })

      autoTable(documento, {
        startY: cardY + 30,
        head: [['Data', 'Item', 'Tipo', 'Qtd', 'Unitário', 'Total', 'Contexto']],
        body: lista.map((item) => ([
          formatarDataHora(item.movimentado_em || item.created_at),
          item.produto_nome || 'Produto',
          item.tipo,
          formatarNumero(item.quantidade),
          item.preco_unitario !== null && item.preco_unitario !== undefined
            ? formatarMoeda(Number(item.preco_unitario || 0))
            : item.custo_unitario !== null && item.custo_unitario !== undefined
              ? formatarMoeda(Number(item.custo_unitario || 0))
              : '-',
          item.valor_total !== null && item.valor_total !== undefined ? formatarMoeda(Number(item.valor_total || 0)) : '-',
          item.profissional_nome || item.motivo || item.observacoes || item.produto_categoria || '-',
        ])),
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 3.2,
          textColor: [24, 24, 27],
          lineColor: [228, 228, 231],
          valign: 'middle',
        },
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [244, 244, 245],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 36 },
          2: { cellWidth: 20 },
          3: { cellWidth: 14, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 34 },
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
          rodapeEsquerda: barbeariaNome || 'O Corte Certo',
          rodapeCentro: 'Extrato de estoque • ocortecerto.com',
        })
      }

      documento.save(`${normalizarNomeArquivo(barbeariaNome || 'soubarbeiro')}-estoque-movimentacoes.pdf`)
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível exportar o PDF das movimentações.')
    } finally {
      setExportandoPdf(false)
    }
  }

  if (authLoading || authRedirecting || !isAuthenticated) {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center">Carregando...</main>
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">O Corte Certo</p>
            <h1 className="mt-2 text-xl font-semibold sm:text-2xl">Estoque da barbearia</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => barbeariaId && carregar(barbeariaId, true)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
            <Link href="/barbearia" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
              Voltar ao painel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Produtos ativos', formatarNumero(resumo.total_produtos), 'Itens controlados na operação'],
              ['Estoque baixo', formatarNumero(resumo.estoque_baixo), 'Itens no limite mínimo'],
              ['Sem estoque', formatarNumero(resumo.sem_estoque), 'Reposição urgente'],
              ['Valor em estoque', formatarMoeda(Number(resumo.valor_total_estoque || 0)), 'Baseado no custo unitário'],
            ].map(([titulo, valor, descricao]) => (
              <div key={titulo} className="rounded-3xl border border-white/10 bg-zinc-950/90 p-5">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">{titulo}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{valor}</p>
                <p className="mt-2 text-sm text-zinc-400">{descricao}</p>
              </div>
            ))}
          </div>

          {erro && <div className="rounded-3xl border border-red-500/35 bg-red-500/10 px-5 py-4 text-sm text-red-200">{erro}</div>}
          {sucesso && <div className="rounded-3xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">{sucesso}</div>}
          {itensCriticos.length > 0 && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-100">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {resumo.sem_estoque > 0
                      ? `${formatarNumero(resumo.sem_estoque)} item(ns) sem estoque e ${formatarNumero(Math.max(0, resumo.estoque_baixo - resumo.sem_estoque))} em alerta`
                      : `${formatarNumero(resumo.estoque_baixo)} item(ns) no ponto de reposição`}
                  </p>
                  <p className="mt-1 text-sm text-amber-50/90">
                    O campo "Avisar quando chegar em" funciona como ponto de reposição. Estado atual: {resumoPermissaoNotificacao}.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltro(resumo.sem_estoque > 0 ? 'out' : 'low')}
                    className="rounded-full border border-amber-300/30 bg-black/20 px-4 py-2 text-sm text-amber-50 transition hover:bg-black/35"
                  >
                    Ver itens críticos
                  </button>
                  <button
                    onClick={() => void alternarAlertasEstoque()}
                    className="rounded-full border border-white/10 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
                  >
                    {alertasEstoqueAtivos ? 'Desativar alertas' : 'Ativar alertas'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-5">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Busca e monitoramento</p>
                    <p className="mt-1 text-lg font-semibold text-white">Acompanhe níveis, reposições e produtos críticos</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['todos', 'low', 'out'] as const).map((item) => (
                      <button key={item} onClick={() => setFiltro(item)} className={`rounded-full border px-3 py-1.5 text-xs ${filtro === item ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'}`}>
                        {item === 'todos' ? 'Todos' : item === 'low' ? 'Estoque baixo' : 'Sem estoque'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-zinc-500" />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, categoria ou fornecedor" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-400">Produtos</p>
                    <h2 className="mt-1 text-lg font-semibold">Lista operacional</h2>
                  </div>
                  <button onClick={() => preencherForm(null)} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                    <Plus className="h-4 w-4" />
                    Novo item
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {loading && <div className="text-sm text-zinc-400">Carregando estoque...</div>}
                  {!loading && produtos.length === 0 && <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-400">Nenhum item cadastrado ainda.</div>}
                  {produtos.map((produto) => (
                    <article key={produto.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-base font-semibold text-white">{produto.nome}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {[obterLabelCategoria(produto.categoria), formatarQuantidadeItem(produto.quantidade_item, produto.unidade), produto.sku ? `Código ${produto.sku}` : null]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {produto.sem_estoque ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200">Sem estoque</span> : null}
                            {!produto.sem_estoque && produto.estoque_baixo ? <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">Abaixo do mínimo</span> : null}
                            <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-zinc-300">Atual {formatarNumero(produto.estoque_atual)}</span>
                            <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-zinc-300">Mínimo {formatarNumero(produto.estoque_minimo)}</span>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <button onClick={() => preencherForm(produto)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"><PencilLine className="h-4 w-4" />Editar</button>
                          <button onClick={() => { setMovimentoProduto(produto); setMovimentoForm(MOVIMENTO_PADRAO) }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-500/15"><Boxes className="h-4 w-4" />Movimentar</button>
                          <button onClick={() => arquivarProduto(produto)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10 sm:col-span-2">Inativar item</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-sm text-zinc-400">{produtoEmEdicao ? 'Editar item' : 'Novo item'}</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{produtoEmEdicao ? produtoEmEdicao.nome : 'Cadastro rápido do estoque'}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Comece com o básico. Código interno, fornecedor e outros detalhes podem ficar para depois.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                  <label className="text-sm text-zinc-300 md:col-span-2 xl:col-span-5">
                    <span className="mb-2 block text-zinc-500">Nome do item</span>
                    <input
                      value={form.nome}
                      onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex.: Pomada modeladora"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </label>
                  <div className="text-sm text-zinc-300 xl:col-span-4">
                    <span className="mb-2 block text-zinc-500">Categoria</span>
                    <CustomDropdown
                      value={form.categoria}
                      onChange={(value) => setForm((prev) => ({ ...prev, categoria: value }))}
                      options={categoriasDisponiveis}
                      placeholder="Selecione uma categoria"
                    />
                  </div>
                  <label className="text-sm text-zinc-300 xl:col-span-3">
                    <span className="mb-2 block text-zinc-500">Quantidade do item</span>
                    <input
                      value={form.quantidade_item}
                      onChange={(e) => setForm((prev) => ({ ...prev, quantidade_item: e.target.value }))}
                      inputMode="decimal"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </label>
                  <div className="text-sm text-zinc-300 xl:col-span-3">
                    <span className="mb-2 block text-zinc-500">Unidade</span>
                    <CustomDropdown
                      value={form.unidade}
                      onChange={(value) => setForm((prev) => ({ ...prev, unidade: value }))}
                      options={UNIDADES_DISPONIVEIS}
                      placeholder="Unidade"
                    />
                  </div>
                  <label className="text-sm text-zinc-300 xl:col-span-3">
                    <span className="mb-2 block text-zinc-500">{produtoEmEdicao ? 'Estoque atual' : 'Estoque inicial'}</span>
                    <input
                      value={form.estoque_atual}
                      onChange={(e) => setForm((prev) => ({ ...prev, estoque_atual: e.target.value }))}
                      inputMode="decimal"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </label>
                  <label className="text-sm text-zinc-300 xl:col-span-3">
                    <span className="mb-2 block text-zinc-500">Avisar quando chegar em</span>
                    <input
                      value={form.estoque_minimo}
                      onChange={(e) => setForm((prev) => ({ ...prev, estoque_minimo: e.target.value }))}
                      inputMode="decimal"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </label>
                  <label className="text-sm text-zinc-300 xl:col-span-3">
                    <span className="mb-2 block text-zinc-500">Custo unitário</span>
                    <input
                      value={form.custo_unitario}
                      onChange={(e) => setForm((prev) => ({ ...prev, custo_unitario: e.target.value }))}
                      inputMode="decimal"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </label>
                  <label className="text-sm text-zinc-300 xl:col-span-3">
                    <span className="mb-2 block text-zinc-500">Preço de venda</span>
                    <input
                      value={form.preco_venda}
                      onChange={(e) => setForm((prev) => ({ ...prev, preco_venda: e.target.value }))}
                      inputMode="decimal"
                      className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                  </label>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <button
                    type="button"
                    onClick={() => setMostrarAvancado((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Informações extras</p>
                      <p className="mt-1 text-xs text-zinc-500">Opcional. Use só se fizer sentido para a sua operação.</p>
                    </div>
                    {mostrarAvancado ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </button>

                  {mostrarAvancado && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-zinc-300">
                        <span className="mb-2 block text-zinc-500">Código interno</span>
                        <input
                          value={form.sku}
                          onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                          placeholder="Opcional"
                          className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                        />
                      </label>
                      <label className="text-sm text-zinc-300">
                        <span className="mb-2 block text-zinc-500">Fornecedor</span>
                        <input
                          value={form.fornecedor}
                          onChange={(e) => setForm((prev) => ({ ...prev, fornecedor: e.target.value }))}
                          placeholder="Opcional"
                          className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                        />
                      </label>
                      <label className="text-sm text-zinc-300">
                        <span className="mb-2 block text-zinc-500">Onde está guardado</span>
                        <input
                          value={form.localizacao}
                          onChange={(e) => setForm((prev) => ({ ...prev, localizacao: e.target.value }))}
                          placeholder="Ex.: Armário do caixa"
                          className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                        />
                      </label>
                      <label className="text-sm text-zinc-300 sm:col-span-2">
                        <span className="mb-2 block text-zinc-500">Observações</span>
                        <textarea
                          value={form.observacoes}
                          onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                          rows={4}
                          placeholder="Opcional"
                          className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button onClick={salvarProduto} disabled={salvando} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-60">{salvando ? 'Salvando...' : produtoEmEdicao ? 'Salvar mudanças' : 'Cadastrar item'}</button>
                  {produtoEmEdicao ? (
                    <button onClick={() => preencherForm(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button>
                  ) : null}
                  <button onClick={() => preencherForm(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900">Limpar</button>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  {produtoEmEdicao
                    ? 'Ao alterar o estoque atual, o sistema registra um ajuste no histórico automaticamente.'
                    : 'Você pode cadastrar o básico agora e completar os detalhes depois. O estoque inicial vira a primeira entrada do item no histórico.'}
                </p>
              </section>

              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300"><ShieldCheck className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm text-zinc-400">Boas práticas</p>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                      <li>Cadastre nome, categoria, quantidade do item e unidade para identificar rapidamente o que está em mãos.</li>
                      <li>Use o campo de alerta como ponto de reposição para agir antes da ruptura de estoque.</li>
                      <li>Mantenha custo unitário e preço de venda atualizados para enxergar margem e necessidade de compra.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-400">Movimentações recentes</p>
                    <h2 className="mt-1 text-lg font-semibold">Últimos lançamentos</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportarMovimentacoesPdf}
                      disabled={exportandoPdf}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {exportandoPdf ? 'Exportando...' : 'Exportar PDF'}
                    </button>
                    <TriangleAlert className="h-5 w-5 text-amber-300" />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {movimentacoes.length === 0 && <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-400">Sem movimentações registradas.</div>}
                  {movimentacoes.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="text-sm font-medium text-white">{item.produto_nome || 'Produto'}</p>
                      <p className="mt-1 text-sm text-zinc-400">{item.tipo} • {formatarNumero(item.quantidade)} unidade(s)</p>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>

      {movimentoProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Movimentar item</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{movimentoProduto.nome}</h3>
                <p className="mt-1 text-sm text-zinc-500">Estoque atual: {formatarNumero(movimentoProduto.estoque_atual)}</p>
              </div>
              <button onClick={() => setMovimentoProduto(null)} className="text-zinc-400 hover:text-white">Fechar</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="text-sm text-zinc-300">
                <span className="mb-2 block text-zinc-500">Tipo</span>
                <CustomDropdown
                  value={movimentoForm.tipo}
                  onChange={(value) => setMovimentoForm((prev) => ({ ...prev, tipo: value }))}
                  options={MOVIMENTO_TIPOS}
                  placeholder="Selecione um tipo"
                />
              </div>
              <label className="text-sm text-zinc-300">
                <span className="mb-2 block text-zinc-500">Quantidade</span>
                <input value={movimentoForm.quantidade} onChange={(e) => setMovimentoForm((prev) => ({ ...prev, quantidade: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none" />
              </label>
              {movimentoForm.tipo === 'ajuste' && (
                <label className="text-sm text-zinc-300 sm:col-span-2">
                  <span className="mb-2 block text-zinc-500">Estoque final desejado</span>
                  <input value={movimentoForm.estoque_final} onChange={(e) => setMovimentoForm((prev) => ({ ...prev, estoque_final: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none" />
                </label>
              )}
              <label className="text-sm text-zinc-300">
                <span className="mb-2 block text-zinc-500">Custo unitário</span>
                <input value={movimentoForm.custo_unitario} onChange={(e) => setMovimentoForm((prev) => ({ ...prev, custo_unitario: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none" />
              </label>
              <label className="text-sm text-zinc-300">
                <span className="mb-2 block text-zinc-500">Motivo</span>
                <input value={movimentoForm.motivo} onChange={(e) => setMovimentoForm((prev) => ({ ...prev, motivo: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none" />
              </label>
              <label className="text-sm text-zinc-300 sm:col-span-2">
                <span className="mb-2 block text-zinc-500">Observações</span>
                <textarea value={movimentoForm.observacoes} onChange={(e) => setMovimentoForm((prev) => ({ ...prev, observacoes: e.target.value }))} rows={3} className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none" />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={registrarMovimento} disabled={movimentando} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-60">
                <Package2 className="h-4 w-4" />
                {movimentando ? 'Registrando...' : 'Salvar movimentação'}
              </button>
              <button onClick={() => setMovimentoProduto(null)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
