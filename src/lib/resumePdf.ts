import { saveBlob } from './download'
import { parseResumeText } from './resumeDocx'

const PAGE = { width: 210, height: 297, margin: 18 }

/** Gera o PDF do currículo (texto selecionável, fonte padrão, uma coluna: seguro para ATS). */
export async function buildResumePdf(text: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setProperties({ title: 'Currículo otimizado', creator: 'Matchly' })
  const maxWidth = PAGE.width - PAGE.margin * 2
  let y = PAGE.margin
  const ensure = (needed: number) => { if (y + needed > PAGE.height - PAGE.margin) { pdf.addPage(); y = PAGE.margin } }
  const write = (content: string, opts: { size: number; bold?: boolean; indent?: number; gap: number; before?: number; rule?: boolean }) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal'); pdf.setFontSize(opts.size)
    const lineHeight = opts.size * 0.45
    const lines: string[] = pdf.splitTextToSize(content, maxWidth - (opts.indent ?? 0))
    ensure((opts.before ?? 0) + lineHeight)
    y += opts.before ?? 0
    for (const line of lines) {
      ensure(lineHeight)
      pdf.text(line, PAGE.margin + (opts.indent ?? 0), y)
      y += lineHeight
    }
    if (opts.rule) { pdf.setDrawColor(150); pdf.line(PAGE.margin, y - lineHeight + 1.5, PAGE.width - PAGE.margin, y - lineHeight + 1.5); y += 0.5 }
    y += opts.gap
  }
  for (const block of parseResumeText(text)) {
    if (block.type === 'name') write(block.text, { size: 18, bold: true, gap: 2 })
    else if (block.type === 'heading') write(block.text, { size: 11.5, bold: true, gap: 1.5, before: 5, rule: true })
    else if (block.type === 'bullet') {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5)
      ensure(5); pdf.text('•', PAGE.margin + 1, y)
      write(block.text, { size: 10.5, indent: 5, gap: 0.8 })
    } else write(block.text, { size: 10.5, gap: 1 })
  }
  return pdf.output('blob')
}

export async function downloadResumePdf(text: string, filename = 'curriculo-otimizado.pdf') {
  saveBlob(await buildResumePdf(text), filename)
}
