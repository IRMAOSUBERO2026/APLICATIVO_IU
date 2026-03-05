import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  DollarSign,
  TrendingUp,
  HardHat,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const faturamentoData = [
  { mes: "Jan", valor: 320000 },
  { mes: "Fev", valor: 280000 },
  { mes: "Mar", valor: 410000 },
  { mes: "Abr", valor: 350000 },
  { mes: "Mai", valor: 480000 },
  { mes: "Jun", valor: 520000 },
];

const margemData = [
  { name: "Ed. Aurora", value: 32 },
  { name: "Galpão Ind.", value: 18 },
  { name: "Ponte BR-101", value: 25 },
  { name: "Res. Sol", value: 15 },
];

const COLORS = [
  "hsl(100, 35%, 28%)",
  "hsl(100, 45%, 40%)",
  "hsl(0, 0%, 20%)",
  "hsl(38, 92%, 50%)",
];

const obrasRecentes = [
  { nome: "Edifício Aurora", status: "Em andamento", progresso: 68, valor: "R$ 2.4M" },
  { nome: "Galpão Industrial Alfa", status: "Em andamento", progresso: 45, valor: "R$ 1.1M" },
  { nome: "Ponte BR-101 Km 42", status: "Medição pendente", progresso: 82, valor: "R$ 3.8M" },
  { nome: "Residencial Sol Nascente", status: "Iniciando", progresso: 12, valor: "R$ 890K" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação — Março 2026</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard title="Faturamento" value="R$ 2.36M" change="+12% vs mês anterior" changeType="positive" icon={<DollarSign className="h-5 w-5" />} />
          <KPICard title="Custos Totais" value="R$ 1.78M" change="+8% vs mês anterior" changeType="negative" icon={<TrendingUp className="h-5 w-5" />} />
          <KPICard title="Margem Média" value="24.6%" change="+2.1pp" changeType="positive" icon={<TrendingUp className="h-5 w-5" />} />
          <KPICard title="Obras Ativas" value="4" change="1 nova este mês" changeType="neutral" icon={<HardHat className="h-5 w-5" />} />
          <KPICard title="Folha Total" value="R$ 485K" change="142 funcionários" changeType="neutral" icon={<Users className="h-5 w-5" />} />
          <KPICard title="Estoque Crítico" value="7 itens" change="Ação necessária" changeType="negative" icon={<AlertTriangle className="h-5 w-5" />} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Faturamento Mensal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={faturamentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 85%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip formatter={(v: number) => [`R$ ${(v / 1000).toFixed(0)}K`, "Valor"]} />
                <Bar dataKey="valor" fill="hsl(100, 35%, 28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Margem por Obra (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={margemData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}%`}>
                  {margemData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {margemData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="ml-auto font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
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
                {obrasRecentes.map((obra) => (
                  <tr key={obra.nome} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{obra.nome}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        obra.status === "Em andamento" ? "bg-success/10 text-success"
                        : obra.status === "Medição pendente" ? "bg-warning/10 text-warning"
                        : "bg-accent/10 text-accent"
                      }`}>{obra.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${obra.progresso}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{obra.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">{obra.valor}</td>
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
