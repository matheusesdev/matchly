import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { matchesEmail } from '../_shared/account.ts'
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts'
import { isJsonRequest, json, requestId } from '../_shared/http.ts'

// Exclusão de conta (LGPD, art. 18, VI). Não usa a lista de convidados: quem perdeu o acesso ainda pode apagar os próprios dados.
// As tabelas resumes, analyses e usage_events referenciam auth.users com ON DELETE CASCADE, então tudo é removido junto.
Deno.serve(async (request) => {
  const id = requestId(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders(request), 'X-Request-Id': id } })
  if (request.method !== 'POST' || !isAllowedOrigin(request) || !isJsonRequest(request)) return json(request, { error: 'Requisição inválida.' }, 400, id)
  try {
    const authorization = request.headers.get('Authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')
    if (!token) return json(request, { error: 'Sessão ausente. Entre novamente para continuar.' }, 401, id)
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) return json(request, { error: 'Não autenticado.' }, 401, id)

    const body = await request.json().catch(() => ({}))
    if (!matchesEmail(body?.confirm_email, user.email)) return json(request, { error: 'Digite o e-mail da sua conta para confirmar a exclusão.' }, 400, id)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
    console.log(JSON.stringify({ request_id: id, event: 'account_deleted' }))
    return json(request, { deleted: true }, 200, id)
  } catch (error) { console.error(JSON.stringify({ request_id: id, error: error instanceof Error ? error.name : 'unknown' })); return json(request, { error: 'Não foi possível excluir a conta.' }, 500, id) }
})
