import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowRight, Briefcase, Check, CheckCircle, FileArrowUp, FileDoc,
  Lightning, ListChecks, LockKey, MagicWand, ShieldCheck, Sparkle,
  Target, TrendUp, UploadSimple, X, UserCircle,
} from '@phosphor-icons/react'
import { AuthDialog } from './components/AuthDialog'
import { LandingPage } from './components/LandingPage'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { analyzeResume, optimizeResume, type AnalysisResult, type OptimizedResult } from './lib/api'

type Step = 'landing' | 'input' | 'loading' | 'result' | 'optimized'

const jobExample = `Product Designer Sênior

Buscamos uma pessoa com experiência em produtos digitais B2B, domínio de Figma, Design Systems e pesquisa com usuários. Será responsável por conduzir discovery, criar protótipos de alta fidelidade e colaborar com times de produto e engenharia.

Requisitos: 5+ anos de experiência, inglês avançado, métricas de produto e vivência com metodologias ágeis.`

const keywords = [
  { name: 'Figma', found: true }, { name: 'Design Systems', found: true },
  { name: 'Discovery', found: true }, { name: 'Produtos B2B', found: true },
  { name: 'Pesquisa com usuários', found: true }, { name: 'Métricas de produto', found: false },
  { name: 'Inglês avançado', found: false }, { name: 'Metodologias ágeis', found: true },
]

function Logo() {
  return <div className="logo"><span><Sparkle weight="fill" /></span>matchly</div>
}

function Header({ user, onAuth, onStart, landing }: { user: User | null; onAuth: () => void; onStart: () => void; landing: boolean }) {
  return <header className="topbar">
    <Logo />
    <div className="header-actions">
      <div className="secure"><LockKey weight="bold" /> Seus dados ficam seguros</div>
      {isSupabaseConfigured && (user
        ? <button className="account-button" onClick={() => supabase?.auth.signOut()} title="Sair"><UserCircle weight="fill" /><span>{user.email}</span></button>
        : <button className="outline" onClick={onAuth}>Entrar</button>)}
      {landing && <button className="primary header-cta" onClick={onStart}>Acesso ao MVP <ArrowRight /></button>}
    </div>
  </header>
}

function Progress({ active }: { active: number }) {
  const labels = ['Envie seus dados', 'Veja sua análise', 'Currículo otimizado']
  return <div className="progress" aria-label={`Etapa ${active} de 3`}>
    {labels.map((label, i) => <div className={`progress-step ${i + 1 <= active ? 'active' : ''}`} key={label}>
      <div className="step-number">{i + 1 < active ? <Check weight="bold" /> : i + 1}</div>
      <span>{label}</span>
      {i < 2 && <div className="connector" />}
    </div>)}
  </div>
}

function UploadCard({ file, onFile }: { file: File | null, onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const handle = (candidate?: File) => candidate && onFile(candidate)
  return <section className="field-block">
    <div className="field-heading"><div className="field-icon mint"><FileDoc weight="duotone" /></div><div><h2>Seu currículo</h2><p>Usaremos apenas o conteúdo para a análise</p></div></div>
    <button type="button" className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}>
      <input ref={inputRef} type="file" accept=".docx" hidden onChange={e => handle(e.target.files?.[0])} />
      {file ? <><span className="upload-icon success"><CheckCircle weight="fill" /></span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · pronto para analisar</small></>
        : <><span className="upload-icon"><UploadSimple weight="bold" /></span><strong>Arraste seu currículo aqui</strong><small>ou <u>escolha um arquivo</u> do computador</small><em>DOCX · máximo 5 MB</em></>}
    </button>
  </section>
}

function InputScreen({ onAnalyze, error }: { onAnalyze: (file: File, text: string) => void; error: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const canGo = file && text.trim().length > 80
  return <>
    <div className="hero compact">
      <div className="eyebrow"><Sparkle weight="fill" /> IA que entende recrutamento</div>
      <h1>Seu currículo, do jeito que<br /><em>a vaga procura.</em></h1>
      <p>Compare seu perfil com a oportunidade e receba uma versão<br className="desktop" /> otimizada para recrutadores e sistemas ATS.</p>
    </div>
    <main className="input-card">
      <UploadCard file={file} onFile={setFile} />
      <div className="divider"><span>e</span></div>
      <section className="field-block">
        <div className="field-heading"><div className="field-icon lilac"><Briefcase weight="duotone" /></div><div><h2>A vaga que você quer</h2><p>Cole a descrição completa da oportunidade</p></div></div>
        <div className="textarea-wrap">
          <textarea value={text} maxLength={8000} placeholder="Cole aqui o texto da vaga: responsabilidades, requisitos, diferenciais..." onChange={e => setText(e.target.value)} />
          <span>{text.length.toLocaleString('pt-BR')} / 8.000</span>
          {!text && <button className="example" onClick={() => setText(jobExample)} type="button">Usar exemplo</button>}
        </div>
      </section>
      {error && <div className="flow-error">{error}</div>}
      <button className="primary big" disabled={!canGo} onClick={() => file && onAnalyze(file, text)}><MagicWand weight="fill" /> Analisar compatibilidade <ArrowRight weight="bold" /></button>
      <p className="privacy"><ShieldCheck weight="fill" /> Seus arquivos são processados com segurança e nunca compartilhados.</p>
    </main>
    <div className="trust-row"><span><CheckCircle weight="fill" /> Sem informações inventadas</span><span><CheckCircle weight="fill" /> Otimizado para ATS</span><span><CheckCircle weight="fill" /> Resultado em segundos</span></div>
  </>
}

function LoadingScreen() {
  return <main className="loading-card">
    <div className="orbit"><div className="orbit-ring" /><Sparkle weight="fill" /></div>
    <h1>Encontrando o seu melhor match...</h1>
    <p>Nossa IA está cruzando cada detalhe do seu currículo<br />com o que a vaga realmente procura.</p>
    <div className="loading-items">
      <span className="done"><Check weight="bold" /> Lendo seu currículo</span>
      <span className="current"><span className="mini-loader" /> Identificando requisitos da vaga</span>
      <span><span className="empty-dot" /> Calculando sua aderência</span>
    </div>
  </main>
}

function ScoreRing({ score }: { score: number }) {
  return <div className="score-ring" style={{'--score': String(score)} as React.CSSProperties}><div><strong>{score}</strong><span>/100</span></div></div>
}

function ResultScreen({ analysis, onOptimize, busy, error }: { analysis: AnalysisResult | null; onOptimize: () => void; busy: boolean; error: string }) {
  const score = analysis?.match_score ?? 78
  const strengths = analysis?.strengths?.length ? analysis.strengths : ['Experiência sólida com produtos digitais B2B', 'Domínio de Figma e prototipação avançada', 'Criação e evolução de Design Systems', 'Vivência com discovery e pesquisa']
  const gaps = analysis?.gaps?.length ? analysis.gaps : [{ area: 'Métricas de produto', descricao: 'A vaga valoriza decisões orientadas a dados. Seu currículo não deixa essa experiência clara.' }, { area: 'Inglês avançado', descricao: 'Requisito explícito que não foi identificado no documento.' }]
  const dynamicKeywords = analysis ? [...strengths.slice(0, 5).map(name => ({ name, found: true })), ...analysis.missing_keywords.map(name => ({ name, found: false }))] : keywords
  return <main className="result-wrap">
    <div className="result-title"><div><span className="eyebrow"><Sparkle weight="fill" /> Análise concluída</span><h1>Você está no caminho certo.</h1><p>Seu perfil tem boa aderência. Alguns ajustes podem fazer você se destacar.</p></div><button className="outline"><FileArrowUp /> Trocar arquivos</button></div>
    <section className="score-card">
      <ScoreRing score={score} />
      <div className="score-copy"><span>ADERÊNCIA À VAGA</span><h2>{score >= 75 ? 'Boa compatibilidade' : score >= 50 ? 'Compatibilidade moderada' : 'Aderência inicial'}</h2><p>Seu currículo foi comparado aos requisitos explícitos desta oportunidade.</p><div className="mini-stats"><span><strong>{strengths.length}</strong> pontos fortes</span><span><strong>{gaps.length}</strong> oportunidades</span></div></div>
      <div className="insight"><Lightning weight="fill" /><p><strong>Você está acima da média.</strong><br />Currículos com mais de 70% de aderência têm maior chance de chegar à entrevista.</p></div>
    </section>
    <div className="result-grid">
      <section className="panel strengths"><div className="panel-head"><span><CheckCircle weight="fill" /></span><div><h3>Seus pontos fortes</h3><p>O que já conversa bem com a vaga</p></div></div>
        <ul>{strengths.map(item => <li key={item}><Check /> {item}</li>)}</ul>
      </section>
      <section className="panel gaps"><div className="panel-head"><span><Target weight="fill" /></span><div><h3>Oportunidades de melhoria</h3><p>Pontos que merecem mais destaque</p></div></div>
        <ul>{gaps.map(item => <li key={item.area}><X /> <div><strong>{item.area}</strong><small>{item.descricao}</small></div></li>)}</ul>
      </section>
    </div>
    <section className="keywords panel"><div className="panel-head"><span><ListChecks weight="fill" /></span><div><h3>Palavras-chave da vaga</h3><p>Termos que os sistemas de triagem podem procurar</p></div></div><div className="chips">{dynamicKeywords.map(k => <span className={k.found ? 'found' : 'missing'} key={k.name}>{k.found ? <Check /> : <X />}{k.name}</span>)}</div></section>
    {error && <div className="flow-error">{error}</div>}
    <section className="optimize-card"><div className="magic-badge"><MagicWand weight="fill" /></div><div><span>PRÓXIMO PASSO</span><h2>Transforme essa análise em um currículo mais forte</h2><p>Vamos reescrever e reorganizar seu conteúdo com foco nesta vaga — sem inventar nenhuma informação.</p></div><button className="primary" disabled={busy} onClick={onOptimize}>{busy ? 'Otimizando...' : 'Gerar currículo otimizado'} <ArrowRight weight="bold" /></button></section>
  </main>
}

function OptimizedScreen({ optimized }: { optimized: OptimizedResult | null }) {
  return <main className="optimized-wrap">
    <div className="success-hero"><span><Check weight="bold" /></span><div><div className="eyebrow">Currículo otimizado</div><h1>Pronto para a próxima etapa.</h1><p>Seu conteúdo foi reorganizado para destacar o que mais importa nesta vaga.</p></div></div>
    <div className="document-layout">
      <aside className="changes panel"><h3><TrendUp weight="fill" /> O que melhoramos</h3><ul>{(optimized?.changes_summary ?? ['Resumo mais direcionado', 'Experiências reordenadas', 'Termos da vaga incorporados']).map(item => <li key={item}><CheckCircle weight="fill" /><span><strong>{item}</strong></span></li>)}</ul><div className="honesty"><ShieldCheck weight="fill" /><p><strong>Compromisso com a verdade</strong><br />Nenhuma experiência ou habilidade foi inventada.</p></div></aside>
      <section className="resume-preview">
        <div className="paper-head"><span>VERSÃO OTIMIZADA</span><button className="outline"><FileArrowUp /> Baixar DOCX</button></div>
        {optimized ? <article className="paper optimized-text">{optimized.optimized_resume}</article> : <article className="paper"><h2>Marina Oliveira</h2><p className="contact">Product Designer Sênior · São Paulo, SP · marina@email.com</p><h4>RESUMO</h4><p>Product Designer com experiência em produtos digitais B2B, conduzindo processos de discovery, pesquisa com usuários e prototipação de alta fidelidade. Atuação colaborativa com times de produto e engenharia, com domínio de Figma e construção de Design Systems escaláveis.</p><h4>EXPERIÊNCIA PROFISSIONAL</h4><div className="job"><strong>Product Designer · Lumina Tech</strong><span>03/2021 — Atual</span></div><ul><li>Condução de discovery e pesquisa com usuários para produtos digitais B2B.</li><li>Criação de fluxos, wireframes e protótipos de alta fidelidade no Figma.</li><li>Evolução do Design System em parceria com engenharia e produto.</li></ul><h4>HABILIDADES</h4><p>Figma · Design Systems · Discovery · Pesquisa com usuários · Prototipação · Produtos B2B · Metodologias ágeis</p></article>}
      </section>
    </div>
  </main>
}

export default function App() {
  const [step, setStep] = useState<Step>('landing')
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [optimized, setOptimized] = useState<OptimizedResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  const start = () => {
    setError('')
    if (isSupabaseConfigured && !user) {
      setAuthOpen(true)
      return
    }
    setStep('input')
  }
  const analyze = async (file: File, jobText: string) => {
    setError('')
    if (isSupabaseConfigured && !user) { setAuthOpen(true); setError('Entre na sua conta para iniciar uma análise.'); return }
    setStep('loading')
    if (!isSupabaseConfigured) { setTimeout(() => setStep('result'), 2200); return }
    try { setAnalysis(await analyzeResume(file, jobText)); setStep('result') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a análise.'); setStep('input') }
  }
  const optimize = async () => {
    if (!analysis) { setStep('optimized'); return }
    setBusy(true); setError('')
    try { setOptimized(await optimizeResume(analysis.analysis_id)); setStep('optimized') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível otimizar o currículo.') }
    finally { setBusy(false) }
  }
  const progress = step === 'input' || step === 'loading' ? 1 : step === 'result' ? 2 : 3
  return <div className="app"><Header user={user} onAuth={() => setAuthOpen(true)} onStart={start} landing={step === 'landing'} />
    {step !== 'landing' && <Progress active={progress} />}
    {step === 'landing' && <LandingPage onStart={start} />}
    {step === 'input' && <InputScreen onAnalyze={analyze} error={error} />}
    {step === 'loading' && <LoadingScreen />}
    {step === 'result' && <ResultScreen analysis={analysis} onOptimize={optimize} busy={busy} error={error} />}
    {step === 'optimized' && <OptimizedScreen optimized={optimized} />}
    <footer><Logo /><span>Currículos mais relevantes. Carreiras mais próximas.</span><small>© 2026 Matchly</small></footer>
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={() => { setAuthOpen(false); setStep('input') }} />
  </div>
}
