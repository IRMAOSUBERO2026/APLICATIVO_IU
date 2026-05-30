import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calculator, FileDown, CheckCircle2, Search, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { organizarBatidasDiarias } from "@/utils/afdParser";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";

export default function ApuracaoPonto() {
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState("");
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [apuracao, setApuracao] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("obras").select("id, nome").eq("status", "em_andamento")
      .then(({ data }) => { if (data) setObras(data); });
  }, []);

  const handleGerar = async () => {
    if (!selectedObra) {
      toast({ title: "Erro", description: "Selecione uma obra.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const dataInicio = startOfMonth(new Date(selectedAno, selectedMes - 1));
      const dataFim = endOfMonth(dataInicio);
      const dataInicioStr = format(dataInicio, "yyyy-MM-dd");
      const dataFimStr = format(dataFim, "yyyy-MM-dd");

      // 1. Obter funcionários ativos na obra
      const { data: funcionarios } = await supabase
        .from("funcionarios")
        .select("id, nome, cargo, pis")
        .eq("obra_id", selectedObra)
        .eq("status", "ativo");

      if (!funcionarios) throw new Error("Nenhum funcionário encontrado.");

      // 2. Obter todas as batidas da obra no período
      const { data: batidasRaw } = await supabase
        .from("ponto_batidas_raw")
        .select("*")
        .gte("timestamp_batida", `${dataInicioStr}T00:00:00`)
        .lte("timestamp_batida", `${dataFimStr}T23:59:59`)
        .eq("obra_id_batida", selectedObra);

      // 3. Obter atestados médicos aprovados
      const { data: justificativasRaw } = await supabase
        .from("justificativas_ponto")
        .select(`
          funcionario_id,
          tipo,
          status,
          data_ocorrencia
        `)
        .eq("status", "aprovado")
        .eq("tipo", "atestado")
        .gte("data_ocorrencia", dataInicioStr)
        .lte("data_ocorrencia", dataFimStr);

      const diasMes = eachDayOfInterval({ start: dataInicio, end: dataFim });
      const resultados: any[] = [];
      const recordsToSave: any[] = [];

      for (const func of funcionarios) {
        let totalNormais = 0;
        let totalHE50 = 0;
        let totalHE100 = 0;
        let diasTrabalhados = 0;
        let faltas = 0;
        let atestados = 0;

        for (const dia of diasMes) {
          const batidasDia = (batidasRaw || [])
            .filter(b => b.funcionario_id === func.id && isSameDay(parseISO(b.timestamp_batida), dia))
            .map(b => parseISO(b.timestamp_batida));

          if (batidasDia.length > 0) {
            diasTrabalhados++;
            const { horasTrabalhadas } = organizarBatidasDiarias(batidasDia);
            
            const eFimDeSemana = isWeekend(dia);
            
            if (eFimDeSemana) {
              totalHE100 += horasTrabalhadas;
            } else {
              const normais = Math.min(horasTrabalhadas, 8.8); // 8h48min ou 8h? Vamos usar 8h como base
              const extras = Math.max(0, horasTrabalhadas - 8);
              totalNormais += normais;
              totalHE50 += extras;
            }
          } else if (!isWeekend(dia)) {
            // Verifica se tem atestado
            const isAtestado = justificativasRaw?.some(j => 
              j.funcionario_id === func.id && 
              isSameDay(parseISO(j.data_ocorrencia), dia)
            );
            
            if (isAtestado) {
              atestados++;
            } else {
              faltas++;
            }
          }
        }

        resultados.push({
          id: func.id,
          nome: func.nome,
          cargo: func.cargo,
          pis: func.pis,
          diasTrabalhados,
          horasNormais: totalNormais,
          he50: totalHE50,
          he100: totalHE100,
          faltas,
          atestados_dias: atestados
        });

        recordsToSave.push({
          funcionario_id: func.id,
          obra_id: selectedObra,
          mes: selectedMes,
          ano: selectedAno,
          horas_normais: Number(totalNormais.toFixed(2)),
          horas_extras_50: Number(totalHE50.toFixed(2)),
          horas_extras_100: Number(totalHE100.toFixed(2)),
          faltas_dias: faltas,
          atestados_dias: atestados,
          dias_trabalhados: diasTrabalhados,
          status: 'aberta'
        });
      }

      // Salva no banco de dados automaticamente para a folha poder puxar depois
      if (recordsToSave.length > 0) {
        const { error: dbError } = await supabase.from('ponto_apuracao_mensal').upsert(recordsToSave, {
          onConflict: 'funcionario_id,mes,ano'
        });
        if (dbError) throw dbError;
      }

      setApuracao(resultados);
      toast({ title: "Apuração gerada e salva com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro na apuração", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apuração Mensal</h1>
            <p className="text-sm text-muted-foreground">Consolidado de horas para fechamento de folha</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={handleGerar} disabled={loading} className="gap-2 bg-success hover:bg-success/90">
              <Calculator className="h-4 w-4" /> {loading ? "Calculando..." : "Gerar Apuração"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border bg-card/50">
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Obra</Label>
            <select value={selectedObra} onChange={e => setSelectedObra(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Selecione a obra...</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Mês</Label>
            <select value={selectedMes} onChange={e => setSelectedMes(Number(e.target.value))} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2026, i, 1), "MMMM", { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Ano</Label>
            <select value={selectedAno} onChange={e => setSelectedAno(Number(e.target.value))} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Dias Trab.</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">H. Normais</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">HE 50%</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">HE 100%</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Faltas</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Atestados</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {apuracao.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-bold">{item.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{item.cargo} • PIS: {item.pis}</div>
                  </td>
                  <td className="px-4 py-4 text-center font-medium">{item.diasTrabalhados}</td>
                  <td className="px-4 py-4 text-center font-mono text-xs">{item.horasNormais.toFixed(1)}h</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-warning font-bold">{item.he50.toFixed(1)}h</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-success font-bold">{item.he100.toFixed(1)}h</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-destructive font-bold">{item.faltas}d</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-warning font-bold">{item.atestados_dias}d</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
                      Pronto
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8">Ver Detalhes</Button>
                  </td>
                </tr>
              ))}
              {apuracao.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                    Selecione os filtros e clique em "Gerar Apuração" para visualizar os dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
