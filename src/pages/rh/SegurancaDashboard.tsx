import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Shield, Search, FileText, Download, CalendarRange, Clock, Edit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { calcularVencimento, diasRestantes, verificarAlertas } from "@/utils/seguranca";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

export default function SegurancaDashboard() {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<any[]>([]);
  const [clinicas, setClinicas] = useState<any[]>([]);
  
  // Filtros
  const [filterObra, setFilterObra] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  // Cards
  const [counters, setCounters] = useState({ vencidos: 0, v7: 0, v30: 0, vigente: 0 });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({
    id: null,
    funcionario_id: "",
    funcionario_nome: "",
    tipo: "",
    subtipo: "periodico",
    data_realizacao: new Date().toISOString().split("T")[0],
    clinica_id: "",
    arquivo: null as File | null,
    observacoes: ""
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterObra, filterTipo, filterStatus]);

  const loadData = async () => {
    setLoading(true);

    // 1. Obras e Clinicas
    const [{ data: obs }, { data: clins }] = await Promise.all([
      supabase.from("obras").select("id, nome").in("status", ["em_andamento", "em_execucao", "ativa"]),
      supabase.from("seguranca_clinicas").select("id, nome").eq("ativo", true)
    ]);
    if (obs) setObras(obs);
    if (clins) setClinicas(clins);

    // 2. Documentos
    let query = supabase
      .from("seguranca_documentos")
      .select("*, funcionarios!inner(nome, cpf), obras(nome), seguranca_clinicas(nome)")
      .order("data_vencimento", { ascending: true });

    if (filterObra) query = query.eq("obra_id", filterObra);
    if (filterTipo) query = query.eq("tipo", filterTipo);
    if (filterStatus) query = query.eq("status", filterStatus);

    const { data } = await query;
    if (data) {
      // Filtrar apenas o MAIS RECENTE por funcionario + tipo (se o status geral não for filtrado)
      // Se tiver pesquisa, podemos querer ver o histórico? A instrução diz "A tabela considera APENAS o documento mais recente"
      const recentesMap = new Map();
      data.forEach(d => {
        const key = `${d.funcionario_id}_${d.tipo}`;
        if (!recentesMap.has(key)) recentesMap.set(key, d);
        else {
          const old = recentesMap.get(key);
          if (new Date(d.data_vencimento) > new Date(old.data_vencimento)) {
            recentesMap.set(key, d);
          }
        }
      });
      const filteredRecentes = Array.from(recentesMap.values());
      setDocumentos(filteredRecentes);

      // Calcular contadores totais (sem filtros)
      if (!filterObra && !filterTipo && !filterStatus) {
        let v = 0, v7 = 0, v30 = 0, vig = 0;
        filteredRecentes.forEach(d => {
           const dr = diasRestantes(new Date(d.data_vencimento + "T12:00:00"));
           if (dr < 0) v++;
           else if (dr <= 7) v7++;
           else if (dr <= 30) v30++;
           else vig++;
        });
        setCounters({ vencidos: v, v7, v30, vigente: vig });
      }
    }
    setLoading(false);
  };

  const handleVerPDF = async (filePath: string) => {
    if (!filePath) {
      toast({ title: "Arquivo não encontrado", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.storage.from("documentos-seguranca").createSignedUrl(filePath, 3600);
    if (error || !data) {
      toast({ title: "Erro ao gerar link do PDF", description: error?.message, variant: "destructive" });
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleOpenModal = (doc: any, mode: "renovar" | "editar") => {
    if (mode === "renovar") {
      setForm({
        id: null,
        funcionario_id: doc.funcionario_id,
        funcionario_nome: doc.funcionarios?.nome,
        obra_id: doc.obra_id,
        tipo: doc.tipo,
        subtipo: doc.tipo === "ASO" ? "periodico" : null,
        data_realizacao: new Date().toISOString().split("T")[0],
        clinica_id: "",
        arquivo: null,
        observacoes: ""
      });
    } else {
      setForm({
        id: doc.id,
        funcionario_id: doc.funcionario_id,
        funcionario_nome: doc.funcionarios?.nome,
        obra_id: doc.obra_id,
        tipo: doc.tipo,
        subtipo: doc.subtipo || "periodico",
        data_realizacao: doc.data_realizacao,
        clinica_id: doc.clinica_id || "",
        arquivo: null,
        observacoes: doc.observacoes || ""
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.data_realizacao) {
       toast({ title: "Data obrigatória", variant: "destructive" });
       return;
    }
    const dataRealizacao = new Date(form.data_realizacao + "T12:00:00");
    const dataVencimento = calcularVencimento(form.tipo, dataRealizacao);
    
    try {
      let arquivo_url = undefined;

      if (form.arquivo) {
        toast({ title: "Fazendo upload..." });
        const fileExt = form.arquivo.name.split('.').pop() || "pdf";
        const fileName = `${form.funcionario_id}/${form.tipo}/${Date.now()}_doc.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("documentos-seguranca").upload(fileName, form.arquivo);
        if (uploadError) throw uploadError;
        arquivo_url = fileName;
      } else if (!form.id) {
        toast({ title: "PDF é obrigatório para novos registros", variant: "destructive" });
        return;
      }

      const payload = {
        funcionario_id: form.funcionario_id,
        obra_id: form.obra_id,
        clinica_id: form.clinica_id || null,
        tipo: form.tipo,
        subtipo: form.tipo === "ASO" ? form.subtipo : null,
        data_realizacao: form.data_realizacao,
        data_vencimento: dataVencimento.toISOString().split("T")[0],
        observacoes: form.observacoes || null,
        ...(arquivo_url ? { arquivo_url } : {})
      };

      if (form.id) {
        // Editar
        const { error } = await supabase.from("seguranca_documentos").update(payload).eq("id", form.id);
        if (error) throw error;
        toast({ title: "Documento atualizado" });
      } else {
        // Inserir novo (renovação)
        const { error } = await supabase.from("seguranca_documentos").insert(payload);
        if (error) throw error;
        toast({ title: "Documento renovado com sucesso" });
      }

      setModalOpen(false);
      loadData();
      verificarAlertas(); // Roda o motor em background
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const filteredDocs = documentos.filter(d => 
    !search || d.funcionarios?.nome.toLowerCase().includes(search.toLowerCase()) || d.funcionarios?.cpf.includes(search)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel de Segurança e NRs</h1>
          <p className="text-sm text-muted-foreground">Gestão Eletrônica de Documentos de Segurança (ASO, NR6, NR12, NR18, NR35)</p>
        </div>

        {/* Bloco 1: Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div onClick={() => setFilterStatus("vencido")} className="cursor-pointer rounded-xl border bg-destructive/10 p-4 shadow-sm hover:border-destructive transition-colors">
            <p className="text-[10px] text-destructive uppercase font-bold flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Vencidos</p>
            <p className="text-2xl font-bold text-destructive">{counters.vencidos}</p>
          </div>
          <div onClick={() => setFilterStatus("a_vencer")} className="cursor-pointer rounded-xl border bg-warning/20 p-4 shadow-sm hover:border-warning transition-colors">
            <p className="text-[10px] text-warning uppercase font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> Vence em 7 dias</p>
            <p className="text-2xl font-bold text-warning">{counters.v7}</p>
          </div>
          <div onClick={() => setFilterStatus("a_vencer")} className="cursor-pointer rounded-xl border bg-yellow-500/10 p-4 shadow-sm hover:border-yellow-500 transition-colors">
            <p className="text-[10px] text-yellow-600 uppercase font-bold flex items-center gap-1"><CalendarRange className="h-3 w-3" /> Vence em 30 dias</p>
            <p className="text-2xl font-bold text-yellow-600">{counters.v30}</p>
          </div>
          <div onClick={() => setFilterStatus("vigente")} className="cursor-pointer rounded-xl border bg-success/10 p-4 shadow-sm hover:border-success transition-colors">
            <p className="text-[10px] text-success uppercase font-bold flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Em Dia</p>
            <p className="text-2xl font-bold text-success">{counters.vigente}</p>
          </div>
        </div>

        {/* Bloco 2: Filtros */}
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border bg-card/50">
          <div className="relative flex-1 min-w-[200px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar Funcionário</Label>
            <Search className="absolute left-3 top-8 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou CPF..." className="w-full h-9 rounded-md border bg-background pl-9 pr-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Obra</Label>
            <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              <option value="">Todas as Obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Tipo</Label>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              <option value="">Todos</option>
              <option value="ASO">ASO</option>
              <option value="NR6">NR6</option>
              <option value="NR12">NR12</option>
              <option value="NR18">NR18</option>
              <option value="NR35">NR35</option>
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Status</Label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              <option value="">Todos</option>
              <option value="vigente">Em Dia</option>
              <option value="a_vencer">A Vencer</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          {(filterObra || filterTipo || filterStatus) && (
            <div className="flex items-end">
              <Button variant="ghost" className="h-9" onClick={() => { setFilterObra(""); setFilterTipo(""); setFilterStatus(""); }}>Limpar</Button>
            </div>
          )}
        </div>

        {/* Bloco 3: Tabela */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário / Obra</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo/Subtipo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Realizado / Clínica</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Vencimento</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Dias</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDocs.map((doc) => {
                  const dias = diasRestantes(new Date(doc.data_vencimento + "T12:00:00"));
                  let diasClass = "text-success";
                  let diasText = `${dias} dias`;
                  if (dias < 0) {
                    diasClass = "text-destructive font-bold";
                    diasText = `Vencido há ${Math.abs(dias)} dias`;
                  } else if (dias <= 7) {
                    diasClass = "text-warning font-bold";
                  } else if (dias <= 30) {
                    diasClass = "text-yellow-600";
                  }

                  let statusBadge = { bg: "bg-success/10", text: "text-success", label: "Em Dia" };
                  if (doc.status === "vencido") statusBadge = { bg: "bg-destructive/10", text: "text-destructive", label: "Vencido" };
                  else if (doc.status === "a_vencer") statusBadge = { bg: "bg-warning/10", text: "text-warning", label: "A Vencer" };

                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <Link to={`/rh/seguranca/funcionario/${doc.funcionario_id}`} className="font-bold hover:text-primary hover:underline transition-colors">
                          {doc.funcionarios?.nome}
                        </Link>
                        <div className="text-[10px] text-muted-foreground">{doc.obras?.nome || "Sem obra vinculada"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold uppercase tracking-wider text-xs">{doc.tipo}</div>
                        {doc.subtipo && <div className="text-[10px] text-muted-foreground capitalize">{doc.subtipo}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-xs">{new Date(doc.data_realizacao + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                        <div className="text-[10px] text-muted-foreground">{doc.seguranca_clinicas?.nome || "—"}</div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium">
                        {new Date(doc.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className={`px-4 py-4 text-center text-xs ${diasClass}`}>
                        {diasText}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleVerPDF(doc.arquivo_url)} title="Ver PDF" className="h-8 w-8 text-primary hover:bg-primary/10">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleOpenModal(doc, "renovar")} title="Renovar (Novo Registro)" className="h-8 w-8 text-warning hover:bg-warning/10">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleOpenModal(doc, "editar")} title="Editar Atual" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDocs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                      Nenhum documento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Documento" : "Renovar Documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm mb-2">
              <p><strong>Funcionário:</strong> {form.funcionario_nome}</p>
              <p><strong>Documento:</strong> {form.tipo} {form.subtipo ? `(${form.subtipo})` : ""}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nova Data Realização *</label>
                <input type="date" value={form.data_realizacao} onChange={e => setForm({ ...form, data_realizacao: e.target.value })} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vencimento (Auto)</label>
                <input 
                  type="text" readOnly 
                  className="w-full rounded-lg border bg-muted py-2 px-3 text-sm text-muted-foreground font-medium"
                  value={form.data_realizacao ? calcularVencimento(form.tipo, new Date(form.data_realizacao + "T12:00:00")).toLocaleDateString("pt-BR") : ""} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Clínica</label>
              <select value={form.clinica_id} onChange={e => setForm({ ...form, clinica_id: e.target.value })} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{form.id ? "Substituir PDF (Opcional)" : "Upload do Novo PDF *"}</label>
              <input type="file" accept=".pdf" onChange={e => setForm({ ...form, arquivo: e.target.files?.[0] })} className="w-full text-sm" />
            </div>

          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
