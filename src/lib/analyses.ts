import { supabase } from './supabase'
import type { Gap } from './api'
import type { EvidenceItem } from '../../supabase/functions/_shared/evidence'
import { sanitizeFacts, type UserFact } from '../../supabase/functions/_shared/facts'

export type SavedAnalysis = {
  analysis_id: string
  match_score: number
  missing_keywords: string[]
  gaps: Gap[]
  strengths: string[]
  job_text: string
  optimized_resume_text: string | null
  changes_summary: string[]
  evidence: EvidenceItem[]
  user_facts: UserFact[]
  created_at: string
  filename: string
  resume_text: string
}

export type AnalysisSummary = {
  id: string
  match_score: number
  created_at: string
  job_title: string
  filename: string
  has_optimized: boolean
}

type ResumeRef = { original_filename: string; raw_text?: string } | { original_filename: string; raw_text?: string }[] | null
const resumeOf = (ref: ResumeRef) => (Array.isArray(ref) ? ref[0] : ref)
const filenameOf = (ref: ResumeRef) => resumeOf(ref)?.original_filename ?? 'Currículo'

/** Usa a primeira linha não vazia da vaga como título (ex.: "Product Designer Sênior"). */
export function jobTitle(jobText: string, max = 80): string {
  const line = jobText.split('\n').map((part) => part.trim()).find(Boolean) ?? 'Vaga sem título'
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line
}

function client() {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.')
  return supabase
}

export async function fetchAnalysis(id: string): Promise<SavedAnalysis | null> {
  const { data, error } = await client().from('analyses')
    .select('id, match_score, missing_keywords, gaps, strengths, job_text, optimized_resume_text, changes_summary, evidence, user_facts, created_at, resumes(original_filename, raw_text)')
    .eq('id', id).maybeSingle()
  if (error) throw new Error('Não foi possível carregar a análise.')
  if (!data) return null
  return {
    analysis_id: data.id, match_score: data.match_score ?? 0, missing_keywords: data.missing_keywords ?? [], gaps: data.gaps ?? [],
    strengths: data.strengths ?? [], job_text: data.job_text, optimized_resume_text: data.optimized_resume_text,
    changes_summary: data.changes_summary ?? [], evidence: data.evidence ?? [], user_facts: sanitizeFacts(data.user_facts), created_at: data.created_at,
    filename: filenameOf(data.resumes as ResumeRef), resume_text: resumeOf(data.resumes as ResumeRef)?.raw_text ?? '',
  }
}

/** Salva as respostas do candidato. O servidor as relê do banco (e sanitiza) ao otimizar. */
export async function saveUserFacts(id: string, facts: UserFact[]): Promise<void> {
  const { error } = await client().from('analyses').update({ user_facts: sanitizeFacts(facts) }).eq('id', id)
  if (error) throw new Error('Não foi possível salvar sua resposta.')
}

export async function listAnalyses(): Promise<AnalysisSummary[]> {
  const { data, error } = await client().from('analyses')
    .select('id, match_score, job_text, optimized_resume_text, created_at, resumes(original_filename)')
    .order('created_at', { ascending: false }).limit(50)
  if (error) throw new Error('Não foi possível carregar seu histórico.')
  return (data ?? []).map((row) => ({
    id: row.id, match_score: row.match_score ?? 0, created_at: row.created_at, job_title: jobTitle(row.job_text),
    filename: filenameOf(row.resumes as ResumeRef), has_optimized: Boolean(row.optimized_resume_text),
  }))
}

/** Exclui a análise e, se nenhuma outra usar o mesmo currículo, o texto bruto dele também (privacidade). */
export async function deleteAnalysis(id: string): Promise<void> {
  const db = client()
  const { data: row, error: readError } = await db.from('analyses').select('resume_id').eq('id', id).maybeSingle()
  if (readError) throw new Error('Não foi possível excluir a análise.')
  const { error } = await db.from('analyses').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir a análise.')
  if (!row?.resume_id) return
  const { count } = await db.from('analyses').select('id', { count: 'exact', head: true }).eq('resume_id', row.resume_id)
  if (count === 0) await db.from('resumes').delete().eq('id', row.resume_id)
}
