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
}

type RunInput = {
  kind: RunKind
  outcome: RunOutcome
  attempts?: number
  fidelity?: { verified: number; total: number; ratio: number } | null
  startedAt: number
  now?: number
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
