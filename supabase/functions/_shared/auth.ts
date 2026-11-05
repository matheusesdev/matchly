import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

type AccessResult =
  // Sem schema tipado do banco: SupabaseClient com os genéricos padrão (any) em vez de ReturnType<typeof createClient>.
  | { allowed: true; client: SupabaseClient; userId: string }
  | { allowed: false; status: number; error: string }

export async function authorizeMvpUser(request: Request): Promise<AccessResult> {
  const authorization = request.headers.get('Authorization') ?? ''
  const accessToken = authorization.replace(/^Bearer\s+/i, '')
  if (!accessToken) {
    return { allowed: false, status: 401, error: 'Sessão ausente. Entre novamente para continuar.' }
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: { user }, error } = await client.auth.getUser(accessToken)
  if (error || !user) {
    return { allowed: false, status: 401, error: 'Não autenticado.' }
  }

  const allowedEmails = new Set(
    (Deno.env.get('MVP_ALLOWED_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  if (allowedEmails.size === 0) {
    console.error('MVP_ALLOWED_EMAILS não configurado')
    return { allowed: false, status: 503, error: 'Acesso ao MVP ainda não configurado.' }
  }
  if (!user.email || !allowedEmails.has(user.email.toLowerCase())) {
    return { allowed: false, status: 403, error: 'Este MVP está disponível somente para usuários convidados.' }
  }

  return { allowed: true, client, userId: user.id }
}
