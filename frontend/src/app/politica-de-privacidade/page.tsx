import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade | O Corte Certo',
  description: 'Política de Privacidade e tratamento de dados pessoais do O Corte Certo.',
}

const secoes = [
  {
    title: '1. Quem somos',
    body: [
      'O Corte Certo é uma plataforma para busca de barbearias, gestão de agenda, atendimento por WhatsApp e relacionamento entre clientes, barbeiros e barbearias.',
      'Para fins da LGPD, tratamos dados pessoais conforme o papel exercido em cada operação, podendo atuar como controlador ou operador a depender do serviço usado pela barbearia.',
    ],
  },
  {
    title: '2. Dados que podemos tratar',
    body: [
      'Podemos tratar dados de cadastro, como nome, e-mail, telefone, senha protegida por hash, tipo de usuário e preferências da conta.',
      'Também podemos tratar dados de barbearias, serviços, profissionais, agenda, histórico de agendamentos, avaliações, mensagens do chatbot, identificadores técnicos, IP, dispositivo, registros de acesso e informações necessárias para pagamentos.',
    ],
  },
  {
    title: '3. Finalidades do tratamento',
    body: [
      'Usamos dados pessoais para criar e proteger contas, autenticar usuários, exibir barbearias, viabilizar agendamentos, enviar confirmações, operar o bot do WhatsApp, prestar suporte e melhorar a plataforma.',
      'Também podemos usar dados para cumprir obrigações legais, prevenir fraudes, auditar consentimentos, processar cobranças e manter a segurança dos serviços.',
    ],
  },
  {
    title: '4. Bases legais',
    body: [
      'Tratamos dados com base na execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal, exercício regular de direitos, legítimo interesse e consentimento quando ele for necessário.',
      'Quando o tratamento depender de consentimento, ele será solicitado de forma destacada, livre, informada e poderá ser revogado pelos canais de contato da plataforma.',
    ],
  },
  {
    title: '5. Compartilhamento',
    body: [
      'Dados podem ser compartilhados com barbearias envolvidas no atendimento, provedores de hospedagem, banco de dados, mensageria, pagamentos, análise técnica, segurança e ferramentas necessárias para operar o serviço.',
      'Quando uma barbearia usa o bot do WhatsApp, mensagens e metadados necessários ao atendimento podem transitar por provedores vinculados à conexão do WhatsApp e à infraestrutura da plataforma.',
    ],
  },
  {
    title: '6. Retenção e descarte',
    body: [
      'Mantemos dados pelo tempo necessário para cumprir as finalidades informadas, obrigações legais, prevenção de fraudes, auditoria de consentimentos e exercício regular de direitos.',
      'Quando os dados deixarem de ser necessários, poderemos eliminá-los, anonimizá-los ou mantê-los apenas quando houver base legal aplicável.',
    ],
  },
  {
    title: '7. Segurança',
    body: [
      'Adotamos medidas técnicas e administrativas para proteger dados pessoais contra acessos não autorizados, perda, alteração, divulgação indevida ou uso inadequado.',
      'Nenhuma plataforma é imune a riscos. Caso identifiquemos incidente relevante envolvendo dados pessoais, adotaremos as providências cabíveis conforme a LGPD.',
    ],
  },
]

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16 sm:px-8 lg:px-10">
        <div className="space-y-5">
          <Link href="/" className="text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200">
            O Corte Certo
          </Link>
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Documento legal</p>
            <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">Política de Privacidade</h1>
            <p className="max-w-3xl text-base leading-8 text-zinc-300">
              Esta Política explica como o O Corte Certo trata dados pessoais de acordo com a Lei Geral de
              Proteção de Dados Pessoais (LGPD). Última atualização: 23/05/2026.
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
            <h2 className="text-xl font-semibold text-white">8. Seus direitos pela LGPD</h2>
            <p className="text-base leading-8 text-zinc-300">
              Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio,
              eliminação, portabilidade, informação sobre compartilhamento e revisão de decisões automatizadas
              quando aplicável.
            </p>
            <p className="text-base leading-8 text-zinc-300">
              Você também pode revogar consentimentos e apresentar reclamação à Autoridade Nacional de Proteção
              de Dados (ANPD), observadas as condições previstas em lei.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-7">
            <h2 className="text-xl font-semibold text-white">9. Cookies e registros técnicos</h2>
            <p className="text-base leading-8 text-zinc-300">
              Podemos usar cookies, armazenamento local e registros técnicos para manter sessão, lembrar
              preferências, medir estabilidade, prevenir abusos e melhorar a experiência.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-7">
            <h2 className="text-xl font-semibold text-white">10. Contato</h2>
            <p className="text-base leading-8 text-zinc-300">
              Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo e-mail
              contato@ocortecerto.com. Responderemos dentro de prazo razoável e poderemos solicitar informações
              adicionais para confirmar sua identidade.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
