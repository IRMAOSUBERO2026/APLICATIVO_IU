import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Search, Edit2, Trash2, Save, X, Phone, Mail, MapPin } from "lucide-react";

interface Cliente {
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

const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data } = await supabase.from("clientes").select("*").order("razao_social");
    if (data) setClientes(data);
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
      const { error } = await supabase.from("clientes").update(payload).eq("id", editId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Cliente atualizado" });
    } else {
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Cliente cadastrado" });
    }
    resetForm();
    loadData();
  };

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  const openEdit = (c: Cliente) => {
    setEditId(c.id);
    setForm({
      razao_social: c.razao_social, nome_fantasia: c.nome_fantasia || "",
      cnpj: c.cnpj || "", cpf: c.cpf || "", inscricao_estadual: c.inscricao_estadual || "",
      contato: c.contato || "", telefone: c.telefone || "", email: c.email || "",
      endereco: c.endereco || "", cidade: c.cidade || "", uf: c.uf || "",
      cep: c.cep || "", observacoes: c.observacoes || "",
    });
    setShowForm(true);
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from("clientes").update({ ativo: !ativo }).eq("id", id);
    toast({ title: ativo ? "Cliente inativado" : "Cliente reativado" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cliente removido" });
    loadData();
  };

  const filtered = clientes.filter(c =>
    c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    (c.nome_fantasia || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.cnpj || "").includes(search) ||
    (c.cpf || "").includes(search)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Clientes
            </h1>
            <p className="text-sm text-muted-foreground">{clientes.length} cadastrados</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Novo Cliente
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editId ? "Editar Cliente" : "Novo Cliente"}</h3>
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
                { label: "E-mail", key: "email", placeholder: "email@cliente.com" },
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
              <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações..." />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors">
                <Save className="h-4 w-4" /> {editId ? "Atualizar" : "Salvar"}
              </button>
            </div>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia, CNPJ ou CPF..." className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CNPJ/CPF</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Localização</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-medium">{c.razao_social}</span>
                        {c.nome_fantasia && <p className="text-[10px] text-muted-foreground">{c.nome_fantasia}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">{c.cnpj || c.cpf || "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        {c.contato && <p className="text-xs">{c.contato}</p>}
                        {c.telefone && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {c.telefone}</p>}
                        {c.email && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {c.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {c.cidade || c.uf ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {[c.cidade, c.uf].filter(Boolean).join("/")}</span> : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => handleToggleAtivo(c.id, c.ativo)} className={`rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-colors ${c.ativo ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
