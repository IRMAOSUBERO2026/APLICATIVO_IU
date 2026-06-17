import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  onImported: () => void;
}

interface Linha {
  produto_id: string;
  ca_numero: string;
  quantidade: number;
  data_entrega: string;
  motivo: string;
}

export function ImportarFichasAntigas({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from("funcionarios").select("id, nome, empresa_id, obra_id, status").order("nome"),
        supabase.from("produtos").select("id, descricao, ca_numero, categoria").order("descricao"),
      ]);
      setFuncionarios(f || []);
      setProdutos((p || []).filter(x => x.categoria?.toUpperCase() === "EPI" || x.descricao?.toUpperCase().includes("EPI")));
    })();
  }, [open]);

  const addLinha = () => setLinhas([...linhas, { produto_id: "", ca_numero: "", quantidade: 1, data_entrega: new Date().toISOString().slice(0, 10), motivo: "FICHA RETROATIVA" }]);
  const updLinha = (i: number, k: keyof Linha, v: any) => setLinhas(linhas.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const delLinha = (i: number) => setLinhas(linhas.filter((_, idx) => idx !== i));

  const onProdutoChange = (i: number, produtoId: string) => {
    const prod = produtos.find(p => p.id === produtoId);
    setLinhas(linhas.map((l, idx) => idx === i ? { ...l, produto_id: produtoId, ca_numero: prod?.ca_numero || l.ca_numero } : l));
  };

  const salvar = async () => {
    if (!funcionarioId) { toast({ title: "Selecione o funcionário", variant: "destructive" }); return; }
    const validas = linhas.filter(l => l.produto_id && l.quantidade > 0 && l.data_entrega);
    if (validas.length === 0) { toast({ title: "Adicione pelo menos um item válido", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const func = funcionarios.find(f => f.id === funcionarioId);
      const rows = validas.map(l => ({
        funcionario_id: funcionarioId,
        produto_id: l.produto_id,
        empresa_id: func?.empresa_id || "",
        obra_id: func?.obra_id || null,
        quantidade: Number(l.quantidade),
        ca_numero: l.ca_numero || null,
        motivo: l.motivo,
        observacoes: `Importação retroativa de ficha antiga - ${l.motivo}`,
        data_entrega: l.data_entrega,
      }));
      const { error } = await supabase.from("entregas_epi").insert(rows);
      if (error) throw error;
      toast({ title: `${validas.length} entrega(s) retroativa(s) importada(s)!`, description: "A ficha do funcionário foi atualizada." });
      setOpen(false);
      setFuncionarioId("");
      setLinhas([]);
      onImported();
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-12 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 gap-2">
        <Archive size={18} /> Importar Fichas Antigas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Archive className="text-amber-500" /> Importar Ficha Antiga de EPI</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 p-3 rounded-lg">
            Use este botão para registrar entregas antigas (de antes do sistema). Cada item será adicionado ao histórico do funcionário e à ficha digital.
          </p>

          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}{f.status && f.status !== "ativo" ? ` (${f.status})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Itens entregues</Label>
              <Button size="sm" variant="outline" onClick={addLinha} className="gap-1"><Plus size={14} /> Adicionar item</Button>
            </div>

            {linhas.length === 0 && <p className="text-xs text-center text-muted-foreground py-6 border border-dashed rounded-lg">Nenhum item. Clique em "Adicionar item".</p>}

            {linhas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-slate-50">
                <div className="col-span-4 space-y-1">
                  <Label className="text-[10px]">EPI</Label>
                  <Select value={l.produto_id} onValueChange={v => onProdutoChange(i, v)}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1"><Label className="text-[10px]">CA</Label><Input value={l.ca_numero} onChange={e => updLinha(i, "ca_numero", e.target.value)} className="h-9 bg-white" /></div>
                <div className="col-span-1 space-y-1"><Label className="text-[10px]">Qtd</Label><Input type="number" value={l.quantidade} onChange={e => updLinha(i, "quantidade", Number(e.target.value))} className="h-9 bg-white" /></div>
                <div className="col-span-2 space-y-1"><Label className="text-[10px]">Data</Label><Input type="date" value={l.data_entrega} onChange={e => updLinha(i, "data_entrega", e.target.value)} className="h-9 bg-white" /></div>
                <div className="col-span-2 space-y-1"><Label className="text-[10px]">Motivo</Label><Input value={l.motivo} onChange={e => updLinha(i, "motivo", e.target.value)} className="h-9 bg-white" /></div>
                <Button size="icon" variant="ghost" onClick={() => delLinha(i)} className="col-span-1 h-9 text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Importar Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
