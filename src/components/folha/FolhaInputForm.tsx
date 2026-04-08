import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FolhaInput } from "@/lib/motorFolha";
import { Settings, Minus, Gift } from "lucide-react";

interface Props {
  data: FolhaInput;
  onChange: (data: FolhaInput) => void;
}

function NumField({ label, value, onChange, min = 0, step = "1", disabled = false }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 text-sm"
        disabled={disabled}
      />
    </div>
  );
}

export function FolhaInputForm({ data, onChange }: Props) {
  const set = (field: keyof FolhaInput, value: number | boolean | string) =>
    onChange({ ...data, [field]: value });

  const isProducao = data.tipo_remuneracao === "producao";

  return (
    <div className="space-y-3">
      {/* Configurações */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-primary" /> Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo Remuneração</Label>
              <Select value={data.tipo_remuneracao} onValueChange={(v) => set("tipo_remuneracao", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumField label="Dias do Mês" value={data.dias_do_mes} onChange={(v) => set("dias_do_mes", v)} disabled />
          </div>

          <NumField label="Salário Registro (CLT)" value={data.salario_registro} onChange={(v) => set("salario_registro", v)} step="0.01" />
          <NumField label="Salário Combinado" value={data.salario_combinado} onChange={(v) => set("salario_combinado", v)} step="0.01" />

          {isProducao && (
            <NumField label="Valor Produção" value={data.valor_producao} onChange={(v) => set("valor_producao", v)} step="0.01" />
          )}

          <div className="flex items-center justify-between rounded-md border border-border p-2">
            <Label className="text-xs">Base HE = Sal. Registro</Label>
            <Switch
              checked={data.usar_salario_sindicato_para_HE}
              onCheckedChange={(v) => set("usar_salario_sindicato_para_HE", v)}
            />
          </div>

          <NumField label="Domingos/Feriados" value={data.domingos_feriados_no_mes} onChange={(v) => set("domingos_feriados_no_mes", v)} />
        </CardContent>
      </Card>

      {/* Bonificações */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Gift className="h-3.5 w-3.5 text-primary" /> Bonificações
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 grid grid-cols-2 gap-2">
          <NumField label="Meta" value={data.bonificacao_meta} onChange={(v) => set("bonificacao_meta", v)} step="0.01" />
          <NumField label="Assiduidade" value={data.bonificacao_assiduidade} onChange={(v) => set("bonificacao_assiduidade", v)} step="0.01" />
        </CardContent>
      </Card>

      {/* Descontos */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Minus className="h-3.5 w-3.5 text-destructive" /> Descontos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <NumField label="Qtd Marmitas" value={data.qtd_marmitas} onChange={(v) => set("qtd_marmitas", v)} />
            <NumField label="Valor Unit. Marmita" value={data.valor_marmita_unitario} onChange={(v) => set("valor_marmita_unitario", v)} step="0.01" />
          </div>
          <NumField label="Vale" value={data.desconto_vale} onChange={(v) => set("desconto_vale", v)} step="0.01" />
          <NumField label="Adiantamento" value={data.desconto_adiantamento} onChange={(v) => set("desconto_adiantamento", v)} step="0.01" />
          <NumField label="Empréstimo" value={data.desconto_emprestimo} onChange={(v) => set("desconto_emprestimo", v)} step="0.01" />
          <NumField label="Sindicato" value={data.desconto_sindicato} onChange={(v) => set("desconto_sindicato", v)} step="0.01" />
          <NumField label="Outros" value={data.outros_descontos} onChange={(v) => set("outros_descontos", v)} step="0.01" />
        </CardContent>
      </Card>
    </div>
  );
}
