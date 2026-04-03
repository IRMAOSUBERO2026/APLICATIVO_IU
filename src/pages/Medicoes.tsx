import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Ruler, Plus, FileText, TrendingUp, Percent, ShieldCheck, Calculator,
  Trash2, Edit, RefreshCw, AlertTriangle, Download, DollarSign
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createBrandedPDF, addPDFFooter, getAutoTableStyles, addSignatureBlock, type EmpresaBranding } from "@/lib/pdfTemplate";

// Types
interface Obra { id: string; nome: string; codigo: string; empresa_id: string; construtora?: string; cidade?: string; uf?: string; }
interface ContratoItem {
  id: string; obra_id: string; empresa_id: string; item_numero: string; descricao: string;
  unidade: string; quantidade: number; valor_unitario: number; valor_total: number;
  is_aditivo: boolean; aditivo_numero?: number; aditivo_data?: string; observacoes?: string;
}
interface Reajuste {
  id: string; obra_id: string; data_aplicacao: string; percentual: number;
  tipo: string; motivo?: string; observacoes?: string;
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
  const [reajustes, setReajustes] = useState<Reajuste[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [boletimItens, setBoletimItens] = useState<Record<string, BoletimItem[]>>({});
  const [retencoes, setRetencoes] = useState<Record<string, RetencaoImposto[]>>({});

  // Dialogs
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showReajusteDialog, setShowReajusteDialog] = useState(false);
  const [showMedicaoDialog, setShowMedicaoDialog] = useState(false);
  const [showBoletimDialog, setShowBoletimDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContratoItem | null>(null);
  const [editingMedicao, setEditingMedicao] = useState<Medicao | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, observacoes: "" });
  const [reajusteForm, setReajusteForm] = useState({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" });
  const [medicaoForm, setMedicaoForm] = useState({ periodo_inicio: "", periodo_fim: "", percentual_retencao: 5, observacoes: "" });
  const [boletimLancamentos, setBoletimLancamentos] = useState<BoletimItem[]>([]);
  const [impostosSelecionados, setImpostosSelecionados] = useState<RetencaoImposto[]>([]);

  const selectedObra = obras.find(o => o.id === selectedObraId);

  // Load obras
  useEffect(() => {
    supabase.from("obras").select("id,nome,codigo,empresa_id,construtora,cidade,uf").then(({ data }) => {
      if (data) setObras(data);
    });
  }, []);

  // Load data when obra changes
  useEffect(() => {
    if (!selectedObraId) return;
    loadContratoItens();
    loadReajustes();
    loadMedicoes();
  }, [selectedObraId]);

  const loadContratoItens = async () => {
    const { data } = await supabase.from("medicao_contrato_itens").select("*").eq("obra_id", selectedObraId).order("item_numero");
    if (data) setContratoItens(data as ContratoItem[]);
  };

  const loadReajustes = async () => {
    const { data } = await supabase.from("medicao_reajustes").select("*").eq("obra_id", selectedObraId).order("data_aplicacao");
    if (data) setReajustes(data as Reajuste[]);
  };

  const loadMedicoes = async () => {
    const { data } = await supabase.from("medicoes").select("*").eq("obra_id", selectedObraId).order("numero");
    if (data) {
      setMedicoes(data as Medicao[]);
      // Load boletim items for each
      const bMap: Record<string, BoletimItem[]> = {};
      const rMap: Record<string, RetencaoImposto[]> = {};
      for (const m of data) {
        const { data: bi } = await supabase.from("medicao_boletim_itens").select("*").eq("medicao_id", m.id);
        if (bi) bMap[m.id] = bi as BoletimItem[];
        const { data: ri } = await supabase.from("medicao_retencoes_impostos").select("*").eq("medicao_id", m.id);
        if (ri) rMap[m.id] = ri as RetencaoImposto[];
      }
      setBoletimItens(bMap);
      setRetencoes(rMap);
    }
  };

  // Compute accumulated quantities per item (from all previous medicoes)
  const acumuladoPorItem = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const items of Object.values(boletimItens)) {
      for (const bi of items) {
        acc[bi.contrato_item_id] = (acc[bi.contrato_item_id] || 0) + bi.quantidade_medida;
      }
    }
    return acc;
  }, [boletimItens]);

  // Compute reajuste factor
  const fatorReajuste = useMemo(() => {
    let fator = 1;
    for (const r of reajustes) {
      fator *= (1 + r.percentual / 100);
    }
    return fator;
  }, [reajustes]);

  // Valor total contrato com reajuste
  const valorTotalContrato = useMemo(() => {
    return contratoItens.reduce((sum, i) => sum + i.quantidade * i.valor_unitario * fatorReajuste, 0);
  }, [contratoItens, fatorReajuste]);

  const valorTotalMedido = useMemo(() => {
    return medicoes.reduce((sum, m) => sum + m.valor_bruto, 0);
  }, [medicoes]);

  const saldoContrato = valorTotalContrato - valorTotalMedido;

  // CRUD - Contrato Item
  const handleSaveItem = async () => {
    const obra = obras.find(o => o.id === selectedObraId);
    if (!obra) return;
    const payload = {
      ...itemForm,
      obra_id: selectedObraId,
      empresa_id: obra.empresa_id,
      valor_total: itemForm.quantidade * itemForm.valor_unitario,
    };
    if (editingItem) {
      await supabase.from("medicao_contrato_itens").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("medicao_contrato_itens").insert(payload);
    }
    toast({ title: editingItem ? "Item atualizado" : "Item adicionado" });
    setShowItemDialog(false);
    setEditingItem(null);
    setItemForm({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, observacoes: "" });
    loadContratoItens();
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("medicao_contrato_itens").delete().eq("id", id);
    toast({ title: "Item removido" });
    loadContratoItens();
  };

  // CRUD - Reajuste
  const handleSaveReajuste = async () => {
    const obra = obras.find(o => o.id === selectedObraId);
    if (!obra) return;
    await supabase.from("medicao_reajustes").insert({
      ...reajusteForm,
      obra_id: selectedObraId,
      empresa_id: obra.empresa_id,
    });
    toast({ title: "Reajuste aplicado com sucesso" });
    setShowReajusteDialog(false);
    setReajusteForm({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" });
    loadReajustes();
  };

  const handleDeleteReajuste = async (id: string) => {
    await supabase.from("medicao_reajustes").delete().eq("id", id);
    toast({ title: "Reajuste removido" });
    loadReajustes();
  };

  // Open new medicao
  const openNewMedicao = () => {
    const nextNum = medicoes.length > 0 ? Math.max(...medicoes.map(m => m.numero)) + 1 : 1;
    setMedicaoForm({ periodo_inicio: "", periodo_fim: "", percentual_retencao: 5, observacoes: "" });
    setEditingMedicao({ id: "", obra_id: selectedObraId, numero: nextNum, periodo_inicio: "", periodo_fim: "", data_emissao: new Date().toISOString().split("T")[0], valor_bruto: 0, percentual_retencao: 5, valor_retencao: 0, valor_liquido: 0, status: "rascunho" });
    // Prepare lancamentos based on contract items
    const lancs: BoletimItem[] = contratoItens.map(ci => ({
      contrato_item_id: ci.id,
      quantidade_medida: 0,
      percentual_medido: 0,
      valor_medido: 0,
      modo_lancamento: "quantidade",
    }));
    setBoletimLancamentos(lancs);
    setImpostosSelecionados([]);
    setShowMedicaoDialog(true);
  };

  // Open existing medicao for view
  const openBoletim = (med: Medicao) => {
    setEditingMedicao(med);
    setBoletimLancamentos(boletimItens[med.id] || []);
    setImpostosSelecionados(retencoes[med.id] || []);
    setShowBoletimDialog(true);
  };

  // Update lancamento
  const updateLancamento = (idx: number, field: string, value: number | string) => {
    setBoletimLancamentos(prev => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      const ci = contratoItens.find(c => c.id === item.contrato_item_id);
      if (!ci) return prev;

      if (field === "modo_lancamento") {
        item.modo_lancamento = value as string;
        item.quantidade_medida = 0;
        item.percentual_medido = 0;
        item.valor_medido = 0;
      } else if (field === "quantidade_medida") {
        item.quantidade_medida = Number(value);
        item.percentual_medido = ci.quantidade > 0 ? (Number(value) / ci.quantidade) * 100 : 0;
        item.valor_medido = Number(value) * ci.valor_unitario * fatorReajuste;
      } else if (field === "percentual_medido") {
        item.percentual_medido = Number(value);
        item.quantidade_medida = ci.quantidade * (Number(value) / 100);
        item.valor_medido = item.quantidade_medida * ci.valor_unitario * fatorReajuste;
      }

      updated[idx] = item;
      return updated;
    });
  };

  const valorBrutoMedicao = useMemo(() => {
    return boletimLancamentos.reduce((s, l) => s + l.valor_medido, 0);
  }, [boletimLancamentos]);

  // Add tax suggestion
  const addImposto = (imp: typeof IMPOSTOS_SUGERIDOS[0]) => {
    if (impostosSelecionados.find(i => i.imposto === imp.imposto)) return;
    setImpostosSelecionados(prev => [...prev, { imposto: imp.imposto, aliquota: imp.aliquota, valor: valorBrutoMedicao * imp.aliquota / 100 }]);
  };

  const removeImposto = (idx: number) => {
    setImpostosSelecionados(prev => prev.filter((_, i) => i !== idx));
  };

  // Update imposto values when bruto changes
  useEffect(() => {
    setImpostosSelecionados(prev => prev.map(i => ({ ...i, valor: valorBrutoMedicao * i.aliquota / 100 })));
  }, [valorBrutoMedicao]);

  const totalImpostos = useMemo(() => impostosSelecionados.reduce((s, i) => s + i.valor, 0), [impostosSelecionados]);
  const retencaoContratual = valorBrutoMedicao * (medicaoForm.percentual_retencao || editingMedicao?.percentual_retencao || 5) / 100;

  // Save medicao
  const handleSaveMedicao = async () => {
    const obra = obras.find(o => o.id === selectedObraId);
    if (!obra || !editingMedicao) return;
    const pctRet = medicaoForm.percentual_retencao;
    const vBruto = valorBrutoMedicao;
    const vRet = vBruto * pctRet / 100;
    const vLiq = vBruto - vRet;

    const payload = {
      obra_id: selectedObraId,
      empresa_id: obra.empresa_id,
      numero: editingMedicao.numero,
      periodo_inicio: medicaoForm.periodo_inicio,
      periodo_fim: medicaoForm.periodo_fim,
      data_emissao: new Date().toISOString().split("T")[0],
      valor_bruto: vBruto,
      percentual_retencao: pctRet,
      valor_retencao: vRet,
      valor_liquido: vLiq,
      status: "emitida",
      observacoes: medicaoForm.observacoes,
    };

    const { data: med, error } = await supabase.from("medicoes").insert(payload).select().single();
    if (error || !med) {
      toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
      return;
    }

    // Save boletim items
    const bItems = boletimLancamentos.filter(l => l.quantidade_medida > 0).map(l => ({
      medicao_id: med.id,
      contrato_item_id: l.contrato_item_id,
      quantidade_medida: l.quantidade_medida,
      percentual_medido: l.percentual_medido,
      valor_medido: l.valor_medido,
      modo_lancamento: l.modo_lancamento,
    }));
    if (bItems.length > 0) await supabase.from("medicao_boletim_itens").insert(bItems);

    // Save impostos
    if (impostosSelecionados.length > 0) {
      await supabase.from("medicao_retencoes_impostos").insert(
        impostosSelecionados.map(i => ({ medicao_id: med.id, imposto: i.imposto, aliquota: i.aliquota, valor: i.valor }))
      );
    }

    // Gerar conta a receber automaticamente
    const contaReceber = {
      empresa_id: obra.empresa_id,
      obra_id: selectedObraId,
      descricao: `Medição #${editingMedicao.numero} - ${obra.nome}`,
      categoria: "Medição",
      valor: vLiq,
      data_vencimento: medicaoForm.periodo_fim,
      status: "pendente",
      documento: `Medição ${editingMedicao.numero}`,
      cliente: obra.construtora || null,
      observacoes: `Valor bruto: ${fmtBRL(vBruto)} | Retenção (${pctRet}%): ${fmtBRL(vRet)} | Impostos: ${fmtBRL(totalImpostos)}`,
      parcela: 1,
      total_parcelas: 1,
    };
    const { error: errCR } = await supabase.from("contas_receber").insert(contaReceber);
    if (errCR) {
      toast({ title: "Aviso", description: `Medição salva mas erro ao gerar conta a receber: ${errCR.message}`, variant: "destructive" });
    } else {
      toast({ title: `Medição #${editingMedicao.numero} salva e conta a receber gerada no financeiro` });
    }

    setShowMedicaoDialog(false);
    loadMedicoes();
  };

  // PDF Export
  const exportarBoletimPDF = async (med: Medicao) => {
    const items = boletimItens[med.id] || [];
    const taxes = retencoes[med.id] || [];
    const obra = selectedObra;
    if (!obra) return;

    // Load empresa branding
    const { data: empData } = await supabase.from("empresas").select("*").eq("id", obra.empresa_id).single();
    const branding: EmpresaBranding = empData || { razao_social: "Empresa", cnpj: "" };

    const { doc, startY, colors } = await createBrandedPDF({
      titulo: `BOLETIM DE MEDIÇÃO Nº ${med.numero}`,
      subtitulo: `Período: ${new Date(med.periodo_inicio).toLocaleDateString("pt-BR")} a ${new Date(med.periodo_fim).toLocaleDateString("pt-BR")}`,
      empresa: branding,
      obraNome: `${obra.codigo} — ${obra.nome}`,
      obraEndereco: `${obra.cidade || ""}/${obra.uf || ""} — Contratante: ${obra.construtora || "—"}`,
    });

    let y = startY;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fator de Reajuste: ${fatorReajuste.toFixed(4)}`, 14, y);
    y += 6;

    // Items table
    const rows = items.map(bi => {
      const ci = contratoItens.find(c => c.id === bi.contrato_item_id);
      return [
        ci?.item_numero || "",
        ci?.descricao || "",
        ci?.unidade || "",
        ci?.quantidade?.toFixed(2) || "",
        fmtBRL(ci ? ci.valor_unitario * fatorReajuste : 0),
        bi.quantidade_medida.toFixed(2),
        fmtPct(bi.percentual_medido),
        fmtBRL(bi.valor_medido),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Item", "Descrição", "Un.", "Qtd. Contrato", "V. Unit. Reaj.", "Qtd. Medida", "% Medido", "Valor Medido"]],
      body: rows,
      ...getAutoTableStyles(colors.primary),
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Summary
    doc.setFontSize(10);
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO FINANCEIRO", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Valor Bruto da Medição: ${fmtBRL(med.valor_bruto)}`, 14, y);
    doc.text(`Retenção Contratual (${med.percentual_retencao}%): ${fmtBRL(med.valor_retencao)}`, 14, y + 5);

    if (taxes.length > 0) {
      y += 15;
      doc.text("RETENÇÕES DE IMPOSTOS:", 14, y);
      y += 5;
      for (const t of taxes) {
        doc.text(`${t.imposto} (${fmtPct(t.aliquota)}): ${fmtBRL(t.valor)}`, 20, y);
        y += 5;
      }
    }

    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(`VALOR LÍQUIDO: ${fmtBRL(med.valor_liquido)}`, 14, y);

    addSignatureBlock(doc, branding);
    addPDFFooter(doc, branding);
    doc.save(`Boletim_Medicao_${med.numero}_${obra.codigo}.pdf`);
    toast({ title: "PDF exportado" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Ruler className="h-6 w-6 text-primary" /> Medições
            </h1>
            <p className="text-sm text-muted-foreground">Boletins de medição, reajustes e retenções contratuais</p>
          </div>
        </div>

        {/* Obra selector */}
        <div className="max-w-md">
          <Label>Selecionar Obra</Label>
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger><SelectValue placeholder="Selecione uma obra..." /></SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedObraId && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Valor do Contrato (Reaj.)</p>
                  <p className="text-lg font-bold">{fmtBRL(valorTotalContrato)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Total Medido</p>
                  <p className="text-lg font-bold text-primary">{fmtBRL(valorTotalMedido)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Saldo a Executar</p>
                  <p className="text-lg font-bold text-warning">{fmtBRL(saldoContrato)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Fator Reajuste</p>
                  <p className="text-lg font-bold">{fatorReajuste.toFixed(4)}</p>
                  <p className="text-[10px] text-muted-foreground">{reajustes.length} reajuste(s)</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="contrato">
              <TabsList className="w-full flex flex-wrap">
                <TabsTrigger value="contrato" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1" />Planilha</TabsTrigger>
                <TabsTrigger value="medicoes" className="flex-1"><Calculator className="h-3.5 w-3.5 mr-1" />Medições</TabsTrigger>
                <TabsTrigger value="reajustes" className="flex-1"><TrendingUp className="h-3.5 w-3.5 mr-1" />Reajustes</TabsTrigger>
              </TabsList>

              {/* === TAB: Planilha Contratual === */}
              <TabsContent value="contrato" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">Itens do Contrato</h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setItemForm({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: true, aditivo_numero: (contratoItens.filter(c => c.is_aditivo).length + 1), observacoes: "" }); setEditingItem(null); setShowItemDialog(true); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Aditivo
                    </Button>
                    <Button size="sm" onClick={() => { setItemForm({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, observacoes: "" }); setEditingItem(null); setShowItemDialog(true); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Item
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Item</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-16">Un.</TableHead>
                        <TableHead className="w-20 text-right">Qtd.</TableHead>
                        <TableHead className="w-28 text-right">V. Unit.</TableHead>
                        <TableHead className="w-28 text-right">V. Unit. Reaj.</TableHead>
                        <TableHead className="w-32 text-right">Total Reaj.</TableHead>
                        <TableHead className="w-24 text-right">Acum.</TableHead>
                        <TableHead className="w-24 text-right">Saldo</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratoItens.map(ci => {
                        const acum = acumuladoPorItem[ci.id] || 0;
                        const saldo = ci.quantidade - acum;
                        return (
                          <TableRow key={ci.id} className={ci.is_aditivo ? "bg-accent/5" : ""}>
                            <TableCell className="font-mono text-xs">
                              {ci.item_numero}
                              {ci.is_aditivo && <Badge variant="outline" className="ml-1 text-[9px]">AD{ci.aditivo_numero}</Badge>}
                            </TableCell>
                            <TableCell className="text-xs">{ci.descricao}</TableCell>
                            <TableCell className="text-xs">{ci.unidade}</TableCell>
                            <TableCell className="text-right text-xs">{ci.quantidade.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs">{fmtBRL(ci.valor_unitario)}</TableCell>
                            <TableCell className="text-right text-xs font-medium">{fmtBRL(ci.valor_unitario * fatorReajuste)}</TableCell>
                            <TableCell className="text-right text-xs font-medium">{fmtBRL(ci.quantidade * ci.valor_unitario * fatorReajuste)}</TableCell>
                            <TableCell className="text-right text-xs">{acum.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-xs">{saldo.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingItem(ci); setItemForm({ item_numero: ci.item_numero, descricao: ci.descricao, unidade: ci.unidade, quantidade: ci.quantidade, valor_unitario: ci.valor_unitario, is_aditivo: ci.is_aditivo, aditivo_numero: ci.aditivo_numero || 0, observacoes: ci.observacoes || "" }); setShowItemDialog(true); }} className="p-1 rounded hover:bg-muted"><Edit className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDeleteItem(ci.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="font-semibold">TOTAL</TableCell>
                        <TableCell className="text-right font-bold">{fmtBRL(valorTotalContrato)}</TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </TabsContent>

              {/* === TAB: Medições === */}
              <TabsContent value="medicoes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">Boletins de Medição</h2>
                  <Button size="sm" onClick={openNewMedicao} disabled={contratoItens.length === 0}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nova Medição
                  </Button>
                </div>

                {medicoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma medição lançada</p>
                ) : (
                  <div className="space-y-3">
                    {medicoes.map(m => (
                      <div key={m.id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div>
                          <h3 className="font-semibold text-sm">Medição #{m.numero}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.periodo_inicio).toLocaleDateString("pt-BR")} a {new Date(m.periodo_fim).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div><span className="text-muted-foreground">Bruto:</span> <span className="font-medium">{fmtBRL(m.valor_bruto)}</span></div>
                          <div><span className="text-muted-foreground">Ret.:</span> <span className="font-medium text-destructive">{fmtBRL(m.valor_retencao)}</span></div>
                          <div><span className="text-muted-foreground">Líquido:</span> <span className="font-bold text-primary">{fmtBRL(m.valor_liquido)}</span></div>
                          <Badge variant={m.status === "emitida" ? "default" : "secondary"}>{m.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openBoletim(m)}><FileText className="h-3.5 w-3.5 mr-1" />Ver</Button>
                          <Button size="sm" variant="outline" onClick={() => exportarBoletimPDF(m)}><Download className="h-3.5 w-3.5 mr-1" />PDF</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* === TAB: Reajustes === */}
              <TabsContent value="reajustes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">Reajustes Contratuais</h2>
                  <Button size="sm" onClick={() => setShowReajusteDialog(true)}>
                    <TrendingUp className="h-3.5 w-3.5 mr-1" /> Novo Reajuste
                  </Button>
                </div>

                {reajustes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum reajuste aplicado</p>
                ) : (
                  <div className="rounded-lg border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Percentual</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reajustes.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{new Date(r.data_aplicacao).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell><Badge variant="outline">{r.tipo}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{fmtPct(r.percentual)}</TableCell>
                            <TableCell className="text-xs">{r.motivo || "-"}</TableCell>
                            <TableCell><button onClick={() => handleDeleteReajuste(r.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className="font-semibold">Fator Acumulado</TableCell>
                          <TableCell className="text-right font-bold">{fatorReajuste.toFixed(4)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}

                <Card className="border-warning/30 bg-warning/5">
                  <CardContent className="pt-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold">Como funciona o reajuste?</p>
                      <p className="text-muted-foreground mt-1">O reajuste é aplicado sobre o saldo do contrato (valores ainda não medidos). Todos os valores unitários da planilha são multiplicados pelo fator acumulado. Múltiplos reajustes são compostos automaticamente.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Dialog: Item contrato */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : itemForm.is_aditivo ? "Novo Item Aditivo" : "Novo Item do Contrato"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº Item</Label><Input value={itemForm.item_numero} onChange={e => setItemForm(p => ({ ...p, item_numero: e.target.value }))} placeholder="1.1" /></div>
              <div><Label>Unidade</Label>
                <Select value={itemForm.unidade} onValueChange={v => setItemForm(p => ({ ...p, unidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["un","m","m²","m³","kg","ton","vb","cj","pç","h","dia","mês","L"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea value={itemForm.descricao} onChange={e => setItemForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade</Label><Input type="number" value={itemForm.quantidade || ""} onChange={e => setItemForm(p => ({ ...p, quantidade: Number(e.target.value) }))} /></div>
              <div><Label>Valor Unitário</Label><Input type="number" step="0.01" value={itemForm.valor_unitario || ""} onChange={e => setItemForm(p => ({ ...p, valor_unitario: Number(e.target.value) }))} /></div>
            </div>
            <div className="text-sm font-medium">Total: {fmtBRL(itemForm.quantidade * itemForm.valor_unitario)}</div>
            {itemForm.is_aditivo && (
              <div><Label>Nº Aditivo</Label><Input type="number" value={itemForm.aditivo_numero || ""} onChange={e => setItemForm(p => ({ ...p, aditivo_numero: Number(e.target.value) }))} /></div>
            )}
            <div><Label>Observações</Label><Textarea value={itemForm.observacoes} onChange={e => setItemForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reajuste */}
      <Dialog open={showReajusteDialog} onOpenChange={setShowReajusteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar Reajuste</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Data de Aplicação</Label><Input type="date" value={reajusteForm.data_aplicacao} onChange={e => setReajusteForm(p => ({ ...p, data_aplicacao: e.target.value }))} /></div>
            <div><Label>Percentual (%)</Label><Input type="number" step="0.01" value={reajusteForm.percentual || ""} onChange={e => setReajusteForm(p => ({ ...p, percentual: Number(e.target.value) }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={reajusteForm.tipo} onValueChange={v => setReajusteForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anual">Reajuste Anual</SelectItem>
                  <SelectItem value="aditivo">Aditivo de Preços</SelectItem>
                  <SelectItem value="extraordinario">Extraordinário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Motivo</Label><Textarea value={reajusteForm.motivo} onChange={e => setReajusteForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ex: INCC acumulado 12 meses..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReajusteDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveReajuste}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Medição */}
      <Dialog open={showMedicaoDialog} onOpenChange={setShowMedicaoDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Medição #{editingMedicao?.numero}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label>Início do Período</Label><Input type="date" value={medicaoForm.periodo_inicio} onChange={e => setMedicaoForm(p => ({ ...p, periodo_inicio: e.target.value }))} /></div>
              <div><Label>Fim do Período</Label><Input type="date" value={medicaoForm.periodo_fim} onChange={e => setMedicaoForm(p => ({ ...p, periodo_fim: e.target.value }))} /></div>
              <div><Label>% Retenção Contratual</Label><Input type="number" step="0.5" value={medicaoForm.percentual_retencao} onChange={e => setMedicaoForm(p => ({ ...p, percentual_retencao: Number(e.target.value) }))} /></div>
            </div>

            {/* Lancamentos */}
            <h3 className="font-semibold text-sm">Lançamento dos Itens</h3>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Item</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-14">Un.</TableHead>
                    <TableHead className="w-20 text-right">Qtd. Contr.</TableHead>
                    <TableHead className="w-20 text-right">Acum. Ant.</TableHead>
                    <TableHead className="w-24">Modo</TableHead>
                    <TableHead className="w-24">Lançamento</TableHead>
                    <TableHead className="w-28 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletimLancamentos.map((bl, idx) => {
                    const ci = contratoItens.find(c => c.id === bl.contrato_item_id);
                    if (!ci) return null;
                    const acumAnt = acumuladoPorItem[ci.id] || 0;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{ci.item_numero}</TableCell>
                        <TableCell className="text-xs">{ci.descricao}</TableCell>
                        <TableCell className="text-xs">{ci.unidade}</TableCell>
                        <TableCell className="text-right text-xs">{ci.quantidade.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">{acumAnt.toFixed(2)}</TableCell>
                        <TableCell>
                          <Select value={bl.modo_lancamento} onValueChange={v => updateLancamento(idx, "modo_lancamento", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quantidade">Qtd.</SelectItem>
                              <SelectItem value="percentual">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-xs"
                            value={bl.modo_lancamento === "quantidade" ? (bl.quantidade_medida || "") : (bl.percentual_medido || "")}
                            onChange={e => updateLancamento(idx, bl.modo_lancamento === "quantidade" ? "quantidade_medida" : "percentual_medido", Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">{fmtBRL(bl.valor_medido)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7} className="font-semibold">TOTAL BRUTO</TableCell>
                    <TableCell className="text-right font-bold">{fmtBRL(valorBrutoMedicao)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Retenção contratual */}
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Retenção Contratual</h3>
              <div className="flex items-center gap-3 text-sm">
                <span>{fmtPct(medicaoForm.percentual_retencao)} sobre {fmtBRL(valorBrutoMedicao)}</span>
                <span className="font-bold text-destructive">= {fmtBRL(retencaoContratual)}</span>
              </div>
            </div>

            {/* Impostos sugeridos */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Sugestão de Retenção de Impostos (NF)</h3>
              <div className="flex flex-wrap gap-2">
                {IMPOSTOS_SUGERIDOS.map(imp => (
                  <Button key={imp.imposto} size="sm" variant={impostosSelecionados.find(i => i.imposto === imp.imposto) ? "default" : "outline"} onClick={() => addImposto(imp)} className="text-xs">
                    {imp.imposto} ({imp.aliquota}%)
                  </Button>
                ))}
              </div>
              {impostosSelecionados.length > 0 && (
                <div className="space-y-1">
                  {impostosSelecionados.map((imp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span>{imp.imposto} ({fmtPct(imp.aliquota)})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmtBRL(imp.valor)}</span>
                        <button onClick={() => removeImposto(idx)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold border-t pt-1">
                    <span>Total Impostos</span>
                    <span>{fmtBRL(totalImpostos)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Valor Bruto</span><span className="font-medium">{fmtBRL(valorBrutoMedicao)}</span></div>
                <div className="flex justify-between text-destructive"><span>(-) Retenção Contratual</span><span>{fmtBRL(retencaoContratual)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Valor Líquido</span>
                  <span className="text-primary">{fmtBRL(valorBrutoMedicao - retencaoContratual)}</span>
                </div>
                {totalImpostos > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>Impostos NF (informativo)</span><span>{fmtBRL(totalImpostos)}</span></div>
                )}
              </CardContent>
            </Card>

            <div><Label>Observações</Label><Textarea value={medicaoForm.observacoes || ""} onChange={e => setMedicaoForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMedicaoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveMedicao}>Emitir Medição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Visualizar Boletim */}
      <Dialog open={showBoletimDialog} onOpenChange={setShowBoletimDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Boletim de Medição #{editingMedicao?.numero}</DialogTitle></DialogHeader>
          {editingMedicao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">Período:</span><p className="font-medium">{new Date(editingMedicao.periodo_inicio).toLocaleDateString("pt-BR")} a {new Date(editingMedicao.periodo_fim).toLocaleDateString("pt-BR")}</p></div>
                <div><span className="text-muted-foreground">Emissão:</span><p className="font-medium">{new Date(editingMedicao.data_emissao).toLocaleDateString("pt-BR")}</p></div>
                <div><span className="text-muted-foreground">Bruto:</span><p className="font-bold">{fmtBRL(editingMedicao.valor_bruto)}</p></div>
                <div><span className="text-muted-foreground">Líquido:</span><p className="font-bold text-primary">{fmtBRL(editingMedicao.valor_liquido)}</p></div>
              </div>

              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead className="text-right">Qtd. Medida</TableHead>
                      <TableHead className="text-right">% Medido</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boletimLancamentos.map((bl, idx) => {
                      const ci = contratoItens.find(c => c.id === bl.contrato_item_id);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{ci?.item_numero}</TableCell>
                          <TableCell className="text-xs">{ci?.descricao}</TableCell>
                          <TableCell className="text-xs">{ci?.unidade}</TableCell>
                          <TableCell className="text-right text-xs">{bl.quantidade_medida.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtPct(bl.percentual_medido)}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{fmtBRL(bl.valor_medido)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {impostosSelecionados.length > 0 && (
                <div className="rounded-lg border p-3">
                  <h4 className="font-semibold text-xs mb-2">Retenções de Impostos</h4>
                  {impostosSelecionados.map((imp, idx) => (
                    <div key={idx} className="flex justify-between text-xs"><span>{imp.imposto} ({fmtPct(imp.aliquota)})</span><span>{fmtBRL(imp.valor)}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {editingMedicao && <Button variant="outline" onClick={() => exportarBoletimPDF(editingMedicao)}><Download className="h-3.5 w-3.5 mr-1" />Exportar PDF</Button>}
            <Button onClick={() => setShowBoletimDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
