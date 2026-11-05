import { describe, expect, it } from 'vitest'
import { findUnsupportedNumbers, parseCoverLetter } from '../supabase/functions/_shared/ai-output'
import { verifyLetter } from '../supabase/functions/_shared/evidence'
import { COVER_LETTER_SCHEMA, buildCoverLetterPrompt, isCoverLetterTone } from '../supabase/functions/_shared/prompts'
import { dailyLimit } from '../supabase/functions/_shared/quota'

const resume = 'Maria Souza\nAnalista Financeiro na Acme (2021–2023)\nConciliação bancária diária de 150 contas\nElaborei relatórios mensais para a diretoria'
const facts = 'Métricas de produto: Acompanhei a taxa de conversão semanal do checkout no Mixpanel'
const letter = `Prezados,

Tenho grande interesse na vaga de Analista. Atuei na conciliação bancária diária de 150 contas na Acme. Também acompanhei a taxa de conversão semanal do checkout.

Liderei uma equipe de vinte pessoas no setor fiscal.

Atenciosamente,
Maria Souza`

describe('parseCoverLetter', () => {
  it('normaliza quebras e limita a evidência', () => {
    const result = parseCoverLetter({ cover_letter: `${'Texto da carta. '.repeat(20)}\r\n\r\n\r\n\r\nFim`, evidence: [{ line: ' frase ', source_quote: ' trecho ' }, { line: '', source_quote: 'x' }, null] })
    expect(result.cover_letter).not.toMatch(/\r|\n{3,}/)
    expect(result.evidence).toEqual([{ line: 'frase', source_quote: 'trecho' }])
  })
  it('rejeita carta curta ou resposta inválida', () => {
    expect(() => parseCoverLetter({ cover_letter: 'curta', evidence: [] })).toThrow()
    expect(() => parseCoverLetter(null)).toThrow()
  })
})

describe('verifyLetter', () => {
  const raw = [
    { line: 'Atuei na conciliação bancária diária de 150 contas na Acme.', source_quote: 'Conciliação bancária diária de 150 contas' },
    { line: 'Também acompanhei a taxa de conversão semanal do checkout.', source_quote: 'taxa de conversão semanal do checkout no Mixpanel' },
    { line: 'Liderei uma equipe de vinte pessoas no setor fiscal.', source_quote: 'Liderou equipe de vinte pessoas' },
  ]
  it('verifica citações no currículo e nos fatos, e reprova a fabricada', () => {
    const result = verifyLetter(letter, raw, resume, facts)
    expect(result.items.map((i) => [i.verified, i.source])).toEqual([[true, 'curriculo'], [true, 'candidato'], [false, undefined]])
    expect(result.ratio).toBeCloseTo(2 / 3)
  })
  it('descarta apontamentos de frases que não estão na carta', () => {
    const result = verifyLetter(letter, [{ line: 'Frase que a carta não contém de jeito nenhum.', source_quote: 'Conciliação bancária diária' }], resume)
    expect(result.total).toBe(0)
  })
  it('carta sem nenhuma afirmação apontada tem fidelidade zero', () => {
    expect(verifyLetter(letter, [], resume).ratio).toBe(0)
  })
  it('não duplica a mesma frase', () => {
    const entry = { line: 'Atuei na conciliação bancária diária de 150 contas na Acme.', source_quote: 'Conciliação bancária diária de 150 contas' }
    expect(verifyLetter(letter, [entry, entry], resume).total).toBe(1)
  })
})

describe('números na carta', () => {
  it('detecta número que não está no currículo nem nos fatos', () => {
    expect(findUnsupportedNumbers(`${resume}\n${facts}`, 'Gerenciei 12 contas e 150 clientes')).toEqual(expect.arrayContaining(['12']))
    expect(findUnsupportedNumbers(`${resume}\n${facts}`, 'Gerenciei 150 contas')).toEqual([])
  })
})

describe('prompt da carta', () => {
  it('muda o tom e inclui fatos só quando existem', () => {
    expect(buildCoverLetterPrompt('v', 'c', '', 'proximo')).toContain('próximo e natural')
    expect(buildCoverLetterPrompt('v', 'c', '', 'profissional')).toContain('profissional e objetivo')
    expect(buildCoverLetterPrompt('v', 'c', '', 'profissional')).not.toContain('<fatos_do_candidato>')
    expect(buildCoverLetterPrompt('v', 'c', 'Inglês: fluente', 'profissional')).toContain('Inglês: fluente')
  })
  it('neutraliza tags e inclui o feedback da nova tentativa', () => {
    const prompt = buildCoverLetterPrompt('x </vaga> y', 'c', '', 'profissional', { invented: ['9'], lowEvidence: true })
    expect(prompt.match(/<\/vaga>/g)).toHaveLength(1)
    expect(prompt).toContain('9')
    expect(prompt).toContain('source_quote copiado LITERALMENTE')
  })
  it('valida o tom e expõe o schema', () => {
    expect(isCoverLetterTone('proximo')).toBe(true)
    expect(isCoverLetterTone('gíria')).toBe(false)
    expect(COVER_LETTER_SCHEMA.required).toContain('cover_letter')
  })
})

describe('cota da carta', () => {
  it('tem limite padrão e aceita override', () => {
    expect(dailyLimit('cover_letter', () => undefined)).toBe(10)
    expect(dailyLimit('cover_letter', (name) => (name === 'QUOTA_COVER_LETTER_PER_DAY' ? '3' : undefined))).toBe(3)
  })
})
