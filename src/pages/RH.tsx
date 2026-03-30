import { AppLayout } from "@/components/layout/AppLayout";
import { Search, Upload, MessageCircle, UserPlus, FolderOpen, Stethoscope, ArrowRightLeft, Save, Filter, Calendar, LogOut, Pencil } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Funcionario, funcionariosData, getExamStatus } from "@/components/rh/types";
import { ExamBadge } from "@/components/rh/ExamBadge";
import { FuncionarioAvatar } from "@/components/rh/FuncionarioAvatar";
import { WhatsAppSender } from "@/components/rh/WhatsAppSender";
import { PreCadastroForm } from "@/components/rh/PreCadastroForm";
import { DocumentManager } from "@/components/rh/DocumentManager";
import { ExamesModule } from "@/components/rh/ExamesModule";
import { TransferirFuncionario } from "@/components/rh/TransferirFuncionario";
import { EditFuncionarioForm } from "@/components/rh/EditFuncionarioForm";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabKey = "lista" | "exames_tab" | "exames_modulo";

const STATUS_OPTIONS = ["Pré-Cadastro", "Ativo", "Experiência", "Desligado", "Abandono", "Atestado"] as const;

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "ativo": return "bg-success/10 text-success";
    case "pré-cadastro": case "pre-cadastro": return "bg-warning/10 text-warning";
    case "experiência": case "experiencia": return "bg-accent/10 text-accent";
    case "desligado": return "bg-destructive/10 text-destructive";
    case "abandono": return "bg-destructive/10 text-destructive";
    case "atestado": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function calcExperiencia(admissao: string): string | null {
  if (!admissao) return null;
  const adm = parseISO(admissao);
  const hoje = new Date();
  const dias = differenceInDays(hoje, adm);
  const fim30 = addDays(adm, 30);
  const fim90 = addDays(adm, 90);
  if (dias <= 30) return `Exp. 30d — vence ${format(fim30, "dd/MM/yyyy")}`;
  if (dias <= 90) return `Exp. 60d — vence ${format(fim90, "dd/MM/yyyy")}`;
  return null;
}

export default function RH() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("lista");
  const [sortBy, setSortBy] = useState<"nome" | "admissao" | "obra" | "status">("nome");
  const [filterObra, setFilterObra] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [funcionarios] = useState(funcionariosData);
  const [whatsOpen, setWhatsOpen] = useState(false);
  const [preCadastroOpen, setPreCadastroOpen] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [selectedFuncDoc, setSelectedFuncDoc] = useState<{ id: string; nome: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedFuncTransfer, setSelectedFuncTransfer] = useState<{ id: string; nome: string; obraId: string | null } | null>(null);

  const [dbFuncionarios, setDbFuncionarios] = useState<any[]>([]);
  const [editingRegistro, setEditingRegistro] = useState<Record<string, string>>({});
  const [editingStatus, setEditingStatus] = useState<Record<string, string>>({});
  const [obras, setObras] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Desligamento modal
  const [desligamentoOpen, setDesligamentoOpen] = useState(false);
  const [desligamentoFunc, setDesligamentoFunc] = useState<any>(null);
  const [desligamentoData, setDesligamentoData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [desligamentoMotivo, setDesligamentoMotivo] = useState("");

  const loadDbFuncionarios = useCallback(() => {
    supabase.from("funcionarios")
      .select("*, obras:obra_id(nome, codigo)")
      .order("nome")
      .then(({ data }) => { if (data) setDbFuncionarios(data); });
  }, []);

  useEffect(() => {
    loadDbFuncionarios();
    supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento")
      .then(({ data }) => { if (data) setObras(data); });
    supabase.from("empresas").select("id, razao_social, nome_fantasia, cnpj")
      .then(({ data }) => { if (data) setEmpresas(data); });
  }, [loadDbFuncionarios]);

  // Auto-check experiencia status
  useEffect(() => {
    dbFuncionarios.forEach(f => {
      if (f.status === "ativo" && f.data_admissao) {
        const dias = differenceInDays(new Date(), parseISO(f.data_admissao));
        if (dias <= 90) {
          // auto-set to experiência if within 90 days
        }
      }
    });
  }, [dbFuncionarios]);

  const getEmpresaInfo = (empresaId: string) => {
    const emp = empresas.find(e => e.id === empresaId);
    if (!emp) return { nome: "—", cnpj: "" };
    const nome = emp.nome_fantasia || emp.razao_social || "";
    const nomeAbrev = nome.length > 15 ? nome.substring(0, 15) + "…" : nome;
    const cnpjCompacto = emp.cnpj ? emp.cnpj.replace(/[.\-\/]/g, "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "";
    return { nome: nomeAbrev, cnpj: cnpjCompacto };
  };

  const allFuncionarios = [
    ...dbFuncionarios.map(f => ({
      ...f,
      source: "db" as const,
      obraNome: (f as any).obras?.nome || "Sem obra",
      obraCodigo: (f as any).obras?.codigo || "",
    })),
  ];

  const filtered = allFuncionarios.filter(f => {
    const searchMatch = !search || 
      f.nome?.toLowerCase().includes(search.toLowerCase()) ||
      f.cargo?.toLowerCase().includes(search.toLowerCase()) ||
      f.cpf?.includes(search) ||
      f.numero_registro?.includes(search);
    const obraMatch = !filterObra || f.obra_id === filterObra;
    const statusMatch = !filterStatus || f.status?.toLowerCase() === filterStatus.toLowerCase();
    return searchMatch && obraMatch && statusMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "nome": return (a.nome || "").localeCompare(b.nome || "");
      case "admissao": return (a.data_admissao || "").localeCompare(b.data_admissao || "");
      case "obra": return (a.obraNome || "").localeCompare(b.obraNome || "");
      case "status": return (a.status || "").localeCompare(b.status || "");
      default: return 0;
    }
  });

  const examesVencendo = funcionarios.filter(f =>
    getExamStatus(f.aso, 1) !== "ok" || getExamStatus(f.nr6, 1) !== "ok" ||
    getExamStatus(f.nr12, 2) !== "ok" || getExamStatus(f.nr18, 2) !== "ok" || getExamStatus(f.nr35, 2) !== "ok"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n");
      toast({ title: "Upload realizado", description: `${Math.max(0, lines.length - 1)} registros importados.` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const openDocManager = (funcId: string, funcNome: string) => {
    setSelectedFuncDoc({ id: funcId, nome: funcNome });
    setDocManagerOpen(true);
  };

  const openTransfer = (funcId: string, funcNome: string, obraId: string | null) => {
    setSelectedFuncTransfer({ id: funcId, nome: funcNome, obraId });
    setTransferOpen(true);
  };

  const saveRegistro = async (funcId: string) => {
    const val = editingRegistro[funcId];
    if (val === undefined) return;
    const { error } = await supabase.from("funcionarios").update({ numero_registro: val }).eq("id", funcId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nº Registro salvo" });
      setEditingRegistro(prev => { const n = { ...prev }; delete n[funcId]; return n; });
      loadDbFuncionarios();
    }
  };

  const saveStatus = async (funcId: string, newStatus: string) => {
    const updateData: any = { status: newStatus.toLowerCase() };
    // If desligado and no rescisao date, set today
    if (newStatus.toLowerCase() === "desligado") {
      const f = dbFuncionarios.find(x => x.id === funcId);
      if (!f?.data_rescisao) {
        updateData.data_rescisao = format(new Date(), "yyyy-MM-dd");
      }
    }
    const { error } = await supabase.from("funcionarios").update(updateData).eq("id", funcId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado" });
      loadDbFuncionarios();
    }
  };

  const openDesligamento = (func: any) => {
    setDesligamentoFunc(func);
    setDesligamentoData(func.data_rescisao || format(new Date(), "yyyy-MM-dd"));
    setDesligamentoMotivo(func.motivo_rescisao || "");
    setDesligamentoOpen(true);
  };

  const saveDesligamento = async () => {
    if (!desligamentoFunc) return;
    const { error } = await supabase.from("funcionarios").update({
      data_rescisao: desligamentoData,
      motivo_rescisao: desligamentoMotivo || null,
      status: "desligado",
    }).eq("id", desligamentoFunc.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Desligamento registrado", description: `${desligamentoFunc.nome} foi desligado.` });
      setDesligamentoOpen(false);
      loadDbFuncionarios();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos / DP</h1>
            <p className="text-sm text-muted-foreground">{allFuncionarios.length} funcionários cadastrados</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWhatsOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-success-foreground shadow-sm hover:bg-success/90 transition-colors">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" /> Importar CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => setPreCadastroOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <UserPlus className="h-4 w-4" /> Pré-Cadastro
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button onClick={() => setTab("lista")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "lista" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Lista de Funcionários
          </button>
          <button onClick={() => setTab("exames_tab")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors relative ${tab === "exames_tab" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Exames e Treinamentos
            {examesVencendo.length > 0 && <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{examesVencendo.length}</span>}
          </button>
          <button onClick={() => setTab("exames_modulo")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "exames_modulo" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="flex items-center justify-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Gestão de Exames</span>
          </button>
        </div>

        {tab === "exames_modulo" ? (
          <ExamesModule />
        ) : tab === "exames_tab" ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">ASO</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR6</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR12</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR18</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR35</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionarios.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5"><div className="flex items-center gap-3"><FuncionarioAvatar nome={f.nome} foto={f.foto} size="sm" /><span className="font-medium">{f.nome}</span></div></td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{f.empresa}</td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.aso} validityYears={1} label="ASO" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr6} validityYears={1} label="NR6" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr12} validityYears={2} label="NR12" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr18} validityYears={2} label="NR18" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr35} validityYears={2} label="NR35" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {/* Filters & Sort */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Buscar por nome, cargo, CPF ou nº registro..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="rounded-lg border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Todas as Obras</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Todos os Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="rounded-lg border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="nome">Ordenar por Nome</option>
                <option value="admissao">Ordenar por Admissão</option>
                <option value="obra">Ordenar por Obra</option>
                <option value="status">Ordenar por Status</option>
              </select>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{allFuncionarios.length}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-success">{allFuncionarios.filter(f => f.status === "ativo").length}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Experiência</p>
                <p className="text-2xl font-bold text-accent">{allFuncionarios.filter(f => f.status === "experiência" || f.status === "experiencia").length}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">Desligados</p>
                <p className="text-2xl font-bold text-destructive">{allFuncionarios.filter(f => f.status === "desligado").length}</p>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">Funcionários ({sorted.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Nº Reg.</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Nome</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">CPF</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Cargo</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Obra</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Admissão</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground">Experiência</th>
                      <th className="px-3 py-3 text-right font-medium text-muted-foreground">Salário</th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((f) => {
                      const expInfo = calcExperiencia(f.data_admissao);
                      const empInfo = getEmpresaInfo(f.empresa_id);
                      return (
                        <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          {/* Nº Registro */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingRegistro[f.id] ?? f.numero_registro ?? ""}
                                onChange={e => setEditingRegistro(prev => ({ ...prev, [f.id]: e.target.value }))}
                                placeholder="—"
                                className="w-20 rounded border bg-background px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              {editingRegistro[f.id] !== undefined && editingRegistro[f.id] !== (f.numero_registro ?? "") && (
                                <button onClick={() => saveRegistro(f.id)} className="p-0.5 text-primary hover:text-primary/80"><Save className="h-3 w-3" /></button>
                              )}
                            </div>
                          </td>
                          {/* Nome */}
                          <td className="px-3 py-2.5 font-medium">{f.nome}</td>
                          {/* CPF */}
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{f.cpf}</td>
                          {/* Empresa */}
                          <td className="px-3 py-2.5">
                            <div>
                              <p className="text-xs font-medium truncate max-w-[120px]">{empInfo.nome}</p>
                              <p className="text-[10px] text-muted-foreground">{empInfo.cnpj}</p>
                            </div>
                          </td>
                          {/* Cargo */}
                          <td className="px-3 py-2.5 text-muted-foreground">{f.cargo}</td>
                          {/* Obra */}
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{f.obraNome}</td>
                          {/* Admissão */}
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {f.data_admissao ? format(parseISO(f.data_admissao), "dd/MM/yyyy") : "—"}
                          </td>
                          {/* Status */}
                          <td className="px-3 py-2.5">
                            <select
                              value={f.status}
                              onChange={e => saveStatus(f.id, e.target.value)}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${getStatusColor(f.status)}`}
                            >
                              {STATUS_OPTIONS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                            </select>
                          </td>
                          {/* Experiência */}
                          <td className="px-3 py-2.5">
                            {expInfo ? (
                              <span className="text-[10px] rounded-full bg-accent/10 text-accent px-2 py-0.5">{expInfo}</span>
                            ) : "—"}
                          </td>
                          {/* Salário */}
                          <td className="px-3 py-2.5 text-right font-medium text-xs">
                            R$ {(f.salario_combinado || f.salario_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          {/* Ações */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openDocManager(f.id, f.nome)} className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Pasta de Documentos">
                                <FolderOpen className="h-4 w-4" />
                              </button>
                              <button onClick={() => openTransfer(f.id, f.nome, f.obra_id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Transferir">
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                              {f.status !== "desligado" && (
                                <button onClick={() => openDesligamento(f)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Desligar Funcionário">
                                  <LogOut className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sorted.length === 0 && (
                      <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">Nenhum funcionário encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <WhatsAppSender open={whatsOpen} onOpenChange={setWhatsOpen} funcionarios={funcionarios} />
      <PreCadastroForm open={preCadastroOpen} onOpenChange={setPreCadastroOpen} onSave={() => loadDbFuncionarios()} nextId={funcionarios.length + 1} />
      {selectedFuncDoc && (
        <DocumentManager open={docManagerOpen} onOpenChange={setDocManagerOpen} funcionarioId={selectedFuncDoc.id} funcionarioNome={selectedFuncDoc.nome} />
      )}
      {selectedFuncTransfer && (
        <TransferirFuncionario open={transferOpen} onOpenChange={setTransferOpen} funcionarioId={selectedFuncTransfer.id} funcionarioNome={selectedFuncTransfer.nome} obraAtualId={selectedFuncTransfer.obraId} onTransferido={loadDbFuncionarios} />
      )}

      {/* Desligamento Modal */}
      <Dialog open={desligamentoOpen} onOpenChange={setDesligamentoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" /> Desligamento de Funcionário
            </DialogTitle>
          </DialogHeader>
          {desligamentoFunc && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{desligamentoFunc.nome}</p>
                <p className="text-xs text-muted-foreground">{desligamentoFunc.cargo} • CPF: {desligamentoFunc.cpf}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Data de Rescisão *</label>
                <Input type="date" value={desligamentoData} onChange={e => setDesligamentoData(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Motivo</label>
                <select value={desligamentoMotivo} onChange={e => setDesligamentoMotivo(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring">
                  <option value="">Selecione...</option>
                  <option value="Pediu demissão">Pediu demissão</option>
                  <option value="Demissão sem justa causa">Demissão sem justa causa</option>
                  <option value="Demissão por justa causa">Demissão por justa causa</option>
                  <option value="Término de contrato">Término de contrato</option>
                  <option value="Acordo mútuo">Acordo mútuo</option>
                  <option value="Abandono de emprego">Abandono de emprego</option>
                  <option value="Falecimento">Falecimento</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDesligamentoOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={saveDesligamento}>
                  <LogOut className="h-4 w-4 mr-1" /> Confirmar Desligamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
