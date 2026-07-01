import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Shield, Wrench, Stethoscope } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ObraRow { id: string; nome: string; codigo: string; empresa_id: string; }
interface EmpresaRow { id: string; nome_fantasia: string | null; razao_social: string; }

interface CustoObra {
  obra_id: string;
  obra_nome: string;
  obra_codigo: string;
  salarios: number;
  epiUniformes: number;
  ferramentasEquipamentos: number;
  exames: number;
  total: number;
}

export default function CustosObra() {
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [empresaFilter, setEmpresaFilter] = useState("todas");
  const [loading, setLoading] = useState(true);
  const [custos, setCustos] = useState<CustoObra[]>([]);

  useEffect(() => {
    loadBase();
  }, []);

  const loadBase = async () => {
    const [empRes, obraRes] = await Promise.all([
      supabase.from("empresas").select("id, razao_social, nome_fantasia").eq("ativo", true),
      supabase.from("obras").select("id, nome, codigo, empresa_id"),
    ]);
    if (empRes.data) setEmpresas(empRes.data);
    if (obraRes.data) {
      setObras(obraRes.data);
      await loadCustos(obraRes.data);
    }
    setLoading(false);
  };

  const loadCustos = async (obrasList: ObraRow[]) => {
    const obraIds = obrasList.map((o) => o.id);
    if (obraIds.length === 0) return;

    const [folhaRes, epiRes, equipLocRes, equipPropRes, exameRes] = await Promise.all([
      supabase.from("folhas_pagamento").select("obra_id, custo_total_empresa").in("obra_id", obraIds),
      supabase.from("contas_pagar").select("obra_id, valor, categoria").in("obra_id", obraIds),
      supabase.from("equipamentos_locados").select("obra_id, valor_mensal, valor_diario, tipo_contrato").in("obra_id", obraIds),
      supabase.from("equipamentos_proprios").select("obra_id, valor_aquisicao").in("obra_id", obraIds),
      supabase.from("solicitacoes_exame").select("funcionario_id, valor, status"),
    ]);

    // Map funcionario -> obra
    const funcRes = await supabase.from("funcionarios").select("id, obra_id").in("obra_id", obraIds);
    const funcObraMap: Record<string, string> = {};
    funcRes.data?.forEach((f: any) => { if (f.obra_id) funcObraMap[f.id] = f.obra_id; });

    const map: Record<string, CustoObra> = {};
    for (const o of obrasList) {
      map[o.id] = {
        obra_id: o.id,
        obra_nome: o.nome,
        obra_codigo: o.codigo,
        salarios: 0,
        epiUniformes: 0,
        ferramentasEquipamentos: 0,
        exames: 0,
        total: 0,
      };
    }

    // Salários from folha
    folhaRes.data?.forEach((f: any) => {
      if (map[f.obra_id]) map[f.obra_id].salarios += Number(f.custo_total_empresa || 0);
    });

    // EPI from contas_pagar with EPI-related categories
    const epiKeywords = ["epi", "uniforme", "vestimenta", "bota", "capacete", "luva"];
    const equipKeywords = ["ferramenta", "equipamento", "máquina", "maquina", "locação", "locacao"];
    epiRes.data?.forEach((c: any) => {
      if (!map[c.obra_id]) return;
      const cat = (c.categoria || "").toLowerCase();
      if (epiKeywords.some((k) => cat.includes(k))) {
        map[c.obra_id].epiUniformes += Number(c.valor || 0);
      } else if (equipKeywords.some((k) => cat.includes(k))) {
        map[c.obra_id].ferramentasEquipamentos += Number(c.valor || 0);
      }
    });

    // Equipamentos locados
    equipLocRes.data?.forEach((e: any) => {
      if (!e.obra_id || !map[e.obra_id]) return;
      map[e.obra_id].ferramentasEquipamentos += Number(e.valor_mensal || 0);
    });

    // Equipamentos próprios
    equipPropRes.data?.forEach((e: any) => {
      if (!e.obra_id || !map[e.obra_id]) return;
      map[e.obra_id].ferramentasEquipamentos += Number(e.valor_aquisicao || 0);
    });

    // Exames
    exameRes.data?.forEach((ex: any) => {
      const obraId = funcObraMap[ex.funcionario_id];
      if (obraId && map[obraId]) {
        map[obraId].exames += Number(ex.valor || 0);
      }
    });

    // Totals
    Object.values(map).forEach((c) => {
      c.total = c.salarios + c.epiUniformes + c.ferramentasEquipamentos + c.exames;
    });

    setCustos(Object.values(map));
  };

  const filtered = useMemo(() => {
    if (empresaFilter === "todas") return custos;
    const empObras = obras.filter((o) => o.empresa_id === empresaFilter).map((o) => o.id);
    return custos.filter((c) => empObras.includes(c.obra_id));
  }, [custos, empresaFilter, obras]);

  const chartData = useMemo(
    () =>
      filtered
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((c) => ({
          nome: c.obra_codigo,
          Salários: c.salarios,
          "EPI/Uniformes": c.epiUniformes,
          "Ferramentas/Equip.": c.ferramentasEquipamentos,
          Exames: c.exames,
        })),
    [filtered]
  );

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, c) => ({
        salarios: acc.salarios + c.salarios,
        epi: acc.epi + c.epiUniformes,
        equip: acc.equip + c.ferramentasEquipamentos,
        exames: acc.exames + c.exames,
        total: acc.total + c.total,
      }),
      { salarios: 0, epi: 0, equip: 0, exames: 0, total: 0 }
    );
  }, [filtered]);

  const kpis = [
    { label: "Salários / Vales", value: totals.salarios, icon: Users, color: "text-blue-600" },
    { label: "EPI / Uniformes", value: totals.epi, icon: Shield, color: "text-emerald-600" },
    { label: "Ferramentas / Equip.", value: totals.equip, icon: Wrench, color: "text-amber-600" },
    { label: "Exames", value: totals.exames, icon: Stethoscope, color: "text-purple-600" },
    { label: "Total Geral", value: totals.total, icon: DollarSign, color: "text-primary" },
  ];

  const COLORS = ["hsl(220,70%,55%)", "hsl(160,50%,45%)", "hsl(38,85%,50%)", "hsl(270,50%,55%)"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Custos por Obra</h1>
            <p className="text-sm text-muted-foreground">
              Comparativo de gastos: Salários, EPI, Equipamentos e Exames
            </p>
          </div>
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome_fantasia || e.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-[11px] font-medium uppercase text-muted-foreground truncate">
                    {kpi.label}
                  </span>
                </div>
                <p className="text-lg font-bold">{fmtBRL(kpi.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Comparativo por Obra</h3>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,85%)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmtBRL(v), name]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Salários" stackId="a" fill={COLORS[0]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="EPI/Uniformes" stackId="a" fill={COLORS[1]} />
                  <Bar dataKey="Ferramentas/Equip." stackId="a" fill={COLORS[2]} />
                  <Bar dataKey="Exames" stackId="a" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Salários</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">EPI/Unif.</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Equip.</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Exames</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .sort((a, b) => b.total - a.total)
                    .map((c) => (
                      <tr key={c.obra_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium">{c.obra_nome}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {c.obra_codigo}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(c.salarios)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(c.epiUniformes)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(c.ferramentasEquipamentos)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(c.exames)}</td>
                        <td className="px-4 py-3 text-right font-bold">{fmtBRL(c.total)}</td>
                      </tr>
                    ))}
                  {filtered.length > 1 && (
                    <tr className="bg-muted/50 font-bold">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(totals.salarios)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(totals.epi)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(totals.equip)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtBRL(totals.exames)}</td>
                      <td className="px-4 py-3 text-right">{fmtBRL(totals.total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Carregando dados...
          </div>
        )}
      </div>
    </AppLayout>
  );
}
