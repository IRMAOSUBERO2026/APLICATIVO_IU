/**
 * Salários-base padrão por função (piso conforme convenção coletiva da
 * construção civil). Valores mensais de referência — servem como sugestão
 * automática ao selecionar o cargo no cadastro; sempre editáveis pelo usuário.
 *
 * Atualize estes valores sempre que a convenção coletiva for reajustada.
 */
export const SALARIOS_BASE_PADRAO: Record<string, number> = {
  // Carpintaria
  "Carpinteiro I": 2600,
  "Carpinteiro II": 2750,
  "Carpinteiro III": 2900,
  "1/2 Oficial de Carpinteiro": 2100,
  "Encarregado de Carpintaria I": 3400,
  "Encarregado de Carpintaria II": 3700,
  "Encarregado de Carpintaria III": 4000,
  // Armação
  "Armador I": 2600,
  "Armador II": 2750,
  "Armador III": 2900,
  "1/2 Oficial de Armador": 2100,
  "Encarregado de Armação I": 3400,
  "Encarregado de Armação II": 3700,
  "Encarregado de Armação III": 4000,
  // Operacional
  Servente: 1800,
  Pedreiro: 2500,
  "Operador de Grua": 3200,
  "Operador de Cremalheira": 2600,
  Almoxarife: 2300,
  // Administrativo / Gestão
  "Auxiliar Administrativo": 2000,
  "Encarregado de Obras I": 3600,
  "Encarregado de Obras II": 3900,
  "Encarregado de Obras III": 4200,
  "Mestre de Obras": 4800,
  "Engenheiro Civil": 8000,
  "Estagiário": 1400,
  Apontador: 2200,
  Vigia: 1900,
  Motorista: 2400,
};

/** Retorna o salário-base padrão para um cargo, ou null se não houver referência. */
export function salarioBasePorCargo(cargo: string): number | null {
  if (!cargo) return null;
  const val = SALARIOS_BASE_PADRAO[cargo.trim()];
  return typeof val === "number" ? val : null;
}
