import { useState, type FormEvent } from 'react'
import { ArrowRight, Envelope, LockKey, X } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

type Props = { open: boolean; onClose: () => void }

export function AuthDialog({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    const result = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    onClose()
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Fechar"><X /></button>
      <div className="auth-mark"><LockKey weight="fill" /></div>
      <span className="eyebrow">Sua conta Matchly</span>
      <h2 id="auth-title">Acesso ao MVP</h2>
      <p>O Matchly está em testes fechados. Entre com uma conta convidada.</p>
      <form onSubmit={submit}>
        <label><span>E-mail</span><div><Envelope /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" /></div></label>
        <label><span>Senha</span><div><LockKey /><input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></div></label>
        {message && <div className="auth-message">{message}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Aguarde...' : 'Entrar'} <ArrowRight /></button>
      </form>
      <p className="auth-access-note">O acesso é liberado manualmente durante esta fase.</p>
    </section>
  </div>
}
