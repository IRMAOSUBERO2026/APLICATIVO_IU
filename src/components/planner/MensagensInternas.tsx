import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Plus, MessageCircle, User, Users, HardHat, Paperclip, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Mensagem {
  id: string;
  remetente: string;
  destinatario_tipo: string;
  destinatario_id: string | null;
  obra_id: string | null;
  conteudo: string;
  anexo_url: string | null;
  lida: boolean;
  created_at: string;
}

export function MensagensInternas() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string }[]>([]);
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ remetente: "Gestor", destinatario_tipo: "funcionario", destinatario_id: "", obra_id: "", conteudo: "" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: m }, { data: f }, { data: o }] = await Promise.all([
      supabase.from("mensagens_internas").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("funcionarios").select("id, nome").eq("status", "ativo").order("nome"),
      supabase.from("obras").select("id, nome").order("nome"),
    ]);
    if (m) setMensagens(m);
    if (f) setFuncionarios(f);
    if (o) setObras(o);
  };

  const handleSend = async () => {
    if (!form.conteudo) return toast({ title: "Escreva a mensagem", variant: "destructive" });
    const { error } = await supabase.from("mensagens_internas").insert({
      remetente: form.remetente, destinatario_tipo: form.destinatario_tipo,
      destinatario_id: form.destinatario_id || null, obra_id: form.obra_id || null, conteudo: form.conteudo,
    });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Mensagem enviada" });
    setDialogOpen(false);
    setForm({ remetente: "Gestor", destinatario_tipo: "funcionario", destinatario_id: "", obra_id: "", conteudo: "" });
    loadAll();
  };

  const markAsRead = async (id: string) => {
    await supabase.from("mensagens_internas").update({ lida: true }).eq("id", id);
    loadAll();
  };

  const destinatarioLabel = (m: Mensagem) => {
    if (m.destinatario_tipo === "funcionario" && m.destinatario_id) {
      const f = funcionarios.find(f => f.id === m.destinatario_id);
      return f?.nome || "Funcionário";
    }
    if (m.destinatario_tipo === "obra" && m.obra_id) {
      const o = obras.find(o => o.id === m.obra_id);
      return `Obra: ${o?.nome || ""}`;
    }
    return "Equipe";
  };

  const tipoIcon = (tipo: string) => {
    if (tipo === "funcionario") return <User className="h-4 w-4" />;
    if (tipo === "obra") return <HardHat className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const naoLidas = mensagens.filter(m => !m.lida).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {naoLidas > 0 && <Badge variant="destructive">{naoLidas} não lida(s)</Badge>}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova Mensagem</Button>
      </div>

      <div className="space-y-2">
        {mensagens.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma mensagem</p>
          </div>
        ) : mensagens.map(m => (
          <div key={m.id} className={cn("rounded-lg border p-3 transition-colors", m.lida ? "bg-card" : "bg-primary/5 border-primary/20")}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {tipoIcon(m.destinatario_tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.remetente}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-xs text-muted-foreground">{destinatarioLabel(m)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                </div>
                <p className="text-sm mt-1">{m.conteudo}</p>
                {!m.lida && (
                  <button onClick={() => markAsRead(m.id)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5 mt-1">
                    <Check className="h-3 w-3" /> Marcar como lida
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Mensagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Remetente" value={form.remetente} onChange={e => setForm(p => ({ ...p, remetente: e.target.value }))} />
            <Select value={form.destinatario_tipo} onValueChange={v => setForm(p => ({ ...p, destinatario_tipo: v, destinatario_id: "", obra_id: "" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="funcionario">Funcionário Específico</SelectItem>
                <SelectItem value="equipe">Equipe</SelectItem>
                <SelectItem value="obra">Obra</SelectItem>
              </SelectContent>
            </Select>
            {form.destinatario_tipo === "funcionario" && (
              <Select value={form.destinatario_id || "none"} onValueChange={v => setForm(p => ({ ...p, destinatario_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar funcionário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecionar...</SelectItem>
                  {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {form.destinatario_tipo === "obra" && (
              <Select value={form.obra_id || "none"} onValueChange={v => setForm(p => ({ ...p, obra_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecionar...</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Textarea placeholder="Escreva sua mensagem..." value={form.conteudo} onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))} rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSend}><Send className="h-4 w-4 mr-1" /> Enviar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
