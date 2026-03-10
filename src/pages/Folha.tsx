import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FolhaInputForm } from "@/components/folha/FolhaInputForm";
import { FolhaResultado } from "@/components/folha/FolhaResultado";
import { FolhaResumoObra } from "@/components/folha/FolhaResumoObra";
import { ImportarPontoPDF } from "@/components/folha/ImportarPontoPDF";
import { FuncionariosList } from "@/components/folha/FuncionariosList";
import { calcularFolha, type FolhaInput, type FolhaOutput } from "@/lib/motorFolha";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calculator, Save, HardHat, FileText, ArrowLeft, CheckCircle } from "lucide-react";
import { getDaysInMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedFuncId, setSelectedFuncId] = useState<string | null>(null);
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
    setSelectedFuncId(null);

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
            cpf: f.cpf,
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
          cpf: f.cpf,
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

  const currentIdx = useMemo(
    () => funcionarios.findIndex((f) => f.id === selectedFuncId),
    [funcionarios, selectedFuncId]
  );
  const current = currentIdx >= 0 ? funcionarios[currentIdx] : null;

  const handleInputChange = useCallback((data: FolhaInput) => {
    setFuncionarios((prev) =>
      prev.map((f) =>
        f.id === selectedFuncId ? { ...f, input: data, result: null, saved: false } : f
      )
    );
  }, [selectedFuncId]);

  const handleCalc = () => {
    if (!current) return;
    const result = calcularFolha(current.input);
    setFuncionarios((prev) =>
      prev.map((f) =>
        f.id === selectedFuncId ? { ...f, result, saved: false } : f
      )
    );
  };

  const handleFechamentoMensal = async () => {
    if (!current) return;
    const result = calcularFolha(current.input);
    setFuncionarios((prev) =>
      prev.map((f) =>
        f.id === selectedFuncId ? { ...f, result, saved: false } : f
      )
    );
    // Auto-save after calculating
    setSaving(true);
    const empresaRes = await supabase.from("obras").select("empresa_id").eq("id", selectedObraId).single();
    const empresaId = empresaRes.data?.empresa_id;
    if (!empresaId) {
      toast({ title: "Erro ao buscar empresa da obra", variant: "destructive" });
      setSaving(false);
      return;
    }
    const row = {
      funcionario_id: current.id,
      obra_id: selectedObraId,
      empresa_id: empresaId,
      mes: mes + 1,
      ano,
      salario_registro: current.input.salario_registro,
      salario_combinado: current.input.salario_combinado,
      dias_do_mes: current.input.dias_do_mes,
      domingos_feriados_no_mes: current.input.domingos_feriados_no_mes,
      usar_salario_sindicato_para_he: current.input.usar_salario_sindicato_para_HE,
      horas_extras_semanais: current.input.horas_extras_semanais,
      horas_extras_sabado: current.input.horas_extras_sabado,
      horas_extras_100: current.input.horas_extras_100,
      horas_negativas: current.input.horas_negativas,
      faltas: current.input.faltas,
      atestados: current.input.atestados,
      semanas_com_falta: current.input.semanas_com_falta,
      bonificacao_meta: current.input.bonificacao_meta,
      bonificacao_assiduidade: current.input.bonificacao_assiduidade,
      desconto_marmita: current.input.desconto_marmita,
      desconto_vale: current.input.desconto_vale,
      desconto_emprestimo: current.input.desconto_emprestimo,
      outros_descontos: current.input.outros_descontos,
      base_dia: result.base_dia,
      base_hora: result.base_hora,
      he_semanal: result.HE_semanal,
      he_sabado: result.HE_sabado,
      he_100: result.HE_100,
      total_he: result.total_HE,
      dsr_he: result.DSR_HE,
      valor_atestados: result.valor_atestados,
      desconto_faltas: result.desconto_faltas,
      desconto_horas_negativas: result.desconto_horas_negativas,
      dsr_perdido: result.dsr_perdido,
      total_bonificacoes: result.total_bonificacoes,
      total_descontos: result.total_descontos,
      salario_final: result.salario_final,
    };
    const { error } = await supabase.from("folhas_pagamento").upsert([row], {
      onConflict: "funcionario_id,mes,ano",
    });
    if (error) {
      toast({ title: "Erro ao fechar mês", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Mês fechado para ${current.nome} com sucesso!` });
      setFuncionarios((prev) =>
        prev.map((f) =>
          f.id === selectedFuncId ? { ...f, result, saved: true } : f
        )
      );
    }
    setSaving(false);
  };

  const handleSaveIndividual = async () => {
    if (!current) return;
    const result = current.result ?? calcularFolha(current.input);
    setSaving(true);

    const empresaRes = await supabase.from("obras").select("empresa_id").eq("id", selectedObraId).single();
    const empresaId = empresaRes.data?.empresa_id;

    if (!empresaId) {
      toast({ title: "Erro ao buscar empresa da obra", variant: "destructive" });
      setSaving(false);
      return;
    }

    const row = {
      funcionario_id: current.id,
      obra_id: selectedObraId,
      empresa_id: empresaId,
      mes: mes + 1,
      ano,
      salario_registro: current.input.salario_registro,
      salario_combinado: current.input.salario_combinado,
      dias_do_mes: current.input.dias_do_mes,
      domingos_feriados_no_mes: current.input.domingos_feriados_no_mes,
      usar_salario_sindicato_para_he: current.input.usar_salario_sindicato_para_HE,
      horas_extras_semanais: current.input.horas_extras_semanais,
      horas_extras_sabado: current.input.horas_extras_sabado,
      horas_extras_100: current.input.horas_extras_100,
      horas_negativas: current.input.horas_negativas,
      faltas: current.input.faltas,
      atestados: current.input.atestados,
      semanas_com_falta: current.input.semanas_com_falta,
      bonificacao_meta: current.input.bonificacao_meta,
      bonificacao_assiduidade: current.input.bonificacao_assiduidade,
      desconto_marmita: current.input.desconto_marmita,
      desconto_vale: current.input.desconto_vale,
      desconto_emprestimo: current.input.desconto_emprestimo,
      outros_descontos: current.input.outros_descontos,
      base_dia: result.base_dia,
      base_hora: result.base_hora,
      he_semanal: result.HE_semanal,
      he_sabado: result.HE_sabado,
      he_100: result.HE_100,
      total_he: result.total_HE,
      dsr_he: result.DSR_HE,
      valor_atestados: result.valor_atestados,
      desconto_faltas: result.desconto_faltas,
      desconto_horas_negativas: result.desconto_horas_negativas,
      dsr_perdido: result.dsr_perdido,
      total_bonificacoes: result.total_bonificacoes,
      total_descontos: result.total_descontos,
      salario_final: result.salario_final,
    };

    const { error } = await supabase.from("folhas_pagamento").upsert([row], {
      onConflict: "funcionario_id,mes,ano",
    });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Folha de ${current.nome} salva com sucesso` });
      setFuncionarios((prev) =>
        prev.map((f) =>
          f.id === selectedFuncId ? { ...f, result, saved: true } : f
        )
      );
    }
    setSaving(false);
  };

  const handleImportPonto = useCallback((data: Map<string, { faltas: number; heSemanais: number }>) => {
    const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");
    setFuncionarios((prev) =>
      prev.map((f) => {
        const ponto = data.get(normalizeCpf(f.cpf));
        if (!ponto) return f;
        return {
          ...f,
          input: {
            ...f.input,
            faltas: ponto.faltas,
            horas_extras_semanais: Math.round(ponto.heSemanais * 10) / 10,
          },
          result: null,
          saved: false,
        };
      })
    );
  }, []);

  const anos = [ano - 1, ano, ano + 1];
  const calculatedCount = funcionarios.filter((f) => f.result !== null).length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Folha Salarial</h1>
          <p className="text-sm text-muted-foreground">Cálculo individual por funcionário</p>
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

        {/* Importar Ponto */}
        {!loading && funcionarios.length > 0 && !showResumo && !selectedFuncId && (
          <ImportarPontoPDF
            funcionariosCpfs={funcionarios.map((f, i) => ({ cpf: f.cpf, idx: i }))}
            onImport={handleImportPonto}
          />
        )}

        {/* Loading */}
        {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando funcionários...</p>}

        {/* Sem funcionários */}
        {!loading && selectedObraId && funcionarios.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum funcionário ativo nesta obra.</CardContent></Card>
        )}

        {/* Lista de funcionários OU formulário individual */}
        {!loading && funcionarios.length > 0 && !showResumo && (
          <>
            {!selectedFuncId ? (
              <>
                <FuncionariosList
                  funcionarios={funcionarios.map((f) => ({
                    id: f.id,
                    nome: f.nome,
                    cpf: f.cpf,
                    cargo: f.cargo,
                    salario_base: f.salario_base,
                    hasSaved: f.saved,
                    hasCalculated: f.result !== null,
                  }))}
                  onSelect={setSelectedFuncId}
                  selectedId={selectedFuncId}
                />
                {calculatedCount === funcionarios.length && calculatedCount > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => setShowResumo(true)} variant="secondary" className="gap-2">
                      <FileText className="h-4 w-4" /> Ver Resumo da Obra
                    </Button>
                  </div>
                )}
              </>
            ) : current && (
              <div className="space-y-4">
                {/* Header do funcionário selecionado */}
                <Card>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFuncId(null)}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à Lista
                    </Button>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{current.nome}</p>
                      <p className="text-xs text-muted-foreground">{current.cargo}</p>
                    </div>
                    <div className="w-[120px] text-right">
                      {current.saved && (
                        <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded">Salvo ✓</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Formulário */}
                <FolhaInputForm data={current.input} onChange={handleInputChange} />

                {/* Ações */}
                <div className="flex flex-wrap gap-3 justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCalc} className="gap-2">
                      <Calculator className="h-4 w-4" /> Calcular
                    </Button>
                    {current.result && (
                      <Button variant="secondary" onClick={handleSaveIndividual} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? "Salvando..." : "Salvar Rascunho"}
                      </Button>
                    )}
                  </div>
                  <Button onClick={handleFechamentoMensal} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle className="h-4 w-4" />
                    {saving ? "Fechando..." : "Fechamento Mensal"}
                  </Button>
                </div>

                {/* Resultado individual */}
                {current.result && <FolhaResultado result={current.result} />}
              </div>
            )}
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
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
