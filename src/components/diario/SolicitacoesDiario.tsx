import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, HardHat, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Produto { id: string; descricao: string; categoria: string | null; }
interface Equipamento { id: string; descricao: string; codigo: string; }

export interface SolicitacaoItem {
  id: string;
  tipo: "epi" | "equipamento";
  produto_id: string | null;
  equipamento_proprio_id: string | null;
  descricao_livre: string;
  quantidade: number;
  justificativa: string;
}

interface Props {
  itens: SolicitacaoItem[];
  onChange: (itens: SolicitacaoItem[]) => void;
  disabled?: boolean;
}

export function SolicitacoesDiario({ itens, onChange, disabled }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("produtos").select("id, descricao, categoria").eq("ativo", true).order("descricao"),
      supabase.from("equipamentos_proprios").select("id, descricao, codigo").order("descricao"),
    ]).then(([p, e]) => {
      if (p.data) setProdutos(p.data);
      if (e.data) setEquipamentos(e.data);
    });
  }, []);

  const epis = produtos.filter(p => (p.categoria || "").toLowerCase().includes("epi"));
  const naoEpis = produtos.filter(p => !(p.categoria || "").toLowerCase().includes("epi"));

  const addItem = (tipo: "epi" | "equipamento") => {
    onChange([
      ...itens,
      {
        id: crypto.randomUUID(),
        tipo,
        produto_id: null,
        equipamento_proprio_id: null,
        descricao_livre: "",
        quantidade: 1,
        justificativa: "",
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<SolicitacaoItem>) => {
    onChange(itens.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => onChange(itens.filter(i => i.id !== id));

  const renderItem = (item: SolicitacaoItem) => (
    <div key={item.id} className="rounded-lg border bg-background p-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <label className="text-[10px] font-medium text-muted-foreground">
            {item.tipo === "epi" ? "EPI cadastrado" : "Equipamento próprio"} (opcional)
          </label>
          <select
            value={item.tipo === "epi" ? (item.produto_id || "") : (item.equipamento_proprio_id || "")}
            onChange={e => {
              const v = e.target.value || null;
              if (item.tipo === "epi") updateItem(item.id, { produto_id: v, descricao_livre: v ? "" : item.descricao_livre });
              else updateItem(item.id, { equipamento_proprio_id: v, descricao_livre: v ? "" : item.descricao_livre });
            }}
            disabled={disabled}
            className="w-full rounded-lg border bg-background px-2 py-2 text-sm"
          >
            <option value="">— ou descreva abaixo —</option>
            {item.tipo === "epi"
              ? (epis.length ? epis : naoEpis).map(p => <option key={p.id} value={p.id}>{p.descricao}</option>)
              : equipamentos.map(e => <option key={e.id} value={e.id}>{e.codigo} - {e.descricao}</option>)}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="text-[10px] font-medium text-muted-foreground">Descrição livre</label>
          <Input
            value={item.descricao_livre}
            onChange={e => updateItem(item.id, { descricao_livre: e.target.value })}
            placeholder={item.tipo === "epi" ? "Ex: Botina N42" : "Ex: Andaime 2m"}
            disabled={disabled || (item.tipo === "epi" ? !!item.produto_id : !!item.equipamento_proprio_id)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-medium text-muted-foreground">Qtd</label>
          <Input
            type="number"
            min={1}
            value={item.quantidade}
            onChange={e => updateItem(item.id, { quantidade: Number(e.target.value) || 1 })}
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground">Justificativa *</label>
        <Textarea
          value={item.justificativa}
          onChange={e => updateItem(item.id, { justificativa: e.target.value })}
          placeholder="Descreva o motivo da solicitação"
          rows={2}
          disabled={disabled}
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)} disabled={disabled}
          className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
        </Button>
      </div>
    </div>
  );

  const epiItens = itens.filter(i => i.tipo === "epi");
  const equipItens = itens.filter(i => i.tipo === "equipamento");

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <HardHat className="h-4 w-4 text-primary" /> Solicitações
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <HardHat className="h-3.5 w-3.5" /> EPI ({epiItens.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => addItem("epi")} disabled={disabled}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Solicitar EPI
          </Button>
        </div>
        {epiItens.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma solicitação de EPI.</p>
        ) : (
          <div className="space-y-2">{epiItens.map(renderItem)}</div>
        )}
      </div>

      <div className="space-y-3 pt-3 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Equipamentos (próprios e alugados) ({equipItens.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => addItem("equipamento")} disabled={disabled}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Solicitar Equipamento
          </Button>
        </div>
        {equipItens.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma solicitação de equipamento.</p>
        ) : (
          <div className="space-y-2">{equipItens.map(renderItem)}</div>
        )}
      </div>
    </div>
  );
}
