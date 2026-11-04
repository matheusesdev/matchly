const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins])

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  return !origin || allowedOrigins.has(origin)
}
