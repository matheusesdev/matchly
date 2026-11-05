// Módulo puro: espera entre tentativas ao chamar a IA. Crescente, com um pouco de variação para não sincronizar clientes.

export const GEMINI_ATTEMPTS_PER_MODEL = 3

/** Espera (ms) depois da tentativa `attempt` (0, 1, ...). Não espera depois da última. */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
  if (attempt < 0 || attempt >= GEMINI_ATTEMPTS_PER_MODEL - 1) return 0
  const base = [700, 2000][attempt] ?? 2000
  return Math.round(base + random() * 300)
}
