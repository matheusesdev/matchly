import { expect, test } from '@playwright/test'
import { ID, hasHorizontalScroll, optimizedRow, analysisRow, setup } from './support'

test.describe('currículo otimizado e origem das frases', () => {
  test('mostra o resumo de fidelidade, a origem de cada frase e quem informou', async ({ page }) => {
    const backend = await setup(page, optimizedRow())
    await backend.login()
    await page.goto(`/analises/${ID}/otimizado`)
    await expect(page.locator('.fidelity')).toContainText('2 de 3')
    await expect(page.locator('.fidelity')).toContainText('1 veio das suas respostas')
    await expect(page.locator('.ev-line.ok')).toHaveCount(2)
    await expect(page.locator('.ev-line.warn')).toHaveCount(1)

    await page.locator('.ev-line.ok button').first().click()
    await expect(page.locator('.ev-source').first()).toContainText('Informado por você')
    await page.locator('.ev-line.ok button').nth(1).click()
    await expect(page.locator('.ev-line.ok').nth(1).locator('.ev-source')).toContainText('Origem no seu currículo')
    await page.locator('.ev-line.warn button').click()
    await expect(page.locator('.ev-line.warn .ev-source')).toContainText('Conferir antes de enviar')
    await expect(page.locator('.ev-line.warn button')).toHaveAttribute('aria-expanded', 'true')
  })

  test('a aba Original mostra o texto enviado', async ({ page }) => {
    const backend = await setup(page, optimizedRow())
    await backend.login()
    await page.goto(`/analises/${ID}/otimizado`)
    await page.getByRole('tab', { name: 'Original' }).click()
    await expect(page.getByLabel('Currículo original')).toContainText('Elaborei relatórios mensais')
  })

  test('baixa o currículo em PDF e em DOCX', async ({ page }) => {
    const backend = await setup(page, optimizedRow())
    await backend.login()
    await page.goto(`/analises/${ID}/otimizado`)
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar PDF' }).click()])
    expect(pdf.suggestedFilename()).toBe('curriculo-otimizado.pdf')
    const [docx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar DOCX' }).click()])
    expect(docx.suggestedFilename()).toBe('curriculo-otimizado.docx')
  })

  test('versões antigas, sem verificação de origem, avisam o usuário', async ({ page }) => {
    const backend = await setup(page, optimizedRow({ evidence: [] }))
    await backend.login()
    await page.goto(`/analises/${ID}/otimizado`)
    await expect(page.locator('.fidelity')).toContainText('antes da verificação de origem')
    await expect(page.locator('.ev-line')).toHaveCount(0)
  })

  test('cabe na tela de 360 px sem rolagem horizontal', async ({ page }) => {
    const backend = await setup(page, optimizedRow())
    await backend.login()
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto(`/analises/${ID}/otimizado`)
    await expect(page.locator('.evidence-paper')).toBeVisible()
    expect(await hasHorizontalScroll(page)).toBe(false)
  })
})

test.describe('perguntas para fechar gaps', () => {
  test('valida, salva, persiste, edita e remove a resposta', async ({ page }) => {
    const backend = await setup(page, optimizedRow({ evidence: [], user_facts: [] }))
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await expect(page.locator('.gap-question')).toHaveCount(2)
    await expect(page.getByRole('button', { name: /Gerar novamente/ })).toBeHidden()

    await page.getByRole('button', { name: 'Tenho essa experiência' }).first().click()
    await page.locator('.gap-question textarea').fill('curto')
    await page.getByRole('button', { name: 'Salvar resposta' }).click()
    await expect(page.locator('.gap-question [role=alert]')).toContainText('pelo menos 15 caracteres')

    await page.locator('.gap-question textarea').fill('Acompanhei a taxa de conversão semanal do checkout no Mixpanel')
    await page.getByRole('button', { name: 'Salvar resposta' }).click()
    await expect(page.locator('.gap-question.answered')).toContainText('Você informou')
    expect(backend.patches.at(-1)).toEqual({ user_facts: [{ area: 'Métricas de produto', answer: 'Acompanhei a taxa de conversão semanal do checkout no Mixpanel' }] })
    await expect(page.getByRole('button', { name: /Gerar novamente com minhas respostas/ })).toBeVisible()

    await page.reload()
    await expect(page.locator('.gap-question.answered')).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.locator('.gap-question.answered')).toHaveCount(0)
    expect(backend.patches.at(-1)).toEqual({ user_facts: [] })
    await expect(page.getByRole('button', { name: /Gerar novamente/ })).toBeHidden()
  })

  test('"Gerar novamente" pede nova otimização ao servidor', async ({ page }) => {
    const backend = await setup(page, optimizedRow({ user_facts: [{ area: 'Inglês avançado', answer: 'Trabalhei dois anos com clientes dos EUA' }] }))
    backend.on('optimize-resume', () => ({ body: { ok: true } }))
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await page.getByRole('button', { name: /Gerar novamente com minhas respostas/ }).click()
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}/otimizado$`))
    expect(backend.callsTo('optimize-resume')).toHaveLength(1)
  })

  test('o botão principal só reabre a versão existente, sem gastar cota', async ({ page }) => {
    const backend = await setup(page, optimizedRow())
    await backend.login()
    await page.goto(`/analises/${ID}`)
    await page.getByRole('button', { name: 'Ver currículo otimizado' }).click()
    await expect(page).toHaveURL(new RegExp(`/analises/${ID}/otimizado$`))
    expect(backend.callsTo('optimize-resume')).toHaveLength(0)
    void analysisRow
  })
})

test.describe('botões legíveis no celular', () => {
  test('download do currículo e da carta mostram texto (regressão: font-size 0 herdado do design original)', async ({ page }) => {
    const backend = await setup(page, optimizedRow({ cover_letter: 'Prezados,\n\nTexto da carta com conteúdo suficiente para exibir os botões.\n\nAtenciosamente,\nAna', cover_letter_evidence: [] }))
    await backend.login()
    await page.setViewportSize({ width: 360, height: 800 })
    for (const [path, labels] of [[`/analises/${ID}/otimizado`, ['Baixar PDF', 'Baixar DOCX']], [`/analises/${ID}/carta`, ['Copiar', 'PDF', 'DOCX']]] as const) {
      await page.goto(path)
      for (const label of labels) {
        const button = page.locator('.paper-head').getByRole('button', { name: label, exact: true })
        await expect(button).toBeVisible()
        const fontSize = await button.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
        expect(fontSize, `${label} em ${path}`).toBeGreaterThanOrEqual(11)
      }
    }
  })
})
