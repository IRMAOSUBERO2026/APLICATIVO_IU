import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Bell, HardHat, Wrench, CheckCircle2, Clock, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Status = "pendente" | "atendida" | "recusada";

interface Solicitacao {
  id: string;
  tipo: "epi" | "equipamento";
  quantidade: number;
  descricao_livre: string | null;
  justificativa: string;
  solicitante: string | null;
  status: Status;
  observacoes_atendimento: string | null;
  atendido_por: string | null;
  data_atendimento: string | null;
  created_at: string;
  produto_id: string | null;
  equipamento_proprio_id: string | null;
  obras: { codigo: string; nome: string } | null;
  produtos: { descricao: string } | null;
  equipamentos_proprios: { codigo: string; descricao: string } | null;
}

export default function Solicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<Status | "todas">("pendente");
  const [filtroTipo, setFiltroTipo] = useState<"epi" | "equipamento" | "todas">("todas");
  const [loading, setLoading] = useState(true);
  const [acaoDialog, setAcaoDialog] = useState<{ id: string; novoStatus: Status } | null>(null);
  const [observacao, setObservacao] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("solicitacoes_diario")
      .select("*, obras(codigo, nome), produtos(descricao), equipamentos_proprios(codigo, descricao)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    else setSolicitacoes((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = solicitacoes.filter(s => {
    if (filtroStatus !== "todas" && s.status !== filtroStatus) return false;
    if (filtroTipo !== "todas" && s.tipo !== filtroTipo) return false;
    return true;
  });

  const counts = {
    pendente: solicitacoes.filter(s => s.status === "pendente").length,
    atendida: solicitacoes.filter(s => s.status === "atendida").length,
    recusada: solicitacoes.filter(s => s.status === "recusada").length,
  };

  const confirmar = async () => {
    if (!acaoDialog) return;
    const { error } = await supabase
      .from("solicitacoes_diario")
      .update({
        status: acaoDialog.novoStatus,
        observacoes_atendimento: observacao || null,
        data_atendimento: new Date().toISOString(),
        atendido_por: "Admin",
      })
      .eq("id", acaoDialog.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: acaoDialog.novoStatus === "atendida" ? "Marcada como atendida" : "Marcada como pendência/recusada" });
    setAcaoDialog(null);
    setObservacao("");
    load();
  };

  const labelItem = (s: Solicitacao) => {
    if (s.produtos?.descricao) return s.produtos.descricao;
    if (s.equipamentos_proprios) return `${s.equipamentos_proprios.codigo} - ${s.equipamentos_proprios.descricao}`;
    return s.descricao_livre || "—";
  };

  const statusBadge = (st: Status) => {
    const map: Record<Status, { cls: string; label: string; Icon: typeof Clock }> = {
      pendente: { cls: "bg-warning/15 text-warning border-warning/30", label: "Pendente", Icon: Clock },
      atendida: { cls: "bg-success/15 text-success border-success/30", label: "Atendida", Icon: CheckCircle2 },
      recusada: { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Pendência", Icon: XCircle },
    };
    const { cls, label, Icon } = map[st];
    return (
      <Badge variant="outline" className={cls}>
        <Icon className="h-3 w-3 mr-1" /> {label}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" /> Solicitações do Diário
            </h1>
            <p className="text-sm text-muted-foreground">Pedidos de EPI e equipamentos enviados pelas obras.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => setFiltroStatus("pendente")}
            className={`rounded-xl border bg-card p-4 text-left transition-all ${filtroStatus === "pendente" ? "ring-2 ring-warning" : "hover:border-warning/40"}`}>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-warning">{counts.pendente}</p>
          </button>
          <button onClick={() => setFiltroStatus("atendida")}
            className={`rounded-xl border bg-card p-4 text-left transition-all ${filtroStatus === "atendida" ? "ring-2 ring-success" : "hover:border-success/40"}`}>
            <p className="text-xs text-muted-foreground">Atendidas</p>
            <p className="text-2xl font-bold text-success">{counts.atendida}</p>
          </button>
          <button onClick={() => setFiltroStatus("recusada")}
            className={`rounded-xl border bg-card p-4 text-left transition-all ${filtroStatus === "recusada" ? "ring-2 ring-destructive" : "hover:border-destructive/40"}`}>
            <p className="text-xs text-muted-foreground">Em pendência</p>
            <p className="text-2xl font-bold text-destructive">{counts.recusada}</p>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
            className="rounded-lg border bg-card px-3 py-2 text-sm">
            <option value="todas">Todos status</option>
            <option value="pendente">Pendentes</option>
            <option value="atendida">Atendidas</option>
            <option value="recusada">Em pendência</option>
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
            className="rounded-lg border bg-card px-3 py-2 text-sm">
            <option value="todas">Todos tipos</option>
            <option value="epi">EPI</option>
            <option value="equipamento">Equipamentos</option>
          </select>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma solicitação neste filtro.</p>
            </div>
          )}
          {filtered.map(s => (
            <div key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {s.tipo === "epi" ? (
                      <Badge variant="outline" className="bg-warning/10 border-warning/30 text-warning">
                        <HardHat className="h-3 w-3 mr-1" /> EPI
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                        <Wrench className="h-3 w-3 mr-1" /> Equipamento
                      </Badge>
                    )}
                    {statusBadge(s.status)}
                    <span className="text-xs text-muted-foreground">
                      {s.obras ? `${s.obras.codigo} - ${s.obras.nome}` : "Sem obra"}
                    </span>
                  </div>
                  <p className="font-medium text-sm">
                    {labelItem(s)} <span className="text-muted-foreground">× {s.quantidade}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Justificativa:</span> {s.justificativa}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Solicitado por <span className="font-medium">{s.solicitante || "—"}</span> em {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                  {s.observacoes_atendimento && (
                    <p className="text-[11px] text-muted-foreground mt-1 italic">
                      Resposta: {s.observacoes_atendimento}
                    </p>
                  )}
                </div>
                {s.status === "pendente" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => { setAcaoDialog({ id: s.id, novoStatus: "atendida" }); setObservacao(""); }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Atender
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAcaoDialog({ id: s.id, novoStatus: "recusada" }); setObservacao(""); }}>
                      <Clock className="h-4 w-4 mr-1" /> Pendência
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={!!acaoDialog} onOpenChange={() => setAcaoDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {acaoDialog?.novoStatus === "atendida" ? "Marcar como atendida" : "Manter em pendência"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Observações (opcional)</label>
              <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3}
                placeholder={acaoDialog?.novoStatus === "atendida" ? "Ex: Entregue na obra dia 22/04" : "Ex: Aguardando aprovação de compra"} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcaoDialog(null)}>Cancelar</Button>
              <Button onClick={confirmar}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
