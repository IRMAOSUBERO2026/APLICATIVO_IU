import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HardHat,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  Shield,
  ChevronRight,
  MapPin,
  Clock,
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
import { useNavigate } from "react-router-dom";
import { differenceInDays, addYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashStats {
  obrasAtivas: number;
  obrasConcluidas: number;
  funcAtivos: number;
  empresas: { nome: string; obras: number; func: number }[];
  obrasDetalhe: { nome: string; codigo: string; empresa: string; qtdFunc: number; status: string }[];
  alertasVencimento: { nome: string; tipo: string; diasRestantes: number }[];
  funcPorObra: { name: string; value: number }[];
}

const PIE_COLORS = [
  "hsl(100, 45%, 35%)",
  "hsl(200, 60%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 45%, 50%)",
  "hsl(0, 65%, 50%)",
  "hsl(170, 50%, 40%)",
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [obrasRes, funcRes, empRes, funcObraRes, funcExamesRes] = await Promise.all([
        supabase.from("obras").select("id, nome, codigo, status, empresa_id, data_inicio, data_previsao_fim, empresas(nome_fantasia, razao_social)"),
        supabase.from("funcionarios").select("id, nome, status, empresa_id, obra_id, data_aso, data_nr6, data_nr12, data_nr18, data_nr35").eq("status", "ativo"),
        supabase.from("empresas").select("id, nome_fantasia, razao_social").eq("ativo", true),
        supabase.from("funcionarios").select("obra_id, obras(nome, codigo)").eq("status", "ativo").not("obra_id", "is", null),
        supabase.from("funcionarios").select("nome, data_aso, data_nr6, data_nr12, data_nr18, data_nr35").eq("status", "ativo"),
      ]);

      const obras = (obrasRes.data || []) as any[];
      const funcs = (funcRes.data || []) as any[];
      const empresas = (empRes.data || []) as any[];
      const funcExames = (funcExamesRes.data || []) as any[];

      const obrasAtivas = obras.filter(o => o.status === "em_andamento");
      const obrasConcluidas = obras.filter(o => o.status === "concluida");

      // Empresas summary
      const empSummary = empresas.map(e => ({
        nome: e.nome_fantasia || e.razao_social,
        obras: obrasAtivas.filter(o => o.empresa_id === e.id).length,
        func: funcs.filter(f => f.empresa_id === e.id).length,
      })).sort((a, b) => b.func - a.func);

      // Obras detail
      const obrasDetalhe = obrasAtivas.map(o => {
        const emp = o.empresas as any;
        return {
          nome: o.nome,
          codigo: o.codigo,
          empresa: emp?.nome_fantasia || emp?.razao_social || "—",
          qtdFunc: funcs.filter(f => f.obra_id === o.id).length,
          status: o.status,
        };
      }).sort((a, b) => b.qtdFunc - a.qtdFunc);

      // Func por obra (pie chart)
      const funcPorObra = obrasDetalhe.map(o => ({ name: o.nome, value: o.qtdFunc })).filter(o => o.value > 0);

      // Alertas de vencimento
      const alertas: DashStats["alertasVencimento"] = [];
      const checkVenc = (nome: string, data: string | null, anos: number, tipo: string) => {
        if (!data) return;
        const venc = addYears(new Date(data), anos);
        const dias = differenceInDays(venc, new Date());
        if (dias <= 30) {
          alertas.push({ nome, tipo, diasRestantes: dias });
        }
      };
      funcExames.forEach((f: any) => {
        checkVenc(f.nome, f.data_aso, 1, "ASO");
        checkVenc(f.nome, f.data_nr6, 1, "NR6");
        checkVenc(f.nome, f.data_nr12, 2, "NR12");
        checkVenc(f.nome, f.data_nr18, 2, "NR18");
        checkVenc(f.nome, f.data_nr35, 2, "NR35");
      });
      alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);

      setStats({
        obrasAtivas: obrasAtivas.length,
        obrasConcluidas: obrasConcluidas.length,
        funcAtivos: funcs.length,
        empresas: empSummary,
        obrasDetalhe,
        alertasVencimento: alertas,
        funcPorObra,
      });
      setLoading(false);
    }
    load();
  }, []);

  const hoje = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!stats) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground capitalize mt-1">
              <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              {hoje}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICardNew
            title="Obras Ativas"
            value={stats.obrasAtivas}
            subtitle={`${stats.obrasConcluidas} concluídas`}
            icon={<HardHat className="h-5 w-5" />}
            color="primary"
            onClick={() => navigate("/obras")}
          />
          <KPICardNew
            title="Funcionários"
            value={stats.funcAtivos}
            subtitle="ativos no momento"
            icon={<Users className="h-5 w-5" />}
            color="accent"
            onClick={() => navigate("/rh")}
          />
          <KPICardNew
            title="Empresas"
            value={stats.empresas.length}
            subtitle="ativas no sistema"
            icon={<Building2 className="h-5 w-5" />}
            color="secondary"
            onClick={() => navigate("/empresas")}
          />
          <KPICardNew
            title="Alertas"
            value={stats.alertasVencimento.length}
            subtitle="exames/treinamentos"
            icon={<AlertTriangle className="h-5 w-5" />}
            color={stats.alertasVencimento.length > 0 ? "warning" : "success"}
            onClick={() => navigate("/rh")}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Bar chart - Func por obra */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Funcionários por Obra
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.funcPorObra} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => [`${v} funcionários`, "Total"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie chart - Distribuição */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Distribuição por Obra
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-2 sm:p-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.funcPorObra}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {stats.funcPorObra.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}`, "Func."]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-2 space-y-1.5">
                {stats.funcPorObra.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate text-muted-foreground flex-1">{item.name}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom section */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Obras ativas */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HardHat className="h-4 w-4 text-primary" />
                Obras em Andamento
              </CardTitle>
              <button
                onClick={() => navigate("/obras")}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Ver todas <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {stats.obrasDetalhe.map((obra) => (
                  <div
                    key={obra.codigo}
                    className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => navigate("/obras")}
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <HardHat className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{obra.nome}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{obra.codigo}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {obra.empresa}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">{obra.qtdFunc}</div>
                      <div className="text-[10px] text-muted-foreground">func.</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alertas de vencimento */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-warning" />
                Alertas de Vencimento
              </CardTitle>
              <button
                onClick={() => navigate("/rh")}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Ver RH <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {stats.alertasVencimento.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-medium text-success">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhum exame ou treinamento próximo do vencimento</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
                  {stats.alertasVencimento.slice(0, 10).map((a, i) => (
                    <div key={`${a.nome}-${a.tipo}-${i}`} className="flex items-center gap-3 px-4 sm:px-6 py-2.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        a.diasRestantes < 0 ? "bg-destructive/10" : "bg-warning/10"
                      }`}>
                        <AlertTriangle className={`h-3.5 w-3.5 ${
                          a.diasRestantes < 0 ? "text-destructive" : "text-warning"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{a.tipo}</p>
                      </div>
                      <Badge
                        variant={a.diasRestantes < 0 ? "destructive" : "outline"}
                        className="text-[10px] shrink-0"
                      >
                        {a.diasRestantes < 0 ? `Vencido ${Math.abs(a.diasRestantes)}d` : `${a.diasRestantes}d`}
                      </Badge>
                    </div>
                  ))}
                  {stats.alertasVencimento.length > 10 && (
                    <div className="py-2 text-center text-[10px] text-muted-foreground">
                      +{stats.alertasVencimento.length - 10} alertas
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empresas summary */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Resumo por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {stats.empresas.map((emp) => (
                <div key={emp.nome} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                  <p className="text-xs font-semibold truncate">{emp.nome}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-xl font-bold">{emp.obras}</p>
                      <p className="text-[10px] text-muted-foreground">obras ativas</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <p className="text-xl font-bold">{emp.func}</p>
                      <p className="text-[10px] text-muted-foreground">funcionários</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

/* ─── Premium KPI Card ──────────────────────────────────────────── */
function KPICardNew({
  title, value, subtitle, icon, color, onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  color: "primary" | "accent" | "secondary" | "warning" | "success";
  onClick?: () => void;
}) {
  const bgMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    secondary: "bg-muted text-muted-foreground",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  };

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${bgMap[color]} transition-transform group-hover:scale-110`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
