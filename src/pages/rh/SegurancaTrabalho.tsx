import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, FileText, FilePlus2, DollarSign, Plus, Search, Edit2, X,
  Trash2, AlertCircle, CheckCircle, Send, Upload, Calendar,
} from "lucide-react";

// ============ TIPOS ============
const TIPOS_DOC = ["LTCAT", "PCMAT", "PCMSO", "PPRA", "PGR", "Laudo Insalubridade", "Laudo Periculosidade", "ASO Coletivo", "Outros"];

interface Empresa { id: string; razao_social: string; }
interface Obra { id: string; nome: string; empresa_id: string; }
interface Fornecedor { id: string; razao_social: string; nome_fantasia: string | null; }

interface SegDoc {
  id: string; empresa_id: string; obra_id: string | null; fornecedor_id: string | null;
  tipo: string; titulo: string; numero: string | null;
  data_emissao: string | null; data_validade: string | null;
  arquivo_url: string | null; observacoes: string | null; status: string;
  empresas?: { razao_social: string } | null;
  obras?: { nome: string } | null;
  fornecedores?: { razao_social: string } | null;
}

interface SegContrato {
  id: string; empresa_id: string; obra_id: string | null; fornecedor_id: string | null;
  descricao: string; valor_mensal: number; dia_vencimento: number;
  data_inicio: string; data_fim: string | null; status: string; observacoes: string | null;
  empresas?: { razao_social: string } | null;
  obras?: { nome: string } | null;
  fornecedores?: { razao_social: string } | null;
}

interface SegCusto {
  id: string; empresa_id: string; obra_id: string | null; fornecedor_id: string | null;
  documento_id: string | null; conta_pagar_id: string | null;
  descricao: string; tipo_documento: string | null; valor: number;
  data_emissao: string; data_vencimento: string; forma_pagamento: string | null;
  status: string; observacoes: string | null;
  empresas?: { razao_social: string } | null;
  obras?: { nome: string } | null;
  fornecedores?: { razao_social: string } | null;
}

const calcStatusValidade = (validade: string | null): string => {
  if (!validade) return "vigente";
  const hoje = new Date();
  const v = new Date(validade + "T00:00:00");
  const dias = Math.ceil((v.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "vencendo";
  return "vigente";
};

export default function SegurancaTrabalho() {
  const [tab, setTab] = useState("documentos");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [documentos, setDocumentos] = useState<SegDoc[]>([]);
  const [contratos, setContratos] = useState<SegContrato[]>([]);
  const [custos, setCustos] = useState<SegCusto[]>([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [e, o, f, d, c, cu] = await Promise.all([
      supabase.from("empresas").select("id, razao_social").eq("ativo", true).order("razao_social"),
      supabase.from("obras").select("id, nome, empresa_id").order("nome"),
      supabase.from("fornecedores").select("id, razao_social, nome_fantasia").eq("ativo", true).order("razao_social"),
      supabase.from("seguranca_documentos").select("*, empresas(razao_social), obras(nome), fornecedores(razao_social)").order("created_at", { ascending: false }),
      supabase.from("seguranca_contratos_assessoria").select("*, empresas(razao_social), obras(nome), fornecedores(razao_social)").order("created_at", { ascending: false }),
      supabase.from("seguranca_custos").select("*, empresas(razao_social), obras(nome), fornecedores(razao_social)").order("data_vencimento", { ascending: false }),
    ]);
    setEmpresas(e.data || []);
    setObras(o.data || []);
    setFornecedores(f.data || []);
    setDocumentos((d.data || []) as any);
    setContratos((c.data || []) as any);
    setCustos((cu.data || []) as any);
  };

  // ====== KPIs
  const totalDocs = documentos.length;
  const docsVencidos = documentos.filter(d => calcStatusValidade(d.data_validade) === "vencido").length;
  const docsVencendo = documentos.filter(d => calcStatusValidade(d.data_validade) === "vencendo").length;
  const totalMensal = contratos.filter(c => c.status === "ativo").reduce((s, c) => s + Number(c.valor_mensal || 0), 0);
  const custosPendentes = custos.filter(c => c.status !== "pago").reduce((s, c) => s + Number(c.valor || 0), 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-[#3A5C35]/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-[#3A5C35]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Segurança do Trabalho</h1>
              <p className="text-sm text-muted-foreground">Gestão de documentos, contratos de assessoria e custos de SST</p>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={FileText} label="Documentos" value={totalDocs} />
          <Kpi icon={AlertCircle} label="Vencidos" value={docsVencidos} tone="danger" />
          <Kpi icon={Calendar} label="Vencendo (30d)" value={docsVencendo} tone="warning" />
          <Kpi icon={DollarSign} label="Mensal Assessorias" value={`R$ ${totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          <Kpi icon={Send} label="Custos Pendentes" value={`R$ ${custosPendentes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="warning" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="documentos"><FileText className="h-4 w-4 mr-2" />Documentos</TabsTrigger>
            <TabsTrigger value="contratos"><FilePlus2 className="h-4 w-4 mr-2" />Contratos Assessoria</TabsTrigger>
            <TabsTrigger value="custos"><DollarSign className="h-4 w-4 mr-2" />Custos / Lançamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="documentos">
            <DocumentosTab
              documentos={documentos} empresas={empresas} obras={obras} fornecedores={fornecedores}
              reload={loadAll}
            />
          </TabsContent>

          <TabsContent value="contratos">
            <ContratosTab
              contratos={contratos} empresas={empresas} obras={obras} fornecedores={fornecedores}
              reload={loadAll}
            />
          </TabsContent>

          <TabsContent value="custos">
            <CustosTab
              custos={custos} documentos={documentos} empresas={empresas} obras={obras} fornecedores={fornecedores}
              reload={loadAll}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ============ KPI ============
function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone?: "danger" | "warning" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-[#3A5C35]";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </Card>
  );
}

// ============ DOCUMENTOS ============
const emptyDoc = {
  empresa_id: "", obra_id: "", fornecedor_id: "", tipo: "LTCAT",
  titulo: "", numero: "", data_emissao: "", data_validade: "",
  arquivo_url: "", observacoes: "", status: "vigente",
};

function DocumentosTab({ documentos, empresas, obras, fornecedores, reload }: any) {
  const [search, setSearch] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyDoc);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const obrasFiltradas = obras.filter((o: Obra) => !form.empresa_id || o.empresa_id === form.empresa_id);

  const openNew = () => { setEditId(null); setForm(emptyDoc); setShowForm(true); };
  const openEdit = (d: SegDoc) => {
    setEditId(d.id);
    setForm({
      empresa_id: d.empresa_id, obra_id: d.obra_id || "", fornecedor_id: d.fornecedor_id || "",
      tipo: d.tipo, titulo: d.titulo, numero: d.numero || "",
      data_emissao: d.data_emissao || "", data_validade: d.data_validade || "",
      arquivo_url: d.arquivo_url || "", observacoes: d.observacoes || "", status: d.status,
    });
    setShowForm(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = `seguranca_trabalho/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("documentos").getPublicUrl(path);
      setForm((f: any) => ({ ...f, arquivo_url: data.publicUrl }));
      toast({ title: "Arquivo enviado" });
    }
    setUploading(false);
  };

  const save = async () => {
    if (!form.empresa_id || !form.titulo) {
      toast({ title: "Preencha empresa e título", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      obra_id: form.obra_id || null,
      fornecedor_id: form.fornecedor_id || null,
      data_emissao: form.data_emissao || null,
      data_validade: form.data_validade || null,
      status: calcStatusValidade(form.data_validade || null),
    };
    const { error } = editId
      ? await supabase.from("seguranca_documentos").update(payload).eq("id", editId)
      : await supabase.from("seguranca_documentos").insert(payload);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: editId ? "Documento atualizado" : "Documento criado" });
      setShowForm(false); reload();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir documento?")) return;
    const { error } = await supabase.from("seguranca_documentos").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído" }); reload(); }
  };

  const filtered = documentos.filter((d: SegDoc) => {
    const s = search.toLowerCase();
    const okSearch = !s || d.titulo.toLowerCase().includes(s) || d.tipo.toLowerCase().includes(s) ||
      (d.fornecedores?.razao_social || "").toLowerCase().includes(s);
    const okEmp = !filtroEmpresa || d.empresa_id === filtroEmpresa;
    const realStatus = calcStatusValidade(d.data_validade);
    const okStatus = !filtroStatus || realStatus === filtroStatus;
    return okSearch && okEmp && okStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar título, tipo, fornecedor..." className="pl-9" />
        </div>
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
          <option value="">Todas empresas</option>
          {empresas.map((e: Empresa) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
          <option value="">Todos status</option>
          <option value="vigente">Vigente</option>
          <option value="vencendo">Vencendo</option>
          <option value="vencido">Vencido</option>
        </select>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Documento</Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-[#3A5C35]/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? "Editar documento" : "Novo documento"}</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Empresa *">
              <select value={form.empresa_id} onChange={e => setForm({ ...form, empresa_id: e.target.value, obra_id: "" })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Selecione</option>
                {empresas.map((e: Empresa) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </Field>
            <Field label="Obra (opcional)">
              <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">— (toda a empresa)</option>
                {obrasFiltradas.map((o: Obra) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor">
              <select value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Selecione</option>
                {fornecedores.map((f: Fornecedor) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
              </select>
            </Field>
            <Field label="Tipo *">
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Título *">
              <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: LTCAT 2026" />
            </Field>
            <Field label="Número/Identificação">
              <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </Field>
            <Field label="Data emissão">
              <Input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} />
            </Field>
            <Field label="Data validade">
              <Input type="date" value={form.data_validade} onChange={e => setForm({ ...form, data_validade: e.target.value })} />
            </Field>
            <Field label="Arquivo (PDF)">
              <div className="flex gap-2">
                <Input type="file" accept="application/pdf,image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
                {form.arquivo_url && <a href={form.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3A5C35] underline self-center">Ver</a>}
              </div>
            </Field>
            <div className="md:col-span-3">
              <Field label="Observações">
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm" />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Título</th>
              <th className="px-3 py-2 font-medium">Empresa / Obra</th>
              <th className="px-3 py-2 font-medium">Fornecedor</th>
              <th className="px-3 py-2 font-medium">Validade</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d: SegDoc) => {
              const realStatus = calcStatusValidade(d.data_validade);
              return (
                <tr key={d.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2"><Badge variant="outline">{d.tipo}</Badge></td>
                  <td className="px-3 py-2 font-medium">{d.titulo}{d.numero && <span className="text-xs text-muted-foreground"> #{d.numero}</span>}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{d.empresas?.razao_social}</div>
                    {d.obras && <div className="text-muted-foreground">{d.obras.nome}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">{d.fornecedores?.razao_social || "—"}</td>
                  <td className="px-3 py-2 text-xs">{d.data_validade ? new Date(d.data_validade + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-3 py-2">
                    {realStatus === "vencido" && <Badge className="bg-destructive/15 text-destructive border-destructive/30">Vencido</Badge>}
                    {realStatus === "vencendo" && <Badge className="bg-warning/20 text-warning-foreground border-warning/30">Vencendo</Badge>}
                    {realStatus === "vigente" && <Badge className="bg-success/15 text-success border-success/30">Vigente</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {d.arquivo_url && <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button></a>}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Nenhum documento</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============ CONTRATOS ============
const emptyContrato = {
  empresa_id: "", obra_id: "", fornecedor_id: "", descricao: "",
  valor_mensal: 0, dia_vencimento: 10, data_inicio: "", data_fim: "",
  status: "ativo", observacoes: "",
};

function ContratosTab({ contratos, empresas, obras, fornecedores, reload }: any) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyContrato);
  const [saving, setSaving] = useState(false);
  const [gerarFinanceiro, setGerarFinanceiro] = useState(true);

  const obrasFiltradas = obras.filter((o: Obra) => !form.empresa_id || o.empresa_id === form.empresa_id);

  const openNew = () => { setEditId(null); setForm(emptyContrato); setGerarFinanceiro(true); setShowForm(true); };
  const openEdit = (c: SegContrato) => {
    setEditId(c.id);
    setForm({
      empresa_id: c.empresa_id, obra_id: c.obra_id || "", fornecedor_id: c.fornecedor_id || "",
      descricao: c.descricao, valor_mensal: c.valor_mensal, dia_vencimento: c.dia_vencimento,
      data_inicio: c.data_inicio, data_fim: c.data_fim || "",
      status: c.status, observacoes: c.observacoes || "",
    });
    setGerarFinanceiro(false);
    setShowForm(true);
  };

  const gerarContasPagar = async (contrato: any) => {
    const inicio = new Date(contrato.data_inicio + "T00:00:00");
    const fim = contrato.data_fim ? new Date(contrato.data_fim + "T00:00:00") : null;
    const mesesGerar = fim
      ? Math.min(((fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())) + 1, 60)
      : 12;
    const fornecedorNome = fornecedores.find((f: Fornecedor) => f.id === contrato.fornecedor_id);
    const lancamentos = [];
    for (let i = 0; i < mesesGerar; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, contrato.dia_vencimento);
      lancamentos.push({
        empresa_id: contrato.empresa_id,
        obra_id: contrato.obra_id || null,
        fornecedor_id: contrato.fornecedor_id || null,
        descricao: `SST - ${contrato.descricao}`,
        categoria: "Segurança do Trabalho",
        valor: contrato.valor_mensal,
        data_vencimento: d.toISOString().split("T")[0],
        status: "pendente",
        documento: `Contrato SST ${contrato.id.slice(0, 8)}`,
        parcela: i + 1,
        total_parcelas: mesesGerar,
      });
    }
    if (lancamentos.length > 0) {
      const { error } = await supabase.from("contas_pagar").insert(lancamentos);
      if (error) toast({ title: "Aviso", description: `Contrato salvo, mas erro ao gerar parcelas: ${error.message}`, variant: "destructive" });
      else toast({ title: `${lancamentos.length} parcela(s) enviadas ao financeiro` });
    }
  };

  const save = async () => {
    if (!form.empresa_id || !form.descricao || !form.data_inicio) {
      toast({ title: "Preencha empresa, descrição e data de início", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      obra_id: form.obra_id || null,
      fornecedor_id: form.fornecedor_id || null,
      data_fim: form.data_fim || null,
      valor_mensal: Number(form.valor_mensal),
      dia_vencimento: Number(form.dia_vencimento),
    };
    if (editId) {
      const { error } = await supabase.from("seguranca_contratos_assessoria").update(payload).eq("id", editId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Contrato atualizado" });
    } else {
      const { data, error } = await supabase.from("seguranca_contratos_assessoria").insert(payload).select().single();
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Contrato criado" });
      if (gerarFinanceiro) await gerarContasPagar(data);
    }
    setShowForm(false); reload(); setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir contrato? (parcelas no financeiro não serão removidas)")) return;
    const { error } = await supabase.from("seguranca_contratos_assessoria").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído" }); reload(); }
  };

  const filtered = contratos.filter((c: SegContrato) => {
    const s = search.toLowerCase();
    return !s || c.descricao.toLowerCase().includes(s) ||
      (c.fornecedores?.razao_social || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato..." className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Contrato</Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-[#3A5C35]/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? "Editar contrato" : "Novo contrato de assessoria"}</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Empresa *">
              <select value={form.empresa_id} onChange={e => setForm({ ...form, empresa_id: e.target.value, obra_id: "" })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Selecione</option>
                {empresas.map((e: Empresa) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </Field>
            <Field label="Obra (opcional)">
              <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">— (toda a empresa)</option>
                {obrasFiltradas.map((o: Obra) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor (assessoria)">
              <select value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Selecione</option>
                {fornecedores.map((f: Fornecedor) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
              </select>
            </Field>
            <div className="md:col-span-3">
              <Field label="Descrição *">
                <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Assessoria mensal de SST" />
              </Field>
            </div>
            <Field label="Valor mensal (R$) *">
              <Input type="number" step="0.01" value={form.valor_mensal} onChange={e => setForm({ ...form, valor_mensal: e.target.value })} />
            </Field>
            <Field label="Dia vencimento *">
              <Input type="number" min="1" max="28" value={form.dia_vencimento} onChange={e => setForm({ ...form, dia_vencimento: e.target.value })} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </Field>
            <Field label="Data início *">
              <Input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
            </Field>
            <Field label="Data fim (opcional)">
              <Input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} />
            </Field>
            <div className="md:col-span-3">
              <Field label="Observações">
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm" />
              </Field>
            </div>
            {!editId && (
              <div className="md:col-span-3 flex items-center gap-2 p-3 rounded-md bg-[#3A5C35]/5 border border-[#3A5C35]/20">
                <input type="checkbox" id="gerarFin" checked={gerarFinanceiro} onChange={e => setGerarFinanceiro(e.target.checked)} />
                <label htmlFor="gerarFin" className="text-sm">Gerar automaticamente 12 parcelas no Financeiro (Contas a Pagar)</label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Empresa / Obra</th>
              <th className="px-3 py-2 font-medium">Fornecedor</th>
              <th className="px-3 py-2 font-medium">Valor Mensal</th>
              <th className="px-3 py-2 font-medium">Vencimento</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: SegContrato) => (
              <tr key={c.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.descricao}</td>
                <td className="px-3 py-2 text-xs">
                  <div>{c.empresas?.razao_social}</div>
                  {c.obras && <div className="text-muted-foreground">{c.obras.nome}</div>}
                </td>
                <td className="px-3 py-2 text-xs">{c.fornecedores?.razao_social || "—"}</td>
                <td className="px-3 py-2">R$ {Number(c.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-xs">Dia {c.dia_vencimento}</td>
                <td className="px-3 py-2">
                  {c.status === "ativo" && <Badge className="bg-success/15 text-success border-success/30">Ativo</Badge>}
                  {c.status === "suspenso" && <Badge className="bg-warning/20 text-warning-foreground border-warning/30">Suspenso</Badge>}
                  {c.status === "encerrado" && <Badge className="bg-destructive/15 text-destructive border-destructive/30">Encerrado</Badge>}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Nenhum contrato</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============ CUSTOS AVULSOS ============
const emptyCusto = {
  empresa_id: "", obra_id: "", fornecedor_id: "", documento_id: "",
  descricao: "", tipo_documento: "Laudo", valor: 0,
  data_emissao: new Date().toISOString().split("T")[0],
  data_vencimento: "", forma_pagamento: "boleto",
  status: "pendente", observacoes: "",
};

function CustosTab({ custos, documentos, empresas, obras, fornecedores, reload }: any) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyCusto);
  const [saving, setSaving] = useState(false);

  const obrasFiltradas = obras.filter((o: Obra) => !form.empresa_id || o.empresa_id === form.empresa_id);

  const openNew = () => { setEditId(null); setForm(emptyCusto); setShowForm(true); };
  const openEdit = (c: SegCusto) => {
    setEditId(c.id);
    setForm({
      empresa_id: c.empresa_id, obra_id: c.obra_id || "", fornecedor_id: c.fornecedor_id || "",
      documento_id: c.documento_id || "",
      descricao: c.descricao, tipo_documento: c.tipo_documento || "Laudo", valor: c.valor,
      data_emissao: c.data_emissao, data_vencimento: c.data_vencimento,
      forma_pagamento: c.forma_pagamento || "boleto", status: c.status, observacoes: c.observacoes || "",
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.empresa_id || !form.descricao || !form.data_vencimento) {
      toast({ title: "Preencha empresa, descrição e data de vencimento", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      obra_id: form.obra_id || null,
      fornecedor_id: form.fornecedor_id || null,
      documento_id: form.documento_id || null,
      valor: Number(form.valor),
    };
    const { error } = editId
      ? await supabase.from("seguranca_custos").update(payload).eq("id", editId)
      : await supabase.from("seguranca_custos").insert(payload);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: editId ? "Custo atualizado" : "Custo criado" }); setShowForm(false); reload(); }
    setSaving(false);
  };

  const enviarFinanceiro = async (c: SegCusto) => {
    if (c.conta_pagar_id) { toast({ title: "Já enviado ao financeiro" }); return; }
    const fornecedorNome = fornecedores.find((f: Fornecedor) => f.id === c.fornecedor_id)?.razao_social || "Fornecedor SST";
    const { data, error } = await supabase.from("contas_pagar").insert({
      empresa_id: c.empresa_id,
      obra_id: c.obra_id,
      fornecedor_id: c.fornecedor_id,
      descricao: `SST - ${c.descricao}`,
      categoria: "Segurança do Trabalho",
      valor: c.valor,
      data_vencimento: c.data_vencimento,
      forma_pagamento: c.forma_pagamento,
      status: "pendente",
      documento: c.tipo_documento || "Custo SST",
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("seguranca_custos").update({ status: "enviado_financeiro", conta_pagar_id: data.id }).eq("id", c.id);
    toast({ title: "Lançamento enviado ao Financeiro" });
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir custo?")) return;
    const { error } = await supabase.from("seguranca_custos").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído" }); reload(); }
  };

  const filtered = custos.filter((c: SegCusto) => {
    const s = search.toLowerCase();
    return !s || c.descricao.toLowerCase().includes(s) ||
      (c.fornecedores?.razao_social || "").toLowerCase().includes(s);
  });

  const docsDaEmpresa = documentos.filter((d: SegDoc) => !form.empresa_id || d.empresa_id === form.empresa_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar custo..." className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Custo</Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-[#3A5C35]/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? "Editar custo" : "Novo custo avulso"}</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Empresa *">
              <select value={form.empresa_id} onChange={e => setForm({ ...form, empresa_id: e.target.value, obra_id: "", documento_id: "" })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Selecione</option>
                {empresas.map((e: Empresa) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
              </select>
            </Field>
            <Field label="Obra (opcional)">
              <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">— (toda a empresa)</option>
                {obrasFiltradas.map((o: Obra) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor">
              <select value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Selecione</option>
                {fornecedores.map((f: Fornecedor) => <option key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</option>)}
              </select>
            </Field>
            <Field label="Tipo documento">
              <select value={form.tipo_documento} onChange={e => setForm({ ...form, tipo_documento: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Descrição *">
                <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Elaboração LTCAT" />
              </Field>
            </div>
            <Field label="Valor (R$) *">
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </Field>
            <Field label="Data emissão *">
              <Input type="date" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} />
            </Field>
            <Field label="Data vencimento *">
              <Input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} />
            </Field>
            <Field label="Forma pagamento">
              <select value={form.forma_pagamento} onChange={e => setForm({ ...form, forma_pagamento: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="boleto">Boleto</option>
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
              </select>
            </Field>
            <Field label="Documento vinculado (opcional)">
              <select value={form.documento_id} onChange={e => setForm({ ...form, documento_id: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="">—</option>
                {docsDaEmpresa.map((d: SegDoc) => <option key={d.id} value={d.id}>{d.tipo} - {d.titulo}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border px-3 text-sm">
                <option value="pendente">Pendente</option>
                <option value="enviado_financeiro">Enviado Financeiro</option>
                <option value="pago">Pago</option>
              </select>
            </Field>
            <div className="md:col-span-3">
              <Field label="Observações">
                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm" />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Empresa / Obra</th>
              <th className="px-3 py-2 font-medium">Fornecedor</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Vencimento</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: SegCusto) => (
              <tr key={c.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{c.descricao}</td>
                <td className="px-3 py-2"><Badge variant="outline">{c.tipo_documento || "—"}</Badge></td>
                <td className="px-3 py-2 text-xs">
                  <div>{c.empresas?.razao_social}</div>
                  {c.obras && <div className="text-muted-foreground">{c.obras.nome}</div>}
                </td>
                <td className="px-3 py-2 text-xs">{c.fornecedores?.razao_social || "—"}</td>
                <td className="px-3 py-2">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-xs">{new Date(c.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2">
                  {c.status === "pendente" && <Badge className="bg-warning/20 text-warning-foreground border-warning/30">Pendente</Badge>}
                  {c.status === "enviado_financeiro" && <Badge className="bg-primary/15 text-primary border-primary/30">No Financeiro</Badge>}
                  {c.status === "pago" && <Badge className="bg-success/15 text-success border-success/30">Pago</Badge>}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {!c.conta_pagar_id && (
                      <Button variant="ghost" size="sm" onClick={() => enviarFinanceiro(c)} title="Enviar ao Financeiro">
                        <Send className="h-4 w-4 text-[#3A5C35]" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhum custo lançado</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============ Field helper ============
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
