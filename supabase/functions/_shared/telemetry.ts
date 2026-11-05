// Telemetria técnica sem conteúdo pessoal. A parte pura (buildRun) é testável; recordRun é "melhor esforço" e nunca derruba a requisição.

export type RunKind = 'analyze' | 'optimize' | 'cover_letter'
export type RunOutcome = 'ok' | 'quota_exceeded' | 'invalid_input' | 'unsupported_numbers' | 'error'

export type Run = {
  kind: RunKind
  outcome: RunOutcome
  attempts: number
  verified: number | null
  total: number | null
  fidelity_ratio: number | null
  duration_ms: number
  error_code: string | null
}

type RunInput = {
  kind: RunKind
  outcome: RunOutcome
  attempts?: number
  errorCode?: string | null
  fidelity?: { verified: number; total: number; ratio: number } | null
  startedAt: number
  now?: number
}

const safeCode = (code: string | null | undefined) => (code && /^[a-z0-9_]{1,40}$/.test(code) ? code : 'unknown')

/**
 * Causa resumida de uma falha, sem dados pessoais: gemini_503, gemini_timeout, gemini_bad_json_max_tokens,
 * invalid_ai_output, db_42501... Serve para saber POR QUE uma chamada falhou olhando só a tabela ai_runs.
 */
export function classifyError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const status = /^Gemini status (\d{3})/.exec(message)
  if (status) return `gemini_${status[1]}`
  if (message === 'Gemini timeout') return 'gemini_timeout'
  const noText = /^Gemini sem texto \(([A-Z_]+)\)/.exec(message)
  if (noText) return `gemini_no_text_${noText[1].toLowerCase()}`.slice(0, 40)
  const badJson = /^Gemini JSON inválido \(([A-Z_]+)\)/.exec(message)
  if (badJson) return `gemini_bad_json_${badJson[1].toLowerCase()}`.slice(0, 40)
  if (message.startsWith('Gemini')) return 'gemini_unavailable'
  if (/Resposta da IA inválida|Score inválido|vazio|curta demais/i.test(message)) return 'invalid_ai_output'
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && /^[A-Za-z0-9]{2,12}$/.test(code)) return `db_${code.toLowerCase()}`
  return 'unknown'
}

export function buildRun(input: RunInput): Run {
  const { fidelity } = input
  const hasFidelity = Boolean(fidelity) && Number.isFinite(fidelity!.ratio)
  return {
    kind: input.kind,
    outcome: input.outcome,
    attempts: Math.max(0, Math.min(5, Math.trunc(input.attempts ?? 0))),
    verified: hasFidelity ? Math.max(0, Math.trunc(fidelity!.verified)) : null,
    total: hasFidelity ? Math.max(0, Math.trunc(fidelity!.total)) : null,
    fidelity_ratio: hasFidelity ? Math.round(Math.max(0, Math.min(1, fidelity!.ratio)) * 1000) / 1000 : null,
    duration_ms: Math.max(0, Math.round((input.now ?? Date.now()) - input.startedAt)),
    error_code: input.outcome === 'error' ? safeCode(input.errorCode) : null,
  }
}

// deno-lint-ignore no-explicit-any
export async function recordRun(client: any, userId: string, run: Run, requestId: string): Promise<void> {
  // Linha estruturada nos logs das Edge Functions (painel do Supabase), sem dados pessoais.
  console.log(JSON.stringify({ event: 'ai_run', request_id: requestId, ...run }))
  try {
    const { error } = await client.from('ai_runs').insert({ user_id: userId, ...run })
    if (error) console.error(JSON.stringify({ request_id: requestId, error: 'ai_run_insert_failed', code: error.code ?? 'unknown' }))
  } catch (_error) {
    console.error(JSON.stringify({ request_id: requestId, error: 'ai_run_insert_failed' }))
  }
}
