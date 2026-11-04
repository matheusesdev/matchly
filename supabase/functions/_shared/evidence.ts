// Módulo puro (sem APIs do Deno): verificação de fidelidade do currículo otimizado.
// A IA cita, para cada afirmação, um trecho literal do original; aqui conferimos se a citação existe de fato.

export type RawEvidence = { line: string; source_quote: string }
export type EvidenceItem = { line: string; quote: string; verified: boolean }
export type Fidelity = { items: EvidenceItem[]; total: number; verified: number; ratio: number }

const MIN_QUOTE_LENGTH = 6
const MAX_QUOTE_LENGTH = 300
const bulletPrefix = /^\s*(?:[-•*–])\s+/

/** Compara textos ignorando caixa, pontuação, marcadores e quebras de linha. */
export function normalizeForMatch(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function isHeadingLine(line: string): boolean {
  const letters = line.replace(/[^\p{L}]/gu, '')
  return letters.length >= 3 && line.length <= 60 && line === line.toUpperCase() && !bulletPrefix.test(line)
}

export function stripBullet(line: string): string {
  return line.replace(bulletPrefix, '').trim()
}

/** Linhas que fazem afirmações sobre o candidato: depois da 1ª seção, fora títulos, com pelo menos 4 palavras. */
export function claimLines(optimizedText: string): string[] {
  const lines = optimizedText.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean)
  // A 1ª linha é sempre o nome (pode estar em maiúsculas); a busca por seções começa na 2ª.
  const offset = lines.slice(1).findIndex(isHeadingLine)
  if (offset < 0) return []
  const firstHeading = offset + 1
  return lines
    .slice(firstHeading + 1)
    .filter((line) => !isHeadingLine(line))
    .map(stripBullet)
    .filter((line) => line.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length >= 4)
}

export function verifyEvidence(original: string, optimizedText: string, raw: RawEvidence[]): Fidelity {
  const normalizedOriginal = normalizeForMatch(original)
  const byLine = new Map<string, string[]>()
  for (const entry of raw) {
    const key = normalizeForMatch(stripBullet(entry.line ?? ''))
    if (!key) continue
    byLine.set(key, [...(byLine.get(key) ?? []), String(entry.source_quote ?? '')])
  }
  const items: EvidenceItem[] = claimLines(optimizedText).map((line) => {
    const quotes = byLine.get(normalizeForMatch(line)) ?? []
    const valid = quotes.find((quote) => {
      const normalized = normalizeForMatch(quote)
      return normalized.length >= MIN_QUOTE_LENGTH && normalizedOriginal.includes(normalized)
    })
    return { line, quote: valid ? valid.replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_LENGTH) : '', verified: Boolean(valid) }
  })
  const verified = items.filter((item) => item.verified).length
  return { items, total: items.length, verified, ratio: items.length ? verified / items.length : 1 }
}

/** Busca a evidência de uma linha exibida na interface. */
export function findEvidence(items: EvidenceItem[], displayedLine: string): EvidenceItem | undefined {
  const key = normalizeForMatch(stripBullet(displayedLine))
  return items.find((item) => normalizeForMatch(item.line) === key)
}

export const MIN_VERIFIED_RATIO = 0.6

export type Attempt<T> = { value: T; invented: string[]; fidelity: Fidelity }

/** Uma tentativa é aceitável sem repetir quando não inventa números e a maioria das afirmações tem origem. */
export function isAcceptable(attempt: { invented: string[]; fidelity: Fidelity }): boolean {
  return attempt.invented.length === 0 && attempt.fidelity.ratio >= MIN_VERIFIED_RATIO
}

/** Entre duas tentativas, prefere a que não inventa números e, depois, a de maior fidelidade. */
export function pickBetter<T>(a: Attempt<T>, b: Attempt<T>): Attempt<T> {
  if ((a.invented.length === 0) !== (b.invented.length === 0)) return a.invented.length === 0 ? a : b
  return b.fidelity.ratio > a.fidelity.ratio ? b : a
}
