import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmpresaOption {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
}

export interface ObraOption {
  id: string;
  nome: string;
  codigo: string;
  empresa_id: string;
  status: string;
}

const OBRAS_INATIVAS = ["concluida", "encerrada", "cancelada"];

export function isObraAtiva(status: string) {
  return !OBRAS_INATIVAS.includes(status);
}

export function useEmpresasObras() {
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [empRes, obraRes] = await Promise.all([
        supabase.from("empresas").select("id, razao_social, nome_fantasia, cnpj").eq("ativo", true).order("razao_social"),
        supabase.from("obras").select("id, nome, codigo, empresa_id, status").order("codigo"),
      ]);
      if (empRes.data) setEmpresas(empRes.data);
      if (obraRes.data) setObras(obraRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const obrasAtivas = obras.filter(o => isObraAtiva(o.status));

  const getEmpresaLabel = (id: string) => {
    const emp = empresas.find(e => e.id === id);
    return emp ? `${emp.nome_fantasia || emp.razao_social} — ${emp.cnpj}` : "—";
  };

  const getEmpresaNome = (id: string) => {
    const emp = empresas.find(e => e.id === id);
    return emp ? (emp.nome_fantasia || emp.razao_social) : "—";
  };

  const getObraLabel = (id: string) => {
    const obra = obras.find(o => o.id === id);
    return obra ? `${obra.codigo} — ${obra.nome}` : "—";
  };

  const getObraStatus = (id: string) => {
    const obra = obras.find(o => o.id === id);
    return obra?.status || "";
  };

  const obrasPorEmpresa = (empresaId: string) =>
    empresaId ? obras.filter(o => o.empresa_id === empresaId) : obras;

  const obrasAtivasPorEmpresa = (empresaId: string) =>
    empresaId ? obrasAtivas.filter(o => o.empresa_id === empresaId) : obrasAtivas;

  return {
    empresas, obras, obrasAtivas, loading,
    getEmpresaLabel, getEmpresaNome, getObraLabel, getObraStatus,
    obrasPorEmpresa, obrasAtivasPorEmpresa,
  };
}
