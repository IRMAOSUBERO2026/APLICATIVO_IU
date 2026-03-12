import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, Plus, Search, Edit2, Trash2, FolderOpen, Save, X } from "lucide-react";
import { DocumentManagerGeneric } from "@/components/shared/DocumentManagerGeneric";

const SUBPASTAS_EMPRESA = [
  "Documentos da Empresa",
  "Documentos dos Sócios",
  "Documentos de Segurança",
  "Outros Documentos",
];

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  inscricao_estadual: string | null;
  ativo: boolean;
}

const emptyForm = {
  razao_social: "", nome_fantasia: "", cnpj: "", telefone: "", email: "",
  endereco: "", cidade: "", uf: "", cep: "", inscricao_estadual: "",
};

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [docOpen, setDocOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => { loadEmpresas(); }, []);

  const loadEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("razao_social");
    if (data) setEmpresas(data);
  };

  const handleSave = async () => {
    if (!form.razao_social || !form.cnpj) {
      toast({ title: "Razão Social e CNPJ são obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      cnpj: form.cnpj,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      cep: form.cep || null,
      inscricao_estadual: form.inscricao_estadual || null,
    };

    if (editId) {
      const { error } = await supabase.from("empresas").update(payload).eq("id", editId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Empresa atualizada" });
    } else {
      const { error } = await supabase.from("empresas").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Empresa cadastrada" });
    }
    resetForm();
    loadEmpresas();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (e: Empresa) => {
    setEditId(e.id);
    setForm({
      razao_social: e.razao_social, nome_fantasia: e.nome_fantasia || "",
      cnpj: e.cnpj, telefone: e.telefone || "", email: e.email || "",
      endereco: e.endereco || "", cidade: e.cidade || "", uf: e.uf || "",
      cep: e.cep || "", inscricao_estadual: e.inscricao_estadual || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Empresa removida" });
    loadEmpresas();
  };

  const openDocs = (emp: Empresa) => {
    setSelectedEmpresa({ id: emp.id, nome: emp.razao_social });
    setDocOpen(true);
  };

  const filtered = empresas.filter(e =>
    e.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    (e.nome_fantasia || "").toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search)
  );

  const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Empresas
            </h1>
            <p className="text-sm text-muted-foreground">{empresas.length} empresas cadastradas</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Empresa
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editId ? "Editar Empresa" : "Nova Empresa"}</h3>
              <button onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Razão Social *", key: "razao_social", placeholder: "Razão Social da Empresa" },
                { label: "Nome Fantasia", key: "nome_fantasia", placeholder: "Nome Fantasia" },
                { label: "CNPJ *", key: "cnpj", placeholder: "00.000.000/0000-00" },
                { label: "Inscrição Estadual", key: "inscricao_estadual", placeholder: "IE" },
                { label: "Telefone", key: "telefone", placeholder: "(00) 00000-0000" },
                { label: "E-mail", key: "email", placeholder: "email@empresa.com" },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia ou CNPJ..." className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Razão Social</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CNPJ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cidade/UF</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Pasta</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma empresa encontrada</td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-medium">{e.razao_social}</span>
                        {e.nome_fantasia && <p className="text-[10px] text-muted-foreground">{e.nome_fantasia}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{e.cnpj}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{[e.cidade, e.uf].filter(Boolean).join("/") || "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{e.telefone || "—"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => openDocs(e)} className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Pasta de Documentos">
                        <FolderOpen className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(e)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedEmpresa && (
        <DocumentManagerGeneric
          open={docOpen}
          onOpenChange={setDocOpen}
          entityId={selectedEmpresa.id}
          entityNome={selectedEmpresa.nome}
          basePath="empresas"
          subpastas={SUBPASTAS_EMPRESA}
        />
      )}
    </AppLayout>
  );
}
