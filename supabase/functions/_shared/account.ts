// Módulo puro: confirmação para exclusão de conta.

/** A exclusão só prossegue se o usuário digitou o próprio e-mail (ignora caixa e espaços nas pontas). */
export function matchesEmail(typed: unknown, actual: string | undefined | null): boolean {
  if (typeof typed !== 'string' || !actual) return false
  return typed.trim().toLowerCase() === actual.trim().toLowerCase()
}
