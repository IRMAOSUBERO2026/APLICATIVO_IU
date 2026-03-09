import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FolhaInputForm } from "@/components/folha/FolhaInputForm";
import { FolhaResultado } from "@/components/folha/FolhaResultado";
import { FolhaResumoObra } from "@/components/folha/FolhaResumoObra";
import { ImportarPontoPDF } from "@/components/folha/ImportarPontoPDF";
import { calcularFolha, type FolhaInput, type FolhaOutput } from "@/lib/motorFolha";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calculator, ChevronLeft, ChevronRight, Save, HardHat, FileText } from "lucide-react";
import { getDaysInMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface FuncionarioFolha {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  salario_base: number;
  salario_combinado: number | null;
  input: FolhaInput;
  result: FolhaOutput | null;
  saved: boolean;
}

interface ObraOption {
  id: string;
  nome: string;
  codigo: string;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function countSundaysAndHolidays(year: number, month: number): number {
  const days = getDaysInMonth(new Date(year, month));
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month, d).getDay() === 0) count++;
  }
  return count;
}

function makeDefaultInput(salarioBase: number, salarioCombinado: number, diasMes: number, domingos: number): FolhaInput {
  return {
    salario_registro: salarioBase,
    salario_combinado: salarioCombinado,
    dias_do_mes: diasMes,
    horas_extras_semanais: 0,
    horas_extras_sabado: 0,
    horas_extras_100: 0,
    horas_negativas: 0,
    faltas: 0,
    atestados: 0,
    semanas_com_falta: 0,
    domingos_feriados_no_mes: domingos,
    bonificacao_meta: 0,
    bonificacao_assiduidade: 0,
    desconto_marmita: 0,
    desconto_vale: 0,
    desconto_emprestimo: 0,
    outros_descontos: 0,
    usar_salario_sindicato_para_HE: true,
  };
}

export default function Folha() {
  const { toast } = useToast();
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [selectedObraId, setSelectedObraId] = useState("");
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const [funcionarios, setFuncionarios] = useState<FuncionarioFolha[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResumo, setShowResumo] = useState(false);

  // Load obras
  useEffect(() => {
    supabase
      .from("obras")
      .select("id, nome, codigo")
      .eq("status", "em_andamento")
      .order("nome")
      .then(({ data }) => { if (data) setObras(data); });
  }, []);

  // Load funcionários when obra/mes/ano changes
  useEffect(() => {
    if (!selectedObraId) { setFuncionarios([]); return; }
    setLoading(true);
    setShowResumo(false);
    setCurrentIdx(0);

    const diasMes = getDaysInMonth(new Date(ano, mes));
    const domingos = countSundaysAndHolidays(ano, mes);

    Promise.all([
      supabase
        .from("funcionarios")
        .select("id, nome, cpf, cargo, salario_base, salario_combinado")
        .eq("obra_id", selectedObraId)
        .eq("status", "ativo")
        .order("nome"),
      supabase
        .from("folhas_pagamento")
        .select("*")
        .eq("obra_id", selectedObraId)
        .eq("mes", mes + 1)
        .eq("ano", ano),
    ]).then(([funcRes, folhaRes]) => {
      const funcs = funcRes.data ?? [];
      const folhas = folhaRes.data ?? [];
      const folhaMap = new Map(folhas.map((f: any) => [f.funcionario_id, f]));

      const list: FuncionarioFolha[] = funcs.map((f) => {
        const existing = folhaMap.get(f.id) as any;
        if (existing) {
          const input: FolhaInput = {
            salario_registro: Number(existing.salario_registro),
            salario_combinado: Number(existing.salario_combinado),
            dias_do_mes: existing.dias_do_mes,
            horas_extras_semanais: Number(existing.horas_extras_semanais),
            horas_extras_sabado: Number(existing.horas_extras_sabado),
            horas_extras_100: Number(existing.horas_extras_100),
            horas_negativas: Number(existing.horas_negativas),
            faltas: existing.faltas,
            atestados: existing.atestados,
            semanas_com_falta: existing.semanas_com_falta,
            domingos_feriados_no_mes: existing.domingos_feriados_no_mes,
            bonificacao_meta: Number(existing.bonificacao_meta),
            bonificacao_assiduidade: Number(existing.bonificacao_assiduidade),
            desconto_marmita: Number(existing.desconto_marmita),
            desconto_vale: Number(existing.desconto_vale),
            desconto_emprestimo: Number(existing.desconto_emprestimo),
            outros_descontos: Number(existing.outros_descontos),
            usar_salario_sindicato_para_HE: existing.usar_salario_sindicato_para_he,
          };
          return {
            id: f.id,
            nome: f.nome,
            cargo: f.cargo,
            salario_base: f.salario_base,
            salario_combinado: f.salario_combinado,
            input,
            result: calcularFolha(input),
            saved: true,
          };
        }
        const sc = f.salario_combinado ?? f.salario_base;
        return {
          id: f.id,
          nome: f.nome,
          cargo: f.cargo,
          salario_base: f.salario_base,
          salario_combinado: f.salario_combinado,
          input: makeDefaultInput(f.salario_base, sc, diasMes, domingos),
          result: null,
          saved: false,
        };
      });
      setFuncionarios(list);
      setLoading(false);
    });
  }, [selectedObraId, mes, ano]);

  const current = funcionarios[currentIdx] ?? null;

  const handleInputChange = useCallback((data: FolhaInput) => {
    setFuncionarios((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], input: data, result: null, saved: false };
      return copy;
    });
  }, [currentIdx]);

  const handleCalc = () => {
    if (!current) return;
    const result = calcularFolha(current.input);
    setFuncionarios((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], result, saved: false };
      return copy;
    });
  };

  const handleCalcAndNext = () => {
    handleCalc();
    if (currentIdx < funcionarios.length - 1) {
      setTimeout(() => setCurrentIdx((i) => i + 1), 200);
    }
  };

  const handleSaveAll = async () => {
    // Calculate any uncalculated
    const withResults = funcionarios.map((f) => ({
      ...f,
      result: f.result ?? calcularFolha(f.input),
    }));
    setFuncionarios(withResults);
    setSaving(true);

    const obra = obras.find((o) => o.id === selectedObraId);
    const empresaRes = await supabase.from("obras").select("empresa_id").eq("id", selectedObraId).single();
    const empresaId = empresaRes.data?.empresa_id;

    if (!empresaId) {
      toast({ title: "Erro ao buscar empresa da obra", variant: "destructive" });
      setSaving(false);
      return;
    }

    const rows = withResults.map((f) => ({
      funcionario_id: f.id,
      obra_id: selectedObraId,
      empresa_id: empresaId,
      mes: mes + 1,
      ano,
      salario_registro: f.input.salario_registro,
      salario_combinado: f.input.salario_combinado,
      dias_do_mes: f.input.dias_do_mes,
      domingos_feriados_no_mes: f.input.domingos_feriados_no_mes,
      usar_salario_sindicato_para_he: f.input.usar_salario_sindicato_para_HE,
      horas_extras_semanais: f.input.horas_extras_semanais,
      horas_extras_sabado: f.input.horas_extras_sabado,
      horas_extras_100: f.input.horas_extras_100,
      horas_negativas: f.input.horas_negativas,
      faltas: f.input.faltas,
      atestados: f.input.atestados,
      semanas_com_falta: f.input.semanas_com_falta,
      bonificacao_meta: f.input.bonificacao_meta,
      bonificacao_assiduidade: f.input.bonificacao_assiduidade,
      desconto_marmita: f.input.desconto_marmita,
      desconto_vale: f.input.desconto_vale,
      desconto_emprestimo: f.input.desconto_emprestimo,
      outros_descontos: f.input.outros_descontos,
      base_dia: f.result!.base_dia,
      base_hora: f.result!.base_hora,
      he_semanal: f.result!.HE_semanal,
      he_sabado: f.result!.HE_sabado,
      he_100: f.result!.HE_100,
      total_he: f.result!.total_HE,
      dsr_he: f.result!.DSR_HE,
      valor_atestados: f.result!.valor_atestados,
      desconto_faltas: f.result!.desconto_faltas,
      desconto_horas_negativas: f.result!.desconto_horas_negativas,
      dsr_perdido: f.result!.dsr_perdido,
      total_bonificacoes: f.result!.total_bonificacoes,
      total_descontos: f.result!.total_descontos,
      salario_final: f.result!.salario_final,
    }));

    const { error } = await supabase.from("folhas_pagamento").upsert(rows, {
      onConflict: "funcionario_id,mes,ano",
    });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Folha salva para ${withResults.length} funcionários` });
      setFuncionarios((prev) => prev.map((f) => ({ ...f, saved: true })));
      setShowResumo(true);
    }
    setSaving(false);
  };

  const anos = [ano - 1, ano, ano + 1];
  const calculatedCount = funcionarios.filter((f) => f.result !== null).length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Folha Salarial</h1>
          <p className="text-sm text-muted-foreground">Fechamento mensal por obra</p>
        </div>

        {/* Seleção Obra / Mês */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HardHat className="h-4 w-4" /> Selecionar Obra & Período
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Obra</Label>
              <Select value={selectedObraId} onValueChange={(v) => { setSelectedObraId(v); setShowResumo(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a obra..." />
                </SelectTrigger>
                <SelectContent>
                  {obras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando funcionários...</p>}

        {/* Sem funcionários */}
        {!loading && selectedObraId && funcionarios.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum funcionário ativo nesta obra.</CardContent></Card>
        )}

        {/* Navegação entre funcionários */}
        {!loading && funcionarios.length > 0 && !showResumo && (
          <>
            <Card>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <div className="text-center">
                  <p className="font-semibold text-sm">{current?.nome}</p>
                  <p className="text-xs text-muted-foreground">{current?.cargo}</p>
                  <div className="flex items-center gap-2 justify-center mt-1">
                    <Badge variant="outline" className="text-xs">{currentIdx + 1} / {funcionarios.length}</Badge>
                    {current?.result && <Badge variant={current.saved ? "default" : "secondary"} className="text-xs">{current.saved ? "Salvo" : "Calculado"}</Badge>}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={currentIdx === funcionarios.length - 1} onClick={() => setCurrentIdx((i) => i + 1)}>
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Formulário */}
            {current && (
              <FolhaInputForm data={current.input} onChange={handleInputChange} />
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-3 justify-between">
              <Button variant="outline" onClick={handleCalc} className="gap-2">
                <Calculator className="h-4 w-4" /> Calcular
              </Button>
              {currentIdx < funcionarios.length - 1 && (
                <Button onClick={handleCalcAndNext} className="gap-2">
                  <Calculator className="h-4 w-4" /> Calcular & Próximo
                </Button>
              )}
              {calculatedCount === funcionarios.length && (
                <Button onClick={() => setShowResumo(true)} variant="secondary" className="gap-2">
                  <FileText className="h-4 w-4" /> Ver Resumo da Obra
                </Button>
              )}
            </div>

            {/* Resultado individual */}
            {current?.result && <FolhaResultado result={current.result} />}
          </>
        )}

        {/* Resumo da obra */}
        {showResumo && (
          <>
            <FolhaResumoObra
              funcionarios={funcionarios.map((f) => ({
                nome: f.nome,
                cargo: f.cargo,
                result: f.result ?? calcularFolha(f.input),
              }))}
              obra={obras.find((o) => o.id === selectedObraId)?.nome ?? ""}
              mes={MESES[mes]}
              ano={ano}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowResumo(false)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar p/ Edição
              </Button>
              <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Fechamento Completo"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
