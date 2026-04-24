import { Building2, HardHat, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEmpresaObra } from "@/contexts/EmpresaObraContext";

export function ContextoSelector({ compact = false }: { compact?: boolean }) {
  const { empresas, obrasFiltradas, empresaId, obraId, setEmpresaId, setObraId, loading } = useEmpresaObra();

  if (loading) return <div className="text-xs text-muted-foreground">Carregando contexto…</div>;

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-1 max-w-2xl"}`}>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={empresaId || "__all__"} onValueChange={v => setEmpresaId(v === "__all__" ? null : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todas as empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as empresas</SelectItem>
            {empresas.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <HardHat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={obraId || "__all__"} onValueChange={v => setObraId(v === "__all__" ? null : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todas as obras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as obras</SelectItem>
            {obrasFiltradas.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(empresaId || obraId) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => { setEmpresaId(null); setObraId(null); }}
          title="Limpar filtros"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
