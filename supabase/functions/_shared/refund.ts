import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Devolve um consumo de cota quando a falha não foi culpa do usuário (IA indisponível ou resposta inválida).
 * Usa a chave de serviço: o usuário não tem permissão de apagar o próprio consumo, então não consegue burlar a cota.
 * O id vem da nossa própria inserção, nunca da requisição. Melhor esforço: nunca lança.
 */
export async function refundUsage(eventId: string): Promise<void> {
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { error } = await admin.from('usage_events').delete().eq('id', eventId)
    if (error) console.error(JSON.stringify({ error: 'quota_refund_failed', code: error.code ?? 'unknown' }))
  } catch (_error) {
    console.error(JSON.stringify({ error: 'quota_refund_failed' }))
  }
}
