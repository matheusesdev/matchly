import { expect, test } from '@playwright/test'
import { ID, ID_2, analysisRow, optimizedRow, setup } from './support'

test.describe('histórico e rotas', () => {
  test('lista as análises mais recentes primeiro e abre uma delas, sobrevivendo ao refresh', async ({ page }) => {
    const backend = await setup(page, optimizedRow({ id: ID }), analysisRow({ id: ID_2, job_text: 'Analista de Dados', match_score: 41, created_at: '2026-11-02T10:00:00Z' }))
    await backend.login()
    await page.goto('/analises')
    const titles = page.locator('.history-item .history-info strong')
    await expect(titles).toHaveText(['Analista de Dados', 'Analista Financeiro'])
    await expect(page.locator('.history-item').nth(1)).toContainText('versão otimizada')

    await page.locator('.history-open').nth(1).click()
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}$`))
    await page.reload()
    await expect(page.locator('.score-ring')).toContainText('72')
    await expect(page.getByRole('button', { name: 'Ver currículo otimizado' })).toBeVisible()
  })

  test('exclui uma análise depois da confirmação', async ({ page }) => {
    const backend = await setup(page, analysisRow({ id: ID }), analysisRow({ id: ID_2, created_at: '2026-11-02T10:00:00Z' }))
    await backend.login()
    await page.goto('/analises')
    await page.locator('.history-delete').first().click()
    await expect(page.getByRole('alert')).toContainText('Excluir esta análise?')
    await page.getByRole('button', { name: 'Sim, excluir' }).click()
    await expect(page.locator('.history-item')).toHaveCount(1)
    expect(backend.deletedIds).toEqual([ID_2])
  })

  test('histórico vazio convida a fazer a primeira análise', async ({ page }) => {
    const backend = await setup(page)
    await backend.login()
    await page.goto('/analises')
    await expect(page.getByRole('heading', { name: 'Nenhuma análise ainda' })).toBeVisible()
  })

  test('análise inexistente mostra uma mensagem clara', async ({ page }) => {
    const backend = await setup(page)
    await backend.login()
    await page.goto('/analises/99999999-9999-4999-8999-999999999999')
    await expect(page.getByRole('heading', { name: 'Análise não encontrada' })).toBeVisible()
  })

  test('abrir /otimizado sem versão gerada redireciona para o resultado', async ({ page }) => {
    const backend = await setup(page, analysisRow())
    await backend.login()
    await page.goto(`/analises/${ID}/otimizado`)
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}$`))
    await expect(page.locator('.score-card')).toBeVisible()
  })
})
