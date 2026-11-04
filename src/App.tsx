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
  const [fileError, setFileError] = useState('')
  const handle = (candidate?: File) => {
    if (!candidate) return
    if (!/.(docx|pdf)$/i.test(candidate.name)) return setFileError('Formato não suportado. Envie um DOCX ou PDF.')
    if (candidate.size > 5 * 1024 * 1024) return setFileError('O arquivo tem mais de 5 MB.')
    setFileError(''); onFile(candidate)
  }
  return <section className="field-block">
    <div className="field-heading"><div className="field-icon mint"><FileDoc weight="duotone" /></div><div><h2>Seu currículo</h2><p>Usaremos apenas o conteúdo para a análise</p></div></div>
    <button type="button" className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}>
      <input ref={inputRef} type="file" accept=".docx,.pdf" hidden onChange={e => handle(e.target.files?.[0])} />
      {file ? <><span className="upload-icon success"><CheckCircle weight="fill" /></span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB · pronto para analisar</small></>
        : <><span className="upload-icon"><UploadSimple weight="bold" /></span><strong>Arraste seu currículo aqui</strong><small>ou <u>escolha um arquivo</u> do computador</small><em>DOCX ou PDF · máximo 5 MB</em></>}
    </button>
    {fileError && <div className="flow-error" role="alert">{fileError}</div>}
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
    <div className="trust-row"><span><CheckCircle weight="fill" /> Sem informações inventadas</span><span><CheckCircle weight="fill" /> Texto simples e legível</span><span><CheckCircle weight="fill" /> Resultado em segundos</span></div>
  </>
}

function LoadingScreen() {
  return <main className="loading-card" role="status" aria-live="polite">
    <div className="orbit"><div className="orbit-ring" /><Sparkle weight="fill" /></div>
    <h1>Analisando seu currículo...</h1>
    <p>Estamos comparando o seu currículo com os requisitos da vaga.<br />Isso costuma levar de 10 a 30 segundos.</p>
  </main>
}

function ScoreRing({ score }: { score: number }) {
  return <div className="score-ring" style={{'--score': String(score)} as React.CSSProperties}><div><strong>{score}</strong><span>/100</span></div></div>
}

function ResultScreen({ analysis, onOptimize, onReset, busy, error }: { analysis: AnalysisResult; onOptimize: () => void; onReset: () => void; busy: boolean; error: string }) {
  const score = analysis.match_score
  const strengths = analysis.strengths
  const gaps = analysis.gaps
  const dynamicKeywords = [...strengths.slice(0, 5).map(name => ({ name, found: true })), ...analysis.missing_keywords.map(name => ({ name, found: false }))]
  return <main className="result-wrap">
    <div className="result-title"><div><span className="eyebrow"><Sparkle weight="fill" /> Análise concluída</span><h1>{score >= 75 ? 'Você está no caminho certo.' : score >= 50 ? 'Há um bom caminho, com ajustes.' : 'Vale reforçar alguns pontos.'}</h1><p>Veja o que já combina com a vaga e o que ainda não aparece no seu currículo.</p></div><button className="outline" onClick={onReset}><FileArrowUp /> Trocar arquivos</button></div>
    <section className="score-card">
      <ScoreRing score={score} />
      <div className="score-copy"><span>ADERÊNCIA À VAGA</span><h2>{score >= 75 ? 'Boa compatibilidade' : score >= 50 ? 'Compatibilidade moderada' : 'Aderência inicial'}</h2><p>Estimativa feita pela IA a partir dos requisitos que aparecem no texto da vaga. Use como orientação, não como garantia.</p><div className="mini-stats"><span><strong>{strengths.length}</strong> pontos fortes</span><span><strong>{gaps.length}</strong> oportunidades</span></div></div>
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

function OptimizedScreen({ optimized, onBack }: { optimized: OptimizedResult; onBack: () => void }) {
  const [downloadError, setDownloadError] = useState('')
  const download = async (format: 'docx' | 'pdf') => {
    setDownloadError('')
    try {
      if (format === 'pdf') await (await import('./lib/resumePdf')).downloadResumePdf(optimized.optimized_resume)
      else await (await import('./lib/resumeDocx')).downloadResumeDocx(optimized.optimized_resume)
    } catch { setDownloadError('Não foi possível gerar o arquivo. Tente novamente.') }
  }
  return <main className="optimized-wrap">
    <div className="success-hero"><span><Check weight="bold" /></span><div><div className="eyebrow">Currículo otimizado</div><h1>Sua versão para esta vaga.</h1><p>Revise o texto antes de enviar: a IA só reorganiza e reescreve o que já estava no seu currículo.</p></div></div>
    <div className="document-layout">
      <aside className="changes panel"><h3><TrendUp weight="fill" /> O que mudou</h3><ul>{optimized.changes_summary.map(item => <li key={item}><CheckCircle weight="fill" /><span><strong>{item}</strong></span></li>)}</ul><div className="honesty"><ShieldCheck weight="fill" /><p><strong>Compromisso com a verdade</strong><br />Verificamos que nenhum número ou data novo foi adicionado. Confira o restante antes de enviar.</p></div><button className="outline" onClick={onBack}>Voltar à análise</button></aside>
      <section className="resume-preview">
        <div className="paper-head"><span>VERSÃO OTIMIZADA</span><div className="download-actions"><button className="outline" onClick={() => download('pdf')}><FileArrowUp /> Baixar PDF</button><button className="outline" onClick={() => download('docx')}><FileArrowUp /> Baixar DOCX</button></div></div>
        {downloadError && <div className="flow-error" role="alert">{downloadError}</div>}
        <article className="paper optimized-text">{optimized.optimized_resume}</article>
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
    if (!isSupabaseConfigured || !user) {
      setAuthOpen(true)
      return
    }
    setStep('input')
  }
  const analyze = async (file: File, jobText: string) => {
    setError('')
    if (isSupabaseConfigured && !user) { setAuthOpen(true); setError('Entre na sua conta para iniciar uma análise.'); return }
    setStep('loading')
    if (!isSupabaseConfigured) { setError('Serviço temporariamente indisponível.'); setStep('landing'); return }
    try { setAnalysis(await analyzeResume(file, jobText)); setStep('result') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a análise.'); setStep('input') }
  }
  const optimize = async () => {
    if (!analysis) return
    setBusy(true); setError('')
    try { setOptimized(await optimizeResume(analysis.analysis_id)); setStep('optimized') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível otimizar o currículo.') }
    finally { setBusy(false) }
  }
  const reset = () => { setAnalysis(null); setOptimized(null); setError(''); setStep('input') }
  const progress = step === 'input' || step === 'loading' ? 1 : step === 'result' ? 2 : 3
  return <div className="app"><Header user={user} onAuth={() => setAuthOpen(true)} onStart={start} landing={step === 'landing'} />
    {step !== 'landing' && <Progress active={progress} />}
    {step === 'landing' && <LandingPage onStart={start} />}
    {step === 'input' && <InputScreen onAnalyze={analyze} error={error} />}
    {step === 'loading' && <LoadingScreen />}
    {step === 'result' && analysis && <ResultScreen analysis={analysis} onOptimize={optimize} onReset={reset} busy={busy} error={error} />}
    {step === 'optimized' && optimized && <OptimizedScreen optimized={optimized} onBack={() => setStep('result')} />}
    <footer><Logo /><span>Currículos mais relevantes. Carreiras mais próximas.</span><small>© 2026 Matchly</small></footer>
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={() => { setAuthOpen(false); setStep('input') }} />
  </div>
}
