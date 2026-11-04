import { corsHeaders } from './cors.ts'

export function requestId(request: Request) {
  return request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID()
}

export function json(request: Request, body: unknown, status = 200, id?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json', 'X-Request-Id': id ?? requestId(request) },
  })
}

export function isJsonRequest(request: Request) {
  return (request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')
}

export function isMultipartRequest(request: Request) {
  return (request.headers.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data;')
}
