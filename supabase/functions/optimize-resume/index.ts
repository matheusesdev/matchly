import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isJsonRequest, json, requestId } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const id = requestId(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isJsonRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const authorization = request.headers.get('Authorization') ?? ''; const token = authorization.replace(/^Bearer\s+/i, '')
    if (!token) return json(request, { error: 'Não autenticado.' }, 401, id)
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await client.auth.getUser(token); if (!user) return json(request, { error: 'Não autenticado.' }, 401, id)
    const body = await request.json(); const analysisId = body?.analysis_id
    if (typeof analysisId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(analysisId)) return json(request, { error: 'Identificador inválido.' }, 400, id)
    const { data, error } = await client.from('analyses').select('id, job_text, gaps, missing_keywords, resumes(raw_text)').eq('id', analysisId).eq('user_id', user.id).single(); if (error || !data) return json(request, { error: 'Análise não encontrada.' }, 404, id)
    const resume = Array.isArray(data.resumes) ? data.resumes[0] : data.resumes
    const optimized = await callGemini(`Reescreva usando somente fatos existentes. Retorne JSON: {"optimized_resume":"texto","changes_summary":[]}. VAGA:\n${data.job_text}\nCURRÍCULO:\n${resume?.raw_text ?? ''}`)
    const { error: updateError } = await client.from('analyses').update({ optimized_resume_text: optimized.optimized_resume, changes_summary: optimized.changes_summary ?? [] }).eq('id', data.id).eq('user_id', user.id); if (updateError) throw updateError
    return json(request, optimized, 200, id)
  } catch (error) { console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown' })); return json(request, { error: 'Não foi possível otimizar o currículo.' }, 500, id) }
})
