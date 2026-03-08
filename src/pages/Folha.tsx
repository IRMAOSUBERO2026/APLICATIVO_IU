import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FolhaInputForm } from "@/components/folha/FolhaInputForm";
import { FolhaResultado } from "@/components/folha/FolhaResultado";
import { calcularFolha, type FolhaInput } from "@/lib/motorFolha";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calculator, UserRound } from "lucide-react";
import { getDaysInMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface FuncionarioOption {
  id: string;
  nome: string;
  salario_base: number;
  salario_combinado: number | null;
  cargo: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const defaultInput: FolhaInput = {
  salario_registro: 0,
  salario_combinado: 0,
  dias_do_mes: 30,
  horas_extras_semanais: 0,
  horas_extras_sabado: 0,
  horas_extras_100: 0,
  horas_negativas: 0,
  faltas: 0,
  atestados: 0,
  semanas_com_falta: 0,
  domingos_feriados_no_mes: 4,
  bonificacao_meta: 0,
  bonificacao_assiduidade: 0,
  desconto_marmita: 0,
  desconto_vale: 0,
  desconto_emprestimo: 0,
  outros_descontos: 0,
  usar_salario_sindicato_para_HE: true,
};

function countSundaysAndHolidays(year: number, month: number): number {
  const days = getDaysInMonth(new Date(year, month));
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month, d).getDay() === 0) count++;
  }
  return count;
}

export default function Folha() {
  const { toast } = useToast();
  const [funcionarios, setFuncionarios] = useState<FuncionarioOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth());
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [input, setInput] = useState<FolhaInput>(defaultInput);
  const [calculated, setCalculated] = useState(false);

  // Load funcionarios
  useEffect(() => {
    supabase
      .from("funcionarios")
      .select("id, nome, salario_base, salario_combinado, cargo")
      .eq("status", "ativo")
      .order("nome")
      .then(({ data }) => {
        if (data) setFuncionarios(data);
      });
  }, []);

  // When employee or month changes, update salaries and dias_do_mes
  useEffect(() => {
    const func = funcionarios.find((f) => f.id === selectedId);
    if (!func) return;
    const diasDoMes = getDaysInMonth(new Date(ano, mes));
    const domingos = countSundaysAndHolidays(ano, mes);
    setInput((prev) => ({
      ...prev,
      salario_registro: func.salario_base,
      salario_combinado: func.salario_combinado ?? func.salario_base,
      dias_do_mes: diasDoMes,
      domingos_feriados_no_mes: domingos,
    }));
    setCalculated(false);
  }, [selectedId, mes, ano, funcionarios]);

  const result = useMemo(() => (calculated ? calcularFolha(input) : null), [calculated, input]);

  const handleCalc = () => {
    if (!selectedId) {
      toast({ title: "Selecione um funcionário", variant: "destructive" });
      return;
    }
    setCalculated(true);
  };

  const anos = [ano - 1, ano, ano + 1];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Folha Salarial</h1>
          <p className="text-sm text-muted-foreground">Fechamento mensal de funcionários</p>
        </div>

        {/* Seleção Funcionário / Mês */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserRound className="h-4 w-4" /> Selecionar Funcionário & Período
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Funcionário</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome} — {f.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ano</Label>
              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de entrada */}
        <FolhaInputForm data={input} onChange={(d) => { setInput(d); setCalculated(false); }} />

        {/* Botão Calcular */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleCalc} className="gap-2">
            <Calculator className="h-4 w-4" />
            Calcular Fechamento
          </Button>
        </div>

        {/* Resultado */}
        {result && <FolhaResultado result={result} />}
      </div>
    </AppLayout>
  );
}
