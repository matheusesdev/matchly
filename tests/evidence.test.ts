import { describe, expect, it } from 'vitest'
import { claimLines, findEvidence, isHeadingLine, normalizeForMatch, verifyEvidence } from '../supabase/functions/_shared/evidence'

const original = `Maria Souza
Experiência
Analista Financeiro na Acme (2021–2023)
• Responsável pela conciliação bancária diária de 150 contas
• Elaborei relatórios mensais para a diretoria`

const optimized = `MARIA SOUZA
Analista Financeiro · São Paulo

EXPERIÊNCIA PROFISSIONAL
Analista Financeiro · Acme
- Conciliação bancária diária de 150 contas, com foco em precisão.
- Relatórios mensais direcionados à diretoria executiva.
- Liderança de equipe de dez pessoas na área fiscal.

HABILIDADES
Excel · Conciliação`

describe('normalizeForMatch', () => {
  it('ignora caixa, pontuação, marcadores e quebras', () => {
    expect(normalizeForMatch('• Conciliação,\n  BANCÁRIA!')).toBe('conciliação bancária')
  })
})

describe('claimLines', () => {
  it('só considera afirmações após a primeira seção, ignorando títulos e linhas curtas', () => {
    const lines = claimLines(optimized)
    expect(lines).toHaveLength(3)
    expect(lines).not.toContain('Analista Financeiro · São Paulo')
    expect(lines.some((line) => line.includes('MARIA'))).toBe(false)
    expect(lines.some((line) => line === 'HABILIDADES')).toBe(false)
  })
  it('retorna vazio quando não há seções', () => {
    expect(claimLines('texto solto sem seção alguma aqui')).toEqual([])
  })
  it('detecta títulos', () => {
    expect(isHeadingLine('EXPERIÊNCIA PROFISSIONAL')).toBe(true)
    expect(isHeadingLine('- ITEM EM MAIÚSCULAS')).toBe(false)
    expect(isHeadingLine('Texto normal')).toBe(false)
  })
})

describe('verifyEvidence', () => {
  it('marca como verificada somente a citação que existe literalmente no original', () => {
    const result = verifyEvidence(original, optimized, [
      { line: 'Conciliação bancária diária de 150 contas, com foco em precisão.', source_quote: 'conciliação bancária diária de 150 contas' },
      { line: 'Relatórios mensais direcionados à diretoria executiva.', source_quote: 'Elaborei relatórios mensais para a diretoria' },
      { line: 'Liderança de equipe de dez pessoas na área fiscal.', source_quote: 'Liderou uma equipe de dez pessoas' },
    ])
    const byLine = Object.fromEntries(result.items.map((item) => [item.line.slice(0, 12), item.verified]))
    expect(byLine['Conciliação ']).toBe(true)
    expect(byLine['Relatórios m']).toBe(true)
    expect(byLine['Liderança de']).toBe(false)
    expect(result.verified).toBe(2)
  })
  it('linhas sem evidência ficam não verificadas e a citação fabricada é descartada', () => {
    const result = verifyEvidence(original, optimized, [{ line: 'Liderança de equipe de dez pessoas na área fiscal.', source_quote: 'Gerente da área fiscal' }])
    expect(result.verified).toBe(0)
    expect(result.items.every((item) => item.quote === '')).toBe(true)
  })
  it('rejeita citações curtas demais para provar algo', () => {
    const result = verifyEvidence('Acme Excel', 'RESUMO\nUsa Excel para análises financeiras diárias.', [{ line: 'Usa Excel para análises financeiras diárias.', source_quote: 'Excel' }])
    expect(result.verified).toBe(0)
  })
  it('é tolerante a marcadores no prefixo da linha citada', () => {
    const result = verifyEvidence(original, optimized, [{ line: '- Relatórios mensais direcionados à diretoria executiva.', source_quote: 'relatórios mensais para a diretoria' }])
    expect(result.items.find((item) => item.line.startsWith('Relatórios'))?.verified).toBe(true)
  })
  it('ratio é 1 quando não há afirmações a verificar', () => {
    expect(verifyEvidence(original, 'sem seções', []).ratio).toBe(1)
  })
})

describe('findEvidence', () => {
  it('encontra a evidência pela linha exibida, com ou sem marcador', () => {
    const items = [{ line: 'Relatórios mensais para a diretoria.', quote: 'x', verified: true }]
    expect(findEvidence(items, '- Relatórios mensais para a diretoria.')?.verified).toBe(true)
    expect(findEvidence(items, 'Outra linha')).toBeUndefined()
  })
})

import { isAcceptable, pickBetter, type Fidelity } from '../supabase/functions/_shared/evidence'
const fid = (ratio: number): Fidelity => ({ items: [], total: 10, verified: ratio * 10, ratio })
describe('seleção de tentativas', () => {
  it('aceita só sem números inventados e com fidelidade suficiente', () => {
    expect(isAcceptable({ invented: [], fidelity: fid(0.6) })).toBe(true)
    expect(isAcceptable({ invented: [], fidelity: fid(0.5) })).toBe(false)
    expect(isAcceptable({ invented: ['35'], fidelity: fid(1) })).toBe(false)
  })
  it('prefere a tentativa sem números inventados mesmo com menos fidelidade', () => {
    const clean = { value: 'a', invented: [], fidelity: fid(0.4) }
    const dirty = { value: 'b', invented: ['9'], fidelity: fid(0.9) }
    expect(pickBetter(dirty, clean).value).toBe('a')
    expect(pickBetter(clean, dirty).value).toBe('a')
  })
  it('entre iguais em números, escolhe a mais fiel', () => {
    expect(pickBetter({ value: 'a', invented: [], fidelity: fid(0.5) }, { value: 'b', invented: [], fidelity: fid(0.8) }).value).toBe('b')
  })
})

describe('verifyEvidence com fatos do candidato', () => {
  const facts = 'Métricas de produto: Acompanhei a taxa de conversão semanal do checkout no Mixpanel'
  const text = 'ANA\nRESUMO\nAcompanhamento semanal da taxa de conversão do checkout.\nConciliação bancária diária de 150 contas, com foco.'
  it('aceita citação vinda dos fatos e a identifica como do candidato', () => {
    const result = verifyEvidence(original, text, [
      { line: 'Acompanhamento semanal da taxa de conversão do checkout.', source_quote: 'taxa de conversão semanal do checkout no Mixpanel' },
      { line: 'Conciliação bancária diária de 150 contas, com foco.', source_quote: 'conciliação bancária diária de 150 contas' },
    ], facts)
    expect(result.items[0]).toMatchObject({ verified: true, source: 'candidato' })
    expect(result.items[1]).toMatchObject({ verified: true, source: 'curriculo' })
  })
  it('sem os fatos a mesma citação não é aceita', () => {
    const result = verifyEvidence(original, text, [{ line: 'Acompanhamento semanal da taxa de conversão do checkout.', source_quote: 'taxa de conversão semanal do checkout no Mixpanel' }])
    expect(result.items[0].verified).toBe(false)
  })
})
