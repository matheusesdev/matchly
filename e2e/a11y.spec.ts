import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ID, analysisRow, optimizedRow, setup } from './support'

// Falha para qualquer violação WCAG 2 A/AA de impacto sério ou crítico.
async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
  const report = blocking.map((violation) => `${violation.id} (${violation.impact}): ${violation.help}\n   ${violation.nodes.slice(0, 3).map((node) => node.target.join(' ')).join('\n   ')}`)
  expect(report, report.join('\n')).toEqual([])
}

test.describe('acessibilidade (axe, WCAG 2 A/AA)', () => {
  test('páginas públicas', async ({ page }) => {
    await setup(page)
    for (const path of ['/', '/termos', '/privacidade']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectAccessible(page)
    }
  })

  test('diálogo de login', async ({ page }) => {
    await setup(page)
    await page.goto('/')
    await page.locator('.header-cta').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAccessible(page)
  })

  test('telas autenticadas', async ({ page }) => {
    const backend = await setup(page, optimizedRow({ cover_letter: 'Prezados,\n\nTexto da carta com bastante conteúdo para o teste de acessibilidade da tela.\n\nAtenciosamente,\nAna', user_facts: [{ area: 'Inglês avançado', answer: 'Trabalhei dois anos com clientes dos EUA' }] }))
    await backend.login()
    for (const path of ['/analisar', '/analises', `/analises/${ID}`, `/analises/${ID}/otimizado`, `/analises/${ID}/carta`, '/conta']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectAccessible(page)
    }
  })

  test('telas com elementos expandidos', async ({ page }) => {
    const backend = await setup(page, optimizedRow(), analysisRow({ id: '22222222-2222-4222-8222-222222222222' }))
    await backend.login()
    await page.goto(`/analises/${ID}/otimizado`)
    await page.locator('.ev-line.warn button').click()
    await expectAccessible(page)
    await page.goto(`/analises/${ID}`)
    await page.getByRole('button', { name: 'Tenho essa experiência' }).first().click()
    await expectAccessible(page)
  })
})
