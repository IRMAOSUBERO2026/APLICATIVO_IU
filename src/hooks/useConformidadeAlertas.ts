import { useEffect, useState } from "react";
import { useEmpresaObra } from "@/contexts/EmpresaObraContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertaConformidade,
  calcularAlertasConformidade,
  ContratoConformidade,
  FuncionarioConformidade,
} from "@/lib/conformidadeAlertas";

export function useConformidadeAlertas() {
  const { empresaId, obraId } = useEmpresaObra();
  const [alertas, setAlertas] = useState<AlertaConformidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setLoading(true);
      let funcionariosQuery = supabase
        .from("funcionarios")
        .select("id,nome,empresa_id,obra_id,data_admissao,data_aso,data_nr6,data_nr12,data_nr18,data_nr35")
        .in("status", ["ativo", "experiencia", "experiência"]);
      let contratosQuery = supabase
        .from("contratos_locacao")
        .select("id,descricao,data_fim,empresa_id,obra_id")
        .eq("status", "ativo");

      if (empresaId) {
        funcionariosQuery = funcionariosQuery.eq("empresa_id", empresaId);
        contratosQuery = contratosQuery.eq("empresa_id", empresaId);
      }
      if (obraId) {
        funcionariosQuery = funcionariosQuery.eq("obra_id", obraId);
        contratosQuery = contratosQuery.eq("obra_id", obraId);
      }

      const [funcionariosResult, contratosResult] = await Promise.all([funcionariosQuery, contratosQuery]);
      if (!ativo) return;
      const funcionarios = (funcionariosResult.data ?? []) as FuncionarioConformidade[];
      const contratos = (contratosResult.data ?? []) as ContratoConformidade[];
      setAlertas(calcularAlertasConformidade(funcionarios, contratos));
      setLoading(false);
    }
    carregar();
    return () => { ativo = false; };
  }, [empresaId, obraId]);

  return { alertas, loading };
}