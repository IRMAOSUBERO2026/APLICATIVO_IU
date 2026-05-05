import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Wallet, Building2, Gift } from "lucide-react";
import type { FolhaOutput } from "@/lib/motorFolha";
import type { FolhaInput } from "@/lib/motorFolha";

interface Props {
  result: FolhaOutput;
  input?: FolhaInput;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function decimalParaHHMM(horas: number): string {
  const sinal = horas < 0 ? "-" : "";
  const abs = Math.abs(horas);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  // ajusta se arredondar para 60min
  const hf = m === 60 ? h + 1 : h;
  const mf = m === 60 ? 0 : m;
  return `${sinal}${String(hf).padStart(2, "0")}:${String(mf).padStart(2, "0")}`;
}

function decimalFmt(horas: number): string {
  return horas.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function Line({
  label, value, negative, muted, bold, indent, horas,
}: {
  label: string;
  value: number;
  negative?: boolean;
  muted?: boolean;
  bold?: boolean;
  indent?: boolean;
  horas?: number;
}) {
  const isZero = !value || value === 0;
  return (
    <div
      className={`flex items-center justify-between py-1 text-xs ${
        indent ? "pl-3" : ""
      } ${isZero ? "opacity-50" : ""}`}
    >
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>
        {label}
        {horas !== undefined && (
          <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
            {decimalParaHHMM(horas)} / {decimalFmt(horas)}h
          </span>
        )}
      </span>
      <span
        className={`tabular-nums ${
          negative
            ? "text-destructive"
            : bold
            ? "font-bold text-primary"
            : "font-medium"
        }`}
      >
        {negative && value > 0 ? `- ${fmt(value)}` : fmt(value)}
      </span>
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, color, total,
}: {
  icon: typeof TrendingUp;
  title: string;
  color: "primary" | "destructive" | "amber";
  total?: number;
}) {
  const colorClass =
    color === "destructive"
      ? "text-destructive"
      : color === "amber"
      ? "text-amber-600"
      : "text-primary";
  return (
    <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>
      {total !== undefined && (
        <span className={`text-xs font-bold tabular-nums ${colorClass}`}>
          {fmt(total)}
        </span>
      )}
    </div>
  );
}

export function FolhaResultado({ result, input }: Props) {
  // Marmita total (calculado)
  const totalMarmita = input
    ? input.desconto_marmita > 0
      ? input.desconto_marmita
      : input.qtd_marmitas * input.valor_marmita_unitario
    : 0;

  const isProducao = input?.tipo_remuneracao === "producao";
  const salarioBaseProvento = isProducao
    ? result.valor_producao
    : input?.salario_combinado ?? 0;

  const totalProventos =
    salarioBaseProvento +
    result.total_HE +
    result.valor_atestados +
    result.total_bonificacoes;

  return (
    <div className="space-y-2">
      {/* PROVENTOS */}
      <Card>
        <CardContent className="px-3 py-2.5">
          <SectionHeader
            icon={TrendingUp}
            title="PROVENTOS"
            color="primary"
            total={totalProventos}
          />
          <Line
            label={isProducao ? "Valor Produção" : "Salário Combinado"}
            value={salarioBaseProvento}
          />

          {/* HE detalhado */}
          <div className="mt-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">
              Horas Extras
            </div>
            <Line label="HE Sem" value={result.HE_semanal} horas={input?.horas_extras_semanais ?? 0} indent muted />
            <Line label="HE Sáb" value={result.HE_sabado} horas={input?.horas_extras_sabado ?? 0} indent muted />
            <Line label="HE 100%" value={result.HE_100} horas={input?.horas_extras_100 ?? 0} indent muted />
            <Line
              label="Total HE"
              value={result.total_HE}
              horas={(input?.horas_extras_semanais ?? 0) + (input?.horas_extras_sabado ?? 0) + (input?.horas_extras_100 ?? 0)}
              indent
              bold
            />
          </div>

          <Line label="Atestados" value={result.valor_atestados} />
        </CardContent>
      </Card>

      {/* BONIFICAÇÕES */}
      <Card>
        <CardContent className="px-3 py-2.5">
          <SectionHeader
            icon={Gift}
            title="BONIFICAÇÕES"
            color="amber"
            total={result.total_bonificacoes}
          />
          <Line label="Meta" value={input?.bonificacao_meta ?? 0} />
          <Line label="Assiduidade" value={input?.bonificacao_assiduidade ?? 0} />
        </CardContent>
      </Card>

      {/* DESCONTOS */}
      <Card>
        <CardContent className="px-3 py-2.5">
          <SectionHeader
            icon={TrendingDown}
            title="DESCONTOS"
            color="destructive"
            total={result.total_descontos}
          />

          {/* Faltas / Ponto */}
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Ponto
          </div>
          <Line label="Faltas" value={result.desconto_faltas} negative indent />
          <Line label="Horas Negativas" value={result.desconto_horas_negativas} negative indent />
          <Line label="DSR Perdido" value={result.dsr_perdido} negative indent />

          {/* Outros descontos */}
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">
            Outros
          </div>
          <Line label="Marmita" value={totalMarmita} negative indent />
          <Line label="Vale" value={input?.desconto_vale ?? 0} negative indent />
          <Line label="Adiantamento" value={input?.desconto_adiantamento ?? 0} negative indent />
          <Line label="Empréstimo" value={input?.desconto_emprestimo ?? 0} negative indent />
          <Line label="Sindicato" value={input?.desconto_sindicato ?? 0} negative indent />
          <Line label="Outros" value={input?.outros_descontos ?? 0} negative indent />
        </CardContent>
      </Card>

      {/* RESULTADO FINAL */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="px-3 py-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
            <Wallet className="h-3.5 w-3.5" />
            Resultado Final
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
            <span>Proventos</span>
            <span className="text-right tabular-nums">{fmt(totalProventos)}</span>
            <span>Descontos</span>
            <span className="text-right tabular-nums text-destructive">
              - {fmt(result.total_descontos)}
            </span>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">SALÁRIO LÍQUIDO</span>
            <span className="text-lg font-bold text-primary tabular-nums">
              {fmt(result.salario_final)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* CUSTO EMPRESA */}
      <Card className="border-dashed">
        <CardContent className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Custo Empresa
          </div>
          <Line label="Salário Líquido" value={result.salario_final} muted />
          <Line label="FGTS (8%)" value={result.fgts} muted />
          <Line label="INSS Empresa (20%)" value={result.inss_empresa} muted />
          <Separator className="my-1" />
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs font-bold">CUSTO TOTAL</span>
            <span className="text-sm font-bold tabular-nums">
              {fmt(result.custo_total_empresa)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
