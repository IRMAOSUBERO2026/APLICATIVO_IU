import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { organizarBatidasDiarias } from "@/utils/afdParser";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";

const JORNADA_DIA = 8;

type DiaLinha = {
  data: Date;
  ent1: string;
  sai1: string;
  ent2: string;
  sai2: string;
  horas: number;
  incompleto: boolean;
  fimDeSemana: boolean;
  batidas: number;
};

type Totais = {
  diasTrabalhados: number;
  horasNormais: number;
  he50: number;
  he100: number;
  faltas: number;
};

const hhmm = (decimal: number) => {
  const total = Math.round(decimal * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const hora = (d: Date | null) => (d ? format(d, "HH:mm") : "--:--");

export default function EspelhoPontoMensal() {
  const [obras, setObras] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState("");
  const [selectedFunc, setSelectedFunc] = useState("");
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [dias, setDias] = useState<DiaLinha[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [apuracao, setApuracao] = useState<any | null>(null);
  const [apuracaoIndisponivel, setApuracaoIndisponivel] = useState(false);

  useEffect(() => {
    supabase
      .from("obras")
      .select("id, nome")
      .in("status", OBRA_STATUS_ATIVOS_ARR)
      .then(({ data }) => data && setObras(data));
  }, []);

  useEffect(() => {
    setSelectedFunc("");
    setFuncionarios([]);
    if (!selectedObra) return;
    supabase
      .from("funcionarios")
      .select("id, nome, cargo, numero_registro, pis, status")
      .eq("obra_id", selectedObra)
      .order("nome")
      .then(({ data }) => data && setFuncionarios(data));
  }, [selectedObra]);

  const periodo = useMemo(() => {
    const inicio = startOfMonth(new Date(selectedAno, selectedMes - 1));
    return { inicio, fim: endOfMonth(inicio) };
  }, [selectedMes, selectedAno]);

  const funcSelecionado = funcionarios.find((f) => f.id === selectedFunc);

  const handleBuscar = async () => {
    if (!selectedFunc) {
      toast({ title: "Selecione o funcionário", variant: "destructive" });
      return;
    }
    setLoading(true);
    setApuracao(null);
    setApuracaoIndisponivel(false);
    try {
      const inicioStr = format(periodo.inicio, "yyyy-MM-dd");
      const fimStr = format(periodo.fim, "yyyy-MM-dd");

      const { data: batidas, error } = await supabase
        .from("ponto_batidas_raw")
        .select("timestamp_batida")
        .eq("funcionario_id", selectedFunc)
        .gte("timestamp_batida", `${inicioStr}T00:00:00`)
        .lte("timestamp_batida", `${fimStr}T23:59:59`)
        .order("timestamp_batida");
      if (error) throw error;

      const marcacoes = (batidas || []).map((b) => parseISO(b.timestamp_batida));
      const linhas: DiaLinha[] = [];
      const acc: Totais = {
        diasTrabalhados: 0,
        horasNormais: 0,
        he50: 0,
        he100: 0,
        faltas: 0,
      };

      for (const dia of eachDayOfInterval({ start: periodo.inicio, end: periodo.fim })) {
        const doDia = marcacoes.filter((m) => isSameDay(m, dia));
        const fds = isWeekend(dia);
        if (doDia.length === 0) {
          if (!fds) acc.faltas++;
          linhas.push({
            data: dia,
            ent1: "--:--",
            sai1: "--:--",
            ent2: "--:--",
            sai2: "--:--",
            horas: 0,
            incompleto: false,
            fimDeSemana: fds,
            batidas: 0,
          });
          continue;
        }
        const d = organizarBatidasDiarias(doDia);
        acc.diasTrabalhados++;
        if (fds) {
          acc.he100 += d.horasTrabalhadas;
        } else {
          acc.horasNormais += Math.min(d.horasTrabalhadas, JORNADA_DIA);
          acc.he50 += Math.max(0, d.horasTrabalhadas - JORNADA_DIA);
        }
        linhas.push({
          data: dia,
          ent1: hora(d.ent1),
          sai1: hora(d.sai1),
          ent2: hora(d.ent2),
          sai2: hora(d.sai2),
          horas: d.horasTrabalhadas,
          incompleto: d.incompleto,
          fimDeSemana: fds,
          batidas: doDia.length,
        });
      }

      setDias(linhas);
      setTotais(acc);

      // Comparação com o relatório salvo pela Apuração Mensal
      const { data: apur, error: apurError } = await (supabase as any)
        .from("ponto_apuracao_mensal")
        .select("*")
        .eq("funcionario_id", selectedFunc)
        .eq("mes", selectedMes)
        .eq("ano", selectedAno)
        .maybeSingle();
      if (apurError) setApuracaoIndisponivel(true);
      else setApuracao(apur);
    } catch (e: any) {
      toast({ title: "Erro ao montar o espelho", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const comparativo = useMemo(() => {
    if (!totais || !apuracao) return [];
    const linhas = [
      { label: "Dias trabalhados", esp: totais.diasTrabalhados, apu: Number(apuracao.dias_trabalhados || 0), horas: false },
      { label: "Horas normais", esp: totais.horasNormais, apu: Number(apuracao.horas_normais || 0), horas: true },
      { label: "Horas extras 50%", esp: totais.he50, apu: Number(apuracao.horas_extras_50 || 0), horas: true },
      { label: "Horas extras 100%", esp: totais.he100, apu: Number(apuracao.horas_extras_100 || 0), horas: true },
      { label: "Faltas (dias)", esp: totais.faltas, apu: Number(apuracao.faltas_dias || 0), horas: false },
    ];
    return linhas.map((l) => ({ ...l, diferenca: Number((l.esp - l.apu).toFixed(2)) }));
  }, [totais, apuracao]);

  const divergencias = comparativo.filter((c) => Math.abs(c.diferenca) > 0.02).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Espelho de Ponto Mensal</h1>
          <p className="text-sm text-muted-foreground">
            Marcações diárias de entrada e saída e conferência com o relatório da Apuração Mensal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-xl border bg-card/50">
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Obra</Label>
            <select
              value={selectedObra}
              onChange={(e) => setSelectedObra(e.target.value)}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Selecione...</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Funcionário</Label>
            <select
              value={selectedFunc}
              onChange={(e) => setSelectedFunc(e.target.value)}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              disabled={!selectedObra}
            >
              <option value="">Selecione...</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.numero_registro ? `${f.numero_registro} - ` : ""}{f.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Mês</Label>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2026, i, 1), "MMMM", { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Ano</Label>
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const ano = new Date().getFullYear() - 2 + i;
                return <option key={ano} value={ano}>{ano}</option>;
              })}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleBuscar} disabled={loading} className="w-full gap-2">
              <Search className="h-4 w-4" /> {loading ? "Buscando..." : "Gerar espelho"}
            </Button>
          </div>
        </div>

        {totais && (
          <>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    {funcSelecionado?.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Período: {format(periodo.inicio, "dd/MM/yyyy")} a {format(periodo.fim, "dd/MM/yyyy")}
                    {funcSelecionado?.cargo ? ` • ${funcSelecionado.cargo}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div><p className="text-[10px] uppercase text-muted-foreground">Dias</p><p className="font-bold">{totais.diasTrabalhados}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">Normais</p><p className="font-bold">{hhmm(totais.horasNormais)}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">HE 50%</p><p className="font-bold">{hhmm(totais.he50)}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">HE 100%</p><p className="font-bold">{hhmm(totais.he100)}</p></div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Dia</th>
                    <th className="p-3">Entrada 1</th>
                    <th className="p-3">Saída 1</th>
                    <th className="p-3">Entrada 2</th>
                    <th className="p-3">Saída 2</th>
                    <th className="p-3">Horas</th>
                    <th className="p-3">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.map((d) => (
                    <tr
                      key={d.data.toISOString()}
                      className={`border-t ${d.fimDeSemana ? "bg-muted/30" : ""}`}
                    >
                      <td className="p-3 font-medium whitespace-nowrap">
                        {format(d.data, "dd/MM (EEE)", { locale: ptBR })}
                      </td>
                      <td className="p-3 text-center tabular-nums">{d.ent1}</td>
                      <td className="p-3 text-center tabular-nums">{d.sai1}</td>
                      <td className="p-3 text-center tabular-nums">{d.ent2}</td>
                      <td className="p-3 text-center tabular-nums">{d.sai2}</td>
                      <td className="p-3 text-center tabular-nums">{d.horas > 0 ? hhmm(d.horas) : "-"}</td>
                      <td className="p-3 text-center">
                        {d.batidas === 0 ? (
                          <Badge variant={d.fimDeSemana ? "secondary" : "destructive"}>
                            {d.fimDeSemana ? "Folga" : "Sem marcação"}
                          </Badge>
                        ) : d.incompleto || d.batidas % 2 !== 0 ? (
                          <Badge variant="outline" className="border-warning text-warning">Incompleto</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Comparativo com a Apuração Mensal</p>
                {apuracao && (
                  divergencias > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> {divergencias} divergência(s)
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Valores conferem
                    </Badge>
                  )
                )}
              </div>

              {!apuracao ? (
                <p className="text-sm text-muted-foreground">
                  {apuracaoIndisponivel
                    ? "Não foi possível ler o relatório da Apuração Mensal para este período."
                    : "Nenhuma apuração salva para este funcionário neste mês. Gere a Apuração Mensal para comparar."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Indicador</th>
                        <th className="p-3">Espelho de ponto</th>
                        <th className="p-3">Apuração Mensal</th>
                        <th className="p-3">Diferença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparativo.map((c) => (
                        <tr key={c.label} className="border-t">
                          <td className="p-3 font-medium">{c.label}</td>
                          <td className="p-3 text-center tabular-nums">{c.horas ? hhmm(c.esp) : c.esp}</td>
                          <td className="p-3 text-center tabular-nums">{c.horas ? hhmm(c.apu) : c.apu}</td>
                          <td
                            className={`p-3 text-center tabular-nums font-semibold ${
                              Math.abs(c.diferenca) > 0.02 ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            {c.horas
                              ? `${c.diferenca < 0 ? "-" : ""}${hhmm(Math.abs(c.diferenca))}`
                              : c.diferenca}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
