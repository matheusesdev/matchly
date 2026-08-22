import { useEffect } from 'react'
import {
  ArrowRight, Briefcase, Check, CheckCircle, FileDoc, Lightning,
  MagicWand, ShieldCheck, Sparkle, Target, TrendUp,
} from '@phosphor-icons/react'

type Props = { onStart: () => void }

export function LandingPage({ onStart }: Props) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('is-visible'))
    }, { threshold: 0.12 })
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return <main className="landing">
    <section className="landing-hero">
      <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
      <div className="landing-copy">
        <div className="landing-pill"><Sparkle weight="fill" /> IA especializada em recrutamento</div>
        <h1>Não envie só um currículo.<br /><em>Envie o currículo certo.</em></h1>
        <p>Entenda o que cada vaga procura e transforme seu currículo em uma versão mais relevante, clara e preparada para sistemas ATS.</p>
        <div className="hero-actions"><button className="primary landing-cta" onClick={onStart}>Analisar meu currículo <ArrowRight weight="bold" /></button><span><ShieldCheck weight="fill" /> Sem inventar experiências</span></div>
        <div className="hero-proof"><div className="avatars"><i>MO</i><i>LR</i><i>CA</i><i>+</i></div><p><strong>Feito para quem não quer passar despercebido</strong><br />Análise personalizada em poucos minutos</p></div>
      </div>
      <div className="hero-product">
        <div className="float-card float-top"><span><TrendUp weight="fill" /></span><div><strong>+28 pontos</strong><small>após a otimização</small></div></div>
        <div className="product-window"><div className="match-scan"><span>Comparando com a vaga</span></div>
          <div className="window-bar"><div><i /><i /><i /></div><span>matchly.app/análise</span></div>
          <div className="product-content"><div className="mock-title"><span><Sparkle weight="fill" /> ANÁLISE CONCLUÍDA</span><h3>Você está no caminho certo.</h3></div><div className="mock-score"><div className="mock-ring"><strong>78</strong><small>/100</small></div><div><small>ADERÊNCIA À VAGA</small><h4>Boa compatibilidade</h4><p>Seu perfil atende à maior parte dos requisitos desta oportunidade.</p></div></div><div className="mock-grid"><div><span className="mock-icon good"><Check /></span><strong>6 pontos fortes</strong><small>Experiências alinhadas</small></div><div><span className="mock-icon warm"><Target /></span><strong>2 oportunidades</strong><small>Ajustes recomendados</small></div></div></div>
        </div>
        <div className="float-card float-bottom"><CheckCircle weight="fill" /><span><strong>Pronto para ATS</strong><small>Estrutura validada</small></span></div>
      </div>
    </section>

    <section className="landing-trust" data-reveal><span>Mais relevância para vagas em</span><div><b>Produto</b><b>Tecnologia</b><b>Marketing</b><b>Operações</b><b>Design</b></div></section>

    <section className="how-section" id="como-funciona" data-reveal>
      <div className="section-heading"><span>COMO FUNCIONA</span><h2>Da vaga ao currículo certo<br />em três passos.</h2><p>Você traz as informações. A Matchly encontra as conexões que fazem diferença.</p></div>
      <div className="steps-grid">
        <article><i>01</i><div className="step-art upload-art"><FileDoc weight="duotone" /><span><CheckCircle weight="fill" /></span></div><h3>Envie seu currículo</h3><p>Faça upload do seu arquivo DOCX. O conteúdo é processado com segurança.</p></article>
        <article><i>02</i><div className="step-art job-art"><Briefcase weight="duotone" /><span><Sparkle weight="fill" /></span></div><h3>Cole a descrição da vaga</h3><p>Nossa IA identifica requisitos, competências e termos importantes.</p></article>
        <article><i>03</i><div className="step-art result-art"><MagicWand weight="duotone" /><span><TrendUp weight="fill" /></span></div><h3>Receba sua melhor versão</h3><p>Veja o diagnóstico e gere um currículo direcionado, sem inventar nada.</p></article>
      </div>
    </section>

    <section className="difference-section" data-reveal>
      <div className="difference-copy"><span className="eyebrow"><Lightning weight="fill" /> O diferencial Matchly</span><h2>Não é sobre adicionar palavras.<br />É sobre mostrar o seu valor.</h2><p>A Matchly cruza o que você já fez com o que a vaga realmente pede. A IA reorganiza, enfatiza e melhora a escrita — sempre fiel à sua trajetória.</p><ul><li><CheckCircle weight="fill" /><span><strong>Diagnóstico de aderência</strong><small>Score objetivo, pontos fortes e gaps claros.</small></span></li><li><CheckCircle weight="fill" /><span><strong>Otimização responsável</strong><small>Nenhuma habilidade ou experiência inventada.</small></span></li><li><CheckCircle weight="fill" /><span><strong>Leitura facilitada por ATS</strong><small>Estrutura limpa e termos relevantes para a vaga.</small></span></li></ul></div>
      <div className="before-after"><div className="ba-labels"><span>ANTES</span><span>DEPOIS</span></div><div className="ba-docs"><article><i /><i /><i /><i /><i /></article><div className="transform-icon"><MagicWand weight="fill" /></div><article className="after-doc"><span>+28%</span><i /><i /><i /><i /><i /></article></div><div className="ba-score"><span>Aderência</span><div><i /><b /></div><strong>78%</strong></div></div>
    </section>

    <section className="commercial-section" data-reveal>
      <div className="section-heading"><span>FEITO PARA DECIDIR MELHOR</span><h2>Antes de clicar em “candidatar”,<br />saiba como você se apresenta.</h2></div>
      <div className="objection-grid"><article><Target weight="duotone" /><h3>“Meu perfil combina?”</h3><p>Veja uma leitura objetiva da aderência entre sua trajetória e os requisitos da vaga.</p></article><article><Lightning weight="duotone" /><h3>“O que devo destacar?”</h3><p>Encontre experiências, competências e termos que merecem aparecer primeiro.</p></article><article><ShieldCheck weight="duotone" /><h3>“A IA vai inventar?”</h3><p>Não. A Matchly reorganiza e reescreve apenas informações presentes no documento original.</p></article></div>
      <div className="access-card"><div><span>ACESSO INICIAL</span><h3>Faça sua primeira análise agora.</h3><p>Envie um DOCX, cole a vaga e veja a Matchly trabalhando com a sua experiência real.</p></div><button className="primary" onClick={onStart}>Experimentar Matchly <ArrowRight /></button></div>
    </section>

    <section className="faq-section" data-reveal><div><span className="eyebrow">Perguntas frequentes</span><h2>Antes de começar.</h2><p>Respostas diretas sobre como a Matchly trabalha com seu currículo.</p></div><div className="faq-list"><details open><summary>A Matchly inventa experiências ou habilidades?<span>+</span></summary><p>Não. A otimização pode reorganizar e melhorar a escrita, mas usa somente fatos que já existem no currículo enviado.</p></details><details><summary>O currículo fica preparado para ATS?<span>+</span></summary><p>A estrutura prioriza texto legível, seções convencionais e termos relevantes para sistemas de triagem.</p></details><details><summary>Meus dados ficam seguros?<span>+</span></summary><p>As análises são protegidas por autenticação e cada usuário acessa somente os próprios documentos.</p></details></div></section>

    <section className="landing-final" data-reveal><div className="final-spark"><Sparkle weight="fill" /></div><span>SEU PRÓXIMO PASSO</span><h2>A vaga certa já existe.<br />Agora, apresente a sua melhor versão.</h2><p>Descubra como seu currículo conversa com a oportunidade que você quer.</p><button className="primary landing-cta" onClick={onStart}>Começar análise grátis <ArrowRight weight="bold" /></button><small><ShieldCheck weight="fill" /> Seus dados são privados e protegidos</small></section>
  </main>
}
