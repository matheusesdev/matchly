import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { saveBlob } from './download'

export type ResumeBlock =
  | { type: 'name'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'paragraph'; text: string }

const bulletPrefix = /^\s*(?:[-•*–])\s+/

function isHeading(line: string) {
  const letters = line.replace(/[^\p{L}]/gu, '')
  return letters.length >= 3 && line.length <= 60 && line === line.toUpperCase() && !bulletPrefix.test(line)
}

/** Converte o texto simples gerado pela IA em blocos estruturais. */
export function parseResumeText(text: string): ResumeBlock[] {
  const blocks: ResumeBlock[] = []
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (!blocks.length) blocks.push({ type: 'name', text: line.replace(bulletPrefix, '') })
    else if (bulletPrefix.test(line)) blocks.push({ type: 'bullet', text: line.replace(bulletPrefix, '') })
    else if (isHeading(line)) blocks.push({ type: 'heading', text: line })
    else blocks.push({ type: 'paragraph', text: line })
  }
  return blocks
}

function toParagraph(block: ResumeBlock) {
  switch (block.type) {
    case 'name':
      return new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 120 }, children: [new TextRun({ text: block.text, bold: true, size: 36 })] })
    case 'heading':
      return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 }, border: { bottom: { style: 'single', size: 6, space: 2, color: '999999' } }, children: [new TextRun({ text: block.text, bold: true, size: 24 })] })
    case 'bullet':
      return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: block.text, size: 22 })] })
    default:
      return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: block.text, size: 22 })] })
  }
}

export async function buildResumeDocx(text: string): Promise<Blob> {
  const doc = new Document({
    creator: 'Matchly',
    title: 'Currículo otimizado',
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: parseResumeText(text).map(toParagraph) }],
  })
  return Packer.toBlob(doc)
}

export async function downloadResumeDocx(text: string, filename = 'curriculo-otimizado.docx') {
  saveBlob(await buildResumeDocx(text), filename)
}
