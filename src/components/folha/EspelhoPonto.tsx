import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw, Copy } from "lucide-react";
import { isFeriadoNacional } from "@/lib/feriadosNacionais";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
const DIAS_LABELS: Record<string, string> = {
  dom: "D", seg: "S", ter: "T", qua: "Q", qui: "Q", sex: "S", sab: "S",
};

export interface HorarioPadrao {
  seg: { e1: string; s1: string; e2: string; s2: string };
  ter: { e1: string; s1: string; e2: string; s2: string };
  qua: { e1: string; s1: string; e2: string; s2: string };
  qui: { e1: string; s1: string; e2: string; s2: string };
  sex: { e1: string; s1: string; e2: string; s2: string };
  sab: { e1: string; s1: string; e2: string; s2: string };
  dom: { e1: string; s1: string; e2: string; s2: string };
}

export interface PunchDay {
  dia: number;
  diaSemana: string;
  e1: string;
  s1: string;
  e2: string;
  s2: string;
  status: "normal" | "falta" | "atestado" | "feriado";
}

export interface PontoResult {
  horasExtrasSemanais: number;
  horasExtrasSabado: number;
  horasExtras100: number;
  horasNegativas: number;
  faltas: number;
  atestados: number;
  semanasComFalta: number;
  totalHorasTrabalhadas: number;
}

function timeToMin(t: string): number | null {
  if (!t || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minToStr(m: number): string {
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${h}:${String(min).padStart(2, "0")}`;
}

function calcExpected(p: { e1: string; s1: string; e2: string; s2: string }): number {
  let total = 0;
  const e1 = timeToMin(p.e1), s1 = timeToMin(p.s1);
  const e2 = timeToMin(p.e2), s2 = timeToMin(p.s2);
  if (e1 !== null && s1 !== null) total += s1 - e1;
  if (e2 !== null && s2 !== null) total += s2 - e2;
  return total;
}

function calcDayHours(punch: PunchDay, padrao: { e1: string; s1: string; e2: string; s2: string } | null) {
  if (punch.status === "falta") {
    const expected = padrao ? calcExpected(padrao) : 0;
    return { worked: 0, expected, isFalta: true };
  }
  if (punch.status === "atestado" || punch.status === "feriado") {
    return { worked: 0, expected: 0, isFalta: false };
  }

  const e1 = timeToMin(punch.e1);
  const s1 = timeToMin(punch.s1);
  const e2 = timeToMin(punch.e2);
  const s2 = timeToMin(punch.s2);

  if (e1 === null && s1 === null && e2 === null && s2 === null) {
    if (padrao && padrao.e1) {
      return { worked: 0, expected: calcExpected(padrao), isFalta: true };
    }
    return { worked: 0, expected: 0, isFalta: false };
  }

  let worked = 0;
  if (e1 !== null && s1 !== null) worked += s1 - e1;
  if (e2 !== null && s2 !== null) worked += s2 - e2;

  const expected = padrao ? calcExpected(padrao) : 0;
  return { worked, expected, isFalta: false };
}

function calcDiff(worked: number, expected: number): { extra: number; negative: number } {
  if (expected === 0) {
    if (worked > 0) {
      const blocks = Math.floor(worked / 30);
      return { extra: blocks * 30, negative: 0 };
    }
    return { extra: 0, negative: 0 };
  }
  const diff = worked - expected;
  if (diff >= 0) {
    const blocks = Math.floor(diff / 30);
    return { extra: blocks * 30, negative: 0 };
  } else {
    const absDiff = Math.abs(diff);
    if (absDiff <= 10) return { extra: 0, negative: 0 };
    const blocks = Math.ceil(absDiff / 30);
    return { extra: 0, negative: blocks * 30 };
  }
}

interface Props {
  mes: number;
  ano: number;
  horarioPadrao: HorarioPadrao | null;
  onResult: (result: PontoResult) => void;
}

const STATUS_CYCLE: PunchDay["status"][] = ["normal", "falta", "atestado", "feriado"];
const STATUS_LABEL: Record<PunchDay["status"], string> = {
  normal: "",
  falta: "F",
  atestado: "A",
  feriado: "FE",
};
const STATUS_CLASS: Record<PunchDay["status"], string> = {
  normal: "",
  falta: "bg-destructive text-destructive-foreground",
  atestado: "bg-amber-500 text-white",
  feriado: "bg-primary text-primary-foreground",
};

export function EspelhoPonto({ mes, ano, horarioPadrao, onResult }: Props) {
  // mes é 0-indexado (0=Jan ... 11=Dez). "Dia 0 do mês seguinte" devolve o último dia do mês corrente.
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const [punches, setPunches] = useState<PunchDay[]>([]);

  useEffect(() => {
    const days: PunchDay[] = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(ano, mes, d);
      const dow = DIAS_SEMANA[date.getDay()];
      const padrao = horarioPadrao?.[dow as keyof HorarioPadrao];
      const feriado = isFeriadoNacional(ano, mes, d);
      const isHoliday = feriado !== null;
      days.push({
        dia: d,
        diaSemana: dow,
        e1: isHoliday ? "" : (padrao?.e1 || ""),
        s1: isHoliday ? "" : (padrao?.s1 || ""),
        e2: isHoliday ? "" : (padrao?.e2 || ""),
        s2: isHoliday ? "" : (padrao?.s2 || ""),
        status: isHoliday ? "feriado" : "normal",
      });
    }
    setPunches(days);
  }, [mes, ano, diasNoMes, horarioPadrao]);

  const handlePunchChange = (idx: number, field: "e1" | "s1" | "e2" | "s2", value: string) => {
    setPunches(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const cycleStatus = (idx: number) => {
    setPunches(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const cur = STATUS_CYCLE.indexOf(p.status);
      const next = STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length];
      if (next !== "normal") {
        return { ...p, status: next, e1: "", s1: "", e2: "", s2: "" };
      }
      const dow = p.diaSemana as keyof HorarioPadrao;
      const padrao = horarioPadrao?.[dow];
      return { ...p, status: next, e1: padrao?.e1 || "", s1: padrao?.s1 || "", e2: padrao?.e2 || "", s2: padrao?.s2 || "" };
    }));
  };

  const fillFromPadrao = () => {
    if (!horarioPadrao) return;
    setPunches(prev => prev.map(p => {
      if (p.status !== "normal") return p;
      const padrao = horarioPadrao[p.diaSemana as keyof HorarioPadrao];
      return { ...p, e1: padrao.e1, s1: padrao.s1, e2: padrao.e2, s2: padrao.s2 };
    }));
  };

  const clearAll = () => {
    setPunches(prev => prev.map(p => ({ ...p, e1: "", s1: "", e2: "", s2: "", status: "normal" as const })));
  };

  const summary = useMemo(() => {
    let totalExtrasSemanais = 0;
    let totalExtrasSabado = 0;
    let totalExtras100 = 0;
    let totalNegativas = 0;
    let faltas = 0;
    let atestados = 0;
    let totalTrabalhadas = 0;

    // Track which ISO weeks have a fault (to calculate DSR loss)
    const weeksWithFault = new Set<number>();

    punches.forEach(p => {
      if (p.status === "atestado") { atestados++; return; }
      if (p.status === "feriado") return;

      const padrao = horarioPadrao?.[p.diaSemana as keyof HorarioPadrao] ?? null;
      const { worked, expected, isFalta } = calcDayHours(p, padrao);

      totalTrabalhadas += worked;

      if (isFalta || p.status === "falta") {
        faltas++;
        // Determine which week this day belongs to (week number in the month)
        const date = new Date(ano, mes, p.dia);
        // Use ISO week calculation: get the Monday of this week
        const dayOfWeek = date.getDay();
        const mondayDate = p.dia - ((dayOfWeek + 6) % 7);
        weeksWithFault.add(mondayDate);
        return;
      }
      if (worked === 0 && expected === 0) return;

      const { extra, negative } = calcDiff(worked, expected);

      if (p.diaSemana === "dom") {
        totalExtras100 += extra;
      } else if (p.diaSemana === "sab") {
        totalExtrasSabado += extra;
      } else {
        totalExtrasSemanais += extra;
      }
      totalNegativas += negative;
    });

    return {
      horasExtrasSemanais: Math.round((totalExtrasSemanais / 60) * 10) / 10,
      horasExtrasSabado: Math.round((totalExtrasSabado / 60) * 10) / 10,
      horasExtras100: Math.round((totalExtras100 / 60) * 10) / 10,
      horasNegativas: Math.round((totalNegativas / 60) * 10) / 10,
      faltas,
      atestados,
      semanasComFalta: weeksWithFault.size,
      totalHorasTrabalhadas: Math.round((totalTrabalhadas / 60) * 10) / 10,
    };
  }, [punches, horarioPadrao, ano, mes]);

  const applyToFolha = () => {
    onResult(summary);
  };

  const isWeekend = (dow: string) => dow === "sab" || dow === "dom";

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> Espelho Ponto
          </CardTitle>
          <div className="flex gap-1.5">
            {horarioPadrao && (
              <Button variant="outline" size="sm" onClick={fillFromPadrao} className="gap-1 text-[10px] h-6 px-2">
                <Copy className="h-3 w-3" /> Padrão
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-[10px] h-6 px-2">
              <RotateCcw className="h-3 w-3" /> Limpar
            </Button>
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-2 mt-1.5 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive inline-block" /> Falta</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Atestado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Feriado</span>
          <span className="text-muted-foreground ml-1">Clique no status para alternar</span>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[28px_18px_26px_1fr_1fr_1fr_1fr_40px] gap-0.5 text-[9px] font-semibold text-muted-foreground uppercase px-0.5">
          <span>Dia</span>
          <span></span>
          <span>St</span>
          <span>E1</span>
          <span>S1</span>
          <span>E2</span>
          <span>S2</span>
          <span className="text-right">Hrs</span>
        </div>

        {/* All rows - no scroll */}
        <div className="space-y-0">
          {punches.map((p, idx) => {
            const padrao = horarioPadrao?.[p.diaSemana as keyof HorarioPadrao] ?? null;
            const { worked, expected, isFalta } = calcDayHours(p, padrao);
            const weekend = isWeekend(p.diaSemana);
            const hasWork = worked > 0;
            const diff = expected > 0 ? worked - expected : 0;
            const isSpecial = p.status !== "normal";

            return (
              <div
                key={p.dia}
                className={`grid grid-cols-[28px_18px_26px_1fr_1fr_1fr_1fr_40px] gap-0.5 items-center py-[1px] px-0.5 rounded-sm ${
                  weekend && !isSpecial ? "bg-muted/40" : isSpecial ? "bg-muted/20" : ""
                }`}
              >
                <span className="text-[10px] font-medium tabular-nums">{String(p.dia).padStart(2, "0")}</span>
                <span className={`text-[9px] font-bold ${weekend ? "text-destructive" : "text-muted-foreground"}`}>
                  {DIAS_LABELS[p.diaSemana]}
                </span>
                <button
                  type="button"
                  onClick={() => cycleStatus(idx)}
                  className={`text-[8px] font-bold rounded w-5 h-4 flex items-center justify-center cursor-pointer transition-colors ${
                    p.status !== "normal" ? STATUS_CLASS[p.status] : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                  title="Clique para alternar: Normal → Falta → Atestado → Feriado"
                >
                  {STATUS_LABEL[p.status] || "·"}
                </button>
                {isSpecial ? (
                  <span
                    className={`col-span-4 text-[10px] font-medium pl-1 truncate ${
                      p.status === "falta" ? "text-destructive" : p.status === "atestado" ? "text-amber-600" : "text-primary"
                    }`}
                    title={p.status === "feriado" ? (isFeriadoNacional(ano, mes, p.dia)?.nome || "Feriado") : undefined}
                  >
                    {p.status === "falta"
                      ? "FALTA"
                      : p.status === "atestado"
                      ? "ATESTADO"
                      : `FERIADO${isFeriadoNacional(ano, mes, p.dia) ? ` — ${isFeriadoNacional(ano, mes, p.dia)!.nome}` : ""}`}
                  </span>
                ) : (
                  <>
                    <input
                      type="time"
                      value={p.e1}
                      onChange={e => handlePunchChange(idx, "e1", e.target.value)}
                      className="h-5 text-[10px] px-0.5 w-full rounded border border-input bg-background text-center tabular-nums"
                    />
                    <input
                      type="time"
                      value={p.s1}
                      onChange={e => handlePunchChange(idx, "s1", e.target.value)}
                      className="h-5 text-[10px] px-0.5 w-full rounded border border-input bg-background text-center tabular-nums"
                    />
                    <input
                      type="time"
                      value={p.e2}
                      onChange={e => handlePunchChange(idx, "e2", e.target.value)}
                      className="h-5 text-[10px] px-0.5 w-full rounded border border-input bg-background text-center tabular-nums"
                    />
                    <input
                      type="time"
                      value={p.s2}
                      onChange={e => handlePunchChange(idx, "s2", e.target.value)}
                      className="h-5 text-[10px] px-0.5 w-full rounded border border-input bg-background text-center tabular-nums"
                    />
                  </>
                )}
                {!isSpecial && (
                  <span className={`text-[10px] text-right font-mono tabular-nums ${
                    isFalta ? "text-destructive font-semibold" :
                    diff > 0 ? "text-green-600" :
                    diff < -10 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {isFalta ? "F" : hasWork ? minToStr(worked) : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary bar */}
        <div className="border-t pt-2 grid grid-cols-4 md:grid-cols-8 gap-1.5 text-center">
          {[
            { label: "HE Sem", value: `${summary.horasExtrasSemanais}h`, cls: "text-green-600" },
            { label: "HE Sáb", value: `${summary.horasExtrasSabado}h`, cls: "text-green-600" },
            { label: "HE 100%", value: `${summary.horasExtras100}h`, cls: "text-green-600" },
            { label: "H.Neg", value: `${summary.horasNegativas}h`, cls: "text-destructive" },
            { label: "Faltas", value: String(summary.faltas), cls: "text-destructive" },
            { label: "Atest.", value: String(summary.atestados), cls: "text-amber-600" },
            { label: "DSR Perd.", value: String(summary.semanasComFalta), cls: "text-destructive" },
            { label: "Total", value: `${summary.totalHorasTrabalhadas}h`, cls: "font-bold" },
          ].map(item => (
            <div key={item.label} className="rounded bg-muted/50 py-1">
              <p className="text-[8px] text-muted-foreground leading-none">{item.label}</p>
              <p className={`text-[11px] font-semibold ${item.cls}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <Button onClick={applyToFolha} className="w-full gap-1.5 h-7 text-xs" size="sm">
          <Clock className="h-3.5 w-3.5" /> Aplicar na Folha
        </Button>
      </CardContent>
    </Card>
  );
}
