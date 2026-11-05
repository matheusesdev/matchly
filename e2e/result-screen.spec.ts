import { expect, test } from '@playwright/test'
import { ID, analysisRow, setup } from './support'

test.describe('tela de resultado da análise', () => {
  test('palavras-chave são termos curtos verificados, não cópias dos pontos fortes', async ({ page }) => {
    const backend = await setup(page, analysisRow({
      strengths: ['Mais de 8 anos de experiência na área financeira e conciliação bancária', 'Excel avançado com tabelas dinâmicas e macros simples'],
      matched_keywords: ['Excel avançado', 'SAP'], missing_keywords: ['Power BI', 'FP&A'],
    }))
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await expect(page.locator('.chips .found')).toHaveText(['Excel avançado', 'SAP'])
    await expect(page.locator('.chips .missing')).toHaveText(['Power BI', 'FP&A'])
    // Regressão: os chips "encontrados" eram frases inteiras copiadas dos pontos fortes.
    await expect(page.locator('.chips')).not.toContainText('Mais de 8 anos de experiência')
  })

  test('análises antigas (sem termos encontrados) mostram só os ausentes, sem frases soltas', async ({ page }) => {
    const backend = await setup(page, analysisRow({ matched_keywords: undefined, missing_keywords: ['Power BI'] }))
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await expect(page.locator('.chips .found')).toHaveCount(0)
    await expect(page.locator('.chips .missing')).toHaveText(['Power BI'])
  })

  for (const [nome, largura] of [['desktop', 1280], ['celular', 360]] as const) {
    test(`o botão da carta cabe em uma linha dentro do cartão verde (${nome})`, async ({ page }) => {
      const backend = await setup(page, analysisRow())
      await backend.login()
      await page.setViewportSize({ width: largura, height: 900 })
      await page.goto(`/analises/${ID}`)
      const button = page.getByRole('button', { name: 'Escrever carta de apresentação' })
      await expect(button).toBeVisible()
      const box = (await button.boundingBox())!
      // Regressão: ficava espremido na coluna estreita, quebrando em 3 linhas (altura > 80 px).
      expect(box.height).toBeLessThan(60)
      expect(box.width).toBeGreaterThan(200)
    })
  }
})
