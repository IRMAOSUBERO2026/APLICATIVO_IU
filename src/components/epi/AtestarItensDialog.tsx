import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ShieldCheck, Undo2 } from "lucide-react";

interface ItemEntrega {
  id: string;
  data_entrega: string | null;
  quantidade: number | null;
  ca_numero: string | null;
  confirmacao_tipo: string | null;
  confirmacao_em: string | null;
  status: string | null;
  produto: { descricao: string | null } | null;
}

interface AtestarItensDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarioId: string | null;
  funcionarioNome: string;
  onChanged?: () => void;
}

const isAtestado = (tipo: string | null) => {
  const t = (tipo || "").trim().toLowerCase();
  return !!t && t !== "pendente";
};

const TIPO_LABEL: Record<string, string> = {
  atestado_sistema: "Atestado no sistema",
  foto_responsavel: "Confirmado por foto",
  assinatura_digital: "Assinatura digital",
  portal: "Confirmado no portal",
};

export default function AtestarItensDialog({ open, onOpenChange, funcionarioId, funcionarioNome, onChanged }: AtestarItensDialogProps) {
  const [itens, setItens] = useState<ItemEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!funcionarioId) return;
    setLoading(true);
    const { data } = await supabase
      .from("entregas_epi")
      .select("id, data_entrega, quantidade, ca_numero, confirmacao_tipo, confirmacao_em, status, produto:produtos!left (descricao)")
      .eq("funcionario_id", funcionarioId)
      .order("data_entrega", { ascending: false });
    setItens((data || []) as any);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, funcionarioId]);

  async function toggleAtestado(item: ItemEntrega) {
    setBusy(item.id);
    try {
      const atestar = !isAtestado(item.confirmacao_tipo);
      const { error } = await supabase
        .from("entregas_epi")
        .update(
          atestar
            ? { confirmacao_tipo: "atestado_sistema", confirmacao_em: new Date().toISOString() }
            : { confirmacao_tipo: "pendente", confirmacao_em: null, confirmacao_url: null }
        )
        .eq("id", item.id);
      if (error) throw error;
      toast({
        title: atestar ? "✅ Item atestado" : "Atestado removido",
        description: atestar
          ? "A rubrica será exibida na ficha em PDF para este item."
          : "O item ficará em branco para coleta manual.",
      });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar item", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function atestarTodos(atestar: boolean) {
    if (!funcionarioId) return;
    setBusy("__all__");
    try {
      const { error } = await supabase
        .from("entregas_epi")
        .update(
          atestar
            ? { confirmacao_tipo: "atestado_sistema", confirmacao_em: new Date().toISOString() }
            : { confirmacao_tipo: "pendente", confirmacao_em: null, confirmacao_url: null }
        )
        .eq("funcionario_id", funcionarioId);
      if (error) throw error;
      toast({ title: atestar ? "Todos os itens atestados" : "Atestados removidos de todos os itens" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const totalAtestados = itens.filter((i) => isAtestado(i.confirmacao_tipo)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Atestar itens — {funcionarioNome}
          </DialogTitle>
          <DialogDescription>
            Atestar um item exibe a rubrica na ficha em PDF. Itens não atestados ficam em branco para assinatura manual.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {totalAtestados} de {itens.length} item(ns) atestado(s)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy !== null || itens.length === 0} onClick={() => atestarTodos(true)}>
              Atestar todos
            </Button>
            <Button size="sm" variant="ghost" disabled={busy !== null || totalAtestados === 0} onClick={() => atestarTodos(false)}>
              Limpar todos
            </Button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto rounded-lg border divide-y">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : itens.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma entrega registrada.</div>
          ) : (
            itens.map((item) => {
              const atestado = isAtestado(item.confirmacao_tipo);
              const isItemBusy = busy === item.id;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.produto?.descricao || "Equipamento / EPI"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.data_entrega ? format(new Date(item.data_entrega), "dd/MM/yyyy") : "—"}
                      {item.ca_numero ? ` · CA ${item.ca_numero}` : ""}
                      {` · Qtd ${item.quantidade ?? 1}`}
                    </p>
                    {atestado && (
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                        {TIPO_LABEL[(item.confirmacao_tipo || "").toLowerCase()] || "Atestado"}
                        {item.confirmacao_em ? ` em ${format(new Date(item.confirmacao_em), "dd/MM/yyyy HH:mm")}` : ""}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={atestado ? "ghost" : "default"}
                    disabled={isItemBusy || busy === "__all__"}
                    onClick={() => toggleAtestado(item)}
                    className="gap-1 shrink-0"
                  >
                    {isItemBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : atestado ? (
                      <Undo2 className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {atestado ? "Desfazer" : "Atestar"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
