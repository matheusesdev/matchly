import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ID, analysisRow, optimizedRow, setup } from './support'

// Espera animações e transições de CSS terminarem: medir contraste no meio de um fade (opacidade parcial) dá falso
// positivo que varia com a velocidade da máquina (visto na CI: elementos diferentes falhando a cada execução).
// Animações infinitas (ex.: o indicador de carregamento) são ignoradas.
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
    await Promise.allSettled(finite.map((animation) => animation.finished))
  })
  await page.waitForTimeout(150)
}

// Falha para qualquer violação WCAG 2 A/AA de impacto sério ou crítico.
async function expectAccessible(page: Page) {
  await settle(page)
  const results = await new AxeBuilder({ page })
    // A ilustração da landing é decorativa (aria-hidden) e usa texto de 7-8 px de uma tela de exemplo.
    .exclude('.hero-product')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
  const describeNode = (node: (typeof blocking)[number]['nodes'][number]) => {
    const data = (node.any[0]?.data ?? {}) as Record<string, unknown>
    return node.target.join(' ') + (data.contrastRatio ? ` fg=${data.fgColor} bg=${data.bgColor} razão=${data.contrastRatio}` : '')
  }
  const report = blocking.map((violation) => `${violation.id} (${violation.impact}): ${violation.help}\n   ${violation.nodes.slice(0, 3).map(describeNode).join('\n   ')}`)
  expect(report, report.join('\n')).toEqual([])
}

test.describe('acessibilidade (axe, WCAG 2 A/AA)', () => {
  // Medir contraste no meio de uma animação de entrada (opacidade parcial) dá falso positivo e varia com a velocidade da máquina.
  // O app respeita prefers-reduced-motion, que é o estado estável da interface.
  test.use({ reducedMotion: 'reduce' })

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
