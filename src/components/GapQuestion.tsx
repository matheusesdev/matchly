import { useId, useState } from 'react'
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { MAX_ANSWER, validateAnswer, type UserFact } from '../../supabase/functions/_shared/facts'

type Props = {
  area: string
  fact?: UserFact
  canAdd: boolean
  onSave: (answer: string) => Promise<void>
  onRemove: () => Promise<void>
}

/** Pergunta "Você tem essa experiência?" para um gap. A resposta vira um fato informado pelo candidato. */
export function GapQuestion({ area, fact, canAdd, onSave, onRemove }: Props) {
  const fieldId = useId()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(fact?.answer ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const open = () => { setText(fact?.answer ?? ''); setError(''); setEditing(true) }
  const save = async () => {
    const problem = validateAnswer(text)
    if (problem) return setError(problem)
    setSaving(true); setError('')
    try { await onSave(text.replace(/\s+/g, ' ').trim()); setEditing(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.') }
    finally { setSaving(false) }
  }
  const remove = async () => {
    setSaving(true); setError('')
    try { await onRemove(); setEditing(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível remover.') }
    finally { setSaving(false) }
  }

  if (editing) {
    return <div className="gap-question">
      <label htmlFor={fieldId}><strong>Você tem experiência com “{area}”?</strong> Descreva o que fez. Informe apenas o que for verdade: o texto vira parte do seu currículo.</label>
      <textarea id={fieldId} value={text} maxLength={MAX_ANSWER} rows={3} onChange={(event) => setText(event.target.value)} placeholder="Ex.: Acompanhei a taxa de conversão semanal do checkout usando Mixpanel." />
      <div className="gap-question-row">
        <small>{text.length} / {MAX_ANSWER}</small>
        <div>
          <button type="button" className="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
          <button type="button" className="primary" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar resposta'}</button>
        </div>
      </div>
      {error && <div className="flow-error" role="alert">{error}</div>}
    </div>
  }

  if (fact) {
    return <div className="gap-question answered">
      <small><strong>Você informou:</strong> {fact.answer}</small>
      <div className="gap-question-row"><div>
        <button type="button" className="gap-link" onClick={open}><PencilSimple /> Editar</button>
        <button type="button" className="gap-link" onClick={remove} disabled={saving}><Trash /> Remover</button>
      </div></div>
      {error && <div className="flow-error" role="alert">{error}</div>}
    </div>
  }

  return <div className="gap-question">
    <button type="button" className="gap-link" onClick={open} disabled={!canAdd} title={canAdd ? undefined : 'Limite de respostas atingido'}><Plus /> Tenho essa experiência</button>
  </div>
}
