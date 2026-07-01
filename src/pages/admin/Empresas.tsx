import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, Plus, Search } from "lucide-react";
import { DocumentManagerGeneric } from "@/components/shared/DocumentManagerGeneric";
import { EmpresaForm, emptyForm, type EmpresaFormData } from "@/components/empresas/EmpresaForm";
import { EmpresaCard } from "@/components/empresas/EmpresaCard";

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
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  nome_responsavel: string | null;
  cargo_responsavel: string | null;
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EmpresaFormData | undefined>();
  const [docOpen, setDocOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<{ id: string; nome: string } | null>(null);
  const [obrasCount, setObrasCount] = useState<Record<string, number>>({});
  const [funcCount, setFuncCount] = useState<Record<string, number>>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [empRes, obrasRes, funcRes] = await Promise.all([
      supabase.from("empresas").select("*").order("razao_social"),
      supabase.from("obras").select("id, empresa_id"),
      supabase.from("funcionarios").select("id, empresa_id").eq("status", "ativo"),
    ]);
    if (empRes.data) setEmpresas(empRes.data);

    const oc: Record<string, number> = {};
    (obrasRes.data || []).forEach(o => { oc[o.empresa_id] = (oc[o.empresa_id] || 0) + 1; });
    setObrasCount(oc);

    const fc: Record<string, number> = {};
    (funcRes.data || []).forEach(f => { fc[f.empresa_id] = (fc[f.empresa_id] || 0) + 1; });
    setFuncCount(fc);
  };

  const openNew = () => {
    setEditId(null);
    setEditData(undefined);
    setShowForm(true);
  };

  const openEdit = (e: Empresa) => {
    setEditId(e.id);
    setEditData({
      razao_social: e.razao_social,
      nome_fantasia: e.nome_fantasia || "",
      cnpj: e.cnpj,
      telefone: e.telefone || "",
      email: e.email || "",
      endereco: e.endereco || "",
      cidade: e.cidade || "",
      uf: e.uf || "",
      cep: e.cep || "",
      inscricao_estadual: e.inscricao_estadual || "",
      nome_responsavel: e.nome_responsavel || "",
      cargo_responsavel: e.cargo_responsavel || "",
      cor_primaria: e.cor_primaria || "#3c502d",
      cor_secundaria: e.cor_secundaria || "#1a1a1a",
      logo_url: e.logo_url || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Empresa removida" });
    loadAll();
  };

  const filtered = empresas.filter(e =>
    e.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    (e.nome_fantasia || "").toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj.includes(search)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Empresas
            </h1>
            <p className="text-sm text-muted-foreground">{empresas.length} CNPJs cadastrados</p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Empresa
          </button>
        </div>

        {showForm && (
          <EmpresaForm
            editId={editId}
            initialData={editData}
            onClose={() => setShowForm(false)}
            onSaved={loadAll}
          />
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia ou CNPJ..." className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Cards Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Nenhuma empresa encontrada
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(e => (
              <EmpresaCard
                key={e.id}
                empresa={e}
                obrasCount={obrasCount[e.id] || 0}
                funcCount={funcCount[e.id] || 0}
                onEdit={() => openEdit(e)}
                onDelete={() => handleDelete(e.id)}
                onDocs={() => {
                  setSelectedEmpresa({ id: e.id, nome: e.razao_social });
                  setDocOpen(true);
                }}
              />
            ))}
          </div>
        )}
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
