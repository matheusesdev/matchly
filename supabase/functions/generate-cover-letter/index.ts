import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isJsonRequest, json, requestId } from '../_shared/http.ts'
import { findUnsupportedNumbers, parseCoverLetter, type CoverLetter } from '../_shared/ai-output.ts'
import { MIN_VERIFIED_RATIO, isAcceptable, pickBetter, verifyLetter, type Attempt } from '../_shared/evidence.ts'
import { factsToText, sanitizeFacts } from '../_shared/facts.ts'
import { COVER_LETTER_SCHEMA, buildCoverLetterPrompt, isCoverLetterTone, type OptimizationFeedback } from '../_shared/prompts.ts'
import { consumeQuota, dailyLimit } from '../_shared/quota.ts'
import { buildRun, recordRun } from '../_shared/telemetry.ts'

Deno.serve(async (request) => {
  const id = requestId(request)
  const startedAt = Date.now()
  let attempts = 0
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
    const tone = body?.tone ?? 'profissional'
    if (!isCoverLetterTone(tone)) return json(request, { error: 'Tom inválido.' }, 400, id)
    const { data, error } = await client.from('analyses').select('id, job_text, user_facts, resumes(raw_text)').eq('id', analysisId).eq('user_id', userId).single(); if (error || !data) return json(request, { error: 'Análise não encontrada.' }, 404, id)
    const resume = Array.isArray(data.resumes) ? data.resumes[0] : data.resumes
    const original: string = resume?.raw_text ?? ''
    const factsText = factsToText(sanitizeFacts(data.user_facts))
    // Números só valem se estiverem no currículo ou nas respostas do candidato (números da vaga não contam).
    const knownSource = factsText ? `${original}\n${factsText}` : original
    if (!(await consumeQuota(client, userId, 'cover_letter', dailyLimit('cover_letter', (n) => Deno.env.get(n))))) { await recordRun(client, userId, buildRun({ kind: 'cover_letter', outcome: 'quota_exceeded', startedAt }), id); return json(request, { error: 'Você atingiu o limite diário de cartas. Tente novamente amanhã.' }, 429, id) }

    const generate = async (feedback?: OptimizationFeedback): Promise<Attempt<CoverLetter>> => {
      attempts++
      const value = parseCoverLetter(await callGemini(buildCoverLetterPrompt(data.job_text, original, factsText, tone, feedback), COVER_LETTER_SCHEMA))
      return { value, invented: findUnsupportedNumbers(knownSource, value.cover_letter), fidelity: verifyLetter(value.cover_letter, value.evidence, original, factsText) }
    }
    let best = await generate()
    if (!isAcceptable(best)) {
      const second = await generate({ invented: best.invented, lowEvidence: best.fidelity.ratio < MIN_VERIFIED_RATIO })
      best = pickBetter(best, second)
    }
    if (best.invented.length) {
      console.error(JSON.stringify({ request_id: id, error: 'unsupported_numbers', count: best.invented.length }))
      await recordRun(client, userId, buildRun({ kind: 'cover_letter', outcome: 'unsupported_numbers', attempts, fidelity: best.fidelity, startedAt }), id)
      return json(request, { error: 'Não conseguimos gerar uma carta fiel ao seu currículo desta vez. Tente novamente.' }, 502, id)
    }

    const result = { cover_letter: best.value.cover_letter, evidence: best.fidelity.items }
    const { error: updateError } = await client.from('analyses').update({ cover_letter: result.cover_letter, cover_letter_evidence: result.evidence }).eq('id', data.id).eq('user_id', userId); if (updateError) throw updateError
    await recordRun(client, userId, buildRun({ kind: 'cover_letter', outcome: 'ok', attempts, fidelity: best.fidelity, startedAt }), id)
    return json(request, result, 200, id)
  } catch (error) {
    if (actor) await recordRun(actor.client, actor.userId, buildRun({ kind: 'cover_letter', outcome: 'error', attempts, startedAt }), id)
    console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown' })); return json(request, { error: 'Não foi possível gerar a carta.' }, 500, id) }
})
