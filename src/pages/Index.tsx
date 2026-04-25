import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEmpresaObra } from "@/contexts/EmpresaObraContext";
import {
  DollarSign, TrendingUp, HardHat, Users, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = [
  "hsl(100, 35%, 28%)",
  "hsl(100, 45%, 40%)",
  "hsl(0, 0%, 20%)",
  "hsl(38, 92%, 50%)",
];

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtBRL(v);
};
const pctChange = (atual: number, anterior: number) => {
  if (anterior === 0) return atual === 0 ? "—" : "+100%";
  const p = ((atual - anterior) / Math.abs(anterior)) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(0)}% vs mês anterior`;
};

const MES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function Dashboard() {
  const { kpis, faturamentoSerie, margemPorObra, obrasAndamento, loading } = useDashboardData();
  const { empresaAtual, obraAtual } = useEmpresaObra();
  const hoje = new Date();
  const periodo = `${MES_PT[hoje.getMonth()]} ${hoje.getFullYear()}`;

  const escopo = obraAtual
    ? `${obraAtual.codigo} — ${obraAtual.nome}`
    : empresaAtual
      ? (empresaAtual.nome_fantasia || empresaAtual.razao_social)
      : "Todas as empresas";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
            <p className="text-sm text-muted-foreground">{escopo} — {periodo}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard
            title="Faturamento"
            value={fmtCompact(kpis.faturamentoMes)}
            change={pctChange(kpis.faturamentoMes, kpis.faturamentoMesAnterior)}
            changeType={kpis.faturamentoMes >= kpis.faturamentoMesAnterior ? "positive" : "negative"}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            title="Custos Totais"
            value={fmtCompact(kpis.custosMes)}
            change={pctChange(kpis.custosMes, kpis.custosMesAnterior)}
            changeType={kpis.custosMes <= kpis.custosMesAnterior ? "positive" : "negative"}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            title="Margem Média"
            value={`${kpis.margemPercentual.toFixed(1)}%`}
            change={`${(kpis.margemPercentual - kpis.margemAnterior >= 0 ? "+" : "")}${(kpis.margemPercentual - kpis.margemAnterior).toFixed(1)}pp`}
            changeType={kpis.margemPercentual >= kpis.margemAnterior ? "positive" : "negative"}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPICard
            title="Obras Ativas"
            value={String(kpis.obrasAtivas)}
            change={kpis.obrasNovasMes > 0 ? `${kpis.obrasNovasMes} nova(s) este mês` : "—"}
            changeType="neutral"
            icon={<HardHat className="h-5 w-5" />}
          />
          <KPICard
            title="Folha Total"
            value={fmtCompact(kpis.folhaTotal)}
            change={`${kpis.totalFuncionarios} funcionários`}
            changeType="neutral"
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            title="Estoque Crítico"
            value={`${kpis.estoqueCritico} itens`}
            change={kpis.estoqueCritico > 0 ? "Ação necessária" : "Tudo ok"}
            changeType={kpis.estoqueCritico > 0 ? "negative" : "positive"}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Faturamento Mensal (últimos 6 meses)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={faturamentoSerie}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 85%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                <Tooltip formatter={(v: number) => [fmtCompact(v), "Faturamento"]} />
                <Bar dataKey="valor" fill="hsl(100, 35%, 28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Margem por Obra (%)</h3>
            {margemPorObra.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Sem dados de medição/custos para calcular margem.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={margemPorObra} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}%`}>
                      {margemPorObra.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {margemPorObra.map((item, i) => (
                    <div key={item.obraId} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                      <span className="ml-auto font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Obras em Andamento</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Obra</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Progresso</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Valor Contrato</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-muted-foreground">Carregando…</td></tr>
                )}
                {!loading && obrasAndamento.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-xs text-muted-foreground">Nenhuma obra ativa no escopo.</td></tr>
                )}
                {obrasAndamento.map((obra) => (
                  <tr key={obra.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{obra.codigo} — {obra.nome}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-success/10 text-success capitalize">
                        {obra.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${obra.progresso}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{obra.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">{fmtCompact(obra.valorContrato)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
