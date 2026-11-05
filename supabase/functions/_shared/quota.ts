// Cota diária por usuário, registrada em public.usage_events (RLS: select/insert do próprio usuário).
// O consumo é gravado ANTES da chamada à IA para que requisições paralelas não furem o limite.

export type UsageKind = 'analyze' | 'optimize' | 'cover_letter'

export function dailyLimit(kind: UsageKind, read: (name: string) => string | undefined): number {
  const defaults: Record<UsageKind, number> = { analyze: 5, optimize: 10, cover_letter: 10 }
  const configured = Number(read(`QUOTA_${kind.toUpperCase()}_PER_DAY`))
  return Number.isInteger(configured) && configured > 0 ? configured : defaults[kind]
}

export type QuotaResult = { ok: boolean; eventId: string | null }

export function isOverQuota(used: number, limit: number) {
  return used >= limit
}

// deno-lint-ignore no-explicit-any
export async function consumeQuota(client: any, userId: string, kind: UsageKind, limit: number): Promise<QuotaResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await client
    .from('usage_events').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('kind', kind).gte('created_at', since)
  if (error) throw error
  if (isOverQuota(count ?? 0, limit)) return { ok: false, eventId: null }
  const { data, error: insertError } = await client.from('usage_events').insert({ user_id: userId, kind }).select('id').single()
  if (insertError) throw insertError
  // O id permite devolver o consumo se a IA falhar por culpa do provedor (ver refund.ts).
  return { ok: true, eventId: data?.id ?? null }
}
