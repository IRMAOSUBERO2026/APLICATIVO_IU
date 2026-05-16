import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaObra } from "@/contexts/EmpresaObraContext";
import { isObraAtiva } from "@/lib/obraStatus";

export interface DashboardKPIs {
  faturamentoMes: number;
  faturamentoMesAnterior: number;
  custosMes: number;
  custosMesAnterior: number;
  margemPercentual: number;
  margemAnterior: number;
  obrasAtivas: number;
  obrasNovasMes: number;
  folhaTotal: number;
  totalFuncionarios: number;
  estoqueCritico: number;
}

export interface FaturamentoPonto {
  mes: string;
  valor: number;
}

export interface MargemObra {
  name: string;
  value: number;
  obraId: string;
}

export interface ObraAndamento {
  id: string;
  nome: string;
  codigo: string;
  status: string;
  progresso: number;
  valorContrato: number;
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useDashboardData() {
  const { empresaId, obraId, obras } = useEmpresaObra();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    faturamentoMes: 0, faturamentoMesAnterior: 0,
    custosMes: 0, custosMesAnterior: 0,
    margemPercentual: 0, margemAnterior: 0,
    obrasAtivas: 0, obrasNovasMes: 0,
    folhaTotal: 0, totalFuncionarios: 0,
    estoqueCritico: 0,
  });
  const [faturamentoSerie, setFaturamentoSerie] = useState<FaturamentoPonto[]>([]);
  const [margemPorObra, setMargemPorObra] = useState<MargemObra[]>([]);
  const [obrasAndamento, setObrasAndamento] = useState<ObraAndamento[]>([]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth() + 1; // 1-12
      const mesAntDate = new Date(ano, mes - 2, 1);
      const anoAnt = mesAntDate.getFullYear();
      const mesAnt = mesAntDate.getMonth() + 1;

      const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fimMes = new Date(ano, mes, 0).toISOString().slice(0, 10);
      const inicioMesAnt = `${anoAnt}-${String(mesAnt).padStart(2, "0")}-01`;
      const fimMesAnt = new Date(anoAnt, mesAnt, 0).toISOString().slice(0, 10);

      // Filtros base
      const filtroEmpresa = (q: any) => empresaId ? q.eq("empresa_id", empresaId) : q;
      const filtroObra = (q: any) => obraId ? q.eq("obra_id", obraId) : q;

      // Obras do escopo
      let obrasEscopo = obras;
      if (empresaId) obrasEscopo = obrasEscopo.filter(o => o.empresa_id === empresaId);
      if (obraId) obrasEscopo = obrasEscopo.filter(o => o.id === obraId);
      const obrasAtivasArr = obrasEscopo.filter(o => isObraAtiva(o.status));

      // ---- Receitas (medições do mês) ----
      let medQ = supabase.from("medicoes")
        .select("valor_liquido, valor_bruto, obra_id, empresa_id, data_emissao")
        .gte("data_emissao", inicioMes).lte("data_emissao", fimMes);
      medQ = filtroEmpresa(medQ); medQ = filtroObra(medQ);
      const { data: medMes } = await medQ;

      let medAntQ = supabase.from("medicoes")
        .select("valor_liquido, data_emissao")
        .gte("data_emissao", inicioMesAnt).lte("data_emissao", fimMesAnt);
      medAntQ = filtroEmpresa(medAntQ); medAntQ = filtroObra(medAntQ);
      const { data: medAnt } = await medAntQ;

      const faturamentoMes = (medMes || []).reduce((s, r: any) => s + Number(r.valor_liquido || 0), 0);
      const faturamentoMesAnterior = (medAnt || []).reduce((s, r: any) => s + Number(r.valor_liquido || 0), 0);

      // ---- Custos (compras + folha + locação + locado) do mês ----
      let comprasQ = supabase.from("compras")
        .select("total, obra_id, data_emissao")
        .gte("data_emissao", inicioMes).lte("data_emissao", fimMes);
      comprasQ = filtroEmpresa(comprasQ); comprasQ = filtroObra(comprasQ);
      const { data: compras } = await comprasQ;

      let comprasAntQ = supabase.from("compras")
        .select("total, data_emissao")
        .gte("data_emissao", inicioMesAnt).lte("data_emissao", fimMesAnt);
      comprasAntQ = filtroEmpresa(comprasAntQ); comprasAntQ = filtroObra(comprasAntQ);
      const { data: comprasAnt } = await comprasAntQ;

      let folhaQ = supabase.from("folhas_pagamento")
        .select("custo_total_empresa, salario_final, obra_id")
        .eq("ano", ano).eq("mes", mes);
      folhaQ = filtroEmpresa(folhaQ); folhaQ = filtroObra(folhaQ);
      const { data: folhas } = await folhaQ;

      let folhaAntQ = supabase.from("folhas_pagamento")
        .select("custo_total_empresa, salario_final")
        .eq("ano", anoAnt).eq("mes", mesAnt);
      folhaAntQ = filtroEmpresa(folhaAntQ); folhaAntQ = filtroObra(folhaAntQ);
      const { data: folhasAnt } = await folhaAntQ;

      const totalCompras = (compras || []).reduce((s, r: any) => s + Number(r.total || 0), 0);
      const totalComprasAnt = (comprasAnt || []).reduce((s, r: any) => s + Number(r.total || 0), 0);
      const totalFolhaCusto = (folhas || []).reduce((s, r: any) => s + Number(r.custo_total_empresa || r.salario_final || 0), 0);
      const totalFolhaCustoAnt = (folhasAnt || []).reduce((s, r: any) => s + Number(r.custo_total_empresa || r.salario_final || 0), 0);
      const folhaSalarios = (folhas || []).reduce((s, r: any) => s + Number(r.salario_final || 0), 0);

      const custosMes = totalCompras + totalFolhaCusto;
      const custosMesAnterior = totalComprasAnt + totalFolhaCustoAnt;

      const margemPercentual = faturamentoMes > 0 ? ((faturamentoMes - custosMes) / faturamentoMes) * 100 : 0;
      const margemAnterior = faturamentoMesAnterior > 0 ? ((faturamentoMesAnterior - custosMesAnterior) / faturamentoMesAnterior) * 100 : 0;

      // ---- Obras ativas + novas no mês ----
      const obrasNovasMes = obrasAtivasArr.filter(o => {
        const dt = (o as any).data_inicio || null;
        return dt && dt >= inicioMes && dt <= fimMes;
      }).length;

      // ---- Funcionários ativos ----
      let funcQ = supabase.from("funcionarios").select("id", { count: "exact", head: true }).eq("status", "ativo");
      funcQ = filtroEmpresa(funcQ); funcQ = filtroObra(funcQ);
      const { count: totalFuncionarios } = await funcQ;

      // ---- Estoque crítico (produtos com estoque <= mínimo) ----
      // Calcula via movimentações (entradas - saídas) por produto.
      const { data: produtos } = await supabase.from("produtos").select("id, descricao, estoque_minimo").eq("ativo", true);
      let estoqueCritico = 0;
      if (produtos && produtos.length) {
        const { data: movs } = await supabase.from("movimentacoes_estoque").select("produto_id, tipo, quantidade");
        const saldo = new Map<string, number>();
        (movs || []).forEach((m: any) => {
          const sinal = m.tipo === "entrada" ? 1 : -1;
          saldo.set(m.produto_id, (saldo.get(m.produto_id) || 0) + sinal * Number(m.quantidade || 0));
        });
        estoqueCritico = produtos.filter((p: any) => {
          const min = Number(p.estoque_minimo || 0);
          if (min <= 0) return false;
          return (saldo.get(p.id) || 0) <= min;
        }).length;
      }

      // ---- Série de faturamento (últimos 6 meses) — em paralelo ----
      const seriePromises: Promise<FaturamentoPonto>[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ano, mes - 1 - i, 1);
        const a = d.getFullYear(); const m = d.getMonth() + 1;
        const ini = `${a}-${String(m).padStart(2, "0")}-01`;
        const fim = new Date(a, m, 0).toISOString().slice(0, 10);
        let q = supabase.from("medicoes").select("valor_liquido").gte("data_emissao", ini).lte("data_emissao", fim);
        q = filtroEmpresa(q); q = filtroObra(q);
        seriePromises.push(q.then(({ data }) => ({
          mes: MESES_CURTOS[d.getMonth()],
          valor: (data || []).reduce((s, r: any) => s + Number(r.valor_liquido || 0), 0),
        })));
      }
      const serie: FaturamentoPonto[] = await Promise.all(seriePromises);

      // ---- Agregados por obra (1 query cada, agrupados em JS — sem N+1) ----
      const obraIds = obrasAtivasArr.map(o => o.id);
      const empty = { data: [] as any[] };
      const [medRes, comRes, folRes, itensRes, medBrRes] = obraIds.length
        ? await Promise.all([
            supabase.from("medicoes").select("valor_liquido, obra_id").in("obra_id", obraIds),
            supabase.from("compras").select("total, obra_id").in("obra_id", obraIds),
            supabase.from("folhas_pagamento").select("custo_total_empresa, salario_final, obra_id").in("obra_id", obraIds),
            supabase.from("medicao_contrato_itens").select("valor_total, obra_id").in("obra_id", obraIds),
            supabase.from("medicoes").select("valor_bruto, obra_id").in("obra_id", obraIds),
          ])
        : [empty, empty, empty, empty, empty] as any;

      const sumBy = (rows: any[], key: string) => {
        const map = new Map<string, number>();
        (rows || []).forEach(r => map.set(r.obra_id, (map.get(r.obra_id) || 0) + Number(r[key] || 0)));
        return map;
      };
      const recMap = sumBy(medRes.data as any[], "valor_liquido");
      const cusMap = sumBy(comRes.data as any[], "total");
      const folMap = new Map<string, number>();
      ((folRes.data as any[]) || []).forEach((r: any) =>
        folMap.set(r.obra_id, (folMap.get(r.obra_id) || 0) + Number(r.custo_total_empresa || r.salario_final || 0))
      );
      const itensMap = sumBy(itensRes.data as any[], "valor_total");
      const brutoMap = sumBy(medBrRes.data as any[], "valor_bruto");

      const margemArr: MargemObra[] = obrasAtivasArr.map(o => {
        const receita = recMap.get(o.id) || 0;
        const custos = (cusMap.get(o.id) || 0) + (folMap.get(o.id) || 0);
        const m = receita > 0 ? Math.round(((receita - custos) / receita) * 100) : 0;
        return { name: `${o.codigo} — ${o.nome}`, value: m, obraId: o.id };
      });
      const topMargem = [...margemArr].sort((a, b) => b.value - a.value).slice(0, 4);

      const andamento: ObraAndamento[] = obrasAtivasArr.slice(0, 8).map(o => {
        const valorContrato = itensMap.get(o.id) || 0;
        const totalMedido = brutoMap.get(o.id) || 0;
        const progresso = valorContrato > 0 ? Math.min(100, Math.round((totalMedido / valorContrato) * 100)) : 0;
        return { id: o.id, nome: o.nome, codigo: o.codigo, status: o.status, progresso, valorContrato };
      });

      if (cancel) return;
      setKpis({
        faturamentoMes, faturamentoMesAnterior,
        custosMes, custosMesAnterior,
        margemPercentual, margemAnterior,
        obrasAtivas: obrasAtivasArr.length,
        obrasNovasMes,
        folhaTotal: folhaSalarios,
        totalFuncionarios: totalFuncionarios || 0,
        estoqueCritico,
      });
      setFaturamentoSerie(serie);
      setMargemPorObra(topMargem);
      setObrasAndamento(andamento);
      setLoading(false);
    }
    load();
    return () => { cancel = true; };
  }, [empresaId, obraId, obras]);

  return { loading, kpis, faturamentoSerie, margemPorObra, obrasAndamento };
}
