import { expect, test } from '@playwright/test'
import { ID, analysisRow, setup } from './support'

const JOB = 'Analista Financeiro. '.repeat(10)
const pdf = { name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 conteudo') }

test.describe('fluxo de análise', () => {
  test('rejeita formato e tamanho inválidos no envio do currículo', async ({ page }) => {
    const backend = await setup(page)
    await backend.login()
    await page.goto('/analisar')
    const input = page.locator('input[type=file]')
    await input.setInputFiles({ name: 'cv.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') })
    await expect(page.getByRole('alert')).toContainText('Formato não suportado')
    await input.setInputFiles({ name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 10) })
    await expect(page.getByRole('alert')).toContainText('mais de 5 MB')
    await expect(page.getByRole('button', { name: /Analisar compatibilidade/ })).toBeDisabled()
  })

  test('envia o PDF, mostra o carregamento e abre o resultado na URL da análise', async ({ page }) => {
    const backend = await setup(page, analysisRow())
    backend.on('analyze-resume', () => ({ body: { analysis_id: ID } }))
    await backend.login()
    await page.goto('/analisar')
    await expect(page.locator('.privacy')).toContainText('Google Gemini')
    await page.locator('input[type=file]').setInputFiles(pdf)
    await page.locator('textarea').fill(JOB)
    await page.getByRole('button', { name: /Analisar compatibilidade/ }).click()
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}$`))
    await expect(page.locator('.score-ring')).toContainText('72')
    await expect(page.locator('.panel.gaps')).toContainText('Métricas de produto')
    expect(backend.callsTo('analyze-resume')).toHaveLength(1)
  })

  test('se a análise falha, mostra o erro e mantém arquivo e texto da vaga no formulário', async ({ page }) => {
    const backend = await setup(page)
    backend.on('analyze-resume', () => ({ status: 429, body: { error: 'Você atingiu o limite diário de análises. Tente novamente amanhã.' } }))
    await backend.login()
    await page.goto('/analisar')
    await page.locator('input[type=file]').setInputFiles(pdf)
    await page.locator('textarea').fill(JOB)
    await page.getByRole('button', { name: /Analisar compatibilidade/ }).click()
    await expect(page.locator('.flow-error')).toContainText('limite diário')
    await expect(page.locator('textarea')).toHaveValue(JOB)
    await expect(page.locator('.dropzone')).toContainText('cv.pdf')
    await expect(page).toHaveURL(/\/analisar$/)
  })

  test('gera o currículo otimizado e navega para a versão com origem das frases', async ({ page }) => {
    const backend = await setup(page, analysisRow())
    backend.on('optimize-resume', () => {
      backend.seed({ ...backend.analyses.get(ID)!, optimized_resume_text: 'ANA\nRESUMO\n- Conciliação bancária diária de 150 contas, com foco.', changes_summary: ['Resumo'], evidence: [{ line: 'Conciliação bancária diária de 150 contas, com foco.', quote: 'Conciliação bancária diária de 150 contas', verified: true, source: 'curriculo' }] })
      return { body: { ok: true } }
    })
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await page.getByRole('button', { name: 'Gerar currículo otimizado' }).click()
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}/otimizado$`))
    await expect(page.locator('.fidelity')).toContainText('1 de 1')
    expect(backend.callsTo('optimize-resume')[0].body).toEqual({ analysis_id: ID })
  })
})
