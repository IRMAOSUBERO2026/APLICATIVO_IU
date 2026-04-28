import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Ruler, Plus, FileText, TrendingUp, Percent, ShieldCheck, Calculator,
  Trash2, Edit, RefreshCw, AlertTriangle, Download, DollarSign, Upload, FileUp
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { createBrandedPDF, addPDFFooter, getAutoTableStyles, addSignatureBlock, type EmpresaBranding } from "@/lib/pdfTemplate";

// Types
interface Obra { id: string; nome: string; codigo: string; empresa_id: string; construtora?: string; cidade?: string; uf?: string; }
interface ContratoItem {
  id: string; obra_id: string; empresa_id: string; item_numero: string; descricao: string;
  unidade: string; quantidade: number; valor_unitario: number; valor_total: number;
  is_aditivo: boolean; aditivo_numero?: number; aditivo_data?: string; observacoes?: string;
  categoria?: string; quantidade_acumulada_inicial: number;
}
interface Medicao {
  id: string; obra_id: string; numero: number; periodo_inicio: string; periodo_fim: string;
  data_emissao: string; valor_bruto: number; percentual_retencao: number;
  valor_retencao: number; valor_liquido: number; status: string; observacoes?: string;
}
interface BoletimItem {
  id?: string; medicao_id?: string; contrato_item_id: string;
  quantidade_medida: number; percentual_medido: number; valor_medido: number;
  modo_lancamento: string; observacoes?: string;
}
interface RetencaoImposto {
  id?: string; medicao_id?: string; imposto: string; aliquota: number; valor: number;
}

const IMPOSTOS_SUGERIDOS = [
  { imposto: "INSS (Retenção)", aliquota: 11 },
  { imposto: "ISS", aliquota: 5 },
  { imposto: "IR (Retenção)", aliquota: 1.5 },
  { imposto: "CSLL", aliquota: 1 },
  { imposto: "PIS", aliquota: 0.65 },
  { imposto: "COFINS", aliquota: 3 },
];

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

export default function Medicoes() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [reajustes, setReajustes] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [boletimItens, setBoletimItens] = useState<Record<string, BoletimItem[]>>({});
  const [retencoes, setRetencoes] = useState<Record<string, RetencaoImposto[]>>({});

  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showReajusteDialog, setShowReajusteDialog] = useState(false);
  const [showMedicaoDialog, setShowMedicaoDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const [editingItem, setEditingItem] = useState<ContratoItem | null>(null);
  const [editingMedicao, setEditingMedicao] = useState<Medicao | null>(null);
  const [itemForm, setItemForm] = useState({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, observacoes: "", quantidade_acumulada_inicial: 0 });
  const [medicaoForm, setMedicaoForm] = useState({ periodo_inicio: "", periodo_fim: "", percentual_retencao: 5, observacoes: "" });
  const [boletimLancamentos, setBoletimLancamentos] = useState<BoletimItem[]>([]);
  const [impostosSelecionados, setImpostosSelecionados] = useState<RetencaoImposto[]>([]);

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
    const [c, r, m] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("*").eq("obra_id", selectedObraId).order("item_numero"),
      supabase.from("medicao_reajustes").select("*").eq("obra_id", selectedObraId).order("data_aplicacao"),
      supabase.from("medicoes").select("*").eq("obra_id", selectedObraId).order("numero")
    ]);
    
    if (c.data) setContratoItens(c.data as any[]);
    if (r.data) setReajustes(r.data);
    if (m.data) {
       setMedicoes(m.data as Medicao[]);
       const bMap: Record<string, BoletimItem[]> = {};
       const rMap: Record<string, RetencaoImposto[]> = {};
       for (const med of m.data) {
          const { data: bi } = await supabase.from("medicao_boletim_itens").select("*").eq("medicao_id", med.id);
          if (bi) bMap[med.id] = bi as BoletimItem[];
          const { data: ri } = await supabase.from("medicao_retencoes_impostos").select("*").eq("medicao_id", med.id);
          if (ri) rMap[med.id] = ri as RetencaoImposto[];
       }
       setBoletimItens(bMap);
       setRetencoes(rMap);
    }
  };

  const acumuladoPorItem = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const ci of contratoItens) {
       acc[ci.id] = ci.quantidade_acumulada_inicial || 0;
    }
    for (const items of Object.values(boletimItens)) {
      for (const bi of items) {
        acc[bi.contrato_item_id] = (acc[bi.contrato_item_id] || 0) + bi.quantidade_medida;
      }
    }
    return acc;
  }, [boletimItens, contratoItens]);

  const fatorReajuste = useMemo(() => {
    let f = 1;
    for (const r of reajustes) f *= (1 + r.percentual / 100);
    return f;
  }, [reajustes]);

  const valorTotalContrato = useMemo(() => contratoItens.reduce((s, i) => s + i.quantidade * i.valor_unitario * fatorReajuste, 0), [contratoItens, fatorReajuste]);
  const valorTotalMedido = useMemo(() => medicoes.reduce((s, m) => s + m.valor_bruto, 0), [medicoes]);

  // IMPORTAÇÃO E MODELO
  const handleDownloadTemplate = () => {
    const headers = [["Item", "Descrição", "Unidade", "Quantidade Total", "Preço Unitário", "Acumulado Inicial (Ant. Sistema)"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Contrato");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `modelo_planilha_contrato_${selectedObra?.codigo || 'obras'}.xlsx`);
    toast({ title: "Modelo baixado!", description: "Preencha as colunas e utilize o botão Importar." });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedObra) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const wsName = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        const payloads = rows.map(r => ({
          obra_id: selectedObraId,
          empresa_id: selectedObra.empresa_id,
          item_numero: String(r["Item"] || ""),
          descricao: String(r["Descrição"] || ""),
          unidade: String(r["Unidade"] || "un"),
          quantidade: Number(r["Quantidade Total"] || 0),
          valor_unitario: Number(r["Preço Unitário"] || 0),
          quantidade_acumulada_inicial: Number(r["Acumulado Inicial (Ant. Sistema)"] || 0),
          valor_total: Number(r["Quantidade Total"] || 0) * Number(r["Preço Unitário"] || 0),
          is_aditivo: false
        })).filter(p => p.descricao && p.item_numero);

        if (payloads.length === 0) throw new Error("Nenhum dado válido encontrado.");

        const { error } = await supabase.from("medicao_contrato_itens").insert(payloads);
        if (error) throw error;

        toast({ title: "Importação concluída!", description: `${payloads.length} itens adicionados ao contrato.` });
        loadData();
      } catch (err: any) {
        toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveItem = async () => {
    if (!selectedObra) return;
    const payload = {
      ...itemForm,
      obra_id: selectedObraId,
      empresa_id: selectedObra.empresa_id,
      valor_total: itemForm.quantidade * itemForm.valor_unitario,
    };
    if (editingItem) {
      await supabase.from("medicao_contrato_itens").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("medicao_contrato_itens").insert(payload);
    }
    toast({ title: "Item salvo!" });
    setShowItemDialog(false);
    loadData();
  };

  const openNewMedicao = () => {
    const nextNum = medicoes.length > 0 ? Math.max(...medicoes.map(m => m.numero)) + 1 : 1;
    setMedicaoForm({ periodo_inicio: "", periodo_fim: "", percentual_retencao: 5, observacoes: "" });
    setEditingMedicao({ id: "", obra_id: selectedObraId, numero: nextNum, periodo_inicio: "", periodo_fim: "", data_emissao: new Date().toISOString().split("T")[0], valor_bruto: 0, percentual_retencao: 5, valor_retencao: 0, valor_liquido: 0, status: "rascunho" });
    setBoletimLancamentos(contratoItens.map(ci => ({ contrato_item_id: ci.id, quantidade_medida: 0, percentual_medido: 0, valor_medido: 0, modo_lancamento: "quantidade" })));
    setImpostosSelecionados([]);
    setShowMedicaoDialog(true);
  };

  const updateLancamento = (idx: number, field: string, value: any) => {
     setBoletimLancamentos(prev => {
        const up = [...prev];
        const item = {...up[idx]};
        const ci = contratoItens.find(c => c.id === item.contrato_item_id);
        if (!ci) return prev;
        if (field === "quantidade_medida") {
           item.quantidade_medida = Number(value);
           item.percentual_medido = ci.quantidade > 0 ? (Number(value) / ci.quantidade) * 100 : 0;
           item.valor_medido = Number(value) * ci.valor_unitario * fatorReajuste;
        }
        up[idx] = item;
        return up;
     });
  };

  const handleSaveMedicao = async () => {
     const vBruto = boletimLancamentos.reduce((s, l) => s + l.valor_medido, 0);
     const vRet = vBruto * medicaoForm.percentual_retencao / 100;
     const payload = {
        obra_id: selectedObraId,
        empresa_id: selectedObra?.empresa_id || "",
        numero: editingMedicao?.numero || 1,
        periodo_inicio: medicaoForm.periodo_inicio,
        periodo_fim: medicaoForm.periodo_fim,
        data_emissao: new Date().toISOString().split("T")[0],
        valor_bruto: vBruto,
        percentual_retencao: medicaoForm.percentual_retencao,
        valor_retencao: vRet,
        valor_liquido: vBruto - vRet,
        status: "emitida",
        observacoes: medicaoForm.observacoes,
     };
     const { data: med } = await supabase.from("medicoes").insert(payload).select().single();
     if (med && boletimLancamentos.length > 0) {
        await supabase.from("medicao_boletim_itens").insert(boletimLancamentos.filter(l => l.quantidade_medida > 0).map(l => ({ ...l, medicao_id: med.id })));
        toast({ title: "Medição registrada!" });
        setShowMedicaoDialog(false);
        loadData();
     }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 italic uppercase">
               <Ruler className="h-6 w-6 text-amber-500" /> Planilha de Contratos
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Gestão de medições, saldos contratuais e importação de histórico.</p>
          </div>
        </div>

        <div className="max-w-md bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-4">
           <Label className="px-4 text-[11px] font-black uppercase text-slate-400 tracking-widest border-r">Obra Alvo</Label>
           <Select value={selectedObraId} onValueChange={setSelectedObraId}>
             <SelectTrigger className="border-none shadow-none font-bold text-slate-700 bg-transparent h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
             <SelectContent className="rounded-2xl shadow-2xl border-none">
               {obras.map(o => <SelectItem key={o.id} value={o.id} className="font-semibold">{o.codigo} - {o.nome}</SelectItem>)}
             </SelectContent>
           </Select>
        </div>

        {selectedObraId && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Contrato (Reaj.)</p>
                <p className="text-xl font-black text-slate-800">{fmtBRL(valorTotalContrato)}</p>
              </CardContent></Card>
              <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Medido</p>
                <p className="text-xl font-black text-emerald-600">{fmtBRL(valorTotalMedido)}</p>
              </CardContent></Card>
              <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Saldo Obra</p>
                <p className="text-xl font-black text-amber-600">{fmtBRL(valorTotalContrato - valorTotalMedido)}</p>
              </CardContent></Card>
              <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fator Reaj.</p>
                <p className="text-xl font-black text-blue-600">{fatorReajuste.toFixed(4)}</p>
              </CardContent></Card>
            </div>

            <Tabs defaultValue="contrato" className="w-full">
              <TabsList className="bg-slate-100/50 p-1 mb-6 h-12 w-full max-w-md rounded-2xl border border-slate-200/50">
                <TabsTrigger value="contrato" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider"><FileText size={16} /> Planilha</TabsTrigger>
                <TabsTrigger value="medicoes" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider"><Calculator size={16} /> Medições</TabsTrigger>
              </TabsList>

              <TabsContent value="contrato" className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                   <div>
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Estrutura do Contrato</h2>
                      <p className="text-xs text-slate-400 font-medium tracking-wide">Lance os itens manualmente ou utilize a importação via Excel.</p>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-10 rounded-xl gap-2 font-bold bg-white border-slate-200"><Download size={16} /> Baixar Modelo</Button>
                     <div className="relative">
                        <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 font-bold bg-white border-slate-200"><FileUp size={16} /> Importar Excel</Button>
                        <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>
                     <Button size="sm" onClick={() => { setItemForm({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, observacoes: "", quantidade_acumulada_inicial: 0 }); setEditingItem(null); setShowItemDialog(true); }} className="h-10 rounded-xl gap-2 font-bold bg-slate-900 border-none text-white"><Plus size={16} /> Novo Item</Button>
                   </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Item</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest">Descrição</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-right">Qtd. Total</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-right">Unitário</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-right">Acum. Ant.</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-right">Acum. Atual</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] uppercase font-black tracking-widest text-right">Saldo</TableHead>
                        <TableHead className="px-6 py-5 w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratoItens.map(ci => {
                        const acum = acumuladoPorItem[ci.id] || 0;
                        const saldo = ci.quantidade - acum;
                        return (
                          <TableRow key={ci.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-6 py-5 font-mono text-[10px] font-bold text-blue-600">{ci.item_numero}</TableCell>
                            <TableCell className="px-6 py-5 font-bold text-slate-800 text-xs">{ci.descricao}</TableCell>
                            <TableCell className="px-6 py-5 text-right font-bold text-slate-600 text-xs">{ci.quantidade} {ci.unidade}</TableCell>
                            <TableCell className="px-6 py-5 text-right font-bold text-emerald-600 text-xs">{fmtBRL(ci.valor_unitario)}</TableCell>
                            <TableCell className="px-6 py-5 text-right font-bold text-slate-400 text-xs">{ci.quantidade_acumulada_inicial || 0}</TableCell>
                            <TableCell className="px-6 py-5 text-right font-black text-slate-800 text-xs">{acum.toFixed(2)}</TableCell>
                            <TableCell className="px-6 py-5 text-right">
                               <Badge variant="outline" className={`font-black text-[10px] uppercase ${saldo <= 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>{saldo.toFixed(2)} {ci.unidade}</Badge>
                            </TableCell>
                            <TableCell className="px-6 py-5 text-right">
                               <Button variant="ghost" size="icon" onClick={() => { setEditingItem(ci); setItemForm({ ...ci, observacoes: ci.observacoes || "" }); setShowItemDialog(true); }} className="h-8 w-8 text-slate-300 hover:text-amber-500 rounded-lg"><Edit size={14} /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="medicoes" className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Histórico de Medições</h2>
                  <Button onClick={openNewMedicao} className="h-11 rounded-xl gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-500/20"><Plus size={18} /> Nova Medição</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {medicoes.map(m => (
                      <Card key={m.id} className="rounded-3xl border-slate-100 shadow-sm hover:border-emerald-200 transition-all group">
                         <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <h3 className="font-black text-slate-800 uppercase text-xs">Medição #{m.numero}</h3>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(m.periodo_inicio), "dd/MM")} → {format(new Date(m.periodo_fim), "dd/MM")}</p>
                               </div>
                               <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[10px] font-black">{m.status}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                               <div><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Valor Bruto</p><p className="text-sm font-black text-slate-700">{fmtBRL(m.valor_bruto)}</p></div>
                               <div><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Líquido</p><p className="text-sm font-black text-emerald-600">{fmtBRL(m.valor_liquido)}</p></div>
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

      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight italic">{editingItem ? "Editar Item" : "Novo Registro de Contrato"}</DialogTitle>
            <DialogDescription className="text-xs">Defina os marcos e quantidades contratuais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cód. Item</Label><Input value={itemForm.item_numero} onChange={e => setItemForm(p => ({ ...p, item_numero: e.target.value }))} className="h-12 rounded-2xl font-bold" /></div>
              <div className="col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição do Serviço / Medição</Label><Input value={itemForm.descricao} onChange={e => setItemForm(p => ({ ...p, descricao: e.target.value }))} className="h-12 rounded-2xl font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Qtd. Contratada</Label><Input type="number" value={itemForm.quantidade} onChange={e => setItemForm(p => ({ ...p, quantidade: Number(e.target.value) }))} className="h-12 rounded-2xl font-bold" /></div>
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Preço Unitário (R$)</Label><Input type="number" value={itemForm.valor_unitario} onChange={e => setItemForm(p => ({ ...p, valor_unitario: Number(e.target.value) }))} className="h-12 rounded-2xl font-bold" /></div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <Label className="text-[10px] font-black uppercase text-amber-600 mb-2 block">Histórico Anterior (Mód. Sem App)</Label>
               <Input type="number" value={itemForm.quantidade_acumulada_inicial} onChange={e => setItemForm(p => ({ ...p, quantidade_acumulada_inicial: Number(e.target.value) }))} placeholder="Quantidade já medida antes do sistema..." className="h-12 rounded-2xl font-bold bg-white border-amber-200" />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button onClick={handleSaveItem} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl shadow-slate-900/20">Salvar Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
