import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Stethoscope, Plus, DollarSign, Send, Search, Settings, ArrowLeft,
  MessageCircle, Mail, Trash2, Edit2, Save, X, Upload
} from "lucide-react";
import { calcularVencimento } from "@/utils/seguranca";

// ---- Types ----
interface PrecoExame {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  valor: number;
  fornecedor_id: string | null;
  ativo: boolean;
  fornecedor_nome?: string;
}

interface SolicitacaoExame {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  tipo_exame: string;
  exame_preco_id: string | null;
  fornecedor_id: string | null;
  data_solicitacao: string;
  data_realizado: string | null;
  data_agendada?: string | null;
  valor: number;
  status: string;
  observacoes: string | null;
  funcionario_nome?: string;
  fornecedor_nome?: string;
}

interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  empresa_id: string;
  obra_id?: string;
  data_aso: string | null;
  data_nr6: string | null;
  data_nr12: string | null;
  data_nr18: string | null;
  data_nr35: string | null;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  telefone: string | null;
  email: string | null;
}

// ---- Sub Views ----
type SubView = "painel" | "precos" | "solicitacoes" | "custos";

export function ExamesModule() {
  const [subView, setSubView] = useState<SubView>("painel");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Exames e Treinamentos
          </h2>
          <p className="text-sm text-muted-foreground">Gestão de exames, treinamentos e custos de segurança do trabalho</p>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {([
          { key: "painel", label: "Painel" },
          { key: "solicitacoes", label: "Solicitações" },
          { key: "precos", label: "Tabela de Preços" },
          { key: "custos", label: "Custos Mensais" },
        ] as { key: SubView; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubView(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              subView === tab.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subView === "painel" && <PainelExames onNavigate={setSubView} />}
      {subView === "solicitacoes" && <SolicitacoesView />}
      {subView === "precos" && <TabelaPrecosView />}
      {subView === "custos" && <CustosMensaisView />}
    </div>
  );
}

// ---- Painel ----
function PainelExames({ onNavigate }: { onNavigate: (v: SubView) => void }) {
  const [stats, setStats] = useState({ pendentes: 0, realizados: 0, custoMes: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: solicitacoes } = await supabase.from("solicitacoes_exame").select("status, valor, data_solicitacao");
    if (!solicitacoes) return;

    const pendentes = solicitacoes.filter(s => s.status === "pendente").length;
    const realizados = solicitacoes.filter(s => s.status === "realizado").length;
    const custoMes = solicitacoes
      .filter(s => s.status === "realizado" && s.data_solicitacao?.startsWith(mesAtual))
      .reduce((acc, s) => acc + (s.valor || 0), 0);

    setStats({ pendentes, realizados, custoMes });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => onNavigate("solicitacoes")} className="rounded-xl border bg-card p-5 text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-warning/10 p-2"><Send className="h-5 w-5 text-warning" /></div>
            <span className="text-2xl font-bold">{stats.pendentes}</span>
          </div>
          <p className="text-sm text-muted-foreground">Solicitações Pendentes</p>
        </button>
        <button onClick={() => onNavigate("solicitacoes")} className="rounded-xl border bg-card p-5 text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-success/10 p-2"><Stethoscope className="h-5 w-5 text-success" /></div>
            <span className="text-2xl font-bold">{stats.realizados}</span>
          </div>
          <p className="text-sm text-muted-foreground">Exames Realizados</p>
        </button>
        <button onClick={() => onNavigate("custos")} className="rounded-xl border bg-card p-5 text-left hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-primary/10 p-2"><DollarSign className="h-5 w-5 text-primary" /></div>
            <span className="text-2xl font-bold">R$ {stats.custoMes.toLocaleString("pt-BR")}</span>
          </div>
          <p className="text-sm text-muted-foreground">Custo do Mês</p>
        </button>
      </div>
    </div>
  );
}

// ---- Tabela de Preços ----
function TabelaPrecosView() {
  const [precos, setPrecos] = useState<PrecoExame[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PrecoExame | null>(null);
  const [form, setForm] = useState({ tipo: "exame", nome: "", descricao: "", valor: "", fornecedor_id: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from("tabela_precos_exames").select("*").order("nome"),
      supabase.from("fornecedores").select("id, razao_social, nome_fantasia, telefone, email").eq("ativo", true),
    ]);
    if (f) setFornecedores(f);
    if (p) {
      setPrecos(p.map(item => ({
        ...item,
        fornecedor_nome: f?.find(forn => forn.id === item.fornecedor_id)?.razao_social || "—",
      })));
    }
  };

  const handleSave = async () => {
    if (!form.nome || !form.valor) {
      toast({ title: "Preencha nome e valor", variant: "destructive" });
      return;
    }
    const payload = {
      tipo: form.tipo,
      nome: form.nome,
      descricao: form.descricao || null,
      valor: parseFloat(form.valor),
      fornecedor_id: form.fornecedor_id || null,
    };

    if (editItem) {
      await supabase.from("tabela_precos_exames").update(payload).eq("id", editItem.id);
      toast({ title: "Preço atualizado" });
    } else {
      await supabase.from("tabela_precos_exames").insert(payload);
      toast({ title: "Preço cadastrado" });
    }
    setShowForm(false);
    setEditItem(null);
    setForm({ tipo: "exame", nome: "", descricao: "", valor: "", fornecedor_id: "" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tabela_precos_exames").delete().eq("id", id);
    toast({ title: "Removido" });
    loadData();
  };

  const openEdit = (item: PrecoExame) => {
    setEditItem(item);
    setForm({ tipo: item.tipo, nome: item.nome, descricao: item.descricao || "", valor: String(item.valor), fornecedor_id: item.fornecedor_id || "" });
    setShowForm(true);
  };

  const tipoOptions = [
    { value: "exame", label: "Exame" },
    { value: "treinamento", label: "Treinamento" },
    { value: "assessoria_sst", label: "Assessoria SST" },
    { value: "outro", label: "Outro" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          Tabela de Preços
        </h3>
        <button
          onClick={() => { setEditItem(null); setForm({ tipo: "exame", nome: "", descricao: "", valor: "", fornecedor_id: "" }); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Preço
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {tipoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome *</label>
              <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="ASO Admissional" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Valor (R$) *</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="120.00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
              <select value={form.fornecedor_id} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Descrição</label>
            <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Descrição do exame/treinamento" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90 transition-colors">
              <Save className="h-3.5 w-3.5" />
              {editItem ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fornecedor</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {precos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum preço cadastrado</td></tr>
            ) : precos.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.tipo === "exame" ? "bg-primary/10 text-primary" :
                    p.tipo === "treinamento" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>{tipoOptions.find(t => t.value === p.tipo)?.label || p.tipo}</span>
                </td>
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.fornecedor_nome}</td>
                <td className="px-4 py-3 text-right font-medium">R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Solicitações ----
function SolicitacoesView() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoExame[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [precos, setPrecos] = useState<PrecoExame[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    funcionario_id: "", tipo_exame: "", exame_preco_id: "", fornecedor_id: "", valor: "", observacoes: "", data_agendada: ""
  });
  
  const [modalGED, setModalGED] = useState<{ open: boolean; sol: SolicitacaoExame | null }>({ open: false, sol: null });
  const [clinicas, setClinicas] = useState<{id: string; nome: string}[]>([]);
  const [gedForm, setGedForm] = useState({
    tipo: "ASO",
    subtipo: "periodico",
    data_realizacao: new Date().toISOString().split("T")[0],
    clinica_id: "",
    arquivo: null as File | null,
    observacoes: ""
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: sol }, { data: func }, { data: forn }, { data: prec }, { data: clin }] = await Promise.all([
      supabase.from("solicitacoes_exame").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("funcionarios").select("id, nome, cpf, cargo, empresa_id, obra_id, data_aso, data_nr6, data_nr12, data_nr18, data_nr35").neq("status", "desligado"),
      supabase.from("fornecedores").select("id, razao_social, nome_fantasia, telefone, email").eq("ativo", true),
      supabase.from("tabela_precos_exames").select("*").eq("ativo", true),
      supabase.from("seguranca_clinicas").select("id, nome").eq("ativo", true),
    ]);
    if (func) setFuncionarios(func);
    if (forn) setFornecedores(forn);
    if (prec) setPrecos(prec as PrecoExame[]);
    if (clin) setClinicas(clin);
    if (sol) {
      setSolicitacoes(sol.map(s => ({
        ...s,
        funcionario_nome: func?.find(f => f.id === s.funcionario_id)?.nome || "—",
        fornecedor_nome: forn?.find(f => f.id === s.fornecedor_id)?.razao_social || "—",
      })));
    }
  };

  const handlePrecoSelect = (precoId: string) => {
    const preco = precos.find(p => p.id === precoId);
    if (preco) {
      setForm(prev => ({
        ...prev,
        exame_preco_id: precoId,
        tipo_exame: preco.nome,
        valor: String(preco.valor),
        fornecedor_id: preco.fornecedor_id || prev.fornecedor_id,
      }));
    }
  };

  const handleSave = async () => {
    if (!form.funcionario_id || !form.tipo_exame) {
      toast({ title: "Selecione funcionário e tipo de exame", variant: "destructive" });
      return;
    }
    const func = funcionarios.find(f => f.id === form.funcionario_id);
    const { error } = await supabase.from("solicitacoes_exame").insert({
      funcionario_id: form.funcionario_id,
      empresa_id: func?.empresa_id || "",
      tipo_exame: form.tipo_exame,
      exame_preco_id: form.exame_preco_id || null,
      fornecedor_id: form.fornecedor_id || null,
      valor: parseFloat(form.valor) || 0,
      observacoes: form.observacoes || null,
      data_agendada: form.data_agendada || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação criada" });
      setShowForm(false);
      setForm({ funcionario_id: "", tipo_exame: "", exame_preco_id: "", fornecedor_id: "", valor: "", observacoes: "", data_agendada: "" });
      loadData();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    const today = new Date().toISOString().split("T")[0];
    if (newStatus === "realizado") updates.data_realizado = today;
    await supabase.from("solicitacoes_exame").update(updates).eq("id", id);

    // When confirmed as realizado, update funcionario exam dates
    if (newStatus === "realizado") {
      const sol = solicitacoes.find(s => s.id === id);
      if (sol) {
        const tipoLower = sol.tipo_exame.toLowerCase();
        const examFieldMap: Record<string, string> = {
          "aso": "data_aso", "aso admissional": "data_aso", "aso periódico": "data_aso", "aso periodico": "data_aso",
          "aso demissional": "data_aso", "nr6": "data_nr6", "nr-6": "data_nr6",
          "nr12": "data_nr12", "nr-12": "data_nr12", "nr18": "data_nr18", "nr-18": "data_nr18",
          "nr35": "data_nr35", "nr-35": "data_nr35",
        };
        const field = Object.entries(examFieldMap).find(([key]) => tipoLower.includes(key))?.[1];
        if (field && sol.funcionario_id) {
          await supabase.from("funcionarios").update({ [field]: today }).eq("id", sol.funcionario_id);
          toast({ title: `Data de ${sol.tipo_exame} atualizada no cadastro do funcionário` });
        }
      }
    }

    toast({ title: `Status: ${newStatus}` });
    loadData();
  };

  const handleChangeStatusClick = (sol: SolicitacaoExame, newStatus: string) => {
    if (newStatus === "realizado") {
      let mappedType = "ASO";
      const tLower = sol.tipo_exame.toLowerCase();
      if (tLower.includes("nr6") || tLower.includes("nr-6")) mappedType = "NR6";
      else if (tLower.includes("nr12") || tLower.includes("nr-12")) mappedType = "NR12";
      else if (tLower.includes("nr18") || tLower.includes("nr-18")) mappedType = "NR18";
      else if (tLower.includes("nr35") || tLower.includes("nr-35")) mappedType = "NR35";
      
      setGedForm(prev => ({
        ...prev,
        tipo: mappedType,
        subtipo: tLower.includes("admissional") ? "admissional" : tLower.includes("demissional") ? "demissional" : tLower.includes("retorno") ? "retorno" : "periodico",
        arquivo: null
      }));
      setModalGED({ open: true, sol });
    } else {
      handleStatusChange(sol.id, newStatus);
    }
  };

  const handleDeleteSolicitacao = async (sol: SolicitacaoExame) => {
    const confirmado = window.confirm(
      `Excluir a solicitação de "${sol.tipo_exame}" de ${sol.funcionario_nome}?\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmado) return;
    const { error } = await supabase.from("solicitacoes_exame").delete().eq("id", sol.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação excluída" });
      loadData();
    }
  };

  const handleSaveGED = async () => {
    if (!modalGED.sol) return;
    const s = modalGED.sol;
    if (!gedForm.data_realizacao || !gedForm.tipo || !gedForm.arquivo) {
       toast({ title: "Preencha a data, tipo e anexe o PDF do exame.", variant: "destructive" });
       return;
    }

    const func = funcionarios.find(f => f.id === s.funcionario_id);
    const dataRealizacao = new Date(gedForm.data_realizacao + "T12:00:00");
    const dataVencimento = calcularVencimento(gedForm.tipo, dataRealizacao);
    
    try {
      toast({ title: "Enviando arquivo e salvando..." });
      // 1. Upload
      const fileExt = gedForm.arquivo.name.split('.').pop() || "pdf";
      const fileName = `${s.funcionario_id}/${gedForm.tipo}/${Date.now()}_documento.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos-seguranca")
        .upload(fileName, gedForm.arquivo);
      if (uploadError) throw uploadError;

      // 2. Insert into seguranca_documentos
      const { error: dbError } = await supabase.from("seguranca_documentos").insert({
        funcionario_id: s.funcionario_id,
        obra_id: func?.obra_id || null,
        clinica_id: gedForm.clinica_id || null,
        tipo: gedForm.tipo,
        subtipo: gedForm.tipo === "ASO" ? gedForm.subtipo : null,
        data_realizacao: gedForm.data_realizacao,
        data_vencimento: dataVencimento.toISOString().split("T")[0],
        arquivo_url: fileName,
        observacoes: gedForm.observacoes || null
      });
      if (dbError) throw dbError;

      // 3. Update status in existing flow
      await handleStatusChange(s.id, "realizado");
      
      setModalGED({ open: false, sol: null });
      toast({ title: "Exame salvo no Histórico de Segurança!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleWhatsApp = (sol: SolicitacaoExame) => {
    const fornecedor = fornecedores.find(f => f.id === sol.fornecedor_id);
    if (!fornecedor?.telefone) {
      toast({ title: "Fornecedor sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const phone = fornecedor.telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá, gostaríamos de solicitar o exame/treinamento: ${sol.tipo_exame} para o funcionário ${sol.funcionario_nome}. Aguardamos retorno.`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const handleEmail = (sol: SolicitacaoExame) => {
    const fornecedor = fornecedores.find(f => f.id === sol.fornecedor_id);
    if (!fornecedor?.email) {
      toast({ title: "Fornecedor sem e-mail cadastrado", variant: "destructive" });
      return;
    }
    const subject = encodeURIComponent(`Solicitação de ${sol.tipo_exame}`);
    const body = encodeURIComponent(
      `Prezados,\n\nSolicitamos a realização do exame/treinamento: ${sol.tipo_exame}\nFuncionário: ${sol.funcionario_nome}\n\nAguardamos retorno.\n\nAtenciosamente.`
    );
    window.open(`mailto:${fornecedor.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const filtered = solicitacoes.filter(s =>
    (s.funcionario_nome || "").toLowerCase().includes(search.toLowerCase()) ||
    s.tipo_exame.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por funcionário ou exame..." className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold">Nova Solicitação de Exame/Treinamento</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Funcionário *</label>
              <select value={form.funcionario_id} onChange={e => setForm(p => ({ ...p, funcionario_id: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.cpf}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Exame/Treinamento (da tabela)</label>
              <select value={form.exame_preco_id} onChange={e => handlePrecoSelect(e.target.value)} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione ou digite abaixo...</option>
                {precos.map(p => <option key={p.id} value={p.id}>{p.nome} — R$ {p.valor.toFixed(2)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo/Nome do Exame *</label>
              <input value={form.tipo_exame} onChange={e => setForm(p => ({ ...p, tipo_exame: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="ASO Admissional" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fornecedor/Clínica</label>
              <select value={form.fornecedor_id} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
              <input type="number" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data Agendada</label>
              <input type="date" value={form.data_agendada} onChange={e => setForm(p => ({ ...p, data_agendada: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90 transition-colors">
              <Save className="h-3.5 w-3.5" /> Criar Solicitação
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exame/Treinamento</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fornecedor</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Solicitação</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Agendado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma solicitação encontrada</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.funcionario_nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.tipo_exame}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.fornecedor_nome}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{new Date(s.data_solicitacao).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-center font-medium text-primary">
                    {s.data_agendada ? new Date(s.data_agendada + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">R$ {s.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={s.status}
                      onChange={e => handleChangeStatusClick(s, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 focus:ring-0 cursor-pointer ${
                        s.status === "pendente" ? "bg-warning/10 text-warning" :
                        s.status === "realizado" ? "bg-success/10 text-success" :
                        s.status === "cancelado" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="agendado">Agendado</option>
                      <option value="realizado">Realizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleWhatsApp(s)} title="WhatsApp" className="p-1 text-muted-foreground hover:text-success transition-colors"><MessageCircle className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleEmail(s)} title="E-mail" className="p-1 text-muted-foreground hover:text-primary transition-colors"><Mail className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteSolicitacao(s)} title="Excluir solicitação" className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal GED para marcar como Realizado */}
      <Dialog open={modalGED.open} onOpenChange={o => { if(!o) setModalGED({open: false, sol: null}); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Anexar Documento de Segurança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm mb-2">
              <p><strong>Funcionário:</strong> {modalGED.sol?.funcionario_nome}</p>
              <p><strong>Exame Original:</strong> {modalGED.sol?.tipo_exame}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Documento *</label>
                <select value={gedForm.tipo} onChange={e => setGedForm(p => ({ ...p, tipo: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="ASO">ASO</option>
                  <option value="NR6">NR6</option>
                  <option value="NR12">NR12</option>
                  <option value="NR18">NR18</option>
                  <option value="NR35">NR35</option>
                </select>
              </div>

              {gedForm.tipo === "ASO" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Subtipo *</label>
                  <select value={gedForm.subtipo} onChange={e => setGedForm(p => ({ ...p, subtipo: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="admissional">Admissional</option>
                    <option value="periodico">Periódico</option>
                    <option value="retorno">Retorno ao Trabalho</option>
                    <option value="demissional">Demissional</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data de Realização *</label>
                <input type="date" value={gedForm.data_realizacao} onChange={e => setGedForm(p => ({ ...p, data_realizacao: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vencimento Calculado</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full rounded-lg border bg-muted py-2 px-3 text-sm text-muted-foreground cursor-not-allowed font-medium"
                  value={
                    gedForm.data_realizacao && gedForm.tipo ? 
                      calcularVencimento(gedForm.tipo, new Date(gedForm.data_realizacao + "T12:00:00")).toLocaleDateString("pt-BR") 
                      : ""
                  } 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Clínica / Fornecedor</label>
              <select value={gedForm.clinica_id} onChange={e => setGedForm(p => ({ ...p, clinica_id: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione a clínica...</option>
                {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Upload do Arquivo (PDF) *</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setGedForm(p => ({ ...p, arquivo: f }));
                  }} 
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  {gedForm.arquivo ? (
                    <>
                      <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center"><Upload className="h-5 w-5" /></div>
                      <p className="text-sm font-medium text-primary">{gedForm.arquivo.name}</p>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 bg-muted text-muted-foreground rounded-full flex items-center justify-center"><Upload className="h-5 w-5" /></div>
                      <p className="text-sm text-muted-foreground">Clique para procurar o arquivo PDF</p>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalGED({ open: false, sol: null })} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button onClick={handleSaveGED} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Save className="h-4 w-4" />
              Salvar Histórico
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Custos Mensais ----
function CustosMensaisView() {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dados, setDados] = useState<{ tipo: string; total: number; qtd: number }[]>([]);
  const [totalMes, setTotalMes] = useState(0);

  useEffect(() => { loadCustos(); }, [mes]);

  const loadCustos = async () => {
    const { data } = await supabase
      .from("solicitacoes_exame")
      .select("tipo_exame, valor, status")
      .eq("status", "realizado")
      .gte("data_solicitacao", `${mes}-01`)
      .lte("data_solicitacao", `${mes}-31`);

    if (!data) { setDados([]); setTotalMes(0); return; }

    const agrupado: Record<string, { total: number; qtd: number }> = {};
    data.forEach(d => {
      if (!agrupado[d.tipo_exame]) agrupado[d.tipo_exame] = { total: 0, qtd: 0 };
      agrupado[d.tipo_exame].total += d.valor || 0;
      agrupado[d.tipo_exame].qtd += 1;
    });

    const result = Object.entries(agrupado).map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.total - a.total);
    setDados(result);
    setTotalMes(result.reduce((acc, r) => acc + r.total, 0));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Custos Mensais
        </h3>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="rounded-lg border bg-card py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exame/Treinamento</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Quantidade</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Nenhum custo no período</td></tr>
            ) : dados.map(d => (
              <tr key={d.tipo} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{d.tipo}</td>
                <td className="px-4 py-3 text-center">{d.qtd}</td>
                <td className="px-4 py-3 text-right font-medium">R$ {d.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30">
              <td colSpan={2} className="px-4 py-3 font-bold">Total do Mês</td>
              <td className="px-4 py-3 text-right font-bold text-primary">R$ {totalMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
