import { authorizeMvpUser } from '../_shared/auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { callGemini } from '../_shared/gemini.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const access = await authorizeMvpUser(request)
    if (!access.allowed) return json({ error: access.error }, access.status)
    const { client } = access
    const { analysis_id: analysisId } = await request.json()
    const { data, error } = await client.from('analyses').select('id, job_text, gaps, missing_keywords, resumes(raw_text)').eq('id', analysisId).single()
    if (error || !data) return json({ error: 'Análise não encontrada' }, 404)
    const resume = Array.isArray(data.resumes) ? data.resumes[0] : data.resumes
    const prompt = `Você é especialista em currículos ATS. Reescreva usando SOMENTE fatos existentes no original. Nunca invente cargos, empresas, datas, habilidades, métricas ou credenciais. Pode reordenar, reformular e usar termos equivalentes da vaga somente quando o conceito já existir. Use seções Resumo, Experiência Profissional, Formação e Habilidades. Retorne exclusivamente JSON: {"optimized_resume":"texto completo","changes_summary":[]}.\n\nVAGA:\n${data.job_text}\n\nCURRÍCULO ORIGINAL:\n${resume?.raw_text ?? ''}\n\nANÁLISE:\n${JSON.stringify({ gaps: data.gaps, missing_keywords: data.missing_keywords })}`
    const optimized = await callGemini(prompt)
    const { error: updateError } = await client.from('analyses').update({ optimized_resume_text: optimized.optimized_resume, changes_summary: optimized.changes_summary ?? [] }).eq('id', data.id)
    if (updateError) throw updateError
    return json(optimized)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
