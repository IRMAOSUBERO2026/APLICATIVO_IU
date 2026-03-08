import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FolhaOutput } from "@/lib/motorFolha";

interface Props {
  result: FolhaOutput;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Line({ label, value, highlight, negative }: { label: string; value: number; highlight?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${highlight ? "font-bold text-lg" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={negative ? "text-destructive font-medium" : highlight ? "text-primary font-bold" : "font-medium"}>
        {negative && value > 0 ? `- ${fmt(value)}` : fmt(value)}
      </span>
    </div>
  );
}

export function FolhaResultado({ result }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📋 Resumo do Fechamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0 text-sm mb-2">
          <Line label="Base/Dia" value={result.base_dia} />
          <Line label="Base/Hora" value={result.base_hora} />
        </div>

        <Separator />
        <p className="text-xs font-semibold text-muted-foreground pt-2">HORAS EXTRAS</p>
        <Line label="HE Semanais (50%)" value={result.HE_semanal} />
        <Line label="HE Sábado (50%)" value={result.HE_sabado} />
        <Line label="HE 100%" value={result.HE_100} />
        <Line label="Total HE" value={result.total_HE} />
        <Line label="DSR s/ HE" value={result.DSR_HE} />

        <Separator />
        <p className="text-xs font-semibold text-muted-foreground pt-2">PROVENTOS</p>
        <Line label="Atestados" value={result.valor_atestados} />
        <Line label="Bonificações" value={result.total_bonificacoes} />

        <Separator />
        <p className="text-xs font-semibold text-muted-foreground pt-2">DESCONTOS</p>
        <Line label="Faltas" value={result.desconto_faltas} negative />
        <Line label="Horas Negativas" value={result.desconto_horas_negativas} negative />
        <Line label="DSR Perdido" value={result.dsr_perdido} negative />
        <Line label="Total Descontos" value={result.total_descontos} negative />

        <Separator />
        <div className="pt-3">
          <Line label="SALÁRIO FINAL" value={result.salario_final} highlight />
        </div>
      </CardContent>
    </Card>
  );
}
