import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, ClipboardCheck, Pencil, FolderOpen } from "lucide-react";

interface FuncionarioItem {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  salario_base: number;
  hasSaved: boolean;
  hasCalculated: boolean;
}

interface Props {
  funcionarios: FuncionarioItem[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  onOpenDocuments?: (id: string, nome: string) => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FuncionariosList({ funcionarios, onSelect, selectedId }: Props) {
  const [search, setSearch] = useState("");

  const filtered = funcionarios.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.nome.toLowerCase().includes(q) ||
      f.cpf.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
      f.cargo.toLowerCase().includes(q)
    );
  });

  const savedCount = funcionarios.filter((f) => f.hasSaved).length;
  const calculatedCount = funcionarios.filter((f) => f.hasCalculated && !f.hasSaved).length;
  const pendingCount = funcionarios.length - savedCount - calculatedCount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" /> Funcionários ({funcionarios.length})
          </span>
          <div className="flex gap-2 text-xs font-normal">
            <Badge variant="default" className="text-xs">{savedCount} fechados</Badge>
            <Badge variant="secondary" className="text-xs">{calculatedCount} calculados</Badge>
            <Badge variant="outline" className="text-xs">{pendingCount} pendentes</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="max-h-[450px] overflow-y-auto space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário encontrado.</p>
          )}
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`w-full px-3 py-2.5 rounded-md flex items-center justify-between transition-colors hover:bg-accent/50 border ${
                selectedId === f.id ? "bg-accent border-accent-foreground/20" : "border-transparent"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{f.cargo} • {fmt(f.salario_base)}</p>
              </div>
              <div className="flex-shrink-0 ml-2 flex items-center gap-2">
                {f.hasSaved ? (
                  <>
                    <Badge variant="default" className="text-xs">Fechado ✓</Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onSelect(f.id)}>
                      <Pencil className="h-3 w-3" /> Corrigir
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => onSelect(f.id)}>
                    <ClipboardCheck className="h-3 w-3" /> Fechar Mês
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
