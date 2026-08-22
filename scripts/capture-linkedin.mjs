import { chromium } from 'playwright'

const browser = await chromium.launch()

async function revealPage(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 650) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(500)
}

async function captureDesktop() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'artifacts/linkedin/01-landing-hero.png' })
  await revealPage(page)
  await page.screenshot({ path: 'artifacts/linkedin/02-landing-completa.png', fullPage: true })
  await page.getByRole('button', { name: /analisar meu currículo/i }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'artifacts/linkedin/03-tela-de-analise.png', fullPage: true })
  await page.close()
}

async function captureMobile() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await revealPage(page)
  await page.screenshot({ path: 'artifacts/linkedin/04-landing-mobile.png', fullPage: true })
  await page.close()
}

await captureDesktop()
await captureMobile()
await browser.close()
