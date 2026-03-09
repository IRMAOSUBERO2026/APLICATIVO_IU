import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" /> Funcionários ({funcionarios.length})
          </span>
          <div className="flex gap-2 text-xs font-normal">
            <Badge variant="outline" className="text-xs">
              {funcionarios.filter((f) => f.hasSaved).length} salvos
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {funcionarios.filter((f) => f.hasCalculated && !f.hasSaved).length} calculados
            </Badge>
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
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário encontrado.</p>
          )}
          {filtered.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between transition-colors hover:bg-accent/50 ${
                selectedId === f.id ? "bg-accent border border-accent-foreground/20" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{f.nome}</p>
                <p className="text-xs text-muted-foreground">{f.cargo} • {fmt(f.salario_base)}</p>
              </div>
              <div className="flex-shrink-0 ml-2">
                {f.hasSaved ? (
                  <Badge variant="default" className="text-xs">Salvo</Badge>
                ) : f.hasCalculated ? (
                  <Badge variant="secondary" className="text-xs">Calculado</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Pendente</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
