import { describe, expect, it } from 'vitest'
import { buildResumeDocx, parseResumeText } from '../src/lib/resumeDocx'

describe('parseResumeText', () => {
  it('identifica nome, seções, itens e parágrafos', () => {
    const blocks = parseResumeText('MARIA SILVA\nmaria@email.com\n\nEXPERIÊNCIA PROFISSIONAL\nAnalista · Acme\n- Fiz X\n• Fiz Y')
    expect(blocks.map((b) => b.type)).toEqual(['name', 'paragraph', 'heading', 'paragraph', 'bullet', 'bullet'])
    expect(blocks[4]).toEqual({ type: 'bullet', text: 'Fiz X' })
  })
  it('ignora linhas vazias e aceita CRLF', () => {
    expect(parseResumeText('Ana\r\n\r\nRESUMO\r\nTexto')).toHaveLength(3)
  })
})

describe('buildResumeDocx', () => {
  it('gera um arquivo DOCX (zip) não vazio', async () => {
    const blob = await buildResumeDocx('ANA\nRESUMO\nTexto\n- item')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(500)
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
  })
})

import { buildResumePdf } from '../src/lib/resumePdf'
describe('buildResumePdf', () => {
  it('gera um PDF válido com texto longo e acentos', async () => {
    const long = 'EXPERIÊNCIA PROFISSIONAL\n' + Array.from({ length: 80 }, (_, i) => `- Atuação em conciliação e gestão ${i} com ações`).join('\n')
    const blob = await buildResumePdf('JOÃO AÇÃO\ncontato@email.com\n' + long)
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
    expect(head).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(2000)
  })
})

import { extractText, getDocumentProxy } from 'unpdf'
describe('PDF ida e volta (compatível com a leitura do upload)', () => {
  it('o texto exportado é extraível com acentos e ordem preservados', async () => {
    const blob = await buildResumePdf('JOÃO AÇÃO\nRESUMO\nGestão de conciliação financeira.\n- Reduzi retrabalho em 20%')
    const doc = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()))
    const { text } = await extractText(doc, { mergePages: true })
    expect(text).toContain('JOÃO AÇÃO')
    expect(text).toContain('Gestão de conciliação financeira.')
    expect(text.indexOf('RESUMO')).toBeGreaterThan(text.indexOf('JOÃO'))
    expect(text).toContain('20%')
  })
})
