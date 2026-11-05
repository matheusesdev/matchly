import { describe, expect, it } from 'vitest'
import { buildRun, recordRun } from '../supabase/functions/_shared/telemetry'

describe('buildRun', () => {
  it('calcula a duração e arredonda a fidelidade', () => {
    const run = buildRun({ kind: 'optimize', outcome: 'ok', attempts: 2, fidelity: { verified: 7, total: 9, ratio: 7 / 9 }, startedAt: 1000, now: 4321 })
    expect(run).toEqual({ kind: 'optimize', outcome: 'ok', attempts: 2, verified: 7, total: 9, fidelity_ratio: 0.778, duration_ms: 3321 })
  })
  it('deixa fidelidade nula quando não se aplica (ex.: análise ou erro)', () => {
    const run = buildRun({ kind: 'analyze', outcome: 'error', startedAt: 10, now: 10 })
    expect(run).toMatchObject({ attempts: 0, verified: null, total: null, fidelity_ratio: null, duration_ms: 0 })
  })
  it('limita tentativas e valores fora de faixa para respeitar as restrições do banco', () => {
    const run = buildRun({ kind: 'cover_letter', outcome: 'ok', attempts: 99, fidelity: { verified: -3, total: 4, ratio: 1.7 }, startedAt: 500, now: 100 })
    expect(run.attempts).toBe(5)
    expect(run.verified).toBe(0)
    expect(run.fidelity_ratio).toBe(1)
    expect(run.duration_ms).toBe(0)
  })
  it('ignora fidelidade com razão inválida', () => {
    expect(buildRun({ kind: 'optimize', outcome: 'ok', fidelity: { verified: 1, total: 1, ratio: Number.NaN }, startedAt: 0, now: 1 }).fidelity_ratio).toBeNull()
  })
})

describe('recordRun', () => {
  const run = buildRun({ kind: 'analyze', outcome: 'ok', attempts: 1, startedAt: 0, now: 5 })
  it('grava a linha com o usuário e não inclui conteúdo', async () => {
    const inserted: unknown[] = []
    const client = { from: (table: string) => ({ insert: async (row: unknown) => { inserted.push({ table, row }); return { error: null } } }) }
    await recordRun(client, 'u1', run, 'req-1')
    expect(inserted).toEqual([{ table: 'ai_runs', row: { user_id: 'u1', ...run } }])
  })
  it('nunca lança, mesmo se o banco falhar', async () => {
    const failing = { from: () => ({ insert: async () => ({ error: { code: '42501' } }) }) }
    const throwing = { from: () => { throw new Error('boom') } }
    await expect(recordRun(failing, 'u1', run, 'req')).resolves.toBeUndefined()
    await expect(recordRun(throwing, 'u1', run, 'req')).resolves.toBeUndefined()
  })
})
