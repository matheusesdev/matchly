import { describe, expect, it } from 'vitest'
import { matchesEmail } from '../supabase/functions/_shared/account'
import { assembleExport } from '../src/lib/account'

describe('matchesEmail', () => {
  it('aceita o próprio e-mail ignorando caixa e espaços', () => {
    expect(matchesEmail('  Maria@Email.com ', 'maria@email.com')).toBe(true)
  })
  it('recusa e-mail diferente, vazio ou tipo errado', () => {
    expect(matchesEmail('outra@email.com', 'maria@email.com')).toBe(false)
    expect(matchesEmail('', 'maria@email.com')).toBe(false)
    expect(matchesEmail(undefined, 'maria@email.com')).toBe(false)
    expect(matchesEmail(42, 'maria@email.com')).toBe(false)
  })
  it('recusa quando a conta não tem e-mail', () => {
    expect(matchesEmail('x@y.com', undefined)).toBe(false)
    expect(matchesEmail('', '')).toBe(false)
  })
})

describe('assembleExport', () => {
  it('reúne conta e tabelas com data de exportação', () => {
    const out = assembleExport({ id: 'u1', email: 'a@b.com' }, { resumes: [{ id: 'r1' }], analyses: [{ id: 'a1' }, { id: 'a2' }], usage_events: [] }, new Date('2026-11-04T10:00:00Z'))
    expect(out.exportado_em).toBe('2026-11-04T10:00:00.000Z')
    expect(out.conta).toEqual({ id: 'u1', email: 'a@b.com' })
    expect(out.curriculos).toHaveLength(1)
    expect(out.analises).toHaveLength(2)
    expect(out.uso).toEqual([])
  })
  it('aceita conta sem e-mail', () => {
    expect(assembleExport({ id: 'u1', email: undefined }, { resumes: [], analyses: [], usage_events: [] }).conta.email).toBeNull()
  })
})
