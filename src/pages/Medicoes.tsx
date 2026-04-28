import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Calculator, RefreshCw, Download, CheckCircle2, History, Save, Trash2, Edit, FileCheck2,
} from "lucide-react";
import { format } from "date-fns";
import { gerarPlanilhaMedicaoPdf } from "@/lib/gerarPlanilhaMedicaoPdf";

const fmtBRL = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Obra {
  id: string; nome: string; codigo: string; empresa_id: string;
  construtora?: string; cliente?: string; cidade?: string; uf?: string; endereco?: string;
  percentual_retencao_padrao?: number;
  impostos_padrao?: Array<{ imposto: string; aliquota: number }>;
}
interface ContratoItem {
  id: string; item_numero: string; descricao: string; unidade: string;
  quantidade: number; valor_unitario: number; valor_total: number;
  quantidade_acumulada_inicial?: number;
  is_aditivo?: boolean; aditivo_numero?: number; aditivo_data?: string;
  categoria?: string;
}
interface Reajuste {
  id: string; data_aplicacao: string; percentual: number; tipo: string; motivo?: string;
}
interface Medicao {
  id: string; obra_id: string; empresa_id: string; numero: number;
  periodo_inicio: string; periodo_fim: string; data_emissao: string;
  valor_bruto: number; percentual_retencao: number;
  valor_retencao: number; valor_liquido: number; status: string;
  observacoes?: string; aprovado_em?: string; aprovado_por?: string;
  conta_receber_id?: string;
}
interface BoletimItem {
  id?: string; medicao_id?: string; contrato_item_id: string;
  quantidade_medida: number; percentual_medido: number; valor_medido: number;
  modo_lancamento: string; observacoes?: string;
}

type ModoLanc = "und" | "pct";

export default function Medicoes() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [reajustes, setReajustes] = useState<Reajuste[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [boletimItens, setBoletimItens] = useState<Record<string, BoletimItem[]>>({});
  const [activeTab, setActiveTab] = useState("medicoes");

  const [medicaoForm, setMedicaoForm] = useState({
    periodo_inicio: format(new Date(), "yyyy-MM-01"),
    periodo_fim: format(new Date(), "yyyy-MM-dd"),
    percentual_retencao: 5,
    observacoes: "",
  });
  const [lancamentos, setLancamentos] = useState<Record<string, { modo: ModoLanc; valor: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Editar medição existente
  const [editingMedicao, setEditingMedicao] = useState<Medicao | null>(null);
  const [editLancamentos, setEditLancamentos] = useState<Record<string, { modo: ModoLanc; valor: number }>>({});
  const [editForm, setEditForm] = useState({ percentual_retencao: 5, observacoes: "" });

  const selectedObra = obras.find(o => o.id === selectedObraId);

  useEffect(() => {
    supabase.from("obras")
      .select("id,nome,codigo,empresa_id,construtora,cliente,cidade,uf,endereco,percentual_retencao_padrao,impostos_padrao")
      .then(({ data }) => { if (data) setObras(data as any[]); });
  }, []);

  useEffect(() => {
    if (!selectedObraId) return;
    loadData();
    if (selectedObra) {
      setMedicaoForm(p => ({ ...p, percentual_retencao: Number(selectedObra.percentual_retencao_padrao ?? 5) }));
      supabase.from("empresas").select("*").eq("id", selectedObra.empresa_id).maybeSingle()
        .then(({ data }) => setEmpresa(data));
    }
  }, [selectedObraId]);

  const loadData = async () => {
    const [c, m, r] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("*").eq("obra_id", selectedObraId).order("item_numero"),
      supabase.from("medicoes").select("*").eq("obra_id", selectedObraId).order("numero", { ascending: false }),
      supabase.from("medicao_reajustes").select("*").eq("obra_id", selectedObraId).order("data_aplicacao"),
    ]);
    if (c.data) setContratoItens(c.data as any[]);
    if (r.data) setReajustes(r.data as Reajuste[]);
    if (m.data && m.data.length > 0) {
      setMedicoes(m.data as Medicao[]);
      const { data: allItems } = await supabase.from("medicao_boletim_itens").select("*").in("medicao_id", m.data.map(med => med.id));
      const bMap: Record<string, BoletimItem[]> = {};
      if (allItems) allItems.forEach((bi: any) => {
        if (!bMap[bi.medicao_id]) bMap[bi.medicao_id] = [];
        bMap[bi.medicao_id].push(bi);
      });
      setBoletimItens(bMap);
    } else {
      setMedicoes([]);
      setBoletimItens({});
    }
  };

  // Acumulado de medições anteriores (excluindo a que está em edição)
  const acumuladoAnterior = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const ci of contratoItens) acc[ci.id] = ci.quantidade_acumulada_inicial || 0;
    Object.entries(boletimItens).forEach(([medId, itens]) => {
      if (editingMedicao && medId === editingMedicao.id) return;
      itens.forEach(bi => { acc[bi.contrato_item_id] = (acc[bi.contrato_item_id] || 0) + bi.quantidade_medida; });
    });
    return acc;
  }, [boletimItens, contratoItens, editingMedicao]);

  // Fator de reajuste acumulado (multiplicativo). Aplica APENAS ao saldo restante de cada item.
  const fatorReajuste = useMemo(() => {
    let f = 1;
    for (const r of reajustes) f *= (1 + (Number(r.percentual) || 0) / 100);
    return f;
  }, [reajustes]);

  // Valor unitário efetivo: itens 100% medidos mantêm o valor unitário original.
  // Itens com saldo recebem reajuste proporcional ao % do saldo.
  // Fórmula: V_unit_efetivo = V_orig * (1 - %medido/100) * fator + V_orig * (%medido/100)
  const getValorUnitarioEfetivo = (ci: ContratoItem): number => {
    if (fatorReajuste === 1) return ci.valor_unitario;
    const prevQ = (acumuladoAnterior[ci.id] || 0);
    const pctMedido = ci.quantidade > 0 ? Math.min(prevQ / ci.quantidade, 1) : 0;
    return ci.valor_unitario * pctMedido + ci.valor_unitario * (1 - pctMedido) * fatorReajuste;
  };

  // Helper: converte lançamento (und ou pct) em quantidade
  const calcularQtd = (ci: ContratoItem, lanc?: { modo: ModoLanc; valor: number }) => {
    if (!lanc || !lanc.valor) return 0;
    if (lanc.modo === "pct") return ci.quantidade * (lanc.valor / 100);
    return lanc.valor;
  };

  const subtotalLancamento = useMemo(() => {
    return contratoItens.reduce((s, ci) => {
      const q = calcularQtd(ci, lancamentos[ci.id]);
      return s + q * getValorUnitarioEfetivo(ci);
    }, 0);
  }, [lancamentos, contratoItens, fatorReajuste, acumuladoAnterior]);

  const totalContrato = contratoItens.reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
  const totalMedido = Object.entries(boletimItens).reduce((s, [, itens]) => s + itens.reduce((ss, i) => ss + i.valor_medido, 0), 0);

  // Separação aditivos
  const itensPrincipais = useMemo(() => contratoItens.filter(i => !i.is_aditivo), [contratoItens]);
  const itensAditivos = useMemo(() => contratoItens.filter(i => i.is_aditivo), [contratoItens]);

  // ============ SALVAR (RASCUNHO) ============
  const handleSaveBatch = async () => {
    if (!selectedObraId || subtotalLancamento <= 0) {
      toast({ title: "Nenhum valor para lançar", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const vRet = subtotalLancamento * (medicaoForm.percentual_retencao / 100);
      const { data: med, error: mErr } = await supabase.from("medicoes").insert({
        obra_id: selectedObraId,
        empresa_id: selectedObra?.empresa_id || "",
        numero: medicoes.length + 1,
        periodo_inicio: medicaoForm.periodo_inicio,
        periodo_fim: medicaoForm.periodo_fim,
        data_emissao: new Date().toISOString().split("T")[0],
        valor_bruto: subtotalLancamento,
        percentual_retencao: medicaoForm.percentual_retencao,
        valor_retencao: vRet,
        valor_liquido: subtotalLancamento - vRet,
        status: "rascunho",
        observacoes: medicaoForm.observacoes,
      }).select().single();
      if (mErr) throw mErr;

      const entries = contratoItens
        .map(ci => ({ ci, q: calcularQtd(ci, lancamentos[ci.id]) }))
        .filter(x => x.q > 0)
        .map(({ ci, q }) => ({
          medicao_id: med.id,
          contrato_item_id: ci.id,
          quantidade_medida: q,
          percentual_medido: ci.quantidade > 0 ? (q / ci.quantidade) * 100 : 0,
          valor_medido: q * getValorUnitarioEfetivo(ci),
          modo_lancamento: lancamentos[ci.id]?.modo === "pct" ? "porcentagem" : "quantidade",
        }));

      if (entries.length > 0) await supabase.from("medicao_boletim_itens").insert(entries);

      // Salva impostos padrão da obra como retenções dessa medição (calculado na aprovação/PDF)
      if (selectedObra?.impostos_padrao && selectedObra.impostos_padrao.length > 0) {
        await supabase.from("medicao_retencoes_impostos").insert(
          selectedObra.impostos_padrao.map(imp => ({
            medicao_id: med.id,
            imposto: imp.imposto,
            aliquota: imp.aliquota,
            valor: subtotalLancamento * (imp.aliquota / 100),
          }))
        );
      }

      toast({ title: "Medição salva como rascunho", description: "Aprove na aba Planilha/Histórico para enviar ao financeiro." });
      setLancamentos({});
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ============ APROVAR ============
  const handleAprovar = async (m: Medicao) => {
    if (m.status === "aprovada") { toast({ title: "Já aprovada" }); return; }
    if (!confirm(`Aprovar Medição #${String(m.numero).padStart(3, "0")} e gerar conta a receber de ${fmtBRL(m.valor_liquido)}?`)) return;

    try {
      // Cria conta a receber
      const { data: cr, error: crErr } = await supabase.from("contas_receber").insert({
        empresa_id: m.empresa_id,
        obra_id: m.obra_id,
        cliente: selectedObra?.cliente || selectedObra?.construtora || "Cliente",
        descricao: `Medição #${String(m.numero).padStart(3, "0")} - ${selectedObra?.codigo} ${selectedObra?.nome}`,
        categoria: "Medição de Obra",
        valor: m.valor_liquido,
        data_vencimento: m.periodo_fim,
        status: "pendente",
        documento: `MED-${String(m.numero).padStart(3, "0")}`,
        observacoes: m.observacoes || "",
      }).select().single();
      if (crErr) throw crErr;

      await supabase.from("medicoes").update({
        status: "aprovada",
        aprovado_em: new Date().toISOString(),
        aprovado_por: "Sistema",
        conta_receber_id: cr.id,
      }).eq("id", m.id);

      toast({ title: "Medição aprovada", description: "Conta a receber criada no financeiro." });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao aprovar", description: err.message, variant: "destructive" });
    }
  };

  // ============ EXCLUIR ============
  const handleExcluir = async (m: Medicao) => {
    if (m.status === "aprovada") {
      if (!confirm("Esta medição foi aprovada e gerou conta a receber. Excluir mesmo assim removerá a conta financeira. Continuar?")) return;
      if (m.conta_receber_id) await supabase.from("contas_receber").delete().eq("id", m.conta_receber_id);
    } else {
      if (!confirm(`Excluir Medição #${String(m.numero).padStart(3, "0")}?`)) return;
    }
    await supabase.from("medicao_boletim_itens").delete().eq("medicao_id", m.id);
    await supabase.from("medicao_retencoes_impostos").delete().eq("medicao_id", m.id);
    await supabase.from("medicoes").delete().eq("id", m.id);
    toast({ title: "Medição excluída" });
    loadData();
  };

  // ============ EDITAR ============
  const openEditMedicao = (m: Medicao) => {
    if (m.status === "aprovada") {
      toast({ title: "Não é possível editar uma medição aprovada", variant: "destructive" });
      return;
    }
    setEditingMedicao(m);
    setEditForm({ percentual_retencao: m.percentual_retencao, observacoes: m.observacoes || "" });
    const lancs: Record<string, { modo: ModoLanc; valor: number }> = {};
    (boletimItens[m.id] || []).forEach(bi => {
      lancs[bi.contrato_item_id] = {
        modo: bi.modo_lancamento === "porcentagem" ? "pct" : "und",
        valor: bi.modo_lancamento === "porcentagem" ? bi.percentual_medido : bi.quantidade_medida,
      };
    });
    setEditLancamentos(lancs);
  };

  const subtotalEdit = useMemo(() => {
    return contratoItens.reduce((s, ci) => s + calcularQtd(ci, editLancamentos[ci.id]) * getValorUnitarioEfetivo(ci), 0);
  }, [editLancamentos, contratoItens, fatorReajuste, acumuladoAnterior]);

  const handleSalvarEdicao = async () => {
    if (!editingMedicao) return;
    try {
      const vRet = subtotalEdit * (editForm.percentual_retencao / 100);
      await supabase.from("medicao_boletim_itens").delete().eq("medicao_id", editingMedicao.id);
      const entries = contratoItens
        .map(ci => ({ ci, q: calcularQtd(ci, editLancamentos[ci.id]) }))
        .filter(x => x.q > 0)
        .map(({ ci, q }) => ({
          medicao_id: editingMedicao.id,
          contrato_item_id: ci.id,
          quantidade_medida: q,
          percentual_medido: ci.quantidade > 0 ? (q / ci.quantidade) * 100 : 0,
          valor_medido: q * ci.valor_unitario,
          modo_lancamento: editLancamentos[ci.id]?.modo === "pct" ? "porcentagem" : "quantidade",
        }));
      if (entries.length > 0) await supabase.from("medicao_boletim_itens").insert(entries);

      await supabase.from("medicoes").update({
        valor_bruto: subtotalEdit,
        percentual_retencao: editForm.percentual_retencao,
        valor_retencao: vRet,
        valor_liquido: subtotalEdit - vRet,
        observacoes: editForm.observacoes,
      }).eq("id", editingMedicao.id);

      toast({ title: "Medição atualizada" });
      setEditingMedicao(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // ============ PDF ============
  const handlePDF = async (m: Medicao) => {
    if (!selectedObra || !empresa) { toast({ title: "Carregando dados...", variant: "destructive" }); return; }
    const { data: impostos } = await supabase.from("medicao_retencoes_impostos").select("*").eq("medicao_id", m.id);

    // Acumulado anterior REAL (excluindo essa medição)
    const accAnt: Record<string, number> = {};
    for (const ci of contratoItens) accAnt[ci.id] = ci.quantidade_acumulada_inicial || 0;
    Object.entries(boletimItens).forEach(([medId, itens]) => {
      const med = medicoes.find(x => x.id === medId);
      if (!med || med.numero >= m.numero) return;
      itens.forEach(bi => { accAnt[bi.contrato_item_id] = (accAnt[bi.contrato_item_id] || 0) + bi.quantidade_medida; });
    });

    const itensMedicao = boletimItens[m.id] || [];
    const itensPdf = contratoItens.map(ci => {
      const bi = itensMedicao.find(b => b.contrato_item_id === ci.id);
      const qtdAtual = bi?.quantidade_medida || 0;
      const qtdAnt = accAnt[ci.id] || 0;
      const qtdAcum = qtdAnt + qtdAtual;
      return {
        item_numero: ci.item_numero,
        descricao: ci.descricao,
        unidade: ci.unidade,
        quantidade_contrato: ci.quantidade,
        valor_unitario: ci.valor_unitario,
        quantidade_anterior: qtdAnt,
        quantidade_atual: qtdAtual,
        quantidade_acumulada: qtdAcum,
        saldo_qtd: ci.quantidade - qtdAcum,
        valor_atual: qtdAtual * ci.valor_unitario,
        valor_acumulado: qtdAcum * ci.valor_unitario,
        saldo_valor: (ci.quantidade - qtdAcum) * ci.valor_unitario,
        percentual_acumulado: ci.quantidade > 0 ? (qtdAcum / ci.quantidade) * 100 : 0,
      };
    }).filter(it => it.quantidade_atual > 0 || it.quantidade_anterior > 0);

    await gerarPlanilhaMedicaoPdf({
      empresa,
      obra: selectedObra,
      medicao: m,
      itens: itensPdf,
      impostos: (impostos || []).map((i: any) => ({ imposto: i.imposto, aliquota: i.aliquota, valor: i.valor })),
    });
  };

  const setLanc = (
    setter: (fn: (l: Record<string, { modo: ModoLanc; valor: number }>) => Record<string, { modo: ModoLanc; valor: number }>) => void,
    id: string, patch: Partial<{ modo: ModoLanc; valor: number }>
  ) => {
    setter(l => ({ ...l, [id]: { modo: l[id]?.modo || "und", valor: l[id]?.valor || 0, ...patch } }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
              <Calculator className="h-8 w-8 text-emerald-500" /> Planilha de Contratos
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 bg-white p-4 rounded-3xl border shadow-sm">
            <Label className="px-1 text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Obra Alvo</Label>
            <Select value={selectedObraId} onValueChange={setSelectedObraId}>
              <SelectTrigger className="border-none shadow-none font-black text-xl text-slate-800 bg-slate-50 h-14 rounded-2xl px-6"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl border-none">
                {obras.map(o => <SelectItem key={o.id} value={o.id} className="font-bold">{o.codigo} - {o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-3xl border-none bg-slate-900 text-white shadow-lg"><CardContent className="p-5">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Contrato</p>
              <p className="text-sm font-black truncate">{fmtBRL(totalContrato)}</p>
            </CardContent></Card>
            <Card className="rounded-3xl border-none bg-emerald-50 text-emerald-800 shadow-sm"><CardContent className="p-5">
              <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Total Medido</p>
              <p className="text-sm font-black truncate">{fmtBRL(totalMedido)}</p>
            </CardContent></Card>
            <Card className="rounded-3xl border-none bg-amber-50 text-amber-800 shadow-sm"><CardContent className="p-5">
              <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Saldo Obra</p>
              <p className="text-sm font-black truncate">{fmtBRL(totalContrato - totalMedido)}</p>
            </CardContent></Card>
            <Card className="rounded-3xl border bg-white shadow-sm"><CardContent className="p-5">
              <p className="text-[10px] font-black uppercase text-slate-300 mb-1">Retenção Padrão</p>
              <p className="text-sm font-black truncate">{Number(selectedObra?.percentual_retencao_padrao ?? 0)}%</p>
            </CardContent></Card>
          </div>
        </div>

        {selectedObraId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6 h-14 w-full max-w-md rounded-2xl border border-slate-200">
              <TabsTrigger value="medicoes" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-xs uppercase tracking-wider">Lançar Medição</TabsTrigger>
              <TabsTrigger value="planilha" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-xs uppercase tracking-wider">Planilha/Histórico</TabsTrigger>
            </TabsList>

            {/* ============ ABA LANÇAR ============ */}
            <TabsContent value="medicoes" className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden min-h-[500px]">
                <div className="p-8 bg-slate-50 border-b flex flex-col md:flex-row gap-6 md:items-end justify-between">
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Início do Período</Label>
                      <Input type="date" value={medicaoForm.periodo_inicio} onChange={e => setMedicaoForm(p => ({ ...p, periodo_inicio: e.target.value }))} className="h-12 w-44 rounded-2xl font-bold bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fim do Período</Label>
                      <Input type="date" value={medicaoForm.periodo_fim} onChange={e => setMedicaoForm(p => ({ ...p, periodo_fim: e.target.value }))} className="h-12 w-44 rounded-2xl font-bold bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Retenção (%)</Label>
                      <Input type="number" value={medicaoForm.percentual_retencao} onChange={e => setMedicaoForm(p => ({ ...p, percentual_retencao: Number(e.target.value) }))} className="h-12 w-24 rounded-2xl font-bold text-center bg-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observações do Boletim</Label>
                    <Input value={medicaoForm.observacoes} onChange={e => setMedicaoForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Ex: Medição referente ao aditivo..." className="h-12 rounded-2xl bg-white" />
                  </div>
                </div>

                <div className="overflow-x-auto" style={{ maxHeight: "65vh" }}>
                  <Table>
                    <TableHeader className="bg-white sticky top-0 z-10">
                      <TableRow className="border-b">
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest min-w-[260px]">Serviço/Descrição</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-right">Qtd Contrato</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-right">V. Unit.</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-right">V. Total</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-right bg-amber-50/50">Anterior</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-center bg-emerald-50/50 border-x border-emerald-100 min-w-[210px]">Medição Atual (UN ou %)</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-right">Saldo Qtd</TableHead>
                        <TableHead className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-right bg-rose-50/40">Saldo R$</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratoItens.map(ci => {
                        const prevQtd = acumuladoAnterior[ci.id] || 0;
                        const lanc = lancamentos[ci.id];
                        const qtdAtual = calcularQtd(ci, lanc);
                        const saldoQtd = ci.quantidade - (prevQtd + qtdAtual);
                        const valorTotal = ci.quantidade * ci.valor_unitario;
                        const valorMedidoAcum = (prevQtd + qtdAtual) * ci.valor_unitario;
                        const saldoR = valorTotal - valorMedidoAcum;
                        return (
                          <TableRow key={ci.id} className="border-b hover:bg-slate-50/40">
                            <TableCell className="px-3 py-4 font-mono text-[11px] font-bold text-blue-600">{ci.item_numero}</TableCell>
                            <TableCell className="px-3 py-4 font-bold text-slate-800 text-sm">{ci.descricao}</TableCell>
                            <TableCell className="px-3 py-4 text-right font-bold text-slate-700 text-xs">{fmtNum(ci.quantidade)} <span className="text-[9px] text-slate-400">{ci.unidade}</span></TableCell>
                            <TableCell className="px-3 py-4 text-right font-bold text-slate-700 text-xs">{fmtBRL(ci.valor_unitario)}</TableCell>
                            <TableCell className="px-3 py-4 text-right font-black text-slate-900 text-xs">{fmtBRL(valorTotal)}</TableCell>
                            <TableCell className="px-3 py-4 text-right font-bold text-amber-600 text-xs bg-amber-50/10">{fmtNum(prevQtd)}</TableCell>
                            <TableCell className="px-3 py-4 bg-emerald-50/20 border-x border-emerald-100">
                              <div className="flex gap-1.5 items-center">
                                <Select
                                  value={lanc?.modo || "und"}
                                  onValueChange={(v: ModoLanc) => setLanc(setLancamentos as any, ci.id, { modo: v })}
                                >
                                  <SelectTrigger className="h-10 w-20 rounded-xl font-black text-xs bg-white"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="und">UN</SelectItem>
                                    <SelectItem value="pct">%</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={lanc?.valor || ""}
                                  onChange={e => setLanc(setLancamentos as any, ci.id, { valor: Number(e.target.value) })}
                                  placeholder="0,00"
                                  className="h-10 rounded-xl font-black text-right text-emerald-700 bg-white"
                                />
                                <span className="text-[10px] font-black text-emerald-500 w-16 text-right">
                                  {qtdAtual > 0 ? `=${fmtNum(qtdAtual)}` : ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className={`px-3 py-4 text-right text-xs font-bold ${saldoQtd < 0 ? "text-rose-500" : "text-slate-500"}`}>{fmtNum(saldoQtd)}</TableCell>
                            <TableCell className="px-3 py-4 text-right font-black text-rose-600 text-xs bg-rose-50/20">{fmtBRL(saldoR)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-10 bg-slate-900 border-t flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-white">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Total Bruto do Boletim</p>
                    <h4 className="text-5xl font-black italic tracking-tighter">{fmtBRL(subtotalLancamento)}</h4>
                    <p className="text-[10px] text-slate-400 mt-2">Líquido (após {medicaoForm.percentual_retencao}% retenção): <span className="text-emerald-400 font-black">{fmtBRL(subtotalLancamento * (1 - medicaoForm.percentual_retencao / 100))}</span></p>
                  </div>
                  <Button disabled={isSaving || subtotalLancamento <= 0} onClick={handleSaveBatch} className="h-20 px-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-sm tracking-widest rounded-[2rem] shadow-2xl flex gap-3 active:scale-95 transition-all">
                    {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />} Salvar Rascunho
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ============ ABA HISTÓRICO ============ */}
            <TabsContent value="planilha" className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-10 border shadow-sm min-h-[400px]">
                <div className="flex items-center gap-3 mb-8">
                  <History className="text-amber-500" size={28} />
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Histórico de Boletins</h3>
                </div>

                {medicoes.length === 0 ? (
                  <p className="text-slate-400 text-center py-10">Nenhuma medição registrada ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {medicoes.map(m => {
                      const aprovada = m.status === "aprovada";
                      return (
                        <Card key={m.id} className="rounded-3xl hover:border-emerald-300 transition-all overflow-hidden border-slate-100 shadow-sm">
                          <CardContent className="p-0">
                            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                              <div>
                                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Medição #{String(m.numero).padStart(3, "0")}</h4>
                                <p className="text-[10px] font-bold text-slate-400">{format(new Date(m.periodo_inicio), "dd/MM/yy")} → {format(new Date(m.periodo_fim), "dd/MM/yy")}</p>
                              </div>
                              <Badge className={`border-none px-3 py-1 font-black text-[9px] uppercase ${aprovada ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{m.status}</Badge>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4 border-b">
                              <div><Label className="text-[9px] font-black uppercase text-slate-400">Bruto</Label>
                                <p className="text-sm font-black text-slate-800">{fmtBRL(m.valor_bruto)}</p>
                              </div>
                              <div><Label className="text-[9px] font-black uppercase text-slate-400">Líquido</Label>
                                <p className="text-sm font-black text-emerald-600">{fmtBRL(m.valor_liquido)}</p>
                              </div>
                            </div>
                            <div className="p-3 bg-slate-100 grid grid-cols-2 gap-1">
                              {!aprovada && (
                                <Button variant="ghost" size="sm" className="text-blue-600 font-bold text-[10px] gap-1" onClick={() => openEditMedicao(m)}>
                                  <Edit size={12} /> Editar
                                </Button>
                              )}
                              {!aprovada && (
                                <Button variant="ghost" size="sm" className="text-emerald-600 font-bold text-[10px] gap-1" onClick={() => handleAprovar(m)}>
                                  <FileCheck2 size={12} /> Aprovar
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="text-slate-700 font-bold text-[10px] gap-1" onClick={() => handlePDF(m)}>
                                <Download size={12} /> Planilha PDF
                              </Button>
                              <Button variant="ghost" size="sm" className="text-rose-600 font-bold text-[10px] gap-1" onClick={() => handleExcluir(m)}>
                                <Trash2 size={12} /> Excluir
                              </Button>
                            </div>
                            {aprovada && (
                              <div className="p-2 bg-emerald-50 text-[10px] text-emerald-700 font-bold text-center flex items-center justify-center gap-1">
                                <CheckCircle2 size={12} /> Enviada ao financeiro
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* ============ DIALOG EDITAR MEDIÇÃO ============ */}
        <Dialog open={!!editingMedicao} onOpenChange={(o) => !o && setEditingMedicao(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Medição #{editingMedicao && String(editingMedicao.numero).padStart(3, "0")}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Retenção (%)</Label>
                <Input type="number" value={editForm.percentual_retencao} onChange={e => setEditForm(f => ({ ...f, percentual_retencao: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={1} value={editForm.observacoes} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="overflow-x-auto border rounded-xl" style={{ maxHeight: "50vh" }}>
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd Contrato</TableHead>
                    <TableHead className="text-right">V. Unit.</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead>Atual (UN/%)</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratoItens.map(ci => {
                    const prevQ = acumuladoAnterior[ci.id] || 0;
                    const lanc = editLancamentos[ci.id];
                    const qAtual = calcularQtd(ci, lanc);
                    return (
                      <TableRow key={ci.id}>
                        <TableCell className="font-mono text-xs text-blue-600">{ci.item_numero}</TableCell>
                        <TableCell className="text-xs">{ci.descricao}</TableCell>
                        <TableCell className="text-right text-xs">{fmtNum(ci.quantidade)} {ci.unidade}</TableCell>
                        <TableCell className="text-right text-xs">{fmtBRL(ci.valor_unitario)}</TableCell>
                        <TableCell className="text-right text-xs text-amber-600">{fmtNum(prevQ)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Select value={lanc?.modo || "und"} onValueChange={(v: ModoLanc) => setLanc(setEditLancamentos as any, ci.id, { modo: v })}>
                              <SelectTrigger className="h-9 w-16 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="und">UN</SelectItem><SelectItem value="pct">%</SelectItem></SelectContent>
                            </Select>
                            <Input type="number" step="0.01" className="h-9 text-right text-xs"
                              value={lanc?.valor || ""}
                              onChange={e => setLanc(setEditLancamentos as any, ci.id, { valor: Number(e.target.value) })} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-emerald-700">{fmtBRL(qAtual * ci.valor_unitario)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl mt-4">
              <span className="text-xs font-black uppercase tracking-widest">Novo Total Bruto</span>
              <span className="text-2xl font-black">{fmtBRL(subtotalEdit)}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMedicao(null)}>Cancelar</Button>
              <Button onClick={handleSalvarEdicao}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
