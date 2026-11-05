// Módulo puro: fatos informados pelo próprio candidato para fechar gaps da vaga.
// São tratados como parte da fonte de verdade, mas sempre identificados como "informados pelo candidato".

export type UserFact = { area: string; answer: string }

export const MAX_FACTS = 6
export const MIN_ANSWER = 15
export const MAX_ANSWER = 400

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

/** Normaliza o que vem do banco/cliente: limita tamanhos, remove duplicados e respostas curtas demais. */
export function sanitizeFacts(raw: unknown): UserFact[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const facts: UserFact[] = []
  for (const entry of raw) {
    const item = (entry ?? {}) as Record<string, unknown>
    const area = clean(item.area, 80)
    const answer = clean(item.answer, MAX_ANSWER)
    if (!area || answer.length < MIN_ANSWER) continue
    const key = area.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    facts.push({ area, answer })
    if (facts.length >= MAX_FACTS) break
  }
  return facts
}

export function factsToText(facts: UserFact[]): string {
  return facts.map((fact) => `${fact.area}: ${fact.answer}`).join('\n')
}

/** Valida uma resposta digitada na interface. Retorna a mensagem de erro, ou '' se estiver ok. */
export function validateAnswer(answer: string): string {
  const length = clean(answer, Number.MAX_SAFE_INTEGER).length
  if (length < MIN_ANSWER) return `Descreva em pelo menos ${MIN_ANSWER} caracteres o que você fez.`
  if (length > MAX_ANSWER) return `Use no máximo ${MAX_ANSWER} caracteres.`
  return ''
}
