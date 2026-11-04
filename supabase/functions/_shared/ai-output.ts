// Módulo puro (sem APIs do Deno) para poder ser testado com Vitest.

export type Gap = { area: string; descricao: string }
export type Analysis = { match_score: number; missing_keywords: string[]; gaps: Gap[]; strengths: string[] }
export type Optimization = { optimized_resume: string; changes_summary: string[]; evidence: { line: string; source_quote: string }[] }

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

function stringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems)
}

export function parseAnalysis(raw: unknown): Analysis {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta da IA inválida')
  const data = raw as Record<string, unknown>
  const score = Number(data.match_score)
  if (!Number.isFinite(score)) throw new Error('Score inválido')
  const gaps = (Array.isArray(data.gaps) ? data.gaps : [])
    .map((gap) => {
      const item = (gap ?? {}) as Record<string, unknown>
      return { area: clean(item.area, 80), descricao: clean(item.descricao, 300) }
    })
    .filter((gap) => gap.area && gap.descricao)
    .slice(0, 8)
  return {
    match_score: Math.max(0, Math.min(100, Math.round(score))),
    missing_keywords: stringList(data.missing_keywords, 15, 60),
    gaps,
    strengths: stringList(data.strengths, 8, 160),
  }
}

export function parseOptimization(raw: unknown): Optimization {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta da IA inválida')
  const data = raw as Record<string, unknown>
  const text = typeof data.optimized_resume === 'string' ? data.optimized_resume.trim() : ''
  if (text.length < 50) throw new Error('Currículo otimizado vazio')
  const evidence = (Array.isArray(data.evidence) ? data.evidence : [])
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>
      return { line: clean(item.line, 600), source_quote: clean(item.source_quote, 600) }
    })
    .filter((entry) => entry.line)
    .slice(0, 80)
  return { optimized_resume: text.slice(0, 20_000), changes_summary: stringList(data.changes_summary, 8, 200), evidence }
}

const numberToken = /\d[\d.,]*/g

function normalizeNumber(token: string) {
  return token.replace(/[.,]+$/, '').replace(/[.,]/g, '')
}

/**
 * Guarda determinística contra invenção de métricas, datas e quantidades:
 * todo número presente no texto otimizado precisa existir no currículo original.
 */
export function findUnsupportedNumbers(original: string, optimized: string): string[] {
  const known = new Set((original.match(numberToken) ?? []).map(normalizeNumber))
  const unsupported = new Set<string>()
  for (const token of optimized.match(numberToken) ?? []) {
    if (!known.has(normalizeNumber(token))) unsupported.add(token.replace(/[.,]+$/, ''))
  }
  return [...unsupported]
}
