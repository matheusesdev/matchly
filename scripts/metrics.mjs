// Executa cada consulta de supabase/metrics.sql separadamente (a CLI só devolve o resultado da última de um arquivo)
// e imprime tabelas. Só leitura. Requer a CLI do Supabase logada e o projeto vinculado (`supabase link`).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sql = fs.readFileSync(new URL('../supabase/metrics.sql', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const blocks = sql.split(/\n(?=-- \d+\) )/).filter((block) => /^-- \d+\) /.test(block))
if (!blocks.length) { console.error('Nenhuma consulta encontrada em supabase/metrics.sql'); process.exit(1) }

let failed = false
for (const block of blocks) {
  const title = block.split('\n')[0].replace(/^-- /, '')
  const file = path.join(os.tmpdir(), `matchly-metric-${process.pid}.sql`)
  fs.writeFileSync(file, block)
  const result = spawnSync(`npx --yes supabase db query --linked --read-only -f "${file}"`, { shell: true, encoding: 'utf8' })
  fs.rmSync(file, { force: true })
  console.log(`\n${title}`)
  const out = result.stdout ?? ''
  const start = out.indexOf('{'), end = out.lastIndexOf('}')
  try {
    const rows = JSON.parse(out.slice(start, end + 1)).rows ?? []
    if (rows.length) console.table(rows); else console.log('  (sem dados no período)')
  } catch {
    failed = true
    console.error('  Não foi possível ler o resultado. Saída da CLI:\n', (out + (result.stderr ?? '')).slice(0, 600))
  }
}
process.exit(failed ? 1 : 0)
