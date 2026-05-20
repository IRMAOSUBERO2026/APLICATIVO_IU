import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Filter, CheckCircle2, AlertCircle, Clock, Search, FileText, UserPlus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function InconsistenciasPonto() {
  const [inconsistencias, setInconsistencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("aberta");
  const [filterTipo, setFilterTipo] = useState("");
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState("");
  
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [selectedInc, setSelectedInc] = useState<any>(null);
  const [justification, setJustification] = useState({
    tipo: "Justificativa",
    descricao: "",
    arquivo_url: "",
  });

  const loadData = async () => {
    setLoading(true);
    let query = supabase
      .from("ponto_inconsistencias")
      .select("*, funcionarios(nome, cargo), obras(nome)")
      .order("data_referencia", { ascending: false });

    if (filterStatus) query = query.eq("status", filterStatus);
    if (filterTipo) query = query.eq("tipo", filterTipo);
    if (selectedObra) query = query.eq("obra_id", selectedObra);

    const { data } = await query;
    if (data) setInconsistencias(data);
    
    const { data: obs } = await supabase.from("obras").select("id, nome").eq("status", "em_andamento");
    if (obs) setObras(obs);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterTipo, selectedObra]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("ponto_inconsistencias")
      .update({ status: "resolvida", resolvida_em: new Date().toISOString() })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inconsistência resolvida" });
      loadData();
    }
  };

  const handleJustify = async () => {
    if (!selectedInc || !justification.descricao) return;

    try {
      const { error: incError } = await supabase
        .from("ponto_inconsistencias")
        .update({ status: "justificada" })
        .eq("id", selectedInc.id);

      if (incError) throw incError;

      let tipoEnum = "outro";
      if (justification.tipo.includes("Atestado")) tipoEnum = "atestado";
      else if (justification.tipo.includes("Folga")) tipoEnum = "folga";

      const { error: justError } = await supabase
        .from("justificativas_ponto")
        .insert({
          funcionario_id: selectedInc.funcionario_id,
          data_ocorrencia: selectedInc.data_referencia,
          tipo: tipoEnum,
          descricao: `[${justification.tipo}] ${justification.descricao}`,
          anexo_url: justification.arquivo_url || null,
          status: "pendente",
        });

      if (justError) throw justError;

      toast({ title: "Justificativa enviada" });
      setJustifyOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "batida_faltando": return { label: "Batida Faltando", color: "text-warning bg-warning/10" };
      case "falta_injustificada": return { label: "Falta Injustificada", color: "text-destructive bg-destructive/10" };
      case "pis_desconhecido": return { label: "PIS Desconhecido", color: "text-blue-500 bg-blue-500/10" };
      case "deslocamento": return { label: "Deslocamento", color: "text-muted-foreground bg-muted" };
      default: return { label: tipo, color: "text-muted-foreground bg-muted" };
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel de Inconsistências</h1>
            <p className="text-sm text-muted-foreground">Tratamento de ocorrências e justificativas de ponto</p>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-destructive">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Faltas em Aberto</p>
            <p className="text-2xl font-bold text-destructive">
              {inconsistencias.filter(i => i.tipo === "falta_injustificada" && i.status === "aberta").length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-warning">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Batidas Faltando</p>
            <p className="text-2xl font-bold text-warning">
              {inconsistencias.filter(i => i.tipo === "batida_faltando" && i.status === "aberta").length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">PIS Desconhecidos</p>
            <p className="text-2xl font-bold text-blue-500">
              {inconsistencias.filter(i => i.tipo === "pis_desconhecido" && i.status === "aberta").length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Pendente</p>
            <p className="text-2xl font-bold">
              {inconsistencias.filter(i => i.status === "aberta").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border bg-card/50">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Status</Label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">Todos os Status</option>
              <option value="aberta">Aberta</option>
              <option value="justificada">Justificada</option>
              <option value="resolvida">Resolvida</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Tipo de Ocorrência</Label>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">Todos os Tipos</option>
              <option value="batida_faltando">Batida Faltando</option>
              <option value="falta_injustificada">Falta Injustificada</option>
              <option value="pis_desconhecido">PIS Desconhecido</option>
              <option value="deslocamento">Deslocamento</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Obra</Label>
            <select value={selectedObra} onChange={e => setSelectedObra(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">Todas as Obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário / Obra</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inconsistencias.map((inc) => {
                const style = getTipoLabel(inc.tipo);
                return (
                  <tr key={inc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold">{format(parseISO(inc.data_referencia), "dd/MM", { locale: ptBR })}</div>
                      <div className="text-[10px] text-muted-foreground">{format(parseISO(inc.data_referencia), "yyyy")}</div>
                    </td>
                    <td className="px-4 py-4">
                      {inc.funcionarios ? (
                        <>
                          <div className="font-bold">{inc.funcionarios.nome}</div>
                          <div className="text-xs text-muted-foreground">{inc.obras?.nome}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-blue-500 italic">PIS: {inc.pis_desconhecido}</div>
                          <div className="text-xs text-muted-foreground">{inc.obras?.nome}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.color}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs max-w-xs truncate" title={inc.descricao}>
                      {inc.descricao}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {inc.status === "aberta" ? (
                          <span className="flex items-center gap-1 text-destructive font-bold text-xs"><AlertCircle className="h-3 w-3" /> Aberta</span>
                        ) : inc.status === "justificada" ? (
                          <span className="flex items-center gap-1 text-warning font-bold text-xs"><Clock className="h-3 w-3" /> Justificada</span>
                        ) : (
                          <span className="flex items-center gap-1 text-success font-bold text-xs"><CheckCircle2 className="h-3 w-3" /> Resolvida</span>
                        )}
                        {inc.prazo_resolucao && inc.status === "aberta" && (
                          <span className="text-[9px] text-muted-foreground">Prazo: {format(parseISO(inc.prazo_resolucao), "dd/MM HH:mm")}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {inc.status === "aberta" && (
                          <>
                            {inc.tipo === "pis_desconhecido" ? (
                              <Button size="sm" variant="outline" className="h-8 gap-1 border-blue-500 text-blue-500 hover:bg-blue-500/10">
                                <UserPlus className="h-3.5 w-3.5" /> Vincular
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedInc(inc); setJustifyOpen(true); }} className="h-8 gap-1">
                                <FileText className="h-3.5 w-3.5" /> Justificar
                              </Button>
                            )}
                            <Button size="sm" onClick={() => handleApprove(inc.id)} className="h-8 gap-1 bg-success hover:bg-success/90">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
                            </Button>
                          </>
                        )}
                        {inc.status === "justificada" && (
                          <Button size="sm" variant="secondary" className="h-8 gap-1">
                            <Eye className="h-3.5 w-3.5" /> Ver Justif.
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {inconsistencias.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4 opacity-20" />
                    Nenhuma inconsistência pendente com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Justificar */}
      <Dialog open={justifyOpen} onOpenChange={setJustifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificar Ocorrência</DialogTitle>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-bold text-muted-foreground uppercase">{selectedInc.tipo}</p>
                <p className="font-bold">{selectedInc.funcionarios?.nome}</p>
                <p className="text-xs">{format(parseISO(selectedInc.data_referencia), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Justificativa</Label>
                <select 
                  value={justification.tipo}
                  onChange={e => setJustification({ ...justification, tipo: e.target.value })}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="Atestado Médico">Atestado Médico</option>
                  <option value="Justificativa Manual">Justificativa Manual</option>
                  <option value="Erro de Equipamento">Erro de Equipamento</option>
                  <option value="Folga / Compensação">Folga / Compensação</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Descrição / Observações</Label>
                <textarea 
                  value={justification.descricao}
                  onChange={e => setJustification({ ...justification, descricao: e.target.value })}
                  className="w-full min-h-[100px] rounded-md border bg-background p-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder="Explique o motivo..."
                />
              </div>

              <div className="space-y-2">
                <Label>Anexo (PDF ou Imagem)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <p className="text-xs text-muted-foreground">Clique para fazer upload do comprovante</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setJustifyOpen(false)}>Cancelar</Button>
            <Button onClick={handleJustify}>Salvar Justificativa</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
