import { redirect } from 'next/navigation'

export default function BarbeariaLegacyRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/barberia/${params.id}`)
}
