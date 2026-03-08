import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CompraDB {
  id: string;
  numero: string;
  empresa_id: string;
  obra_id: string | null;
  fornecedor_id: string | null;
  nfe_numero: string | null;
  nfe_chave: string | null;
  data_emissao: string;
  data_entrega: string | null;
  data_recebimento: string | null;
  origem: string;
  status: string;
  forma_pagamento: string | null;
  parcelas: number | null;
  total: number;
  observacoes: string | null;
  xml_original: string | null;
  created_at: string;
  // joined
  fornecedores?: { razao_social: string; cnpj: string | null } | null;
  obras?: { nome: string } | null;
  empresas?: { razao_social: string } | null;
  itens_compra?: ItemCompraDB[];
}

export interface ItemCompraDB {
  id: string;
  compra_id: string;
  descricao: string;
  categoria: string | null;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  ncm: string | null;
  cfop: string | null;
}

export interface ObraOption {
  id: string;
  nome: string;
  codigo: string;
}

export interface EmpresaOption {
  id: string;
  razao_social: string;
  cnpj: string;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razao_social, cnpj")
        .eq("ativo", true)
        .order("razao_social");
      if (error) throw error;
      return data as EmpresaOption[];
    },
  });
}

export function useObras() {
  return useQuery({
    queryKey: ["obras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, codigo")
        .order("nome");
      if (error) throw error;
      return data as ObraOption[];
    },
  });
}

export function useCompras() {
  return useQuery({
    queryKey: ["compras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select(`
          *,
          fornecedores ( razao_social, cnpj ),
          obras ( nome ),
          empresas ( razao_social ),
          itens_compra ( * )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CompraDB[];
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

interface CreateCompraInput {
  empresa_id: string;
  obra_id?: string;
  fornecedor_nome: string;
  fornecedor_cnpj?: string;
  nfe_numero?: string;
  nfe_chave?: string;
  data_emissao: string;
  data_entrega?: string;
  origem: string;
  forma_pagamento?: string;
  parcelas?: number;
  observacoes?: string;
  xml_original?: string;
  itens: {
    descricao: string;
    categoria?: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
  }[];
}

export function useCreateCompra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompraInput) => {
      // 1. Upsert fornecedor
      let fornecedor_id: string | null = null;
      if (input.fornecedor_nome) {
        // Try to find existing by name
        const { data: existing } = await supabase
          .from("fornecedores")
          .select("id")
          .eq("razao_social", input.fornecedor_nome)
          .maybeSingle();

        if (existing) {
          fornecedor_id = existing.id;
        } else {
          const { data: newF, error: fErr } = await supabase
            .from("fornecedores")
            .insert({ razao_social: input.fornecedor_nome, cnpj: input.fornecedor_cnpj || null })
            .select("id")
            .single();
          if (fErr) throw fErr;
          fornecedor_id = newF.id;
        }
      }

      // 2. Generate numero
      const numero = `CP-${Date.now().toString(36).toUpperCase()}`;
      const total = input.itens.reduce((s, i) => s + i.subtotal, 0);

      // 3. Insert compra
      const { data: compra, error: cErr } = await supabase
        .from("compras")
        .insert({
          numero,
          empresa_id: input.empresa_id,
          obra_id: input.obra_id || null,
          fornecedor_id,
          nfe_numero: input.nfe_numero || null,
          nfe_chave: input.nfe_chave || null,
          data_emissao: input.data_emissao,
          data_entrega: input.data_entrega || null,
          origem: input.origem || "manual",
          forma_pagamento: input.forma_pagamento || null,
          parcelas: input.parcelas || 1,
          total,
          observacoes: input.observacoes || null,
          xml_original: input.xml_original || null,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      // 4. Insert itens
      if (input.itens.length > 0) {
        const { error: iErr } = await supabase
          .from("itens_compra")
          .insert(
            input.itens.map((item) => ({
              compra_id: compra.id,
              descricao: item.descricao,
              categoria: item.categoria || null,
              unidade: item.unidade,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              subtotal: item.subtotal,
            }))
          );
        if (iErr) throw iErr;
      }

      return compra;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      toast.success("Compra registrada com sucesso!");
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar compra: " + err.message);
    },
  });
}

export function useUpdateCompraStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "recebida") {
        updateData.data_recebimento = new Date().toISOString().split("T")[0];
      }
      const { error } = await supabase.from("compras").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      if (status === "recebida") toast.success("Compra recebida — itens disponíveis no Estoque e lançamento gerado no Financeiro.");
      if (status === "aprovada") toast.success("Compra aprovada — aguardando recebimento.");
      if (status === "cancelada") toast.info("Compra cancelada.");
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar status: " + err.message);
    },
  });
}
