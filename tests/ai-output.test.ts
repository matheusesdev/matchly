import { describe, expect, it } from 'vitest'
import { findUnsupportedNumbers, parseOptimization } from '../supabase/functions/_shared/ai-output'

describe('parseOptimization', () => {
  it('exige texto não vazio', () => {
    expect(() => parseOptimization({ optimized_resume: 'curto', changes_summary: [] })).toThrow()
  })
  it('aceita saída válida', () => {
    const text = 'RESUMO\n' + 'Profissional com experiência. '.repeat(3)
    expect(parseOptimization({ optimized_resume: text, changes_summary: ['a'] }).changes_summary).toEqual(['a'])
  })
})

describe('findUnsupportedNumbers', () => {
  const original = 'Analista na Acme de 03/2021 a 2023. Atendi 150 clientes e reduzi custos em 20%.'
  it('aceita números presentes no original', () => {
    expect(findUnsupportedNumbers(original, 'Atuei na Acme (2021–2023) com 150 clientes e 20% de redução.')).toEqual([])
  })
  it('detecta métricas e anos inventados', () => {
    const found = findUnsupportedNumbers(original, 'Aumentei vendas em 35% desde 2019 com 150 clientes.')
    expect(found).toContain('35')
    expect(found).toContain('2019')
    expect(found).not.toContain('150')
  })
  it('ignora pontuação final e separadores de milhar', () => {
    expect(findUnsupportedNumbers('Gerenciei 1.500 contas.', 'Gerenciei 1500 contas.')).toEqual([])
    expect(findUnsupportedNumbers('Nota 10.', 'Nota 10.')).toEqual([])
  })
})
