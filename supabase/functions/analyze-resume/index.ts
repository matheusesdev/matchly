import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import mammoth from 'npm:mammoth@1.10.0'
import { Buffer } from 'node:buffer'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isMultipartRequest, json, requestId } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const id = requestId(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isMultipartRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const authorization = request.headers.get('Authorization') ?? ''; const token = authorization.replace(/^Bearer\s+/i, '')
    if (!token) return json(request, { error: 'Não autenticado.' }, 401, id)
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await client.auth.getUser(token); if (!user) return json(request, { error: 'Não autenticado.' }, 401, id)
    const form = await request.formData(); const file = form.get('resume'); const jobText = String(form.get('job_text') ?? '').trim()
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.docx') || file.size > 5 * 1024 * 1024) return json(request, { error: 'Arquivo inválido.' }, 400, id)
    if (jobText.length < 80 || jobText.length > 8000) return json(request, { error: 'Descrição inválida.' }, 400, id)
    const resumeText = (await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) })).value.trim(); if (resumeText.length < 50) return json(request, { error: 'Conteúdo insuficiente.' }, 422, id)
    const analysis = await callGemini(`Retorne JSON válido sem inventar fatos: {"match_score":0,"missing_keywords":[],"gaps":[],"strengths":[]}. VAGA:\n${jobText}\nCURRÍCULO:\n${resumeText}`)
    const { data: resume, error: resumeError } = await client.from('resumes').insert({ user_id: user.id, original_filename: file.name, raw_text: resumeText }).select('id').single(); if (resumeError) throw resumeError
    const { data: saved, error } = await client.from('analyses').insert({ user_id: user.id, resume_id: resume.id, job_text: jobText, match_score: Math.max(0, Math.min(100, Number(analysis.match_score))), missing_keywords: analysis.missing_keywords ?? [], gaps: analysis.gaps ?? [], strengths: analysis.strengths ?? [] }).select('id, match_score, missing_keywords, gaps, strengths').single(); if (error) throw error
    return json(request, { analysis_id: saved.id, ...saved }, 200, id)
  } catch (error) { console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown' })); return json(request, { error: 'Não foi possível concluir a análise.' }, 500, id) }
})
