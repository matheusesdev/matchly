import { describe, expect, it } from 'vitest'
import { consumeQuota, dailyLimit, isOverQuota } from '../supabase/functions/_shared/quota'

describe('dailyLimit', () => {
  it('usa padrões e aceita override por env', () => {
    expect(dailyLimit('analyze', () => undefined)).toBe(5)
    expect(dailyLimit('optimize', () => undefined)).toBe(10)
    expect(dailyLimit('analyze', () => '20')).toBe(20)
    expect(dailyLimit('analyze', () => 'abc')).toBe(5)
    expect(dailyLimit('analyze', () => '0')).toBe(5)
  })
})

describe('consumeQuota', () => {
  const fakeClient = (count: number, inserts: unknown[]) => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count, error: null }) }) }) }),
      insert: async (row: unknown) => { inserts.push(row); return { error: null } },
    }),
  })
  it('bloqueia ao atingir o limite sem registrar uso', async () => {
    const inserts: unknown[] = []
    expect(isOverQuota(5, 5)).toBe(true)
    expect(await consumeQuota(fakeClient(5, inserts), 'u1', 'analyze', 5)).toBe(false)
    expect(inserts).toHaveLength(0)
  })
  it('registra o uso quando há saldo', async () => {
    const inserts: unknown[] = []
    expect(await consumeQuota(fakeClient(4, inserts), 'u1', 'analyze', 5)).toBe(true)
    expect(inserts).toEqual([{ user_id: 'u1', kind: 'analyze' }])
  })
})
