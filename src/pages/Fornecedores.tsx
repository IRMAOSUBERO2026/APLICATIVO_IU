import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Truck, Plus, Search, Edit2, Trash2, Save, X, Phone, Mail, MapPin } from "lucide-react";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  cpf: string | null;
  inscricao_estadual: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
}

const emptyForm = {
  razao_social: "", nome_fantasia: "", cnpj: "", cpf: "", inscricao_estadual: "",
  contato: "", telefone: "", email: "", endereco: "", cidade: "", uf: "", cep: "", observacoes: "",
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [stats, setStats] = useState({ totalCompras: 0, totalExames: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: forn }, { data: compras }, { data: exames }] = await Promise.all([
      supabase.from("fornecedores").select("*").order("razao_social"),
      supabase.from("compras").select("fornecedor_id"),
      supabase.from("solicitacoes_exame").select("fornecedor_id"),
    ]);
    if (forn) setFornecedores(forn);
    setStats({
      totalCompras: compras?.filter(c => c.fornecedor_id).length || 0,
      totalExames: exames?.filter(e => e.fornecedor_id).length || 0,
    });
  };

  const handleSave = async () => {
    if (!form.razao_social) {
      toast({ title: "Razão Social é obrigatória", variant: "destructive" });
      return;
    }
    const payload = {
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      cnpj: form.cnpj || null,
      cpf: form.cpf || null,
      inscricao_estadual: form.inscricao_estadual || null,
      contato: form.contato || null,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      cep: form.cep || null,
      observacoes: form.observacoes || null,
    };

    if (editId) {
      const { error } = await supabase.from("fornecedores").update(payload).eq("id", editId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Fornecedor atualizado" });
    } else {
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Fornecedor cadastrado" });
    }
    resetForm();
    loadData();
  };

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  const openEdit = (f: Fornecedor) => {
    setEditId(f.id);
    setForm({
      razao_social: f.razao_social, nome_fantasia: f.nome_fantasia || "",
      cnpj: f.cnpj || "", cpf: f.cpf || "", inscricao_estadual: f.inscricao_estadual || "",
      contato: f.contato || "", telefone: f.telefone || "", email: f.email || "",
      endereco: f.endereco || "", cidade: f.cidade || "", uf: f.uf || "",
      cep: f.cep || "", observacoes: f.observacoes || "",
    });
    setShowForm(true);
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from("fornecedores").update({ ativo: !ativo }).eq("id", id);
    toast({ title: ativo ? "Fornecedor inativado" : "Fornecedor reativado" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: "Fornecedor pode estar vinculado a compras ou exames.", variant: "destructive" }); return; }
    toast({ title: "Fornecedor removido" });
    loadData();
  };

  const filtered = fornecedores.filter(f =>
    f.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    (f.nome_fantasia || "").toLowerCase().includes(search.toLowerCase()) ||
    (f.cnpj || "").includes(search) ||
    (f.cpf || "").includes(search)
  );

  const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Fornecedores
            </h1>
            <p className="text-sm text-muted-foreground">
              {fornecedores.length} cadastrados · {stats.totalCompras} compras · {stats.totalExames} exames vinculados
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Novo Fornecedor
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editId ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
              <button onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Razão Social *", key: "razao_social", placeholder: "Razão Social" },
                { label: "Nome Fantasia", key: "nome_fantasia", placeholder: "Nome Fantasia" },
                { label: "CNPJ", key: "cnpj", placeholder: "00.000.000/0000-00" },
                { label: "CPF (se PF)", key: "cpf", placeholder: "000.000.000-00" },
                { label: "Inscrição Estadual", key: "inscricao_estadual", placeholder: "IE" },
                { label: "Contato", key: "contato", placeholder: "Nome do contato" },
                { label: "Telefone", key: "telefone", placeholder: "(00) 00000-0000" },
                { label: "E-mail", key: "email", placeholder: "email@fornecedor.com" },
                { label: "Endereço", key: "endereco", placeholder: "Rua, número" },
                { label: "Cidade", key: "cidade" },
                { label: "CEP", key: "cep", placeholder: "00000-000" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || ""}
                    className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">UF</label>
                <select value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value }))} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione...</option>
                  {ufs.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações sobre o fornecedor..." />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors">
                <Save className="h-4 w-4" /> {editId ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia, CNPJ ou CPF..." className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <ScrollableTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fornecedor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CNPJ/CPF</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Localização</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum fornecedor encontrado</td></tr>
                ) : filtered.map(f => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-medium">{f.razao_social}</span>
                        {f.nome_fantasia && <p className="text-[10px] text-muted-foreground">{f.nome_fantasia}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">{f.cnpj || f.cpf || "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        {f.contato && <p className="text-xs">{f.contato}</p>}
                        {f.telefone && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" /> {f.telefone}
                          </p>
                        )}
                        {f.email && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5" /> {f.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {f.cidade || f.uf ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {[f.cidade, f.uf].filter(Boolean).join("/")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleAtivo(f.id, f.ativo)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                          f.ativo ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {f.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(f)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(f.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      </div>
    </AppLayout>
  );
}
