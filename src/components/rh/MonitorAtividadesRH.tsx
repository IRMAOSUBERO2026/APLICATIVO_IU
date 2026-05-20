import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import {
  UserCheck,
  UserMinus,
  FileText,
  AlertCircle,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Smartphone,
  SmartphoneNfc,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JustItem {
  id: string;
  tipo: string;
  descricao: string | null;
  status: string;
  created_at: string;
  funcionario_id: string;
  func_nome: string;
  inconsistencia_data?: string;
}

interface UpdateItem {
  id: string;
  campo: string;
  valor_novo: string | null;
  status: string;
  created_at: string;
  func_nome: string;
}

type TimelineItem =
  | { kind: "just"; data: JustItem }
  | { kind: "update"; data: UpdateItem };

interface CredItem {
  funcionario_id: string;
  pin_configurado: boolean;
  ultimo_acesso: string | null;
  func_nome: string;
  func_cpf: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MonitorAtividadesRH() {
  const [justs, setJusts] = useState<JustItem[]>([]);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [creds, setCreds] = useState<CredItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Justificativas de ponto pendentes
      const { data: justData } = await supabase
        .from("justificativas_ponto")
        .select("id, tipo, descricao, status, created_at, funcionario_id, data_ocorrencia, funcionarios:funcionario_id(nome)")
        .order("created_at", { ascending: false })
        .limit(50);

      setJusts(
        (justData || []).map((j: any) => ({
          id: j.id,
          tipo: j.tipo,
          descricao: j.descricao,
          status: j.status,
          created_at: j.created_at,
          funcionario_id: j.funcionario_id,
          func_nome: j.funcionarios?.nome || "—",
          inconsistencia_data: j.data_ocorrencia,
        }))
      );

      // 2. Solicitações de atualização de dados
      const { data: updData } = await supabase
        .from("solicitacoes_atualizacao")
        .select("id, campo, valor_novo, status, created_at, funcionarios:funcionario_id(nome)")
        .order("created_at", { ascending: false })
        .limit(30);

      setUpdates(
        (updData || []).map((u: any) => ({
          id: u.id,
          campo: u.campo,
          valor_novo: u.valor_novo,
          status: u.status,
          created_at: u.created_at,
          func_nome: u.funcionarios?.nome || "—",
        }))
      );

      // 3. Credenciais do portal
      const { data: credData } = await supabase
        .from("portal_credentials")
        .select("funcionario_id, pin_configurado, ultimo_acesso, funcionarios:funcionario_id(nome, cpf)")
        .order("ultimo_acesso", { ascending: false, nullsFirst: false });

      setCreds(
        (credData || []).map((c: any) => ({
          funcionario_id: c.funcionario_id,
          pin_configurado: c.pin_configurado,
          ultimo_acesso: c.ultimo_acesso,
          func_nome: c.funcionarios?.nome || "—",
          func_cpf: c.funcionarios?.cpf || "",
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar monitor:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleJustificativaAction = async (id: string, action: "aprovado" | "rejeitado") => {
    setProcessingId(id);
    const { error } = await supabase
      .from("justificativas_ponto")
      .update({ status: action })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao processar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: action === "aprovado" ? "Justificativa aprovada ✓" : "Justificativa rejeitada",
        variant: action === "aprovado" ? "default" : "destructive",
      });
      setJusts((prev) => prev.map((j) => (j.id === id ? { ...j, status: action } : j)));
    }
    setProcessingId(null);
  };

  const handleUpdateAction = async (id: string, action: "aprovado" | "rejeitado") => {
    setProcessingId(id);
    const { error } = await supabase
      .from("solicitacoes_atualizacao")
      .update({ status: action })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: action === "aprovado" ? "Solicitação aprovada ✓" : "Solicitação rejeitada" });
      setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, status: action } : u)));
    }
    setProcessingId(null);
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...justs.map((j): TimelineItem => ({ kind: "just", data: j })),
      ...updates.map((u): TimelineItem => ({ kind: "update", data: u })),
    ];
    return items.sort(
      (a, b) =>
        new Date(b.kind === "just" ? b.data.created_at : b.data.created_at).getTime() -
        new Date(a.kind === "just" ? a.data.created_at : a.data.created_at).getTime()
    );
  }, [justs, updates]);

  const pendingJusts = justs.filter((j) => j.status === "pendente").length;
  const pendingUpdates = updates.filter((u) => u.status === "pendente").length;
  const comAcesso = creds.filter((c) => c.pin_configurado).length;
  const semAcesso = creds.filter((c) => !c.pin_configurado).length;

  const filteredCreds = useMemo(() => {
    if (!search.trim()) return creds;
    const q = search.toLowerCase();
    return creds.filter(
      (c) => c.func_nome.toLowerCase().includes(q) || c.func_cpf.includes(q)
    );
  }, [creds, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="text-[10px] uppercase font-bold text-warning border-warning/40">Pendente</Badge>;
      case "aprovado":
        return <Badge variant="outline" className="text-[10px] uppercase font-bold text-success border-success/40">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="outline" className="text-[10px] uppercase font-bold text-destructive border-destructive/40">Rejeitado</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Monitor / Mural do Portal</h3>
          <p className="text-sm text-muted-foreground">Interações, justificativas e acessos dos colaboradores</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Com Acesso</p>
                <p className="text-3xl font-bold text-success mt-1">{comAcesso}</p>
              </div>
              <SmartphoneNfc className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sem Portal</p>
                <p className="text-3xl font-bold text-warning mt-1">{semAcesso}</p>
              </div>
              <Smartphone className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent>
        </Card>

        <Card className={pendingJusts > 0 ? "bg-blue-500/5 border-blue-500/30" : "bg-muted/30"}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Justificativas</p>
                <p className={`text-3xl font-bold mt-1 ${pendingJusts > 0 ? "text-blue-500" : "text-muted-foreground"}`}>
                  {pendingJusts}
                </p>
                <p className="text-[10px] text-muted-foreground">pendente{pendingJusts !== 1 ? "s" : ""}</p>
              </div>
              <FileText className={`h-8 w-8 ${pendingJusts > 0 ? "text-blue-500/30" : "text-muted-foreground/20"}`} />
            </div>
          </CardContent>
        </Card>

        <Card className={pendingUpdates > 0 ? "bg-purple-500/5 border-purple-500/30" : "bg-muted/30"}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Atualizações</p>
                <p className={`text-3xl font-bold mt-1 ${pendingUpdates > 0 ? "text-purple-500" : "text-muted-foreground"}`}>
                  {pendingUpdates}
                </p>
                <p className="text-[10px] text-muted-foreground">pendente{pendingUpdates !== 1 ? "s" : ""}</p>
              </div>
              <AlertCircle className={`h-8 w-8 ${pendingUpdates > 0 ? "text-purple-500/30" : "text-muted-foreground/20"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mural / Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Fila de Interações Recentes
              {(pendingJusts + pendingUpdates) > 0 && (
                <span className="ml-auto text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-bold">
                  {pendingJusts + pendingUpdates} para resolver
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[520px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">
                  Carregando interações...
                </div>
              ) : timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20 text-success" />
                  <p className="text-sm">Nenhuma pendência no momento.</p>
                </div>
              ) : (
                timeline.map((item) => {
                  if (item.kind === "just") {
                    const j = item.data;
                    return (
                      <div key={`j-${j.id}`} className="p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-full bg-blue-500/10 text-blue-500 shrink-0">
                            <FileText size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold">{j.func_nome}</p>
                              <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                                {j.tipo.replace(/_/g, " ")}
                              </span>
                              {getStatusBadge(j.status)}
                            </div>
                            {j.descricao && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{j.descricao}</p>
                            )}
                            {j.inconsistencia_data && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Ref.: {format(parseISO(j.inconsistencia_data), "dd/MM/yyyy")}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(parseISO(j.created_at), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {j.status === "pendente" && (
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleJustificativaAction(j.id, "aprovado")}
                                disabled={processingId === j.id}
                                title="Aprovar"
                                className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => handleJustificativaAction(j.id, "rejeitado")}
                                disabled={processingId === j.id}
                                title="Rejeitar"
                                className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const u = item.data;
                    return (
                      <div key={`u-${u.id}`} className="p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-full bg-purple-500/10 text-purple-500 shrink-0">
                            <AlertCircle size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold">{u.func_nome}</p>
                              <span className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                                Alterar {u.campo}
                              </span>
                              {getStatusBadge(u.status)}
                            </div>
                            {u.valor_novo && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Novo valor: <span className="font-medium text-foreground">{u.valor_novo}</span>
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(parseISO(u.created_at), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {u.status === "pendente" && (
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleUpdateAction(u.id, "aprovado")}
                                disabled={processingId === u.id}
                                title="Aprovar"
                                className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => handleUpdateAction(u.id, "rejeitado")}
                                disabled={processingId === u.id}
                                title="Rejeitar"
                                className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Painel de Acessos */}
        <Card>
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Status de Acesso ao Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm h-9"
            />

            <div className="divide-y max-h-[440px] overflow-y-auto rounded-lg border bg-muted/10">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">
                  Carregando...
                </div>
              ) : filteredCreds.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {search ? "Nenhum resultado." : "Sem credenciais cadastradas."}
                </div>
              ) : (
                filteredCreds.map((c) => (
                  <div key={c.funcionario_id} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${c.pin_configurado ? "bg-success" : "bg-warning"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{c.func_nome}</p>
                      {c.ultimo_acesso ? (
                        <p className="text-[10px] text-muted-foreground">
                          Último acesso: {format(parseISO(c.ultimo_acesso), "dd/MM/yyyy HH:mm")}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Nunca acessou</p>
                      )}
                    </div>
                    {c.pin_configurado ? (
                      <UserCheck size={14} className="text-success shrink-0" />
                    ) : (
                      <UserMinus size={14} className="text-warning shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>

            {!loading && creds.length > 0 && (
              <p className="text-[10px] text-muted-foreground text-center">
                {comAcesso} de {creds.length} colaboradores com acesso configurado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
