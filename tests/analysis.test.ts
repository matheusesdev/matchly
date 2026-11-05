import { describe, expect, it } from 'vitest'
import { parseAnalysisDraft, verifyAnalysis } from '../supabase/functions/_shared/analysis'
import { ANALYSIS_SCHEMA, buildAnalysisPrompt } from '../supabase/functions/_shared/prompts'

const resume = `Carolina Mendes
Analista financeira com mais de 8 anos de experiência em contas a pagar e conciliação bancária.
Responsável pela conciliação bancária diária de 150 contas.
Oriento 2 analistas juniores. Excel avançado e SAP Business One. Inglês intermediário.`
const job = `Analista Financeiro Sênior
Requisitos: 5+ anos de experiência. Excel avançado. Experiência com Power BI. Inglês avançado. Liderança de equipe.`

const draft = (overrides: Record<string, unknown> = {}) => parseAnalysisDraft({
  match_score: 48,
  strengths: [
    { text: 'Mais de 8 anos de experiência financeira', resume_quote: 'mais de 8 anos de experiência em contas a pagar' },
    { text: 'Excel avançado e SAP', resume_quote: 'Excel avançado e SAP Business One' },
  ],
  gaps: [
    { area: 'Power BI', descricao: 'Não consta no currículo.', job_quote: 'Experiência com Power BI' },
    { area: 'Inglês avançado', descricao: 'Currículo informa inglês intermediário.', job_quote: 'Inglês avançado' },
  ],
  matched_keywords: ['Excel avançado', 'Liderança'],
  missing_keywords: ['Power BI', 'Inglês avançado'],
  ...overrides,
})

describe('parseAnalysisDraft', () => {
  it('limita o score, normaliza textos e aceita pontos fortes em texto puro', () => {
    const parsed = parseAnalysisDraft({ match_score: 140.4, strengths: ['  Excel   avançado ', { text: 'x', resume_quote: 'y' }, null], gaps: [{ area: 'A', descricao: 'd' }, { area: '' }], missing_keywords: 'x' })
    expect(parsed.match_score).toBe(100)
    expect(parsed.strengths[0]).toEqual({ text: 'Excel avançado', quote: '' })
    expect(parsed.gaps).toHaveLength(1)
    expect(parsed.missing_keywords).toEqual([])
  })
  it('rejeita resposta inválida ou score ausente', () => {
    expect(() => parseAnalysisDraft(null)).toThrow()
    expect(() => parseAnalysisDraft({ strengths: [] })).toThrow()
  })
})

describe('verifyAnalysis', () => {
  it('mantém pontos fortes e lacunas com citação real', () => {
    const { analysis, stats } = verifyAnalysis(draft(), resume, job)
    expect(analysis.strengths).toHaveLength(2)
    expect(analysis.gaps.map((gap) => gap.area)).toEqual(['Power BI', 'Inglês avançado'])
    expect(stats).toEqual({ proposed: 4, kept: 4 })
  })

  it('descarta ponto forte cuja citação não existe no currículo', () => {
    const { analysis, stats } = verifyAnalysis(draft({ strengths: [{ text: 'Liderou 30 pessoas', resume_quote: 'liderou equipe de trinta pessoas' }] }), resume, job)
    expect(analysis.strengths).toEqual([])
    expect(stats.kept).toBe(2)
  })

  it('descarta ponto forte com número que não está no currículo, mesmo com citação válida (ex.: "6 anos" em vez de 8)', () => {
    const wrong = draft({ strengths: [{ text: 'Mais de 6 anos de experiência financeira', resume_quote: 'mais de 8 anos de experiência em contas a pagar' }] })
    expect(verifyAnalysis(wrong, resume, job).analysis.strengths).toEqual([])
  })

  it('descarta ponto forte sem citação (texto puro)', () => {
    expect(verifyAnalysis(draft({ strengths: ['Excel avançado'] }), resume, job).analysis.strengths).toEqual([])
  })

  it('descarta lacuna que cita algo que a vaga não diz (lacuna inventada)', () => {
    const invented = draft({ gaps: [{ area: 'Senioridade', descricao: 'Não comprova liderança consolidada.', job_quote: 'exige 15 anos como diretor financeiro' }] })
    expect(verifyAnalysis(invented, resume, job).analysis.gaps).toEqual([])
  })

  it('palavra-chave encontrada precisa estar no currículo e na vaga', () => {
    const result = verifyAnalysis(draft({ matched_keywords: ['Excel avançado', 'Power BI', 'Kubernetes', 'SAP'] }), resume, job)
    // Power BI não está no currículo; Kubernetes não está em lugar nenhum; SAP não está na vaga.
    expect(result.analysis.matched_keywords).toEqual(['Excel avançado'])
  })

  it('palavra-chave ausente não pode aparecer no currículo nem faltar na vaga', () => {
    const result = verifyAnalysis(draft({ missing_keywords: ['Power BI', 'Excel avançado', 'Blockchain', 'Inglês avançado'] }), resume, job)
    // Excel avançado está no currículo; Blockchain não está na vaga.
    expect(result.analysis.missing_keywords).toEqual(['Power BI', 'Inglês avançado'])
  })

  it('casa palavras inteiras (SAP não casa com "ensaporado")', () => {
    const result = verifyAnalysis(draft({ matched_keywords: ['SAP'] }), 'Experiência com ensaporado e SAP', 'Conhecimento de SAP')
    expect(result.analysis.matched_keywords).toEqual(['SAP'])
    expect(verifyAnalysis(draft({ matched_keywords: ['SAP'] }), 'Experiência com ensaporado', 'Conhecimento de SAP').analysis.matched_keywords).toEqual([])
  })

  it('respeita limites de quantidade', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ text: `Ponto forte ${String.fromCharCode(65 + i)}`, resume_quote: 'conciliação bancária diária de 150 contas' }))
    expect(verifyAnalysis(draft({ strengths: many }), resume, job).analysis.strengths).toHaveLength(6)
  })

  it('mantém o score da IA intacto', () => {
    expect(verifyAnalysis(draft(), resume, job).analysis.match_score).toBe(48)
  })
})

describe('prompt e schema da análise', () => {
  it('pede citações literais, palavras-chave curtas e regra de senioridade', () => {
    const prompt = buildAnalysisPrompt('vaga', 'cv')
    for (const term of ['resume_quote', 'job_quote', 'matched_keywords', 'LITERALMENTE', 'não liste como lacuna']) expect(prompt).toContain(term)
  })
  it('o schema exige os campos novos', () => {
    expect(ANALYSIS_SCHEMA.required).toEqual(expect.arrayContaining(['strengths', 'gaps', 'matched_keywords', 'missing_keywords']))
  })
})

describe('cargo da vaga (job_title)', () => {
  it('mantém o cargo que aparece no texto da vaga', () => {
    const result = verifyAnalysis(draft({ job_title: 'Analista Financeiro Sênior' }), resume, job)
    expect(result.analysis.job_title).toBe('Analista Financeiro Sênior')
  })
  it('descarta cargo inventado (não está no texto da vaga) para o front usar o título derivado', () => {
    expect(verifyAnalysis(draft({ job_title: 'Diretor de Operações' }), resume, job).analysis.job_title).toBeNull()
    expect(verifyAnalysis(draft({ job_title: '' }), resume, job).analysis.job_title).toBeNull()
  })
})
