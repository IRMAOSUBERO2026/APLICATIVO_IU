import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, RotateCcw, Copy } from "lucide-react";
import { getDaysInMonth } from "date-fns";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
const DIAS_LABELS: Record<string, string> = {
  dom: "Dom", seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb",
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
}

export interface PontoResult {
  horasExtrasSemanais: number;
  horasExtrasSabado: number;
  horasExtras100: number;
  horasNegativas: number;
  faltas: number;
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
  return `${h}h${min > 0 ? String(min).padStart(2, "0") : "00"}`;
}

function calcDayHours(punch: PunchDay, padrao: { e1: string; s1: string; e2: string; s2: string } | null) {
  const e1 = timeToMin(punch.e1);
  const s1 = timeToMin(punch.s1);
  const e2 = timeToMin(punch.e2);
  const s2 = timeToMin(punch.s2);

  // If no punches at all, check if it's a working day
  if (e1 === null && s1 === null && e2 === null && s2 === null) {
    if (padrao && padrao.e1) {
      return { worked: 0, expected: calcExpected(padrao), isFalta: true };
    }
    return { worked: 0, expected: 0, isFalta: false }; // day off
  }

  let worked = 0;
  if (e1 !== null && s1 !== null) worked += s1 - e1;
  if (e2 !== null && s2 !== null) worked += s2 - e2;

  const expected = padrao ? calcExpected(padrao) : 0;

  return { worked, expected, isFalta: false };
}

function calcExpected(p: { e1: string; s1: string; e2: string; s2: string }): number {
  let total = 0;
  const e1 = timeToMin(p.e1), s1 = timeToMin(p.s1);
  const e2 = timeToMin(p.e2), s2 = timeToMin(p.s2);
  if (e1 !== null && s1 !== null) total += s1 - e1;
  if (e2 !== null && s2 !== null) total += s2 - e2;
  return total;
}

/**
 * Apply tolerance rules:
 * - Late arrival up to 10min: tolerated (no discount)
 * - Late > 10min: rounds up to 30min blocks of negative hours
 * - Extra time: only counts from 30min full blocks
 */
function calcDiff(worked: number, expected: number): { extra: number; negative: number } {
  if (expected === 0) {
    // Working on off day = 100% extra
    if (worked > 0) {
      const blocks = Math.floor(worked / 30);
      return { extra: blocks * 30, negative: 0 };
    }
    return { extra: 0, negative: 0 };
  }

  const diff = worked - expected;

  if (diff >= 0) {
    // Extra time - only counts from 30min full blocks
    const blocks = Math.floor(diff / 30);
    return { extra: blocks * 30, negative: 0 };
  } else {
    // Late / negative
    const absDiff = Math.abs(diff);
    if (absDiff <= 10) {
      // Tolerance - no discount
      return { extra: 0, negative: 0 };
    }
    // Round up to 30min blocks
    const blocks = Math.ceil(absDiff / 30);
    return { extra: 0, negative: blocks * 30 };
  }
}

interface Props {
  mes: number; // 0-indexed
  ano: number;
  horarioPadrao: HorarioPadrao | null;
  onResult: (result: PontoResult) => void;
}

export function EspelhoPonto({ mes, ano, horarioPadrao, onResult }: Props) {
  const diasNoMes = getDaysInMonth(new Date(ano, mes));

  const [punches, setPunches] = useState<PunchDay[]>([]);

  // Initialize punches for the month
  useEffect(() => {
    const days: PunchDay[] = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(ano, mes, d);
      const dow = DIAS_SEMANA[date.getDay()];
      const padrao = horarioPadrao?.[dow as keyof HorarioPadrao];
      days.push({
        dia: d,
        diaSemana: dow,
        e1: padrao?.e1 || "",
        s1: padrao?.s1 || "",
        e2: padrao?.e2 || "",
        s2: padrao?.s2 || "",
      });
    }
    setPunches(days);
  }, [mes, ano, diasNoMes, horarioPadrao]);

  const handlePunchChange = (idx: number, field: "e1" | "s1" | "e2" | "s2", value: string) => {
    setPunches(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const fillFromPadrao = () => {
    if (!horarioPadrao) return;
    setPunches(prev => prev.map(p => {
      const padrao = horarioPadrao[p.diaSemana as keyof HorarioPadrao];
      return { ...p, e1: padrao.e1, s1: padrao.s1, e2: padrao.e2, s2: padrao.s2 };
    }));
  };

  const clearAll = () => {
    setPunches(prev => prev.map(p => ({ ...p, e1: "", s1: "", e2: "", s2: "" })));
  };

  // Calculate totals
  const summary = useMemo(() => {
    let totalExtrasSemanais = 0;
    let totalExtrasSabado = 0;
    let totalExtras100 = 0;
    let totalNegativas = 0;
    let faltas = 0;
    let totalTrabalhadas = 0;

    punches.forEach(p => {
      const padrao = horarioPadrao?.[p.diaSemana as keyof HorarioPadrao] ?? null;
      const { worked, expected, isFalta } = calcDayHours(p, padrao);

      totalTrabalhadas += worked;

      if (isFalta) {
        faltas++;
        return;
      }

      if (worked === 0 && expected === 0) return; // off day with no punches

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
      totalHorasTrabalhadas: Math.round((totalTrabalhadas / 60) * 10) / 10,
    };
  }, [punches, horarioPadrao]);

  const applyToFolha = () => {
    onResult(summary);
  };

  const isWeekend = (dow: string) => dow === "sab" || dow === "dom";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Espelho Ponto
          </CardTitle>
          <div className="flex gap-2">
            {horarioPadrao && (
              <Button variant="outline" size="sm" onClick={fillFromPadrao} className="gap-1 text-xs">
                <Copy className="h-3 w-3" /> Preencher Padrão
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs">
              <RotateCcw className="h-3 w-3" /> Limpar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-[50px_40px_1fr_1fr_1fr_1fr_60px] gap-1 text-[10px] font-semibold text-muted-foreground uppercase px-1">
          <span>Dia</span>
          <span></span>
          <span>Entrada</span>
          <span>Saída</span>
          <span>Entrada</span>
          <span>Saída</span>
          <span className="text-right">Horas</span>
        </div>

        {/* Rows */}
        <div className="max-h-[400px] overflow-y-auto space-y-0.5">
          {punches.map((p, idx) => {
            const padrao = horarioPadrao?.[p.diaSemana as keyof HorarioPadrao] ?? null;
            const { worked, expected, isFalta } = calcDayHours(p, padrao);
            const weekend = isWeekend(p.diaSemana);
            const hasWork = worked > 0;
            const diff = expected > 0 ? worked - expected : 0;

            return (
              <div
                key={p.dia}
                className={`grid grid-cols-[50px_40px_1fr_1fr_1fr_1fr_60px] gap-1 items-center py-0.5 px-1 rounded ${
                  weekend ? "bg-muted/50" : isFalta ? "bg-destructive/5" : ""
                }`}
              >
                <span className="text-xs font-medium">
                  {String(p.dia).padStart(2, "0")}/{String(mes + 1).padStart(2, "0")}
                </span>
                <span className={`text-[10px] font-semibold ${weekend ? "text-destructive" : "text-muted-foreground"}`}>
                  {DIAS_LABELS[p.diaSemana]}
                </span>
                <Input
                  type="time"
                  value={p.e1}
                  onChange={e => handlePunchChange(idx, "e1", e.target.value)}
                  className="h-7 text-xs px-1"
                />
                <Input
                  type="time"
                  value={p.s1}
                  onChange={e => handlePunchChange(idx, "s1", e.target.value)}
                  className="h-7 text-xs px-1"
                />
                <Input
                  type="time"
                  value={p.e2}
                  onChange={e => handlePunchChange(idx, "e2", e.target.value)}
                  className="h-7 text-xs px-1"
                />
                <Input
                  type="time"
                  value={p.s2}
                  onChange={e => handlePunchChange(idx, "s2", e.target.value)}
                  className="h-7 text-xs px-1"
                />
                <span className={`text-xs text-right font-mono ${
                  isFalta ? "text-destructive font-semibold" :
                  diff > 0 ? "text-success" :
                  diff < -10 ? "text-destructive" : ""
                }`}>
                  {isFalta ? "FALTA" : hasWork ? minToStr(worked) : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">HE Semanais</p>
            <p className="text-sm font-bold text-success">{summary.horasExtrasSemanais}h</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">HE Sábado</p>
            <p className="text-sm font-bold text-success">{summary.horasExtrasSabado}h</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">HE 100%</p>
            <p className="text-sm font-bold text-success">{summary.horasExtras100}h</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Horas Negativas</p>
            <p className="text-sm font-bold text-destructive">{summary.horasNegativas}h</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Faltas</p>
            <p className="text-sm font-bold text-destructive">{summary.faltas}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Total Trabalhadas</p>
            <p className="text-sm font-bold">{summary.totalHorasTrabalhadas}h</p>
          </div>
        </div>

        <Button onClick={applyToFolha} className="w-full gap-2" size="sm">
          <Clock className="h-4 w-4" /> Aplicar na Folha
        </Button>
      </CardContent>
    </Card>
  );
}
