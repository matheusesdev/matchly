import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { EvidenceItem } from '../../supabase/functions/_shared/evidence'

export type Gap = { area: string; descricao: string }
export type AnalysisResult = {
  analysis_id: string
  match_score: number
  missing_keywords: string[]
  gaps: Gap[]
  strengths: string[]
}

export type OptimizedResult = {
  optimized_resume: string
  changes_summary: string[]
  evidence?: EvidenceItem[]
}

async function functionError(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json()
      if (payload?.error) return new Error(String(payload.error))
    } catch {
      // A resposta pode não ser JSON; nesse caso usamos a mensagem original.
    }
  }
  return new Error(error instanceof Error ? error.message : fallback)
}

async function authorizationHeaders() {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  if (!data.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  return { Authorization: `Bearer ${data.session.access_token}` }
}

export async function analyzeResume(file: File, jobText: string): Promise<AnalysisResult> {
  if (!supabase) throw new Error('Supabase não configurado')
  const body = new FormData()
  body.append('resume', file)
  body.append('job_text', jobText)
  const { data, error } = await supabase.functions.invoke<AnalysisResult>('analyze-resume', {
    body,
    headers: await authorizationHeaders(),
  })
  if (error) throw await functionError(error, 'Não foi possível analisar o currículo')
  if (!data) throw new Error('A análise não retornou dados')
  return data
}

export async function optimizeResume(analysisId: string): Promise<OptimizedResult> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.functions.invoke<OptimizedResult>('optimize-resume', {
    body: { analysis_id: analysisId },
    headers: await authorizationHeaders(),
  })
  if (error) throw await functionError(error, 'Não foi possível otimizar o currículo')
  if (!data) throw new Error('A otimização não retornou dados')
  return data
}

export type CoverLetterTone = 'profissional' | 'proximo'
export type CoverLetterResult = { cover_letter: string; evidence: EvidenceItem[] }

export async function generateCoverLetter(analysisId: string, tone: CoverLetterTone): Promise<CoverLetterResult> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.functions.invoke<CoverLetterResult>('generate-cover-letter', {
    body: { analysis_id: analysisId, tone },
    headers: await authorizationHeaders(),
  })
  if (error) throw await functionError(error, 'Não foi possível gerar a carta')
  if (!data) throw new Error('A geração não retornou dados')
  return data
}

export async function deleteAccount(confirmEmail: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.functions.invoke('delete-account', {
    body: { confirm_email: confirmEmail },
    headers: await authorizationHeaders(),
  })
  if (error) throw await functionError(error, 'Não foi possível excluir a conta')
}
