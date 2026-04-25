import { AppLayout } from "@/components/layout/AppLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEmpresaObra } from "@/contexts/EmpresaObraContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, HardHat, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Activity, Clock, ShoppingCart, FileText,
  Wallet, Calendar, ChevronRight, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

/* ───────── helpers ───────── */
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtBRL(v);
};
const pctDelta = (a: number, b: number) => {
  if (b === 0) return a === 0 ? 0 : 100;
  return ((a - b) / Math.abs(b)) * 100;
};
const MES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/* ───────── KPI Hero ───────── */
interface HeroProps {
  label: string;
  value: string;
  delta: number;
  deltaLabel?: string;
  invertColor?: boolean; // p/ custos: subir = ruim
  icon: React.ReactNode;
  series?: number[];
  accent?: "primary" | "success" | "warning" | "destructive";
}
function KpiHero({ label, value, delta, deltaLabel, invertColor, icon, series, accent = "primary" }: HeroProps) {
  const positiveGood = invertColor ? delta <= 0 : delta >= 0;
  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };
  const data = (series || []).map((v, i) => ({ i, v }));

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight leading-tight">{value}</p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${
              positiveGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}>
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
            {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
          </div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          {icon}
        </div>
      </div>
      {data.length > 1 && (
        <div className="mt-3 -mx-1 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#g-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ───────── Tipos auxiliares ───────── */
interface FluxoPonto { dia: string; entrada: number; saida: number; saldo: number; }
interface AlertaItem { id: string; tipo: "atraso" | "estoque" | "exame" | "vencimento"; titulo: string; descricao: string; link: string; severidade: "alta" | "media" | "baixa"; }
interface AtividadeItem { id: string; tipo: string; titulo: string; quando: string; }

/* ───────── Página ───────── */
export default function Dashboard() {
  const { kpis, faturamentoSerie, obrasAndamento, loading } = useDashboardData();
  const { empresaAtual, obraAtual, empresaId, obraId } = useEmpresaObra();
  const [fluxo, setFluxo] = useState<FluxoPonto[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [atividades, setAtividades] = useState<AtividadeItem[]>([]);
  const [contasReceber30d, setContasReceber30d] = useState(0);
  const [contasPagar30d, setContasPagar30d] = useState(0);

  const hoje = new Date();
  const periodo = `${MES_PT[hoje.getMonth()]} ${hoje.getFullYear()}`;
  const escopo = obraAtual
    ? `${obraAtual.codigo} — ${obraAtual.nome}`
    : empresaAtual
      ? (empresaAtual.nome_fantasia || empresaAtual.razao_social)
      : "Visão consolidada";

  /* Fluxo de caixa próximos 30 dias + alertas + atividades */
  useEffect(() => {
    let cancel = false;
    (async () => {
      const ini = new Date(); ini.setHours(0,0,0,0);
      const fim = new Date(); fim.setDate(fim.getDate() + 30);
      const iniStr = ini.toISOString().slice(0,10);
      const fimStr = fim.toISOString().slice(0,10);

      const filtroEmp = (q: any) => empresaId ? q.eq("empresa_id", empresaId) : q;
      const filtroObra = (q: any) => obraId ? q.eq("obra_id", obraId) : q;

      let crQ = supabase.from("contas_receber").select("data_vencimento, valor, status").gte("data_vencimento", iniStr).lte("data_vencimento", fimStr);
      crQ = filtroEmp(crQ); crQ = filtroObra(crQ);
      let cpQ = supabase.from("contas_pagar").select("data_vencimento, valor, status").gte("data_vencimento", iniStr).lte("data_vencimento", fimStr);
      cpQ = filtroEmp(cpQ); cpQ = filtroObra(cpQ);

      const [{ data: cr }, { data: cp }] = await Promise.all([crQ, cpQ]);

      // agrupar por dia
      const mapa = new Map<string, { entrada: number; saida: number }>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        mapa.set(d.toISOString().slice(0,10), { entrada: 0, saida: 0 });
      }
      let totCR = 0, totCP = 0;
      (cr || []).forEach((r: any) => {
        if (r.status === "pago" || r.status === "recebido") return;
        const k = String(r.data_vencimento);
        if (mapa.has(k)) mapa.get(k)!.entrada += Number(r.valor || 0);
        totCR += Number(r.valor || 0);
      });
      (cp || []).forEach((r: any) => {
        if (r.status === "pago") return;
        const k = String(r.data_vencimento);
        if (mapa.has(k)) mapa.get(k)!.saida += Number(r.valor || 0);
        totCP += Number(r.valor || 0);
      });

      let saldoAcum = 0;
      const serie: FluxoPonto[] = Array.from(mapa.entries()).map(([k, v]) => {
        saldoAcum += v.entrada - v.saida;
        const dt = new Date(k);
        return {
          dia: `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}`,
          entrada: v.entrada, saida: v.saida, saldo: saldoAcum,
        };
      });

      // Alertas operacionais
      const alerts: AlertaItem[] = [];
      // contas atrasadas
      let atrCpQ = supabase.from("contas_pagar").select("id, descricao, valor, data_vencimento, status").lt("data_vencimento", iniStr).neq("status", "pago").limit(5);
      atrCpQ = filtroEmp(atrCpQ); atrCpQ = filtroObra(atrCpQ);
      const { data: atrCp } = await atrCpQ;
      (atrCp || []).forEach((c: any) => {
        const dias = Math.floor((Date.now() - new Date(c.data_vencimento).getTime()) / 86400000);
        alerts.push({
          id: `cp-${c.id}`, tipo: "atraso",
          titulo: c.descricao,
          descricao: `${fmtCompact(c.valor)} • ${dias}d atrasada`,
          link: "/financeiro", severidade: dias > 15 ? "alta" : "media",
        });
      });

      // exames vencendo (ASO em 30d)
      const dataLimiteAso = new Date(); dataLimiteAso.setDate(dataLimiteAso.getDate() + 30);
      let asoQ = supabase.from("funcionarios").select("id, nome, data_aso").eq("status", "ativo").not("data_aso", "is", null).lte("data_aso", dataLimiteAso.toISOString().slice(0,10)).limit(5);
      asoQ = filtroEmp(asoQ); asoQ = filtroObra(asoQ);
      const { data: ascos } = await asoQ;
      (ascos || []).forEach((f: any) => {
        const dias = Math.floor((new Date(f.data_aso).getTime() - Date.now()) / 86400000);
        alerts.push({
          id: `aso-${f.id}`, tipo: "exame",
          titulo: `ASO de ${f.nome}`,
          descricao: dias < 0 ? `Vencido há ${Math.abs(dias)}d` : `Vence em ${dias}d`,
          link: "/rh", severidade: dias < 0 ? "alta" : dias < 15 ? "media" : "baixa",
        });
      });

      // Atividade recente
      const atvs: AtividadeItem[] = [];
      const [{ data: lastDiarios }, { data: lastCompras }, { data: lastMedicoes }] = await Promise.all([
        filtroObra(filtroEmp(supabase.from("diarios_obra").select("id, data, obra_id, responsavel").order("created_at", { ascending: false }).limit(3))),
        filtroObra(filtroEmp(supabase.from("compras").select("id, numero, total, created_at").order("created_at", { ascending: false }).limit(3))),
        filtroObra(filtroEmp(supabase.from("medicoes").select("id, numero, valor_liquido, created_at").order("created_at", { ascending: false }).limit(3))),
      ]);
      (lastDiarios || []).forEach((d: any) => atvs.push({ id: `d-${d.id}`, tipo: "Diário", titulo: `Diário registrado por ${d.responsavel || "—"}`, quando: String(d.data) }));
      (lastCompras || []).forEach((c: any) => atvs.push({ id: `c-${c.id}`, tipo: "Compra", titulo: `NF #${c.numero} — ${fmtCompact(c.total)}`, quando: String(c.created_at).slice(0,10) }));
      (lastMedicoes || []).forEach((m: any) => atvs.push({ id: `m-${m.id}`, tipo: "Medição", titulo: `Medição #${m.numero} — ${fmtCompact(m.valor_liquido)}`, quando: String(m.created_at).slice(0,10) }));
      atvs.sort((a,b) => b.quando.localeCompare(a.quando));

      if (cancel) return;
      setFluxo(serie);
      setAlertas(alerts.sort((a, b) => {
        const order = { alta: 0, media: 1, baixa: 2 };
        return order[a.severidade] - order[b.severidade];
      }));
      setAtividades(atvs.slice(0, 6));
      setContasReceber30d(totCR);
      setContasPagar30d(totCP);
    })();
    return () => { cancel = true; };
  }, [empresaId, obraId]);

  const saldoLiquido30d = contasReceber30d - contasPagar30d;
  const sparkFat = faturamentoSerie.map(p => p.valor);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ─── Header com escopo ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Centro de Comando</span>
              <span>•</span>
              <span>{periodo}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{escopo}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-success font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Dados em tempo real
            </div>
          </div>
        </div>

        {/* ─── KPIs Hero ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiHero
            label="Faturamento (mês)"
            value={fmtCompact(kpis.faturamentoMes)}
            delta={pctDelta(kpis.faturamentoMes, kpis.faturamentoMesAnterior)}
            deltaLabel="vs mês ant."
            icon={<DollarSign className="h-5 w-5" />}
            series={sparkFat}
            accent="primary"
          />
          <KpiHero
            label="Custos totais"
            value={fmtCompact(kpis.custosMes)}
            delta={pctDelta(kpis.custosMes, kpis.custosMesAnterior)}
            deltaLabel="vs mês ant."
            invertColor
            icon={<TrendingDown className="h-5 w-5" />}
            accent="warning"
          />
          <KpiHero
            label="Margem operacional"
            value={`${kpis.margemPercentual.toFixed(1)}%`}
            delta={kpis.margemPercentual - kpis.margemAnterior}
            deltaLabel="pp vs ant."
            icon={<TrendingUp className="h-5 w-5" />}
            accent="success"
          />
          <KpiHero
            label="Folha do mês"
            value={fmtCompact(kpis.folhaTotal)}
            delta={0}
            deltaLabel={`${kpis.totalFuncionarios} funcionários`}
            icon={<Users className="h-5 w-5" />}
            accent="primary"
          />
        </div>

        {/* ─── Linha de mini-cards operacionais ─── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat icon={<HardHat />} label="Obras ativas" value={String(kpis.obrasAtivas)} sub={kpis.obrasNovasMes > 0 ? `+${kpis.obrasNovasMes} no mês` : "estáveis"} link="/obras" />
          <MiniStat icon={<Wallet />} label="A receber (30d)" value={fmtCompact(contasReceber30d)} sub="próximos 30 dias" link="/financeiro" tone="success" />
          <MiniStat icon={<ShoppingCart />} label="A pagar (30d)" value={fmtCompact(contasPagar30d)} sub="próximos 30 dias" link="/financeiro" tone="warning" />
          <MiniStat icon={<AlertTriangle />} label="Estoque crítico" value={`${kpis.estoqueCritico}`} sub={kpis.estoqueCritico > 0 ? "ação necessária" : "tudo ok"} link="/estoque" tone={kpis.estoqueCritico > 0 ? "destructive" : "success"} />
        </div>

        {/* ─── Fluxo de caixa 30 dias + Alertas ─── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Fluxo de Caixa Projetado
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Próximos 30 dias • entradas vs saídas</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo previsto</p>
                <p className={`text-xl font-bold ${saldoLiquido30d >= 0 ? "text-success" : "text-destructive"}`}>
                  {fmtCompact(saldoLiquido30d)}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fluxo} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtCompact(v), name === "entrada" ? "Entradas" : name === "saida" ? "Saídas" : "Saldo"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="entrada" fill="hsl(var(--success))" radius={[3,3,0,0]} />
                <Bar dataKey="saida" fill="hsl(var(--destructive))" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success" /> Entradas previstas</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive" /> Saídas previstas</span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Alertas Operacionais
              </h3>
              <span className="text-xs font-semibold rounded-full bg-warning/10 text-warning px-2 py-0.5">{alertas.length}</span>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
              {alertas.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum alerta no momento ✓</p>
              )}
              {alertas.map(a => (
                <Link key={a.id} to={a.link} className="block rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      a.severidade === "alta" ? "bg-destructive" : a.severidade === "media" ? "bg-warning" : "bg-muted-foreground"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{a.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{a.descricao}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Tendência de Faturamento (sparkline grande) ─── */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Tendência de Faturamento</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Medições emitidas — últimos 6 meses</p>
            </div>
            <Link to="/medicoes" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              Ver medições <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={faturamentoSerie}>
              <defs>
                <linearGradient id="grad-fat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
              <Tooltip
                formatter={(v: number) => [fmtCompact(v), "Faturamento"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#grad-fat)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ─── Ranking de obras + Atividade recente ─── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <HardHat className="h-4 w-4 text-primary" /> Ranking de Obras em Execução
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Avanço físico baseado em medições</p>
              </div>
              <Link to="/obras" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y">
              {loading && <p className="px-5 py-8 text-center text-xs text-muted-foreground">Carregando…</p>}
              {!loading && obrasAndamento.length === 0 && (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">Nenhuma obra ativa no escopo.</p>
              )}
              {obrasAndamento.map((obra, idx) => (
                <Link
                  key={obra.id}
                  to="/obras"
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-semibold truncate">{obra.codigo} — {obra.nome}</p>
                      <span className="text-[10px] uppercase tracking-wider rounded-full bg-success/10 text-success px-2 py-0.5 font-semibold flex-shrink-0">
                        {obra.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${obra.progresso}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums w-10 text-right">{obra.progresso}%</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contrato</p>
                    <p className="text-sm font-bold tabular-nums">{fmtCompact(obra.valorContrato)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Atividade Recente
              </h3>
            </div>
            <div className="space-y-3">
              {atividades.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Sem atividades recentes.</p>
              )}
              {atividades.map(a => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                    {a.tipo === "Diário" && <FileText className="h-3.5 w-3.5" />}
                    {a.tipo === "Compra" && <ShoppingCart className="h-3.5 w-3.5" />}
                    {a.tipo === "Medição" && <Activity className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{a.tipo}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" /> {a.quando.split("-").reverse().join("/")}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate">{a.titulo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ───────── MiniStat component ───────── */
interface MiniStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  link: string;
  tone?: "default" | "success" | "warning" | "destructive";
}
function MiniStat({ icon, label, value, sub, link, tone = "default" }: MiniStatProps) {
  const toneMap = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };
  return (
    <Link to={link} className="group rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${toneMap[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
    </Link>
  );
}
