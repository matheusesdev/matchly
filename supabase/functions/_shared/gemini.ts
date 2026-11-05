import { SYSTEM_INSTRUCTION } from './prompts.ts'
import { GEMINI_ATTEMPTS_PER_MODEL, retryDelayMs } from './retry.ts'

const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'
const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.5-flash-lite'
const timeoutMs = Number(Deno.env.get('GEMINI_TIMEOUT_MS') ?? 30_000)
const retryableStatuses = new Set([429, 500, 502, 503, 504])

export async function callGemini(prompt: string, schema: unknown, options: { temperature?: number } = {}) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('Gemini indisponível')
  let lastError = 'Gemini indisponível'
  for (const candidate of [...new Set([model, fallbackModel])]) {
    for (let attempt = 0; attempt < GEMINI_ATTEMPTS_PER_MODEL; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: options.temperature ?? 0.2, maxOutputTokens: 8192 },
          }),
          signal: controller.signal,
        })
        if (response.ok) {
          const payload = await response.json()
          const candidateOutput = payload?.candidates?.[0]
          const finish = String(candidateOutput?.finishReason ?? payload?.promptFeedback?.blockReason ?? 'UNKNOWN').replace(/[^A-Z_]/g, '').slice(0, 24)
          const text = candidateOutput?.content?.parts?.[0]?.text
          if (!text) throw new Error(`Gemini sem texto (${finish})`)
          try { return JSON.parse(text) } catch { throw new Error(`Gemini JSON inválido (${finish})`) }
        }
        lastError = `Gemini status ${response.status}`
        if (!retryableStatuses.has(response.status)) break
      } catch (error) {
        // Mensagens "Gemini ..." são nossas (sem dados do usuário) e ajudam a diagnosticar a causa.
        lastError = error instanceof DOMException && error.name === 'AbortError' ? 'Gemini timeout'
          : error instanceof Error && error.message.startsWith('Gemini ') ? error.message
          : 'Gemini indisponível'
      } finally { clearTimeout(timer) }
      const wait = retryDelayMs(attempt)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  throw new Error(lastError)
}
