import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FolhaOutput } from "@/lib/motorFolha";

interface Props {
  result: FolhaOutput;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Line({ label, value, highlight, negative, muted }: {
  label: string; value: number; highlight?: boolean; negative?: boolean; muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${highlight ? "font-bold text-base" : ""}`}>
      <span className={muted ? "text-muted-foreground text-xs" : "text-muted-foreground"}>{label}</span>
      <span className={
        negative ? "text-destructive font-medium" :
        highlight ? "text-primary font-bold" :
        muted ? "text-muted-foreground text-xs" :
        "font-medium"
      }>
        {negative && value > 0 ? `- ${fmt(value)}` : fmt(value)}
      </span>
    </div>
  );
}

export function FolhaResultado({ result }: Props) {
  return (
    <div className="space-y-2">
      {/* Proventos */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-xs font-semibold text-primary">PROVENTOS</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-0.5">
          {result.valor_producao > 0 && (
            <Line label="Produção" value={result.valor_producao} />
          )}
          {result.total_HE > 0 && (
            <>
              <Line label="HE 50% (Sem)" value={result.HE_semanal} muted />
              <Line label="HE 50% (Sáb)" value={result.HE_sabado} muted />
              <Line label="HE 100%" value={result.HE_100} muted />
              <Line label="Total HE" value={result.total_HE} />
            </>
          )}
          {result.valor_atestados > 0 && (
            <Line label="Atestados" value={result.valor_atestados} />
          )}
          {result.total_bonificacoes > 0 && (
            <Line label="Bonificações" value={result.total_bonificacoes} />
          )}
        </CardContent>
      </Card>

      {/* Descontos */}
      {result.total_descontos > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-destructive">DESCONTOS</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-0.5">
            {result.desconto_faltas > 0 && <Line label="Faltas" value={result.desconto_faltas} negative />}
            {result.desconto_horas_negativas > 0 && <Line label="Horas Neg." value={result.desconto_horas_negativas} negative />}
            {result.dsr_perdido > 0 && <Line label="DSR Perdido" value={result.dsr_perdido} negative />}
            <Line label="Total Descontos" value={result.total_descontos} negative />
          </CardContent>
        </Card>
      )}

      {/* Resultado Final */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 px-4 space-y-1">
          <Line label="SALÁRIO LÍQUIDO" value={result.salario_final} highlight />
          <Separator className="my-1" />
          <Line label="FGTS (8%)" value={result.fgts} muted />
          <Line label="INSS Empresa (20%)" value={result.inss_empresa} muted />
          <div className="flex items-center justify-between py-1 text-sm font-semibold">
            <span className="text-muted-foreground">CUSTO EMPRESA</span>
            <span className="text-foreground">{fmt(result.custo_total_empresa)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
