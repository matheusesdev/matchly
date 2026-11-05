import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// Os testes de ponta a ponta não dependem de .env nem de Supabase real: o app sobe com um projeto fictício
// e todo o tráfego para ele é interceptado por e2e/support.ts.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', acceptDownloads: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Serve o build de produção (determinístico e fiel ao que vai ao ar). O servidor de desenvolvimento recarrega a página
    // ao descobrir dependências em uma máquina limpa, o que derruba testes no meio da execução.
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    timeout: 120_000,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: { VITE_SUPABASE_URL: 'https://e2eproject.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-publishable-key' },
  },
})
