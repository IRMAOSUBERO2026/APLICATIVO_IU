import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, AlertCircle, AlertTriangle, Info, Check, Trash2, RefreshCw } from "lucide-react";
import { format, addYears, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  categoria: string;
  funcionario_id: string | null;
  obra_id: string | null;
  lido: boolean;
  data_expiracao: string | null;
  created_at: string;
}

export function AvisosPanel() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState("todos");
  const [form, setForm] = useState({ titulo: "", mensagem: "", tipo: "normal", categoria: "geral", data_expiracao: "" });

  useEffect(() => { loadAvisos(); }, []);

  const loadAvisos = async () => {
    const { data } = await supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setAvisos(data);
  };

  const gerarAvisosAutomaticos = async () => {
    const today = new Date();
    const avisosAuto: { titulo: string; mensagem: string; tipo: string; categoria: string }[] = [];

    // Check ASO vencendo (1 ano)
    const { data: funcsAso } = await supabase.from("funcionarios").select("id, nome, data_aso").eq("status", "ativo").not("data_aso", "is", null);
    funcsAso?.forEach(f => {
      if (f.data_aso) {
        const vencimento = addYears(new Date(f.data_aso), 1);
        const dias = differenceInDays(vencimento, today);
        if (dias <= 30 && dias >= 0) {
          avisosAuto.push({ titulo: `ASO vencendo — ${f.nome}`, mensagem: `ASO vence em ${dias} dias (${format(vencimento, "dd/MM/yyyy")})`, tipo: dias <= 7 ? "urgente" : "atencao", categoria: "seguranca" });
        }
      }
    });

    // Check NRs vencendo
    const { data: funcsNr } = await supabase.from("funcionarios").select("id, nome, data_nr6, data_nr12, data_nr18, data_nr35").eq("status", "ativo");
    funcsNr?.forEach(f => {
      const nrs = [
        { nome: "NR6", data: f.data_nr6, anos: 1 },
        { nome: "NR12", data: f.data_nr12, anos: 2 },
        { nome: "NR18", data: f.data_nr18, anos: 2 },
        { nome: "NR35", data: f.data_nr35, anos: 2 },
      ];
      nrs.forEach(nr => {
        if (nr.data) {
          const venc = addYears(new Date(nr.data), nr.anos);
          const dias = differenceInDays(venc, today);
          if (dias <= 30 && dias >= 0) {
            avisosAuto.push({ titulo: `${nr.nome} vencendo — ${f.nome}`, mensagem: `Treinamento ${nr.nome} vence em ${dias} dias`, tipo: dias <= 7 ? "urgente" : "atencao", categoria: "seguranca" });
          }
        }
      });
    });

    // Check tarefas atrasadas
    const { data: tarefasAtrasadas } = await supabase.from("tarefas").select("id, titulo, data_limite")
      .neq("status", "concluido").not("data_limite", "is", null).lt("data_limite", format(today, "yyyy-MM-dd"));
    tarefasAtrasadas?.forEach(t => {
      avisosAuto.push({ titulo: `Tarefa atrasada: ${t.titulo}`, mensagem: `Prazo era ${format(new Date(t.data_limite!), "dd/MM/yyyy")}`, tipo: "urgente", categoria: "tarefa" });
    });

    if (avisosAuto.length === 0) {
      toast({ title: "Nenhum novo aviso automático gerado" });
      return;
    }

    const { error } = await supabase.from("avisos").insert(avisosAuto);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${avisosAuto.length} avisos gerados automaticamente` });
      loadAvisos();
    }
  };

  const handleCreate = async () => {
    if (!form.titulo || !form.mensagem) return toast({ title: "Preencha título e mensagem", variant: "destructive" });
    const { error } = await supabase.from("avisos").insert({
      titulo: form.titulo, mensagem: form.mensagem, tipo: form.tipo, categoria: form.categoria,
      data_expiracao: form.data_expiracao || null
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Aviso criado" });
    setDialogOpen(false);
    setForm({ titulo: "", mensagem: "", tipo: "normal", categoria: "geral", data_expiracao: "" });
    loadAvisos();
  };

  const markAsRead = async (id: string) => {
    await supabase.from("avisos").update({ lido: true }).eq("id", id);
    loadAvisos();
  };

  const deleteAviso = async (id: string) => {
    await supabase.from("avisos").delete().eq("id", id);
    loadAvisos();
  };

  const tipoConfig: Record<string, { icon: typeof AlertCircle; color: string; bg: string }> = {
    urgente: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    atencao: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    normal: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  };

  const filtered = avisos.filter(a => filterTipo === "todos" || a.tipo === filterTipo);
  const naoLidos = avisos.filter(a => !a.lido).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="urgente">🔴 Urgente</SelectItem>
              <SelectItem value="atencao">🟡 Atenção</SelectItem>
              <SelectItem value="normal">🟢 Normal</SelectItem>
            </SelectContent>
          </Select>
          {naoLidos > 0 && <Badge variant="destructive">{naoLidos} não lido(s)</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={gerarAvisosAutomaticos}><RefreshCw className="h-4 w-4 mr-1" /> Gerar Automáticos</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Aviso</Button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum aviso</p>
          </div>
        ) : filtered.map(a => {
          const cfg = tipoConfig[a.tipo] || tipoConfig.normal;
          const Icon = cfg.icon;
          return (
            <div key={a.id} className={cn("rounded-lg border p-3 flex items-start gap-3 transition-colors", a.lido ? "bg-card opacity-60" : cfg.bg)}>
              <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className={cn("text-sm font-medium", !a.lido && "font-semibold")}>{a.titulo}</h4>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{format(new Date(a.created_at), "dd/MM HH:mm")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.mensagem}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">{a.categoria}</Badge>
                  {!a.lido && <button onClick={() => markAsRead(a.id)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Check className="h-3 w-3" /> Marcar lido</button>}
                  <button onClick={() => deleteAviso(a.id)} className="text-[10px] text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Aviso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            <Textarea placeholder="Mensagem" value={form.mensagem} onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                  <SelectItem value="atencao">🟡 Atenção</SelectItem>
                  <SelectItem value="normal">🟢 Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="seguranca">Segurança</SelectItem>
                  <SelectItem value="tarefa">Tarefa</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Data de Expiração (opcional)</label>
              <Input type="date" value={form.data_expiracao} onChange={e => setForm(p => ({ ...p, data_expiracao: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Criar Aviso</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
