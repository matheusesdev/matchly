import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isJsonRequest, json, requestId } from '../_shared/http.ts'
import { findUnsupportedNumbers, parseOptimization, type Optimization } from '../_shared/ai-output.ts'
import { MIN_VERIFIED_RATIO, isAcceptable, pickBetter, verifyEvidence, type Attempt } from '../_shared/evidence.ts'
import { OPTIMIZATION_SCHEMA, buildOptimizationPrompt, type OptimizationFeedback } from '../_shared/prompts.ts'
import { factsToText, sanitizeFacts } from '../_shared/facts.ts'
import { consumeQuota, dailyLimit } from '../_shared/quota.ts'
import { buildRun, classifyError, isRefundable, recordRun } from '../_shared/telemetry.ts'
import { PROVIDER_BUSY_MESSAGE } from '../_shared/http.ts'
import { refundUsage } from '../_shared/refund.ts'

Deno.serve(async (request) => {
  const id = requestId(request)
  const startedAt = Date.now()
  let attempts = 0
  let quotaEventId: string | null = null
  // deno-lint-ignore no-explicit-any
  let actor: { client: any; userId: string } | null = null
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isJsonRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const access = await authorizeMvpUser(request)
    if (!access.allowed) return json(request, { error: access.error }, access.status, id)
    const { client, userId } = access
    actor = { client, userId }
    const body = await request.json(); const analysisId = body?.analysis_id
    if (typeof analysisId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(analysisId)) return json(request, { error: 'Identificador inválido.' }, 400, id)
    const { data, error } = await client.from('analyses').select('id, job_text, user_facts, resumes(raw_text)').eq('id', analysisId).eq('user_id', userId).single(); if (error || !data) return json(request, { error: 'Análise não encontrada.' }, 404, id)
    const resume = Array.isArray(data.resumes) ? data.resumes[0] : data.resumes
    const original: string = resume?.raw_text ?? ''
    // Fatos informados pelo candidato vêm do banco (nunca do corpo da requisição) e são sanitizados.
    const factsText = factsToText(sanitizeFacts(data.user_facts))
    const knownSource = factsText ? `${original}\n${factsText}` : original
    const quota = await consumeQuota(client, userId, 'optimize', dailyLimit('optimize', (n) => Deno.env.get(n)))
    quotaEventId = quota.eventId
    if (!quota.ok) { await recordRun(client, userId, buildRun({ kind: 'optimize', outcome: 'quota_exceeded', startedAt }), id); return json(request, { error: 'Você atingiu o limite diário de otimizações. Tente novamente amanhã.' }, 429, id) }

    // Até 2 tentativas: reprova números inventados e exige que a maioria das afirmações cite um trecho real do original.
    const generate = async (feedback?: OptimizationFeedback): Promise<Attempt<Optimization>> => {
      attempts++
      const value = parseOptimization(await callGemini(buildOptimizationPrompt(data.job_text, original, feedback, factsText), OPTIMIZATION_SCHEMA))
      return { value, invented: findUnsupportedNumbers(knownSource, value.optimized_resume), fidelity: verifyEvidence(original, value.optimized_resume, value.evidence, factsText) }
    }
    let best = await generate()
    if (!isAcceptable(best)) {
      const second = await generate({ invented: best.invented, lowEvidence: best.fidelity.ratio < MIN_VERIFIED_RATIO })
      best = pickBetter(best, second)
    }
    if (best.invented.length) {
      console.error(JSON.stringify({ request_id: id, error: 'unsupported_numbers', count: best.invented.length }))
      if (quotaEventId) await refundUsage(quotaEventId)
      await recordRun(client, userId, buildRun({ kind: 'optimize', outcome: 'unsupported_numbers', attempts, fidelity: best.fidelity, startedAt }), id)
      return json(request, { error: 'Não conseguimos gerar uma versão fiel ao seu currículo desta vez. Tente novamente.' }, 502, id)
    }
    const optimized = { optimized_resume: best.value.optimized_resume, changes_summary: best.value.changes_summary, evidence: best.fidelity.items }

    const { error: updateError } = await client.from('analyses').update({ optimized_resume_text: optimized.optimized_resume, changes_summary: optimized.changes_summary, evidence: optimized.evidence }).eq('id', data.id).eq('user_id', userId); if (updateError) throw updateError
    await recordRun(client, userId, buildRun({ kind: 'optimize', outcome: 'ok', attempts, fidelity: best.fidelity, startedAt }), id)
    return json(request, optimized, 200, id)
  } catch (error) {
    const code = classifyError(error)
    const refundable = isRefundable(code)
    if (refundable && quotaEventId) await refundUsage(quotaEventId)
    if (actor) await recordRun(actor.client, actor.userId, buildRun({ kind: 'optimize', outcome: 'error', attempts, errorCode: code, startedAt }), id)
    console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown', code })); if (refundable) return json(request, { error: PROVIDER_BUSY_MESSAGE }, 503, id); return json(request, { error: 'Não foi possível otimizar o currículo.' }, 500, id) }
})
