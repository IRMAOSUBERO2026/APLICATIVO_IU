import { Plus, Trash2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BonificacaoPadrao } from "@/lib/bonificacoesPadrao";

export type { BonificacaoPadrao } from "@/lib/bonificacoesPadrao";

const SUGESTOES = ["Assiduidade", "Sem Falta", "Meta", "Desempenho", "Produtividade"];

interface Props {
  value: BonificacaoPadrao[];
  onChange: (next: BonificacaoPadrao[]) => void;
}

export function BonificacoesPadraoEditor({ value, onChange }: Props) {
  const list = Array.isArray(value) ? value : [];

  const add = () =>
    onChange([...list, { descricao: "", valor: 0, tipo: "fixo" }]);

  const remove = (idx: number) =>
    onChange(list.filter((_, i) => i !== idx));

  const update = <K extends keyof BonificacaoPadrao>(
    idx: number,
    field: K,
    val: BonificacaoPadrao[K],
  ) =>
    onChange(list.map((b, i) => (i === idx ? { ...b, [field]: val } : b)));

  return (
    <div className="space-y-3 rounded-lg border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Bonificações Padrão</h4>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1 h-8">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <strong>Fixo Mensal</strong> = soma sempre na folha. <strong>Condicional</strong> = vem
        pré-preenchido, mas o usuário confirma antes de fechar o mês. Descrições com "Meta" ou
        "Desempenho" alimentam o campo <em>Meta</em>; as demais alimentam <em>Assiduidade</em>.
      </p>

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2 text-center">
          Nenhuma bonificação padrão cadastrada.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((b, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2 items-end rounded-md border bg-background p-2"
            >
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                <Input
                  list={`bonif-sug-${idx}`}
                  value={b.descricao}
                  onChange={(e) => update(idx, "descricao", e.target.value)}
                  placeholder="Ex: Assiduidade"
                  className="h-8 text-sm"
                />
                <datalist id={`bonif-sug-${idx}`}>
                  {SUGESTOES.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={b.valor || ""}
                  onChange={(e) => update(idx, "valor", Number(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                <select
                  value={b.tipo}
                  onChange={(e) => update(idx, "tipo", e.target.value as "fixo" | "condicional")}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="fixo">Fixo Mensal</option>
                  <option value="condicional">Condicional</option>
                </select>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => remove(idx)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

