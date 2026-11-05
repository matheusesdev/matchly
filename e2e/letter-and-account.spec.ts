import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { ID, analysisRow, hasHorizontalScroll, setup } from './support'

const LETTER = 'Prezados,\n\nTenho interesse na vaga de Analista. Atuei na conciliação bancária diária de 150 contas na Acme.\n\nLiderei uma equipe de vinte pessoas.\n\nAtenciosamente,\nAna Souza'

test.describe('carta de apresentação', () => {
  test('gera com o tom escolhido, mostra a origem das afirmações e exporta', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const backend = await setup(page, analysisRow())
    backend.on('generate-cover-letter', () => ({ body: { cover_letter: LETTER, evidence: [
      { line: 'Atuei na conciliação bancária diária de 150 contas na Acme.', quote: 'Conciliação bancária diária de 150 contas', verified: true, source: 'curriculo' },
      { line: 'Liderei uma equipe de vinte pessoas.', quote: '', verified: false },
    ] } }))
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await page.getByRole('button', { name: 'Escrever carta de apresentação' }).click()
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}/carta$`))
    await expect(page.locator('.letter-empty')).toBeVisible()

    await page.getByRole('radio', { name: /Próximo/ }).click()
    await page.getByRole('button', { name: 'Gerar carta' }).click()
    await expect(page.locator('.letter-paper p')).toHaveCount(4)
    expect(backend.callsTo('generate-cover-letter')[0].body).toEqual({ analysis_id: ID, tone: 'proximo' })
    await expect(page.locator('.fidelity')).toContainText('1 de 2')

    await page.locator('.letter-claims li.warn button').click()
    await expect(page.locator('.letter-claims li.warn .ev-source')).toContainText('Conferir antes de enviar')
    await page.locator('.letter-claims li.ok button').click()
    await expect(page.locator('.letter-claims li.ok .ev-source')).toContainText('Conciliação bancária diária de 150 contas')

    await page.getByRole('button', { name: 'Copiar' }).click()
    await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible()
    // O clipboard do Windows devolve CRLF; compara normalizando as quebras de linha.
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied.split('\r\n').join('\n')).toBe(LETTER)
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF' }).click()])
    expect(pdf.suggestedFilename()).toBe('carta-de-apresentacao.pdf')
    const [docx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'DOCX' }).click()])
    expect(docx.suggestedFilename()).toBe('carta-de-apresentacao.docx')
  })

  test('mostra o erro da cota diária e não apaga a carta anterior', async ({ page }) => {
    const backend = await setup(page, analysisRow({ cover_letter: LETTER, cover_letter_evidence: [] }))
    backend.on('generate-cover-letter', () => ({ status: 429, body: { error: 'Você atingiu o limite diário de cartas. Tente novamente amanhã.' } }))
    await backend.login()
    await page.goto(`/analises/${ID}/carta`)
    await expect(page.locator('.letter-paper')).toContainText('Prezados')
    await page.getByRole('button', { name: 'Gerar nova versão' }).click()
    await expect(page.getByRole('alert')).toContainText('limite diário')
    await expect(page.locator('.letter-paper')).toContainText('Prezados')
  })

  test('cabe em 360 px', async ({ page }) => {
    const backend = await setup(page, analysisRow({ cover_letter: LETTER, cover_letter_evidence: [] }))
    await backend.login()
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`/analises/${ID}/carta`)
    await expect(page.locator('.letter-paper')).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
  })
})

test.describe('minha conta (LGPD)', () => {
  test('baixa todos os dados da conta em JSON', async ({ page }, testInfo) => {
    const backend = await setup(page, analysisRow())
    await backend.login()
    await page.goto('/conta')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar arquivo' }).click()])
    expect(download.suggestedFilename()).toBe('meus-dados-matchly.json')
    const file = testInfo.outputPath('dados.json')
    await download.saveAs(file)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(data.conta.email).toBe('maria@email.com')
    expect(data.curriculos).toHaveLength(1)
    expect(data.analises).toHaveLength(1)
    expect(data.uso).toHaveLength(1)
    expect(data.execucoes_ia).toHaveLength(1)
  })

  test('exclusão exige digitar o e-mail e leva à confirmação', async ({ page }) => {
    const backend = await setup(page)
    backend.on('delete-account', () => ({ body: { deleted: true } }))
    await backend.login()
    await page.goto('/conta')
    await page.getByRole('button', { name: 'Quero excluir minha conta' }).click()
    const confirm = page.getByRole('button', { name: 'Excluir definitivamente' })
    await expect(confirm).toBeDisabled()
    await page.locator('#confirm-email').fill('outra@email.com')
    await expect(confirm).toBeDisabled()
    await page.locator('#confirm-email').fill('MARIA@email.com')
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(page.getByRole('heading', { name: 'Sua conta foi excluída' })).toBeVisible()
    expect(backend.callsTo('delete-account')[0].body).toEqual({ confirm_email: 'MARIA@email.com' })
  })

  test('mostra o erro do servidor se a exclusão falhar e mantém o usuário na página', async ({ page }) => {
    const backend = await setup(page)
    backend.on('delete-account', () => ({ status: 500, body: { error: 'Não foi possível excluir a conta.' } }))
    await backend.login()
    await page.goto('/conta')
    await page.getByRole('button', { name: 'Quero excluir minha conta' }).click()
    await page.locator('#confirm-email').fill('maria@email.com')
    await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível excluir a conta')
    await expect(page).toHaveURL(/\/conta$/)
  })
})
