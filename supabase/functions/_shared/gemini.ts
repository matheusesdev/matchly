const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'
const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.5-flash-lite'
const retryableStatuses = new Set([429, 500, 502, 503, 504])

export async function callGemini(prompt: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  let lastError = 'Serviço temporariamente indisponível'
  for (const candidate of [...new Set([model, fallbackModel])]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
      })
      if (response.ok) {
        const payload = await response.json()
        const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Resposta vazia do Gemini')
        return JSON.parse(text)
      }

      const details = await response.text()
      lastError = `Gemini respondeu com status ${response.status}: ${details.slice(0, 500)}`
      if (!retryableStatuses.has(response.status)) throw new Error(lastError)
      if (attempt < 2) await delay(700 * 2 ** attempt + Math.floor(Math.random() * 300))
    }
  }
  throw new Error(`${lastError} Tente novamente em alguns instantes.`)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
