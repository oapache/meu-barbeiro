export type TipoServicoCatalog =
  | 'cabelo'
  | 'barba'
  | 'sobrancelha'
  | 'cabelo_sobrancelha'
  | 'cabelo_barba'
  | 'corte_feminino'
  | 'corte_afro'
  | 'corte_infantil'
  | 'luzes'
  | 'pacote'
  | 'sem_foto'

type ServiceOption = {
  value: TipoServicoCatalog
  label: string
  image: string | null
}

export const NO_SERVICE_IMAGE_SENTINEL = '__NO_SERVICE_IMAGE__'

export const SERVICE_OPTIONS: ServiceOption[] = [
  { value: 'cabelo', label: 'Cabelo', image: '/service-icons/cabelo.png' },
  { value: 'barba', label: 'Barba', image: '/service-icons/barba.png' },
  { value: 'sobrancelha', label: 'Sobrancelha', image: '/service-icons/sobrancelha.png' },
  { value: 'cabelo_sobrancelha', label: 'Cabelo + Sobrancelha', image: '/service-icons/cabelo-sobrancelha.png' },
  { value: 'cabelo_barba', label: 'Cabelo + Barba', image: '/service-icons/cabelo-barba.png' },
  { value: 'corte_feminino', label: 'Corte Feminino', image: '/service-icons/corte-feminino.png' },
  { value: 'corte_afro', label: 'Corte Afro', image: '/service-icons/corte-afro.png' },
  { value: 'corte_infantil', label: 'Corte Infantil', image: '/service-icons/corte-infantil.png' },
  { value: 'luzes', label: 'Luzes', image: '/service-icons/luzes.png' },
  { value: 'pacote', label: 'Pacote', image: '/service-icons/pacote.png' },
  { value: 'sem_foto', label: 'Sem foto', image: null },
]

export const SERVICE_BY_TYPE = Object.fromEntries(
  SERVICE_OPTIONS.map((item) => [item.value, { nome: item.label, imagem: item.image }])
) as Record<TipoServicoCatalog, { nome: string; imagem: string | null }>

const normalizeServiceText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const getServiceTypeByImage = (imageUrl?: string | null) => {
  if (imageUrl === NO_SERVICE_IMAGE_SENTINEL) return 'sem_foto'
  if (!imageUrl) return null
  const match = SERVICE_OPTIONS.find((item) => item.image === imageUrl)
  return match?.value || null
}

export const inferServiceTypeByName = (name: string): TipoServicoCatalog => {
  const normalized = normalizeServiceText(name)

  if ((normalized.includes('cabelo') || normalized.includes('corte')) && normalized.includes('barba')) return 'cabelo_barba'
  if ((normalized.includes('cabelo') || normalized.includes('corte')) && normalized.includes('sobrancelha')) return 'cabelo_sobrancelha'
  if (normalized.includes('feminino') || normalized.includes('femenino')) return 'corte_feminino'
  if (normalized.includes('afro')) return 'corte_afro'
  if (normalized.includes('infantil') || normalized.includes('crianca') || normalized.includes('kids')) return 'corte_infantil'
  if (normalized.includes('luzes')) return 'luzes'
  if (normalized.includes('pacote') || normalized.includes('combo')) return 'pacote'
  if (normalized.includes('sobrancelha')) return 'sobrancelha'
  if (normalized.includes('barba')) return 'barba'
  if (normalized.includes('cabelo') || normalized.includes('corte')) return 'cabelo'
  return 'cabelo'
}

export const inferServiceType = (name: string, imageUrl?: string | null): TipoServicoCatalog => {
  return getServiceTypeByImage(imageUrl) || inferServiceTypeByName(name)
}

export const getServiceImageByName = (name: string, imageUrl?: string | null) => {
  return SERVICE_BY_TYPE[inferServiceType(name, imageUrl)].imagem
}

export const getServiceImageValueForSave = (type: TipoServicoCatalog) => {
  return type === 'sem_foto' ? NO_SERVICE_IMAGE_SENTINEL : SERVICE_BY_TYPE[type].imagem
}

export const getServiceNameForTypeChange = (
  currentName: string,
  currentType: TipoServicoCatalog,
  nextType: TipoServicoCatalog
) => {
  const trimmed = String(currentName || '').trim()
  const nextDefaultName = SERVICE_BY_TYPE[nextType].nome

  if (!trimmed) return nextDefaultName

  const currentDefaultName = SERVICE_BY_TYPE[currentType]?.nome || ''
  if (trimmed === currentDefaultName) return nextDefaultName

  return trimmed
}
