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
  Calculator, RefreshCw, Download, CheckCircle2, History, Save, Trash2, Edit, FileCheck2, CalendarClock,
  Ruler, Plus, FileText, TrendingUp, DollarSign, ChevronRight, AlertCircle, LayoutGrid, ListChecks, ArrowRightLeft, Percent
} from "lucide-react";
import { format } from "date-fns";
import { gerarPlanilhaMedicaoPdf } from "@/lib/gerarPlanilhaMedicaoPdf";

// Formatadores Premium
const fCur = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fNum = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fPct = (v: any) => {
  const val = Number(v) || 0;
  return val > 0 ? `${val.toFixed(2)}%` : "0,00%";
};

interface Obra {
  id: string; nome: string; codigo: string; empresa_id: string;
  status?: string;
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
  condicoes_medicao?: any;
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
  data_previsao_recebimento?: string | null;
}
interface BoletimItem {
  id?: string; medicao_id?: string; contrato_item_id: string;
  quantidade_medida: number; percentual_medido: number; valor_medido: number;
  modo_lancamento: string; observacoes?: string;
  etapa_medida?: string;
}

type ModoLanc = "und" | "pct" | "etapa";

export default function Medicoes() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [isLoadingObras, setIsLoadingObras] = useState(true);
  const [obrasError, setObrasError] = useState("");
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

  const [lancamentosAtuais, setLancamentosAtuais] = useState<Record<string, number>>({});
  const [etapasLancadas, setEtapasLancadas] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [editingMedicao, setEditingMedicao] = useState<Medicao | null>(null);
  const [editLancamentos, setEditLancamentos] = useState<Record<string, { modo: ModoLanc; valor: number }>>({});
  const [editForm, setEditForm] = useState({ percentual_retencao: 5, observacoes: "" });

  const [previsaoMedicao, setPrevisaoMedicao] = useState<Medicao | null>(null);
  const [previsaoData, setPrevisaoData] = useState("");
  const [previsaoSaving, setPrevisaoSaving] = useState(false);

  const sugerirDataPrevisao = (periodoFim: string): string => {
    if (!periodoFim) return "";
    const d = new Date(periodoFim + "T00:00:00");
    const prox = new Date(d.getFullYear(), d.getMonth() + 1, 10);
    return format(prox, "yyyy-MM-dd");
  };

  const abrirPrevisao = (m: Medicao) => {
    setPrevisaoMedicao(m);
    setPrevisaoData(m.data_previsao_recebimento || sugerirDataPrevisao(m.periodo_fim));
  };

  const salvarPrevisao = async () => {
    if (!previsaoMedicao) return;
    setPrevisaoSaving(true);
    try {
      await supabase.from("medicoes").update({ data_previsao_recebimento: previsaoData || null }).eq("id", previsaoMedicao.id);
      if (previsaoMedicao.conta_receber_id && previsaoData) {
        await supabase.from("contas_receber").update({ data_vencimento: previsaoData }).eq("id", previsaoMedicao.conta_receber_id);
      }
      toast({ title: "Previsão de recebimento salva" });
      setPrevisaoMedicao(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar previsão", description: err.message, variant: "destructive" });
    } finally {
      setPrevisaoSaving(false);
    }
  };

  const selectedObra = obras.find(o => o.id === selectedObraId);
  const [totaisObras, setTotaisObras] = useState<Record<string, { contrato: number; medido: number }>>({});

  const loadObrasEmExecucao = async () => {
    setIsLoadingObras(true);
    setObrasError("");
    const fullCols = "id,nome,codigo,empresa_id,status,construtora,cliente,cidade,uf,endereco,percentual_retencao_padrao,impostos_padrao";
    let { data, error } = await supabase.from("obras").select(fullCols).order("codigo", { ascending: true });
    if (error) {
       const fb = await supabase.from("obras").select("id,nome,codigo,empresa_id,status,construtora,cliente,cidade,uf,endereco").order("codigo", { ascending: true });
       data = fb.data as any;
       error = fb.error;
    }
    if (error) {
      setObras([]);
      setObrasError("Não foi possível carregar as obras.");
    } else {
      const all = (data || []) as Obra[];
      setObras(all);
      loadTotaisObras(all.map(o => o.id));
    }
    setIsLoadingObras(false);
  };

  const loadTotaisObras = async (obraIds: string[]) => {
    if (obraIds.length === 0) { setTotaisObras({}); return; }
    const [itensRes, medRes] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("obra_id,quantidade,valor_unitario,valor_total,quantidade_acumulada_inicial").in("obra_id", obraIds),
      supabase.from("medicoes").select("obra_id,valor_bruto").in("obra_id", obraIds),
    ]);
    const tot: Record<string, { contrato: number; medido: number }> = {};
    obraIds.forEach(id => tot[id] = { contrato: 0, medido: 0 });
    (itensRes.data || []).forEach((i: any) => {
      const v = Number(i.valor_total) || (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0);
      tot[i.obra_id].contrato += v;
      tot[i.obra_id].medido += (Number(i.quantidade_acumulada_inicial) || 0) * (Number(i.valor_unitario) || 0);
    });
    (medRes.data || []).forEach((m: any) => {
      tot[m.obra_id].medido += Number(m.valor_bruto) || 0;
    });
    setTotaisObras(tot);
  };

  useEffect(() => { loadObrasEmExecucao(); }, []);

  useEffect(() => {
    if (!selectedObraId) return;
    loadData();
    if (selectedObra) {
      setMedicaoForm(p => ({ ...p, percentual_retencao: Number(selectedObra.percentual_retencao_padrao ?? 5) }));
      supabase.from("empresas").select("*").eq("id", selectedObra.empresa_id).maybeSingle().then(({ data }) => setEmpresa(data));
    }
  }, [selectedObraId]);

  const sortByItemNumero = (a: any, b: any) => {
    const pa = String(a.item_numero || "").split(".").map((p: string) => parseInt(p, 10) || p);
    const pb = String(b.item_numero || "").split(".").map((p: string) => parseInt(p, 10) || p);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      if (pa[i] === undefined) return -1;
      if (pb[i] === undefined) return 1;
      if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
    }
    return 0;
  };

  const loadData = async () => {
    const [c, m, r] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("*").eq("obra_id", selectedObraId),
      supabase.from("medicoes").select("*").eq("obra_id", selectedObraId).order("numero", { ascending: false }),
      supabase.from("medicao_reajustes").select("*").eq("obra_id", selectedObraId).order("data_aplicacao"),
    ]);
    if (c.data) setContratoItens(([...c.data] as any[]).sort(sortByItemNumero));
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

  const acumuladoAnterior = useMemo(() => {
    const acc: Record<string, { qtd: number; etiquetas: string[] }> = {};
    for (const ci of contratoItens) {
       acc[ci.id] = { qtd: Number(ci.quantidade_acumulada_inicial) || 0, etiquetas: [] };
    }
    Object.entries(boletimItens).forEach(([medId, itens]) => {
      if (editingMedicao && medId === editingMedicao.id) return;
      itens.forEach(bi => { 
         if (acc[bi.contrato_item_id]) {
           acc[bi.contrato_item_id].qtd += bi.quantidade_medida;
           if (bi.etapa_medida) acc[bi.contrato_item_id].etiquetas.push(...bi.etapa_medida.split(", "));
         }
      });
    });
    return acc;
  }, [boletimItens, contratoItens, editingMedicao]);

  const subtotalAtual = useMemo(() => {
    return Object.entries(lancamentosAtuais).reduce((s, [id, q]) => {
      const ci = contratoItens.find(c => c.id === id);
      return s + (q * (ci?.valor_unitario || 0));
    }, 0);
  }, [lancamentosAtuais, contratoItens]);

  const totalContrato = contratoItens.reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
  const totalMedido = Object.values(boletimItens).reduce((s, itens) => s + itens.reduce((ss, i) => ss + i.valor_medido, 0), 0);

  const handleQtyChange = (itemId: string, qty: number) => {
    setLancamentosAtuais(prev => ({ ...prev, [itemId]: qty }));
  };

  const handlePctChange = (itemId: string, pct: number) => {
    const ci = contratoItens.find(c => c.id === itemId);
    if (!ci) return;
    const qty = ci.quantidade * (pct / 100);
    setLancamentosAtuais(prev => ({ ...prev, [itemId]: qty }));
  };

  const toggleEtapa = (itemId: string, etapa: string, percentual: number, checked: boolean) => {
    const ci = contratoItens.find(c => c.id === itemId);
    if (!ci) return;
    setEtapasLancadas(prev => {
       const current = prev[itemId] || [];
       const next = checked ? [...current, etapa] : current.filter(e => e !== etapa);
       const qTotal = ci.quantidade * (percentual / 100);
       setLancamentosAtuais(l => ({ ...l, [itemId]: (l[itemId] || 0) + (checked ? qTotal : -qTotal) }));
       return { ...prev, [itemId]: next };
    });
  };

  const handleSaveMedicao = async () => {
    if (!selectedObraId || subtotalAtual <= 0) {
      toast({ title: "Nenhum valor para lançar", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const vRet = subtotalAtual * (medicaoForm.percentual_retencao / 100);
      const { data: med, error: mErr } = await supabase.from("medicoes").insert({
        obra_id: selectedObraId,
        empresa_id: selectedObra?.empresa_id || "",
        numero: medicoes.length + 1,
        periodo_inicio: medicaoForm.periodo_inicio,
        periodo_fim: medicaoForm.periodo_fim,
        data_emissao: format(new Date(), "yyyy-MM-dd"),
        valor_bruto: subtotalAtual,
        percentual_retencao: medicaoForm.percentual_retencao,
        valor_retencao: vRet,
        valor_liquido: subtotalAtual - vRet,
        status: "rascunho",
        observacoes: medicaoForm.observacoes,
      }).select().single();
      if (mErr) throw mErr;

      const entries = Object.entries(lancamentosAtuais).filter(([_, q]) => q > 0).map(([id, q]) => {
          const ci = contratoItens.find(c => c.id === id);
          return {
            medicao_id: med.id,
            contrato_item_id: id,
            quantidade_medida: q,
            percentual_medido: ci && ci.quantidade > 0 ? (q / ci.quantidade) * 100 : 0,
            valor_medido: q * (ci?.valor_unitario || 0),
            modo_lancamento: (etapasLancadas[id] || []).length > 0 ? "etapa" : "quantidade",
            etapa_medida: (etapasLancadas[id] || []).join(", ")
          };
      });

      if (entries.length > 0) await supabase.from("medicao_boletim_itens").insert(entries);

      if (selectedObra?.impostos_padrao && selectedObra.impostos_padrao.length > 0) {
        await supabase.from("medicao_retencoes_impostos").insert(
          selectedObra.impostos_padrao.map(imp => ({
            medicao_id: med.id,
            imposto: imp.imposto,
            aliquota: imp.aliquota,
            valor: subtotalAtual * (imp.aliquota / 100),
          }))
        );
      }

      toast({ title: "Medição salva", description: "Acesse o histórico para aprovar." });
      setLancamentosAtuais({});
      setEtapasLancadas({});
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAprovar = async (m: Medicao) => {
    if (m.status === "aprovada") return;
    if (!confirm(`Aprovar Medição #${m.numero}?`)) return;
    try {
      const { data: cr } = await supabase.from("contas_receber").insert({
        empresa_id: m.empresa_id,
        obra_id: m.obra_id,
        cliente: selectedObra?.cliente || "Cliente",
        descricao: `Medição #${m.numero} - ${selectedObra?.nome}`,
        categoria: "Medição de Obra",
        valor: m.valor_liquido,
        data_vencimento: m.data_previsao_recebimento || m.periodo_fim,
        status: "pendente",
        documento: `MED-${m.numero}`,
      }).select().single();

      await supabase.from("medicoes").update({
        status: "aprovada",
        aprovado_em: new Date().toISOString(),
        conta_receber_id: cr?.id,
      }).eq("id", m.id);

      toast({ title: "Medição aprovada!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao aprovar", description: err.message, variant: "destructive" });
    }
  };

  const handleExcluir = async (m: Medicao) => {
    if (!confirm("Excluir esta medição?")) return;
    await supabase.from("medicao_boletim_itens").delete().eq("medicao_id", m.id);
    await supabase.from("medicoes").delete().eq("id", m.id);
    toast({ title: "Medição excluída" });
    loadData();
  };

  const handlePDF = async (m: Medicao) => {
    if (!selectedObra || !empresa) return;
    const { data: imp } = await supabase.from("medicao_retencoes_impostos").select("*").eq("medicao_id", m.id);
    
    const accAnt: Record<string, number> = {};
    for (const ci of contratoItens) accAnt[ci.id] = ci.quantidade_acumulada_inicial || 0;
    Object.entries(boletimItens).forEach(([medId, itens]) => {
      const med = medicoes.find(x => x.id === medId);
      if (!med || med.numero >= m.numero) return;
      itens.forEach(bi => { accAnt[bi.contrato_item_id] = (accAnt[bi.contrato_item_id] || 0) + bi.quantidade_medida; });
    });

    const itensPdf = contratoItens.map(ci => {
      const bi = (boletimItens[m.id] || []).find(b => b.contrato_item_id === ci.id);
      const qAtual = bi?.quantidade_medida || 0;
      const qAnt = accAnt[ci.id] || 0;
      const qAcum = qAnt + qAtual;
      return {
        item_numero: ci.item_numero,
        descricao: ci.descricao,
        unidade: ci.unidade,
        quantidade_contrato: ci.quantidade,
        valor_unitario: ci.valor_unitario,
        quantidade_anterior: qAnt,
        quantidade_atual: qAtual,
        quantidade_acumulada: qAcum,
        saldo_qtd: ci.quantidade - qAcum,
        valor_atual: qAtual * ci.valor_unitario,
        valor_acumulado: qAcum * ci.valor_unitario,
        saldo_valor: (ci.quantidade - qAcum) * ci.valor_unitario,
        percentual_acumulado: ci.quantidade > 0 ? (qAcum / ci.quantidade) * 100 : 0,
      };
    }).filter(it => it.quantidade_atual > 0 || it.quantidade_anterior > 0);

    await gerarPlanilhaMedicaoPdf({
      empresa,
      obra: selectedObra,
      medicao: m,
      itens: itensPdf,
      impostos: (imp || []).map((i: any) => ({ imposto: i.imposto, aliquota: i.aliquota, valor: i.valor })),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border shadow-sm">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
               <Calculator size={24} />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">Boletim de Medição</h1>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">{selectedObra?.nome || "Selecione uma obra"}</p>
             </div>
          </div>
          <div className="w-72">
             <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                <SelectTrigger className="border-none bg-slate-50 h-12 rounded-xl font-bold text-slate-600"><SelectValue placeholder="Obra..." /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                   {obras.map(o => <SelectItem key={o.id} value={o.id} className="font-bold">{o.codigo} - {o.nome}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>
        </div>

        {selectedObraId && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Contrato", val: fCur(totalContrato), icon: <DollarSign size={14} />, color: "bg-slate-900 text-white" },
                { label: "Medido", val: fCur(totalMedido), icon: <TrendingUp size={14} />, color: "bg-emerald-50 text-emerald-700" },
                { label: "Saldo", val: fCur(totalContrato - totalMedido), icon: <AlertCircle size={14} />, color: "bg-amber-50 text-amber-700" },
                { label: "Progresso", val: fPct((totalMedido / totalContrato) * 100), icon: <Percent size={14} />, color: "bg-blue-50 text-blue-700" },
              ].map((k, i) => (
                <Card key={i} className={`rounded-[1.5rem] border-none shadow-sm ${k.color}`}>
                  <CardContent className="p-4 flex flex-col justify-center">
                    <p className="text-[9px] font-black uppercase opacity-60 mb-1 flex items-center gap-2">{k.icon} {k.label}</p>
                    <p className="text-lg font-black tracking-tighter truncate">{k.val}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4">
                 <TabsList className="bg-slate-100 p-1 h-12 rounded-2xl border border-slate-200 w-80">
                    <TabsTrigger value="medicoes" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-wider"><ListChecks size={14} /> Lançar</TabsTrigger>
                    <TabsTrigger value="planilha" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-wider"><History size={14} /> Histórico</TabsTrigger>
                 </TabsList>
                 {activeTab === "medicoes" && (
                    <div className="flex gap-3">
                       <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Início</Label>
                          <Input type="date" value={medicaoForm.periodo_inicio} onChange={e => setMedicaoForm(p => ({ ...p, periodo_inicio: e.target.value }))} className="h-8 w-32 border-none font-bold text-xs p-0 focus-visible:ring-0" />
                       </div>
                       <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Fim</Label>
                          <Input type="date" value={medicaoForm.periodo_fim} onChange={e => setMedicaoForm(p => ({ ...p, periodo_fim: e.target.value }))} className="h-8 w-32 border-none font-bold text-xs p-0 focus-visible:ring-0" />
                       </div>
                    </div>
                 )}
              </div>

              <TabsContent value="medicoes" className="m-0 space-y-4">
                 <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                    <div className="p-0 flex-1 overflow-x-auto">
                      <Table className="border-collapse">
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-b border-slate-100">
                             <TableHead className="w-16 px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</TableHead>
                             <TableHead className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Serviço/Critério</TableHead>
                             <TableHead className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Contrato</TableHead>
                             <TableHead className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Anterior</TableHead>
                             <TableHead className="w-[340px] px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center bg-emerald-50/20">Lançamento Atual</TableHead>
                             <TableHead className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contratoItens.map(ci => {
                            const prev = acumuladoAnterior[ci.id] || { qtd: 0, etiquetas: [] };
                            const agoraQtd = lancamentosAtuais[ci.id] || 0;
                            const agoraPct = (agoraQtd / (ci.quantidade || 1)) * 100;
                            const saldo = ci.quantidade - (prev.qtd + agoraQtd);
                            const milestones = ci.condicoes_medicao || [];

                            return (
                               <TableRow key={ci.id} className="group border-b border-slate-50 hover:bg-slate-50/30 transition-all">
                                  <TableCell className="px-6 py-4 font-mono text-[9px] font-bold text-blue-500/50">{ci.item_numero}</TableCell>
                                  <TableCell className="px-6 py-4">
                                     <div className="flex flex-col gap-2">
                                        <span className="font-bold text-slate-700 text-sm">{ci.descricao}</span>
                                        {Array.isArray(milestones) && milestones.length > 0 && (
                                           <div className="flex flex-wrap gap-1.5">
                                              {milestones.map((m: any, idx: number) => {
                                                 const completed = prev.etiquetas.includes(m.etapa);
                                                 const active = (etapasLancadas[ci.id] || []).includes(m.etapa);
                                                 return (
                                                    <button 
                                                      key={idx} 
                                                      disabled={completed} 
                                                      onClick={() => toggleEtapa(ci.id, m.etapa, m.percentual, !active)}
                                                      className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase transition-all flex items-center gap-1 ${
                                                         completed ? "bg-slate-50 text-slate-200 border-slate-100" :
                                                         active ? "bg-emerald-600 text-white border-emerald-600 shadow-md" :
                                                         "bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                                                      }`}
                                                    >
                                                       {completed ? <CheckCircle2 size={10} /> : <div className={`w-1 h-1 rounded-full ${active ? 'bg-white' : 'bg-slate-300'}`} />}
                                                       {m.etapa} ({m.percentual}%)
                                                    </button>
                                                 );
                                              })}
                                           </div>
                                        )}
                                     </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-right">
                                     <p className="text-xs font-black text-slate-800">{fNum(ci.quantidade)}</p>
                                     <p className="text-[8px] font-black text-slate-300 uppercase">{ci.unidade}</p>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-right">
                                     <p className="text-xs font-bold text-amber-600">{fNum(prev.qtd)}</p>
                                     <p className="text-[8px] font-black text-amber-200 uppercase">{fPct((prev.qtd / ci.quantidade) * 100)}</p>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 bg-emerald-50/5">
                                     <div className="flex items-center gap-2 max-w-xs mx-auto">
                                        <div className="relative flex-1">
                                           <Input 
                                             type="number" 
                                             value={agoraQtd || ""} 
                                             onChange={e => handleQtyChange(ci.id, Number(e.target.value))} 
                                             className="h-10 text-right pr-8 font-black text-xs rounded-xl border-slate-200 bg-white"
                                             placeholder="Qtd"
                                           />
                                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">{ci.unidade}</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="relative flex-1">
                                           <Input 
                                             type="number" 
                                             value={agoraPct ? Number(agoraPct.toFixed(2)) : ""} 
                                             onChange={e => handlePctChange(ci.id, Number(e.target.value))} 
                                             className="h-10 text-center pr-6 font-black text-xs rounded-xl border-slate-200 bg-white"
                                             placeholder="%"
                                           />
                                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">%</span>
                                        </div>
                                     </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 text-right">
                                     <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${saldo < 0 ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-white text-slate-400 border-slate-100"}`}>{fNum(saldo)}</span>
                                  </TableCell>
                               </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="p-8 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 border-t-4 border-emerald-500/20 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
                       <div className="flex items-center gap-6">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total do Boletim</p>
                             <h4 className="text-4xl font-black italic text-white tracking-tighter">{fCur(subtotalAtual)}</h4>
                          </div>
                          <div className="h-10 w-px bg-slate-800" />
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Líquido Estimado</p>
                             <h4 className="text-4xl font-black italic text-emerald-400 tracking-tighter">{fCur(subtotalAtual * (1 - (medicaoForm.percentual_retencao / 100)))}</h4>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4">
                          <Input 
                            value={medicaoForm.observacoes} 
                            onChange={e => setMedicaoForm(p => ({ ...p, observacoes: e.target.value }))} 
                            placeholder="Notas..." 
                            className="h-14 md:w-80 bg-slate-800 border-slate-700 text-white rounded-2xl placeholder:text-slate-600 focus:ring-emerald-500 text-xs"
                          />
                          <Button 
                            disabled={isSaving || subtotalAtual <= 0} 
                            onClick={handleSaveMedicao}
                            className="h-16 px-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-emerald-500/20 gap-3 active:scale-95 transition-all"
                          >
                             {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
                             Salvar Medição
                          </Button>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="planilha" className="m-0 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {medicoes.map(m => (
                       <Card key={m.id} className="rounded-[1.5rem] border-slate-100 hover:border-emerald-300 transition-all group bg-white shadow-sm overflow-hidden">
                          <CardContent className="p-0">
                             <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <div>
                                   <Badge className={`border-none font-black text-[9px] mb-1 ${m.status === 'aprovada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>BOLETIM #{String(m.numero).padStart(3, '0')} - {m.status.toUpperCase()}</Badge>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(m.periodo_inicio), "dd/MM")} » {format(new Date(m.periodo_fim), "dd/MM")}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-black text-slate-800">{fCur(m.valor_bruto)}</p>
                                   <p className="text-[9px] font-bold text-emerald-600">Líquido: {fCur(m.valor_liquido)}</p>
                                </div>
                             </div>
                             <div className="p-4 grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] gap-2 h-9 border-slate-100" onClick={() => handlePDF(m)}><Download size={14} /> PDF</Button>
                                {m.status !== 'aprovada' && (
                                   <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[10px] gap-2 h-9 text-emerald-600" onClick={() => handleAprovar(m)}><FileCheck2 size={14} /> Aprovar</Button>
                                )}
                                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[10px] gap-2 h-9 text-rose-500" onClick={() => handleExcluir(m)}><Trash2 size={14} /> Excluir</Button>
                             </div>
                          </CardContent>
                       </Card>
                    ))}
                 </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
