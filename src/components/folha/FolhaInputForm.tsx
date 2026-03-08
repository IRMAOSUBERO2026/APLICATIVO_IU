import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FolhaInput } from "@/lib/motorFolha";
import { Clock, AlertTriangle, Gift, Minus } from "lucide-react";

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
        className="h-9"
        disabled={disabled}
      />
    </div>
  );
}

export function FolhaInputForm({ data, onChange }: Props) {
  const set = (field: keyof FolhaInput, value: number | boolean) =>
    onChange({ ...data, [field]: value });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Salários (auto-preenchidos, mas editáveis) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            💰 Salários & Período
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <NumField label="Salário Registro" value={data.salario_registro} onChange={(v) => set("salario_registro", v)} step="0.01" />
          <NumField label="Salário Combinado" value={data.salario_combinado} onChange={(v) => set("salario_combinado", v)} step="0.01" />
          <NumField label="Dias do Mês" value={data.dias_do_mes} onChange={(v) => set("dias_do_mes", v)} disabled />
          <NumField label="Domingos/Feriados" value={data.domingos_feriados_no_mes} onChange={(v) => set("domingos_feriados_no_mes", v)} />
          <div className="col-span-2 flex items-center justify-between rounded-md border border-border p-3">
            <Label className="text-xs">Usar salário sindicato p/ HE</Label>
            <Switch
              checked={data.usar_salario_sindicato_para_HE}
              onCheckedChange={(v) => set("usar_salario_sindicato_para_HE", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Horas Extras */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Horas Extras & Negativas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <NumField label="HE Semanais" value={data.horas_extras_semanais} onChange={(v) => set("horas_extras_semanais", v)} step="0.5" />
          <NumField label="HE Sábado" value={data.horas_extras_sabado} onChange={(v) => set("horas_extras_sabado", v)} step="0.5" />
          <NumField label="HE 100%" value={data.horas_extras_100} onChange={(v) => set("horas_extras_100", v)} step="0.5" />
          <NumField label="Horas Negativas" value={data.horas_negativas} onChange={(v) => set("horas_negativas", v)} step="0.5" />
        </CardContent>
      </Card>

      {/* Faltas e Atestados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Faltas & Atestados
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <NumField label="Faltas (dias)" value={data.faltas} onChange={(v) => set("faltas", v)} />
          <NumField label="Atestados (dias)" value={data.atestados} onChange={(v) => set("atestados", v)} />
          <NumField label="Semanas c/ Falta" value={data.semanas_com_falta} onChange={(v) => set("semanas_com_falta", v)} />
        </CardContent>
      </Card>

      {/* Bonificações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gift className="h-4 w-4 text-success" /> Bonificações
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <NumField label="Bonif. Meta" value={data.bonificacao_meta} onChange={(v) => set("bonificacao_meta", v)} step="0.01" />
          <NumField label="Bonif. Assiduidade" value={data.bonificacao_assiduidade} onChange={(v) => set("bonificacao_assiduidade", v)} step="0.01" />
        </CardContent>
      </Card>

      {/* Descontos */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Minus className="h-4 w-4 text-destructive" /> Descontos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumField label="Marmita" value={data.desconto_marmita} onChange={(v) => set("desconto_marmita", v)} step="0.01" />
          <NumField label="Vale" value={data.desconto_vale} onChange={(v) => set("desconto_vale", v)} step="0.01" />
          <NumField label="Empréstimo" value={data.desconto_emprestimo} onChange={(v) => set("desconto_emprestimo", v)} step="0.01" />
          <NumField label="Outros Descontos" value={data.outros_descontos} onChange={(v) => set("outros_descontos", v)} step="0.01" />
        </CardContent>
      </Card>
    </div>
  );
}
