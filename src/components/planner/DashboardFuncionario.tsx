import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ClipboardList, Bell, Shield } from "lucide-react";
import { format, addYears, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  data_aso: string | null;
  data_nr6: string | null;
  data_nr12: string | null;
  data_nr18: string | null;
  data_nr35: string | null;
}

export function DashboardFuncionario() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("funcionarios").select("id, nome, cargo, data_aso, data_nr6, data_nr12, data_nr18, data_nr35")
      .eq("status", "ativo").order("nome").then(({ data }) => { if (data) setFuncionarios(data); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([
      supabase.from("tarefas").select("*").or(`funcionario_id.eq.${selectedId},atribuido_para.eq.${selectedId}`).neq("status", "concluido").order("data_limite"),
      supabase.from("eventos_agenda").select("*").gte("data_inicio", new Date().toISOString()).order("data_inicio").limit(5),
      supabase.from("avisos").select("*").eq("lido", false).order("created_at", { ascending: false }).limit(5),
    ]).then(([t, e, a]) => {
      if (t.data) setTarefas(t.data);
      if (e.data) setEventos(e.data);
      if (a.data) setAvisos(a.data);
    });
  }, [selectedId]);

  const func = funcionarios.find(f => f.id === selectedId);

  const getTrainingStatus = (data: string | null, anos: number) => {
    if (!data) return { label: "Não realizado", variant: "secondary" as const };
    const venc = addYears(new Date(data), anos);
    const dias = differenceInDays(venc, new Date());
    if (dias < 0) return { label: `Vencido há ${Math.abs(dias)}d`, variant: "destructive" as const };
    if (dias <= 30) return { label: `Vence em ${dias}d`, variant: "outline" as const };
    return { label: format(venc, "dd/MM/yy"), variant: "default" as const };
  };

  const trainings = func ? [
    { name: "ASO", ...getTrainingStatus(func.data_aso, 1) },
    { name: "NR6", ...getTrainingStatus(func.data_nr6, 1) },
    { name: "NR12", ...getTrainingStatus(func.data_nr12, 2) },
    { name: "NR18", ...getTrainingStatus(func.data_nr18, 2) },
    { name: "NR35", ...getTrainingStatus(func.data_nr35, 2) },
  ] : [];

  return (
    <div className="space-y-4">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Selecione um funcionário..." />
        </SelectTrigger>
        <SelectContent>
          {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome} — {f.cargo}</SelectItem>)}
        </SelectContent>
      </Select>

      {func && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Tarefas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {tarefas.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma tarefa pendente</p>
              ) : (
                <div className="space-y-2">
                  {tarefas.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs border rounded-lg p-2">
                      <span className="truncate flex-1">{t.titulo}</span>
                      <Badge variant={t.prioridade === "alta" ? "destructive" : "secondary"} className="text-[10px] ml-2">{t.prioridade}</Badge>
                    </div>
                  ))}
                  {tarefas.length > 5 && <p className="text-[10px] text-muted-foreground text-center">+{tarefas.length - 5} mais</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {eventos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum evento próximo</p>
              ) : (
                <div className="space-y-2">
                  {eventos.map(e => (
                    <div key={e.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{e.titulo}</div>
                      <div className="text-muted-foreground">{format(new Date(e.data_inicio), "dd/MM HH:mm")}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Avisos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {avisos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum aviso</p>
              ) : (
                <div className="space-y-2">
                  {avisos.map(a => (
                    <div key={a.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{a.titulo}</div>
                      <div className="text-muted-foreground truncate">{a.mensagem}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Status de Treinamentos e Exames</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {trainings.map(item => (
                  <div key={item.name} className="border rounded-lg p-3 text-center space-y-1">
                    <div className="text-xs font-semibold">{item.name}</div>
                    <Badge variant={item.variant} className="text-[10px]">{item.label}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
