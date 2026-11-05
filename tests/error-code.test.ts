import { describe, expect, it } from 'vitest'
import { buildRun, classifyError } from '../supabase/functions/_shared/telemetry'

describe('classifyError', () => {
  it('identifica o status HTTP do Gemini', () => {
    expect(classifyError(new Error('Gemini status 429'))).toBe('gemini_429')
    expect(classifyError(new Error('Gemini status 503'))).toBe('gemini_503')
    expect(classifyError(new Error('Gemini status 400'))).toBe('gemini_400')
  })
  it('identifica timeout, resposta cortada e saída sem texto (com o motivo de término)', () => {
    expect(classifyError(new Error('Gemini timeout'))).toBe('gemini_timeout')
    expect(classifyError(new Error('Gemini JSON inválido (MAX_TOKENS)'))).toBe('gemini_bad_json_max_tokens')
    expect(classifyError(new Error('Gemini sem texto (SAFETY)'))).toBe('gemini_no_text_safety')
    expect(classifyError(new Error('Gemini sem texto (UNKNOWN)'))).toBe('gemini_no_text_unknown')
  })
  it('agrupa o resto das falhas do Gemini e as respostas fora do formato', () => {
    expect(classifyError(new Error('Gemini indisponível'))).toBe('gemini_unavailable')
    expect(classifyError(new Error('Resposta da IA inválida'))).toBe('invalid_ai_output')
    expect(classifyError(new Error('Score inválido'))).toBe('invalid_ai_output')
    expect(classifyError(new Error('Currículo otimizado vazio'))).toBe('invalid_ai_output')
    expect(classifyError(new Error('Carta vazia ou curta demais'))).toBe('invalid_ai_output')
  })
  it('identifica erro do banco pelo código, sem expor a mensagem', () => {
    expect(classifyError({ code: '42501', message: 'new row violates row-level security policy for table "x"' })).toBe('db_42501')
  })
  it('usa unknown para o que não reconhece e nunca vaza texto livre', () => {
    expect(classifyError(new Error('algo com dados do usuário: ana@email.com'))).toBe('unknown')
    expect(classifyError(undefined)).toBe('unknown')
    expect(classifyError({ code: 'código com espaços e acentos!' })).toBe('unknown')
  })
})

describe('buildRun com causa da falha', () => {
  it('só grava error_code quando o resultado é erro', () => {
    expect(buildRun({ kind: 'optimize', outcome: 'error', errorCode: 'gemini_503', startedAt: 0, now: 5 }).error_code).toBe('gemini_503')
    expect(buildRun({ kind: 'optimize', outcome: 'ok', errorCode: 'gemini_503', startedAt: 0, now: 5 }).error_code).toBeNull()
  })
  it('descarta códigos fora do formato seguro e cai em unknown', () => {
    expect(buildRun({ kind: 'analyze', outcome: 'error', errorCode: 'Maria Souza <a@b.com>', startedAt: 0, now: 1 }).error_code).toBe('unknown')
    expect(buildRun({ kind: 'analyze', outcome: 'error', startedAt: 0, now: 1 }).error_code).toBe('unknown')
  })
})
