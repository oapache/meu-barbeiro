type PdfChip = {
  label: string
  tone?: 'dark' | 'accent' | 'light'
}

type PdfHeaderOptions = {
  documento: any
  margem: number
  topo?: number
  larguraPagina: number
  titulo: string
  subtitulo?: string
  estabelecimentoNome?: string
  estabelecimentoEndereco?: string
  logoDataUrl?: string
  fallbackIniciais?: string
  chips?: PdfChip[]
  accentColor?: [number, number, number]
}

type PdfFooterOptions = {
  documento: any
  pagina: number
  totalPaginas: number
  margem: number
  larguraPagina: number
  alturaPagina: number
  rodapeEsquerda?: string
  rodapeCentro?: string
}

type PdfSummaryCardOptions = {
  documento: any
  x: number
  y: number
  largura: number
  titulo: string
  valor: string
  subtitulo?: string
  tone?: 'accent' | 'dark' | 'light'
}

export const formatoImagemDataUrl = (dataUrl: string) => {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

export const carregarImagemComoDataUrl = async (url: string) => {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error('Não foi possível carregar a logo para o PDF.')
  const blob = await resposta.blob()

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao converter a imagem da logo.'))
    reader.readAsDataURL(blob)
  })
}

const drawChip = (documento: any, x: number, y: number, label: string, tone: 'dark' | 'accent' | 'light', accentColor: [number, number, number]) => {
  const paddingX = 3.2
  const paddingY = 2.4
  const width = documento.getTextWidth(label) + paddingX * 2
  const height = 6.8

  if (tone === 'accent') {
    documento.setFillColor(accentColor[0], accentColor[1], accentColor[2])
    documento.setTextColor(6, 10, 14)
  } else if (tone === 'light') {
    documento.setFillColor(255, 255, 255)
    documento.setTextColor(24, 24, 27)
  } else {
    documento.setFillColor(24, 24, 27)
    documento.setTextColor(244, 244, 245)
  }

  documento.roundedRect(x, y, width, height, 3, 3, 'F')
  documento.setFont('helvetica', 'bold')
  documento.setFontSize(8)
  documento.text(label, x + paddingX, y + paddingY + 2.1)
  return width
}

export const desenharCabecalhoPdf = ({
  documento,
  margem,
  topo = 14,
  larguraPagina,
  titulo,
  subtitulo = '',
  estabelecimentoNome = '',
  estabelecimentoEndereco = '',
  logoDataUrl = '',
  fallbackIniciais = 'SB',
  chips = [],
  accentColor = [16, 185, 129],
}: PdfHeaderOptions) => {
  const larguraUtil = larguraPagina - margem * 2
  const blocoY = topo
  const logoSize = 18
  const logoX = margem + 5
  const textoX = logoX + logoSize + 5
  const textoWidth = larguraUtil - 10 - logoSize - 7

  const subtituloLinhas = subtitulo
    ? documento.splitTextToSize(subtitulo, textoWidth)
    : []
  const enderecoLinhas = estabelecimentoEndereco
    ? documento.splitTextToSize(estabelecimentoEndereco, textoWidth)
    : []
  const topPadding = 10
  const bottomPadding = 9
  const titleHeight = 7
  const estabelecimentoHeight = estabelecimentoNome ? 5 : 0
  const subtituloHeight = subtituloLinhas.length > 0 ? subtituloLinhas.length * 4.2 : 0
  const enderecoHeight = enderecoLinhas.length > 0 ? 2 + (enderecoLinhas.length * 4.1) : 0
  const corpoAltura = Math.max(
    logoSize,
    titleHeight + estabelecimentoHeight + subtituloHeight + enderecoHeight
  )
  const cardHeight = Math.max(38, topPadding + corpoAltura + bottomPadding)

  documento.setFillColor(9, 9, 11)
  documento.roundedRect(margem, blocoY, larguraUtil, cardHeight, 8, 8, 'F')
  documento.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  documento.roundedRect(margem + 4, blocoY + 1.8, Math.max(0, larguraUtil - 8), 3.4, 2.5, 2.5, 'F')

  const logoY = blocoY + topPadding + Math.max(0, (corpoAltura - logoSize) / 2)
  const contentTopY = blocoY + topPadding

  if (logoDataUrl) {
    documento.addImage(logoDataUrl, formatoImagemDataUrl(logoDataUrl), logoX, logoY, logoSize, logoSize)
  } else {
    documento.setFillColor(24, 24, 27)
    documento.roundedRect(logoX, logoY, logoSize, logoSize, 4, 4, 'F')
    documento.setDrawColor(63, 63, 70)
    documento.roundedRect(logoX, logoY, logoSize, logoSize, 4, 4, 'S')
    documento.setFont('helvetica', 'bold')
    documento.setTextColor(255, 255, 255)
    documento.setFontSize(10)
    documento.text(String(fallbackIniciais || 'SB').slice(0, 2).toUpperCase(), logoX + logoSize / 2, logoY + 10.7, { align: 'center' })
  }

  documento.setFont('helvetica', 'bold')
  documento.setTextColor(255, 255, 255)
  documento.setFontSize(17)
  documento.text(titulo, textoX, contentTopY + 5)

  let cursorY = contentTopY + 10
  if (estabelecimentoNome) {
    documento.setFont('helvetica', 'bold')
    documento.setTextColor(167, 243, 208)
    documento.setFontSize(10)
    documento.text(estabelecimentoNome, textoX, cursorY)
    cursorY += 5
  }

  if (subtituloLinhas.length > 0) {
    documento.setFont('helvetica', 'normal')
    documento.setTextColor(212, 212, 216)
    documento.setFontSize(9)
    documento.text(subtituloLinhas, textoX, cursorY)
    cursorY += subtituloLinhas.length * 4.2
  }

  if (enderecoLinhas.length > 0) {
    documento.setFont('helvetica', 'normal')
    documento.setTextColor(161, 161, 170)
    documento.setFontSize(8.5)
    documento.text(enderecoLinhas, textoX, cursorY + 1)
  }

  let chipX = margem
  const chipY = blocoY + cardHeight + 6
  chips.forEach((chip) => {
    const larguraChip = drawChip(documento, chipX, chipY, chip.label, chip.tone || 'dark', accentColor)
    chipX += larguraChip + 2
  })

  return {
    cardBottomY: blocoY + cardHeight,
    chipsBottomY: chips.length > 0 ? chipY + 6.8 : blocoY + cardHeight,
  }
}

export const desenharCardResumoPdf = ({
  documento,
  x,
  y,
  largura,
  titulo,
  valor,
  subtitulo = '',
  tone = 'light',
}: PdfSummaryCardOptions) => {
  const fill = tone === 'accent' ? [236, 253, 245] : tone === 'dark' ? [24, 24, 27] : [250, 250, 250]
  const stroke = tone === 'accent' ? [167, 243, 208] : tone === 'dark' ? [39, 39, 42] : [228, 228, 231]
  const valueColor = tone === 'accent' ? [5, 150, 105] : tone === 'dark' ? [255, 255, 255] : [24, 24, 27]
  const titleColor = tone === 'dark' ? [161, 161, 170] : [113, 113, 122]
  const subtitleColor = tone === 'dark' ? [212, 212, 216] : [161, 161, 170]

  documento.setFillColor(fill[0], fill[1], fill[2])
  documento.setDrawColor(stroke[0], stroke[1], stroke[2])
  documento.roundedRect(x, y, largura, 24, 4, 4, 'FD')
  documento.setFont('helvetica', 'bold')
  documento.setTextColor(titleColor[0], titleColor[1], titleColor[2])
  documento.setFontSize(8)
  documento.text(titulo.toUpperCase(), x + 3, y + 5.5)
  documento.setFont('helvetica', 'bold')
  documento.setTextColor(valueColor[0], valueColor[1], valueColor[2])
  documento.setFontSize(12)
  documento.text(valor, x + 3, y + 13)
  documento.setFont('helvetica', 'normal')
  documento.setTextColor(subtitleColor[0], subtitleColor[1], subtitleColor[2])
  documento.setFontSize(8)
  documento.text(subtitulo, x + 3, y + 19)
}

export const desenharRodapePdf = ({
  documento,
  pagina,
  totalPaginas,
  margem,
  larguraPagina,
  alturaPagina,
  rodapeEsquerda = '',
  rodapeCentro = 'ocortecerto.com',
}: PdfFooterOptions) => {
  documento.setDrawColor(228, 228, 231)
  documento.line(margem, alturaPagina - 16, larguraPagina - margem, alturaPagina - 16)
  documento.setFont('helvetica', 'normal')
  documento.setTextColor(113, 113, 122)
  documento.setFontSize(8.5)
  if (rodapeEsquerda) {
    documento.text(rodapeEsquerda, margem, alturaPagina - 10)
  }
  documento.text(rodapeCentro, larguraPagina / 2, alturaPagina - 10, { align: 'center' })
  documento.text(`${pagina}/${totalPaginas}`, larguraPagina - margem, alturaPagina - 10, { align: 'right' })
}
