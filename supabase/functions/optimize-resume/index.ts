import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isJsonRequest, json, requestId } from '../_shared/http.ts'
import { findUnsupportedNumbers, parseOptimization } from '../_shared/ai-output.ts'
import { OPTIMIZATION_SCHEMA, buildOptimizationPrompt } from '../_shared/prompts.ts'
import { consumeQuota, dailyLimit } from '../_shared/quota.ts'

Deno.serve(async (request) => {
  const id = requestId(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isJsonRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const access = await authorizeMvpUser(request)
    if (!access.allowed) return json(request, { error: access.error }, access.status, id)
    const { client, userId } = access
    const body = await request.json(); const analysisId = body?.analysis_id
    if (typeof analysisId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(analysisId)) return json(request, { error: 'Identificador inválido.' }, 400, id)
    const { data, error } = await client.from('analyses').select('id, job_text, resumes(raw_text)').eq('id', analysisId).eq('user_id', userId).single(); if (error || !data) return json(request, { error: 'Análise não encontrada.' }, 404, id)
    const resume = Array.isArray(data.resumes) ? data.resumes[0] : data.resumes
    const original: string = resume?.raw_text ?? ''
    if (!(await consumeQuota(client, userId, 'optimize', dailyLimit('optimize', (n) => Deno.env.get(n))))) return json(request, { error: 'Você atingiu o limite diário de otimizações. Tente novamente amanhã.' }, 429, id)

    // Guarda anti-invenção: números (datas, métricas) ausentes do original reprovam a saída; uma nova tentativa é feita com feedback.
    let optimized = parseOptimization(await callGemini(buildOptimizationPrompt(data.job_text, original), OPTIMIZATION_SCHEMA))
    let invented = findUnsupportedNumbers(original, optimized.optimized_resume)
    if (invented.length) {
      optimized = parseOptimization(await callGemini(buildOptimizationPrompt(data.job_text, original, invented), OPTIMIZATION_SCHEMA))
      invented = findUnsupportedNumbers(original, optimized.optimized_resume)
    }
    if (invented.length) {
      console.error(JSON.stringify({ request_id: id, error: 'unsupported_numbers', count: invented.length }))
      return json(request, { error: 'Não conseguimos gerar uma versão fiel ao seu currículo desta vez. Tente novamente.' }, 502, id)
    }

    const { error: updateError } = await client.from('analyses').update({ optimized_resume_text: optimized.optimized_resume, changes_summary: optimized.changes_summary }).eq('id', data.id).eq('user_id', userId); if (updateError) throw updateError
    return json(request, optimized, 200, id)
  } catch (error) { console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown' })); return json(request, { error: 'Não foi possível otimizar o currículo.' }, 500, id) }
})
