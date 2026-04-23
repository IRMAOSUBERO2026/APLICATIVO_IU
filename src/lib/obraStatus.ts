/**
 * Status de obras considerados "ativos" (operacionais) em todo o sistema.
 * Mantém compatibilidade entre o pipeline novo (`em_execucao`, `contrato_fechado`, ...)
 * e o status legado (`em_andamento`).
 *
 * Use sempre estas constantes/funções para evitar inconsistências entre módulos.
 */
export const OBRA_STATUS_ATIVOS = [
  "em_execucao",
  "em_andamento",
  "contrato_fechado",
  "negociacao",
  "prospeccao",
  "orcamento",
] as const;

export const OBRA_STATUS_INATIVOS = ["finalizada", "concluida", "paralisada", "cancelada"] as const;

export function isObraAtiva(status?: string | null): boolean {
  if (!status) return false;
  return (OBRA_STATUS_ATIVOS as readonly string[]).includes(status);
}

/** Use em queries Supabase: `.in("status", OBRA_STATUS_ATIVOS_ARR)` */
export const OBRA_STATUS_ATIVOS_ARR: string[] = [...OBRA_STATUS_ATIVOS];
