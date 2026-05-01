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
import {
  Ruler, Plus, FileText, TrendingUp, Calculator,
  Trash2, Edit, RefreshCw, Download, DollarSign,
  ChevronRight, CheckCircle2, History, Save, AlertCircle,
  LayoutGrid, ListChecks, ArrowRightLeft, Percent
} from "lucide-react";
import { format } from "date-fns";

// Robust Formatters (Premium Style)
const fCur = (v: any) => {
  const val = Number(v) || 0;
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const fNum = (v: any) => {
  const val = Number(v) || 0;
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fPct = (v: any) => {
  const val = Number(v) || 0;
  return val > 0 ? `${val.toFixed(2)}%` : "0,00%";
};

// Types
interface Obra { id: string; nome: string; codigo: string; empresa_id: string; construtora?: string; cidade?: string; uf?: string; }
interface ContratoItem {
  id: string; obra_id: string; empresa_id: string; item_numero: string; descricao: string;
  unidade: string; quantidade: number; valor_unitario: number; valor_total: number;
  is_aditivo: boolean; aditivo_numero?: number; aditivo_data?: string; observacoes?: string;
  categoria?: string; quantidade_acumulada_inicial: number; condicoes_medicao: any[];
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

export default function Medicoes() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [boletimItens, setBoletimItens] = useState<Record<string, BoletimItem[]>>({});
  const [activeTab, setActiveTab] = useState("medicoes");
  
  // Header Local State
  const [medicaoForm, setMedicaoForm] = useState({
    periodo_inicio: format(new Date(), "yyyy-MM-01"),
    periodo_fim: format(new Date(), "yyyy-MM-dd"),
    percentual_retencao: 5,
    observacoes: ""
  });

  // Dual Input State
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
    const acc: Record<string, { qtd: number; valor: number; etiquetas: string[] }> = {};
    for (const ci of contratoItens) {
       acc[ci.id] = { 
         qtd: Number(ci.quantidade_acumulada_inicial) || 0, 
         valor: (Number(ci.quantidade_acumulada_inicial) || 0) * ci.valor_unitario,
         etiquetas: []
       };
    }
    Object.values(boletimItens).forEach(itens => {
       itens.forEach(bi => {
          if (!acc[bi.contrato_item_id]) return;
          acc[bi.contrato_item_id].qtd += bi.quantidade_medida;
          acc[bi.contrato_item_id].valor += bi.valor_medido;
          if (bi.etapa_medida) {
             acc[bi.contrato_item_id].etiquetas.push(...bi.etapa_medida.split(", "));
          }
       });
    });
    return acc;
  }, [boletimItens, contratoItens]);

  const subtotalAtual = useMemo(() => {
    return Object.entries(lancamentosAtuais).reduce((s, [id, q]) => {
      const ci = contratoItens.find(c => c.id === id);
      return s + (q * (ci?.valor_unitario || 0));
    }, 0);
  }, [lancamentosAtuais, contratoItens]);

  const totalContrato = contratoItens.reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
  const totalMedido = Object.values(boletimItens).reduce((s, itens) => s + itens.reduce((ss, i) => ss + i.valor_medido, 0), 0);

  // Sync Qty <-> Pct
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
       const qtdDiff = ci.quantidade * (percentual / 100);
       setLancamentosAtuais(l => ({ ...l, [itemId]: (l[itemId] || 0) + (checked ? qtdDiff : -qtdDiff) }));
       return { ...prev, [itemId]: next };
    });
  };

  const handleSaveMedicao = async () => {
    if (!selectedObraId || subtotalAtual <= 0) {
      toast({ title: "Boletim vazio", description: "Lançe algum item antes de salvar.", variant: "destructive" });
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
        data_emissao: new Date().toISOString().split("T")[0],
        valor_bruto: subtotalAtual,
        percentual_retencao: medicaoForm.percentual_retencao,
        valor_retencao: vRet,
        valor_liquido: subtotalAtual - vRet,
        status: "emitida",
        observacoes: medicaoForm.observacoes
      }).select().single();
      if (mErr) throw mErr;

      const items = Object.entries(lancamentosAtuais).filter(([_, q]) => q > 0).map(([id, q]) => {
         const ci = contratoItens.find(c => c.id === id);
         return {
           medicao_id: med.id,
           contrato_item_id: id,
           quantidade_medida: q,
           percentual_medido: (q / (ci?.quantidade || 1)) * 100,
           valor_medido: q * (ci?.valor_unitario || 0),
           modo_lancamento: (etapasLancadas[id] || []).length > 0 ? "etapa" : "quantidade",
           etapa_medida: (etapasLancadas[id] || []).join(", ")
         };
      });

      if (items.length > 0) await supabase.from("medicao_boletim_itens").insert(items);
      toast({ title: "Sucesso!", description: "Medição de engenharia salva com sucesso." });
      setLancamentosAtuais({});
      setEtapasLancadas({});
      loadData();
    } catch (err: any) {
      toast({ title: "Erro na gravação", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {/* Header Premium */}
        <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border shadow-sm">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
               <Calculator size={24} />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">Boletim de Medição de Engenharia</h1>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">{selectedObra?.nome || "Selecione uma obra no painel"}</p>
             </div>
          </div>
          <div className="w-72">
             <Select value={selectedObraId} onValueChange={setSelectedObraId}>
                <SelectTrigger className="border-none bg-slate-50 h-12 rounded-xl font-bold text-slate-600 focus:ring-0"><SelectValue placeholder="Obra Alvo..." /></SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                   {obras.map(o => <SelectItem key={o.id} value={o.id} className="font-bold">{o.codigo} - {o.nome}</SelectItem>)}
                </SelectContent>
             </Select>
          </div>
        </div>

        {selectedObraId && (
          <>
            {/* KPIs Slim */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Contrato Reajustado", val: fCur(totalContrato), icon: <DollarSign size={14} />, color: "bg-slate-900 text-white" },
                { label: "Acumulado até Hoje", val: fCur(totalMedido), icon: <TrendingUp size={14} />, color: "bg-emerald-50 text-emerald-700" },
                { label: "Saldo Financeiro", val: fCur(totalContrato - totalMedido), icon: <AlertCircle size={14} />, color: "bg-amber-50 text-amber-700" },
                { label: "Progresso Global", val: fPct((totalMedido / totalContrato) * 100), icon: <Percent size={14} />, color: "bg-blue-50 text-blue-700" },
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
                    <div className="flex gap-3 animate-in slide-in-from-right duration-300">
                       <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Início</Label>
                          <Input type="date" value={medicaoForm.periodo_inicio} onChange={e => setMedicaoForm(p => ({ ...p, periodo_inicio: e.target.value }))} className="h-8 w-32 border-none font-bold text-xs p-0 focus-visible:ring-0" />
                       </div>
                       <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Fim</Label>
                          <Input type="date" value={medicaoForm.periodo_fim} onChange={e => setMedicaoForm(p => ({ ...p, periodo_fim: e.target.value }))} className="h-8 w-32 border-none font-bold text-xs p-0 focus-visible:ring-0" />
                       </div>
                       <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Retenção</Label>
                          <Input type="number" value={medicaoForm.percentual_retencao} onChange={e => setMedicaoForm(p => ({ ...p, percentual_retencao: Number(e.target.value) }))} className="h-8 w-12 border-none font-black text-xs p-0 text-center focus-visible:ring-0" />
                          <span className="text-[10px] font-black text-slate-300">%</span>
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
                             <TableHead className="w-[340px] px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center bg-emerald-50/20">Lançamento Atual (Qtd ou %)</TableHead>
                             <TableHead className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contratoItens.map(ci => {
                            const prev = acumuladoAnterior[ci.id] || { qtd: 0, valor: 0, etiquetas: [] };
                            const agoraQtd = lancamentosAtuais[ci.id] || 0;
                            const agoraPct = (agoraQtd / (ci.quantidade || 1)) * 100;
                            const saldo = ci.quantidade - (prev.qtd + agoraQtd);
                            const milestones = ci.condicoes_medicao as any[] || [];

                            return (
                               <TableRow key={ci.id} className="group border-b border-slate-50 hover:bg-slate-50/30 transition-all">
                                  <TableCell className="px-6 py-4 font-mono text-[9px] font-bold text-blue-500/50">{ci.item_numero}</TableCell>
                                  <TableCell className="px-6 py-4">
                                     <div className="flex flex-col gap-2">
                                        <span className="font-bold text-slate-700 text-sm">{ci.descricao}</span>
                                        {milestones.length > 0 && (
                                           <div className="flex flex-wrap gap-1.5">
                                              {milestones.map((m, idx) => {
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
                                        <div className="relative flex-1 group">
                                           <Input 
                                             type="number" 
                                             value={agoraQtd || ""} 
                                             onChange={e => handleQtyChange(ci.id, Number(e.target.value))} 
                                             className="h-10 text-right pr-8 font-black text-xs rounded-xl focus:ring-0 border-slate-200 bg-white"
                                             placeholder="Qtd"
                                           />
                                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">{ci.unidade}</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="relative flex-1 group">
                                           <Input 
                                             type="number" 
                                             value={agoraPct ? Number(agoraPct.toFixed(2)) : ""} 
                                             onChange={e => handlePctChange(ci.id, Number(e.target.value))} 
                                             className="h-10 text-center pr-6 font-black text-xs rounded-xl focus:ring-0 border-slate-200 bg-white"
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

                    {/* Footer Barra de Ação */}
                    <div className="p-8 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 border-t-4 border-emerald-500/20 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
                       <div className="flex items-center gap-6">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subtotal do Boletim</p>
                             <h4 className="text-4xl font-black italic text-white tracking-tighter">{fCur(subtotalAtual)}</h4>
                          </div>
                          <div className="h-10 w-px bg-slate-800" />
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Líquido Estimado</p>
                             <h4 className="text-4xl font-black italic text-emerald-400 tracking-tighter">{fCur(subtotalAtual * (1 - (medicaoForm.percentual_retencao / 100)))}</h4>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4 w-full md:w-auto">
                          <Input 
                            value={medicaoForm.observacoes} 
                            onChange={e => setMedicaoForm(p => ({ ...p, observacoes: e.target.value }))} 
                            placeholder="Notas da medição..." 
                            className="h-14 md:w-80 bg-slate-800 border-slate-700 text-white rounded-2xl placeholder:text-slate-600 focus:ring-emerald-500 text-xs"
                          />
                          <Button 
                            disabled={isSaving || subtotalAtual <= 0} 
                            onClick={handleSaveMedicao}
                            className="h-16 px-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 gap-3 active:scale-95 transition-all w-full md:w-auto"
                          >
                             {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
                             Salvar Medição
                          </Button>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="planilha" className="m-0 animate-in slide-in-from-left duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {medicoes.length === 0 ? (
                       <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 bg-white rounded-[2rem] border-2 border-dashed">
                          <History size={48} className="mb-4 opacity-20" />
                          <p className="font-black uppercase text-xs">Ainda não há medições registradas.</p>
                       </div>
                    ) : medicoes.map(m => (
                       <Card key={m.id} className="rounded-[1.5rem] border-slate-100 hover:border-emerald-300 transition-all group overflow-hidden bg-white shadow-sm">
                          <CardContent className="p-0">
                             <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <div>
                                   <Badge className="bg-slate-900 text-white border-none font-black text-[9px] mb-1">BOLETIM #{String(m.numero).padStart(3, '0')}</Badge>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{format(new Date(m.periodo_inicio), "dd/MM")} » {format(new Date(m.periodo_fim), "dd/MM")}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-xs font-black text-slate-800">{fCur(m.valor_bruto)}</p>
                                   <p className="text-[9px] font-bold text-emerald-600">Líquido: {fCur(m.valor_liquido)}</p>
                                </div>
                             </div>
                             <div className="p-4 grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase gap-2 h-9 border-slate-100"><Download size={14} /> PDF</Button>
                                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[10px] uppercase gap-2 h-9 text-slate-400 hover:text-slate-800"><History size={14} /> Itens</Button>
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
