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

const wordCount = (line: string) => line.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length

/** Separadores de uma linha de cargo/empresa/datas (ex.: "Analista · Acme · 2021 – Atual"). */
const CLAIM_SPLIT = /\s*[·|•]\s*|\s+[–—]\s+/
/** Separadores de uma lista de habilidades ou idiomas (ex.: "Excel · SAP, Fluxo de caixa"). */
const TERM_SPLIT = /\s*[·|•,;/]\s*|\s+[–—-]\s+/

/**
 * Linhas de conteúdo do currículo reescrito: tudo depois da primeira seção, exceto títulos.
 * (A primeira linha é sempre o nome, mesmo em maiúsculas.) Inclui linhas curtas, como habilidades.
 */
export function contentLines(optimizedText: string): string[] {
  const lines = optimizedText.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean)
  const offset = lines.slice(1).findIndex(isHeadingLine)
  if (offset < 0) return []
  return lines.slice(offset + 2).filter((line) => !isHeadingLine(line)).map(stripBullet).filter((line) => normalizeForMatch(line).length > 0)
}

/** A linha existe de fato nas fontes: idêntica a um trecho delas, ou formada só por termos que existem nelas. */
function supportedWithoutQuote(line: string, splitter: RegExp, sources: Locators): EvidenceSource | null {
  const whole = sources.quote(line)
  if (whole) return whole
  const terms = line.split(splitter).map((term) => term.trim()).filter((term) => normalizeForMatch(term).length >= 2)
  if (!terms.length) return null
  const origins = terms.map((term) => sources.term(term))
  if (!origins.every(Boolean)) return null
  return origins.includes('candidato') ? 'candidato' : 'curriculo'
}

/** Divide em frases (ponto final, ! ou ? seguidos de maiúscula ou número); abreviações como "Ltda. (varejo)" não dividem. */
export function splitSentences(line: string): string[] {
  return line.split(/(?<=[.!?])\s+(?=[\p{Lu}\d])/u).map((sentence) => sentence.trim()).filter(Boolean)
}

/** Cada frase precisa ter uma citação própria válida ou ser cópia fiel do original. Só vale com 2 frases ou mais. */
function verifySentences(line: string, byLine: Map<string, string[]>, sources: Locators): { quote: string; source: EvidenceSource } | null {
  const sentences = splitSentences(line)
  if (sentences.length < 2) return null
  const quotes: string[] = []
  const origins: EvidenceSource[] = []
  for (const sentence of sentences) {
    const cited = (byLine.get(normalizeForMatch(sentence)) ?? []).map((quote) => ({ quote, source: sources.quote(quote) })).find((candidate) => candidate.source)
    if (cited && cited.source) { quotes.push(cited.quote.replace(/\s+/g, ' ').trim()); origins.push(cited.source); continue }
    const literal = supportedWithoutQuote(sentence, CLAIM_SPLIT, sources)
    if (!literal) return null
    quotes.push(sentence); origins.push(literal)
  }
  return { quote: [...new Set(quotes)].join(' … ').slice(0, MAX_QUOTE_LENGTH), source: origins.includes('candidato') ? 'candidato' : 'curriculo' }
}

type Locators = { quote: (quote: string) => EvidenceSource | null; term: (term: string) => EvidenceSource | null }

/** Localiza citações (mínimo de 6 caracteres) e termos curtos (palavra inteira, ex.: "SAP") nas fontes. */
function makeLocators(original: string, extraSource: string): Locators {
  const padded = (text: string) => ` ${normalizeForMatch(text)} `
  const normalizedOriginal = normalizeForMatch(original)
  const normalizedExtra = normalizeForMatch(extraSource)
  const paddedOriginal = padded(original)
  const paddedExtra = padded(extraSource)
  return {
    quote: (quote) => {
      const normalized = normalizeForMatch(quote)
      if (normalized.length < MIN_QUOTE_LENGTH) return null
      if (normalizedOriginal.includes(normalized)) return 'curriculo'
      return normalizedExtra && normalizedExtra.includes(normalized) ? 'candidato' : null
    },
    term: (term) => {
      const needle = ` ${normalizeForMatch(term)} `
      if (needle.length < 4) return null
      if (paddedOriginal.includes(needle)) return 'curriculo'
      return paddedExtra.includes(needle) && normalizedExtra ? 'candidato' : null
    },
  }
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
  const sources = makeLocators(original, extraSource)
  const locate = sources.quote
  const byLine = new Map<string, string[]>()
  for (const entry of raw) {
    const key = normalizeForMatch(stripBullet(entry.line ?? ''))
    if (!key) continue
    byLine.set(key, [...(byLine.get(key) ?? []), String(entry.source_quote ?? '')])
  }
  const items: EvidenceItem[] = []
  for (const line of contentLines(optimizedText)) {
    const isClaim = wordCount(line) >= 4
    const quotes = byLine.get(normalizeForMatch(line)) ?? []
    const found = quotes.map((quote) => ({ quote, source: locate(quote) })).find((candidate) => candidate.source)
    if (found && found.source) {
      items.push({ line, quote: found.quote.replace(/\s+/g, ' ').trim().slice(0, MAX_QUOTE_LENGTH), verified: true, source: found.source })
      continue
    }
    // Sem citação válida: a linha ainda é aceita se for cópia fiel do original (ex.: cargo, empresa e datas) ou se cada
    // termo dela existir no original (ex.: lista de habilidades). Habilidade inventada não passa e é sinalizada.
    const origin = supportedWithoutQuote(line, isClaim ? CLAIM_SPLIT : TERM_SPLIT, sources)
    if (origin) { if (isClaim) items.push({ line, quote: line.slice(0, MAX_QUOTE_LENGTH), verified: true, source: origin }); continue }
    // Linha de várias frases (ex.: o resumo, que sintetiza o currículo): vale se CADA frase tiver prova.
    const bySentence = isClaim ? verifySentences(line, byLine, sources) : null
    if (bySentence) { items.push({ line, quote: bySentence.quote, verified: true, source: bySentence.source }); continue }
    items.push({ line, quote: '', verified: false })
  }
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
