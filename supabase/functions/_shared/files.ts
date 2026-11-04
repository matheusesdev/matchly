// Módulo puro: identifica o tipo real do arquivo pelos primeiros bytes, sem confiar só na extensão.
export type ResumeFileKind = 'docx' | 'pdf'

export const MAX_RESUME_BYTES = 5 * 1024 * 1024

export function detectResumeKind(filename: string, bytes: Uint8Array): ResumeFileKind | null {
  const name = filename.toLowerCase()
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value)
  if (name.endsWith('.pdf') && startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf' // %PDF-
  if (name.endsWith('.docx') && startsWith([0x50, 0x4b, 0x03, 0x04])) return 'docx' // PK\x03\x04 (zip)
  return null
}

/** Normaliza o texto extraído de PDF: tira espaços no fim das linhas e colapsa linhas em branco repetidas. */
export function tidyExtractedText(text: string): string {
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
