import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, Briefcase, Check, CheckCircle, FileArrowUp, FileDoc,
  Lightning, ListChecks, LockKey, MagicWand, ShieldCheck, Sparkle,
  Target, TrendUp, UploadSimple, X, UserCircle,
} from '@phosphor-icons/react'
import { AuthDialog } from './components/AuthDialog'
import { LandingPage } from './components/LandingPage'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { HistoryPage } from './components/HistoryPage'
import { OptimizedScreen } from './components/OptimizedScreen'
import { analyzeResume, generateCoverLetter, optimizeResume, type AnalysisResult, type CoverLetterResult, type CoverLetterTone, type OptimizedResult } from './lib/api'
import { fetchAnalysis, saveUserFacts, type SavedAnalysis } from './lib/analyses'
import { GapQuestion } from './components/GapQuestion'
import { CoverLetterScreen } from './components/CoverLetterScreen'
import { AccountPage } from './components/AccountPage'
import { AccountDeletedPage, PrivacyPage, TermsPage } from './components/LegalPages'
import { MAX_FACTS, type UserFact } from '../supabase/functions/_shared/facts'

const jobExample = `Product Designer Sênior

Buscamos uma pessoa com experiência em produtos digitais B2B, domínio de Figma, Design Systems e pesquisa com usuários. Será responsável por conduzir discovery, criar protótipos de alta fidelidade e colaborar com times de produto e engenharia.

Requisitos: 5+ anos de experiência, inglês avançado, métricas de produto e vivência com metodologias ágeis.`

function Logo() {
  return <div className="logo"><span><Sparkle weight="fill" /></span>matchly</div>
}

function Header({ user, onAuth, onStart, landing }: { user: User | null; onAuth: () => void; onStart: () => void; landing: boolean }) {
  const navigate = useNavigate()
  return <header className="topbar">
    <Logo />
    <div className="header-actions">
      <div className="secure"><LockKey weight="bold" /> Seus dados ficam seguros</div>
      {user && <button className="outline" onClick={() => navigate('/analises')}>Minhas análises</button>}
      {isSupabaseConfigured && (user
        ? <button className="account-button" onClick={() => navigate('/conta')} title="Minha conta"><UserCircle weight="fill" /><span>{user.email}</span></button>
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
      <p className="privacy"><ShieldCheck weight="fill" /> Para gerar os resultados, o texto do seu currículo e da vaga é enviado ao Google Gemini (IA). Não o usamos para publicidade nem o vendemos. <Link to="/privacidade">Saiba mais</Link></p>
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

type ResultScreenProps = {
  analysis: AnalysisResult
  hasOptimized: boolean
  facts: UserFact[]
  onSaveFact: (area: string, answer: string) => Promise<void>
  onRemoveFact: (area: string) => Promise<void>
  onOptimize: () => void
  onRegenerate: () => void
  onCoverLetter: () => void
  onReset: () => void
  busy: boolean
  error: string
}

const sameArea = (a: string, b: string) => a.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() === b.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

function ResultScreen({ analysis, hasOptimized, facts, onSaveFact, onRemoveFact, onOptimize, onRegenerate, onCoverLetter, onReset, busy, error }: ResultScreenProps) {
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
        <ul>{gaps.map(item => <li key={item.area}><X /> <div><strong>{item.area}</strong><small>{item.descricao}</small>
          <GapQuestion area={item.area} fact={facts.find(fact => sameArea(fact.area, item.area))} canAdd={facts.length < MAX_FACTS}
            onSave={answer => onSaveFact(item.area, answer)} onRemove={() => onRemoveFact(item.area)} /></div></li>)}</ul>
      </section>
    </div>
    <section className="keywords panel"><div className="panel-head"><span><ListChecks weight="fill" /></span><div><h3>Palavras-chave da vaga</h3><p>Termos que os sistemas de triagem podem procurar</p></div></div><div className="chips">{dynamicKeywords.map(k => <span className={k.found ? 'found' : 'missing'} key={k.name}>{k.found ? <Check /> : <X />}{k.name}</span>)}</div></section>
    {error && <div className="flow-error">{error}</div>}
    <section className="optimize-card"><div className="magic-badge"><MagicWand weight="fill" /></div><div><span>PRÓXIMO PASSO</span><h2>Transforme essa análise em um currículo mais forte</h2><p>Vamos reescrever e reorganizar seu conteúdo com foco nesta vaga — sem inventar nenhuma informação.</p></div><button className="primary" disabled={busy} onClick={onOptimize}>{busy ? 'Otimizando...' : hasOptimized ? 'Ver currículo otimizado' : 'Gerar currículo otimizado'} <ArrowRight weight="bold" /></button>{hasOptimized && facts.length > 0 && <div className="regenerate-row"><button className="outline" disabled={busy} onClick={onRegenerate}><MagicWand /> Gerar novamente com minhas respostas</button><small>Usa 1 das suas otimizações diárias.</small></div>}<div className="cta-row"><button className="outline" onClick={onCoverLetter}><Sparkle /> Escrever carta de apresentação</button></div></section>
  </main>
}

function PageStatus({ text }: { text: string }) {
  return <main className="loading-card" role="status" aria-live="polite"><p>{text}</p></main>
}

function useSavedAnalysis(id: string | undefined) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'missing' | 'error'; data: SavedAnalysis | null; error: string }>({ status: 'loading', data: null, error: '' })
  useEffect(() => {
    let active = true
    setState({ status: 'loading', data: null, error: '' })
    if (!id) { setState({ status: 'missing', data: null, error: '' }); return }
    fetchAnalysis(id)
      .then((data) => active && setState(data ? { status: 'ready', data, error: '' } : { status: 'missing', data: null, error: '' }))
      .catch((cause) => active && setState({ status: 'error', data: null, error: cause instanceof Error ? cause.message : 'Erro ao carregar.' }))
    return () => { active = false }
  }, [id])
  return state
}

function AnalyzePage() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const analyze = async (file: File, jobText: string) => {
    setError(''); setBusy(true)
    try { const result = await analyzeResume(file, jobText); navigate(`/analises/${result.analysis_id}`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a análise.'); setBusy(false) }
  }
  // O formulário permanece montado durante a análise para não perder arquivo e texto se houver erro.
  return <>
    <div hidden={busy}><InputScreen onAnalyze={analyze} error={error} /></div>
    {busy && <LoadingScreen />}
  </>
}

function NotFoundAnalysis() {
  const navigate = useNavigate()
  return <main className="loading-card"><h1>Análise não encontrada</h1><p>Ela pode ter sido excluída ou não pertence a esta conta.</p><button className="primary" onClick={() => navigate('/analises')}>Ver minhas análises</button></main>
}

function ResultPage() {
  const { id } = useParams()
  const { status, data, error: loadError } = useSavedAnalysis(id)
  if (status === 'loading') return <PageStatus text="Carregando análise..." />
  if (status === 'error') return <PageStatus text={loadError} />
  if (status === 'missing' || !data) return <NotFoundAnalysis />
  return <LoadedResult data={data} />
}

function LoadedResult({ data }: { data: SavedAnalysis }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [facts, setFacts] = useState<UserFact[]>(data.user_facts)
  const persist = async (next: UserFact[]) => { await saveUserFacts(data.analysis_id, next); setFacts(next) }
  const saveFact = (area: string, answer: string) => persist([...facts.filter(fact => !sameArea(fact.area, area)), { area, answer }])
  const removeFact = (area: string) => persist(facts.filter(fact => !sameArea(fact.area, area)))
  const generate = async (force: boolean) => {
    if (!force && data.optimized_resume_text) { navigate(`/analises/${data.analysis_id}/otimizado`); return }
    setBusy(true); setError('')
    try { await optimizeResume(data.analysis_id); navigate(`/analises/${data.analysis_id}/otimizado`) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível otimizar o currículo.'); setBusy(false) }
  }
  return <ResultScreen analysis={data} hasOptimized={Boolean(data.optimized_resume_text)} facts={facts} onSaveFact={saveFact} onRemoveFact={removeFact}
    onOptimize={() => generate(false)} onRegenerate={() => generate(true)} onCoverLetter={() => navigate(`/analises/${data.analysis_id}/carta`)} onReset={() => navigate('/analisar')} busy={busy} error={error} />
}

function OptimizedPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { status, data, error } = useSavedAnalysis(id)
  if (status === 'loading') return <PageStatus text="Carregando currículo..." />
  if (status === 'error') return <PageStatus text={error} />
  if (status === 'missing' || !data) return <NotFoundAnalysis />
  if (!data.optimized_resume_text) return <Navigate to={`/analises/${data.analysis_id}`} replace />
  const optimized: OptimizedResult = { optimized_resume: data.optimized_resume_text, changes_summary: data.changes_summary, evidence: data.evidence }
  return <OptimizedScreen optimized={optimized} original={data.resume_text} onBack={() => navigate(`/analises/${data.analysis_id}`)} onCoverLetter={() => navigate(`/analises/${data.analysis_id}/carta`)} />
}

function CoverLetterPage() {
  const { id } = useParams()
  const { status, data, error } = useSavedAnalysis(id)
  if (status === 'loading') return <PageStatus text="Carregando..." />
  if (status === 'error') return <PageStatus text={error} />
  if (status === 'missing' || !data) return <NotFoundAnalysis />
  return <LoadedCoverLetter data={data} />
}

function LoadedCoverLetter({ data }: { data: SavedAnalysis }) {
  const navigate = useNavigate()
  const [letter, setLetter] = useState<CoverLetterResult | null>(data.cover_letter ? { cover_letter: data.cover_letter, evidence: data.cover_letter_evidence } : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const generate = async (tone: CoverLetterTone) => {
    setBusy(true); setError('')
    try { setLetter(await generateCoverLetter(data.analysis_id, tone)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a carta.') }
    finally { setBusy(false) }
  }
  return <CoverLetterScreen letter={letter} busy={busy} error={error} onGenerate={generate} onBack={() => navigate(`/analises/${data.analysis_id}`)} />
}

function RequireAuth({ user, ready, children }: { user: User | null; ready: boolean; children: React.ReactNode }) {
  const location = useLocation()
  if (!isSupabaseConfigured) return <Navigate to="/" replace />
  if (!ready) return <PageStatus text="Carregando..." />
  if (!user) return <Navigate to="/" replace state={{ needAuth: true, from: location.pathname }} />
  return <>{children}</>
}

function progressFor(pathname: string) {
  if (pathname === '/analisar') return 1
  if (/^\/analises\/[^/]+\/(otimizado|carta)$/.test(pathname)) return 3
  if (/^\/analises\/[^/]+$/.test(pathname)) return 2
  return 0
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authOpen, setAuthOpen] = useState(false)
  const [afterAuth, setAfterAuth] = useState('/analisar')
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => {
    const state = location.state as { needAuth?: boolean; from?: string } | null
    if (state?.needAuth) { setAfterAuth(state.from ?? '/analisar'); setAuthOpen(true) }
  }, [location.state])
  const start = () => {
    if (!isSupabaseConfigured || !user) { setAfterAuth('/analisar'); setAuthOpen(true); return }
    navigate('/analisar')
  }
  const guard = (page: React.ReactNode) => <RequireAuth user={user} ready={authReady}>{page}</RequireAuth>
  const progress = progressFor(location.pathname)
  return <div className="app"><Header user={user} onAuth={() => { setAfterAuth(location.pathname); setAuthOpen(true) }} onStart={start} landing={location.pathname === '/'} />
    {progress > 0 && <Progress active={progress} />}
    <Routes>
      <Route path="/" element={<LandingPage onStart={start} />} />
      <Route path="/analisar" element={guard(<AnalyzePage />)} />
      <Route path="/analises" element={guard(<HistoryPage />)} />
      <Route path="/analises/:id" element={guard(<ResultPage />)} />
      <Route path="/analises/:id/otimizado" element={guard(<OptimizedPage />)} />
      <Route path="/analises/:id/carta" element={guard(<CoverLetterPage />)} />
      <Route path="/conta" element={guard(user ? <AccountPage user={user} /> : null)} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/conta-excluida" element={<AccountDeletedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <footer><Logo /><span>Currículos mais relevantes. Carreiras mais próximas.</span><nav className="footer-legal" aria-label="Legal"><Link to="/termos">Termos</Link><Link to="/privacidade">Privacidade</Link></nav><small>© 2026 Matchly</small></footer>
    <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={() => { setAuthOpen(false); navigate(afterAuth, { replace: true }) }} />
  </div>
}
