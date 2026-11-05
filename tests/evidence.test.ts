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

import { contentLines } from '../supabase/functions/_shared/evidence'

describe('linhas copiadas do original e listas de habilidades (caso real do teste em produção)', () => {
  const resume = `CAROLINA MENDES RIBEIRO
Analista Financeiro Pleno · Comercial Aurora Ltda. (varejo) · 03/2021 – Atual
Responsável pela conciliação bancária diária de 150 contas.
Excel avançado · SAP Business One · Conciliação bancária · Fluxo de caixa
Português (nativo) · Inglês intermediário (leitura técnica)`
  const optimized = `CAROLINA MENDES RIBEIRO
carolina.exemplo@email.com | (11) 90000-0000

EXPERIÊNCIA PROFISSIONAL
Analista Financeiro Pleno · Comercial Aurora Ltda. (varejo) · 03/2021 – Atual
- Responsável pela conciliação bancária diária de 150 contas.

HABILIDADES
Excel avançado · SAP Business One · Fluxo de caixa

IDIOMAS
Português (nativo) · Inglês intermediário (leitura técnica)`

  it('cabeçalho de cargo e empresa idêntico ao original é aceito sem citação (antes virava falso alarme amarelo)', () => {
    const result = verifyEvidence(resume, optimized, [])
    const header = result.items.find((item) => item.line.startsWith('Analista Financeiro Pleno'))
    expect(header).toMatchObject({ verified: true, source: 'curriculo' })
    expect(result.items.filter((item) => !item.verified)).toEqual([])
  })

  it('lista de habilidades formada só por termos do original é aceita, sem alarme', () => {
    const result = verifyEvidence(resume, optimized, [])
    const skills = result.items.find((item) => item.line.startsWith('Excel avançado'))
    expect(skills).toMatchObject({ verified: true, source: 'curriculo' })
  })

  it('habilidade inventada na lista é sinalizada', () => {
    const withInvented = optimized.replace('Excel avançado · SAP Business One · Fluxo de caixa', 'Excel avançado · Power BI · Fluxo de caixa')
    const result = verifyEvidence(resume, withInvented, [])
    expect(result.items.filter((item) => !item.verified).map((item) => item.line)).toEqual(['Excel avançado · Power BI · Fluxo de caixa'])
  })

  it('habilidade que o usuário informou nas respostas é aceita e marcada como do candidato', () => {
    const withFact = optimized.replace('Excel avançado · SAP Business One · Fluxo de caixa', 'Excel avançado · Power BI · Fluxo de caixa')
    const result = verifyEvidence(resume, withFact, [], 'Ferramentas de BI: Montei dashboards mensais em Power BI para a diretoria')
    expect(result.items.filter((item) => !item.verified)).toEqual([])
  })

  it('termo curto casa por palavra inteira (SAP não casa com "ensaporado")', () => {
    const text = 'ANA\nHABILIDADES\nSAP · Excel'
    expect(verifyEvidence('Ana. Experiência com ensaporado e Excel', text, []).items.map((item) => item.verified)).toEqual([false])
    expect(verifyEvidence('Ana. Experiência com SAP e Excel', text, []).items).toEqual([])
  })

  it('frase inventada que não é cópia do original continua exigindo citação', () => {
    const text = 'ANA\nEXPERIÊNCIA\n- Liderei uma equipe de vinte pessoas na área fiscal.'
    expect(verifyEvidence(resume, text, []).items[0]).toMatchObject({ verified: false })
  })

  it('contentLines inclui linhas curtas, ignora o nome e os títulos', () => {
    expect(contentLines('ANA SOUZA\ncontato\nRESUMO\nTexto aqui\n- Excel\nHABILIDADES\nSAP · Excel')).toEqual(['Texto aqui', 'Excel', 'SAP · Excel'])
    expect(contentLines('sem seções')).toEqual([])
  })
})

import { splitSentences } from '../supabase/functions/_shared/evidence'

describe('resumo com várias frases (síntese do currículo)', () => {
  const source = 'Analista financeira com mais de 8 anos de experiência em contas a pagar e conciliação bancária. Elaboro relatórios mensais de fluxo de caixa para a diretoria financeira.'
  const summary = 'Analista financeira com mais de 8 anos de experiência em conciliação bancária e fechamento. Atuação em rotinas financeiras e relatórios para a diretoria.'
  const text = `CAROLINA\nRESUMO\n${summary}`

  it('divide em frases sem quebrar abreviações', () => {
    expect(splitSentences('Foi gerente na Acme Ltda. (varejo) por 3 anos. Depois atuou na Beta S.A. com vendas.')).toEqual(['Foi gerente na Acme Ltda. (varejo) por 3 anos.', 'Depois atuou na Beta S.A. com vendas.'])
    expect(splitSentences('Uma frase só.')).toEqual(['Uma frase só.'])
  })

  it('vale quando cada frase tem a sua citação, mesmo que a síntese não seja cópia de um trecho', () => {
    const result = verifyEvidence(source, text, [
      { line: 'Analista financeira com mais de 8 anos de experiência em conciliação bancária e fechamento.', source_quote: 'Analista financeira com mais de 8 anos de experiência' },
      { line: 'Atuação em rotinas financeiras e relatórios para a diretoria.', source_quote: 'relatórios mensais de fluxo de caixa para a diretoria financeira' },
    ])
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ verified: true, source: 'curriculo' })
  })

  it('basta uma frase sem prova para a linha continuar sinalizada', () => {
    const result = verifyEvidence(source, text, [
      { line: 'Analista financeira com mais de 8 anos de experiência em conciliação bancária e fechamento.', source_quote: 'Analista financeira com mais de 8 anos de experiência' },
      { line: 'Atuação em rotinas financeiras e relatórios para a diretoria.', source_quote: 'liderou a diretoria inteira' },
    ])
    expect(result.items[0].verified).toBe(false)
  })

  it('uma única citação genérica para a linha toda não basta quando as frases não têm prova própria', () => {
    const result = verifyEvidence(source, text, [{ line: summary, source_quote: 'inexistente no original' }])
    expect(result.items[0].verified).toBe(false)
  })
})
