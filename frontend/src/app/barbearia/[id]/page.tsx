import { redirect } from 'next/navigation'

export default async function BarbeariaLegacyRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/barberia/${id}`)
}
