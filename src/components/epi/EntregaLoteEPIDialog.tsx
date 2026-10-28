import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produtos: any[];
  obras: any[];
  funcionarios: any[];
  onDone: () => void;
}

const ATIVOS = ["ativo", "experiencia", "experiência"];

export function EntregaLoteEPIDialog({ open, onOpenChange, produtos, obras, funcionarios, onDone }: Props) {
  const [produtoId, setProdutoId] = useState("");
  const [obraId, setObraId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("Primeira Entrega");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const produto = produtos.find((p) => p.id === produtoId);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return funcionarios
      .filter((f) => ATIVOS.includes(String(f.status || "").toLowerCase()))
      .filter((f) => !obraId || f.obra_id === obraId)
      .filter((f) => !termo || f.nome?.toLowerCase().includes(termo));
  }, [funcionarios, obraId, busca]);

  const totalNecessario = selecionados.length * quantidade;
  const todosMarcados = lista.length > 0 && lista.every((f) => selecionados.includes(f.id));

  const alternar = (id: string) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const alternarTodos = () =>
    setSelecionados((s) =>
      todosMarcados ? s.filter((id) => !lista.some((f) => f.id === id)) : Array.from(new Set([...s, ...lista.map((f) => f.id)]))
    );

  const reset = () => { setSelecionados([]); setBusca(""); setProdutoId(""); setQuantidade(1); };

  const salvar = async () => {
    if (!produto || selecionados.length === 0 || quantidade < 1) {
      toast({ title: "Selecione o EPI, a quantidade e ao menos um funcionário", variant: "destructive" });
      return;
    }
    if (!produto.ca_numero) {
      toast({ title: "CA obrigatório", description: "Cadastre o CA do produto antes de entregar.", variant: "destructive" });
      return;
    }
    if (produto.saldo !== undefined && totalNecessario > produto.saldo) {
      if (!confirm(`Saldo em estoque (${produto.saldo}) é menor que o total da entrega (${totalNecessario}). Continuar mesmo assim?`)) return;
    }
    setSalvando(true);
    try {
      const dataIso = new Date(data + "T12:00:00").toISOString();
      const funcs = funcionarios.filter((f) => selecionados.includes(f.id));
      const rows = funcs.map((f) => ({
        funcionario_id: f.id,
        produto_id: produto.id,
        obra_id: obraId || f.obra_id || null,
        empresa_id: f.empresa_id || "",
        quantidade,
        ca_numero: produto.ca_numero,
        motivo,
        observacoes: `Entrega em lote - ${motivo}`,
        data_entrega: dataIso,
        status: "ativo",
        confirmacao_tipo: "pendente",
      }));
      const { error } = await supabase.from("entregas_epi").insert(rows);
      if (error) throw error;
      const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
        produto_id: produto.id,
        tipo: "saida",
        quantidade: totalNecessario,
        obra_id: obraId || null,
        observacoes: `Entrega EPI em lote (${funcs.length} funcionários) - ${motivo}`,
      });
      if (movErr) throw movErr;
      toast({ title: `🛡️ ${produto.descricao} entregue para ${funcs.length} funcionário(s)` });
      reset();
      onOpenChange(false);
      onDone();
    } catch (err: any) {
      toast({ title: "Erro na entrega em lote", description: err.message, variant: "destructive" });
    }
    setSalvando(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[92vh] flex flex-col rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black uppercase"><Users size={20} /> Entrega em Lote</DialogTitle>
          <DialogDescription>Escolha um EPI e marque os funcionários que vão recebê-lo.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label>EPI</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o EPI" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.descricao} {p.ca_numero ? `· CA ${p.ca_numero}` : "· sem CA"} · saldo {p.saldo ?? 0}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Obra</Label>
            <Select value={obraId || "todas"} onValueChange={(v) => { setObraId(v === "todas" ? "" : v); setSelecionados([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as obras</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data da entrega</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Quantidade por funcionário</Label>
            <Input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Primeira Entrega", "Substituição", "Desgaste", "Perda", "Dano"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar funcionário" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Button variant="outline" onClick={alternarTodos} disabled={lista.length === 0}>
            {todosMarcados ? "Desmarcar" : "Marcar"} todos
          </Button>
        </div>

        <div className="flex-1 min-h-[180px] overflow-y-auto border rounded-xl divide-y">
          {lista.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum funcionário ativo encontrado.</p>}
          {lista.map((f) => (
            <label key={f.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
              <Checkbox checked={selecionados.includes(f.id)} onCheckedChange={() => alternar(f.id)} />
              <span className="text-sm">{f.nome}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-sm text-muted-foreground sm:mr-auto">
            {selecionados.length} selecionado(s) · total {totalNecessario} un.
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !produtoId || selecionados.length === 0}>
            {salvando ? "Salvando..." : `Entregar para ${selecionados.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
