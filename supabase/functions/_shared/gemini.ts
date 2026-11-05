import { SYSTEM_INSTRUCTION } from './prompts.ts'

const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'
const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.5-flash-lite'
const timeoutMs = Number(Deno.env.get('GEMINI_TIMEOUT_MS') ?? 30_000)
const retryableStatuses = new Set([429, 500, 502, 503, 504])

export async function callGemini(prompt: string, schema: unknown, options: { temperature?: number } = {}) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('Gemini indisponível')
  let lastError = 'Gemini indisponível'
  for (const candidate of [...new Set([model, fallbackModel])]) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
          const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
          if (!text) throw new Error('Gemini indisponível')
          return JSON.parse(text)
        }
        lastError = `Gemini status ${response.status}`
        if (!retryableStatuses.has(response.status)) break
      } catch (error) {
        lastError = error instanceof DOMException && error.name === 'AbortError' ? 'Gemini timeout' : 'Gemini indisponível'
      } finally { clearTimeout(timer) }
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }
  throw new Error(lastError)
}
