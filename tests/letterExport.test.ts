import { describe, expect, it } from 'vitest'
import { extractText, getDocumentProxy } from 'unpdf'
import { buildLetterDocx, buildLetterPdf, letterParagraphs } from '../src/lib/letterExport'

const letter = 'Prezados,\n\nTenho interesse na vaga de Analista. Atuei na conciliação bancária diária.\n\nAtenciosamente,\nMaria Souza'

describe('letterParagraphs', () => {
  it('separa por linha em branco e preserva quebras simples', () => {
    expect(letterParagraphs(letter)).toEqual(['Prezados,', 'Tenho interesse na vaga de Analista. Atuei na conciliação bancária diária.', 'Atenciosamente,\nMaria Souza'])
    expect(letterParagraphs('a\r\n\r\n\r\nb')).toEqual(['a', 'b'])
    expect(letterParagraphs('  \n\n ')).toEqual([])
  })
})

describe('exportação da carta', () => {
  it('gera DOCX (zip)', async () => {
    const bytes = new Uint8Array(await (await buildLetterDocx(letter)).arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
  })
  it('gera PDF legível com acentos e quebra de página para cartas longas', async () => {
    const long = Array.from({ length: 60 }, (_, i) => `Parágrafo ${i} sobre a conciliação bancária e gestão de ações.`).join('\n\n')
    const blob = await buildLetterPdf(`${letter}\n\n${long}`)
    const doc = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()))
    const { text, totalPages } = await extractText(doc, { mergePages: true })
    expect(totalPages).toBeGreaterThan(1)
    expect(text).toContain('conciliação bancária diária')
    expect(text).toContain('Atenciosamente')
  })
})
