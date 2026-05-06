import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, FileText, Users, DollarSign } from "lucide-react";
import { ordenarItensContrato } from "@/lib/sortItens";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props { obraId: string; empresaId: string; status: string; }

interface Alert {
  type: "warning" | "info" | "danger";
  icon: any;
  message: string;
}

export default function ObraAndamento({ obraId, empresaId, status }: Props) {
  const [contratoItens, setContratoItens] = useState<any[]>([]);
  const [medicoesItens, setMedicoesItens] = useState<any[]>([]);
  const [medicoesPendentes, setMedicoesPendentes] = useState(0);
  const [funcionariosCount, setFuncionariosCount] = useState(0);
  const [custoReal, setCustoReal] = useState(0);

  useEffect(() => { load(); }, [obraId]);

  const load = async () => {
    const [itensRes, medItensRes, medPendRes, funcRes, cpRes] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("id,quantidade,valor_unitario,valor_total").eq("obra_id", obraId),
      supabase.from("medicao_boletim_itens").select("contrato_item_id,quantidade_medida,valor_medido,medicao_id").in(
        "contrato_item_id",
        (await supabase.from("medicao_contrato_itens").select("id").eq("obra_id", obraId)).data?.map((i: any) => i.id) || []
      ),
      supabase.from("medicoes").select("id", { count: "exact", head: true }).eq("obra_id", obraId).eq("status", "rascunho"),
      supabase.from("funcionarios").select("id", { count: "exact", head: true }).eq("obra_id", obraId).eq("status", "ativo"),
      supabase.from("contas_pagar").select("valor").eq("obra_id", obraId),
    ]);
    if (itensRes.data) setContratoItens(itensRes.data);
    if (medItensRes.data) setMedicoesItens(medItensRes.data);
    setMedicoesPendentes(medPendRes.count || 0);
    setFuncionariosCount(funcRes.count || 0);
    if (cpRes.data) setCustoReal(cpRes.data.reduce((s: number, c: any) => s + (c.valor || 0), 0));
  };

  const valorContrato = useMemo(() => contratoItens.reduce((s, i) => s + (i.valor_total || i.quantidade * i.valor_unitario), 0), [contratoItens]);
  const valorMedido = useMemo(() => medicoesItens.reduce((s: number, i: any) => s + (i.valor_medido || 0), 0), [medicoesItens]);
  const percentualExecucao = valorContrato > 0 ? Math.min(100, (valorMedido / valorContrato) * 100) : 0;

  // Alerts
  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = [];
    if (["prospeccao", "orcamento", "proposta_enviada", "negociacao"].includes(status) && contratoItens.length === 0) {
      list.push({ type: "info", icon: FileText, message: "Obra sem planilha de contrato definida" });
    }
    if (status === "paralisada") {
      list.push({ type: "danger", icon: AlertTriangle, message: "Obra paralisada — verificar situação" });
    }
    if (custoReal > valorContrato && valorContrato > 0) {
      list.push({ type: "danger", icon: DollarSign, message: `Custo real (${fmtBRL(custoReal)}) acima do contratado (${fmtBRL(valorContrato)})` });
    }
    if (medicoesPendentes > 0) {
      list.push({ type: "warning", icon: Clock, message: `${medicoesPendentes} medição(ões) pendente(s) de emissão` });
    }
    if (["em_execucao", "contrato_fechado"].includes(status) && funcionariosCount === 0) {
      list.push({ type: "warning", icon: Users, message: "Nenhum funcionário alocado nesta obra" });
    }
    return list;
  }, [status, contratoItens, custoReal, valorContrato, medicoesPendentes, funcionariosCount]);

  // Etapas concluídas
  const etapas = useMemo(() => {
    const map: Record<string, { total: number; medido: number }> = {};
    for (const item of contratoItens) {
      const medidos = medicoesItens.filter((m: any) => m.contrato_item_id === item.id);
      const totalMedido = medidos.reduce((s: number, m: any) => s + (m.valor_medido || 0), 0);
      map[item.id] = { total: item.valor_total || item.quantidade * item.valor_unitario, medido: totalMedido };
    }
    return map;
  }, [contratoItens, medicoesItens]);

  const etapasConcluidas = Object.values(etapas).filter(e => e.total > 0 && e.medido >= e.total * 0.99).length;

  return (
    <div className="space-y-4">
      {/* Progress overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase font-medium">Execução Geral</span>
              <span className="text-lg font-bold text-primary">{percentualExecucao.toFixed(1)}%</span>
            </div>
            <Progress value={percentualExecucao} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Medido: {fmtBRL(valorMedido)}</span>
              <span>Contrato: {fmtBRL(valorContrato)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase font-medium">Etapas</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold">{etapasConcluidas}</span>
              <span className="text-sm text-muted-foreground">/ {contratoItens.length} concluídas</span>
            </div>
            {contratoItens.length > 0 && (
              <Progress value={(etapasConcluidas / contratoItens.length) * 100} className="h-2 mt-2" />
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground uppercase font-medium">Resultado Parcial</span>
            <div className="mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Receita (medido):</span>
                <span className="font-medium text-green-600">{fmtBRL(valorMedido)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Custos reais:</span>
                <span className="font-medium text-red-600">{fmtBRL(custoReal)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1 pt-1 border-t">
                <span className="font-medium">Resultado:</span>
                <span className={`font-bold ${valorMedido - custoReal >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fmtBRL(valorMedido - custoReal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Alertas</h3>
          {alerts.map((alert, idx) => (
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
              alert.type === "danger" ? "bg-red-500/5 border-red-200 text-red-700" :
              alert.type === "warning" ? "bg-yellow-500/5 border-yellow-200 text-yellow-700" :
              "bg-blue-500/5 border-blue-200 text-blue-700"
            }`}>
              <alert.icon className="h-4 w-4 flex-shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Etapas detail */}
      {contratoItens.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Progresso por Etapa</h3>
          <div className="space-y-1">
            {contratoItens.map((item: any) => {
              const e = etapas[item.id];
              const pct = e && e.total > 0 ? Math.min(100, (e.medido / e.total) * 100) : 0;
              return (
                <div key={item.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-8 text-right">
                    {pct >= 99 ? <CheckCircle className="h-4 w-4 text-green-500 ml-auto" /> :
                      <span className="text-xs font-mono text-muted-foreground">{pct.toFixed(0)}%</span>
                    }
                  </div>
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {fmtBRL(e?.medido || 0)} / {fmtBRL(e?.total || 0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
