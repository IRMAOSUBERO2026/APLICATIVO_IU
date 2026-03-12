import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Home, Plus, Search, Edit2, X, Calendar, DollarSign,
  Building2, MapPin, CheckCircle, AlertCircle, PauseCircle,
} from "lucide-react";

interface Contrato {
  id: string;
  empresa_id: string;
  obra_id: string | null;
  descricao: string;
  tipo: string;
  locador: string;
  locador_cpf_cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  valor_mensal: number;
  dia_vencimento: number;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  obras?: { nome: string } | null;
  empresas?: { razao_social: string } | null;
}

interface Empresa {
  id: string;
  razao_social: string;
}

interface Obra {
  id: string;
  nome: string;
}

const TIPOS = ["Casa", "Escritório", "Galpão", "Terreno", "Sala Comercial", "Outro"];

const emptyForm = {
  empresa_id: "",
  obra_id: "",
  descricao: "",
  tipo: "Casa",
  locador: "",
  locador_cpf_cnpj: "",
  endereco: "",
  cidade: "",
  uf: "",
  valor_mensal: 0,
  dia_vencimento: 10,
  data_inicio: "",
  data_fim: "",
  status: "ativo",
  observacoes: "",
};

export default function ContratosLocacao() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [c, e, o] = await Promise.all([
      supabase.from("contratos_locacao").select("*, obras(nome), empresas(razao_social)").order("created_at", { ascending: false }),
      supabase.from("empresas").select("id, razao_social").eq("ativo", true).order("razao_social"),
      supabase.from("obras").select("id, nome").order("nome"),
    ]);
    setContratos((c.data as any) || []);
    setEmpresas(e.data || []);
    setObras(o.data || []);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, empresa_id: empresas[0]?.id || "" });
    setShowForm(true);
  };

  const openEdit = (c: Contrato) => {
    setEditId(c.id);
    setForm({
      empresa_id: c.empresa_id,
      obra_id: c.obra_id || "",
      descricao: c.descricao,
      tipo: c.tipo,
      locador: c.locador,
      locador_cpf_cnpj: c.locador_cpf_cnpj || "",
      endereco: c.endereco || "",
      cidade: c.cidade || "",
      uf: c.uf || "",
      valor_mensal: c.valor_mensal,
      dia_vencimento: c.dia_vencimento,
      data_inicio: c.data_inicio,
      data_fim: c.data_fim || "",
      status: c.status,
      observacoes: c.observacoes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.descricao || !form.locador || !form.empresa_id || !form.data_inicio) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      empresa_id: form.empresa_id,
      obra_id: form.obra_id || null,
      descricao: form.descricao,
      tipo: form.tipo.toLowerCase(),
      locador: form.locador,
      locador_cpf_cnpj: form.locador_cpf_cnpj || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      valor_mensal: form.valor_mensal,
      dia_vencimento: form.dia_vencimento,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      status: form.status,
      observacoes: form.observacoes || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("contratos_locacao").update(payload).eq("id", editId));
    } else {
      const { data: inserted, error: insertError } = await supabase.from("contratos_locacao").insert(payload).select().single();
      error = insertError;

      // Gerar contas a pagar automáticas
      if (!error && inserted) {
        await gerarContasPagar(inserted);
      }
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Contrato atualizado" : "Contrato criado com lançamentos financeiros" });
      setShowForm(false);
      loadAll();
    }
    setSaving(false);
  };

  const gerarContasPagar = async (contrato: any) => {
    const inicio = new Date(contrato.data_inicio + "T00:00:00");
    const fim = contrato.data_fim ? new Date(contrato.data_fim + "T00:00:00") : null;
    // Gera 12 meses à frente por padrão se não tem data_fim
    const mesesGerar = fim
      ? Math.min(monthDiff(inicio, fim) + 1, 60)
      : 12;

    const lancamentos = [];
    for (let i = 0; i < mesesGerar; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, contrato.dia_vencimento);
      lancamentos.push({
        empresa_id: contrato.empresa_id,
        obra_id: contrato.obra_id || null,
        descricao: `Aluguel - ${contrato.descricao}`,
        categoria: "Aluguel",
        valor: contrato.valor_mensal,
        data_vencimento: d.toISOString().split("T")[0],
        status: "pendente",
        documento: `Contrato ${contrato.id.slice(0, 8)}`,
        parcela: i + 1,
        total_parcelas: mesesGerar,
      });
    }

    if (lancamentos.length > 0) {
      const { error } = await supabase.from("contas_pagar").insert(lancamentos);
      if (error) {
        toast({ title: "Aviso", description: `Contrato salvo mas houve erro ao gerar lançamentos: ${error.message}`, variant: "destructive" });
      } else {
        toast({ title: `${lancamentos.length} parcela(s) geradas no financeiro` });
      }
    }
  };

  const monthDiff = (a: Date, b: Date) =>
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

  const filtered = contratos.filter(c =>
    c.descricao.toLowerCase().includes(search.toLowerCase()) ||
    c.locador.toLowerCase().includes(search.toLowerCase()) ||
    (c.obras?.nome || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (s: string) => {
    if (s === "ativo") return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    if (s === "encerrado") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    return <PauseCircle className="h-3.5 w-3.5 text-warning" />;
  };

  const statusLabel = (s: string) => {
    if (s === "ativo") return "Ativo";
    if (s === "encerrado") return "Encerrado";
    return "Suspenso";
  };

  const totalMensal = contratos.filter(c => c.status === "ativo").reduce((s, c) => s + Number(c.valor_mensal), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contratos de Locação</h1>
            <p className="text-sm text-muted-foreground">{contratos.length} contrato(s) — Total mensal ativo: R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Novo Contrato
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar contrato, locador ou obra..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} onClick={() => openEdit(c)} className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{c.descricao}</h3>
                    <p className="text-xs text-muted-foreground truncate">{c.locador}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {statusIcon(c.status)}
                  <span className={`text-[10px] font-semibold ${c.status === "ativo" ? "text-success" : c.status === "encerrado" ? "text-destructive" : "text-warning"}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {c.obras?.nome && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {c.obras.nome}
                  </div>
                )}
                {c.endereco && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {c.endereco}{c.cidade ? `, ${c.cidade}` : ""}{c.uf ? ` - ${c.uf}` : ""}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {new Date(c.data_inicio).toLocaleDateString("pt-BR")}
                  {c.data_fim && ` até ${new Date(c.data_fim).toLocaleDateString("pt-BR")}`}
                </div>
              </div>

              <div className="flex justify-between border-t pt-3 mt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Valor Mensal</p>
                  <p className="font-bold text-base text-primary">R$ {Number(c.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Vencimento</p>
                  <p className="font-semibold">Dia {c.dia_vencimento}</p>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold text-lg">{editId ? "Editar Contrato" : "Novo Contrato de Locação"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
                  <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: Casa para operários - Obra Aurora" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa *</label>
                  <select value={form.empresa_id} onChange={e => setForm({ ...form, empresa_id: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Selecione</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.razao_social}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Obra (opcional)</label>
                  <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Nenhuma</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Locador *</label>
                  <input value={form.locador} onChange={e => setForm({ ...form, locador: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nome do locador" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">CPF/CNPJ do Locador</label>
                  <input value={form.locador_cpf_cnpj} onChange={e => setForm({ ...form, locador_cpf_cnpj: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                  <input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                  <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                  <input value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} maxLength={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor Mensal (R$) *</label>
                  <input type="number" step="0.01" value={form.valor_mensal} onChange={e => setForm({ ...form, valor_mensal: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Dia de Vencimento</label>
                  <input type="number" min={1} max={31} value={form.dia_vencimento} onChange={e => setForm({ ...form, dia_vencimento: parseInt(e.target.value) || 10 })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início *</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Fim (opcional)</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
              </div>

              {!editId && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Ao criar o contrato, o sistema gerará automaticamente as parcelas de aluguel no módulo Financeiro (Contas a Pagar).</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Salvando..." : editId ? "Atualizar" : "Criar Contrato"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
