import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowRightLeft } from "lucide-react";

interface TransferirFuncionarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarioId: string;
  funcionarioNome: string;
  obraAtualId: string | null;
  onTransferido: () => void;
}

export function TransferirFuncionario({ open, onOpenChange, funcionarioId, funcionarioNome, obraAtualId, onTransferido }: TransferirFuncionarioProps) {
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("obras").select("id, nome, codigo, construtora").eq("status", "em_andamento")
        .then(({ data }) => {
          if (data) setObras(data.filter(o => o.id !== obraAtualId));
        });
    }
  }, [open, obraAtualId]);

  const handleTransferir = async () => {
    if (!selectedObra) {
      toast({ title: "Selecione uma obra", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("funcionarios").update({ obra_id: selectedObra }).eq("id", funcionarioId);
    if (error) {
      toast({ title: "Erro ao transferir", description: error.message, variant: "destructive" });
    } else {
      const obraNome = obras.find(o => o.id === selectedObra)?.nome || "";
      toast({ title: "Funcionário transferido", description: `${funcionarioNome} → ${obraNome}` });
      onTransferido();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferir Funcionário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Funcionário</label>
            <p className="text-sm font-semibold">{funcionarioNome}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Nova Obra</label>
            <select
              value={selectedObra}
              onChange={e => setSelectedObra(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione a obra destino...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.codigo} — {o.nome} ({o.construtora || "—"})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleTransferir}
            disabled={saving || !selectedObra}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            {saving ? "Transferindo..." : "Confirmar Transferência"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
