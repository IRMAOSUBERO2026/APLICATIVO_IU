import { AppLayout } from "@/components/layout/AppLayout";
import { HardHat, Plus, Search, MapPin, Calendar, Eye, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { DocumentManagerGeneric } from "@/components/shared/DocumentManagerGeneric";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ObraDetalhe from "@/components/obras/ObraDetalhe";
import { ObraPipeline, PIPELINE_STAGES, getStage, getStageIndex } from "@/components/obras/ObraPipeline";

const SUBPASTAS_OBRA = [
  "Projetos", "Orçamentos", "Contratos", "Emails", "Anexos",
  "Notas Fiscais", "Medições", "Diário de Obra", "Reuniões e Atas",
  "Documentos de Segurança", "Outros",
];

interface Obra {
  id: string; codigo: string; nome: string; empresa_id: string; construtora?: string;
  endereco?: string; cidade?: string; uf?: string; status: string;
  data_inicio?: string; data_previsao_fim?: string; data_fim?: string; observacoes?: string;
  tipo_obra?: string; engenheiro_responsavel?: string; cliente?: string;
  horario_padrao?: any;
  percentual_retencao_padrao?: number;
  impostos_padrao?: Array<{ imposto: string; aliquota: number }>;
  observacoes_fiscais?: string;
}

const IMPOSTOS_DISPONIVEIS = ["ISS", "IRRF", "PIS", "COFINS", "CSLL", "INSS"];
interface Empresa { id: string; razao_social: string; nome_fantasia?: string; cnpj: string; telefone?: string; email?: string; endereco?: string; cidade?: string; uf?: string; logo_url?: string; cor_primaria?: string; cor_secundaria?: string; nome_responsavel?: string; cargo_responsavel?: string; }

const emptyForm = {
  codigo: "", nome: "", empresa_id: "", construtora: "", cliente: "", endereco: "", cidade: "", uf: "",
  status: "prospeccao", data_inicio: "", data_previsao_fim: "", data_fim: "", observacoes: "",
  tipo_obra: "", engenheiro_responsavel: "",
  percentual_retencao_padrao: 5,
  impostos_padrao: [] as Array<{ imposto: string; aliquota: number }>,
  observacoes_fiscais: "",
};

export default function Obras() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detalheObra, setDetalheObra] = useState<Obra | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [obrasRes, empRes] = await Promise.all([
      supabase.from("obras").select("*").order("codigo"),
      supabase.from("empresas").select("id,razao_social,nome_fantasia,cnpj").eq("ativo", true),
    ]);
    if (obrasRes.data) setObras(obrasRes.data as any as Obra[]);
    if (empRes.data) setEmpresas(empRes.data as Empresa[]);
    setLoading(false);
  };

  const filtered = obras.filter(o => {
    const matchSearch = o.nome.toLowerCase().includes(search.toLowerCase()) ||
      o.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (o.construtora || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.cliente || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const STATUS_EM_EXECUCAO = ["em_execucao", "em_andamento"];
  const obrasEmExecucao = filtered.filter(o => STATUS_EM_EXECUCAO.includes(o.status));
  const obrasDemais = filtered.filter(o => !STATUS_EM_EXECUCAO.includes(o.status));

  const openNew = () => { setEditingObra(null); setForm(emptyForm); setFormOpen(true); };

  const openEdit = (obra: Obra) => {
    setEditingObra(obra);
    setForm({
      codigo: obra.codigo, nome: obra.nome, empresa_id: obra.empresa_id,
      construtora: obra.construtora || "", cliente: obra.cliente || "",
      endereco: obra.endereco || "", cidade: obra.cidade || "", uf: obra.uf || "",
      status: obra.status, data_inicio: obra.data_inicio || "",
      data_previsao_fim: obra.data_previsao_fim || "", data_fim: obra.data_fim || "",
      observacoes: obra.observacoes || "", tipo_obra: obra.tipo_obra || "",
      engenheiro_responsavel: obra.engenheiro_responsavel || "",
      percentual_retencao_padrao: Number(obra.percentual_retencao_padrao ?? 5),
      impostos_padrao: Array.isArray(obra.impostos_padrao) ? obra.impostos_padrao : [],
      observacoes_fiscais: obra.observacoes_fiscais || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nome || !form.empresa_id) {
      toast({ title: "Preencha código, nome e empresa", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload: any = { ...form };
    if (!payload.data_inicio) payload.data_inicio = null;
    if (!payload.data_previsao_fim) payload.data_previsao_fim = null;
    if (!payload.data_fim) payload.data_fim = null;

    if (editingObra) {
      const { error } = await supabase.from("obras").update(payload).eq("id", editingObra.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Obra atualizada" });
    } else {
      const { error } = await supabase.from("obras").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Obra cadastrada" });
    }
    setSaving(false); setFormOpen(false); loadData();
  };

  const getEmpresaNome = (empresaId: string) => {
    const emp = empresas.find(e => e.id === empresaId);
    return emp ? (emp.nome_fantasia || emp.razao_social) : "-";
  };

  // Group by status for pipeline view
  const statusCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.value] = obras.filter(o => o.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  if (detalheObra) {
    return (
      <ObraDetalhe
        obra={detalheObra} empresas={empresas}
        onBack={() => { setDetalheObra(null); loadData(); }}
        onEdit={() => openEdit(detalheObra)}
        subpastasDoc={SUBPASTAS_OBRA}
      />
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Obras</h1>
            <p className="text-sm text-muted-foreground">{obras.length} obras cadastradas</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Obra</Button>
        </div>

        {/* Pipeline Summary - mini cards */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PIPELINE_STAGES.filter(s => s.value !== "paralisada").map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(filterStatus === s.value ? "todos" : s.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === s.value
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <span>{s.emoji}</span>
              <span className="hidden sm:inline">{s.label}</span>
              <Badge variant="secondary" className="h-5 min-w-5 justify-center text-[10px]">
                {statusCounts[s.value] || 0}
              </Badge>
            </button>
          ))}
          {filterStatus !== "todos" && (
            <button onClick={() => setFilterStatus("todos")} className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground">
              Limpar
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar obra, código ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Cards */}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma obra encontrada</div>
        ) : (
          <>
            {(() => {
              const renderCard = (obra: Obra) => {
                const stage = getStage(obra.status);
                const stageIdx = getStageIndex(obra.status);
                const progress = Math.min(100, ((stageIdx + 1) / 7) * 100);
                return (
                  <button
                    key={obra.id}
                    onClick={() => setDetalheObra(obra)}
                    className="group rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left animate-fade-in"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <HardHat className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{obra.codigo} — {obra.nome}</h3>
                          <p className="text-xs text-muted-foreground truncate">{obra.cliente || obra.construtora || getEmpresaNome(obra.empresa_id)}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${stage.color}`}>
                        {stage.emoji} {stage.label}
                      </span>
                    </div>
                    <Progress value={progress} className="h-1 mb-2" />
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      {(obra.cidade || obra.uf) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {obra.cidade}{obra.uf ? `/${obra.uf}` : ""}
                        </span>
                      )}
                      {obra.data_previsao_fim && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(obra.data_previsao_fim + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {getEmpresaNome(obra.empresa_id)}
                      </span>
                    </div>
                  </button>
                );
              };

              return (
                <div className="space-y-6">
                  {/* Em Execução */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                        Obras em Execução
                      </h2>
                      <Badge variant="secondary" className="h-5 text-[10px]">{obrasEmExecucao.length}</Badge>
                    </div>
                    {obrasEmExecucao.length === 0 ? (
                      <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                        Nenhuma obra em execução no momento
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {obrasEmExecucao.map(renderCard)}
                      </div>
                    )}
                  </section>

                  {/* Demais Obras */}
                  {obrasDemais.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
                          Demais Obras
                        </h2>
                        <Badge variant="secondary" className="h-5 text-[10px]">{obrasDemais.length}</Badge>
                        <span className="text-[11px] text-muted-foreground ml-1">
                          (prospecção, orçamento, negociação, contrato fechado, finalizadas, paralisadas, canceladas)
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 opacity-90">
                        {obrasDemais.map(renderCard)}
                      </div>
                    </section>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingObra ? "Editar Obra" : "Nova Obra"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="OBR-001" /></div>
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da obra" /></div>
            <div>
              <Label>Empresa (CNPJ) *</Label>
              <Select value={form.empresa_id} onValueChange={v => setForm(f => ({ ...f, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{(e.nome_fantasia || e.razao_social)} — {e.cnpj}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Cliente / Contratante</Label><Input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} /></div>
            <div><Label>Construtora</Label><Input value={form.construtora} onChange={e => setForm(f => ({ ...f, construtora: e.target.value }))} /></div>
            <div><Label>Tipo de Obra</Label><Input value={form.tipo_obra} onChange={e => setForm(f => ({ ...f, tipo_obra: e.target.value }))} placeholder="Concreto armado, reforma..." /></div>
            <div><Label>Engenheiro Responsável</Label><Input value={form.engenheiro_responsavel} onChange={e => setForm(f => ({ ...f, engenheiro_responsavel: e.target.value }))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} /></div>
            <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
            <div><Label>UF</Label><Input value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value }))} maxLength={2} /></div>
            <div><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div><Label>Previsão Término</Label><Input type="date" value={form.data_previsao_fim} onChange={e => setForm(f => ({ ...f, data_previsao_fim: e.target.value }))} /></div>
            <div><Label>Data Conclusão</Label><Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} /></div>

            {/* Bloco Fiscal — usado nas Medições */}
            <div className="sm:col-span-2 mt-2 border-t pt-4">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Configuração Fiscal (usado nas Medições)</h4>
            </div>
            <div>
              <Label>Retenção Contratual Padrão (%)</Label>
              <Input type="number" step="0.01" value={form.percentual_retencao_padrao}
                onChange={e => setForm(f => ({ ...f, percentual_retencao_padrao: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Impostos Padrão (% sobre o bruto)</Label>
              <div className="space-y-2">
                {form.impostos_padrao.map((imp, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={imp.imposto} onValueChange={v => setForm(f => ({
                      ...f,
                      impostos_padrao: f.impostos_padrao.map((x, ix) => ix === i ? { ...x, imposto: v } : x),
                    }))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Imposto" /></SelectTrigger>
                      <SelectContent>{IMPOSTOS_DISPONIVEIS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" step="0.01" placeholder="Alíquota %" className="w-32"
                      value={imp.aliquota || ""}
                      onChange={e => setForm(f => ({
                        ...f,
                        impostos_padrao: f.impostos_padrao.map((x, ix) => ix === i ? { ...x, aliquota: Number(e.target.value) } : x),
                      }))} />
                    <Button variant="outline" size="sm" type="button"
                      onClick={() => setForm(f => ({ ...f, impostos_padrao: f.impostos_padrao.filter((_, ix) => ix !== i) }))}>
                      Remover
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" type="button"
                  onClick={() => setForm(f => ({ ...f, impostos_padrao: [...f.impostos_padrao, { imposto: "ISS", aliquota: 0 }] }))}>
                  + Adicionar imposto
                </Button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações Fiscais</Label>
              <Textarea value={form.observacoes_fiscais}
                onChange={e => setForm(f => ({ ...f, observacoes_fiscais: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
