import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileDoc, MagicWand, Plus, Trash } from '@phosphor-icons/react'
import { deleteAnalysis, listAnalyses, type AnalysisSummary } from '../lib/analyses'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const scoreTone = (score: number) => (score >= 75 ? 'good' : score >= 50 ? 'mid' : 'low')

export function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AnalysisSummary[] | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    listAnalyses().then((rows) => active && setItems(rows)).catch((cause) => active && setError(cause.message))
    return () => { active = false }
  }, [])

  const remove = async (id: string) => {
    setDeleting(true); setError('')
    try {
      await deleteAnalysis(id)
      setItems((current) => current?.filter((item) => item.id !== id) ?? null)
      setConfirming(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir.') }
    finally { setDeleting(false) }
  }

  return <main className="history-wrap">
    <div className="history-head">
      <div><span className="eyebrow">Seu histórico</span><h1>Minhas análises</h1><p>Volte a qualquer análise ou versão otimizada. Excluir remove também o texto do seu currículo, se ele não for usado em outra análise.</p></div>
      <button className="primary" onClick={() => navigate('/analisar')}><Plus weight="bold" /> Nova análise</button>
    </div>
    {error && <div className="flow-error" role="alert">{error}</div>}
    {items === null && !error && <p className="history-empty" role="status">Carregando...</p>}
    {items?.length === 0 && <div className="history-empty"><MagicWand weight="duotone" /><h2>Nenhuma análise ainda</h2><p>Envie seu currículo e a descrição de uma vaga para começar.</p><button className="primary" onClick={() => navigate('/analisar')}>Fazer minha primeira análise <ArrowRight weight="bold" /></button></div>}
    <ul className="history-list">
      {items?.map((item) => <li key={item.id} className="history-item">
        <button className="history-open" onClick={() => navigate(`/analises/${item.id}`)}>
          <span className={`history-score ${scoreTone(item.match_score)}`}><strong>{item.match_score}</strong><small>/100</small></span>
          <span className="history-info">
            <strong>{item.job_title}</strong>
            <small><FileDoc /> {item.filename} · {dateFormat.format(new Date(item.created_at))}{item.has_optimized && ' · versão otimizada'}</small>
          </span>
          <ArrowRight weight="bold" />
        </button>
        {confirming === item.id
          ? <div className="history-confirm" role="alert"><span>Excluir esta análise?</span><button className="outline" disabled={deleting} onClick={() => remove(item.id)}>{deleting ? 'Excluindo...' : 'Sim, excluir'}</button><button className="outline" onClick={() => setConfirming(null)}>Cancelar</button></div>
          : <button className="history-delete" aria-label={`Excluir análise: ${item.job_title}`} onClick={() => setConfirming(item.id)}><Trash /></button>}
      </li>)}
    </ul>
  </main>
}
