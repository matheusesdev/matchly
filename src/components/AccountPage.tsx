import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { DownloadSimple, SignOut, Trash, Warning } from '@phosphor-icons/react'
import { deleteAccount } from '../lib/api'
import { downloadMyData } from '../lib/account'
import { supabase } from '../lib/supabase'

export function AccountPage({ user }: { user: User }) {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const email = user.email ?? ''
  const canDelete = typed.trim().toLowerCase() === email.toLowerCase() && email !== ''

  const exportData = async () => {
    setExporting(true); setExportError('')
    try { await downloadMyData(user) }
    catch (cause) { setExportError(cause instanceof Error ? cause.message : 'Não foi possível baixar seus dados.') }
    finally { setExporting(false) }
  }
  const remove = async () => {
    setDeleting(true); setDeleteError('')
    try {
      await deleteAccount(typed)
      navigate('/conta-excluida', { replace: true })
      await supabase?.auth.signOut({ scope: 'local' })
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'Não foi possível excluir a conta.'); setDeleting(false) }
  }

  return <main className="account-wrap">
    <span className="eyebrow">Minha conta</span>
    <h1>Seus dados, sob seu controle.</h1>
    <p className="account-email">Conectado como <strong>{email}</strong></p>

    <section className="panel account-card">
      <h2><DownloadSimple weight="fill" /> Baixar meus dados</h2>
      <p>Receba em um arquivo JSON tudo o que guardamos: currículos (texto extraído), análises, versões otimizadas, cartas, respostas, registros de uso e registros técnicos das chamadas de IA.</p>
      <button className="outline" disabled={exporting} onClick={exportData}>{exporting ? 'Reunindo seus dados...' : 'Baixar arquivo'}</button>
      {exportError && <div className="flow-error" role="alert">{exportError}</div>}
    </section>

    <section className="panel account-card">
      <h2><SignOut weight="fill" /> Sair</h2>
      <p>Encerra a sessão neste navegador.</p>
      <button className="outline" onClick={async () => { await supabase?.auth.signOut(); navigate('/') }}>Sair da conta</button>
    </section>

    <section className="panel account-card danger">
      <h2><Trash weight="fill" /> Excluir minha conta</h2>
      <p>Apaga de forma definitiva sua conta, currículos, análises, respostas e registros de uso. <strong>Não dá para desfazer.</strong> Se quiser, baixe seus dados antes.</p>
      {!confirming
        ? <button className="outline danger-btn" onClick={() => setConfirming(true)}>Quero excluir minha conta</button>
        : <div className="danger-confirm">
          <label htmlFor="confirm-email"><Warning weight="fill" /> Para confirmar, digite o e-mail da sua conta: <strong>{email}</strong></label>
          <input id="confirm-email" type="email" autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={email} />
          <div className="danger-actions">
            <button className="outline" disabled={deleting} onClick={() => { setConfirming(false); setTyped(''); setDeleteError('') }}>Cancelar</button>
            <button className="primary danger-btn" disabled={!canDelete || deleting} onClick={remove}>{deleting ? 'Excluindo...' : 'Excluir definitivamente'}</button>
          </div>
        </div>}
      {deleteError && <div className="flow-error" role="alert">{deleteError}</div>}
    </section>
  </main>
}
