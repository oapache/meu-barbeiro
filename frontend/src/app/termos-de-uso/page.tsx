import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso | O Corte Certo',
  description: 'Termos de Uso da plataforma O Corte Certo.',
}

const secoes = [
  {
    title: '1. Aceite dos Termos',
    body: [
      'Ao criar uma conta ou usar o O Corte Certo, você declara que leu e aceitou estes Termos de Uso e a Política de Privacidade.',
      'Se você estiver usando a plataforma em nome de uma barbearia, declara que tem autorização para cadastrar e administrar as informações desse negócio.',
    ],
  },
  {
    title: '2. Conta e responsabilidades',
    body: [
      'Você deve fornecer dados verdadeiros, manter suas credenciais protegidas e avisar a equipe do O Corte Certo se identificar uso indevido da sua conta.',
      'Barbearias são responsáveis por manter serviços, preços, horários, profissionais, endereço, regras de remarcação e canais de atendimento atualizados.',
    ],
  },
  {
    title: '3. Agendamentos, remarcações e cancelamentos',
    body: [
      'A plataforma organiza solicitações de agendamento entre clientes e barbearias. A execução do serviço é de responsabilidade da barbearia cadastrada.',
      'Remarcações e cancelamentos podem seguir regras da barbearia, disponibilidade de agenda e confirmação operacional pelo painel ou pelo WhatsApp conectado.',
    ],
  },
  {
    title: '4. WhatsApp e automações',
    body: [
      'Quando a barbearia conecta o bot do WhatsApp, mensagens de clientes podem ser processadas para atendimento, triagem, agendamento, remarcação e suporte.',
      'A barbearia deve usar o recurso de forma lícita, respeitar seus clientes e não enviar conteúdo abusivo, enganoso, discriminatório ou proibido por lei.',
    ],
  },
  {
    title: '5. Pagamentos e assinaturas',
    body: [
      'Planos pagos, testes gratuitos, cobranças, notas e meios de pagamento podem ser processados por provedores externos, como Stripe, conforme regras apresentadas no momento da contratação.',
      'A falta de pagamento, o fim do teste gratuito ou irregularidades no plano podem limitar recursos premium, incluindo automações do WhatsApp.',
    ],
  },
  {
    title: '6. Uso permitido',
    body: [
      'Você não deve tentar acessar contas de terceiros, explorar falhas, interferir nos serviços, copiar a plataforma sem autorização ou usar o sistema para fraudes.',
      'Podemos suspender ou limitar contas quando houver risco de segurança, violação destes Termos, ordem legal ou uso que prejudique clientes, barbearias ou a plataforma.',
    ],
  },
  {
    title: '7. Disponibilidade e alterações',
    body: [
      'Trabalhamos para manter o serviço disponível, mas instabilidades, manutenções, provedores externos e limitações técnicas podem afetar funcionalidades temporariamente.',
      'Estes Termos podem ser atualizados. Alterações relevantes serão comunicadas por meios razoáveis, e a continuidade de uso poderá depender de novo aceite.',
    ],
  },
]

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16 sm:px-8 lg:px-10">
        <div className="space-y-5">
          <Link href="/" className="text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200">
            O Corte Certo
          </Link>
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Documento legal</p>
            <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">Termos de Uso</h1>
            <p className="max-w-3xl text-base leading-8 text-zinc-300">
              Estes Termos regulam o uso da plataforma O Corte Certo por clientes, barbeiros e barbearias.
              Última atualização: 23/05/2026.
            </p>
          </div>
        </div>

        <div className="space-y-9">
          {secoes.map((secao) => (
            <section key={secao.title} className="space-y-3 border-t border-white/10 pt-7">
              <h2 className="text-xl font-semibold text-white">{secao.title}</h2>
              {secao.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-zinc-300">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section className="space-y-3 border-t border-white/10 pt-7">
            <h2 className="text-xl font-semibold text-white">8. Privacidade e LGPD</h2>
            <p className="text-base leading-8 text-zinc-300">
              O tratamento de dados pessoais é descrito na{' '}
              <Link href="/politica-de-privacidade" className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                Política de Privacidade
              </Link>
              , que integra estes Termos.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-7">
            <h2 className="text-xl font-semibold text-white">9. Contato</h2>
            <p className="text-base leading-8 text-zinc-300">
              Para dúvidas sobre estes Termos, privacidade ou solicitações relacionadas à sua conta, entre em
              contato pelo e-mail contato@ocortecerto.com.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
