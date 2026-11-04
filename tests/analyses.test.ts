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
