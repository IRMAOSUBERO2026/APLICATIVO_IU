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

// Robust Formatters
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
  
  // Lançamento State
  const [medicaoForm, setMedicaoForm] = useState({
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
       const { data: allItems } = await supabase.from("medicao_boletim_itens").select("*").in("medicao_id", m.data.map(med => med.id));
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
             const estages = bi.etapa_medida.split(", ");
             acc[bi.contrato_item_id].etapas.push(...estages);
          }
       });
    });
    return acc;
  }, [boletimItens, contratoItens]);

  const subtotalLancamento = Object.entries(lancamentosAtuais).reduce((s, [id, q]) => {
     const ci = contratoItens.find(c => c.id === id);
     return s + (q * (ci?.valor_unitario || 0));
  }, 0);

  const totalContrato = contratoItens.reduce((s, i) => s + (i.quantidade * i.valor_unitario), 0);
  const totalMedido = Object.values(boletimItens).reduce((s, itens) => s + itens.reduce((ss, i) => ss + i.valor_medido, 0), 0);

  const toggleEtapa = (itemId: string, etapa: string, percentual: number, checked: boolean) => {
     setEtapasLancadas(prev => {
        const ci = contratoItens.find(c => c.id === itemId);
        if (!ci) return prev;
        const current = prev[itemId] || [];
        const next = checked ? [...current, etapa] : current.filter(e => e !== etapa);
        const qtdEtapa = ci.quantidade * (percentual / 100);
        setLancamentosAtuais(l => ({ ...l, [itemId]: (l[itemId] || 0) + (checked ? qtdEtapa : -qtdEtapa) }));
        return { ...prev, [itemId]: next };
     });
  };

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
          status: "emitida",
          observacoes: medicaoForm.observacoes
       }).select().single();
       if (mErr) throw mErr;

       const entries = Object.entries(lancamentosAtuais).filter(([_, q]) => q > 0).map(([id, q]) => ({
          medicao_id: med.id,
          contrato_item_id: id,
          quantidade_medida: q,
          percentual_medido: (q / (contratoItens.find(c => c.id === id)?.quantidade || 1)) * 100,
          valor_medido: q * (contratoItens.find(c => c.id === id)?.valor_unitario || 0),
          modo_lancamento: (etapasLancadas[id] || []).length > 0 ? "etapa" : "quantidade",
          etapa_medida: (etapasLancadas[id] || []).join(", ")
       }));

       if (entries.length > 0) await supabase.from("medicao_boletim_itens").insert(entries);

       toast({ title: "Medição salva com sucesso!" });
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
               <Calculator className="h-8 w-8 text-emerald-500" /> Planilha de Contratos
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <div className="md:col-span-4 bg-white p-4 rounded-3xl border shadow-sm grow shrink-0">
              <Label className="px-1 text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest text-center md:text-left">Obra Alvo</Label>
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
                <p className="text-[10px] font-black uppercase text-slate-300 mb-1">Fator Reaj.</p>
                <p className="text-sm font-black truncate">1.0000</p>
              </CardContent></Card>
           </div>
        </div>

        {selectedObraId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6 h-14 w-full max-w-md rounded-2xl border border-slate-200">
               <TabsTrigger value="medicoes" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-xs uppercase tracking-wider">Lançar Medição</TabsTrigger>
               <TabsTrigger value="planilha" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-xs uppercase tracking-wider">Planilha/Histórico</TabsTrigger>
            </TabsList>

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

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow className="border-none">
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Serviço/Descrição</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">Contrato</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right bg-amber-50/50">Anterior</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right bg-emerald-50/50 border-x border-emerald-100">Atual</TableHead>
                           <TableHead className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratoItens.map(ci => {
                           const prev = acumuladoAnterior[ci.id] || { qtd: 0, valor: 0, etapas: [] };
                           const agora = lancamentosAtuais[ci.id] || 0;
                           const saldo = ci.quantidade - (prev.qtd + agora);
                           const condicoes = ci.condicoes_medicao as any[] || [];

                           return (
                             <TableRow key={ci.id} className="border-b transition-all hover:bg-slate-50/30">
                               <TableCell className="px-6 py-8 font-mono text-[10px] font-bold text-blue-600">{ci.item_numero}</TableCell>
                               <TableCell className="px-6 py-8">
                                  <div className="space-y-3">
                                     <span className="font-black text-slate-800 text-sm block leading-tight">{ci.descricao}</span>
                                     {condicoes.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                           {condicoes.map((c, i) => {
                                              const jaMedida = prev.etapas.includes(c.etapa);
                                              const ativa = (etapasLancadas[ci.id] || []).includes(c.etapa);
                                              return (
                                                 <button key={i} disabled={jaMedida} onClick={() => toggleEtapa(ci.id, c.etapa, c.percentual, !ativa)} className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase flex items-center gap-1.5 transition-all ${jaMedida ? "bg-slate-100 text-slate-300 border-slate-200" : ativa ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-500"}`}>
                                                    {jaMedida ? <CheckCircle2 size={12} /> : <div className={`w-1.5 h-1.5 rounded-full ${ativa ? 'bg-white' : 'bg-slate-200'}`} />}
                                                    {c.etapa} ({c.percentual}%)
                                                 </button>
                                              );
                                           })}
                                        </div>
                                     )}
                                  </div>
                               </TableCell>
                               <TableCell className="px-6 py-8 text-right font-black text-slate-800">{fmtNum(ci.quantidade)} <span className="text-[10px] text-slate-400 font-bold ml-1">{ci.unidade}</span></TableCell>
                               <TableCell className="px-6 py-8 text-right font-black text-amber-600 bg-amber-50/10">{fmtNum(prev.qtd)}</TableCell>
                               <TableCell className="px-6 py-8 bg-emerald-50/20 border-x border-emerald-100">
                                  <div className="relative">
                                     <Input type="number" value={agora || ""} onChange={e => setLancamentosAtuais(l => ({ ...l, [ci.id]: Number(e.target.value) }))} className="h-12 rounded-2xl border-2 border-transparent focus:border-emerald-500 font-black text-right text-emerald-700 bg-white shadow-inner" placeholder="0.00" />
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-400 uppercase">{fmtPct((agora / (ci.quantidade || 1)) * 100)}</span>
                                  </div>
                               </TableCell>
                               <TableCell className="px-6 py-8 text-right">
                                  <span className={`px-3 py-2 rounded-xl font-black text-xs border ${saldo < 0 ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-white text-slate-300 border-slate-100"}`}>{fmtNum(saldo)}</span>
                               </TableCell>
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
                     </div>
                     <Button disabled={isSaving || subtotalLancamento <= 0} onClick={handleSaveBatch} className="h-20 px-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-sm tracking-widest rounded-[2rem] shadow-2xl flex gap-3 active:scale-95 transition-all">
                        {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />} Confirmar e Salvar Medição
                     </Button>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="planilha" className="space-y-6">
               <div className="bg-white rounded-[2.5rem] p-10 border shadow-sm min-h-[400px]">
                  <div className="flex items-center gap-3 mb-8">
                     <History className="text-amber-500" size={28} />
                     <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">Histórico de Boletins Efetuados</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {medicoes.map(m => (
                        <Card key={m.id} className="rounded-3xl hover:border-emerald-300 transition-all group overflow-hidden border-slate-100 shadow-sm">
                           <CardContent className="p-0">
                              <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                                 <div>
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Medição #{String(m.numero).padStart(3, '0')}</h4>
                                    <p className="text-[10px] font-bold text-slate-400">{format(new Date(m.periodo_inicio), "dd/MM")} → {format(new Date(m.periodo_fim), "dd/MM")}</p>
                                 </div>
                                 <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 font-black text-[9px] uppercase">{m.status}</Badge>
                              </div>
                              <div className="p-6 grid grid-cols-2 gap-4 border-b">
                                 <div><Label className="text-[9px] font-black uppercase text-slate-400">Total Bruto</Label>
                                    <p className="text-sm font-black text-slate-800">{fmtBRL(m.valor_bruto)}</p>
                                 </div>
                                 <div><Label className="text-[9px] font-black uppercase text-slate-400">Líquido</Label>
                                    <p className="text-sm font-black text-emerald-600">{fmtBRL(m.valor_liquido)}</p>
                                 </div>
                              </div>
                              <div className="p-4 bg-slate-100 flex justify-center items-center">
                                 <Button variant="ghost" className="w-full text-slate-600 font-bold uppercase text-[10px] gap-2"><Download size={14} /> Baixar PDF</Button>
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
