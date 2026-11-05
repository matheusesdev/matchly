import { describe, expect, it } from 'vitest'
import { consumeQuota, dailyLimit, isOverQuota } from '../supabase/functions/_shared/quota'
import { GEMINI_ATTEMPTS_PER_MODEL, retryDelayMs } from '../supabase/functions/_shared/retry'
import { classifyError, isRefundable } from '../supabase/functions/_shared/telemetry'

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
      insert: (row: unknown) => {
        inserts.push(row)
        return { select: () => ({ single: async () => ({ data: { id: 'evt-123' }, error: null }) }) }
      },
    }),
  })
  it('bloqueia ao atingir o limite sem registrar uso', async () => {
    const inserts: unknown[] = []
    expect(isOverQuota(5, 5)).toBe(true)
    expect(await consumeQuota(fakeClient(5, inserts), 'u1', 'analyze', 5)).toEqual({ ok: false, eventId: null })
    expect(inserts).toHaveLength(0)
  })
  it('registra o uso e devolve o id do consumo quando há saldo (para poder devolver a cota)', async () => {
    const inserts: unknown[] = []
    expect(await consumeQuota(fakeClient(4, inserts), 'u1', 'analyze', 5)).toEqual({ ok: true, eventId: 'evt-123' })
    expect(inserts).toEqual([{ user_id: 'u1', kind: 'analyze' }])
  })
})

describe('devolução da cota quando a falha não é do usuário', () => {
  it('devolve para falhas do provedor de IA e resposta fora do formato', () => {
    for (const error of [new Error('Gemini status 503'), new Error('Gemini status 429'), new Error('Gemini timeout'), new Error('Gemini JSON inválido (MAX_TOKENS)'), new Error('Resposta da IA inválida')]) {
      expect(isRefundable(classifyError(error)), error.message).toBe(true)
    }
  })
  it('não devolve para erros do banco ou desconhecidos (evita abuso)', () => {
    expect(isRefundable(classifyError({ code: '42501' }))).toBe(false)
    expect(isRefundable(classifyError(new Error('qualquer coisa')))).toBe(false)
  })
})

describe('espera entre tentativas com a IA', () => {
  it('cresce a cada tentativa e não espera depois da última', () => {
    const none = () => 0
    expect(GEMINI_ATTEMPTS_PER_MODEL).toBe(3)
    expect(retryDelayMs(0, none)).toBe(700)
    expect(retryDelayMs(1, none)).toBe(2000)
    expect(retryDelayMs(2, none)).toBe(0)
    expect(retryDelayMs(-1, none)).toBe(0)
  })
  it('acrescenta pouca variação aleatória', () => {
    expect(retryDelayMs(0, () => 1)).toBe(1000)
    expect(retryDelayMs(1, () => 0.5)).toBe(2150)
  })
})
