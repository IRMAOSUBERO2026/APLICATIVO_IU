import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EmpresaOption, ObraOption } from "@/hooks/useEmpresasObras";
import { isObraAtiva } from "@/lib/obraStatus";

const LS_EMPRESA = "ctx.empresa_id";
const LS_OBRA = "ctx.obra_id";

interface Ctx {
  empresas: EmpresaOption[];
  obras: ObraOption[];
  empresaId: string | null;
  obraId: string | null;
  setEmpresaId: (id: string | null) => void;
  setObraId: (id: string | null) => void;
  obrasFiltradas: ObraOption[];
  empresaAtual: EmpresaOption | null;
  obraAtual: ObraOption | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const EmpresaObraContext = createContext<Ctx | null>(null);

export function EmpresaObraProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [empresaId, setEmpresaIdState] = useState<string | null>(() => localStorage.getItem(LS_EMPRESA));
  const [obraId, setObraIdState] = useState<string | null>(() => localStorage.getItem(LS_OBRA));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [empRes, obraRes] = await Promise.all([
      supabase.from("empresas").select("id, razao_social, nome_fantasia, cnpj").eq("ativo", true).order("razao_social"),
      supabase.from("obras").select("id, nome, codigo, empresa_id, status").order("codigo"),
    ]);
    if (empRes.data) setEmpresas(empRes.data);
    if (obraRes.data) setObras(obraRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setEmpresaId = (id: string | null) => {
    setEmpresaIdState(id);
    if (id) localStorage.setItem(LS_EMPRESA, id); else localStorage.removeItem(LS_EMPRESA);
    // Resetar obra se não pertence mais à empresa
    if (obraId) {
      const obra = obras.find(o => o.id === obraId);
      if (obra && id && obra.empresa_id !== id) {
        setObraIdState(null);
        localStorage.removeItem(LS_OBRA);
      }
    }
  };

  const setObraId = (id: string | null) => {
    setObraIdState(id);
    if (id) localStorage.setItem(LS_OBRA, id); else localStorage.removeItem(LS_OBRA);
    // Auto-set empresa se obra foi escolhida sem empresa
    if (id) {
      const obra = obras.find(o => o.id === id);
      if (obra && obra.empresa_id !== empresaId) {
        setEmpresaIdState(obra.empresa_id);
        localStorage.setItem(LS_EMPRESA, obra.empresa_id);
      }
    }
  };

  const obrasFiltradas = useMemo(
    () => (empresaId ? obras.filter(o => o.empresa_id === empresaId && isObraAtiva(o.status)) : obras.filter(o => isObraAtiva(o.status))),
    [obras, empresaId]
  );

  const empresaAtual = useMemo(() => empresas.find(e => e.id === empresaId) || null, [empresas, empresaId]);
  const obraAtual = useMemo(() => obras.find(o => o.id === obraId) || null, [obras, obraId]);

  return (
    <EmpresaObraContext.Provider value={{
      empresas, obras, empresaId, obraId, setEmpresaId, setObraId,
      obrasFiltradas, empresaAtual, obraAtual, loading, reload: load,
    }}>
      {children}
    </EmpresaObraContext.Provider>
  );
}

export function useEmpresaObra() {
  const ctx = useContext(EmpresaObraContext);
  if (!ctx) throw new Error("useEmpresaObra deve ser usado dentro de EmpresaObraProvider");
  return ctx;
}
