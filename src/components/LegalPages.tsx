import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Warning } from '@phosphor-icons/react'
import { legal } from '../legal/config'

function LegalLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main className="legal-wrap">
    {!legal.reviewed && <div className="legal-draft" role="note"><Warning weight="fill" /><span><strong>Rascunho em revisão.</strong> Este texto descreve como o Matchly funciona hoje, mas ainda não passou por revisão jurídica.</span></div>}
    <h1>{title}</h1>
    <p className="legal-meta">Última atualização: {legal.updatedAt}</p>
    <p className="legal-intro">{intro}</p>
    {children}
    <nav className="legal-links" aria-label="Documentos legais"><Link to="/termos">Termos de Uso</Link><Link to="/privacidade">Política de Privacidade</Link><Link to="/conta">Minha conta</Link></nav>
  </main>
}

const contact = () => legal.contactEmail
  ? <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>
  : <em>canal de contato a ser divulgado antes da abertura pública</em>

export function PrivacyPage() {
  return <LegalLayout title="Política de Privacidade" intro="Explicamos quais dados o Matchly trata, para quê, com quem compartilhamos e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).">
    <section><h2>1. Quem é o responsável</h2>
      <p>O controlador dos dados é {legal.controllerName ? <strong>{legal.controllerName}</strong> : <em>responsável pelo Matchly (identificação a ser divulgada antes da abertura pública)</em>}. Contato para assuntos de privacidade: {contact()}.</p></section>

    <section><h2>2. Quais dados tratamos</h2>
      <ul>
        <li><strong>Conta:</strong> e-mail e senha (a senha é guardada de forma protegida pelo provedor de autenticação; não temos acesso a ela).</li>
        <li><strong>Currículo:</strong> nome do arquivo e todo o texto extraído dele (PDF ou DOCX). O texto pode conter dados pessoais como nome, telefone, endereço, histórico profissional e formação.</li>
        <li><strong>Vaga:</strong> o texto da descrição que você cola.</li>
        <li><strong>Resultados:</strong> nota de aderência, pontos fortes, lacunas, palavras-chave, currículo otimizado e carta de apresentação gerados para você.</li>
        <li><strong>Respostas suas:</strong> os fatos que você informa para cobrir lacunas da vaga.</li>
        <li><strong>Uso:</strong> data e tipo de cada análise, otimização ou carta, usados para aplicar limites diários.</li>
        <li><strong>Dados técnicos de acesso:</strong> endereço IP e navegador, registrados pelos provedores de infraestrutura para segurança e funcionamento.</li>
      </ul>
      <p>Não coletamos dados sensíveis de propósito. Se o seu currículo contiver algum (por exemplo, informação de saúde ou filiação), ele será tratado como o restante do texto. Considere removê-lo antes de enviar.</p></section>

    <section><h2>3. Para que usamos e em que base legal</h2>
      <ul>
        <li><strong>Prestar o serviço</strong> (analisar, otimizar o currículo e escrever a carta) — execução do serviço que você solicita.</li>
        <li><strong>Manter o histórico</strong> para você revisitar suas análises — execução do serviço.</li>
        <li><strong>Segurança e limites de uso</strong> (evitar abuso e controlar custos) — legítimo interesse.</li>
        <li><strong>Cumprir obrigações legais</strong>, quando aplicável.</li>
      </ul>
      <p>Não vendemos seus dados, não usamos seu currículo para publicidade e não tomamos decisões automatizadas sobre você. Os resultados são sugestões para você revisar.</p></section>

    <section><h2>4. Inteligência artificial</h2>
      <p>Para gerar os resultados, enviamos o texto do seu currículo, o texto da vaga e as respostas que você deu à API Gemini, do Google. O envio acontece apenas quando você pede uma análise, uma otimização ou uma carta. O Google atua como operador, sob os termos aplicáveis à API que utilizamos.</p>
      <p>A IA pode errar. Mesmo com as verificações de origem do Matchly, revise tudo antes de enviar a qualquer empresa. Você é responsável pelo que envia.</p></section>

    <section><h2>5. Com quem compartilhamos</h2>
      <ul>
        <li><strong>Supabase</strong> — banco de dados, autenticação e execução do servidor.</li>
        <li><strong>Google (Gemini API)</strong> — processamento por IA, conforme a seção 4.</li>
        <li><strong>Vercel</strong> — hospedagem do site.</li>
      </ul>
      <p>Também podemos compartilhar dados quando exigido por lei ou ordem de autoridade competente.</p></section>

    <section><h2>6. Transferência internacional</h2>
      <p>Esses provedores operam fora do Brasil (o banco de dados do Matchly fica em data center nos Estados Unidos). Por isso seus dados podem ser tratados no exterior, com as garantias previstas na LGPD para transferências internacionais.</p></section>

    <section><h2>7. Por quanto tempo guardamos</h2>
      <p>Mantemos seus dados enquanto sua conta existir. Você pode excluir uma análise a qualquer momento (o texto do currículo também é removido se nenhuma outra análise o usar) ou excluir a conta inteira na página <Link to="/conta">Minha conta</Link>, o que apaga currículos, análises, respostas e registros de uso. Cópias de segurança dos provedores podem permanecer por um período limitado, conforme as políticas deles, até serem sobrescritas.</p></section>

    <section><h2>8. Seus direitos</h2>
      <p>Pela LGPD você pode: confirmar que tratamos seus dados, acessá-los, corrigi-los, pedir anonimização ou eliminação, solicitar portabilidade, saber com quem compartilhamos e revogar consentimentos. Na página <Link to="/conta">Minha conta</Link> você baixa todos os seus dados em um arquivo e exclui sua conta sozinho, na hora. Para qualquer outro pedido, escreva para {contact()}.</p>
      <p>Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p></section>

    <section><h2>9. Segurança</h2>
      <p>Adotamos medidas razoáveis: conexão criptografada, autenticação, isolamento de dados por usuário no banco (cada pessoa só acessa os próprios registros) e chaves de IA mantidas apenas no servidor. Nenhum sistema é totalmente imune a falhas; em caso de incidente relevante, avisaremos os afetados conforme a lei.</p></section>

    <section><h2>10. Cookies e armazenamento no navegador</h2>
      <p>Usamos apenas o armazenamento local do navegador para manter sua sessão de login. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</p></section>

    <section><h2>11. Crianças e adolescentes</h2>
      <p>O Matchly é destinado a maiores de 18 anos.</p></section>

    <section><h2>12. Mudanças nesta política</h2>
      <p>Podemos atualizar este texto. Mudanças relevantes serão comunicadas no próprio site, e a data de atualização fica no topo.</p></section>
  </LegalLayout>
}

export function TermsPage() {
  return <LegalLayout title="Termos de Uso" intro="Ao entrar no Matchly você concorda com estas regras. Leia com calma; elas explicam o que o serviço faz e o que esperamos de você.">
    <section><h2>1. O serviço</h2>
      <p>O Matchly compara o seu currículo com a descrição de uma vaga, aponta pontos fortes e lacunas, sugere uma versão reescrita do currículo e uma carta de apresentação. O serviço está em fase de testes fechados, disponível apenas para convidados, e pode mudar ou ser interrompido.</p></section>

    <section><h2>2. Sua conta</h2>
      <p>O acesso é pessoal e intransferível. Você é responsável por manter sua senha em segurança e por tudo que acontece na sua conta.</p></section>

    <section><h2>3. O que esperamos de você</h2>
      <ul>
        <li>Enviar apenas o seu próprio currículo, ou o de alguém que autorizou.</li>
        <li>Informar somente fatos verdadeiros, inclusive nas respostas que complementam lacunas. O que você informa passa a fazer parte do seu currículo.</li>
        <li>Não usar o serviço para fraudar processos seletivos, enganar empresas ou praticar qualquer ilegalidade.</li>
        <li>Não tentar burlar limites de uso, atacar ou sobrecarregar o sistema, ou acessar dados de outras pessoas.</li>
      </ul></section>

    <section><h2>4. Limites da inteligência artificial</h2>
      <p>Os resultados são gerados por IA e podem conter erros, omissões ou frases que não representem bem a sua trajetória. As verificações de origem do Matchly reduzem esse risco, mas não o eliminam. <strong>Revise tudo antes de enviar.</strong></p>
      <p>Não garantimos aprovação em processos seletivos, pontuação em sistemas de triagem (ATS) específicos, entrevistas ou contratação. A nota de aderência é uma estimativa, não uma previsão.</p></section>

    <section><h2>5. Seu conteúdo</h2>
      <p>Seu currículo, suas respostas e os textos gerados para você continuam sendo seus. Você nos autoriza apenas a processá-los para prestar o serviço, inclusive enviando-os ao provedor de IA, conforme a <Link to="/privacidade">Política de Privacidade</Link>.</p></section>

    <section><h2>6. Limites de uso</h2>
      <p>Existem limites diários de análises, otimizações e cartas para manter o serviço sustentável. Eles podem mudar.</p></section>

    <section><h2>7. Disponibilidade</h2>
      <p>Por ser uma versão de testes, o serviço é oferecido “como está”, sem promessa de funcionamento ininterrupto. Pode haver instabilidade, mudanças e eventual perda de dados; mantenha uma cópia do seu currículo original.</p></section>

    <section><h2>8. Responsabilidade</h2>
      <p>Na extensão permitida pela lei, não nos responsabilizamos por decisões tomadas com base nos resultados, por erros em textos que você enviou a terceiros sem revisar, nem por danos indiretos. Nada aqui limita direitos garantidos por lei, como os do Código de Defesa do Consumidor, quando aplicáveis.</p></section>

    <section><h2>9. Encerramento</h2>
      <p>Você pode encerrar a sua conta a qualquer momento em <Link to="/conta">Minha conta</Link>. Podemos suspender ou encerrar acessos que violem estes termos.</p></section>

    <section><h2>10. Alterações, lei e contato</h2>
      <p>Podemos atualizar estes termos; a data fica no topo. Aplica-se a lei brasileira. Dúvidas: {contact()}.</p></section>
  </LegalLayout>
}

export function AccountDeletedPage() {
  return <main className="legal-wrap">
    <div className="legal-done"><CheckCircle weight="fill" /><h1>Sua conta foi excluída</h1>
      <p>Removemos seus currículos, análises, respostas e registros de uso. Cópias de segurança dos provedores podem levar um tempo para serem sobrescritas, como descrito na <Link to="/privacidade">Política de Privacidade</Link>.</p>
      <Link className="outline legal-home" to="/">Voltar ao início</Link></div>
  </main>
}
