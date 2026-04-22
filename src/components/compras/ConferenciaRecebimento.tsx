import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Package, Check } from "lucide-react";
import { suggestProduto, ProdutoLike } from "@/lib/matchProduto";

interface Item {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  produto_id: string | null;
  estoque_processado: boolean;
}

interface Props {
  compraId: string;
  obraId: string | null;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

interface VinculoState { produto_id: string; criar_novo: boolean; nova_descricao: string; }

export function ConferenciaRecebimento({ compraId, obraId, open, onClose, onCompleted }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [produtos, setProdutos] = useState<ProdutoLike[]>([]);
  const [vinculos, setVinculos] = useState<Record<string, VinculoState>>({});
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.from("itens_compra").select("id, descricao, unidade, quantidade, valor_unitario, produto_id, estoque_processado").eq("compra_id", compraId),
      supabase.from("produtos").select("id, descricao, codigo, unidade").eq("ativo", true).order("descricao"),
    ]).then(([itRes, pRes]) => {
      const itList = (itRes.data || []) as Item[];
      const pList = (pRes.data || []) as ProdutoLike[];
      setItens(itList);
      setProdutos(pList);

      // Sugestões automáticas para itens ainda não vinculados
      const sugest: Record<string, VinculoState> = {};
      itList.forEach(it => {
        if (it.produto_id) {
          sugest[it.id] = { produto_id: it.produto_id, criar_novo: false, nova_descricao: "" };
        } else {
          const match = suggestProduto(it.descricao, pList);
          sugest[it.id] = match
            ? { produto_id: match.produto.id, criar_novo: false, nova_descricao: "" }
            : { produto_id: "", criar_novo: true, nova_descricao: it.descricao };
        }
      });
      setVinculos(sugest);
      setLoading(false);
    });
  }, [open, compraId]);

  const totalParaProcessar = useMemo(
    () => itens.filter(i => !i.estoque_processado).length,
    [itens]
  );

  const updateVinculo = (itemId: string, patch: Partial<VinculoState>) => {
    setVinculos(prev => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const handleConfirmar = async () => {
    setSalvando(true);

    try {
      for (const item of itens) {
        if (item.estoque_processado) continue;

        const v = vinculos[item.id];
        if (!v) continue;

        let produtoId = v.produto_id;

        // criar produto se necessário
        if (v.criar_novo || !produtoId) {
          const desc = v.nova_descricao.trim() || item.descricao;
          if (!desc) {
            toast({ title: "Item sem descrição", description: "Defina a descrição ou vincule a um produto.", variant: "destructive" });
            setSalvando(false);
            return;
          }
          const { data: novoProd, error: prodErr } = await supabase
            .from("produtos")
            .insert({ descricao: desc, unidade: item.unidade || "un", ativo: true })
            .select("id")
            .single();
          if (prodErr || !novoProd) throw prodErr || new Error("Erro ao criar produto");
          produtoId = novoProd.id;
        }

        // atualizar item_compra com vínculo
        const { error: upErr } = await supabase
          .from("itens_compra")
          .update({ produto_id: produtoId, estoque_processado: true })
          .eq("id", item.id);
        if (upErr) throw upErr;

        // gerar entrada no estoque
        const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
          produto_id: produtoId,
          tipo: "entrada",
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario || null,
          obra_id: obraId,
          compra_id: compraId,
          documento: `Compra ${compraId.slice(0, 8)}`,
          observacoes: `Entrada automática da compra`,
        });
        if (movErr) throw movErr;
      }

      // atualizar status da compra para recebida
      await supabase.from("compras").update({
        status: "recebida",
        data_recebimento: new Date().toISOString().split("T")[0],
      }).eq("id", compraId);

      toast({ title: "Recebimento confirmado", description: `${totalParaProcessar} item(ns) entraram no estoque.` });
      onCompleted();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao confirmar recebimento", description: e?.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !salvando && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Conferência de Recebimento
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Vincule cada item da NF a um produto do estoque. Itens sem vínculo serão criados como novo produto.
          </p>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando itens...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum item nesta compra.</p>
        ) : (
          <div className="space-y-3">
            {itens.map(item => {
              const v = vinculos[item.id] || { produto_id: "", criar_novo: true, nova_descricao: item.descricao };
              const sugerido = !item.estoque_processado && !item.produto_id && v.produto_id;
              return (
                <div key={item.id} className={`rounded-lg border p-3 ${item.estoque_processado ? "bg-success/5 border-success/30" : "bg-background"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        Qtd: {item.quantidade} {item.unidade} • Valor un: R$ {Number(item.valor_unitario).toFixed(2)}
                      </p>
                    </div>
                    {item.estoque_processado && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 flex-shrink-0">
                        <Check className="h-3 w-3 mr-1" /> Processado
                      </Badge>
                    )}
                    {sugerido && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 flex-shrink-0">
                        <Sparkles className="h-3 w-3 mr-1" /> Sugerido
                      </Badge>
                    )}
                  </div>
                  {!item.estoque_processado && (
                    <div className="grid gap-2 sm:grid-cols-12">
                      <div className="sm:col-span-7">
                        <label className="text-[10px] font-medium text-muted-foreground">Vincular ao produto do estoque</label>
                        <select
                          value={v.criar_novo ? "__new__" : v.produto_id}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "__new__") updateVinculo(item.id, { criar_novo: true, produto_id: "" });
                            else updateVinculo(item.id, { criar_novo: false, produto_id: val });
                          }}
                          className="w-full rounded-lg border bg-background px-2 py-2 text-sm"
                        >
                          <option value="__new__">+ Criar novo produto no estoque</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>{p.descricao}{p.codigo ? ` (${p.codigo})` : ""}</option>
                          ))}
                        </select>
                      </div>
                      {v.criar_novo && (
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-medium text-muted-foreground">Nome do novo produto</label>
                          <Input
                            value={v.nova_descricao}
                            onChange={e => updateVinculo(item.id, { nova_descricao: e.target.value })}
                            placeholder="Ex: Botina N43"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={salvando || totalParaProcessar === 0}>
            <Package className="h-4 w-4 mr-1" />
            {salvando ? "Processando..." : `Confirmar e dar entrada (${totalParaProcessar})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
