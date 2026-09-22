/**
 * Salários-base padrão por função (piso conforme convenção coletiva da
 * construção civil). Valores mensais de referência — servem como sugestão
 * automática ao selecionar o cargo no cadastro; sempre editáveis pelo usuário.
 *
 * Atualize estes valores sempre que a convenção coletiva for reajustada.
 */
export const SALARIOS_BASE_PADRAO: Record<string, number> = {
  // Carpintaria
  "Carpinteiro I": 2683.80,
  "Carpinteiro II": 2683.80,
  "Carpinteiro III": 2683.80,
  "1/2 Oficial de Carpinteiro": 2029.65,
  "Encarregado de Carpintaria I": 3332.70,
  "Encarregado de Carpintaria II": 3332.70,
  "Encarregado de Carpintaria III": 3332.70,
  // Armação
  "Armador I": 2683.80,
  "Armador II": 2683.80,
  "Armador III": 2683.80,
  "1/2 Oficial de Armador": 2029.65,
  "Encarregado de Armação I": 3332.70,
  "Encarregado de Armação II": 3332.70,
  "Encarregado de Armação III": 3332.70,
  // Operacional
  Servente: 1946.70,
  Pedreiro: 2683.80,
  "Operador de Grua": 2683.80,
  "Operador de Cremalheira": 2600,
  Almoxarife: 2300,
  // Administrativo / Gestão
  "Auxiliar Administrativo": 2000,
  "Encarregado de Obras I": 3332.70,
  "Encarregado de Obras II": 3332.70,
  "Encarregado de Obras III": 3332.70,
  "Mestre de Obras": 3332.70,
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
