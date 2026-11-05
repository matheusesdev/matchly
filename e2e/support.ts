import type { Page, Route } from '@playwright/test'

export const SUPABASE_URL = 'https://e2eproject.supabase.co'
export const STORAGE_KEY = 'sb-e2eproject-auth-token'
export const TEST_USER = { id: 'u1', email: 'maria@email.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }

export const ID = '11111111-1111-4111-8111-111111111111'
export const ID_2 = '22222222-2222-4222-8222-222222222222'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export const OPTIMIZED_TEXT = 'ANA SOUZA\nana@email.com\n\nEXPERIÊNCIA PROFISSIONAL\n- Acompanhamento semanal da taxa de conversão do checkout.\n- Conciliação bancária diária de 150 contas, com foco em precisão.\n- Liderança de equipe de dez pessoas na área fiscal.'

export function analysisRow(overrides: Row = {}): Row {
  return {
    id: ID, match_score: 72, job_text: 'Analista Financeiro\nBuscamos pessoa com experiência em conciliação.',
    optimized_resume_text: null, changes_summary: [], evidence: [], user_facts: [], cover_letter: null, cover_letter_evidence: [],
    missing_keywords: ['Métricas'], strengths: ['Excel avançado', 'Conciliação bancária'],
    gaps: [{ area: 'Métricas de produto', descricao: 'A vaga pede decisões orientadas a dados.' }, { area: 'Inglês avançado', descricao: 'Requisito explícito não encontrado.' }],
    created_at: '2026-11-01T10:00:00Z', resume_id: 'r1',
    resumes: { original_filename: 'cv-ana.pdf', raw_text: 'Ana Souza\nConciliação bancária diária de 150 contas\nElaborei relatórios mensais' },
    ...overrides,
  }
}

export function optimizedRow(overrides: Row = {}): Row {
  return analysisRow({
    optimized_resume_text: OPTIMIZED_TEXT, changes_summary: ['Resumo direcionado à vaga'],
    evidence: [
      { line: 'Acompanhamento semanal da taxa de conversão do checkout.', quote: 'taxa de conversão semanal do checkout no Mixpanel', verified: true, source: 'candidato' },
      { line: 'Conciliação bancária diária de 150 contas, com foco em precisão.', quote: 'Conciliação bancária diária de 150 contas', verified: true, source: 'curriculo' },
      { line: 'Liderança de equipe de dez pessoas na área fiscal.', quote: '', verified: false },
    ],
    ...overrides,
  })
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) })
const empty = (route: Route, status = 204) => route.fulfill({ status, headers: CORS, body: '' })

type FunctionHandler = (body: unknown) => { status?: number; body: unknown }

/** Substitui o Supabase por um backend em memória: autenticação, tabelas (REST) e Edge Functions. */
export class FakeBackend {
  analyses = new Map<string, Row>()
  resumes: Row[] = [{ id: 'r1', original_filename: 'cv-ana.pdf', raw_text: 'Ana Souza ...' }]
  usage: Row[] = [{ id: 'e1', kind: 'analyze' }]
  patches: Row[] = []
  deletedIds: string[] = []
  calls: { fn: string; body: unknown }[] = []
  functions: Record<string, FunctionHandler> = {}

  constructor(private page: Page) {}

  seed(...rows: Row[]) { for (const row of rows) this.analyses.set(row.id, row); return this }
  on(fn: string, handler: FunctionHandler) { this.functions[fn] = handler; return this }
  callsTo(fn: string) { return this.calls.filter((call) => call.fn === fn) }

  async install() {
    const { page } = this
    await page.route('**/auth/v1/user', (route) => json(route, TEST_USER))
    await page.route('**/auth/v1/logout*', (route) => empty(route))

    await page.route('**/rest/v1/analyses*', async (route) => {
      const request = route.request()
      if (request.method() === 'OPTIONS') return empty(route)
      const url = new URL(request.url())
      const id = url.searchParams.get('id')?.replace('eq.', '')
      switch (request.method()) {
        case 'PATCH': {
          const patch = JSON.parse(request.postData() ?? '{}')
          this.patches.push(patch)
          if (id && this.analyses.has(id)) this.analyses.set(id, { ...this.analyses.get(id)!, ...patch })
          return empty(route)
        }
        case 'DELETE':
          if (id) { this.analyses.delete(id); this.deletedIds.push(id) }
          return empty(route)
        case 'HEAD':
          return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': `*/${this.analyses.size}` }, body: '' })
        default: {
          if (id) return json(route, this.analyses.has(id) ? [this.analyses.get(id)] : [])
          const rows = [...this.analyses.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          return json(route, rows)
        }
      }
    })
    await page.route('**/rest/v1/resumes*', (route) => {
      const method = route.request().method()
      if (method === 'OPTIONS' || method === 'DELETE') return empty(route)
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...CORS, 'content-range': `*/${this.resumes.length}` }, body: '' })
      return json(route, this.resumes)
    })
    await page.route('**/rest/v1/usage_events*', (route) => (route.request().method() === 'OPTIONS' ? empty(route) : json(route, this.usage)))

    await page.route('**/functions/v1/*', async (route) => {
      const request = route.request()
      if (request.method() === 'OPTIONS') return empty(route)
      const fn = new URL(request.url()).pathname.split('/').pop() ?? ''
      const raw = request.postData() ?? ''
      let body: unknown = raw
      try { body = JSON.parse(raw) } catch { /* corpo multipart ou vazio */ }
      this.calls.push({ fn, body })
      const handler = this.functions[fn]
      if (!handler) return json(route, { error: `função ${fn} sem simulação` }, 500)
      const result = handler(body)
      return json(route, result.body, result.status ?? 200)
    })
  }

  /** Deixa uma sessão válida no navegador (sem passar pelo diálogo de login). */
  async login() {
    const session = { access_token: 'x.y.z', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: TEST_USER }
    await this.page.goto('/')
    await this.page.evaluate(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(session)])
  }
}

export async function setup(page: Page, ...rows: Row[]) {
  const backend = new FakeBackend(page).seed(...rows)
  await backend.install()
  return backend
}

export async function hasHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}
