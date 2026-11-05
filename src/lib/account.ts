import type { User } from '@supabase/supabase-js'
import { saveBlob } from './download'
import { supabase } from './supabase'

type Row = Record<string, unknown>

/** Monta o arquivo de portabilidade (LGPD, art. 18, V). Pura para ser testável. */
export function assembleExport(user: Pick<User, 'id' | 'email'>, tables: { resumes: Row[]; analyses: Row[]; usage_events: Row[]; ai_runs: Row[] }, now = new Date()) {
  return {
    exportado_em: now.toISOString(),
    conta: { id: user.id, email: user.email ?? null },
    curriculos: tables.resumes,
    analises: tables.analyses,
    uso: tables.usage_events,
    execucoes_ia: tables.ai_runs,
  }
}

/** Baixa todos os dados da conta em JSON. As políticas de RLS garantem que só os registros do próprio usuário voltam. */
export async function downloadMyData(user: User): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.')
  const [resumes, analyses, usage, runs] = await Promise.all([
    supabase.from('resumes').select('*').order('created_at'),
    supabase.from('analyses').select('*').order('created_at'),
    supabase.from('usage_events').select('*').order('created_at'),
    supabase.from('ai_runs').select('*').order('created_at'),
  ])
  if (resumes.error || analyses.error || usage.error || runs.error) throw new Error('Não foi possível reunir seus dados. Tente novamente.')
  const payload = assembleExport(user, { resumes: resumes.data ?? [], analyses: analyses.data ?? [], usage_events: usage.data ?? [], ai_runs: runs.data ?? [] })
  saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'meus-dados-matchly.json')
}
