import { AppLayout } from "@/components/layout/AppLayout";
import {
  Search, Package, AlertTriangle, Smartphone, Plus,
  FileSignature, History, CheckCircle2, User, HardHat,
  Trash2, ShoppingCart, RefreshCw, Clipboard, Edit,
  Camera, Pen, FileDown, RotateCcw, AlertCircle, XCircle,
  QrCode, Copy, Clock, CheckCheck, FileText
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FichasEPIPanel from "@/components/epi/FichasEPIPanel";
import { ImportarFichasAntigas } from "@/components/epi/ImportarFichasAntigas";
import { ScrollableTable } from "@/components/shared/ScrollableTable";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";
import { gerarFichaEPIPdf } from "@/lib/gerarFichaEPIPdf";
import QRCode from "qrcode";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ConfirmacaoBadge({ tipo }: { tipo: string }) {
  if (tipo === "foto_responsavel")
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">✅ Foto confirmada</Badge>;
  if (tipo === "assinatura_digital")
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">✅ Assinado digitalmente</Badge>;
  if (tipo === "pdf_fisico")
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">📄 PDF gerado</Badge>;
  return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">⏳ Pendente</Badge>;
}

function StatusEPIBadge({ status }: { status: string }) {
  if (status === "devolvido")
    return <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-[10px]">↩ Devolvido</Badge>;
  if (status === "perdido")
    return <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">❌ Perdido</Badge>;
  if (status === "danificado")
    return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">⚠️ Danificado</Badge>;
  return null; // ativo = sem badge extra
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EntregaEPI() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("entregas");
  const [showNewDelivery, setShowNewDelivery] = useState(false);

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [form, setForm] = useState({ funcionario_id: "", obra_id: "central" });

  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // ─── Devolução ──────────────────────────────────────────────────────────────
  const [showDevolucaoDialog, setShowDevolucaoDialog] = useState(false);
  const [devolucaoTarget, setDevolucaoTarget] = useState<any>(null);
  const [devolucaoForm, setDevolucaoForm] = useState({
    status: "devolvido",
    data_devolucao: format(new Date(), "yyyy-MM-dd"),
    observacao: "",
  });

  // ─── Assinatura Digital (QR) ────────────────────────────────────────────────
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ funcId: string; funcNome: string; empresa_id: string } | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrImg, setQrImg] = useState("");
  const [generatingQR, setGeneratingQR] = useState(false);

  // ─── Filtros ────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState("ativo");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ent, prd, mov, obs, fun] = await Promise.all([
        supabase
          .from("entregas_epi")
          .select("*, funcionarios(nome, empresa_id), produtos(descricao, ca_numero, categoria), obras(nome, codigo)")
          .order("data_entrega", { ascending: false })
          .limit(500),
        supabase.from("produtos").select("*").order("descricao"),
        supabase.from("movimentacoes_estoque").select("produto_id, tipo, quantidade"),
        supabase.from("obras").select("id, nome, codigo").in("status", OBRA_STATUS_ATIVOS_ARR),
        supabase.from("funcionarios").select("id, nome, obra_id, empresa_id").neq("status", "desligado").order("nome"),
      ]);

      if (ent.data) setEntregas(ent.data);
      if (obs.data) setObras(obs.data);
      if (fun.data) setFuncionarios(fun.data);

      if (prd.data && mov.data) {
        const episOnly = prd.data.filter(p =>
          p.categoria?.toUpperCase() === "EPI" ||
          p.descricao?.toUpperCase().includes("EPI")
        );
        const calculated = episOnly.map(p => {
          const entradas = (mov.data as any[]).filter(m => m.produto_id === p.id && m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
          const saidas = (mov.data as any[]).filter(m => m.produto_id === p.id && m.tipo !== "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
          return { ...p, saldo: entradas - saidas };
        });
        setProdutos(calculated);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── CA Automático ──────────────────────────────────────────────────────────
  const handleToggleItem = (produto: any) => {
    const exists = selectedItems.find(i => i.produto_id === produto.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.produto_id !== produto.id));
    } else {
      setSelectedItems([...selectedItems, {
        produto_id: produto.id,
        descricao: produto.descricao,
        quantidade: 1,
        ca_numero: produto.ca_numero || "", // ← puxado do cadastro do produto
        ca_do_produto: produto.ca_numero || "", // referência para readonly
        sem_ca: !produto.ca_numero, // flag de aviso
        observacoes: "Primeira Entrega"
      }]);
    }
  };

  const updateSelectedItem = (produtoId: string, field: string, value: any) => {
    // CA nunca é editável pelo usuário — ignorar tentativas de alterar ca_numero
    if (field === "ca_numero") return;
    setSelectedItems(selectedItems.map(i => i.produto_id === produtoId ? { ...i, [field]: value } : i));
  };

  const temItensSemCA = selectedItems.some(i => i.sem_ca);

  // ─── Salvar Entrega ─────────────────────────────────────────────────────────
  const handleSaveMultiDelivery = async () => {
    if (!form.funcionario_id || selectedItems.length === 0) {
      toast({ title: "Selecione o funcionário e ao menos um EPI", variant: "destructive" });
      return;
    }
    if (temItensSemCA) {
      toast({
        title: "CA obrigatório",
        description: "Um ou mais EPIs não possuem CA cadastrado. Atualize o cadastro do produto antes de entregar.",
        variant: "destructive"
      });
      return;
    }

    const func = funcionarios.find(f => f.id === form.funcionario_id);
    const useObraId = form.obra_id === "central" ? null : (form.obra_id || null);

    try {
      const deliveryRows = selectedItems.map(item => ({
        funcionario_id: form.funcionario_id,
        produto_id: item.produto_id,
        obra_id: useObraId,
        empresa_id: func?.empresa_id || "",
        quantidade: Number(item.quantidade),
        ca_numero: item.ca_numero || null,
        motivo: item.observacoes,
        observacoes: `Entrega via sistema - ${item.observacoes}`,
        data_entrega: new Date().toISOString(),
        status: "ativo",
        confirmacao_tipo: "pendente",
      }));

      const { error: delErr } = await supabase.from("entregas_epi").insert(deliveryRows);
      if (delErr) throw delErr;

      const movementRows = selectedItems.map(item => ({
        produto_id: item.produto_id,
        tipo: "saida",
        quantidade: Number(item.quantidade),
        obra_id: useObraId,
        observacoes: `Entrega EPI: ${item.observacoes} - ${func?.nome}`
      }));

      const { error: movErr } = await supabase.from("movimentacoes_estoque").insert(movementRows);
      if (movErr) throw movErr;

      toast({ title: `🛡️ ${selectedItems.length} EPI(s) entregue(s) com sucesso!` });
      setShowNewDelivery(false);
      setSelectedItems([]);
      setForm({ ...form, funcionario_id: "" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar entrega", description: err.message, variant: "destructive" });
    }
  };

  // ─── Confirmação: Foto ──────────────────────────────────────────────────────
  const handleFotoConfirmacao = async (entrega: any, file: File) => {
    try {
      const timestamp = Date.now();
      const path = `${entrega.obra_id || "central"}/${entrega.funcionario_id}/${timestamp}_foto.jpg`;
      const { error: upErr } = await supabase.storage.from("documentos-epi").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("documentos-epi").getPublicUrl(path);

      const { error } = await supabase.from("entregas_epi").update({
        confirmacao_tipo: "foto_responsavel",
        confirmacao_url: urlData.publicUrl,
        confirmacao_em: new Date().toISOString(),
      }).eq("id", entrega.id);
      if (error) throw error;

      toast({ title: "✅ Confirmação por foto registrada!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao confirmar por foto", description: err.message, variant: "destructive" });
    }
  };

  // ─── Confirmação: Assinatura Digital ───────────────────────────────────────
  const handleGerarAssinaturaDigital = async (entrega: any) => {
    setGeneratingQR(true);
    setQrTarget({ funcId: entrega.funcionario_id, funcNome: entrega.funcionarios?.nome, empresa_id: entrega.funcionarios?.empresa_id });
    try {
      // Buscar todas as entregas ativas do funcionário sem assinatura
      const { data: todasEntregas } = await supabase
        .from("entregas_epi")
        .select("id")
        .eq("funcionario_id", entrega.funcionario_id)
        .eq("status", "ativo")
        .eq("confirmacao_tipo", "pendente");

      const entregasIds = (todasEntregas || []).map((e: any) => e.id);
      if (entregasIds.length === 0) {
        toast({ title: "Nenhuma entrega pendente de assinatura", variant: "destructive" });
        setGeneratingQR(false);
        return;
      }

      // Criar token
      const { data: token, error } = await supabase
        .from("epi_tokens_assinatura")
        .insert({
          funcionario_id: entrega.funcionario_id,
          obra_id: entrega.obra_id || null,
          entregas_ids: entregasIds,
          status: "pendente",
        })
        .select("token")
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/portal/epi/assinar/${token.token}`;
      setQrUrl(url);

      // Gerar QR
      const qr = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#1A3D0A", light: "#FFFFFF" } });
      setQrImg(qr);
      setShowQRDialog(true);

      // Marcar entregas como "aguardando assinatura"
      await supabase.from("entregas_epi")
        .update({ confirmacao_tipo: "pendente" })
        .in("id", entregasIds);

      toast({ title: "📱 Link de assinatura criado!", description: `${entregasIds.length} EPI(s) incluídos` });
    } catch (err: any) {
      toast({ title: "Erro ao gerar assinatura digital", description: err.message, variant: "destructive" });
    }
    setGeneratingQR(false);
  };

  // ─── Confirmação: PDF ───────────────────────────────────────────────────────
  const handleGerarPDF = async (entrega: any) => {
    const empresaId = entrega.funcionarios?.empresa_id;
    if (!empresaId) {
      toast({ title: "Empresa do funcionário não encontrada", variant: "destructive" });
      return;
    }
    try {
      const blob = await gerarFichaEPIPdf(entrega.funcionario_id, empresaId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ficha_EPI_${entrega.funcionarios?.nome?.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await supabase.from("entregas_epi").update({
        confirmacao_tipo: "pdf_fisico",
        confirmacao_em: new Date().toISOString(),
      }).eq("id", entrega.id);

      toast({ title: "📄 PDF gerado! Colha a rubrica do colaborador." });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    }
  };

  // ─── Devolução ──────────────────────────────────────────────────────────────
  const openDevolucao = (entrega: any) => {
    setDevolucaoTarget(entrega);
    setDevolucaoForm({
      status: "devolvido",
      data_devolucao: format(new Date(), "yyyy-MM-dd"),
      observacao: "",
    });
    setShowDevolucaoDialog(true);
  };

  const handleSaveDevolucao = async () => {
    if (!devolucaoTarget) return;
    if ((devolucaoForm.status === "perdido" || devolucaoForm.status === "danificado") && !devolucaoForm.observacao) {
      toast({ title: "Observação obrigatória para perda/dano", variant: "destructive" });
      return;
    }
    try {
      const categoriaReutilizavel = ["uniforme", "capacete", "cinto", "talabarte"].some(cat =>
        devolucaoTarget.produtos?.categoria?.toLowerCase().includes(cat)
      );
      const disponivel_reuso = devolucaoForm.status === "devolvido" && categoriaReutilizavel;

      const { error } = await supabase.from("entregas_epi").update({
        status: devolucaoForm.status,
        data_devolucao: devolucaoForm.data_devolucao,
        observacoes: devolucaoForm.observacao || devolucaoTarget.observacoes,
        disponivel_reuso,
      }).eq("id", devolucaoTarget.id);
      if (error) throw error;

      toast({ title: `✅ Devolução registrada como: ${devolucaoForm.status}` });
      setShowDevolucaoDialog(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao registrar devolução", description: err.message, variant: "destructive" });
    }
  };

  // ─── Exclusão ───────────────────────────────────────────────────────────────
  const handleDeleteDelivery = async (delivery: any) => {
    if (!confirm(`Deseja excluir a entrega de ${delivery.produtos?.descricao} para ${delivery.funcionarios?.nome}? O estoque será estornado.`)) return;
    try {
      const { error: delErr } = await supabase.from("entregas_epi").delete().eq("id", delivery.id);
      if (delErr) throw delErr;
      await supabase.from("movimentacoes_estoque").insert({
        produto_id: delivery.produto_id,
        tipo: "entrada",
        quantidade: delivery.quantidade,
        obra_id: delivery.obra_id,
        observacoes: `ESTORNO: Exclusão de entrega para ${delivery.funcionarios?.nome}`
      });
      toast({ title: "Entrega excluída e estoque estornado!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  // ─── Filtros ────────────────────────────────────────────────────────────────
  const filteredEntregas = useMemo(() => {
    return entregas.filter(e => {
      const matchSearch = !search ||
        e.funcionarios?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        e.produtos?.descricao?.toLowerCase().includes(search.toLowerCase()) ||
        e.obras?.nome?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "todos" || (e.status || "ativo") === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [entregas, search, filterStatus]);

  const kpiAtivos = entregas.filter(e => (e.status || "ativo") === "ativo").length;
  const kpiPendentes = entregas.filter(e => (e.confirmacao_tipo || "pendente") === "pendente" && (e.status || "ativo") === "ativo").length;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6 p-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/20">
              <HardHat size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Segurança (EPIs)</h1>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Gestão de fichas e estoque NR-6.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setSelectedItems([]); setShowNewDelivery(true); }} className="bg-amber-500 hover:bg-amber-600 text-white border-none h-12 gap-3 px-8 shadow-xl shadow-amber-500/20 rounded-xl font-bold">
              <Plus size={20} /> Nova Entrega
            </Button>
            <ImportarFichasAntigas onImported={loadData} />
            <Button variant="outline" asChild className="h-12 rounded-xl border-slate-200">
              <a href="/entrega-epi-mobile" className="gap-2"><Smartphone size={18} /> Mobile</a>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-emerald-200 transition-colors cursor-pointer" onClick={() => setFilterStatus("ativo")}>
            <CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={28} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">EPIs Ativos</p>
                <p className="text-3xl font-black text-slate-800">{kpiAtivos}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-amber-200 transition-colors cursor-pointer" onClick={() => setFilterStatus("ativo")}>
            <CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Clock size={28} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pendentes de confirmação</p>
                <p className="text-3xl font-black text-slate-800">{kpiPendentes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-sky-200 transition-colors cursor-pointer" onClick={() => setFilterStatus("devolvido")}>
            <CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl"><RotateCcw size={28} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Devolvidos</p>
                <p className="text-3xl font-black text-slate-800">{entregas.filter(e => e.status === "devolvido").length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-blue-200 transition-colors">
            <CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><User size={28} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Colaboradores</p>
                <p className="text-3xl font-black text-slate-800">{funcionarios.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-slate-100/50 p-1 mb-6 h-12 w-full max-w-md rounded-2xl border border-slate-200/50">
            <TabsTrigger value="entregas" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider"><History size={16} /> Histórico</TabsTrigger>
            <TabsTrigger value="fichas" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider"><FileSignature size={16} /> Fichas Digitais</TabsTrigger>
          </TabsList>

          <TabsContent value="entregas" className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-3 items-center">
              <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Localizar por nome, material ou obra..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 border-none bg-transparent h-12 font-medium" />
                </div>
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-xl border bg-white px-4 h-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativos</option>
                <option value="devolvido">Devolvidos</option>
                <option value="perdido">Perdidos</option>
                <option value="danificado">Danificados</option>
              </select>
            </div>

            <ScrollableTable>
              <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">📅 Data</th>
                      <th className="px-4 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">👤 Funcionário</th>
                      <th className="px-4 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">🛡️ EPI</th>
                      <th className="px-4 py-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Qtd</th>
                      <th className="px-4 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">📍 Obra</th>
                      <th className="px-4 py-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Status</th>
                      <th className="px-4 py-4 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Confirmação</th>
                      <th className="px-4 py-4 text-right text-[10px] uppercase font-black text-slate-400 tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Carregando...</td></tr>
                    ) : filteredEntregas.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nenhuma entrega encontrada.</td></tr>
                    ) : filteredEntregas.map(e => (
                      <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-4 text-xs font-semibold text-slate-400">{format(new Date(e.data_entrega), "dd/MM/yyyy")}</td>
                        <td className="px-4 py-4 font-bold text-slate-800">{e.funcionarios?.nome || "—"}</td>
                        <td className="px-4 py-4 text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-semibold">{e.produtos?.descricao}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">CA: {e.ca_numero || e.produtos?.ca_numero || "—"} • {e.motivo || e.observacoes}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="px-3 py-1.5 rounded-xl font-black text-amber-600 bg-amber-50 border border-amber-100 text-xs">{e.quantidade}x</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] uppercase px-2 font-bold">{e.obras?.codigo || "CENTRAL"}</Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <StatusEPIBadge status={e.status || "ativo"} />
                          {(!e.status || e.status === "ativo") && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px]">✅ Ativo</Badge>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <ConfirmacaoBadge tipo={e.confirmacao_tipo || "pendente"} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Botão 1: Foto */}
                            {(e.status || "ativo") === "ativo" && (
                              <label className="cursor-pointer" title="📷 Confirmar com Foto">
                                <input type="file" accept="image/*" className="hidden" onChange={ev => {
                                  const file = ev.target.files?.[0];
                                  if (file) handleFotoConfirmacao(e, file);
                                  ev.target.value = "";
                                }} />
                                <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[10px] font-bold transition-colors">
                                  <Camera size={12} /> Foto
                                </span>
                              </label>
                            )}
                            {/* Botão 2: Assinatura Digital */}
                            {(e.status || "ativo") === "ativo" && (
                              <button
                                onClick={() => handleGerarAssinaturaDigital(e)}
                                disabled={generatingQR}
                                title="📱 Gerar QR para assinatura digital"
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold transition-colors disabled:opacity-50"
                              >
                                <QrCode size={12} /> QR
                              </button>
                            )}
                            {/* Botão 3: PDF */}
                            {(e.status || "ativo") === "ativo" && (
                              <button
                                onClick={() => handleGerarPDF(e)}
                                title="📄 Gerar PDF físico"
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-[10px] font-bold transition-colors"
                              >
                                <FileDown size={12} /> PDF
                              </button>
                            )}
                            {/* Devolução */}
                            {(e.status || "ativo") === "ativo" && (
                              <button
                                onClick={() => openDevolucao(e)}
                                title="Registrar devolução"
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 text-[10px] font-bold transition-colors"
                              >
                                <RotateCcw size={12} /> Dev.
                              </button>
                            )}
                            {/* Excluir */}
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDelivery(e)} className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollableTable>
          </TabsContent>

          <TabsContent value="fichas">
            <FichasEPIPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Dialog: Nova Entrega ──────────────────────────────────────────────── */}
      <Dialog open={showNewDelivery} onOpenChange={setShowNewDelivery}>
        <DialogContent className="w-[96vw] max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl sm:rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader className="p-4 sm:p-8 border-b bg-white flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-2xl font-black flex items-center gap-2 sm:gap-3 text-slate-800 uppercase tracking-tight italic">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/30"><HardHat size={20} /></div>
                Checkout de Segurança
              </DialogTitle>
              <p className="text-slate-400 font-medium text-xs sm:text-sm">Selecione os itens e confirme o recebimento do colaborador.</p>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            {/* Produtos */}
            <div className="w-full lg:w-7/12 border-b lg:border-b-0 lg:border-r bg-slate-50/50 p-4 sm:p-8 lg:overflow-y-auto space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">📍 Destino / Obra</Label>
                  <Select value={form.obra_id} onValueChange={v => setForm({ ...form, obra_id: v, funcionario_id: "" })}>
                    <SelectTrigger className="bg-white rounded-2xl h-14 shadow-sm border-slate-100 focus:ring-amber-500"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="central">📦 Depósito Central (Sede)</SelectItem>
                      {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">👤 Colaborador Beneficiado</Label>
                  <Select value={form.funcionario_id} onValueChange={v => setForm({ ...form, funcionario_id: v })}>
                    <SelectTrigger className="bg-white rounded-2xl h-14 shadow-sm border-slate-100 focus:ring-amber-500"><SelectValue placeholder="Buscar funcionário..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {funcionarios.filter(f => form.obra_id === "central" || f.obra_id === form.obra_id).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {produtos.map(p => {
                  const isSelected = selectedItems.find(i => i.produto_id === p.id);
                  const semCA = !p.ca_numero;
                  return (
                    <button key={p.id} onClick={() => handleToggleItem(p)} className={`group p-4 rounded-2xl sm:rounded-3xl border-2 transition-all relative flex flex-row sm:flex-col items-center text-left sm:text-center gap-3 ${isSelected ? "border-amber-500 bg-amber-50 shadow-lg" : "border-white bg-white hover:border-slate-200 shadow-sm hover:shadow-md"}`}>
                      <div className={`shrink-0 p-3 sm:p-4 rounded-2xl transition-all ${isSelected ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-300 group-hover:text-amber-500"}`}>
                        <Package size={22} />
                      </div>
                      <div className="flex-1 min-w-0 w-full space-y-1">
                        <p className="text-[13px] sm:text-[11px] font-black text-slate-700 uppercase leading-tight break-words sm:line-clamp-2 sm:min-h-[2.2em]">{p.descricao}</p>
                        <p className="text-[11px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Estoque: <span className={p.saldo < 1 ? "text-rose-500" : "text-emerald-600"}>{p.saldo} un</span></p>
                        {semCA && <p className="text-[10px] sm:text-[9px] text-amber-600 font-bold">⚠️ Sem CA</p>}
                        {!semCA && <p className="text-[10px] sm:text-[9px] text-emerald-600 font-bold break-words">CA: {p.ca_numero}</p>}
                      </div>
                      {isSelected && <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1"><CheckCircle2 size={12} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Carrinho */}
            <div className="w-5/12 p-8 overflow-y-auto bg-white flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3"><ShoppingCart className="text-slate-300" size={24} /><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Itens para Entrega</p></div>
                  <Badge className="bg-slate-900 px-4 h-7 rounded-full text-[10px] font-black uppercase text-white tracking-widest leading-none">{selectedItems.length} un</Badge>
                </div>

                {/* Aviso CA ausente */}
                {temItensSemCA && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-amber-800">⚠️ EPI(s) sem CA cadastrado</p>
                      <p className="text-xs text-amber-700 mt-1">Atualize o cadastro do produto com o Nº CA antes de confirmar a entrega. O sistema bloqueará o envio.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedItems.map(item => (
                    <Card key={item.produto_id} className={`border-slate-100 shadow-none rounded-3xl overflow-hidden ${item.sem_ca ? "border-amber-200 bg-amber-50/30" : "bg-slate-50/50"}`}>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-[11px] font-black text-slate-800 uppercase leading-snug">{item.descricao}</p>
                          <button onClick={() => setSelectedItems(selectedItems.filter(i => i.produto_id !== item.produto_id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</Label>
                            <Input type="number" value={item.quantidade} onChange={e => updateSelectedItem(item.produto_id, "quantidade", e.target.value)} className="h-12 bg-white font-bold rounded-2xl border-transparent shadow-sm" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº CA (automático)</Label>
                            <div className={`h-12 flex items-center px-3 rounded-2xl border text-sm font-bold ${item.sem_ca ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                              {item.sem_ca ? "⚠️ Sem CA" : item.ca_numero}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo da Entrega</Label>
                          <Select value={item.observacoes} onValueChange={v => updateSelectedItem(item.produto_id, "observacoes", v)}>
                            <SelectTrigger className="h-12 bg-white font-bold rounded-2xl border-transparent shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {["ADMISSÃO / ENTRADA", "REPOSIÇÃO POR USO", "REPOSIÇÃO POR DESGASTE", "TROCA POR VENCIMENTO CA", "TROCA POR DANIFICADO", "EXTRAVIO / PERDA"].map(m => <SelectItem key={m} value={m} className="font-semibold">{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {selectedItems.length === 0 && (
                    <div className="py-24 text-center opacity-30 grayscale"><ShoppingCart size={48} className="mx-auto mb-4" /><p className="text-xs font-black uppercase tracking-widest">Nenhum item selecionado</p></div>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <Button
                  onClick={handleSaveMultiDelivery}
                  disabled={selectedItems.length === 0 || !form.funcionario_id || temItensSemCA}
                  className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xl shadow-2xl shadow-emerald-500/30 gap-4 transition-all active:scale-[0.98] rounded-[2rem] disabled:opacity-40"
                >
                  Confirmar Recebimento <CheckCircle2 size={32} />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: QR Code Assinatura ─────────────────────────────────────────── */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
              <QrCode className="text-blue-500" /> Assinatura Digital
            </DialogTitle>
            <DialogDescription>QR Code válido por 48 horas. Colaborador: <strong>{qrTarget?.funcNome}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {qrImg && <img src={qrImg} alt="QR Code" className="w-full max-w-[280px] mx-auto rounded-2xl border-4 border-slate-100" />}
            <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono break-all text-slate-600">{qrUrl}</div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={() => { navigator.clipboard.writeText(qrUrl); toast({ title: "Link copiado!" }); }}>
                <Copy size={14} /> Copiar Link
              </Button>
              <Button className="flex-1 gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={() => {
                const msg = `Olá! Assine sua ficha de EPI pelo link: ${qrUrl} (válido por 48h)`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
              }}>
                WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Devolução ──────────────────────────────────────────────────── */}
      <Dialog open={showDevolucaoDialog} onOpenChange={setShowDevolucaoDialog}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
              <RotateCcw className="text-sky-500" /> Registrar Devolução
            </DialogTitle>
            {devolucaoTarget && (
              <DialogDescription>
                {devolucaoTarget.produtos?.descricao} — {devolucaoTarget.funcionarios?.nome}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status da Devolução</Label>
              <select value={devolucaoForm.status} onChange={e => setDevolucaoForm({ ...devolucaoForm, status: e.target.value })} className="w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400">
                <option value="devolvido">↩ Devolvido (bom estado)</option>
                <option value="danificado">⚠️ Danificado</option>
                <option value="perdido">❌ Perdido / Extraviado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data da Devolução</Label>
              <Input type="date" value={devolucaoForm.data_devolucao} onChange={e => setDevolucaoForm({ ...devolucaoForm, data_devolucao: e.target.value })} className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Observação {(devolucaoForm.status === "perdido" || devolucaoForm.status === "danificado") && <span className="text-rose-500">*</span>}
              </Label>
              <textarea value={devolucaoForm.observacao} onChange={e => setDevolucaoForm({ ...devolucaoForm, observacao: e.target.value })} rows={3} placeholder="Descreva o estado ou motivo..." className="w-full rounded-2xl border bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDevolucaoDialog(false)} className="rounded-2xl">Cancelar</Button>
            <Button onClick={handleSaveDevolucao} className="rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold">
              <RotateCcw size={16} className="mr-2" /> Registrar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
