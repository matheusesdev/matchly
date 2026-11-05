import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import mammoth from 'npm:mammoth@1.10.0'
import { Buffer } from 'node:buffer'
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1'
import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'
import { isMultipartRequest, json, requestId } from '../_shared/http.ts'
import { parseAnalysisDraft, verifyAnalysis } from '../_shared/analysis.ts'
import { ANALYSIS_SCHEMA, buildAnalysisPrompt } from '../_shared/prompts.ts'
import { MAX_RESUME_BYTES, detectResumeKind, sha256Hex, tidyExtractedText } from '../_shared/files.ts'
import { consumeQuota, dailyLimit } from '../_shared/quota.ts'
import { buildRun, classifyError, recordRun } from '../_shared/telemetry.ts'

const MAX_RESUME_CHARS = 20_000

Deno.serve(async (request) => {
  const id = requestId(request)
  const startedAt = Date.now()
  let attempts = 0
  // deno-lint-ignore no-explicit-any
  let actor: { client: any; userId: string } | null = null
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isMultipartRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const access = await authorizeMvpUser(request)
    if (!access.allowed) return json(request, { error: access.error }, access.status, id)
    const { client, userId } = access
    actor = { client, userId }
    const invalid = async (message: string, status: number) => {
      await recordRun(client, userId, buildRun({ kind: 'analyze', outcome: 'invalid_input', startedAt }), id)
      return json(request, { error: message }, status, id)
    }
    const form = await request.formData(); const file = form.get('resume'); const jobText = String(form.get('job_text') ?? '').trim()
    if (!(file instanceof File) || file.size > MAX_RESUME_BYTES) return json(request, { error: 'Arquivo inválido. Envie um DOCX ou PDF de até 5 MB.' }, 400, id)
    if (jobText.length < 80 || jobText.length > 8000) return json(request, { error: 'Descrição inválida.' }, 400, id)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const kind = detectResumeKind(file.name, bytes)
    if (!kind) return json(request, { error: 'Formato não suportado. Envie um DOCX ou PDF válido.' }, 400, id)
    let resumeText: string
    try {
      resumeText = kind === 'pdf'
        ? tidyExtractedText((await extractText(await getDocumentProxy(bytes), { mergePages: true })).text as string)
        : (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value.trim()
    } catch (_error) {
      return await invalid('Não conseguimos ler o arquivo. Ele pode estar protegido ou corrompido.', 422)
    }
    if (resumeText.length < 50) return await invalid('Não encontramos texto suficiente no arquivo. Se for um PDF escaneado (imagem), envie uma versão com texto selecionável ou em DOCX.', 422)
    if (resumeText.length > MAX_RESUME_CHARS) return await invalid('O currículo é longo demais. Envie uma versão de até cerca de 5 páginas.', 422)
    if (!(await consumeQuota(client, userId, 'analyze', dailyLimit('analyze', (n) => Deno.env.get(n))))) { await recordRun(client, userId, buildRun({ kind: 'analyze', outcome: 'quota_exceeded', startedAt }), id); return json(request, { error: 'Você atingiu o limite diário de análises. Tente novamente amanhã.' }, 429, id) }
    attempts = 1
    // As citações da IA são conferidas contra o currículo e a vaga; o que não tem prova (ou tem número errado) é descartado.
    const { analysis, stats } = verifyAnalysis(parseAnalysisDraft(await callGemini(buildAnalysisPrompt(jobText, resumeText), ANALYSIS_SCHEMA, { temperature: 0 })), resumeText, jobText)
    const contentHash = await sha256Hex(resumeText)
    const { data: existing } = await client.from('resumes').select('id').eq('user_id', userId).eq('content_hash', contentHash).limit(1).maybeSingle()
    let resumeId: string | undefined = existing?.id
    if (!resumeId) {
      const { data: created, error: resumeError } = await client.from('resumes').insert({ user_id: userId, original_filename: file.name, raw_text: resumeText, content_hash: contentHash }).select('id').single(); if (resumeError) throw resumeError
      resumeId = created.id
    }
    const { data: saved, error } = await client.from('analyses').insert({ user_id: userId, resume_id: resumeId, job_text: jobText, ...analysis }).select('id, match_score, missing_keywords, matched_keywords, gaps, strengths').single(); if (error) throw error
    await recordRun(client, userId, buildRun({ kind: 'analyze', outcome: 'ok', attempts, fidelity: { verified: stats.kept, total: stats.proposed, ratio: stats.proposed ? stats.kept / stats.proposed : 1 }, startedAt }), id)
    return json(request, { analysis_id: saved.id, ...saved }, 200, id)
  } catch (error) {
    if (actor) await recordRun(actor.client, actor.userId, buildRun({ kind: 'analyze', outcome: 'error', attempts, errorCode: classifyError(error), startedAt }), id)
    console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown', code: classifyError(error) })); return json(request, { error: 'Não foi possível concluir a análise.' }, 500, id) }
})
