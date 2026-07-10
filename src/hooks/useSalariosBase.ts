import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SALARIOS_BASE_PADRAO } from "@/lib/salariosBasePadrao";

export interface SalarioBaseCargo {
  id: string;
  cargo: string;
  salario_base: number;
}

/**
 * Carrega o mapa de salários-base por cargo a partir do banco.
 * Enquanto carrega (ou em caso de falha) usa os valores padrão do código
 * como fallback, garantindo que o cadastro nunca fique sem sugestão.
 */
export function useSalariosBase() {
  const [lista, setLista] = useState<SalarioBaseCargo[]>([]);
  const [mapa, setMapa] = useState<Record<string, number>>(SALARIOS_BASE_PADRAO);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("salarios_base_cargo")
      .select("id, cargo, salario_base")
      .order("cargo");
    if (!error && data) {
      setLista(data as SalarioBaseCargo[]);
      const m: Record<string, number> = {};
      for (const r of data as SalarioBaseCargo[]) m[r.cargo.trim()] = Number(r.salario_base);
      setMapa({ ...SALARIOS_BASE_PADRAO, ...m });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salarioPorCargo = useCallback(
    (cargo: string): number | null => {
      if (!cargo) return null;
      const v = mapa[cargo.trim()];
      return typeof v === "number" ? v : null;
    },
    [mapa],
  );

  return { lista, mapa, loading, carregar, salarioPorCargo };
}
