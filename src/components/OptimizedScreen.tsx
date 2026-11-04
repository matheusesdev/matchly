import { useState } from 'react'
import { Check, CheckCircle, FileArrowUp, Quotes, ShieldCheck, TrendUp, Warning } from '@phosphor-icons/react'
import type { OptimizedResult } from '../lib/api'
import { parseResumeText } from '../lib/resumeDocx'
import { findEvidence } from '../../supabase/functions/_shared/evidence'

type Props = { optimized: OptimizedResult; original: string; onBack: () => void }

export function OptimizedScreen({ optimized, original, onBack }: Props) {
  const [downloadError, setDownloadError] = useState('')
  const [tab, setTab] = useState<'optimized' | 'original'>('optimized')
  const [selected, setSelected] = useState<number | null>(null)
  const evidence = optimized.evidence ?? []
  const verified = evidence.filter((item) => item.verified).length
  const pending = evidence.length - verified
  const blocks = parseResumeText(optimized.optimized_resume)

  const download = async (format: 'docx' | 'pdf') => {
    setDownloadError('')
    try {
      if (format === 'pdf') await (await import('../lib/resumePdf')).downloadResumePdf(optimized.optimized_resume)
      else await (await import('../lib/resumeDocx')).downloadResumeDocx(optimized.optimized_resume)
    } catch { setDownloadError('Não foi possível gerar o arquivo. Tente novamente.') }
  }

  return <main className="optimized-wrap">
    <div className="success-hero"><span><Check weight="bold" /></span><div><div className="eyebrow">Currículo otimizado</div><h1>Sua versão para esta vaga.</h1><p>Revise o texto antes de enviar: a IA só reorganiza e reescreve o que já estava no seu currículo.</p></div></div>
    <div className="document-layout">
      <aside className="changes panel">
        <h3><TrendUp weight="fill" /> O que mudou</h3>
        <ul>{optimized.changes_summary.map(item => <li key={item}><CheckCircle weight="fill" /><span><strong>{item}</strong></span></li>)}</ul>
        <div className="fidelity" aria-live="polite">
          <h4><ShieldCheck weight="fill" /> Fidelidade ao original</h4>
          {evidence.length > 0
            ? <><p><strong>{verified} de {evidence.length}</strong> afirmações têm origem comprovada no seu currículo.</p>
              {pending > 0 && <p className="fidelity-warn"><Warning weight="fill" /> {pending} {pending === 1 ? 'frase merece' : 'frases merecem'} sua conferência (em amarelo).</p>}
              <small>Toque em uma frase para ver de onde ela veio. Nenhum número ou data novo foi adicionado.</small></>
            : <p>Esta versão foi gerada antes da verificação de origem. Nenhum número ou data novo foi adicionado, mas confira o texto antes de enviar.</p>}
        </div>
        <button className="outline" onClick={onBack}>Voltar à análise</button>
      </aside>
      <section className="resume-preview">
        <div className="paper-head">
          <div className="paper-tabs" role="tablist" aria-label="Versão do currículo">
            <button role="tab" aria-selected={tab === 'optimized'} className={tab === 'optimized' ? 'active' : ''} onClick={() => setTab('optimized')}>Otimizada</button>
            <button role="tab" aria-selected={tab === 'original'} className={tab === 'original' ? 'active' : ''} onClick={() => setTab('original')}>Original</button>
          </div>
          <div className="download-actions"><button className="outline" onClick={() => download('pdf')}><FileArrowUp /> Baixar PDF</button><button className="outline" onClick={() => download('docx')}><FileArrowUp /> Baixar DOCX</button></div>
        </div>
        {downloadError && <div className="flow-error" role="alert">{downloadError}</div>}
        {tab === 'original'
          ? <article className="paper optimized-text" aria-label="Currículo original">{original || 'Texto original indisponível.'}</article>
          : <article className="paper evidence-paper" aria-label="Currículo otimizado">
            {blocks.map((block, index) => {
              if (block.type === 'name') return <h2 key={index} className="ev-name">{block.text}</h2>
              if (block.type === 'heading') return <h4 key={index} className="ev-heading">{block.text}</h4>
              const item = findEvidence(evidence, block.text)
              const prefix = block.type === 'bullet' ? '• ' : ''
              if (!item) return <p key={index} className="ev-plain">{prefix}{block.text}</p>
              const open = selected === index
              return <div key={index} className={`ev-line ${item.verified ? 'ok' : 'warn'}`}>
                <button type="button" aria-expanded={open} onClick={() => setSelected(open ? null : index)}>
                  <span>{prefix}{block.text}</span>
                  {item.verified ? <Quotes weight="bold" aria-label="Origem comprovada" /> : <Warning weight="fill" aria-label="Conferir" />}
                </button>
                {open && <div className="ev-source" role="note">
                  {item.verified
                    ? <><strong>Origem no seu currículo</strong><q>{item.quote}</q></>
                    : <><strong>Conferir antes de enviar</strong>Não encontramos no seu currículo um trecho que comprove esta frase. Mantenha só se for verdade.</>}
                </div>}
              </div>
            })}
          </article>}
      </section>
    </div>
  </main>
}
