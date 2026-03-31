import { AppLayout } from "@/components/layout/AppLayout";
import { HardHat, Plus, Search, MapPin, Calendar, FolderOpen, Eye, Edit, Trash2, Building2 } from "lucide-react";
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
import ObraDetalhe from "@/components/obras/ObraDetalhe";
import { ObraPipeline, PIPELINE_STAGES, getStage } from "@/components/obras/ObraPipeline";

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
}
interface Empresa { id: string; razao_social: string; nome_fantasia?: string; cnpj: string; }

const emptyForm = {
  codigo: "", nome: "", empresa_id: "", construtora: "", cliente: "", endereco: "", cidade: "", uf: "",
  status: "prospeccao", data_inicio: "", data_previsao_fim: "", data_fim: "", observacoes: "",
  tipo_obra: "", engenheiro_responsavel: "",
};

export default function Obras() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [docOpen, setDocOpen] = useState(false);
  const [selectedObraDoc, setSelectedObraDoc] = useState<{ id: string; nome: string } | null>(null);
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
    if (obrasRes.data) setObras(obrasRes.data as Obra[]);
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

  const handleDelete = async (obra: Obra) => {
    if (!confirm(`Excluir obra "${obra.nome}"?`)) return;
    const { error } = await supabase.from("obras").delete().eq("id", obra.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Obra excluída" }); loadData(); }
  };

  const getEmpresaNome = (empresaId: string) => {
    const emp = empresas.find(e => e.id === empresaId);
    return emp ? (emp.nome_fantasia || emp.razao_social) : "-";
  };

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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Obras</h1>
            <p className="text-sm text-muted-foreground">{obras.length} obras cadastradas</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova Obra</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar obra, código ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma obra encontrada</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(obra => {
              const stage = getStage(obra.status);
              return (
                <div key={obra.id} className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                        <HardHat className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{obra.codigo} — {obra.nome}</h3>
                        <p className="text-xs text-muted-foreground truncate">{obra.cliente || obra.construtora || getEmpresaNome(obra.empresa_id)}</p>
                      </div>
                    </div>
                    <ObraPipeline currentStatus={obra.status} compact />
                  </div>

                  <div className="space-y-2 mb-3">
                    {(obra.cidade || obra.uf) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {obra.cidade}{obra.uf ? `/${obra.uf}` : ""}
                      </div>
                    )}
                    {obra.data_previsao_fim && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" /> Previsão: {new Date(obra.data_previsao_fim + "T12:00:00").toLocaleDateString("pt-BR")}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" /> {getEmpresaNome(obra.empresa_id)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border-t pt-3">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDetalheObra(obra)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Detalhes
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEdit(obra)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSelectedObraDoc({ id: obra.id, nome: obra.nome }); setDocOpen(true); }}>
                      <FolderOpen className="h-3.5 w-3.5 mr-1" /> Docs
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(obra)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedObraDoc && (
        <DocumentManagerGeneric open={docOpen} onOpenChange={setDocOpen} entityId={selectedObraDoc.id} entityNome={selectedObraDoc.nome} basePath="obras" subpastas={SUBPASTAS_OBRA} />
      )}
    </AppLayout>
  );
}
