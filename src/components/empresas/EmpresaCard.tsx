import { Building2, Users, HardHat, Edit2, Trash2, FolderOpen, Image } from "lucide-react";

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
  logo_url: string | null;
  cor_primaria: string | null;
  nome_responsavel: string | null;
  cargo_responsavel: string | null;
}

interface Props {
  empresa: Empresa;
  obrasCount: number;
  funcCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onDocs: () => void;
}

export function EmpresaCard({ empresa, obrasCount, funcCount, onEdit, onDelete, onDocs }: Props) {
  const cor = empresa.cor_primaria || "hsl(var(--primary))";

  return (
    <div className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header with color stripe */}
      <div className="h-1.5" style={{ backgroundColor: cor }} />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
            {empresa.logo_url ? (
              <img src={empresa.logo_url} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate">{empresa.razao_social}</h3>
            {empresa.nome_fantasia && <p className="text-[11px] text-muted-foreground truncate">{empresa.nome_fantasia}</p>}
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{empresa.cnpj}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <HardHat className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{obrasCount} obras</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{funcCount} funcionários</span>
          </div>
        </div>

        {/* Info */}
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {empresa.cidade && <p>{empresa.cidade}{empresa.uf ? `/${empresa.uf}` : ""}</p>}
          {empresa.nome_responsavel && <p>Resp: {empresa.nome_responsavel}{empresa.cargo_responsavel ? ` (${empresa.cargo_responsavel})` : ""}</p>}
          {empresa.telefone && <p>{empresa.telefone}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Editar">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDocs} className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Documentos">
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1" />
          <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
