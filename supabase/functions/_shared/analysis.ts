// Módulo puro (sem APIs do Deno): verificação da análise de aderência.
// A IA cita, para cada ponto forte, um trecho do currículo e, para cada lacuna, um trecho da vaga.
// Aqui conferimos que as citações existem de fato e que nenhum número foi inventado.

import { findUnsupportedNumbers } from './ai-output.ts'
import { normalizeForMatch } from './evidence.ts'

export type Gap = { area: string; descricao: string }
export type AnalysisDraft = {
  match_score: number
  strengths: { text: string; quote: string }[]
  gaps: { area: string; descricao: string; quote: string }[]
  matched_keywords: string[]
  missing_keywords: string[]
}
export type Analysis = {
  match_score: number
  strengths: string[]
  gaps: Gap[]
  matched_keywords: string[]
  missing_keywords: string[]
}
export type AnalysisStats = { proposed: number; kept: number }

const MIN_QUOTE = 6
const MAX = { strengths: 6, gaps: 5, keywords: 10 }

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

function list(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => clean(item, maxLength)).filter(Boolean))]
}

export function parseAnalysisDraft(raw: unknown): AnalysisDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta da IA inválida')
  const data = raw as Record<string, unknown>
  const score = Number(data.match_score)
  if (!Number.isFinite(score)) throw new Error('Score inválido')
  const strengths = (Array.isArray(data.strengths) ? data.strengths : []).map((entry) => {
    // Aceita texto puro (sem citação), que será descartado na verificação.
    if (typeof entry === 'string') return { text: clean(entry, 200), quote: '' }
    const item = (entry ?? {}) as Record<string, unknown>
    return { text: clean(item.text, 200), quote: clean(item.resume_quote, 500) }
  }).filter((item) => item.text)
  const gaps = (Array.isArray(data.gaps) ? data.gaps : []).map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>
    return { area: clean(item.area, 80), descricao: clean(item.descricao, 300), quote: clean(item.job_quote, 500) }
  }).filter((item) => item.area && item.descricao)
  return {
    match_score: Math.max(0, Math.min(100, Math.round(score))),
    strengths: strengths.slice(0, 12),
    gaps: gaps.slice(0, 10),
    matched_keywords: list(data.matched_keywords, 20, 60),
    missing_keywords: list(data.missing_keywords, 20, 60),
  }
}

/** Palavra inteira (ou expressão) dentro do texto, ignorando caixa, acentos de pontuação e quebras de linha. */
function containsTerm(text: string, term: string) {
  const normalizedTerm = normalizeForMatch(term)
  if (normalizedTerm.length < 2) return false
  return ` ${normalizeForMatch(text)} `.includes(` ${normalizedTerm} `)
}

function containsQuote(text: string, quote: string) {
  const normalized = normalizeForMatch(quote)
  return normalized.length >= MIN_QUOTE && normalizeForMatch(text).includes(normalized)
}

export function verifyAnalysis(draft: AnalysisDraft, resume: string, job: string): { analysis: Analysis; stats: AnalysisStats } {
  const strengths = draft.strengths
    .filter((item) => containsQuote(resume, item.quote) && findUnsupportedNumbers(resume, item.text).length === 0)
    .map((item) => item.text)
    .slice(0, MAX.strengths)
  const gaps = draft.gaps
    .filter((item) => containsQuote(job, item.quote))
    .map(({ area, descricao }) => ({ area, descricao }))
    .slice(0, MAX.gaps)
  // Palavra-chave "encontrada" precisa estar no currículo e na vaga; "ausente" precisa estar na vaga e NÃO no currículo.
  const matched = draft.matched_keywords.filter((term) => containsTerm(resume, term) && containsTerm(job, term)).slice(0, MAX.keywords)
  const missing = draft.missing_keywords.filter((term) => containsTerm(job, term) && !containsTerm(resume, term)).slice(0, MAX.keywords)
  return {
    analysis: { match_score: draft.match_score, strengths, gaps, matched_keywords: matched, missing_keywords: missing },
    stats: { proposed: draft.strengths.length + draft.gaps.length, kept: strengths.length + gaps.length },
  }
}
