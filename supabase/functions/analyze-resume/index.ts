import mammoth from 'npm:mammoth@1.10.0'
import { Buffer } from 'node:buffer'
import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const access = await authorizeMvpUser(request)
    if (!access.allowed) return json({ error: access.error }, access.status)
    const { client, userId } = access
    const form = await request.formData()
    const file = form.get('resume')
    const jobText = String(form.get('job_text') ?? '').trim()
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.docx')) return json({ error: 'Envie um arquivo DOCX válido.' }, 400)
    if (file.size > 5 * 1024 * 1024) return json({ error: 'O arquivo deve ter no máximo 5 MB.' }, 400)
    if (jobText.length < 80 || jobText.length > 8000) return json({ error: 'A descrição deve ter entre 80 e 8.000 caracteres.' }, 400)
    const extracted = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) })
    const resumeText = extracted.value.trim()
    if (resumeText.length < 50) return json({ error: 'Não foi possível extrair conteúdo suficiente do DOCX.' }, 422)
    const prompt = `Você é especialista em recrutamento e ATS. Analise sem inventar ou assumir nada ausente no currículo. Retorne exclusivamente JSON válido: {"match_score":0,"missing_keywords":[],"gaps":[{"area":"","descricao":""}],"strengths":[]}. O score deve refletir skills, experiência e requisitos reais. Keywords ausentes devem aparecer na vaga e não no currículo. Seja específico.\n\nVAGA:\n${jobText}\n\nCURRÍCULO:\n${resumeText}`
    const analysis = await callGemini(prompt)
    const { data: resume, error: resumeError } = await client.from('resumes').insert({ user_id: userId, original_filename: file.name, raw_text: resumeText }).select('id').single()
    if (resumeError) throw resumeError
    const { data: saved, error } = await client.from('analyses').insert({ user_id: userId, resume_id: resume.id, job_text: jobText, match_score: Math.max(0, Math.min(100, Number(analysis.match_score))), missing_keywords: analysis.missing_keywords ?? [], gaps: analysis.gaps ?? [], strengths: analysis.strengths ?? [] }).select('id, match_score, missing_keywords, gaps, strengths').single()
    if (error) throw error
    return json({ analysis_id: saved.id, ...saved })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
