import { useState, type FormEvent } from 'react'
import { ArrowRight, Envelope, LockKey, X } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

type Props = { open: boolean; onClose: () => void }

export function AuthDialog({ open, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) setMessage('Confira seu e-mail para confirmar o cadastro.')
    else onClose()
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Fechar"><X /></button>
      <div className="auth-mark"><LockKey weight="fill" /></div>
      <span className="eyebrow">Sua conta Matchly</span>
      <h2 id="auth-title">{mode === 'login' ? 'Que bom ter você de volta.' : 'Comece a personalizar.'}</h2>
      <p>Salve suas análises e acesse seus currículos com segurança.</p>
      <form onSubmit={submit}>
        <label><span>E-mail</span><div><Envelope /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" /></div></label>
        <label><span>Senha</span><div><LockKey /><input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></div></label>
        {message && <div className="auth-message">{message}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'} <ArrowRight /></button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
        {mode === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tem uma conta? Entrar'}
      </button>
    </section>
  </div>
}
