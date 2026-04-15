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
  TrendingDown,
  CalendarDays,
  Shield,
  ChevronRight,
  DollarSign,
  Wallet,
  Receipt,
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
} from "recharts";
import { useNavigate } from "react-router-dom";
import { differenceInDays, addYears, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashStats {
  obrasAtivas: number;
  obrasConcluidas: number;
  funcAtivos: number;
  empresas: { nome: string; obras: number; func: number }[];
  obrasDetalhe: { nome: string; codigo: string; empresa: string; qtdFunc: number }[];
  alertasVencimento: { nome: string; tipo: string; diasRestantes: number }[];
  funcPorObra: { name: string; value: number }[];
  // financeiro
  totalPagar: number;
  totalReceber: number;
  contasAtrasadas: number;
  valorAtrasado: number;
  contasVencendoHoje: number;
  proximasContas: { descricao: string; valor: number; vencimento: string; diasRestantes: number }[];
  medicoesAbertas: number;
  valorMedicoes: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [obrasRes, funcRes, empRes, funcExamesRes, cpRes, crRes, medRes] = await Promise.all([
        supabase.from("obras").select("id, nome, codigo, status, empresa_id, empresas(nome_fantasia, razao_social)"),
        supabase.from("funcionarios").select("id, nome, status, empresa_id, obra_id, data_aso, data_nr6, data_nr12, data_nr18, data_nr35").eq("status", "ativo"),
        supabase.from("empresas").select("id, nome_fantasia, razao_social").eq("ativo", true),
        supabase.from("funcionarios").select("nome, data_aso, data_nr6, data_nr12, data_nr18, data_nr35").eq("status", "ativo"),
        supabase.from("contas_pagar").select("*").eq("status", "pendente").order("data_vencimento"),
        supabase.from("contas_receber").select("*").eq("status", "pendente"),
        supabase.from("medicoes").select("id, valor_bruto, status").in("status", ["rascunho", "enviada"]),
      ]);

      const obras = (obrasRes.data || []) as any[];
      const funcs = (funcRes.data || []) as any[];
      const empresas = (empRes.data || []) as any[];
      const funcExames = (funcExamesRes.data || []) as any[];
      const contasPagar = (cpRes.data || []) as any[];
      const contasReceber = (crRes.data || []) as any[];
      const medicoes = (medRes.data || []) as any[];

      const hoje = new Date();
      const obrasAtivas = obras.filter(o => o.status === "em_andamento");
      const obrasConcluidas = obras.filter(o => o.status === "concluida");

      const empSummary = empresas.map(e => ({
        nome: e.nome_fantasia || e.razao_social,
        obras: obrasAtivas.filter(o => o.empresa_id === e.id).length,
        func: funcs.filter(f => f.empresa_id === e.id).length,
      })).sort((a, b) => b.func - a.func);

      const obrasDetalhe = obrasAtivas.map(o => {
        const emp = o.empresas as any;
        return {
          nome: o.nome,
          codigo: o.codigo,
          empresa: emp?.nome_fantasia || emp?.razao_social || "—",
          qtdFunc: funcs.filter(f => f.obra_id === o.id).length,
        };
      }).sort((a, b) => b.qtdFunc - a.qtdFunc);

      const funcPorObra = obrasDetalhe.map(o => ({ name: o.nome, value: o.qtdFunc })).filter(o => o.value > 0);

      // Alertas vencimento
      const alertas: DashStats["alertasVencimento"] = [];
      const checkVenc = (nome: string, data: string | null, anos: number, tipo: string) => {
        if (!data) return;
        const venc = addYears(new Date(data), anos);
        const dias = differenceInDays(venc, hoje);
        if (dias <= 30) alertas.push({ nome, tipo, diasRestantes: dias });
      };
      funcExames.forEach((f: any) => {
        checkVenc(f.nome, f.data_aso, 1, "ASO");
        checkVenc(f.nome, f.data_nr6, 1, "NR6");
        checkVenc(f.nome, f.data_nr12, 2, "NR12");
        checkVenc(f.nome, f.data_nr18, 2, "NR18");
        checkVenc(f.nome, f.data_nr35, 2, "NR35");
      });
      alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);

      // Financeiro
      const totalPagar = contasPagar.reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
      const totalReceber = contasReceber.reduce((s: number, c: any) => s + Number(c.valor || 0), 0);

      const atrasadas = contasPagar.filter((c: any) => differenceInDays(hoje, parseISO(c.data_vencimento)) > 0);
      const vencendoHoje = contasPagar.filter((c: any) => differenceInDays(hoje, parseISO(c.data_vencimento)) === 0);

      const proximasContas = contasPagar
        .filter((c: any) => differenceInDays(parseISO(c.data_vencimento), hoje) >= 0)
        .slice(0, 5)
        .map((c: any) => ({
          descricao: c.descricao,
          valor: Number(c.valor),
          vencimento: c.data_vencimento,
          diasRestantes: differenceInDays(parseISO(c.data_vencimento), hoje),
        }));

      setStats({
        obrasAtivas: obrasAtivas.length,
        obrasConcluidas: obrasConcluidas.length,
        funcAtivos: funcs.length,
        empresas: empSummary,
        obrasDetalhe,
        alertasVencimento: alertas,
        funcPorObra,
        totalPagar,
        totalReceber,
        contasAtrasadas: atrasadas.length,
        valorAtrasado: atrasadas.reduce((s: number, c: any) => s + Number(c.valor || 0), 0),
        contasVencendoHoje: vencendoHoje.length,
        proximasContas,
        medicoesAbertas: medicoes.length,
        valorMedicoes: medicoes.reduce((s: number, m: any) => s + Number(m.valor_bruto || 0), 0),
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

  const saldo = stats.totalReceber - stats.totalPagar;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize mt-1">
            <CalendarDays className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            {hoje}
          </p>
        </div>

        {/* KPI Row 1 - Operacional */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="Obras Ativas" value={String(stats.obrasAtivas)} subtitle={`${stats.obrasConcluidas} concluídas`} icon={<HardHat className="h-5 w-5" />} color="primary" onClick={() => navigate("/obras")} />
          <KPICard title="Funcionários" value={String(stats.funcAtivos)} subtitle="ativos" icon={<Users className="h-5 w-5" />} color="accent" onClick={() => navigate("/rh")} />
          <KPICard title="Empresas" value={String(stats.empresas.length)} subtitle="ativas" icon={<Building2 className="h-5 w-5" />} color="secondary" onClick={() => navigate("/empresas")} />
          <KPICard title="Alertas" value={String(stats.alertasVencimento.length)} subtitle="vencimentos" icon={<AlertTriangle className="h-5 w-5" />} color={stats.alertasVencimento.length > 0 ? "warning" : "success"} onClick={() => navigate("/rh")} />
        </div>

        {/* KPI Row 2 - Financeiro */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="A Pagar" value={fmt(stats.totalPagar)} icon={<TrendingDown className="h-5 w-5" />} color="warning" onClick={() => navigate("/financeiro")} />
          <KPICard title="A Receber" value={fmt(stats.totalReceber)} icon={<TrendingUp className="h-5 w-5" />} color="success" onClick={() => navigate("/financeiro")} />
          <KPICard title="Saldo Projetado" value={fmt(saldo)} icon={<Wallet className="h-5 w-5" />} color={saldo >= 0 ? "success" : "warning"} onClick={() => navigate("/financeiro")} />
          <KPICard
            title="Atrasadas"
            value={String(stats.contasAtrasadas)}
            subtitle={stats.contasAtrasadas > 0 ? fmt(stats.valorAtrasado) : "nenhuma"}
            icon={<Receipt className="h-5 w-5" />}
            color={stats.contasAtrasadas > 0 ? "warning" : "success"}
            onClick={() => navigate("/financeiro")}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Bar chart */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Funcionários por Obra
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              {stats.funcPorObra.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">Nenhuma obra com funcionários</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.funcPorObra} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} formatter={(v: number) => [`${v} funcionários`, "Total"]} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Próximas contas a pagar */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-warning" />
                Próximos Vencimentos
              </CardTitle>
              <button onClick={() => navigate("/financeiro")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Ver tudo <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {stats.proximasContas.length === 0 ? (
                <div className="py-12 text-center">
                  <DollarSign className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-medium text-success">Nenhuma conta pendente</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.proximasContas.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 sm:px-6 py-2.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        c.diasRestantes === 0 ? "bg-warning/10" : c.diasRestantes <= 3 ? "bg-destructive/5" : "bg-muted"
                      }`}>
                        <Clock className={`h-3.5 w-3.5 ${
                          c.diasRestantes === 0 ? "text-warning" : c.diasRestantes <= 3 ? "text-destructive" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{c.descricao}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(c.vencimento), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold">{fmt(c.valor)}</p>
                        <Badge variant={c.diasRestantes === 0 ? "destructive" : "outline"} className="text-[10px]">
                          {c.diasRestantes === 0 ? "Hoje" : `${c.diasRestantes}d`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Obras ativas */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HardHat className="h-4 w-4 text-primary" />
                Obras em Andamento
              </CardTitle>
              <button onClick={() => navigate("/obras")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Ver todas <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {stats.obrasDetalhe.map((obra) => (
                  <div key={obra.codigo} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => navigate("/obras")}>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <HardHat className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{obra.nome}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{obra.codigo}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />{obra.empresa}
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
              <button onClick={() => navigate("/rh")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Ver RH <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {stats.alertasVencimento.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm font-medium text-success">Tudo em dia!</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
                  {stats.alertasVencimento.slice(0, 8).map((a, i) => (
                    <div key={`${a.nome}-${a.tipo}-${i}`} className="flex items-center gap-3 px-4 sm:px-6 py-2.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${a.diasRestantes < 0 ? "bg-destructive/10" : "bg-warning/10"}`}>
                        <AlertTriangle className={`h-3.5 w-3.5 ${a.diasRestantes < 0 ? "text-destructive" : "text-warning"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{a.tipo}</p>
                      </div>
                      <Badge variant={a.diasRestantes < 0 ? "destructive" : "outline"} className="text-[10px] shrink-0">
                        {a.diasRestantes < 0 ? `Vencido ${Math.abs(a.diasRestantes)}d` : `${a.diasRestantes}d`}
                      </Badge>
                    </div>
                  ))}
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
                      <p className="text-[10px] text-muted-foreground">obras</p>
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

/* ─── KPI Card ──────────────────────────────────────────── */
function KPICard({
  title, value, subtitle, icon, color, onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
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
    <Card className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden" onClick={onClick}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-lg sm:text-xl font-bold truncate">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${bgMap[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
