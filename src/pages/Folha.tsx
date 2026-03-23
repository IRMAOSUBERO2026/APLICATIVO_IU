import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FolhaDashboard } from "@/components/folha/FolhaDashboard";
import { FolhaInputForm } from "@/components/folha/FolhaInputForm";
import { FolhaResultado } from "@/components/folha/FolhaResultado";
import { FolhaResumoObra } from "@/components/folha/FolhaResumoObra";
import { FolhaCalculoIndividual } from "@/components/folha/FolhaCalculoIndividual";
import { ImportarPontoPDF } from "@/components/folha/ImportarPontoPDF";
import { FuncionariosList } from "@/components/folha/FuncionariosList";
import { DocumentManager } from "@/components/rh/DocumentManager";
import { calcularFolha, type FolhaInput, type FolhaOutput } from "@/lib/motorFolha";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calculator, Save, FileText, ArrowLeft, CheckCircle } from "lucide-react";
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
  horario_padrao: any;
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

type ViewMode = "dashboard" | "obra" | "funcionario";

export default function Folha() {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("dashboard");
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [selectedObraId, setSelectedObraId] = useState("");
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const [funcionarios, setFuncionarios] = useState<FuncionarioFolha[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [selectedFuncDoc, setSelectedFuncDoc] = useState<{ id: string; nome: string } | null>(null);

  const openDocManager = (id: string, nome: string) => {
    setSelectedFuncDoc({ id, nome });
    setDocManagerOpen(true);
  };

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<{
    obrasResumo: Array<{
      id: string; nome: string; codigo: string;
      totalFuncionarios: number; fechados: number; pendentes: number;
      folhaEstimada: number;
    }>;
    loading: boolean;
  }>({ obrasResumo: [], loading: true });

  // Load obras
  useEffect(() => {
    supabase
      .from("obras")
      .select("id, nome, codigo")
      .eq("status", "em_andamento")
      .order("nome")
      .then(({ data }) => { if (data) setObras(data); });
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (view !== "dashboard" || obras.length === 0) return;
    setDashboardData(prev => ({ ...prev, loading: true }));

    const loadDashboard = async () => {
      const obraIds = obras.map(o => o.id);

      const [funcRes, folhaRes] = await Promise.all([
        supabase
          .from("funcionarios")
          .select("id, obra_id, salario_base, salario_combinado")
          .eq("status", "ativo")
          .in("obra_id", obraIds),
        supabase
          .from("folhas_pagamento")
          .select("funcionario_id, obra_id, salario_final")
          .eq("mes", mes + 1)
          .eq("ano", ano)
          .in("obra_id", obraIds),
      ]);

      const funcs = funcRes.data ?? [];
      const folhas = folhaRes.data ?? [];
      const folhaSet = new Set(folhas.map((f: any) => f.funcionario_id));

      const obrasResumo = obras.map(obra => {
        const obraFuncs = funcs.filter((f: any) => f.obra_id === obra.id);
        const obraFolhas = folhas.filter((f: any) => f.obra_id === obra.id);
        const fechados = obraFuncs.filter((f: any) => folhaSet.has(f.id)).length;
        const pendentes = obraFuncs.length - fechados;

        // Estimated payroll: for closed use actual, for pending use salario_combinado or salario_base
        const folhaFechadaTotal = obraFolhas.reduce((s: number, f: any) => s + Number(f.salario_final), 0);
        const folhaPendenteEstimada = obraFuncs
          .filter((f: any) => !folhaSet.has(f.id))
          .reduce((s: number, f: any) => s + Number(f.salario_combinado ?? f.salario_base), 0);

        return {
          id: obra.id,
          nome: obra.nome,
          codigo: obra.codigo,
          totalFuncionarios: obraFuncs.length,
          fechados,
          pendentes,
          folhaEstimada: folhaFechadaTotal + folhaPendenteEstimada,
        };
      }).filter(o => o.totalFuncionarios > 0);

      setDashboardData({ obrasResumo, loading: false });
    };

    loadDashboard();
  }, [view, obras, mes, ano]);

  // Load funcionários when entering obra view
  useEffect(() => {
    if (!selectedObraId || (view !== "obra" && view !== "funcionario")) { setFuncionarios([]); return; }
    if (view === "funcionario") return; // don't reload when viewing individual
    setLoading(true);
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
            id: f.id, nome: f.nome, cpf: f.cpf, cargo: f.cargo,
            salario_base: f.salario_base, salario_combinado: f.salario_combinado,
            input, result: calcularFolha(input), saved: true,
          };
        }
        const sc = f.salario_combinado ?? f.salario_base;
        return {
          id: f.id, nome: f.nome, cpf: f.cpf, cargo: f.cargo,
          salario_base: f.salario_base, salario_combinado: f.salario_combinado,
          input: makeDefaultInput(f.salario_base, sc, diasMes, domingos),
          result: null, saved: false,
        };
      });
      setFuncionarios(list);
      setLoading(false);
    });
  }, [view, selectedObraId, mes, ano]);

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
      prev.map((f) => f.id === selectedFuncId ? { ...f, result, saved: false } : f)
    );
  };

  const buildRow = (func: FuncionarioFolha, result: FolhaOutput, empresaId: string) => ({
    funcionario_id: func.id,
    obra_id: selectedObraId,
    empresa_id: empresaId,
    mes: mes + 1,
    ano,
    salario_registro: func.input.salario_registro,
    salario_combinado: func.input.salario_combinado,
    dias_do_mes: func.input.dias_do_mes,
    domingos_feriados_no_mes: func.input.domingos_feriados_no_mes,
    usar_salario_sindicato_para_he: func.input.usar_salario_sindicato_para_HE,
    horas_extras_semanais: func.input.horas_extras_semanais,
    horas_extras_sabado: func.input.horas_extras_sabado,
    horas_extras_100: func.input.horas_extras_100,
    horas_negativas: func.input.horas_negativas,
    faltas: func.input.faltas,
    atestados: func.input.atestados,
    semanas_com_falta: func.input.semanas_com_falta,
    bonificacao_meta: func.input.bonificacao_meta,
    bonificacao_assiduidade: func.input.bonificacao_assiduidade,
    desconto_marmita: func.input.desconto_marmita,
    desconto_vale: func.input.desconto_vale,
    desconto_emprestimo: func.input.desconto_emprestimo,
    outros_descontos: func.input.outros_descontos,
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
  });

  const getEmpresaId = async () => {
    const res = await supabase.from("obras").select("empresa_id").eq("id", selectedObraId).single();
    return res.data?.empresa_id;
  };

  const handleFechamentoMensal = async () => {
    if (!current) return;
    const result = calcularFolha(current.input);
    setSaving(true);
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      toast({ title: "Erro ao buscar empresa da obra", variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("folhas_pagamento").upsert(
      [buildRow(current, result, empresaId)],
      { onConflict: "funcionario_id,mes,ano" }
    );
    if (error) {
      toast({ title: "Erro ao fechar mês", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Mês fechado para ${current.nome} com sucesso!` });
      setFuncionarios((prev) =>
        prev.map((f) => f.id === selectedFuncId ? { ...f, result, saved: true } : f)
      );
    }
    setSaving(false);
  };

  const handleSaveIndividual = async () => {
    if (!current) return;
    const result = current.result ?? calcularFolha(current.input);
    setSaving(true);
    const empresaId = await getEmpresaId();
    if (!empresaId) {
      toast({ title: "Erro ao buscar empresa da obra", variant: "destructive" });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("folhas_pagamento").upsert(
      [buildRow(current, result, empresaId)],
      { onConflict: "funcionario_id,mes,ano" }
    );
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Folha de ${current.nome} salva com sucesso` });
      setFuncionarios((prev) =>
        prev.map((f) => f.id === selectedFuncId ? { ...f, result, saved: true } : f)
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

  const handleSelectObra = (obraId: string) => {
    setSelectedObraId(obraId);
    setSelectedFuncId(null);
    setView("obra");
  };

  const handleSelectFunc = (funcId: string) => {
    setSelectedFuncId(funcId);
    setView("funcionario");
  };

  const handleBackToObra = () => {
    setSelectedFuncId(null);
    setView("obra");
  };

  const handleBackToDashboard = () => {
    setSelectedObraId("");
    setSelectedFuncId(null);
    setView("dashboard");
  };

  const anos = [ano - 1, ano, ano + 1];
  const calculatedCount = funcionarios.filter((f) => f.result !== null).length;
  const obraNome = obras.find((o) => o.id === selectedObraId);
  const showResumo = calculatedCount === funcionarios.length && calculatedCount > 0;

  // Dashboard totals
  const totalFuncionarios = dashboardData.obrasResumo.reduce((s, o) => s + o.totalFuncionarios, 0);
  const totalFechados = dashboardData.obrasResumo.reduce((s, o) => s + o.fechados, 0);
  const totalPendentes = dashboardData.obrasResumo.reduce((s, o) => s + o.pendentes, 0);
  const totalFolhaEstimada = dashboardData.obrasResumo.reduce((s, o) => s + o.folhaEstimada, 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Folha Salarial</h1>
            <p className="text-sm text-muted-foreground">
              {view === "dashboard" && "Visão geral de todas as obras"}
              {view === "obra" && `${obraNome?.codigo} — ${obraNome?.nome}`}
              {view === "funcionario" && current && `${current.nome} • ${current.cargo}`}
            </p>
          </div>
          {view !== "dashboard" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={view === "funcionario" ? handleBackToObra : handleBackToDashboard}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {view === "funcionario" ? "Voltar à Obra" : "Voltar ao Painel"}
            </Button>
          )}
        </div>

        {/* Seleção de Período (sempre visível) */}
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* === DASHBOARD === */}
        {view === "dashboard" && (
          dashboardData.loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando dados...</p>
          ) : (
            <FolhaDashboard
              obras={dashboardData.obrasResumo}
              mes={MESES[mes]}
              ano={ano}
              totalObras={dashboardData.obrasResumo.length}
              totalFuncionarios={totalFuncionarios}
              totalFechados={totalFechados}
              totalPendentes={totalPendentes}
              totalFolhaEstimada={totalFolhaEstimada}
              onSelectObra={handleSelectObra}
            />
          )
        )}

        {/* === OBRA VIEW === */}
        {view === "obra" && (
          <>
            {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando funcionários...</p>}

            {!loading && funcionarios.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum funcionário ativo nesta obra.</CardContent></Card>
            )}

            {!loading && funcionarios.length > 0 && (
              <>
                <ImportarPontoPDF
                  funcionariosCpfs={funcionarios.map((f, i) => ({ cpf: f.cpf, idx: i }))}
                  onImport={handleImportPonto}
                />

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
                  onSelect={handleSelectFunc}
                  selectedId={selectedFuncId}
                  onOpenDocuments={openDocManager}
                />

                {showResumo && (
                  <FolhaResumoObra
                    funcionarios={funcionarios.map((f) => ({
                      nome: f.nome,
                      cargo: f.cargo,
                      result: f.result ?? calcularFolha(f.input),
                    }))}
                    obra={obraNome?.nome ?? ""}
                    mes={MESES[mes]}
                    ano={ano}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* === FUNCIONÁRIO VIEW === */}
        {view === "funcionario" && current && (
          <FolhaCalculoIndividual
            funcionario={{
              id: current.id,
              nome: current.nome,
              cpf: current.cpf,
              cargo: current.cargo,
              salario_base: current.salario_base,
              salario_combinado: current.salario_combinado,
            }}
            initialInput={current.input}
            initialResult={current.result}
            isSaved={current.saved}
            mes={MESES[mes]}
            ano={ano}
            saving={saving}
            onInputChange={handleInputChange}
            onFechamento={handleFechamentoMensal}
            onSalvarRascunho={handleSaveIndividual}
            onVoltar={handleBackToObra}
          />
        )}
      </div>

      {selectedFuncDoc && (
        <DocumentManager
          open={docManagerOpen}
          onOpenChange={setDocManagerOpen}
          funcionarioId={selectedFuncDoc.id}
          funcionarioNome={selectedFuncDoc.nome}
        />
      )}
    </AppLayout>
  );
}
