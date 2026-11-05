// Identificação do controlador e estado da revisão jurídica. Preencha pelas variáveis VITE_LEGAL_* antes de abrir o produto ao público.
const env = import.meta.env

export const legal = {
  controllerName: (env.VITE_LEGAL_CONTROLLER_NAME as string | undefined)?.trim() || '',
  contactEmail: (env.VITE_LEGAL_CONTACT_EMAIL as string | undefined)?.trim() || '',
  reviewed: env.VITE_LEGAL_REVIEWED === 'true',
  updatedAt: 'novembro de 2026',
}
