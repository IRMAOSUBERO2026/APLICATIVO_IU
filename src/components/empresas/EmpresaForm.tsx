import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, X, Upload, Image } from "lucide-react";

interface EmpresaFormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  inscricao_estadual: string;
  nome_responsavel: string;
  cargo_responsavel: string;
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string;
}

const emptyForm: EmpresaFormData = {
  razao_social: "", nome_fantasia: "", cnpj: "", telefone: "", email: "",
  endereco: "", cidade: "", uf: "", cep: "", inscricao_estadual: "",
  nome_responsavel: "", cargo_responsavel: "",
  cor_primaria: "#3c502d", cor_secundaria: "#1a1a1a", logo_url: "",
};

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

interface Props {
  editId: string | null;
  initialData?: EmpresaFormData;
  onClose: () => void;
  onSaved: () => void;
}

export function EmpresaForm({ editId, initialData, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EmpresaFormData>(initialData || emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `empresas/logos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
      setForm(p => ({ ...p, logo_url: urlData.publicUrl }));
      toast({ title: "Logo enviado!" });
    }
    setUploading(false);
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
      nome_responsavel: form.nome_responsavel || null,
      cargo_responsavel: form.cargo_responsavel || null,
      cor_primaria: form.cor_primaria || null,
      cor_secundaria: form.cor_secundaria || null,
      logo_url: form.logo_url || null,
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
    onSaved();
    onClose();
  };

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{editId ? "Editar Empresa" : "Nova Empresa"}</h3>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      {/* Logo + Cores */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Image className="h-8 w-8 text-muted-foreground/40" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Upload className="h-3 w-3" /> {uploading ? "Enviando..." : "Upload Logo"}
          </button>
        </div>
        <div className="flex gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cor Primária</label>
            <input type="color" value={form.cor_primaria} onChange={e => set("cor_primaria", e.target.value)} className="h-9 w-14 rounded border cursor-pointer" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cor Secundária</label>
            <input type="color" value={form.cor_secundaria} onChange={e => set("cor_secundaria", e.target.value)} className="h-9 w-14 rounded border cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Campos principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Razão Social *", key: "razao_social", placeholder: "Razão Social" },
          { label: "Nome Fantasia", key: "nome_fantasia" },
          { label: "CNPJ *", key: "cnpj", placeholder: "00.000.000/0000-00" },
          { label: "Inscrição Estadual", key: "inscricao_estadual" },
          { label: "Telefone", key: "telefone", placeholder: "(00) 00000-0000" },
          { label: "E-mail", key: "email", placeholder: "email@empresa.com" },
          { label: "Endereço", key: "endereco" },
          { label: "Cidade", key: "cidade" },
          { label: "CEP", key: "cep", placeholder: "00000-000" },
        ].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            <input
              value={(form as any)[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder || ""}
              className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">UF</label>
          <select value={form.uf} onChange={e => set("uf", e.target.value)} className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Selecione...</option>
            {UFS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Responsável Legal */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Responsável Legal</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nome do Responsável</label>
            <input value={form.nome_responsavel} onChange={e => set("nome_responsavel", e.target.value)} className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nome completo" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cargo</label>
            <input value={form.cargo_responsavel} onChange={e => set("cargo_responsavel", e.target.value)} className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ex: Diretor, Sócio-Administrador" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
        <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors">
          <Save className="h-4 w-4" /> {editId ? "Atualizar" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export { emptyForm };
export type { EmpresaFormData };
