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
