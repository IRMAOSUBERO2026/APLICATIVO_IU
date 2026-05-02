import { AppLayout } from "@/components/layout/AppLayout";
import React, { useState, useEffect, useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEmpresaObra } from "@/contexts/EmpresaObraContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, HardHat, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Activity, Clock, ShoppingCart, FileText,
  Wallet, Calendar, ChevronRight, Sparkles, Bell, ClipboardList,
  PackageSearch, Stethoscope, Wrench, MessageSquare, Building2,
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
  const isPositive = delta >= 0;
  const isGoldValue = label.toLowerCase().includes("faturamento") || (label.toLowerCase().includes("obra") && !label.toLowerCase().includes("ativa"));
  
  // No style specs for series, but user said "linha verde #4A8C40, fundo transparente"
  const data = (series || []).map((v, i) => ({ i, v }));

  return (
    <div className="relative overflow-hidden rounded-[10px] border-[0.5px] border-[#E0E0E0] bg-white p-[18px] pl-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md transition-shadow group">
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#888888]">{label}</p>
          <p className={`text-[28px] font-bold tracking-tight leading-none ${isGoldValue ? "text-[#C9A84C]" : "text-[#1A1A1A]"}`}>
            {value}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className={`text-[12px] font-bold ${isPositive ? "text-[#2D7D1F]" : "text-[#B91C1C]"}`}>
              {isPositive ? "+" : ""}{delta.toFixed(1)}%
            </span>
            {deltaLabel && <span className="text-[12px] text-[#6B6B6B]">{deltaLabel}</span>}
          </div>
        </div>
        
        {data.length > 1 && (
          <div className="mt-4 h-[40px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <Area 
                  type="monotone" 
                  dataKey="v" 
                  stroke="#4A8C40" 
                  strokeWidth={1.5} 
                  fill="transparent" 
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      <div className="absolute top-[18px] right-[20px] text-[#3A5C35] opacity-60">
        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      </div>
    </div>
  );
}

/* ───────── Tipos auxiliares ───────── */
interface FluxoPonto { dia: string; entrada: number; saida: number; saldo: number; }
interface AlertaItem { id: string; tipo: "atraso" | "estoque" | "exame" | "vencimento"; titulo: string; descricao: string; link: string; severidade: "alta" | "media" | "baixa"; }
interface AtividadeItem { id: string; tipo: string; titulo: string; quando: string; }
interface PendenciaItem {
  id: string;
  categoria: "aviso" | "solicitacao_diario" | "solicitacao_compra" | "solicitacao_exame" | "manutencao" | "tarefa";
  titulo: string;
  descricao: string;
  data: string;
  link: string;
  prioridade: "alta" | "media" | "baixa";
}

/* ───────── Página ───────── */
export default function Dashboard() {
  const { kpis, faturamentoSerie, obrasAndamento, loading } = useDashboardData();
  const { empresaAtual, obraAtual, empresaId, obraId } = useEmpresaObra();
  const [fluxo, setFluxo] = useState<FluxoPonto[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [atividades, setAtividades] = useState<AtividadeItem[]>([]);
  const [contasReceber30d, setContasReceber30d] = useState(0);
  const [contasPagar30d, setContasPagar30d] = useState(0);
  const [pendencias, setPendencias] = useState<PendenciaItem[]>([]);

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

      // ===== AVISOS, SOLICITAÇÕES E PENDÊNCIAS =====
      const pends: PendenciaItem[] = [];

      // 1. Avisos não lidos
      let avisosQ = supabase.from("avisos").select("id, titulo, mensagem, tipo, categoria, created_at").eq("lido", false).order("created_at", { ascending: false }).limit(8);
      avisosQ = filtroEmp(avisosQ); avisosQ = filtroObra(avisosQ);
      const { data: avisosData } = await avisosQ;
      (avisosData || []).forEach((a: any) => pends.push({
        id: `av-${a.id}`, categoria: "aviso",
        titulo: a.titulo, descricao: a.mensagem,
        data: String(a.created_at).slice(0,10),
        link: "/diario-obra",
        prioridade: a.tipo === "urgente" ? "alta" : a.tipo === "atencao" ? "media" : "baixa",
      }));

      // 2. Solicitações pendentes do diário (materiais/equipamentos)
      let solDiaQ = supabase.from("solicitacoes_diario").select("id, tipo, justificativa, descricao_livre, quantidade, solicitante, created_at, status").eq("status", "pendente").order("created_at", { ascending: false }).limit(10);
      solDiaQ = filtroEmp(solDiaQ); solDiaQ = filtroObra(solDiaQ);
      const { data: solDia } = await solDiaQ;
      (solDia || []).forEach((s: any) => pends.push({
        id: `sd-${s.id}`, categoria: "solicitacao_diario",
        titulo: `${s.tipo === "material" ? "Material" : s.tipo === "equipamento" ? "Equipamento" : s.tipo}: ${s.descricao_livre || s.justificativa}`.slice(0, 80),
        descricao: `${s.quantidade || 1} un • ${s.solicitante || "—"}`,
        data: String(s.created_at).slice(0,10),
        link: "/diario-obra",
        prioridade: "media",
      }));

      // 3. Solicitações de compra/equipamento
      let solCompQ = supabase.from("solicitacoes_compra_equipamento").select("id, descricao, tipo, quantidade, valor_estimado, solicitante, created_at, status").eq("status", "pendente").order("created_at", { ascending: false }).limit(10);
      solCompQ = filtroEmp(solCompQ); solCompQ = filtroObra(solCompQ);
      const { data: solComp } = await solCompQ;
      (solComp || []).forEach((s: any) => pends.push({
        id: `sc-${s.id}`, categoria: "solicitacao_compra",
        titulo: s.descricao,
        descricao: `${s.quantidade}x • ${s.valor_estimado ? fmtCompact(s.valor_estimado) : "sem estimativa"} • ${s.solicitante || "—"}`,
        data: String(s.created_at).slice(0,10),
        link: "/solicitacoes",
        prioridade: Number(s.valor_estimado || 0) > 5000 ? "alta" : "media",
      }));

      // 4. Solicitações de exame pendentes
      let solExQ = supabase.from("solicitacoes_exame").select("id, tipo_exame, valor, funcionario_id, data_solicitacao, status").eq("status", "pendente").order("data_solicitacao", { ascending: false }).limit(10);
      solExQ = filtroEmp(solExQ);
      const { data: solEx } = await solExQ;
      if (solEx && solEx.length > 0) {
        const funcIds = [...new Set(solEx.map((s: any) => s.funcionario_id))];
        const { data: funcsEx } = await supabase.from("funcionarios").select("id, nome").in("id", funcIds);
        const fmap = new Map((funcsEx || []).map((f: any) => [f.id, f.nome]));
        solEx.forEach((s: any) => pends.push({
          id: `se-${s.id}`, categoria: "solicitacao_exame",
          titulo: `Exame ${s.tipo_exame}`,
          descricao: `${fmap.get(s.funcionario_id) || "Funcionário"} • ${fmtCompact(s.valor || 0)}`,
          data: String(s.data_solicitacao),
          link: "/rh",
          prioridade: "media",
        }));
      }

      // 5. Manutenções de equipamento solicitadas
      let manutQ = supabase.from("manutencoes_equipamento").select("id, descricao, tipo, data_solicitacao, valor_orcamento, status").eq("status", "solicitada").order("data_solicitacao", { ascending: false }).limit(8);
      manutQ = filtroEmp(manutQ);
      const { data: manuts } = await manutQ;
      (manuts || []).forEach((m: any) => pends.push({
        id: `mn-${m.id}`, categoria: "manutencao",
        titulo: `Manutenção ${m.tipo}`,
        descricao: `${String(m.descricao).slice(0, 80)} • ${m.valor_orcamento ? fmtCompact(m.valor_orcamento) : "sem orçamento"}`,
        data: String(m.data_solicitacao),
        link: "/equipamentos-proprios",
        prioridade: m.tipo === "corretiva" ? "alta" : "media",
      }));

      // 6. Tarefas em aberto com prazo
      let tarQ = supabase.from("tarefas").select("id, titulo, descricao, prioridade, data_limite, status").in("status", ["pendente", "em_andamento"]).order("data_limite", { ascending: true, nullsFirst: false }).limit(8);
      tarQ = filtroEmp(tarQ); tarQ = filtroObra(tarQ);
      const { data: tarefas } = await tarQ;
      (tarefas || []).forEach((t: any) => {
        const dl = t.data_limite ? new Date(t.data_limite) : null;
        const atrasada = dl && dl.getTime() < Date.now();
        pends.push({
          id: `tr-${t.id}`, categoria: "tarefa",
          titulo: t.titulo,
          descricao: dl ? `${atrasada ? "⚠ Atrasada" : "Vence"} ${dl.toLocaleDateString("pt-BR")}` : "Sem prazo",
          data: t.data_limite || String(new Date().toISOString().slice(0,10)),
          link: "/comunicacoes",
          prioridade: atrasada ? "alta" : (t.prioridade === "alta" ? "alta" : t.prioridade === "baixa" ? "baixa" : "media"),
        });
      });

      // Ordena por prioridade desc, depois data desc
      const ordemP: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
      pends.sort((a, b) => {
        const dp = ordemP[a.prioridade] - ordemP[b.prioridade];
        if (dp !== 0) return dp;
        return b.data.localeCompare(a.data);
      });

      if (cancel) return;
      setFluxo(serie);
      setAlertas(alerts.sort((a, b) => {
        const order = { alta: 0, media: 1, baixa: 2 };
        return order[a.severidade] - order[b.severidade];
      }));
      setAtividades(atvs.slice(0, 6));
      setContasReceber30d(totCR);
      setContasPagar30d(totCP);
      setPendencias(pends);
    })();
    return () => { cancel = true; };
  }, [empresaId, obraId]);

  const saldoLiquido30d = contasReceber30d - contasPagar30d;

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 pb-10">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-semibold text-[#1A1A1A] tracking-tight">Dashboard Executivo</h1>
          <div className="flex items-center gap-2 text-[#6B6B6B] text-[13px]">
            <Building2 size={14} className="text-[#3A5C35]" />
            <span>{escopo}</span>
            <span className="mx-1 opacity-30">•</span>
            <Calendar size={14} className="text-[#3A5C35]" />
            <span>{periodo}</span>
          </div>
        </div>

        {/* Grade de KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiHero
            label="Faturamento do Mês"
            value={fmtCompact(kpis.faturamentoMes)}
            delta={pctDelta(kpis.faturamentoMes, kpis.faturamentoMesAnterior)}
            deltaLabel="vs mês ant."
            icon={<DollarSign />}
            series={faturamentoSerie.map(p => p.valor)}
          />
          <KpiHero
            label="Obras em Andamento"
            value={String(kpis.obrasAtivas)}
            delta={kpis.obrasNovasMes}
            deltaLabel="novas obras"
            icon={<HardHat />}
          />
          <KpiHero
            label="Efetivo Total"
            value={String(kpis.totalFuncionarios)}
            delta={0}
            deltaLabel="colaboradores"
            icon={<Users />}
          />
          <KpiHero
            label="Despesas Operacionais"
            value={fmtCompact(kpis.custosMes)}
            delta={pctDelta(kpis.custosMes, kpis.custosMesAnterior)}
            deltaLabel="vs mês ant."
            icon={<ArrowDownRight />}
          />
        </div>

        {/* Área Operacional e Financeira */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-8">
            {/* Central de Pendências */}
            <div className="bg-white rounded-[10px] border-[0.5px] border-[#E0E0E0] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <PendenciasPanel pendencias={pendencias} />
            </div>
            
            {/* Atalhos Rápidos e Resumo Financeiro */}
            <div className="grid gap-6 sm:grid-cols-2">
              <MiniStat 
                icon={<Wallet />} 
                label="CONTAS A RECEBER" 
                value={fmtCompact(contasReceber30d)} 
                sub="Previsão para 30 dias" 
                link="/financeiro"
                status="success"
              />
              <MiniStat 
                icon={<ShoppingCart />} 
                label="CONTAS A PAGAR" 
                value={fmtCompact(contasPagar30d)} 
                sub="Pendentes e agendadas" 
                link="/financeiro"
                status="warning"
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            {/* Alertas Críticos (RH/SST) */}
            <div className="bg-white rounded-[10px] border-[0.5px] border-[#E0E0E0] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <h4 className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-6 flex items-center justify-between">
                Alertas e Notificações
                <Bell size={16} className="text-[#3A5C35]" />
              </h4>
              <div className="space-y-4">
                {alertas.slice(0, 4).map((a, i) => (
                  <Link key={i} to={a.link} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F9FBF8] transition-colors border border-transparent hover:border-[#E8F5E1] group">
                    <div className={`p-2 rounded-md ${
                      a.severidade === "alta" ? "bg-[#FDECEA] text-[#B91C1C]" : "bg-[#F5F5F5] text-[#444444]"
                    }`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#1A1A1A] truncate">{a.titulo}</p>
                      <p className="text-[12px] text-[#6B6B6B] line-clamp-1">{a.descricao}</p>
                    </div>
                  </Link>
                ))}
                {alertas.length === 0 && (
                  <p className="text-[13px] text-[#AAAAAA] text-center py-4 italic">Nenhum alerta crítico no momento</p>
                )}
              </div>
              <Link to="/solicitacoes" className="mt-6 block w-full py-2.5 text-center text-[12px] font-semibold text-[#3A5C35] bg-[#F9FBF8] border border-[#3A5C35]/20 rounded-md hover:bg-[#E8F5E1] transition-colors">
                Ver todas as solicitações
              </Link>
            </div>

            {/* Atividade Recente do Sistema */}
            <div className="bg-white rounded-[10px] border-[0.5px] border-[#E0E0E0] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <h4 className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider mb-6 flex items-center justify-between">
                Atividade Recente
                <Activity size={16} className="text-[#3A5C35]" />
              </h4>
              <div className="space-y-5">
                {atividades.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-[1.5px] bg-[#EEEEEE] relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#3A5C35] border-2 border-white" />
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-[13px] font-medium text-[#1A1A1A] leading-tight">{a.titulo}</p>
                      <p className="text-[11px] text-[#888888] mt-1">{a.quando.split("-").reverse().join("/")}</p>
                    </div>
                  </div>
                ))}
              </div>
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
  status?: "success" | "warning" | "destructive" | "neutral";
}
function MiniStat({ icon, label, value, sub, link, status = "neutral" }: MiniStatProps) {
  const statusColors = {
    success: "text-[#2D6A1F] bg-[#E8F5E1]",
    warning: "text-[#A0660A] bg-[#FFF4E0]",
    destructive: "text-[#B91C1C] bg-[#FDECEA]",
    neutral: "text-[#555555] bg-[#F0F0F0]",
  };

  return (
    <Link to={link} className="flex items-center gap-4 bg-white rounded-[10px] border-[0.5px] border-[#E0E0E0] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[#3A5C35] hover:shadow-md transition-all group">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg flex-shrink-0 transition-transform group-hover:scale-105 ${statusColors[status]}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase font-semibold text-[#888888] tracking-wider">{label}</p>
        <p className="text-[22px] font-bold text-[#1A1A1A] tracking-tight mt-0.5">{value}</p>
        <p className="text-[12px] text-[#6B6B6B] truncate mt-0.5">{sub}</p>
      </div>
      <ChevronRight size={18} className="text-[#CCCCCC] group-hover:text-[#3A5C35] transition-colors" />
    </Link>
  );
}

/* ───────── PendenciasPanel ───────── */
const CAT_META: Record<PendenciaItem["categoria"], { label: string; icon: React.ReactNode; color: string }> = {
  aviso: { label: "Aviso", icon: <Bell size={14} />, color: "text-[#A0660A]" },
  solicitacao_diario: { label: "Diário", icon: <ClipboardList size={14} />, color: "text-[#3A5C35]" },
  solicitacao_compra: { label: "Compra", icon: <ShoppingCart size={14} />, color: "text-[#2D6A1F]" },
  solicitacao_exame: { label: "Exame", icon: <Stethoscope size={14} />, color: "text-[#B91C1C]" },
  manutencao: { label: "Manutenção", icon: <Wrench size={14} />, color: "text-[#555555]" },
  tarefa: { label: "Tarefa", icon: <MessageSquare size={14} />, color: "text-[#3A5C35]" },
};

function PendenciasPanel({ pendencias }: { pendencias: PendenciaItem[] }) {
  const [filtro, setFiltro] = useState<"todas" | PendenciaItem["categoria"]>("todas");
  const lista = filtro === "todas" ? pendencias : pendencias.filter(p => p.categoria === filtro);
  
  const counts = pendencias.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalUrgente = pendencias.filter(p => p.prioridade === "alta").length;

  return (
    <div className="flex flex-col">
      <div className="bg-[#F5F5F5] border-b border-[#E0E0E0] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#1A1A1A] flex items-center gap-2">
            FILA DE PROCESSAMENTO
            {totalUrgente > 0 && (
              <span className="text-[10px] bg-[#B91C1C] text-white px-2 py-0.5 rounded-full font-bold">
                {totalUrgente} URGENTE(S)
              </span>
            )}
          </h3>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Pendências aguardando sua ação nos módulos</p>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setFiltro("todas")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              filtro === "todas" ? "bg-[#3A5C35] text-white" : "text-[#6B6B6B] hover:bg-[#E0E0E0]"
            }`}
          >
            Todas ({pendencias.length})
          </button>
          {Object.entries(CAT_META).map(([cat, meta]) => (
            <button
              key={cat}
              onClick={() => setFiltro(cat as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                filtro === cat ? "bg-[#3A5C35] text-white" : "text-[#6B6B6B] hover:bg-[#E0E0E0]"
              }`}
            >
              {meta.label} ({counts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[#EEEEEE]">
        {lista.length === 0 ? (
          <div className="py-12 text-center text-[#AAAAAA] text-[13px] italic">
            Nenhuma pendência registrada nesta categoria
          </div>
        ) : (
          lista.slice(0, 10).map((p) => {
            const meta = CAT_META[p.categoria];
            return (
              <Link
                key={p.id}
                to={p.link}
                className="flex items-center gap-4 px-6 py-4 hover:bg-[#F9FBF8] transition-all group"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-md border border-[#E0E0E0] bg-white shadow-sm ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider">{meta.label}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${p.prioridade === "alta" ? "bg-[#B91C1C]" : "bg-[#D0D5DD]"}`} />
                  </div>
                  <p className="text-[14px] font-medium text-[#1A1A1A] group-hover:text-[#3A5C35] transition-colors line-clamp-1">{p.titulo}</p>
                  <p className="text-[12px] text-[#6B6B6B] truncate">{p.descricao}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-medium text-[#888888]">{p.data.split("-").reverse().join("/")}</p>
                  <div className="flex items-center justify-end mt-1">
                    <ChevronRight size={14} className="text-[#CCCCCC] group-hover:text-[#3A5C35] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      
      {lista.length > 0 && (
        <div className="bg-[#F9F9F9] px-6 py-3 border-t border-[#E0E0E0]">
          <Link to="/relatorios" className="text-[12px] font-semibold text-[#3A5C35] hover:underline flex items-center gap-1">
            Visualizar relatório completo de pendências <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

