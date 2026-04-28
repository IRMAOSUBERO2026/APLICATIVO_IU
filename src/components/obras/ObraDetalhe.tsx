import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentManagerGeneric } from "@/components/shared/DocumentManagerGeneric";
import { ObraPipeline, isContractClosed, getStage } from "./ObraPipeline";
import ObraOrcamento from "./ObraOrcamento";
import ObraServicosExtras from "./ObraServicosExtras";
import ObraAndamento from "./ObraAndamento";
import {
  ArrowLeft, Edit, HardHat, FolderOpen,
  Plus, Trash2, FileText, TrendingUp,
  DollarSign, Clock, Save, Users, ClipboardList, Download,
  MapPin, Building2, Calendar, MoreHorizontal, Upload, FileUp
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createBrandedPDF, addPDFFooter, getAutoTableStyles, addSignatureBlock, type EmpresaBranding } from "@/lib/pdfTemplate";

interface Obra {
  id: string; codigo: string; nome: string; empresa_id: string; construtora?: string;
  endereco?: string; cidade?: string; uf?: string; status: string;
  data_inicio?: string; data_previsao_fim?: string; data_fim?: string; observacoes?: string;
  tipo_obra?: string; engenheiro_responsavel?: string; cliente?: string;
  horario_padrao?: any;
}
interface Empresa { id: string; razao_social: string; nome_fantasia?: string; cnpj: string; telefone?: string; email?: string; endereco?: string; cidade?: string; uf?: string; logo_url?: string; cor_primaria?: string; cor_secundaria?: string; nome_responsavel?: string; cargo_responsavel?: string; }
interface ContratoItem {
  id: string; obra_id: string; empresa_id: string; item_numero: string; descricao: string;
  unidade: string; quantidade: number; valor_unitario: number; valor_total: number;
  is_aditivo: boolean; aditivo_numero?: number; aditivo_data?: string; observacoes?: string;
  categoria?: string;
  quantidade_acumulada_inicial: number;
  condicoes_medicao: any[];
}
interface Reajuste {
  id: string; obra_id: string; data_aplicacao: string; percentual: number;
  tipo: string; motivo?: string; observacoes?: string;
}

interface Props {
  obra: Obra;
  empresas: Empresa[];
  onBack: () => void;
  onEdit: () => void;
  subpastasDoc: string[];
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ObraDetalhe({ obra, empresas, onBack, onEdit, subpastasDoc }: Props) {
  const { toast } = useToast();
  const [currentObra, setCurrentObra] = useState(obra);
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [reajustes, setReajustes] = useState<Reajuste[]>([]);
  const [funcionariosCount, setFuncionariosCount] = useState(0);
  const [medicoesCount, setMedicoesCount] = useState(0);
  const [docOpen, setDocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("resumo");

  // Escala
  const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;
  const DIAS_LABELS: Record<string, string> = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };
  const defaultHorario = () => Object.fromEntries(DIAS_SEMANA.map(d => [d, { e1: "", s1: "", e2: "", s2: "" }]));
  const [escala, setEscala] = useState<Record<string, { e1: string; s1: string; e2: string; s2: string }>>(
    currentObra.horario_padrao ? (typeof currentObra.horario_padrao === "string" ? JSON.parse(currentObra.horario_padrao) : currentObra.horario_padrao) : defaultHorario()
  );
  const [escalaSaving, setEscalaSaving] = useState(false);

  const calcHorasDia = (h: { e1: string; s1: string; e2: string; s2: string }) => {
    const toMin = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + (mm || 0); };
    if (!h.e1 || !h.s1) return 0;
    let total = 0;
    if (h.e1 && h.s1) total += toMin(h.s1) - toMin(h.e1);
    if (h.e2 && h.s2) total += toMin(h.s2) - toMin(h.e2);
    return total / 60;
  };

  const handleEscalaChange = (dia: string, field: string, value: string) => {
    setEscala(prev => ({ ...prev, [dia]: { ...prev[dia], [field]: value } }));
  };

  const handleSalvarEscala = async () => {
    setEscalaSaving(true);
    const { error } = await supabase.from("obras").update({ horario_padrao: escala }).eq("id", currentObra.id);
    if (error) toast({ title: "Erro ao salvar escala", variant: "destructive" });
    else toast({ title: "Escala salva com sucesso!" });
    setEscalaSaving(false);
  };

  const totalHorasSemana = DIAS_SEMANA.reduce((s, d) => s + calcHorasDia(escala[d] || { e1: "", s1: "", e2: "", s2: "" }), 0);

  // Item dialog
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContratoItem | null>(null);
  const [itemForm, setItemForm] = useState({ 
    item_numero: "", descricao: "", unidade: "un", quantidade: 0, 
    valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, 
    observacoes: "", categoria: "servico", quantidade_acumulada_inicial: 0,
    condicoes_medicao: [] as { etapa: string; percentual: number }[] 
  });
  const [showReajusteDialog, setShowReajusteDialog] = useState(false);
  const [reajusteForm, setReajusteForm] = useState({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" });

  useEffect(() => { loadAll(); }, [currentObra.id]);

  const loadAll = async () => {
    const [itensRes, reajRes, funcRes, medRes] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("*").eq("obra_id", currentObra.id).order("item_numero"),
      supabase.from("medicao_reajustes").select("*").eq("obra_id", currentObra.id).order("data_aplicacao"),
      supabase.from("funcionarios").select("id", { count: "exact", head: true }).eq("obra_id", currentObra.id).eq("status", "ativo"),
      supabase.from("medicoes").select("id", { count: "exact", head: true }).eq("obra_id", currentObra.id),
    ]);
    if (itensRes.data) setContratoItens(itensRes.data as ContratoItem[]);
    if (reajRes.data) setReajustes(reajRes.data as Reajuste[]);
    setFuncionariosCount(funcRes.count || 0);
    setMedicoesCount(medRes.count || 0);
  };

  const fatorReajuste = useMemo(() => {
    let f = 1;
    for (const r of reajustes) f *= (1 + r.percentual / 100);
    return f;
  }, [reajustes]);

  const itensContrato = contratoItens.filter(i => !i.is_aditivo);
  const itensAditivo = contratoItens.filter(i => i.is_aditivo);
  const totalContrato = useMemo(() => itensContrato.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0), [itensContrato]);
  const totalAditivos = useMemo(() => itensAditivo.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0), [itensAditivo]);
  const totalGeralReajustado = (totalContrato + totalAditivos) * fatorReajuste;
  const empresa = empresas.find(e => e.id === currentObra.empresa_id);

  const handleChangeStatus = async (newStatus: string) => {
    const { error } = await supabase.from("obras").update({ status: newStatus }).eq("id", currentObra.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setCurrentObra(prev => ({ ...prev, status: newStatus }));
    toast({ title: `Status alterado para "${getStage(newStatus).label}"` });
  };

  // CRUD Item
  const openNewItem = (isAditivo: boolean) => {
    setEditingItem(null);
    setItemForm({ 
      item_numero: "", descricao: "", unidade: "un", quantidade: 0, 
      valor_unitario: 0, is_aditivo: isAditivo, 
      aditivo_numero: isAditivo ? (itensAditivo.length > 0 ? Math.max(...itensAditivo.map(i => i.aditivo_numero || 0)) + 1 : 1) : 0, 
      observacoes: "", categoria: "servico", quantidade_acumulada_inicial: 0, 
      condicoes_medicao: [] 
    });
    setShowItemDialog(true);
  };

  const openEditItem = (item: ContratoItem) => {
    setEditingItem(item);
    setItemForm({ 
      item_numero: item.item_numero, descricao: item.descricao, 
      unidade: item.unidade, quantidade: item.quantidade, 
      valor_unitario: item.valor_unitario, is_aditivo: item.is_aditivo, 
      aditivo_numero: item.aditivo_numero || 0, 
      observacoes: item.observacoes || "", categoria: item.categoria || "servico", 
      quantidade_acumulada_inicial: item.quantidade_acumulada_inicial || 0,
      condicoes_medicao: (item as any).condicoes_medicao || []
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.item_numero || !itemForm.descricao) { toast({ title: "Preencha item e descrição", variant: "destructive" }); return; }
    const payload = { ...itemForm, obra_id: currentObra.id, empresa_id: currentObra.empresa_id, valor_total: itemForm.quantidade * itemForm.valor_unitario };
    if (editingItem) {
      await supabase.from("medicao_contrato_itens").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("medicao_contrato_itens").insert(payload);
    }
    toast({ title: editingItem ? "Item atualizado" : "Item adicionado" });
    setShowItemDialog(false);
    loadAll();
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("medicao_contrato_itens").delete().eq("id", id);
    toast({ title: "Item removido" });
    loadAll();
  };

  // CRUD Reajuste
  const handleSaveReajuste = async () => {
    if (!reajusteForm.data_aplicacao || !reajusteForm.percentual) { toast({ title: "Preencha data e percentual", variant: "destructive" }); return; }
    await supabase.from("medicao_reajustes").insert({ ...reajusteForm, obra_id: currentObra.id, empresa_id: currentObra.empresa_id });
    toast({ title: "Reajuste aplicado" });
    setShowReajusteDialog(false);
    setReajusteForm({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" });
    loadAll();
  };

  const handleDeleteReajuste = async (id: string) => {
    await supabase.from("medicao_reajustes").delete().eq("id", id);
    toast({ title: "Reajuste removido" });
    loadAll();
  };

  // Excel Import/Export
  const handleDownloadTemplate = () => {
    const headers = [["Item", "Descrição", "Unidade", "Quantidade Total", "Preço Unitário", "Acumulado Inicial (Ant. Sistema)"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Contrato");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `modelo_contrato_${currentObra.codigo}.xlsx`);
    toast({ title: "Modelo baixado!" });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Iniciando importação de:", file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const wsName = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        console.log("Linhas processadas do Excel:", rows.length);

        if (rows.length === 0) throw new Error("A planilha parece estar vazia.");

        const payloads = rows.map((r, index) => {
          // Tentamos encontrar as colunas mesmo que o nome mude um pouco (com ou sem acento)
          const getItem = () => r["Item"] || r["item"] || r["ITEM"] || "";
          const getDesc = () => r["Descrição"] || r["Descricao"] || r["descrição"] || r["DESCRIÇÃO"] || r["item_descricao"] || "";
          const getUn = () => r["Unidade"] || r["unidade"] || r["UNIDADE"] || r["Un"] || "un";
          const getQtd = () => Number(r["Quantidade Total"] || r["Quantidade"] || r["Qtd Total"] || r["qtd_total"] || r["QTD"] || 0);
          const getPreco = () => Number(r["Preço Unitário"] || r["Preco Unitario"] || r["preco_unitario"] || r["VALOR UNITARIO"] || 0);
          const getAcum = () => Number(r["Acumulado Inicial (Ant. Sistema)"] || r["Acumulado Inicial"] || r["Acumulado"] || r["acumulado"] || 0);

          return {
            obra_id: currentObra.id,
            empresa_id: currentObra.empresa_id,
            item_numero: String(getItem()),
            descricao: String(getDesc()),
            unidade: String(getUn()),
            quantidade: getQtd(),
            valor_unitario: getPreco(),
            quantidade_acumulada_inicial: getAcum(),
            valor_total: getQtd() * getPreco(),
            is_aditivo: false
          };
        }).filter(p => p.descricao && p.item_numero);

        if (payloads.length === 0) {
          throw new Error("Não conseguimos ler os dados. Verifique se as colunas estão corretas: Item, Descrição, Unidade, Quantidade Total, Preço Unitário.");
        }

        const { error } = await supabase.from("medicao_contrato_itens").insert(payloads);
        if (error) throw error;

        toast({ title: "Importação concluída!", description: `${payloads.length} itens adicionados ao contrato.` });
        
        // Resetar o input para permitir subir o mesmo arquivo se necessário
        e.target.value = "";
        loadAll();
      } catch (err: any) {
        console.error("Erro no processamento do Excel:", err);
        toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // PDF: Proposta
  const gerarPropostaPDF = async () => {
    if (!empresa) return;
    const branding: EmpresaBranding = empresa as any;
    const { doc, startY, colors } = await createBrandedPDF({
      titulo: "PROPOSTA COMERCIAL",
      subtitulo: `${currentObra.codigo} — ${currentObra.nome}`,
      empresa: branding,
      obraNome: `${currentObra.codigo} — ${currentObra.nome}`,
      obraEndereco: `${currentObra.endereco || ""} ${currentObra.cidade || ""}${currentObra.uf ? "/" + currentObra.uf : ""}`,
    });
    let y = startY;
    doc.setFontSize(10); doc.setTextColor(60, 60, 60);
    doc.text(`Cliente: ${currentObra.cliente || currentObra.construtora || "—"}`, 14, y); y += 8;
    if (contratoItens.length > 0) {
      doc.setFontSize(12); doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFont("helvetica", "bold"); doc.text("Escopo de Serviços", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Item", "Descrição", "Un.", "Qtd.", "V. Unit.", "Total"]],
        body: contratoItens.map(i => [i.item_numero, i.descricao, i.unidade, i.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), fmtBRL(i.valor_unitario), fmtBRL(i.quantidade * i.valor_unitario)]),
        foot: [["", "", "", "", "TOTAL:", fmtBRL(totalContrato + totalAditivos)]],
        ...getAutoTableStyles(colors.primary),
      });
    }
    addSignatureBlock(doc, branding); addPDFFooter(doc, branding);
    doc.save(`Proposta_${currentObra.codigo}.pdf`);
    toast({ title: "Proposta PDF gerada!" });
  };

  const gerarContratoPDF = async () => {
    if (!empresa) return;
    const branding: EmpresaBranding = empresa as any;
    const { doc, startY, colors } = await createBrandedPDF({
      titulo: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
      empresa: branding,
      obraNome: `${currentObra.codigo} — ${currentObra.nome}`,
      obraEndereco: `${currentObra.endereco || ""} ${currentObra.cidade || ""}${currentObra.uf ? "/" + currentObra.uf : ""}`,
    });
    let y = startY;
    doc.setFontSize(10); doc.setTextColor(60, 60, 60);
    const addLine = (text: string) => { doc.text(text, 14, y); y += 6; };
    doc.setFont("helvetica", "bold"); addLine("CONTRATANTE:");
    doc.setFont("helvetica", "normal"); addLine(`Razão Social: ${currentObra.cliente || currentObra.construtora || "—"}`); y += 2;
    doc.setFont("helvetica", "bold"); addLine("CONTRATADA:");
    doc.setFont("helvetica", "normal"); addLine(`Razão Social: ${empresa.nome_fantasia || empresa.razao_social}`); addLine(`CNPJ: ${empresa.cnpj}`); y += 2;
    doc.setFont("helvetica", "bold"); addLine("OBJETO:");
    doc.setFont("helvetica", "normal"); addLine(`Execução de serviços na obra ${currentObra.codigo} — ${currentObra.nome}`);
    addLine(`Local: ${currentObra.endereco || ""}, ${currentObra.cidade || ""}/${currentObra.uf || ""}`); y += 2;
    addLine(`VALOR: ${fmtBRL(totalGeralReajustado)}`); y += 2;
    if (currentObra.data_inicio) addLine(`Início: ${new Date(currentObra.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")}`);
    if (currentObra.data_previsao_fim) addLine(`Prazo: ${new Date(currentObra.data_previsao_fim + "T12:00:00").toLocaleDateString("pt-BR")}`);
    if (contratoItens.length > 0) {
      y += 6; doc.setFontSize(12); doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFont("helvetica", "bold"); doc.text("ESCOPO DE SERVIÇOS", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Item", "Descrição", "Un.", "Qtd.", "V. Unit.", "Total"]],
        body: contratoItens.map(i => [i.item_numero, i.descricao, i.unidade, i.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), fmtBRL(i.valor_unitario), fmtBRL(i.quantidade * i.valor_unitario)]),
        ...getAutoTableStyles(colors.primary),
      });
    }
    addSignatureBlock(doc, branding); addPDFFooter(doc, branding);
    doc.save(`Contrato_${currentObra.codigo}.pdf`);
    toast({ title: "Contrato PDF gerado!" });
  };

  const contractClosed = isContractClosed(currentObra.status);

  // Navigation sections
  const sections = [
    { id: "resumo", label: "Resumo", icon: HardHat },
    { id: "orcamento", label: "Orçamento", icon: DollarSign },
    { id: "contrato", label: "Contrato", icon: FileText },
    { id: "escala", label: "Escala", icon: Clock },
    ...(contractClosed ? [{ id: "andamento", label: "Andamento", icon: TrendingUp }] : []),
  ];

  const renderItemTable = (items: ContratoItem[], title: string, isAditivo: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title} ({items.length} itens)</h3>
        <div className="flex gap-2">
          {!isAditivo && (
            <>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="h-8 text-xs gap-1.5 font-bold"><Download className="h-3.5 w-3.5" /> Modelo</Button>
              <Button size="sm" variant="outline" onClick={() => document.getElementById("import-excel-input")?.click()} className="h-8 text-xs gap-1.5 font-bold"><Upload className="h-3.5 w-3.5" /> Importar</Button>
              <input 
                id="import-excel-input"
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportExcel} 
                className="hidden" 
              />
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => openNewItem(isAditivo)} className="h-8 text-xs font-bold"><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          Nenhum item cadastrado
        </div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Item</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-20">Cat.</TableHead>
                <TableHead className="w-14">Un.</TableHead>
                <TableHead className="w-20 text-right">Qtd.</TableHead>
                <TableHead className="w-28 text-right">V. Unit.</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
                {fatorReajuste !== 1 && <TableHead className="w-28 text-right">Reajustado</TableHead>}
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} className="group">
                  <TableCell className="font-mono text-xs">{item.item_numero}</TableCell>
                  <TableCell className="text-sm">{item.descricao}</TableCell>
                  <TableCell><Badge variant={item.categoria === "administrativo" ? "secondary" : "outline"} className="text-[10px]">{item.categoria === "administrativo" ? "Admin" : "Serviço"}</Badge></TableCell>
                  <TableCell className="text-xs">{item.unidade}</TableCell>
                  <TableCell className="text-right text-sm">{item.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-sm">{fmtBRL(item.valor_unitario)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmtBRL(item.quantidade * item.valor_unitario)}</TableCell>
                  {fatorReajuste !== 1 && <TableCell className="text-right text-sm font-medium text-primary">{fmtBRL(item.quantidade * item.valor_unitario * fatorReajuste)}</TableCell>}
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-semibold">Total:</TableCell>
                <TableCell className="text-right font-bold">{fmtBRL(items.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0))}</TableCell>
                {fatorReajuste !== 1 && <TableCell className="text-right font-bold text-primary">{fmtBRL(items.reduce((s, i) => s + i.quantidade * i.valor_unitario * fatorReajuste, 0))}</TableCell>}
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Compact Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <HardHat className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">{currentObra.codigo} — {currentObra.nome}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {currentObra.cliente && <span>{currentObra.cliente}</span>}
              {(currentObra.cidade || currentObra.uf) && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{currentObra.cidade}{currentObra.uf ? `/${currentObra.uf}` : ""}</span>
              )}
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{empresa?.nome_fantasia || empresa?.razao_social}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MoreHorizontal className="h-4 w-4" /> Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}><Edit className="h-3.5 w-3.5 mr-2" /> Editar Obra</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDocOpen(true)}><FolderOpen className="h-3.5 w-3.5 mr-2" /> Documentos</DropdownMenuItem>
                <DropdownMenuItem onClick={gerarPropostaPDF}><Download className="h-3.5 w-3.5 mr-2" /> Gerar Proposta PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={gerarContratoPDF}><Download className="h-3.5 w-3.5 mr-2" /> Gerar Contrato PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Pipeline */}
        <ObraPipeline currentStatus={currentObra.status} onChangeStatus={handleChangeStatus} />

        {/* KPIs - Compact row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Contrato", value: fmtBRL(totalContrato) },
            { label: "Aditivos", value: fmtBRL(totalAditivos) },
            { label: "Total Reaj.", value: fmtBRL(totalGeralReajustado) },
            { label: "Reajuste", value: fatorReajuste !== 1 ? `${((fatorReajuste - 1) * 100).toFixed(2)}%` : "—" },
            { label: "Equipe", value: String(funcionariosCount) },
            { label: "Medições", value: String(medicoesCount) },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-lg border bg-card p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className="text-sm font-bold mt-0.5">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Section Navigation */}
        <div className="flex gap-1 border-b pb-0">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeSection === s.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {/* Resumo */}
          {activeSection === "resumo" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                    {[
                      ["Código", currentObra.codigo],
                      ["Nome", currentObra.nome],
                      ["Empresa", empresa?.nome_fantasia || empresa?.razao_social || "—"],
                      ["CNPJ", empresa?.cnpj || "—"],
                      ["Cliente", currentObra.cliente || currentObra.construtora || "—"],
                      ["Tipo de Obra", currentObra.tipo_obra || "—"],
                      ["Engenheiro", currentObra.engenheiro_responsavel || "—"],
                      ["Endereço", currentObra.endereco || "—"],
                      ["Local", `${currentObra.cidade || ""}${currentObra.uf ? "/" + currentObra.uf : ""}` || "—"],
                      ["Início", currentObra.data_inicio ? new Date(currentObra.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
                      ["Previsão", currentObra.data_previsao_fim ? new Date(currentObra.data_previsao_fim + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
                      ["Conclusão", currentObra.data_fim ? new Date(currentObra.data_fim + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between sm:block">
                        <span className="text-muted-foreground">{label}:</span>
                        <span className="font-medium ml-1">{value || "—"}</span>
                      </div>
                    ))}
                  </div>
                  {currentObra.observacoes && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <span className="text-muted-foreground">Observações:</span>
                      <p className="mt-1">{currentObra.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick view of contract items */}
              {contratoItens.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Planilha de Contrato</CardTitle>
                      <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setActiveSection("contrato")}>
                        Ver completo →
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="text-sm text-muted-foreground">
                      {itensContrato.length} itens de contrato • {itensAditivo.length} aditivos • Total: <span className="font-semibold text-foreground">{fmtBRL(totalGeralReajustado)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Serviços Extras inline */}
              <ObraServicosExtras obraId={currentObra.id} empresaId={currentObra.empresa_id} />
            </div>
          )}

          {/* Orçamento */}
          {activeSection === "orcamento" && (
            <ObraOrcamento obraId={currentObra.id} empresaId={currentObra.empresa_id} />
          )}

          {/* Contrato (Planilha + Aditivos + Reajustes) */}
          {activeSection === "contrato" && (
            <div className="space-y-6">
              {renderItemTable(itensContrato, "Planilha de Contrato", false)}

              {/* Aditivos */}
              <div className="border-t pt-6">
                {renderItemTable(itensAditivo, "Itens Aditivos", true)}
              </div>

              {/* Reajustes */}
              <div className="border-t pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Reajustes Contratuais</h3>
                  <Button size="sm" variant="outline" onClick={() => { setReajusteForm({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" }); setShowReajusteDialog(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Novo Reajuste
                  </Button>
                </div>
                {fatorReajuste !== 1 && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm flex flex-wrap gap-4">
                    <span><span className="text-muted-foreground">Fator:</span> <span className="font-bold text-primary">{fatorReajuste.toFixed(4)}</span></span>
                    <span><span className="text-muted-foreground">Original:</span> <span className="font-medium">{fmtBRL(totalContrato + totalAditivos)}</span></span>
                    <span><span className="text-muted-foreground">Reajustado:</span> <span className="font-bold text-primary">{fmtBRL(totalGeralReajustado)}</span></span>
                  </div>
                )}
                {reajustes.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">Nenhum reajuste aplicado</div>
                ) : (
                  <div className="rounded-lg border overflow-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">%</TableHead><TableHead>Motivo</TableHead><TableHead className="w-12" />
                      </TableRow></TableHeader>
                      <TableBody>
                        {reajustes.map(r => (
                          <TableRow key={r.id} className="group">
                            <TableCell>{new Date(r.data_aplicacao + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="capitalize">{r.tipo}</TableCell>
                            <TableCell className="text-right font-medium">{r.percentual.toFixed(2)}%</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.motivo || "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteReajuste(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Escala */}
          {activeSection === "escala" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Escala de Horários — {totalHorasSemana.toFixed(1)}h/semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Dia</TableHead>
                        <TableHead className="text-center">Ent. 1</TableHead>
                        <TableHead className="text-center">Saída 1</TableHead>
                        <TableHead className="text-center">Ent. 2</TableHead>
                        <TableHead className="text-center">Saída 2</TableHead>
                        <TableHead className="text-center w-16">Hrs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DIAS_SEMANA.map(dia => {
                        const h = escala[dia] || { e1: "", s1: "", e2: "", s2: "" };
                        const horas = calcHorasDia(h);
                        return (
                          <TableRow key={dia}>
                            <TableCell className="font-medium text-xs">{DIAS_LABELS[dia]}</TableCell>
                            {(["e1", "s1", "e2", "s2"] as const).map(field => (
                              <TableCell key={field} className="text-center p-1">
                                <Input type="time" value={h[field]} onChange={e => handleEscalaChange(dia, field, e.target.value)} className="h-8 text-center w-24 mx-auto text-xs" />
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-mono text-xs font-medium">{horas > 0 ? `${horas.toFixed(1)}h` : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-3">
                  <Button onClick={handleSalvarEscala} disabled={escalaSaving} size="sm" className="gap-2"><Save className="h-3.5 w-3.5" /> {escalaSaving ? "Salvando..." : "Salvar"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Andamento */}
          {activeSection === "andamento" && contractClosed && (
            <ObraAndamento obraId={currentObra.id} empresaId={currentObra.empresa_id} status={currentObra.status} />
          )}
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Item" : (itemForm.is_aditivo ? "Novo Item Aditivo" : "Novo Item de Contrato")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº Item *</Label><Input value={itemForm.item_numero} onChange={e => setItemForm(f => ({ ...f, item_numero: e.target.value }))} placeholder="1.1" /></div>
            <div><Label>Categoria</Label>
              <Select value={itemForm.categoria} onValueChange={v => setItemForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Descrição *</Label><Input value={itemForm.descricao} onChange={e => setItemForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Unidade</Label>
              <Select value={itemForm.unidade} onValueChange={v => setItemForm(f => ({ ...f, unidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["un", "m²", "m³", "m", "kg", "t", "vb", "mês", "h", "l"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade *</Label><Input type="number" value={itemForm.quantidade || ""} onChange={e => setItemForm(f => ({ ...f, quantidade: Number(e.target.value) }))} /></div>
            <div><Label>Valor Unitário *</Label><Input type="number" step="0.01" value={itemForm.valor_unitario || ""} onChange={e => setItemForm(f => ({ ...f, valor_unitario: Number(e.target.value) }))} /></div>
            <div className="col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <Label className="text-[10px] font-bold uppercase text-amber-600 mb-1.5 block tracking-widest">Acumulado Anterior ao Sistema</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={itemForm.quantidade_acumulada_inicial || ""} 
                onChange={e => setItemForm(f => ({ ...f, quantidade_acumulada_inicial: Number(e.target.value) }))} 
                className="bg-white border-amber-200"
                placeholder="Ex: 500.00"
              />
              <p className="text-[10px] text-amber-600/70 mt-1.5 font-medium">Quantidades já medidas fora do sistema antes da implantação.</p>
            </div>
            {itemForm.quantidade > 0 && itemForm.valor_unitario > 0 && (
              <div className="flex items-center">
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm w-full text-center">
                  <span className="text-muted-foreground text-xs">Total: </span>
                  <span className="font-bold text-primary">{fmtBRL(itemForm.quantidade * itemForm.valor_unitario)}</span>
                </div>
              </div>
            )}
            {itemForm.is_aditivo && <div><Label>Nº Aditivo</Label><Input type="number" value={itemForm.aditivo_numero || ""} onChange={e => setItemForm(f => ({ ...f, aditivo_numero: Number(e.target.value) }))} /></div>}
            <div className="col-span-2 space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Etapas / Condições de Medição</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItemForm(p => ({ ...p, condicoes_medicao: [...p.condicoes_medicao, { etapa: "", percentual: 0 }] }))} className="h-7 text-[10px] gap-1 font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Plus className="h-3 w-3" /> Adicionar Etapa</Button>
              </div>
              {itemForm.condicoes_medicao.length > 0 ? (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                   {itemForm.condicoes_medicao.map((cond, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                         <Input placeholder="Ex: Execução" value={cond.etapa} onChange={e => {
                            const newC = [...itemForm.condicoes_medicao];
                            newC[idx].etapa = e.target.value;
                            setItemForm(p => ({ ...p, condicoes_medicao: newC }));
                         }} className="h-9 text-xs font-medium bg-white" />
                         <div className="relative w-24">
                           <Input type="number" placeholder="%" value={cond.percentual || ""} onChange={e => {
                              const newC = [...itemForm.condicoes_medicao];
                              newC[idx].percentual = Number(e.target.value);
                              setItemForm(p => ({ ...p, condicoes_medicao: newC }));
                           }} className="h-9 text-xs font-bold text-center bg-white pr-6" />
                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => setItemForm(p => ({ ...p, condicoes_medicao: p.condicoes_medicao.filter((_, i) => i !== idx) }))} className="h-8 w-8 text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                   ))}
                   <div className="pt-2 flex justify-between px-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">Total das Etapas:</span>
                      <span className={`text-[10px] font-black ${itemForm.condicoes_medicao.reduce((s, c) => s + c.percentual, 0) !== 100 ? "text-rose-500" : "text-emerald-500"}`}>{itemForm.condicoes_medicao.reduce((s, c) => s + c.percentual, 0)}%</span>
                   </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium italic">Nenhuma etapa definida. O item será medido integralmente.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reajuste Dialog */}
      <Dialog open={showReajusteDialog} onOpenChange={setShowReajusteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Reajuste</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data Aplicação *</Label><Input type="date" value={reajusteForm.data_aplicacao} onChange={e => setReajusteForm(f => ({ ...f, data_aplicacao: e.target.value }))} /></div>
            <div><Label>Percentual (%) *</Label><Input type="number" step="0.01" value={reajusteForm.percentual || ""} onChange={e => setReajusteForm(f => ({ ...f, percentual: Number(e.target.value) }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={reajusteForm.tipo} onValueChange={v => setReajusteForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["anual", "convenção", "acordo", "outro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Motivo</Label><Input value={reajusteForm.motivo} onChange={e => setReajusteForm(f => ({ ...f, motivo: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={reajusteForm.observacoes} onChange={e => setReajusteForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReajusteDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveReajuste}>Aplicar Reajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentManagerGeneric open={docOpen} onOpenChange={setDocOpen} entityId={currentObra.id} entityNome={currentObra.nome} basePath="obras" subpastas={subpastasDoc} />
    </AppLayout>
  );
}
