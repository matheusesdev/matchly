import { describe, expect, it } from 'vitest'
import { jobTitle } from '../src/lib/analyses'

describe('jobTitle', () => {
  it('usa a primeira linha não vazia', () => {
    expect(jobTitle('\n\n  Product Designer Sênior  \nBuscamos...')).toBe('Product Designer Sênior')
  })
  it('trunca títulos longos com reticências', () => {
    const title = jobTitle('A'.repeat(200), 20)
    expect(title).toHaveLength(20)
    expect(title.endsWith('…')).toBe(true)
  })
  it('tem fallback para texto vazio', () => {
    expect(jobTitle('   \n ')).toBe('Vaga sem título')
  })
})

describe('jobTitle: ignora títulos de seção e emojis', () => {
  it('pula "Sobre a vaga" e usa a linha seguinte', () => {
    expect(jobTitle('Sobre a vaga\nAnalista Financeiro Sênior\nBuscamos...')).toBe('Analista Financeiro Sênior')
  })
  it('remove emojis e pula rótulos com dois pontos', () => {
    expect(jobTitle('💼 Sobre a Vaga\nSeu papel será:\nProduct Designer Pleno')).toBe('Product Designer Pleno')
  })
  it('se só houver títulos de seção, usa a primeira linha limpa', () => {
    expect(jobTitle('Sobre a vaga')).toBe('Sobre a vaga')
  })
})
