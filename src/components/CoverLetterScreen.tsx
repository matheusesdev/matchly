import { useState } from 'react'
import { Check, Copy, FileArrowUp, MagicWand, Quotes, ShieldCheck, Warning } from '@phosphor-icons/react'
import type { CoverLetterResult, CoverLetterTone } from '../lib/api'
import { letterParagraphs } from '../lib/letterExport'

type Props = {
  letter: CoverLetterResult | null
  busy: boolean
  error: string
  onGenerate: (tone: CoverLetterTone) => void
  onBack: () => void
}

const tones: { value: CoverLetterTone; label: string; hint: string }[] = [
  { value: 'profissional', label: 'Profissional', hint: 'Objetiva e cordial' },
  { value: 'proximo', label: 'Próximo', hint: 'Natural, em tom de conversa' },
]

export function CoverLetterScreen({ letter, busy, error, onGenerate, onBack }: Props) {
  const [tone, setTone] = useState<CoverLetterTone>('profissional')
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [exportError, setExportError] = useState('')

  const items = letter?.evidence ?? []
  const verified = items.filter((item) => item.verified).length
  const pending = items.length - verified

  const copy = async () => {
    if (!letter) return
    try { await navigator.clipboard.writeText(letter.cover_letter); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { setExportError('Não foi possível copiar. Selecione o texto e copie manualmente.') }
  }
  const download = async (format: 'pdf' | 'docx') => {
    if (!letter) return
    setExportError('')
    try { await (await import('../lib/letterExport')).downloadLetter(letter.cover_letter, format) }
    catch { setExportError('Não foi possível gerar o arquivo. Tente novamente.') }
  }

  return <main className="letter-wrap">
    <div className="success-hero"><span><MagicWand weight="fill" /></span><div><div className="eyebrow">Carta de apresentação</div><h1>Uma carta para esta vaga.</h1><p>Escrita com o que já está no seu currículo (e nas respostas que você deu). Revise antes de enviar.</p></div></div>
    <div className="document-layout">
      <aside className="changes panel">
        <h3><MagicWand weight="fill" /> Como você quer o tom?</h3>
        <div className="tone-options" role="radiogroup" aria-label="Tom da carta">
          {tones.map((option) => <button key={option.value} type="button" role="radio" aria-checked={tone === option.value} className={tone === option.value ? 'active' : ''} onClick={() => setTone(option.value)}>
            <strong>{option.label}</strong><small>{option.hint}</small>
          </button>)}
        </div>
        <button className="primary" disabled={busy} onClick={() => onGenerate(tone)}>{busy ? 'Escrevendo...' : letter ? 'Gerar nova versão' : 'Gerar carta'}</button>
        {letter && <small className="letter-note">Gerar outra versão usa 1 das suas cartas diárias.</small>}
        {error && <div className="flow-error" role="alert">{error}</div>}
        {letter && <div className="fidelity" aria-live="polite">
          <h4><ShieldCheck weight="fill" /> Fidelidade ao seu currículo</h4>
          {items.length > 0
            ? <><p><strong>{verified} de {items.length}</strong> afirmações têm origem comprovada.</p>
              {pending > 0 && <p className="fidelity-warn"><Warning weight="fill" /> {pending} {pending === 1 ? 'afirmação merece' : 'afirmações merecem'} sua conferência.</p>}
              <small>Nenhum número novo foi adicionado.</small></>
            : <p className="fidelity-warn"><Warning weight="fill" /> Não conseguimos apontar a origem das afirmações desta carta. Leia com atenção e remova o que não for verdade.</p>}
        </div>}
        <button className="outline" onClick={onBack}>Voltar à análise</button>
      </aside>
      <section className="resume-preview">
        {!letter
          ? <div className="letter-empty"><Quotes weight="duotone" /><h2>Sua carta aparece aqui</h2><p>Escolha o tom e clique em “Gerar carta”. Leva alguns segundos.</p></div>
          : <>
            <div className="paper-head"><span>CARTA</span>
              <div className="download-actions">
                <button className="outline" onClick={copy}>{copied ? <><Check /> Copiado</> : <><Copy /> Copiar</>}</button>
                <button className="outline" onClick={() => download('pdf')}><FileArrowUp /> PDF</button>
                <button className="outline" onClick={() => download('docx')}><FileArrowUp /> DOCX</button>
              </div>
            </div>
            {exportError && <div className="flow-error" role="alert">{exportError}</div>}
            <article className="paper letter-paper" aria-label="Carta de apresentação">
              {letterParagraphs(letter.cover_letter).map((paragraph, index) => <p key={index}>{paragraph.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>)}
            </article>
            {items.length > 0 && <div className="letter-claims">
              <h3>De onde vem cada afirmação</h3>
              <ul>{items.map((item, index) => <li key={index} className={item.verified ? 'ok' : 'warn'}>
                <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>
                  {item.verified ? <Quotes weight="bold" aria-label="Origem comprovada" /> : <Warning weight="fill" aria-label="Conferir" />}
                  <span>{item.line}</span>
                </button>
                {open === index && <div className="ev-source" role="note">
                  {item.verified
                    ? <><strong className="ev-tag">{item.source === 'candidato' ? 'Informado por você' : 'Origem no seu currículo'}</strong><q>{item.quote}</q></>
                    : <><strong>Conferir antes de enviar</strong>Não encontramos no seu currículo um trecho que comprove esta frase. Mantenha só se for verdade.</>}
                </div>}
              </li>)}</ul>
            </div>}
          </>}
      </section>
    </div>
  </main>
}
