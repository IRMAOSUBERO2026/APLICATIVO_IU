import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Clock, MapPin, ChevronLeft, ChevronRight, Trash2, Copy, Edit2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  local: string | null;
  obra_id: string | null;
  tipo: string;
  cor: string | null;
  recorrente: boolean;
}

interface Obra {
  id: string;
  nome: string;
}

type ViewMode = "mensal" | "semanal" | "diaria";

export function AgendaCalendario() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("mensal");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [form, setForm] = useState({
    titulo: "", descricao: "", data_inicio: "", hora_inicio: "08:00",
    data_fim: "", hora_fim: "09:00", local: "", obra_id: "", tipo: "compromisso", cor: "#3b82f6"
  });

  useEffect(() => { loadEventos(); loadObras(); }, [currentDate]);

  const loadEventos = async () => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 1));
    const { data } = await supabase.from("eventos_agenda").select("*")
      .gte("data_inicio", start.toISOString()).lte("data_inicio", end.toISOString())
      .order("data_inicio");
    if (data) setEventos(data);
  };

  const loadObras = async () => {
    const { data } = await supabase.from("obras").select("id, nome").order("nome");
    if (data) setObras(data);
  };

  const openNew = (date?: Date) => {
    const d = date || new Date();
    setEditingEvento(null);
    setForm({
      titulo: "", descricao: "", data_inicio: format(d, "yyyy-MM-dd"), hora_inicio: "08:00",
      data_fim: format(d, "yyyy-MM-dd"), hora_fim: "09:00", local: "", obra_id: "", tipo: "compromisso", cor: "#3b82f6"
    });
    setDialogOpen(true);
  };

  const openEdit = (e: Evento) => {
    setEditingEvento(e);
    const di = new Date(e.data_inicio);
    const df = e.data_fim ? new Date(e.data_fim) : di;
    setForm({
      titulo: e.titulo, descricao: e.descricao || "", data_inicio: format(di, "yyyy-MM-dd"),
      hora_inicio: format(di, "HH:mm"), data_fim: format(df, "yyyy-MM-dd"), hora_fim: format(df, "HH:mm"),
      local: e.local || "", obra_id: e.obra_id || "", tipo: e.tipo, cor: e.cor || "#3b82f6"
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.data_inicio) return toast({ title: "Preencha título e data", variant: "destructive" });
    const data_inicio = `${form.data_inicio}T${form.hora_inicio}:00`;
    const data_fim = form.data_fim ? `${form.data_fim}T${form.hora_fim}:00` : null;
    const payload = {
      titulo: form.titulo, descricao: form.descricao || null, data_inicio, data_fim,
      local: form.local || null, obra_id: form.obra_id || null, tipo: form.tipo, cor: form.cor
    };
    if (editingEvento) {
      const { error } = await supabase.from("eventos_agenda").update(payload).eq("id", editingEvento.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Evento atualizado" });
    } else {
      const { error } = await supabase.from("eventos_agenda").insert(payload);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Evento criado" });
    }
    setDialogOpen(false);
    loadEventos();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("eventos_agenda").delete().eq("id", id);
    toast({ title: "Evento excluído" });
    setDialogOpen(false);
    loadEventos();
  };

  const handleDuplicate = (e: Evento) => {
    const di = new Date(e.data_inicio);
    const newDate = addDays(di, 1);
    setEditingEvento(null);
    setForm({
      titulo: e.titulo + " (cópia)", descricao: e.descricao || "",
      data_inicio: format(newDate, "yyyy-MM-dd"), hora_inicio: format(di, "HH:mm"),
      data_fim: format(newDate, "yyyy-MM-dd"), hora_fim: e.data_fim ? format(new Date(e.data_fim), "HH:mm") : format(di, "HH:mm"),
      local: e.local || "", obra_id: e.obra_id || "", tipo: e.tipo, cor: e.cor || "#3b82f6"
    });
    setDialogOpen(true);
  };

  const getEventosForDay = (date: Date) => eventos.filter(e => isSameDay(new Date(e.data_inicio), date));

  const tipoColors: Record<string, string> = {
    reuniao: "bg-blue-500", compromisso: "bg-emerald-500", visita: "bg-amber-500", prazo: "bg-red-500"
  };

  const navigate = (dir: number) => {
    if (viewMode === "mensal") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "semanal") setCurrentDate(addDays(currentDate, dir * 7));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
      <div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
          {weekDays.map(d => (
            <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
          {days.map(day => {
            const dayEvents = getEventosForDay(day);
            const inMonth = day.getMonth() === currentDate.getMonth();
            return (
              <div
                key={day.toISOString()}
                onClick={() => openNew(day)}
                className={cn(
                  "bg-card min-h-[80px] p-1 cursor-pointer hover:bg-muted/50 transition-colors",
                  !inMonth && "opacity-40"
                )}
              >
                <span className={cn(
                  "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}>
                  {day.getDate()}
                </span>
                <div className="space-y-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map(e => (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                      className={cn("text-[10px] text-white px-1 py-0.5 rounded truncate cursor-pointer", tipoColors[e.tipo] || "bg-primary")}
                    >
                      {format(new Date(e.data_inicio), "HH:mm")} {e.titulo}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayEvents = getEventosForDay(day);
          return (
            <div key={day.toISOString()} className={cn("border rounded-lg p-2 min-h-[200px]", isToday(day) && "border-primary")}>
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</div>
                <div className={cn("text-sm font-bold inline-flex items-center justify-center w-7 h-7 rounded-full", isToday(day) && "bg-primary text-primary-foreground")}>{day.getDate()}</div>
              </div>
              <div className="space-y-1">
                {dayEvents.map(e => (
                  <div key={e.id} onClick={() => openEdit(e)} className={cn("text-[11px] text-white p-1 rounded cursor-pointer", tipoColors[e.tipo] || "bg-primary")}>
                    <div className="font-medium truncate">{e.titulo}</div>
                    <div className="opacity-80">{format(new Date(e.data_inicio), "HH:mm")}</div>
                  </div>
                ))}
                <button onClick={() => openNew(day)} className="w-full text-[10px] text-muted-foreground hover:text-primary text-center py-1">+ Novo</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventosForDay(currentDate);
    const hours = Array.from({ length: 14 }, (_, i) => i + 6);
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-3 text-center font-medium">
          {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
        <div className="divide-y">
          {hours.map(h => {
            const hourEvents = dayEvents.filter(e => new Date(e.data_inicio).getHours() === h);
            return (
              <div key={h} className="flex min-h-[48px] hover:bg-muted/30 cursor-pointer" onClick={() => {
                const d = new Date(currentDate); d.setHours(h, 0);
                setForm(prev => ({ ...prev, data_inicio: format(currentDate, "yyyy-MM-dd"), hora_inicio: `${String(h).padStart(2, "0")}:00` }));
                openNew(currentDate);
              }}>
                <div className="w-16 text-xs text-muted-foreground p-2 text-right flex-shrink-0">{String(h).padStart(2, "0")}:00</div>
                <div className="flex-1 p-1 space-y-1">
                  {hourEvents.map(e => (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} className={cn("text-xs text-white p-1.5 rounded cursor-pointer", tipoColors[e.tipo] || "bg-primary")}>
                      <span className="font-medium">{e.titulo}</span>
                      {e.local && <span className="ml-2 opacity-80">📍 {e.local}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {viewMode === "diaria" ? format(currentDate, "d 'de' MMMM yyyy", { locale: ptBR }) : format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(["mensal", "semanal", "diaria"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={cn("px-3 py-1.5 text-xs font-medium capitalize transition-colors", viewMode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {m === "diaria" ? "Diária" : m === "mensal" ? "Mensal" : "Semanal"}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" /> Evento</Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "mensal" && renderMonthView()}
      {viewMode === "semanal" && renderWeekView()}
      {viewMode === "diaria" && renderDayView()}

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {editingEvento ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título do evento" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            <Textarea placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                <Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hora Início</label>
                <Input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                <Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hora Fim</label>
                <Input type="time" value={form.hora_fim} onChange={e => setForm(p => ({ ...p, hora_fim: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="compromisso">Compromisso</SelectItem>
                  <SelectItem value="visita">Visita em Obra</SelectItem>
                  <SelectItem value="prazo">Prazo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.obra_id || "none"} onValueChange={v => setForm(p => ({ ...p, obra_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Obra (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem obra</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Local (opcional)" value={form.local} onChange={e => setForm(p => ({ ...p, local: e.target.value }))} />
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Cor:</label>
              <input type="color" value={form.cor} onChange={e => setForm(p => ({ ...p, cor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
            </div>
            <div className="flex justify-between pt-2">
              <div className="flex gap-2">
                {editingEvento && (
                  <>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(editingEvento.id)}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(editingEvento)}><Copy className="h-4 w-4 mr-1" /> Duplicar</Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingEvento ? "Salvar" : "Criar"}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
