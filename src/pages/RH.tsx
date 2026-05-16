import { AppLayout } from "@/components/layout/AppLayout";
import { Search, Upload, UserPlus, FolderOpen, Stethoscope, ArrowRightLeft, Save, Filter, Calendar, LogOut, Pencil, FileSpreadsheet, FileDown, Trash2, LayoutDashboard } from "lucide-react";
import { baixarModeloFuncionarios, importarPlanilhaFuncionarios } from "@/lib/funcionariosPlanilha";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Funcionario, funcionariosData, getExamStatus } from "@/components/rh/types";
import { ExamBadge } from "@/components/rh/ExamBadge";
import { FuncionarioAvatar } from "@/components/rh/FuncionarioAvatar";
import { PreCadastroForm } from "@/components/rh/PreCadastroForm";
import { DocumentManager } from "@/components/rh/DocumentManager";
import { ExamesModule } from "@/components/rh/ExamesModule";
import { GestaoPinsModule } from "@/components/rh/GestaoPinsModule";
import { TransferirFuncionario } from "@/components/rh/TransferirFuncionario";
import { EditFuncionarioForm } from "@/components/rh/EditFuncionarioForm";
import { MonitorAtividadesRH } from "@/components/rh/MonitorAtividadesRH";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

type TabKey = "lista" | "exames_tab" | "exames_modulo" | "gestao_pins" | "monitor";

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "ferias", label: "Férias" },
  { value: "afastado", label: "Afastado / Atestado" },
  { value: "abandono", label: "Abandono" },
  { value: "desligado", label: "Desligado" },
] as const;

function normalizeStatusForDb(status: string) {
  const s = String(status ?? "").toLowerCase().trim();
  if (["atestado", "afastado"].includes(s)) return "afastado";
  if (["desligado"].includes(s)) return "desligado";
  if (["abandono"].includes(s)) return "abandono";
  if (["ferias", "férias"].includes(s)) return "ferias";
  return "ativo";
}

function getStatusColor(status: string) {
  switch (normalizeStatusForDb(status)) {
    case "ativo": return "bg-success/10 text-success";
    case "ferias": return "bg-warning/10 text-warning";
    case "afastado": return "bg-muted text-muted-foreground";
    case "abandono": return "bg-[#F97316]/10 text-[#F97316]"; // Laranja para abandono
    case "desligado": return "bg-destructive/10 text-destructive";
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
  const [sortBy, setSortBy] = useState<"nome" | "admissao" | "obra" | "status" | "registro">("nome");
  const [editingExamFunc, setEditingExamFunc] = useState<any>(null);
  const [filterObra, setFilterObra] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [funcionarios] = useState(funcionariosData);
  const [preCadastroOpen, setPreCadastroOpen] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [selectedFuncDoc, setSelectedFuncDoc] = useState<{ id: string; nome: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedFuncTransfer, setSelectedFuncTransfer] = useState<{ id: string; nome: string; obraId: string | null } | null>(null);
  const [editFuncOpen, setEditFuncOpen] = useState(false);
  const [editFuncId, setEditFuncId] = useState<string>("");

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
    supabase.from("obras").select("id, nome, codigo, status")
      .in("status", ["em_andamento", "em_execucao", "ativa", "ativo"])
      .order("codigo")
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
      case "registro": {
        const na = parseInt(String(a.numero_registro || "").replace(/\D/g, ""), 10);
        const nb = parseInt(String(b.numero_registro || "").replace(/\D/g, ""), 10);
        if (isNaN(na) && isNaN(nb)) return 0;
        if (isNaN(na)) return 1;
        if (isNaN(nb)) return -1;
        return na - nb;
      }
      default: return 0;
    }
  });

  const saveExames = async (funcId: string, data: { data_aso?: string | null; data_nr6?: string | null; data_nr12?: string | null; data_nr18?: string | null; data_nr35?: string | null }) => {
    const { error } = await supabase.from("funcionarios").update(data).eq("id", funcId);
    if (error) {
      toast({ title: "Erro ao salvar exames", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Exames/Treinamentos atualizados" });
      setEditingExamFunc(null);
      loadDbFuncionarios();
    }
  };

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
    const statusDb = normalizeStatusForDb(newStatus);
    const updateData: any = { status: statusDb };
    // If desligado and no rescisao date, set today
    if (statusDb === "desligado") {
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

  const sendPortalInvite = (funcionario: any) => {
    if (!funcionario.telefone) {
      toast({ title: "Erro", description: "Funcionário sem telefone cadastrado.", variant: "destructive" });
      return;
    }
    
    const cleanPhone = funcionario.telefone.replace(/\D/g, "");
    const cleanCpf = (funcionario.cpf || "").replace(/\D/g, "");
    const url = "https://iuengenharia.lovable.app/login-portal";
    
    const message = `Olá *${funcionario.nome}*,\n\nEste é o seu link de acesso ao *Portal do Colaborador Irmãos Ubero*: ${url}\n\n*Seu Login:* ${cleanCpf}\n*Sua Senha (PIN):* Solicite ao RH seu código de 4 dígitos para o primeiro acesso.\n\n_Dica: Ao abrir o link no celular, clique em "Adicionar à tela de início" para instalar como aplicativo._`;
    
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
    toast({ title: "Convite preparado", description: "Redirecionando para o WhatsApp..." });
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
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" /> Importar CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <button
              onClick={async () => {
                try {
                  await baixarModeloFuncionarios();
                  toast({ title: "Modelo gerado", description: "Arquivo .xlsx baixado." });
                } catch (e: any) {
                  toast({ title: "Erro", description: e?.message ?? "Falha ao gerar modelo", variant: "destructive" });
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              title="Baixar planilha modelo (.xlsx) limpa, sem funcionários antigos"
            >
              <FileDown className="h-4 w-4" /> Baixar Modelo
            </button>
            <button
              onClick={() => xlsxInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-success/90 px-4 py-2.5 text-sm font-medium text-success-foreground shadow-sm hover:bg-success transition-colors"
              title="Importar planilha .xlsx para criar/atualizar funcionários"
            >
              <FileSpreadsheet className="h-4 w-4" /> Importar Planilha
            </button>
            <button
              onClick={async () => {
                if (!window.confirm("TEM CERTEZA QUE DESEJA APAGAR TODOS OS FUNCIONÁRIOS DO BANCO? Isso não pode ser desfeito.")) return;
                toast({ title: "Apagando...", description: "Por favor, aguarde." });
                try {
                  // Apaga primeiro tabelas dependentes (se houver) para evitar erro de chave estrangeira
                  await supabase.from("folhas_pagamento").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                  
                  // Apaga os funcionários
                  const { error } = await supabase.from("funcionarios").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                  
                  if (error) throw error;
                  toast({ title: "Banco limpo!", description: "A tabela de funcionários foi completamente zerada." });
                  window.location.reload();
                } catch (e: any) {
                  toast({ title: "Erro ao limpar", description: e?.message ?? String(e), variant: "destructive" });
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors animate-pulse"
              title="Apagar TODOS os funcionários do banco de dados (CUIDADO)"
            >
              <Trash2 className="h-4 w-4" /> Limpar Banco
            </button>
            <input
              ref={xlsxInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";

                // Pergunta o MODO de importação para evitar duplicatas
                const escolha = window.prompt(
                  "Como deseja importar a planilha?\n\n" +
                  "O sistema compara por CPF, Nº Reg e Nome + Nascimento para evitar duplicados.\n\n" +
                  "1 = ATUALIZAR funcionários existentes E criar novos (padrão)\n" +
                  "2 = APENAS ATUALIZAR funcionários já cadastrados (não cria nada novo)\n" +
                  "3 = APENAS CRIAR novos (pula quem já existe)\n\n" +
                  "Digite 1, 2 ou 3:",
                  "1",
                );
                if (escolha === null) return; // cancelou
                const modo: "atualizar_e_criar" | "atualizar_somente" | "criar_somente" =
                  escolha.trim() === "2" ? "atualizar_somente"
                  : escolha.trim() === "3" ? "criar_somente"
                  : "atualizar_e_criar";

                const labelModo =
                  modo === "atualizar_somente" ? "Apenas atualização"
                  : modo === "criar_somente" ? "Apenas novos"
                  : "Atualizar + criar novos";

                toast({ title: `Importando (${labelModo})...`, description: "Processando planilha, aguarde." });
                try {
                  const r = await importarPlanilhaFuncionarios(file, modo);
                  setSearch("");
                  setFilterObra("");
                  setFilterStatus("");
                  setSortBy("nome");
                  setTab("lista");
                  loadDbFuncionarios();
                  const msg =
                    `${r.criados} criados, ${r.atualizados} atualizados, ` +
                    `${r.pulados_existentes} pulados, ${r.ignorados} ignorados (de ${r.total}).`;
                  if (r.erros.length > 0) {
                    console.warn("Erros de importação:", r.erros);
                    toast({
                      title: "Importação concluída com avisos",
                      description: msg + ` ${r.erros.length} erro(s) — veja o console.`,
                      variant: r.criados + r.atualizados === 0 ? "destructive" : "default",
                    });
                  } else {
                    toast({ title: `Importação concluída — ${labelModo}`, description: msg });
                  }
                } catch (err: any) {
                  toast({ title: "Erro na importação", description: err?.message ?? String(err), variant: "destructive" });
                }
              }}
            />
            <button onClick={() => setPreCadastroOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <UserPlus className="h-4 w-4" /> Pré-Cadastro
            </button>
          </div>
        </div>

        {/* Quick Actions - Ações Rápidas do RH (Master Design) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div onClick={() => setPreCadastroOpen(true)} className="group bg-card hover:bg-primary/5 cursor-pointer border-2 border-transparent hover:border-primary/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <UserPlus size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Onboarding</p>
              <p className="text-[10px] text-muted-foreground">Novo Contratado</p>
            </div>
          </div>
          
          <div onClick={() => setTab("exames_modulo")} className="group bg-card hover:bg-warning/5 cursor-pointer border-2 border-transparent hover:border-warning/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95">
            <div className="h-12 w-12 bg-warning/10 rounded-xl flex items-center justify-center text-warning group-hover:scale-110 transition-transform">
              <Stethoscope size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Gestão ASO</p>
              <p className="text-[10px] text-muted-foreground">Exames e Prazos</p>
            </div>
          </div>

          <div onClick={() => setTab("exames_tab")} className="group bg-card hover:bg-accent/5 cursor-pointer border-2 border-transparent hover:border-accent/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95">
            <div className="h-12 w-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              <FolderOpen size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Documentos</p>
              <p className="text-[10px] text-muted-foreground">Digitalização</p>
            </div>
          </div>

          <div onClick={() => setTab("gestao_pins")} className="group bg-card hover:bg-blue-500/5 cursor-pointer border-2 border-transparent hover:border-blue-500/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95">
            <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <LayoutDashboard size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Portal Colaborador</p>
              <p className="text-[10px] text-muted-foreground">Gestão de Acessos</p>
            </div>
          </div>

          <div onClick={() => setTab("monitor")} className="group bg-card hover:bg-success/5 cursor-pointer border-2 border-transparent hover:border-success/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95">
            <div className="h-12 w-12 bg-success/10 rounded-xl flex items-center justify-center text-success group-hover:scale-110 transition-transform">
              <LayoutDashboard size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Monitor/Mural</p>
              <p className="text-[10px] text-muted-foreground">Atividades Portal</p>
            </div>
          </div>

          <div onClick={() => setTab("lista")} className="group bg-card hover:bg-destructive/5 cursor-pointer border-2 border-transparent hover:border-destructive/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 opacity-80 hover:opacity-100">
            <div className="h-12 w-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
              <LogOut size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Rescisão</p>
              <p className="text-[10px] text-muted-foreground">Fluxo de Desligamento</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 scrollbar-thin">
          <button onClick={() => setTab("lista")} className={`min-w-max flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "lista" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Lista de Funcionários
          </button>
          <button onClick={() => setTab("exames_tab")} className={`relative min-w-max flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "exames_tab" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Exames e Treinamentos
            {examesVencendo.length > 0 && <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{examesVencendo.length}</span>}
          </button>
          <button onClick={() => setTab("exames_modulo")} className={`min-w-max flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "exames_modulo" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="flex items-center justify-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Gestão de Exames</span>
          </button>
          <button onClick={() => setTab("gestao_pins")} className={`min-w-max flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "gestao_pins" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Acessos ao Portal
          </button>
          <button onClick={() => setTab("monitor")} className={`min-w-max flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "monitor" ? "bg-card shadow-sm text-success" : "text-muted-foreground hover:text-foreground"}`}>
            Monitor / Mural
          </button>
        </div>

        {tab === "monitor" ? (
          <MonitorAtividadesRH />
        ) : tab === "gestao_pins" ? (
          <GestaoPinsModule />
        ) : tab === "exames_modulo" ? (
          <ExamesModule />
        ) : tab === "exames_tab" ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Exames e Treinamentos ({sorted.length} funcionários)</h3>
              <p className="text-xs text-muted-foreground">Clique em <Pencil className="inline h-3 w-3" /> para editar as datas</p>
            </div>
            <ScrollableTable>
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nº Reg</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">ASO</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR6</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR12</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR18</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR35</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Bonificações</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((f) => {
                    const empInfo = getEmpresaInfo(f.empresa_id);
                    return (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">{f.numero_registro || "—"}</td>
                        <td className="px-4 py-3.5"><div className="flex items-center gap-3"><FuncionarioAvatar nome={f.nome} foto={f.foto_url} size="sm" /><span className="font-medium">{f.nome}</span></div></td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{empInfo.nome}</td>
                        <td className="px-4 py-3.5 text-center">{f.data_aso ? <ExamBadge date={f.data_aso} validityYears={1} label="ASO" /> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3.5 text-center">{f.data_nr6 ? <ExamBadge date={f.data_nr6} validityYears={1} label="NR6" /> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3.5 text-center">{f.data_nr12 ? <ExamBadge date={f.data_nr12} validityYears={2} label="NR12" /> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3.5 text-center">{f.data_nr18 ? <ExamBadge date={f.data_nr18} validityYears={2} label="NR18" /> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3.5 text-center">{f.data_nr35 ? <ExamBadge date={f.data_nr35} validityYears={2} label="NR35" /> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3.5 text-center">
                          {(() => {
                            const bons = f.bonificacoes_padrao as any[];
                            if (!Array.isArray(bons) || bons.length === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
                            const total = bons.reduce((acc: number, b: any) => acc + (Number(b.valor) || 0), 0);
                            return (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-bold text-success">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                <span className="text-[9px] text-muted-foreground">{bons.length} itens</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button onClick={() => setEditingExamFunc(f)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Editar Exames/Treinamentos">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum funcionário encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollableTable>
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
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="rounded-lg border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="nome">Ordenar por Nome</option>
                <option value="registro">Ordenar por Nº Reg.</option>
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
              <ScrollableTable>
                <table className="w-full min-w-[1180px] text-sm">
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
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">Bonificações</th>
                      <th className="px-3 py-3 text-center font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((f) => {
                      const expInfo = calcExperiencia(f.data_admissao);
                      const empInfo = getEmpresaInfo(f.empresa_id);
                      return (
                        <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          {/* Nº Registro - limpo, edita ao clicar no lápis */}
                          <td className="px-3 py-2.5">
                            {editingRegistro[f.id] !== undefined ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingRegistro[f.id]}
                                  onChange={e => setEditingRegistro(prev => ({ ...prev, [f.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === "Enter") saveRegistro(f.id); if (e.key === "Escape") setEditingRegistro(prev => { const n = { ...prev }; delete n[f.id]; return n; }); }}
                                  placeholder="Nº"
                                  className="w-16 rounded border bg-background px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                <button onClick={() => saveRegistro(f.id)} className="p-0.5 text-primary hover:text-primary/80" title="Salvar"><Save className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingRegistro(prev => ({ ...prev, [f.id]: f.numero_registro ?? "" }))}
                                className="group inline-flex items-center gap-1.5 text-xs font-mono text-foreground hover:text-primary transition-colors"
                                title="Clique para editar"
                              >
                                <span className="min-w-[2.5rem] text-left">{f.numero_registro || <span className="text-muted-foreground">—</span>}</span>
                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                              </button>
                            )}
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
                          {/* Status - select que aceita o valor atual mesmo que diferente */}
                          <td className="px-3 py-2.5">
                            <select
                              value={normalizeStatusForDb(f.status)}
                              onChange={e => saveStatus(f.id, e.target.value)}
                              className={`rounded-full px-2 py-1 text-xs font-medium border cursor-pointer outline-none focus:ring-2 focus:ring-ring ${getStatusColor(f.status)}`}
                            >
                              {/* opção fallback se o status atual não estiver no enum */}
                              {f.status && !STATUS_OPTIONS.some(s => s.value === normalizeStatusForDb(f.status)) && (
                                <option value={normalizeStatusForDb(f.status)}>{f.status}</option>
                              )}
                              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
                          <td className="px-3 py-2.5 text-center">
                            {(() => {
                              const bons = f.bonificacoes_padrao as any[];
                              if (!Array.isArray(bons) || bons.length === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
                              const total = bons.reduce((acc: number, b: any) => acc + (Number(b.valor) || 0), 0);
                              return (
                                <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-bold text-success">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                  <span className="text-[9px] text-muted-foreground italic">{bons.length} bonif.</span>
                                </div>
                              );
                            })()}
                          </td>
                          {/* Ações */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setEditFuncId(f.id); setEditFuncOpen(true); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Editar Funcionário">
                                <Pencil className="h-4 w-4" />
                              </button>
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
                              <button 
                                onClick={() => sendPortalInvite(f)} 
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors" 
                                title="Enviar Convite Portal (WhatsApp)"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sorted.length === 0 && (
                      <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">Nenhum funcionário encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollableTable>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <PreCadastroForm open={preCadastroOpen} onOpenChange={setPreCadastroOpen} onSave={() => loadDbFuncionarios()} nextId={funcionarios.length + 1} />
      {selectedFuncDoc && (
        <DocumentManager open={docManagerOpen} onOpenChange={setDocManagerOpen} funcionarioId={selectedFuncDoc.id} funcionarioNome={selectedFuncDoc.nome} />
      )}
      {selectedFuncTransfer && (
        <TransferirFuncionario open={transferOpen} onOpenChange={setTransferOpen} funcionarioId={selectedFuncTransfer.id} funcionarioNome={selectedFuncTransfer.nome} obraAtualId={selectedFuncTransfer.obraId} onTransferido={loadDbFuncionarios} />
      )}

      {/* Edit Modal */}
      <EditFuncionarioForm open={editFuncOpen} onOpenChange={setEditFuncOpen} funcionarioId={editFuncId} onSaved={loadDbFuncionarios} />

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

      {/* Modal Editar Exames/Treinamentos */}
      <Dialog open={!!editingExamFunc} onOpenChange={(o) => !o && setEditingExamFunc(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> Exames e Treinamentos
            </DialogTitle>
          </DialogHeader>
          {editingExamFunc && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveExames(editingExamFunc.id, {
                  data_aso: (fd.get("data_aso") as string) || null,
                  data_nr6: (fd.get("data_nr6") as string) || null,
                  data_nr12: (fd.get("data_nr12") as string) || null,
                  data_nr18: (fd.get("data_nr18") as string) || null,
                  data_nr35: (fd.get("data_nr35") as string) || null,
                });
              }}
              className="space-y-4"
            >
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{editingExamFunc.nome}</p>
                <p className="text-xs text-muted-foreground">{editingExamFunc.cargo} • Nº Reg: {editingExamFunc.numero_registro || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">ASO (validade 1 ano)</label>
                  <Input type="date" name="data_aso" defaultValue={editingExamFunc.data_aso || ""} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">NR6 (validade 1 ano)</label>
                  <Input type="date" name="data_nr6" defaultValue={editingExamFunc.data_nr6 || ""} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">NR12 (validade 2 anos)</label>
                  <Input type="date" name="data_nr12" defaultValue={editingExamFunc.data_nr12 || ""} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">NR18 (validade 2 anos)</label>
                  <Input type="date" name="data_nr18" defaultValue={editingExamFunc.data_nr18 || ""} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1 block">NR35 (validade 2 anos)</label>
                  <Input type="date" name="data_nr35" defaultValue={editingExamFunc.data_nr35 || ""} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingExamFunc(null)}>Cancelar</Button>
                <Button type="submit"><Save className="h-4 w-4 mr-1" /> Salvar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
