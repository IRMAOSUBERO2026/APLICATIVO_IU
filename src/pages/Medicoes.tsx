import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Ruler, Plus, FileText, TrendingUp, Calculator,
  Trash2, Edit, RefreshCw, Download, DollarSign,
  ChevronRight, CheckCircle2, History, Save, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

// Types
interface Obra { id: string; nome: string; codigo: string; empresa_id: string; construtora?: string; cidade?: string; uf?: string; }
interface ContratoItem {
  id: string; obra_id: string; empresa_id: string; item_numero: string; descricao: string;
  unidade: string; quantidade: number; valor_unitario: number; valor_total: number;
  is_aditivo: boolean; aditivo_numero?: number; aditivo_data?: string; observacoes?: string;
  categoria?: string;
  quantidade_acumulada_inicial: number;
  condicoes_medicao: any[];
}
interface Medicao {
  id: string; obra_id: string; numero: number; periodo_inicio: string; periodo_fim: string;
  data_emissao: string; valor_bruto: number; percentual_retencao: number;
  valor_retencao: number; valor_liquido: number; status: string; observacoes?: string;
}
interface BoletimItem {
  id?: string; medicao_id?: string; contrato_item_id: string;
  quantidade_medida: number; percentual_medido: number; valor_medido: number;
  modo_lancamento: string; observacoes?: string; etapa_medida?: string;
}

const fmtBRL = (v: any) => {
  const val = Number(v) || 0;
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const fmtNum = (v: any) => {
  const val = Number(v) || 0;
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPct = (v: any) => {
  const val = Number(v) || 0;
  return val > 0 ? `${val.toFixed(2)}%` : "";
};

export default function Medicoes() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [boletimItens, setBoletimItens] = useState<Record<string, BoletimItem[]>>({});
  const [activeTab, setActiveTab] = useState("medicoes");
  
  // States para Lançamento (Aba Medições)
  const [medicaoHeader, setMedicaoHeader] = useState({ 
    periodo_inicio: format(new Date(), "yyyy-MM-01"), 
    periodo_fim: format(new Date(), "yyyy-MM-dd"),
    percentual_retencao: 5,
    observacoes: "" 
  });
  const [lancamentosAtuais, setLancamentosAtuais] = useState<Record<string, number>>({});
  const [etapasLancadas, setEtapasLancadas] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const selectedObra = obras.find(o => o.id === selectedObraId);

  useEffect(() => {
    supabase.from("obras").select("id,nome,codigo,empresa_id,construtora,cidade,uf").then(({ data }) => {
      if (data) setObras(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedObraId) return;
    loadData();
  }, [selectedObraId]);

  const loadData = async () => {
    const [c, m] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("*").eq("obra_id", selectedObraId).order("item_numero"),
      supabase.from("medicoes").select("*").eq("obra_id", selectedObraId).order("numero", { ascending: false })
    ]);
    
    if (c.data) setContratoItens(c.data as any[]);
    if (m.data && m.data.length > 0) {
       setMedicoes(m.data as Medicao[]);
       // Carrega todos os itens de todas as medições para calcular acumulado
       const medIds = m.data.map(med => med.id);
       const { data: allItems } = await supabase.from("medicao_boletim_itens").select("*").in("medicao_id", medIds);
       
       const bMap: Record<string, BoletimItem[]> = {};
       if (allItems) {
          allItems.forEach((bi: any) => {
             if (!bMap[bi.medicao_id]) bMap[bi.medicao_id] = [];
             bMap[bi.medicao_id].push(bi);
          });
       }
       setBoletimItens(bMap);
    } else {
       setMedicoes([]);
       setBoletimItens({});
    }
  };

  const acumuladoAnterior = useMemo(() => {
    const acc: Record<string, { qtd: number; valor: number; etapas: string[] }> = {};
    for (const ci of contratoItens) {
       acc[ci.id] = { 
         qtd: ci.quantidade_acumulada_inicial || 0, 
         valor: (ci.quantidade_acumulada_inicial || 0) * ci.valor_unitario,
         etapas: []
       };
    }
    Object.values(boletimItens).forEach(itens => {
       itens.forEach(bi => {
          if (!acc[bi.contrato_item_id]) return;
          acc[bi.contrato_item_id].qtd += bi.quantidade_medida;
          acc[bi.contrato_item_id].valor += bi.valor_medido;
          if (bi.etapa_medida) {
             const etapas = bi.etapa_medida.split(", ");
             acc[bi.contrato_item_id].etapas.push(...etapas);
          }
       });
    });
    return acc;
  }, [boletimItens, contratoItens]);

  const valorTotalContrato = contratoItens.reduce((s, i) => s + i.valor_total, 0);
  const valorTotalMedido = Object.values(boletimItens).reduce((s, itens) => s + itens.reduce((ss, i) => ss + i.valor_medido, 0), 0);
  const valorSubtotalMedicaoAtual = Object.entries(lancamentosAtuais).reduce((s, [id, q]) => s + (q * (contratoItens.find(c => c.id === id)?.valor_unitario || 0)), 0);

  const toggleEtapa = (itemId: string, etapa: string, percentual: number, checked: boolean) => {
     const ci = contratoItens.find(c => c.id === itemId);
     if (!ci) return;
     setEtapasLancadas(prev => {
        const current = prev[itemId] || [];
        const next = checked ? [...current, etapa] : current.filter(e => e !== etapa);
        const diffQtd = (ci.quantidade * (percentual / 100)) * (checked ? 1 : -1);
        setLancamentosAtuais(l => ({ ...l, [itemId]: (l[itemId] || 0) + diffQtd }));
        return { ...prev, [itemId]: next };
     });
  };

  const handleSalvarMedicao = async () => {
    if (!selectedObraId || valorSubtotalMedicaoAtual <= 0) {
      toast({ title: "Nenhum valor lançado", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const vRet = valorSubtotalMedicaoAtual * (medicaoHeader.percentual_retencao / 100);
      const { data: med, error: mErr } = await supabase.from("medicoes").insert({
        obra_id: selectedObraId,
        empresa_id: selectedObra?.empresa_id || "",
        numero: medicoes.length + 1,
        periodo_inicio: medicaoHeader.periodo_inicio,
        periodo_fim: medicaoHeader.periodo_fim,
        data_emissao: new Date().toISOString().split("T")[0],
        valor_bruto: valorSubtotalMedicaoAtual,
        percentual_retencao: medicaoHeader.percentual_retencao,
        valor_retencao: vRet,
        valor_liquido: valorSubtotalMedicaoAtual - vRet,
        status: "emitida",
        observacoes: medicaoHeader.observacoes
      }).select().single();

      if (mErr) throw mErr;

      const itensPayload = Object.entries(lancamentosAtuais)
        .filter(([_, qtd]) => qtd > 0)
        .map(([id, qtd]) => {
          const ci = contratoItens.find(c => c.id === id);
          return {
            medicao_id: med.id,
            contrato_item_id: id,
            quantidade_medida: qtd,
            percentual_medido: (qtd / (ci?.quantidade || 1)) * 100,
            valor_medido: qtd * (ci?.valor_unitario || 0),
            modo_lancamento: (etapasLancadas[id] || []).length > 0 ? "etapa" : "quantidade",
            etapa_medida: (etapasLancadas[id] || []).join(", ")
          };
        });

      if (itensPayload.length > 0) await supabase.from("medicao_boletim_itens").insert(itensPayload);

      toast({ title: "Sucesso!", description: "Medição lançada com sucesso." });
      setLancamentosAtuais({});
      setEtapasLancadas({});
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Superior */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
               <Calculator className="h-8 w-8 text-emerald-500" /> Planilha de Contratos
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] px-1">Gestão de medições, saldos e importação de histórico.</p>
          </div>
        </div>

        {/* Seleção de Obra e KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <div className="md:col-span-4 bg-white p-4 rounded-3xl border shadow-sm flex flex-col justify-center">
              <Label className="px-1 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Obra Alvo</Label>
              <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                <SelectTrigger className="border-none shadow-none font-black text-xl text-slate-800 bg-slate-50 h-14 rounded-2xl px-6"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl border-none">
                  {obras.map(o => <SelectItem key={o.id} value={o.id} className="font-bold">{o.codigo} - {o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
           </div>
           
           <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-3xl border-none bg-slate-900 text-white shadow-lg"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Contrato (Reaj.)</p>
                <p className="text-lg font-black tracking-tighter truncate">{fmtBRL(valorTotalContrato)}</p>
              </CardContent></Card>
              <Card className="rounded-3xl border-none bg-emerald-50 text-emerald-800 shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Total Medido</p>
                <p className="text-lg font-black tracking-tighter truncate">{fmtBRL(valorTotalMedido)}</p>
              </CardContent></Card>
              <Card className="rounded-3xl border-none bg-amber-50 text-amber-800 shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Saldo Obra</p>
                <p className="text-lg font-black tracking-tighter truncate">{fmtBRL(valorTotalContrato - valorTotalMedido)}</p>
              </CardContent></Card>
              <Card className="rounded-3xl border bg-white shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-slate-300 mb-1">Fator Reaj.</p>
                <p className="text-lg font-black tracking-tighter truncate">1.0000</p>
              </CardContent></Card>
           </div>
        </div>

        {selectedObraId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6 h-14 w-full max-w-md rounded-2xl border border-slate-200">
               <TabsTrigger value="medicoes" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-xs uppercase tracking-wider"><Plus size={16} /> Medições</TabsTrigger>
               <TabsTrigger value="planilha" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-xs uppercase tracking-wider"><History size={16} /> Planilha/Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="medicoes" className="space-y-6 animate-in fade-in zoom-in duration-300">
               {/* Painel de Lançamento Direto */}
               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                  <div className="p-8 bg-slate-50 border-b flex flex-wrap gap-6 items-end justify-between">
                     <div className="flex gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Início do Período</Label>
                           <Input type="date" value={medicaoHeader.periodo_inicio} onChange={e => setMedicaoHeader(p => ({ ...p, periodo_inicio: e.target.value }))} className="h-12 w-44 rounded-2xl font-bold bg-white border-slate-200" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fim do Período</Label>
                           <Input type="date" value={medicaoHeader.periodo_fim} onChange={e => setMedicaoHeader(p => ({ ...p, periodo_fim: e.target.value }))} className="h-12 w-44 rounded-2xl font-bold bg-white border-slate-200" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Retenção (%)</Label>
                           <Input type="number" value={medicaoHeader.percentual_retencao} onChange={e => setMedicaoHeader(p => ({ ...p, percentual_retencao: Number(e.target.value) }))} className="h-12 w-24 rounded-2xl font-bold text-center bg-white border-slate-200" />
                        </div>
                     </div>
                     <div className="flex-1 min-w-[300px] space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observações/Justificativas</Label>
                        <Input value={medicaoHeader.observacoes} onChange={e => setMedicaoHeader(p => ({ ...p, observacoes: e.target.value }))} placeholder="Ocorrências da medição..." className="h-12 rounded-2xl font-medium bg-white border-slate-200" />
                     </div>
                  </div>

                  <div className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow className="border-none">
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Serviço/Descrição</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">Qtd. Contrato</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right bg-amber-50/50">Acum. Anterior</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right bg-emerald-50 border-x border-emerald-100">Medição Atual</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">Saldo Restante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratoItens.map((ci) => {
                          const prev = acumuladoAnterior[ci.id] || { qtd: 0, valor: 0, etapas: [] };
                          const medidoAgora = lancamentosAtuais[ci.id] || 0;
                          const totalAcum = prev.qtd + medidoAgora;
                          const saldo = ci.quantidade - totalAcum;
                          const condicoes = ci.condicoes_medicao as any[] || [];

                          return (
                             <TableRow key={ci.id} className="border-b border-slate-100 group transition-all hover:bg-slate-50/50">
                                <TableCell className="px-6 py-6 font-mono text-[10px] font-bold text-blue-600">{ci.item_numero}</TableCell>
                                <TableCell className="px-6 py-6 font-black text-slate-800 text-[13px] leading-tight">
                                   {ci.descricao}
                                   {condicoes.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                         {condicoes.map((c, i) => {
                                            const jaMedida = prev.etapas.find(e => e === c.etapa);
                                            const marcadaAgora = (etapasLancadas[ci.id] || []).includes(c.etapa);
                                            return (
                                               <button 
                                                 key={i} 
                                                 type="button"
                                                 disabled={jaMedida ? true : false}
                                                 onClick={() => toggleEtapa(ci.id, c.etapa, c.percentual, !marcadaAgora)}
                                                 className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                                                   jaMedida ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" :
                                                   marcadaAgora ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20" :
                                                   "bg-white text-slate-600 border-slate-200 hover:border-emerald-500"
                                                 }`}
                                               >
                                                  {jaMedida ? <CheckCircle2 size={12} /> : <div className={`w-2 h-2 rounded-full ${marcadaAgora ? 'bg-white' : 'bg-slate-200'}`} />}
                                                  {c.etapa} ({c.percentual}%)
                                               </button>
                                            );
                                         })}
                                      </div>
                                   )}
                                </TableCell>
                                <TableCell className="px-6 py-6 text-right font-black text-slate-800">{fmtNum(ci.quantidade)} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{ci.unidade}</span></TableCell>
                                <TableCell className="px-6 py-6 text-right font-black text-amber-600 bg-amber-50/30 text-xs tracking-tighter">{fmtNum(prev.qtd)}</TableCell>
                                <TableCell className="px-6 py-6 text-right bg-emerald-50/30 border-x border-emerald-100">
                                   <div className="relative group">
                                      <Input 
                                        type="number" 
                                        value={medidoAgora || ""} 
                                        onChange={e => setLancamentosAtuais(l => ({ ...l, [ci.id]: Number(e.target.value) }))} 
                                        className="h-10 text-right font-black text-emerald-600 bg-white border-2 border-transparent focus:border-emerald-500 rounded-xl"
                                        placeholder="0,00"
                                      />
                                   </div>
                                   <p className="text-[10px] font-bold text-emerald-600/50 mt-1">{fmtPct((medidoAgora / (ci.quantidade || 1)) * 100)}</p>
                                </TableCell>
                                <TableCell className="px-6 py-6 text-right">
                                   <span className={`text-xs font-black p-2 rounded-xl border ${saldo < 0 ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-white text-slate-400 border-slate-200"}`}>
                                      {fmtNum(saldo)}
                                   </span>
                                </TableCell>
                             </TableRow>
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="p-10 bg-slate-900 border-t flex flex-col md:flex-row justify-between items-center gap-6">
                     <div className="text-white space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Resumo Brutal do Boletim</p>
                        <h4 className="text-4xl font-black italic">{fmtBRL(valorSubtotalMedicaoAtual)}</h4>
                        <p className="text-xs font-bold text-emerald-400">Retenção de {medicaoHeader.percentual_retencao}% inclusa nos cálculos.</p>
                     </div>
                     <Button 
                        disabled={isSaving || valorSubtotalMedicaoAtual <= 0} 
                        onClick={handleSalvarMedicao}
                        className="h-20 px-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-sm tracking-widest rounded-[2rem] shadow-2xl shadow-emerald-500/40 gap-3 active:scale-95 transition-all"
                     >
                        {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
                        Confirmar e Salvar Medição
                     </Button>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="planilha" className="space-y-6 animate-in slide-in-from-left-4 duration-300">
               <div className="bg-white rounded-[2.5rem] p-10 border shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                     <History className="text-amber-500" size={28} />
                     <h3 className="text-2xl font-black italic uppercase tracking-tighter">Histórico de Boletins</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {medicoes.length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-3xl border-2 border-dashed">
                           <AlertCircle size={48} className="mb-4 opacity-20" />
                           <p className="font-bold text-sm uppercase">Nenhuma medição encontrada para esta obra.</p>
                        </div>
                     ) : medicoes.map(m => (
                        <Card key={m.id} className="rounded-3xl border-slate-100 hover:border-blue-200 transition-all group overflow-hidden shadow-sm">
                           <CardContent className="p-0">
                              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                                 <div>
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Medição #{String(m.numero).padStart(3, '0')}</h4>
                                    <p className="text-[10px] font-bold text-slate-400">{format(new Date(m.periodo_inicio), "dd/MM")} → {format(new Date(m.periodo_fim), "dd/MM")}</p>
                                 </div>
                                 <Badge className="bg-blue-50 text-blue-600 border-none px-3 py-1 font-black text-[9px] uppercase">{m.status}</Badge>
                              </div>
                              <div className="p-6 grid grid-cols-2 gap-4">
                                 <div>
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Valor Bruto</Label>
                                    <p className="text-sm font-black text-slate-800">{fmtBRL(m.valor_bruto)}</p>
                                 </div>
                                 <div>
                                    <Label className="text-[9px] font-black uppercase text-slate-400">Líquido</Label>
                                    <p className="text-sm font-black text-emerald-600">{fmtBRL(m.valor_liquido)}</p>
                                 </div>
                              </div>
                              <div className="p-4 bg-slate-900 group-hover:bg-blue-600 transition-colors flex justify-center items-center">
                                 <Button variant="ghost" className="w-full text-white font-black uppercase text-[10px] gap-2"><Download size={14} /> Baixar Comprovante</Button>
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>
               </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
