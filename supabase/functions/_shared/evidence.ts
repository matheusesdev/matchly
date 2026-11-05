// Módulo puro (sem APIs do Deno): verificação de fidelidade do currículo otimizado.
// A IA cita, para cada afirmação, um trecho literal do original; aqui conferimos se a citação existe de fato.

export type RawEvidence = { line: string; source_quote: string }
export type EvidenceSource = 'curriculo' | 'candidato'
export type EvidenceItem = { line: string; quote: string; verified: boolean; source?: EvidenceSource }
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

/** Diz de qual fonte (currículo ou respostas do candidato) uma citação vem; null se não existir literalmente. */
function makeLocator(original: string, extraSource: string) {
  const normalizedOriginal = normalizeForMatch(original)
  const normalizedExtra = normalizeForMatch(extraSource)
  return (quote: string): EvidenceSource | null => {
    const normalized = normalizeForMatch(quote)
    if (normalized.length < MIN_QUOTE_LENGTH) return null
    if (normalizedOriginal.includes(normalized)) return 'curriculo'
    return normalizedExtra && normalizedExtra.includes(normalized) ? 'candidato' : null
  }
}

/**
 * Carta de apresentação: a IA aponta as frases factuais da carta e a citação que as sustenta.
 * Só valem frases que realmente aparecem na carta; a citação precisa existir no currículo ou nas respostas.
 * Carta sem nenhuma afirmação apontada tem fidelidade 0 (não dá para provar nada).
 */
export function verifyLetter(letter: string, raw: RawEvidence[], original: string, extraSource = ''): Fidelity {
  const locate = makeLocator(original, extraSource)
  const normalizedLetter = normalizeForMatch(letter)
  const seen = new Set<string>()
  const items: EvidenceItem[] = []
  for (const entry of raw) {
    const claim = String(entry.line ?? '').replace(/\s+/g, ' ').trim()
    const key = normalizeForMatch(claim)
    if (key.length < MIN_QUOTE_LENGTH || seen.has(key) || !normalizedLetter.includes(key)) continue
    seen.add(key)
    const source = locate(String(entry.source_quote ?? ''))
    items.push(source
      ? { line: claim, quote: String(entry.source_quote).replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_LENGTH), verified: true, source }
      : { line: claim, quote: '', verified: false })
  }
  const verified = items.filter((item) => item.verified).length
  return { items, total: items.length, verified, ratio: items.length ? verified / items.length : 0 }
}

/** `extraSource` = fatos informados pelo candidato: também valem como prova, mas ficam identificados. */
export function verifyEvidence(original: string, optimizedText: string, raw: RawEvidence[], extraSource = ''): Fidelity {
  const locate = makeLocator(original, extraSource)
  const byLine = new Map<string, string[]>()
  for (const entry of raw) {
    const key = normalizeForMatch(stripBullet(entry.line ?? ''))
    if (!key) continue
    byLine.set(key, [...(byLine.get(key) ?? []), String(entry.source_quote ?? '')])
  }
  const items: EvidenceItem[] = claimLines(optimizedText).map((line) => {
    const quotes = byLine.get(normalizeForMatch(line)) ?? []
    const found = quotes.map((quote) => ({ quote, source: locate(quote) })).find((candidate) => candidate.source)
    if (!found || !found.source) return { line, quote: '', verified: false }
    return { line, quote: found.quote.replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_LENGTH), verified: true, source: found.source }
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
