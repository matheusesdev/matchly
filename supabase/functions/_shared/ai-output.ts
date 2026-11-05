// Módulo puro (sem APIs do Deno) para poder ser testado com Vitest.
import { splitSentences } from './evidence.ts'

export type Optimization = { optimized_resume: string; changes_summary: string[]; evidence: { line: string; source_quote: string }[] }

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

function stringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems)
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

export type CoverLetter = { cover_letter: string; evidence: { line: string; source_quote: string }[] }

export const MIN_LETTER_WORDS = 130

export const countWords = (text: string) => text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length

// A IA às vezes cola a despedida no fim do último parágrafo ("... agradeço. Atenciosamente,"). Ela vai para parágrafo próprio.
const SIGN_OFF = /([.!?])[ \t]+((?:Atenciosamente|Cordialmente|Cumprimentos|Um abraço|Abraços?),)/

export function normalizeLetter(text: string): string {
  const separated = text.replace(/\r\n/g, '\n').replace(SIGN_OFF, '$1\n\n$2').replace(/\n{3,}/g, '\n\n').trim()
  return ensureParagraphs(separated)
}

const SIGN_OFF_START = /(?:Atenciosamente|Cordialmente|Cumprimentos|Um abraço|Abraços?),/g

/**
 * Se a IA devolver o corpo da carta em um bloco único, reconstrói 3 parágrafos (abertura, meio, fechamento) a partir das
 * frases. Só reorganiza espaços: o texto das frases não muda, então a verificação de origem continua valendo.
 */
export function ensureParagraphs(text: string): string {
  const signOffs = [...text.matchAll(SIGN_OFF_START)]
  const cut = signOffs.length ? signOffs[signOffs.length - 1].index! : text.length
  const body = text.slice(0, cut).trim()
  const signOff = text.slice(cut).trim()
  if (body.includes('\n\n')) return text
  const sentences = splitSentences(body.replace(/\s*\n\s*/g, ' '))
  if (sentences.length < 5) return text
  const opening = sentences.slice(0, 2).join(' ')
  const closing = sentences[sentences.length - 1]
  const middle = sentences.slice(2, -1).join(' ')
  return [opening, middle, closing, signOff].filter(Boolean).join('\n\n')
}

export function parseCoverLetter(raw: unknown): CoverLetter {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta da IA inválida')
  const data = raw as Record<string, unknown>
  const text = typeof data.cover_letter === 'string' ? normalizeLetter(data.cover_letter) : ''
  if (text.length < 200) throw new Error('Carta vazia ou curta demais')
  const evidence = (Array.isArray(data.evidence) ? data.evidence : [])
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>
      return { line: clean(item.line, 600), source_quote: clean(item.source_quote, 600) }
    })
    .filter((entry) => entry.line)
    .slice(0, 30)
  return { cover_letter: text.slice(0, 4000), evidence }
}
