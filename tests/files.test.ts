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
