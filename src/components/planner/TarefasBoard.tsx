import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Clock, AlertTriangle, MessageSquare, Paperclip, Trash2, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  data_limite: string | null;
  prioridade: string;
  status: string;
  funcionario_id: string | null;
  atribuido_para: string | null;
  obra_id: string | null;
  created_at: string;
}

interface Comentario {
  id: string;
  tarefa_id: string;
  autor: string;
  conteudo: string;
  created_at: string;
}

export function TarefasBoard() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([]);
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [novoComentario, setNovoComentario] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPrioridade, setFilterPrioridade] = useState("todos");
  const [form, setForm] = useState({ titulo: "", descricao: "", data_limite: "", prioridade: "media", atribuido_para: "", obra_id: "" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: t }, { data: f }, { data: o }] = await Promise.all([
      supabase.from("tarefas").select("*").order("created_at", { ascending: false }),
      supabase.from("funcionarios").select("id, nome").eq("status", "ativo").order("nome"),
      supabase.from("obras").select("id, nome").order("nome"),
    ]);
    if (t) setTarefas(t);
    if (f) setFuncionarios(f);
    if (o) setObras(o);
  };

  const loadComentarios = async (tarefaId: string) => {
    const { data } = await supabase.from("tarefa_comentarios").select("*").eq("tarefa_id", tarefaId).order("created_at");
    if (data) setComentarios(data);
  };

  const handleCreate = async () => {
    if (!form.titulo) return toast({ title: "Informe o título", variant: "destructive" });
    const { error } = await supabase.from("tarefas").insert({
      titulo: form.titulo, descricao: form.descricao || null, data_limite: form.data_limite || null,
      prioridade: form.prioridade, atribuido_para: form.atribuido_para || null, obra_id: form.obra_id || null,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Tarefa criada" });
    setDialogOpen(false);
    setForm({ titulo: "", descricao: "", data_limite: "", prioridade: "media", atribuido_para: "", obra_id: "" });
    loadAll();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("tarefas").update({ status }).eq("id", id);
    loadAll();
    if (selectedTarefa?.id === id) setSelectedTarefa({ ...selectedTarefa, status });
  };

  const deleteTarefa = async (id: string) => {
    await supabase.from("tarefas").delete().eq("id", id);
    toast({ title: "Tarefa excluída" });
    setDetailOpen(false);
    loadAll();
  };

  const addComentario = async () => {
    if (!novoComentario || !selectedTarefa) return;
    await supabase.from("tarefa_comentarios").insert({ tarefa_id: selectedTarefa.id, autor: "Gestor", conteudo: novoComentario });
    setNovoComentario("");
    loadComentarios(selectedTarefa.id);
  };

  const openDetail = (t: Tarefa) => {
    setSelectedTarefa(t);
    loadComentarios(t.id);
    setDetailOpen(true);
  };

  const prioridadeBadge = (p: string) => {
    const map: Record<string, { label: string; class: string }> = {
      alta: { label: "Alta", class: "bg-red-100 text-red-700 border-red-200" },
      media: { label: "Média", class: "bg-amber-100 text-amber-700 border-amber-200" },
      baixa: { label: "Baixa", class: "bg-green-100 text-green-700 border-green-200" },
    };
    const m = map[p] || map.media;
    return <Badge variant="outline" className={m.class}>{m.label}</Badge>;
  };

  const statusIcon = (s: string) => {
    if (s === "concluido") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === "em_andamento") return <Clock className="h-4 w-4 text-amber-500" />;
    return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  };

  const filtered = tarefas.filter(t => {
    if (filterStatus !== "todos" && t.status !== filterStatus) return false;
    if (filterPrioridade !== "todos" && t.prioridade !== filterPrioridade) return false;
    return true;
  });

  const columns = [
    { key: "pendente", label: "Pendente", color: "border-t-muted-foreground" },
    { key: "em_andamento", label: "Em Andamento", color: "border-t-amber-500" },
    { key: "concluido", label: "Concluído", color: "border-t-green-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Prioridade</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova Tarefa</Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.key} className={cn("rounded-lg border border-t-4 bg-card", col.color)}>
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="text-sm font-semibold">{col.label}</h4>
              <Badge variant="secondary" className="text-xs">{filtered.filter(t => t.status === col.key).length}</Badge>
            </div>
            <div className="p-2 space-y-2 min-h-[200px]">
              {filtered.filter(t => t.status === col.key).map(t => (
                <div key={t.id} onClick={() => openDetail(t)} className="rounded-lg border bg-background p-3 cursor-pointer hover:shadow-md transition-shadow space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-tight">{t.titulo}</span>
                    {prioridadeBadge(t.prioridade)}
                  </div>
                  {t.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {t.data_limite && (
                      <span className={cn(new Date(t.data_limite) < new Date() && t.status !== "concluido" && "text-red-500 font-medium")}>
                        📅 {format(new Date(t.data_limite), "dd/MM")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data Limite</label>
                <Input type="date" value={form.data_limite} onChange={e => setForm(p => ({ ...p, data_limite: e.target.value }))} />
              </div>
              <Select value={form.prioridade} onValueChange={v => setForm(p => ({ ...p, prioridade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={form.atribuido_para || "none"} onValueChange={v => setForm(p => ({ ...p, atribuido_para: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Atribuir para..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não atribuído</SelectItem>
                {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.obra_id || "none"} onValueChange={v => setForm(p => ({ ...p, obra_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Obra (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem obra</SelectItem>
                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedTarefa && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {statusIcon(selectedTarefa.status)}
                  {selectedTarefa.titulo}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {prioridadeBadge(selectedTarefa.prioridade)}
                  {selectedTarefa.data_limite && <Badge variant="outline">📅 {format(new Date(selectedTarefa.data_limite), "dd/MM/yyyy")}</Badge>}
                </div>
                {selectedTarefa.descricao && <p className="text-sm text-muted-foreground">{selectedTarefa.descricao}</p>}
                <div className="flex gap-2">
                  <Select value={selectedTarefa.status} onValueChange={v => updateStatus(selectedTarefa.id, v)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => deleteTarefa(selectedTarefa.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Comments */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><MessageSquare className="h-4 w-4" /> Comentários</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {comentarios.map(c => (
                      <div key={c.id} className="rounded-lg bg-muted p-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.autor}</span>
                          <span>{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                        </div>
                        <p className="text-sm">{c.conteudo}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Escreva um comentário..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} onKeyDown={e => e.key === "Enter" && addComentario()} />
                    <Button size="icon" onClick={addComentario}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
