import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import mammoth from 'npm:mammoth@1.10.0'
import { Buffer } from 'node:buffer'
import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isMultipartRequest, json, requestId } from '../_shared/http.ts'
import { parseAnalysis } from '../_shared/ai-output.ts'
import { ANALYSIS_SCHEMA, buildAnalysisPrompt } from '../_shared/prompts.ts'
import { consumeQuota, dailyLimit } from '../_shared/quota.ts'

const MAX_RESUME_CHARS = 20_000

Deno.serve(async (request) => {
  const id = requestId(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isMultipartRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const access = await authorizeMvpUser(request)
    if (!access.allowed) return json(request, { error: access.error }, access.status, id)
    const { client, userId } = access
    const form = await request.formData(); const file = form.get('resume'); const jobText = String(form.get('job_text') ?? '').trim()
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.docx') || file.size > 5 * 1024 * 1024) return json(request, { error: 'Arquivo inválido.' }, 400, id)
    if (jobText.length < 80 || jobText.length > 8000) return json(request, { error: 'Descrição inválida.' }, 400, id)
    const resumeText = (await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) })).value.trim()
    if (resumeText.length < 50) return json(request, { error: 'Não encontramos texto suficiente no arquivo. Verifique se o currículo não é uma imagem.' }, 422, id)
    if (resumeText.length > MAX_RESUME_CHARS) return json(request, { error: 'O currículo é longo demais. Envie uma versão de até cerca de 5 páginas.' }, 422, id)
    if (!(await consumeQuota(client, userId, 'analyze', dailyLimit('analyze', (n) => Deno.env.get(n))))) return json(request, { error: 'Você atingiu o limite diário de análises. Tente novamente amanhã.' }, 429, id)
    const analysis = parseAnalysis(await callGemini(buildAnalysisPrompt(jobText, resumeText), ANALYSIS_SCHEMA))
    const { data: resume, error: resumeError } = await client.from('resumes').insert({ user_id: userId, original_filename: file.name, raw_text: resumeText }).select('id').single(); if (resumeError) throw resumeError
    const { data: saved, error } = await client.from('analyses').insert({ user_id: userId, resume_id: resume.id, job_text: jobText, ...analysis }).select('id, match_score, missing_keywords, gaps, strengths').single(); if (error) throw error
    return json(request, { analysis_id: saved.id, ...saved }, 200, id)
  } catch (error) { console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown' })); return json(request, { error: 'Não foi possível concluir a análise.' }, 500, id) }
})
