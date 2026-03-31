import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ServicoExtra {
  id: string; obra_id: string; empresa_id: string; descricao: string;
  valor: number; justificativa?: string; status: string;
}

interface Props { obraId: string; empresaId: string; }

export default function ObraServicosExtras({ obraId, empresaId }: Props) {
  const { toast } = useToast();
  const [servicos, setServicos] = useState<ServicoExtra[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: 0, justificativa: "" });

  useEffect(() => { load(); }, [obraId]);

  const load = async () => {
    const { data } = await supabase.from("servicos_extras").select("*").eq("obra_id", obraId).order("created_at");
    if (data) setServicos(data as ServicoExtra[]);
  };

  const handleSave = async () => {
    if (!form.descricao) { toast({ title: "Preencha a descrição", variant: "destructive" }); return; }
    await supabase.from("servicos_extras").insert({ ...form, obra_id: obraId, empresa_id: empresaId });
    toast({ title: "Serviço extra adicionado" });
    setShowDialog(false);
    setForm({ descricao: "", valor: 0, justificativa: "" });
    load();
  };

  const handleStatus = async (id: string, status: string) => {
    await supabase.from("servicos_extras").update({ status }).eq("id", id);
    toast({ title: `Serviço ${status}` });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("servicos_extras").delete().eq("id", id);
    load();
  };

  const statusBadge = (s: string) => {
    if (s === "aprovado") return <Badge className="bg-green-500/10 text-green-700 border-green-200">Aprovado</Badge>;
    if (s === "negado") return <Badge className="bg-red-500/10 text-red-700 border-red-200">Negado</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  const totalAprovado = servicos.filter(s => s.status === "aprovado").reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Serviços Extras / Fora do Contrato</h3>
          {totalAprovado > 0 && <p className="text-xs text-muted-foreground">Total aprovado: {fmtBRL(totalAprovado)}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>

      {servicos.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">Nenhum serviço extra cadastrado</div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28 text-right">Valor</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.descricao}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmtBRL(s.valor)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.justificativa || "—"}</TableCell>
                  <TableCell className="text-center">{statusBadge(s.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.status === "pendente" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleStatus(s.id, "aprovado")}><CheckCircle className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleStatus(s.id, "negado")}><XCircle className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Serviço Extra</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor || ""} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} /></div>
            <div><Label>Justificativa</Label><Textarea value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
