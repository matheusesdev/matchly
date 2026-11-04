import { describe, expect, it } from 'vitest'
import { detectResumeKind } from '../supabase/functions/_shared/files'

const pdf = new TextEncoder().encode('%PDF-1.7 ...')
const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])

describe('detectResumeKind', () => {
  it('aceita PDF e DOCX com assinatura correta', () => {
    expect(detectResumeKind('Cv.PDF', pdf)).toBe('pdf')
    expect(detectResumeKind('cv.docx', zip)).toBe('docx')
  })
  it('rejeita extensão que não bate com o conteúdo', () => {
    expect(detectResumeKind('cv.pdf', zip)).toBeNull()
    expect(detectResumeKind('cv.docx', pdf)).toBeNull()
    expect(detectResumeKind('cv.docx', new TextEncoder().encode('texto'))).toBeNull()
  })
  it('rejeita outras extensões', () => {
    expect(detectResumeKind('cv.exe', pdf)).toBeNull()
    expect(detectResumeKind('cv.doc', zip)).toBeNull()
  })
})

import { tidyExtractedText } from '../supabase/functions/_shared/files'
describe('tidyExtractedText', () => {
  it('remove espaços no fim das linhas e colapsa linhas em branco', () => {
    expect(tidyExtractedText('A  \n\n\n\nB \t\nC\n')).toBe('A\n\nB\nC')
  })
})

import { sha256Hex } from '../supabase/functions/_shared/files'
describe('sha256Hex', () => {
  it('é estável e ignora diferenças de espaçamento', async () => {
    expect(await sha256Hex('Ana  Silva\n Analista')).toBe(await sha256Hex('Ana Silva Analista'))
    expect(await sha256Hex('a')).not.toBe(await sha256Hex('b'))
    expect(await sha256Hex('a')).toHaveLength(64)
  })
})
