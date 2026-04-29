import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Wrench, Plus, Search, MapPin, ShoppingCart, Settings, History,
  Trash2, Edit, HardHat, Zap, Wind, Hammer, Box, Layers,
  CheckCircle2, AlertTriangle, Clock, XCircle, Package, ArrowRightLeft, Camera, DollarSign, FileText, FileBarChart
} from "lucide-react";
import { ScrollableTable } from "@/components/shared/ScrollableTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Equipamento {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  data_aquisicao: string | null;
  valor_aquisicao: number;
  obra_id: string | null;
  empresa_id: string | null;
  status: string;
  observacoes: string | null;
  foto_url?: string | null;
}

interface Manutencao {
  id: string;
  equipamento_id: string;
  tipo: string;
  descricao: string;
  data_solicitacao: string;
  data_realizacao: string | null;
  fornecedor: string | null;
  valor_orcamento: number;
  valor_aprovado: number;
  status: string;
  observacoes: string | null;
}

interface HistoricoAlocacao {
  id: string;
  data_movimentacao: string;
  obra_origem: string | null;
  obra_destino: string | null;
  responsavel: string | null;
}

const TIPOS_EQUIPAMENTO = ["Betoneira", "Guincho", "Andaime", "Compactador", "Serra", "Furadeira", "Martelete", "Vibrador", "Bomba", "Gerador", "Compressor", "Outros"];

const TIPO_ICON: Record<string, React.ReactNode> = {
  Betoneira: <Layers className="h-5 w-5" />,
  Guincho:   <Box className="h-5 w-5" />,
  Andaime:   <Layers className="h-5 w-5" />,
  Compactador: <HardHat className="h-5 w-5" />,
  Serra:     <Hammer className="h-5 w-5" />,
  Furadeira: <Hammer className="h-5 w-5" />,
  Martelete: <Hammer className="h-5 w-5" />,
  Vibrador:  <Wind className="h-5 w-5" />,
  Bomba:     <Wind className="h-5 w-5" />,
  Gerador:   <Zap className="h-5 w-5" />,
  Compressor:<Wind className="h-5 w-5" />,
  Outros:    <Wrench className="h-5 w-5" />,
};

const STATUS_EQUIP: Record<string, { label: string; badgeClass: string; barClass: string }> = {
  disponivel: { label: "Disponivel", badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", barClass: "bg-emerald-500" },
  em_uso:     { label: "Em Uso",     badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30",   barClass: "bg-blue-500" },
  manutencao: { label: "Oficina",    badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30", barClass: "bg-amber-500" },
  sucata:     { label: "Sucata",     badgeClass: "bg-rose-500/15 text-rose-600 border-rose-500/30",   barClass: "bg-rose-500" },
};

const STATUS_MANUT: Record<string, { label: string; class: string }> = {
  pendente:  { label: "Pendente",  class: "bg-amber-100 text-amber-700 border-amber-200" },
  orcamento: { label: "Orcamento", class: "bg-blue-100 text-blue-700 border-blue-200" },
  em_reparo: { label: "Em Reparo",  class: "bg-purple-100 text-purple-700 border-purple-200" },
  concluido: { label: "Concluido", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function EquipamentosProprios() {
  const [tab, setTab] = useState("painel");
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  const [busca, setBusca] = useState("");
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showManutForm, setShowManutForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<Equipamento | null>(null);
  const [historicoAlocacao, setHistoricoAlocacao] = useState<HistoricoAlocacao[]>([]);
  
  const [formEquip, setFormEquip] = useState({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, fornecedor: "", obra_id: "", empresa_id: "", status: "disponivel", observacoes: "", foto_url: "" });
  const [formManut, setFormManut] = useState({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" });
  const [transferObraId, setTransferObraId] = useState("");
  const [transferResponsavel, setTransferResponsavel] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);

  async function handleUploadFoto(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `equipamentos/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("documentos").getPublicUrl(path);
      setFormEquip(p => ({ ...p, foto_url: data.publicUrl }));
      toast({ title: "Foto enviada!" });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploadingFoto(false);
    }
  }

  const loadData = async () => {
    const [eq, mt, ob, em] = await Promise.all([
      supabase.from("equipamentos_proprios").select("*").order("codigo"),
      supabase.from("manutencoes_equipamento").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("obras").select("id, nome, codigo, status").in("status", OBRA_STATUS_ATIVOS_ARR).order("codigo"),
      supabase.from("empresas").select("id, razao_social").eq("ativo", true).order("razao_social"),
    ]);
    if (eq.data) setEquipamentos(eq.data);
    if (mt.data) setManutencoes(mt.data);
    if (ob.data) setObras(ob.data);
    if (em.data) {
      setEmpresas(em.data);
      // Auto-seleciona Irmãos Ubero (todas as ferramentas pertencem ao grupo)
      const ubero = em.data.find(e => /irm[aã]os?\s+ubero/i.test(e.razao_social)) || em.data[0];
      if (ubero && !formEquip.empresa_id) setFormEquip(p => ({ ...p, empresa_id: ubero.id }));
    }
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => {
    const total = equipamentos.length;
    const custo = manutencoes.filter(m => m.status === "concluido" || m.status === "em_reparo").reduce((s, m) => s + (m.valor_aprovado || 0), 0);
    return { total, custo };
  }, [equipamentos, manutencoes]);

  const filteredEquip = useMemo(() => {
    return equipamentos.filter(e => 
      e.descricao.toLowerCase().includes(busca.toLowerCase()) || 
      e.codigo.toLowerCase().includes(busca.toLowerCase())
    );
  }, [equipamentos, busca]);

  const equipPorObra = useMemo(() => {
    const g: Record<string, Equipamento[]> = { __almoxarifado__: [] };
    equipamentos.forEach(e => {
      if (!e.obra_id) {
        g.__almoxarifado__.push(e);
      } else {
        if (!g[e.obra_id]) g[e.obra_id] = [];
        g[e.obra_id].push(e);
      }
    });
    return g;
  }, [equipamentos]);

  async function saveEquip() {
    if (!formEquip.codigo.trim() || !formEquip.descricao.trim()) {
      toast({ title: "Preencha código e descrição", variant: "destructive" });
      return;
    }
    if (!formEquip.empresa_id) {
      toast({ title: "Selecione a empresa proprietária", variant: "destructive" });
      return;
    }
    const valor = Number(formEquip.valor_aquisicao) || 0;
    const payload: any = {
      codigo: formEquip.codigo.trim(),
      descricao: formEquip.descricao.trim(),
      tipo: formEquip.tipo || "Outros",
      marca: formEquip.marca?.trim() || null,
      modelo: formEquip.modelo?.trim() || null,
      numero_serie: formEquip.numero_serie?.trim() || null,
      data_aquisicao: formEquip.data_aquisicao || null,
      valor_aquisicao: valor,
      fornecedor: formEquip.fornecedor?.trim() || null,
      obra_id: formEquip.obra_id || null,
      empresa_id: formEquip.empresa_id,
      status: formEquip.status || "disponivel",
      observacoes: formEquip.observacoes?.trim() || null,
      foto_url: formEquip.foto_url?.trim() || null,
    };
    const { error } = editingEquip
      ? await supabase.from("equipamentos_proprios").update(payload).eq("id", editingEquip.id)
      : await supabase.from("equipamentos_proprios").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    // Lança despesa no Financeiro se for novo equipamento com valor + fornecedor + data
    if (!editingEquip && valor > 0 && payload.fornecedor && payload.data_aquisicao) {
      await supabase.from("contas_pagar").insert({
        descricao: `Aquisição de equipamento: ${payload.codigo} - ${payload.descricao}`,
        categoria: "Equipamentos",
        valor: valor,
        data_vencimento: payload.data_aquisicao,
        empresa_id: payload.empresa_id,
        obra_id: payload.obra_id,
        status: "pendente",
        observacoes: `Fornecedor: ${payload.fornecedor}`,
      });
      toast({ title: "Equipamento cadastrado!", description: "Despesa lançada no Financeiro." });
    } else {
      toast({ title: editingEquip ? "Equipamento atualizado!" : "Equipamento cadastrado!" });
    }

    setShowEquipForm(false);
    setEditingEquip(null);
    const uberoId = empresas.find(e => /irm[aã]os?\s+ubero/i.test(e.razao_social))?.id || empresas[0]?.id || "";
    setFormEquip({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, fornecedor: "", obra_id: "", empresa_id: uberoId, status: "disponivel", observacoes: "", foto_url: "" });
    loadData();
  }

  async function handleTransfer() {
    if (!selectedEquip) return;
    const finalObraId = transferObraId === "estoque" ? null : (transferObraId || null);
    await supabase.from("historico_alocacao_equipamento").insert({
      equipamento_id: selectedEquip.id,
      obra_origem_id: selectedEquip.obra_id || null,
      obra_destino_id: finalObraId,
      responsavel: transferResponsavel,
      observacoes: "Transferencia via painel"
    });
    await supabase.from("equipamentos_proprios").update({ 
      obra_id: finalObraId, 
      status: finalObraId ? "em_uso" : "disponivel" 
    }).eq("id", selectedEquip.id);
    setShowTransferForm(false); loadData(); toast({ title: "Transferido!" });
  }

  async function quickMaintenance(eq: Equipamento) {
    await supabase.from("equipamentos_proprios").update({ status: "manutencao" }).eq("id", eq.id);
    setFormManut(p => ({ ...p, equipamento_id: eq.id, descricao: "Solicitado via painel rapido" }));
    setShowManutForm(true); loadData();
  }

  async function updateManutStatus(id: string, status: string) {
    await supabase.from("manutencoes_equipamento").update({ status }).eq("id", id);
    loadData();
  }

  async function openHistorico(eq: Equipamento) {
    setSelectedEquip(eq);
    const { data } = await supabase.from("historico_alocacao_equipamento")
      .select("*, obras_origem:obra_origem_id(nome), obras_destino:obra_destino_id(nome)")
      .eq("equipamento_id", eq.id).order("data_movimentacao", { ascending: false });
    if (data) setHistoricoAlocacao(data.map((h: any) => ({
      id: h.id, data_movimentacao: h.data_movimentacao,
      obra_origem: h.obras_origem?.nome || "Deposito",
      obra_destino: h.obras_destino?.nome || "Deposito",
      responsavel: h.responsavel
    })));
    setShowHistorico(true);
  }

  function gerarPdfBase(titulo: string) {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Irmãos Ubero Engenharia", 14, 15);
    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text(titulo, 14, 22);
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);
    doc.setTextColor(0);
    return doc;
  }

  function relatorioManutencoes() {
    const doc = gerarPdfBase("Relatório de Manutenções");
    autoTable(doc, {
      startY: 33,
      head: [["Equipamento", "Tipo", "Descrição", "Solicitação", "Realização", "Fornecedor", "Orçamento", "Aprovado", "Status"]],
      body: manutencoes.map(m => {
        const eq = equipamentos.find(e => e.id === m.equipamento_id);
        return [
          eq ? `${eq.codigo} - ${eq.descricao}` : "---",
          m.tipo,
          m.descricao || "",
          m.data_solicitacao ? new Date(m.data_solicitacao).toLocaleDateString("pt-BR") : "",
          m.data_realizacao ? new Date(m.data_realizacao).toLocaleDateString("pt-BR") : "-",
          m.fornecedor || "-",
          `R$ ${(m.valor_orcamento || 0).toLocaleString("pt-BR")}`,
          `R$ ${(m.valor_aprovado || 0).toLocaleString("pt-BR")}`,
          STATUS_MANUT[m.status]?.label || m.status,
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 80, 45] },
    });
    const totalApr = manutencoes.reduce((s, m) => s + (m.valor_aprovado || 0), 0);
    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(`Total Aprovado: R$ ${totalApr.toLocaleString("pt-BR")}`, 14, y);
    doc.save(`relatorio-manutencoes-${new Date().toISOString().slice(0,10)}.pdf`);
    toast({ title: "Relatório gerado!" });
  }

  function relatorioPorObra() {
    const doc = gerarPdfBase("Ferramentas por Obra");
    let y = 33;
    Object.entries(equipPorObra).forEach(([obraId, eqs]) => {
      const obra = obras.find(o => o.id === obraId);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      if (y > 270) { doc.addPage(); y = 15; }
      doc.text(`${obra?.codigo || ""} - ${obra?.nome || "Obra"} (${eqs.length})`, 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [["Código", "Descrição", "Tipo", "Marca/Modelo", "Status"]],
        body: eqs.map(e => [e.codigo, e.descricao, e.tipo, `${e.marca || ""} ${e.modelo || ""}`.trim() || "-", STATUS_EQUIP[e.status]?.label || e.status]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [60, 80, 45] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    });
    doc.save(`ferramentas-por-obra-${new Date().toISOString().slice(0,10)}.pdf`);
    toast({ title: "Relatório gerado!" });
  }

  function relatorioDisponiveis() {
    const doc = gerarPdfBase("Ferramentas Disponíveis (Almoxarifado)");
    const lista = equipamentos.filter(e => e.status === "disponivel" && !e.obra_id);
    autoTable(doc, {
      startY: 33,
      head: [["Código", "Descrição", "Tipo", "Marca", "Modelo", "Nº Série", "Valor"]],
      body: lista.map(e => [
        e.codigo, e.descricao, e.tipo, e.marca || "-", e.modelo || "-",
        e.numero_serie || "-", `R$ ${(e.valor_aquisicao || 0).toLocaleString("pt-BR")}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 80, 45] },
    });
    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(`Total disponíveis: ${lista.length}`, 14, y);
    doc.save(`ferramentas-disponiveis-${new Date().toISOString().slice(0,10)}.pdf`);
    toast({ title: "Relatório gerado!" });
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="p-3 rounded-xl bg-primary/10 text-primary"><Wrench size={24} /></div>
             <div>
                <h1 className="text-2xl font-bold">Frota e Equipamentos</h1>
                <p className="text-sm text-muted-foreground">Controle de ativos IU e manutenções.</p>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2"><FileBarChart size={18} /> Relatórios</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Gerar PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={relatorioManutencoes} className="gap-2"><Wrench size={14} /> Manutenções</DropdownMenuItem>
                <DropdownMenuItem onClick={relatorioPorObra} className="gap-2"><MapPin size={14} /> Ferramentas por Obra</DropdownMenuItem>
                <DropdownMenuItem onClick={relatorioDisponiveis} className="gap-2"><Package size={14} /> Ferramentas Disponíveis</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => { setEditingEquip(null); setShowEquipForm(true); }} className="gap-2"><Plus size={18} /> Novo Equipamento</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card className="bg-primary/5"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-muted-foreground">Total Frota</p><p className="text-2xl font-black">{stats.total}</p></CardContent></Card>
           <Card className="bg-emerald-50"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-emerald-600">Disponiveis</p><p className="text-2xl font-black text-emerald-700">{equipamentos.filter(e => e.status === "disponivel").length}</p></CardContent></Card>
           <Card className="bg-amber-50"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-amber-600">Em Oficina</p><p className="text-2xl font-black text-amber-700">{equipamentos.filter(e => e.status === "manutencao").length}</p></CardContent></Card>
           <Card className="bg-rose-50 border-rose-100"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-rose-600">Custo Total</p><p className="text-xl font-black text-rose-700">R$ {stats.custo.toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
           <TabsList><TabsTrigger value="painel">Localizacoes</TabsTrigger><TabsTrigger value="cadastro">Catalogo</TabsTrigger><TabsTrigger value="manutencao">Manutencoes</TabsTrigger></TabsList>
           
           <TabsContent value="painel" className="mt-4 space-y-4">
              {Object.entries(equipPorObra).map(([id, eqs]) => (
                <Card key={id} className="overflow-hidden">
                  <CardHeader className="py-2 px-4 bg-muted/40 border-b flex flex-row items-center justify-between"><CardTitle className="text-sm font-bold">{obras.find(o => o.id === id)?.nome || "Obra"}</CardTitle><Badge variant="outline">{eqs.length}</Badge></CardHeader>
                  <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {eqs.map(eq => (
                      <div key={eq.id} className="flex gap-3 p-3 border rounded-xl bg-card hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                           {eq.foto_url ? <img src={eq.foto_url} className="w-full h-full object-cover" /> : TIPO_ICON[eq.tipo]}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold truncate">{eq.descricao}</p>
                           <p className="text-[10px] text-muted-foreground font-mono">{eq.codigo}</p>
                           <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={() => { setSelectedEquip(eq); setTransferObraId(eq.obra_id || "estoque"); setShowTransferForm(true); }}><ArrowRightLeft size={12} /> Transf.</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1 text-amber-600" onClick={() => quickMaintenance(eq)}><Wrench size={12} /> Oficina</Button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
           </TabsContent>

           <TabsContent value="cadastro" className="mt-4 space-y-4">
              <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome ou codigo..." value={busca} onChange={e => setBusca(e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {filteredEquip.map(eq => {
                    const st = STATUS_EQUIP[eq.status];
                    const eqCusto = manutencoes.filter(m => m.equipamento_id === eq.id && (m.status === "concluido" || m.status === "em_reparo")).reduce((s, m) => s + (m.valor_aprovado || 0), 0);
                    return (
                      <Card key={eq.id} className="overflow-hidden hover:shadow-md transition-all">
                        <div className={`h-1 ${st?.barClass}`} />
                        <CardContent className="p-4 space-y-3">
                           <div className="flex gap-3">
                              <div className="w-16 h-16 rounded-xl bg-muted border overflow-hidden flex items-center justify-center">
                                 {eq.foto_url ? <img src={eq.foto_url} className="w-full h-full object-cover" /> : <Camera className="text-muted-foreground/30" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-sm truncate">{eq.descricao}</p>
                                 <p className="text-xs text-muted-foreground font-mono">{eq.codigo}</p>
                                 <div className="flex items-center justify-between mt-2">
                                    <Badge variant="outline" className={`text-[10px] ${st?.badgeClass}`}>{st?.label}</Badge>
                                    {eqCusto > 0 && <span className="text-[10px] font-black text-rose-600">R$ {eqCusto.toLocaleString("pt-BR")}</span>}
                                 </div>
                              </div>
                           </div>
                           <div className="flex gap-1 border-t pt-3">
                              <Button size="sm" variant="ghost" className="h-8 flex-1 text-primary" title="Transferir / Disponibilizar para obra" onClick={() => { setSelectedEquip(eq); setTransferObraId(eq.obra_id || "estoque"); setTransferResponsavel(""); setShowTransferForm(true); }}><ArrowRightLeft size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1" title="Histórico" onClick={() => openHistorico(eq)}><History size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1 text-amber-600" title="Enviar para oficina" onClick={() => quickMaintenance(eq)}><Wrench size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1" title="Editar" onClick={() => { setEditingEquip(eq); setFormEquip({ ...eq, marca: eq.marca || "", modelo: eq.modelo || "", numero_serie: eq.numero_serie || "", data_aquisicao: eq.data_aquisicao || "", foto_url: eq.foto_url || "", empresa_id: eq.empresa_id || "", obra_id: eq.obra_id || "", observacoes: eq.observacoes || "", fornecedor: (eq as any).fornecedor || "" }); setShowEquipForm(true); }}><Edit size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1 text-rose-500" title="Excluir" onClick={async () => { if(confirm("Excluir?")) { await supabase.from("equipamentos_proprios").delete().eq("id", eq.id); loadData(); } }}><Trash2 size={16} /></Button>
                           </div>
                        </CardContent>
                      </Card>
                    );
                 })}
              </div>
           </TabsContent>

           <TabsContent value="manutencao" className="mt-4">
              <ScrollableTable>
                 <Table>
                    <TableHeader><TableRow className="bg-muted/50"><TableHead>Equipamento</TableHead><TableHead>Descricao</TableHead><TableHead>Valores</TableHead><TableHead>Status</TableHead><TableHead>Acao</TableHead></TableRow></TableHeader>
                    <TableBody>
                       {manutencoes.map(m => (
                         <TableRow key={m.id}>
                            <TableCell className="text-xs font-bold">{equipamentos.find(e => e.id === m.equipamento_id)?.descricao || "---"}</TableCell>
                            <TableCell className="text-[10px] max-w-[200px] truncate">{m.descricao}</TableCell>
                            <TableCell className="text-[10px]">
                               <p className="text-muted-foreground">Orc: R$ {m.valor_orcamento?.toLocaleString("pt-BR")}</p>
                               <p className="font-bold text-emerald-600">Apr: R$ {m.valor_aprovado?.toLocaleString("pt-BR")}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_MANUT[m.status]?.class}`}>{STATUS_MANUT[m.status]?.label}</Badge></TableCell>
                            <TableCell>
                               <Select value={m.status} onValueChange={v => updateManutStatus(m.id, v)}>
                                  <SelectTrigger className="h-8 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Object.entries(STATUS_MANUT).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                               </Select>
                            </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                 </Table>
              </ScrollableTable>
           </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showEquipForm} onOpenChange={setShowEquipForm}>
         <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editingEquip ? "Editar Equipamento" : "Novo Cadastro"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
               <div className="md:col-span-2 space-y-2">
                  <Label>Foto do Equipamento</Label>
                  <div className="flex items-start gap-3">
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {formEquip.foto_url ? (
                        <img src={formEquip.foto_url} className="w-full h-full object-cover" alt="Prévia" />
                      ) : (
                        <Camera className="text-muted-foreground/40" size={28} />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                          <Camera size={14} />
                          {uploadingFoto ? "Enviando..." : (formEquip.foto_url ? "Trocar foto" : "Enviar foto do dispositivo")}
                          <input type="file" accept="image/*" className="hidden" disabled={uploadingFoto} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFoto(f); e.target.value = ""; }} />
                        </label>
                        {formEquip.foto_url && (
                          <Button type="button" size="sm" variant="ghost" className="h-9 text-rose-600" onClick={() => setFormEquip({ ...formEquip, foto_url: "" })}>
                            <Trash2 size={14} className="mr-1" /> Remover
                          </Button>
                        )}
                      </div>
                      <Input value={formEquip.foto_url} onChange={e => setFormEquip({...formEquip, foto_url: e.target.value})} placeholder="ou cole uma URL: https://..." className="text-xs" />
                      <p className="text-[10px] text-muted-foreground">JPG, PNG ou WEBP — máx. 5MB.</p>
                    </div>
                  </div>
               </div>
               <div><Label>Codigo IU *</Label><Input value={formEquip.codigo} onChange={e => setFormEquip({...formEquip, codigo: e.target.value})} /></div>
               <div><Label>Descricao *</Label><Input value={formEquip.descricao} onChange={e => setFormEquip({...formEquip, descricao: e.target.value})} /></div>
               <div><Label>Tipo</Label><Select value={formEquip.tipo} onValueChange={v => setFormEquip({...formEquip, tipo: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
               <div><Label>Status Atual</Label><Select value={formEquip.status} onValueChange={v => setFormEquip({...formEquip, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_EQUIP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
               <div><Label>Marca</Label><Input value={formEquip.marca} onChange={e => setFormEquip({...formEquip, marca: e.target.value})} placeholder="Ex: Bosch, Makita" /></div>
               <div><Label>Modelo</Label><Input value={formEquip.modelo} onChange={e => setFormEquip({...formEquip, modelo: e.target.value})} placeholder="Ex: GSB 550" /></div>
               <div><Label>Nº de Série <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label><Input value={formEquip.numero_serie} onChange={e => setFormEquip({...formEquip, numero_serie: e.target.value})} placeholder="Deixe em branco se não houver" /></div>
               <div><Label>Data de Aquisição <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label><Input type="date" value={formEquip.data_aquisicao} onChange={e => setFormEquip({...formEquip, data_aquisicao: e.target.value})} /></div>
               <div><Label>Valor de Aquisição (R$) <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label><Input type="number" step="0.01" min="0" value={formEquip.valor_aquisicao || ""} onChange={e => setFormEquip({...formEquip, valor_aquisicao: parseFloat(e.target.value) || 0})} placeholder="0,00" /></div>
               <div><Label>Fornecedor <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label><Input value={formEquip.fornecedor} onChange={e => setFormEquip({...formEquip, fornecedor: e.target.value})} placeholder="Onde foi adquirido" /></div>
               <div><Label>Empresa Proprietária *</Label><Select value={formEquip.empresa_id || ""} onValueChange={v => setFormEquip({...formEquip, empresa_id: v})}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
               <div><Label>Obra atual (opcional)</Label><Select value={formEquip.obra_id || "estoque"} onValueChange={v => setFormEquip({...formEquip, obra_id: v === "estoque" ? "" : v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="estoque">Almoxarifado</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} — {o.nome}</SelectItem>)}</SelectContent></Select></div>
               <div className="md:col-span-2"><Label>Observacoes</Label><Textarea value={formEquip.observacoes} onChange={e => setFormEquip({...formEquip, observacoes: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={saveEquip} className="w-full">Confirmar e Salvar</Button></DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={showTransferForm} onOpenChange={setShowTransferForm}>
         <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft size={20} /> Transferir</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <div className="p-3 bg-muted rounded-lg"><p className="text-xs font-bold text-muted-foreground uppercase">Equipamento</p><p className="font-black text-sm">{selectedEquip?.codigo} - {selectedEquip?.descricao}</p></div>
               <div><Label>Obra Destino</Label><Select value={transferObraId} onValueChange={setTransferObraId}><SelectTrigger><SelectValue placeholder="Estoque Principal" /></SelectTrigger><SelectContent><SelectItem value="estoque">Estoque Principal</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select></div>
               <div><Label>Responsavel pela Movimentacao</Label><Input value={transferResponsavel} onChange={e => setTransferResponsavel(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleTransfer} className="w-full">Confirmar Transferencia</Button></DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
         <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Rastreabilidade</DialogTitle></DialogHeader>
            <div className="py-2 space-y-3">
               {historicoAlocacao.map(h => (
                 <div key={h.id} className="text-xs p-3 border rounded-lg bg-muted/20 flex flex-col gap-1">
                   <p className="font-bold text-primary">{new Date(h.data_movimentacao).toLocaleString()}</p>
                   <p>Removido de <b>{h.obra_origem}</b> para <b>{h.obra_destino}</b></p>
                   <p className="text-muted-foreground italic">Responsavel: {h.responsavel || "N/A"}</p>
                 </div>
               ))}
               {historicoAlocacao.length === 0 && <p className="text-center py-8 text-muted-foreground italic">Sem registros de movimentacao.</p>}
            </div>
         </DialogContent>
      </Dialog>

      <Dialog open={showManutForm} onOpenChange={setShowManutForm}>
         <DialogContent>
            <DialogHeader><DialogTitle>Ordem de Servico / Oficina</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <div><Label>Descricao da Falha</Label><Textarea value={formManut.descricao} onChange={e => setFormManut({...formManut, descricao: e.target.value})} /></div>
               <div><Label>Fornecedor sugerido</Label><Input value={formManut.fornecedor || ""} onChange={e => setFormManut({...formManut, fornecedor: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={async () => {
               if (!formManut.equipamento_id) return;
               await supabase.from("manutencoes_equipamento").insert({
                 equipamento_id: formManut.equipamento_id,
                 tipo: formManut.tipo,
                 descricao: formManut.descricao,
                 fornecedor: formManut.fornecedor || null,
                 valor_orcamento: formManut.valor_orcamento || 0,
                 valor_aprovado: formManut.valor_aprovado || 0,
                 observacoes: formManut.observacoes || null,
                 empresa_id: selectedEquip?.empresa_id || equipamentos.find(e => e.id === formManut.equipamento_id)?.empresa_id || null,
                 status: "pendente",
               } as any);
               setShowManutForm(false); loadData(); toast({ title: "Manutenção solicitada!" });
            }} className="w-full">ENVIAR AGORA</Button></DialogFooter>
         </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
