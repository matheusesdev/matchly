import { expect, test } from '@playwright/test'
import { setup } from './support'

test.describe('páginas públicas e proteção de rotas', () => {
  test('a landing não traz promessas sem lastro', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    const html = await page.content()
    for (const claim of ['+28 pontos', 'Pronto para ATS', 'acima da média', 'nunca compartilhados']) expect(html).not.toContain(claim)
  })

  test('termos e privacidade abrem sem login e avisam que são rascunho', async ({ page }) => {
    await setup(page)
    await page.goto('/privacidade')
    await expect(page.getByRole('heading', { name: 'Política de Privacidade' })).toBeVisible()
    await expect(page.locator('.legal-draft')).toBeVisible()
    for (const provider of ['Supabase', 'Gemini', 'Vercel']) await expect(page.locator('.legal-wrap')).toContainText(provider)
    await page.goto('/termos')
    await expect(page.getByRole('heading', { name: 'Termos de Uso' })).toBeVisible()
    await expect(page.locator('.legal-wrap')).toContainText('Revise tudo antes de enviar')
  })

  test('o rodapé leva aos documentos legais', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await page.locator('footer').getByRole('link', { name: 'Termos' }).click()
    await expect(page).toHaveURL(/\/termos$/)
  })

  test('o login pede ciência dos termos e o link fecha o diálogo', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await page.locator('.header-cta').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Ao entrar, você concorda')
    await dialog.getByRole('link', { name: 'Política de Privacidade' }).click()
    await expect(page).toHaveURL(/\/privacidade$/)
    await expect(dialog).toBeHidden()
  })

  for (const path of ['/analisar', '/analises', '/conta', '/analises/11111111-1111-4111-8111-111111111111']) {
    test(`rota protegida ${path} abre o login quando não há sessão`, async ({ page }) => {
      await setup(page)
      await page.goto(path)
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page).toHaveURL(/\/$/)
    })
  }

  test('rota inexistente volta para a landing', async ({ page }) => {
    await setup(page)
    await page.goto('/nao-existe')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.landing')).toBeVisible()
  })
})
