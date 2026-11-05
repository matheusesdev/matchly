import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AccountDeletedPage, PrivacyPage, TermsPage } from '../src/components/LegalPages'

const html = (node: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('textos legais', () => {
  it('a política cita os provedores e direitos que o produto de fato usa', () => {
    const text = html(<PrivacyPage />)
    for (const term of ['Supabase', 'Gemini', 'Vercel', 'LGPD', 'ANPD', 'Transferência internacional', 'maiores de 18']) expect(text).toContain(term)
    expect(text).toContain('/conta')
  })
  it('os termos avisam sobre limites da IA e a ausência de garantias', () => {
    const text = html(<TermsPage />)
    expect(text).toContain('Revise tudo antes de enviar')
    expect(text).toContain('Não garantimos aprovação')
    expect(text).toContain('/privacidade')
  })
  it('enquanto não houver revisão jurídica, exibe o aviso de rascunho', () => {
    expect(html(<PrivacyPage />)).toContain('Rascunho em revisão')
    expect(html(<TermsPage />)).toContain('Rascunho em revisão')
  })
  it('a página de conta excluída aponta para a política', () => {
    expect(html(<AccountDeletedPage />)).toContain('Sua conta foi excluída')
  })
})
