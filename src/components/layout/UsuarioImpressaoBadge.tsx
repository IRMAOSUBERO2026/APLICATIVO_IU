import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getUsuarioImpressao, setUsuarioImpressao } from "@/lib/usuarioImpressao";

export function UsuarioImpressaoBadge() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [label, setLabel] = useState("");

  const refresh = () => {
    const u = getUsuarioImpressao();
    setNome(u.nome);
    setCargo(u.cargo);
    setLabel(u.label || "Definir usuário");
  };

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("usuario-impressao-changed", h);
    return () => window.removeEventListener("usuario-impressao-changed", h);
  }, []);

  const salvar = () => {
    setUsuarioImpressao(nome, cargo);
    refresh();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-8 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors max-w-[260px] truncate"
          title="Usuário responsável pela impressão dos relatórios"
        >
          <UserCog className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">Responsável pela impressão</h4>
            <p className="text-xs text-muted-foreground">Aparecerá no rodapé de todos os relatórios.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imp-nome" className="text-xs">Nome</Label>
            <Input id="imp-nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Luis" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imp-cargo" className="text-xs">Cargo / Setor</Label>
            <Input id="imp-cargo" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Engenheiro Sócio Proprietário ou Setor Recursos Humanos" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={salvar}>Salvar</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
