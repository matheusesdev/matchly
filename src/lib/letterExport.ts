import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveBlob } from './download'

/** Separa a carta em parágrafos (linha em branco) preservando quebras simples dentro do parágrafo. */
export function letterParagraphs(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
}

export async function buildLetterDocx(text: string): Promise<Blob> {
  const children = letterParagraphs(text).map((paragraph) => new Paragraph({
    spacing: { after: 200, line: 300 },
    children: paragraph.split('\n').flatMap((line, index) => [new TextRun({ text: line, size: 23, break: index ? 1 : 0 })]),
  }))
  const doc = new Document({ creator: 'Matchly', title: 'Carta de apresentação', sections: [{ properties: { page: { margin: { top: 1400, bottom: 1400, left: 1500, right: 1500 } } }, children }] })
  return Packer.toBlob(doc)
}

export async function buildLetterPdf(text: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setProperties({ title: 'Carta de apresentação', creator: 'Matchly' })
  const margin = 22, width = 210 - margin * 2, lineHeight = 5.6
  let y = margin
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
  for (const paragraph of letterParagraphs(text)) {
    const lines: string[] = pdf.splitTextToSize(paragraph, width)
    for (const line of lines) {
      if (y + lineHeight > 297 - margin) { pdf.addPage(); y = margin }
      pdf.text(line, margin, y); y += lineHeight
    }
    y += 3.5
  }
  return pdf.output('blob')
}

export async function downloadLetter(text: string, format: 'pdf' | 'docx') {
  saveBlob(format === 'pdf' ? await buildLetterPdf(text) : await buildLetterDocx(text), `carta-de-apresentacao.${format}`)
}
