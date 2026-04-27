import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
<<<<<<< HEAD
import { 
  Package, Plus, ArrowDown, Search, HardHat, AlertTriangle, 
  Edit, Trash2, Filter, ArrowUpDown, CheckCircle2, ShoppingCart,
  FileText, History, LayoutDashboard
} from "lucide-react";
=======
import { Package, Plus, ArrowDown, Search, AlertTriangle, HardHat } from "lucide-react";
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ScrollableTable } from "@/components/shared/ScrollableTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<<<<<<< HEAD
type TabKey = "produtos" | "movimentacoes" | "epi" | "alertas";
type SortKey = "descricao" | "codigo" | "saldo";
=======
type TabKey = "produtos" | "movimentacoes" | "estoque_minimo";
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7

export default function Estoque() {
  const [tab, setTab] = useState<TabKey>("produtos");
  const [produtos, setProdutos] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("descricao");
  
  const [showNewProduto, setShowNewProduto] = useState(false);
  const [showEditProduto, setShowEditProduto] = useState(false);
  const [showNewMov, setShowNewMov] = useState(false);

  const [np, setNp] = useState({ descricao: "", codigo: "", categoria: "Material", unidade: "un", estoque_minimo: 0, ncm: "" });
  const [editingProduto, setEditingProduto] = useState<any>(null);
  const [nm, setNm] = useState({ produto_id: "", tipo: "entrada", quantidade: 0, valor_unitario: 0, obra_id: "", documento: "", observacoes: "" });
<<<<<<< HEAD
  const [ne, setNe] = useState({ funcionario_id: "", produto_id: "", obra_id: "", quantidade: 1, ca_numero: "", observacoes: "", empresa_id: "" });
  
  const { empresas: empresasList } = useEmpresasObras();

  const loadData = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: o }, { data: f }] = await Promise.all([
      supabase.from("produtos").select("*"),
      supabase.from("movimentacoes_estoque").select("*, produtos(descricao, unidade), obras(nome)").order("data_movimentacao", { ascending: false }).limit(200),
=======

  const loadData = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: o }] = await Promise.all([
      supabase.from("produtos").select("*").order("descricao"),
      supabase.from("movimentacoes_estoque").select("*, produtos(descricao, unidade), obras(nome)").order("data_movimentacao", { ascending: false }).limit(100),
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7
      supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
    ]);
    if (p) setProdutos(p);
    if (m) setMovimentacoes(m);
    if (o) setObras(o);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stockBalances = useMemo(() => {
    return produtos.map(p => {
      const entradas = movimentacoes.filter(m => m.produto_id === p.id && m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
      const saidas = movimentacoes.filter(m => m.produto_id === p.id && m.tipo !== "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
      const saldo = entradas - saidas;
      const pctMinimo = p.estoque_minimo > 0 ? (saldo / p.estoque_minimo) * 100 : 100;
      
      let statusColor = "text-emerald-500";
      let statusBg = "bg-emerald-50";
      if (p.estoque_minimo > 0 && saldo < p.estoque_minimo) {
        statusColor = "text-rose-500";
        statusBg = "bg-rose-50";
      } else if (p.estoque_minimo > 0 && saldo < p.estoque_minimo * 1.3) {
        statusColor = "text-amber-500";
        statusBg = "bg-amber-50";
      }

      return { 
        ...p, saldo, entradas, saidas, 
        abaixoMinimo: p.estoque_minimo > 0 && saldo < p.estoque_minimo,
        statusColor, statusBg, pctMinimo
      };
    });
  }, [produtos, movimentacoes]);

  const sortedAndFiltered = useMemo(() => {
    let result = stockBalances.filter(p => 
      !search || 
      p.descricao?.toLowerCase().includes(search.toLowerCase()) || 
      p.codigo?.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === "saldo") return b.saldo - a.saldo;
      if (sortBy === "codigo") return (a.codigo || "").localeCompare(b.codigo || "");
      return (a.descricao || "").localeCompare(b.descricao || "");
    });

    return result;
  }, [stockBalances, search, sortBy]);

  const abaixoMinimo = useMemo(() => stockBalances.filter(p => p.abaixoMinimo), [stockBalances]);

  const saveProduto = async () => {
    if (!np.descricao) { toast({ title: "Informe a descrição", variant: "destructive" }); return; }
    const { error } = await supabase.from("produtos").insert({ ...np, estoque_minimo: Number(np.estoque_minimo) || 0 });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "💰 Produto cadastrado com sucesso!" });
    setNp({ descricao: "", codigo: "", categoria: "Material", unidade: "un", estoque_minimo: 0, ncm: "" });
    setShowNewProduto(false); loadData();
  };

  const updateProduto = async () => {
    if (!editingProduto) return;
    const { error } = await supabase.from("produtos").update({
      descricao: editingProduto.descricao,
      codigo: editingProduto.codigo,
      categoria: editingProduto.categoria,
      unidade: editingProduto.unidade,
      estoque_minimo: Number(editingProduto.estoque_minimo) || 0,
      ncm: editingProduto.ncm
    }).eq("id", editingProduto.id);
    
    if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item atualizado manualmente!" });
    setShowEditProduto(false); setEditingProduto(null); loadData();
  };

  const deleteProduto = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esse item do catálogo?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: "Verifique se o produto possui movimentações atreladas.", variant: "destructive" }); return; }
    toast({ title: "Produto removido" }); loadData();
  };

  const saveMovimentacao = async () => {
    if (!nm.produto_id || !nm.quantidade) { toast({ title: "Dados incompletos", variant: "destructive" }); return; }
    const { error } = await supabase.from("movimentacoes_estoque").insert({
      produto_id: nm.produto_id, tipo: nm.tipo, quantidade: Number(nm.quantidade),
      valor_unitario: Number(nm.valor_unitario) || null, obra_id: nm.obra_id || null,
      documento: nm.documento || null, observacoes: nm.observacoes || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
<<<<<<< HEAD
    toast({ title: nm.tipo === "entrada" ? "✅ Entrada registrada" : "🚀 Saída registrada" });
=======
    toast({ title: `${nm.tipo === "entrada" ? "Entrada" : "Saída"} registrada` });
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7
    setNm({ produto_id: "", tipo: "entrada", quantidade: 0, valor_unitario: 0, obra_id: "", documento: "", observacoes: "" });
    setShowNewMov(false); loadData();
  };

<<<<<<< HEAD
  const saveEpi = async () => {
    if (!ne.funcionario_id || !ne.produto_id || !ne.empresa_id) { toast({ title: "Campos obrigatórios faltando", variant: "destructive" }); return; }
    const { error: epiError } = await supabase.from("entregas_epi").insert({
      funcionario_id: ne.funcionario_id, produto_id: ne.produto_id,
      obra_id: ne.obra_id || null, empresa_id: ne.empresa_id,
      quantidade: Number(ne.quantidade), ca_numero: ne.ca_numero || null,
      observacoes: ne.observacoes || null,
    });
    if (epiError) { toast({ title: "Erro", description: epiError.message, variant: "destructive" }); return; }

    await supabase.from("movimentacoes_estoque").insert({
      produto_id: ne.produto_id, tipo: "saida_epi", quantidade: Number(ne.quantidade),
      obra_id: ne.obra_id || null, observacoes: `Entrega EPI - ${funcionarios.find(f => f.id === ne.funcionario_id)?.nome || ""}`,
    });

    toast({ title: "🛡️ EPI entregue e estoque atualizado!" });
    setNe({ funcionario_id: "", produto_id: "", obra_id: "", quantidade: 1, ca_numero: "", observacoes: "", empresa_id: "" });
    setShowNewEpi(false); loadData();
  };
=======
  const inputClass = "w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Profissional */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-2 bg-gradient-to-r from-slate-50 to-white rounded-2xl border shadow-sm">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <Package className="h-7 w-7 text-primary" />
             </div>
             <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800">Almoxarifado IU</h1>
                <div className="flex items-center gap-2 mt-0.5">
                   <Badge variant="outline" className="bg-white/50">{produtos.length} Itens Catalogados</Badge>
                   {abaixoMinimo.length > 0 && <Badge variant="destructive" className="animate-pulse">{abaixoMinimo.length} Abaixo do Mínimo</Badge>}
                </div>
             </div>
          </div>
          <div className="flex flex-wrap gap-2">
<<<<<<< HEAD
            <Button onClick={() => setShowNewProduto(true)} className="gap-2 shadow-md"><Plus className="h-4 w-4" /> Novo Item</Button>
            <Button variant="outline" onClick={() => setShowNewMov(true)} className="gap-2 bg-white"><ArrowDown className="h-4 w-4" /> Movimentação</Button>
            <Button variant="secondary" onClick={() => setShowNewEpi(true)} className="gap-2 bg-amber-500 text-white hover:bg-amber-600 border-none"><HardHat className="h-4 w-4" /> Entrega EPI</Button>
          </div>
        </div>

        {/* KPIs Modernos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Variação Mês", val: movimentacoes.length, icon: History, color: "from-blue-500/10 to-blue-600/5", textColor: "text-blue-600", border: "border-blue-200/50" },
            { label: "Itens Críticos", val: abaixoMinimo.length, icon: AlertTriangle, color: "from-rose-500/10 to-rose-600/5", textColor: "text-rose-600", border: "border-rose-200/50" },
            { label: "Estoque Seguro", val: produtos.length - abaixoMinimo.length, icon: CheckCircle2, color: "from-emerald-500/10 to-emerald-600/5", textColor: "text-emerald-600", border: "border-emerald-200/50" },
            { label: "Patrimônio Est.", val: `R$ ${stockBalances.reduce((s, p) => {
              const last = movimentacoes.find(m => m.produto_id === p.id && m.tipo === "entrada" && m.valor_unitario);
              return s + (p.saldo * (last?.valor_unitario || 0));
            }, 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: ShoppingCart, color: "from-purple-500/10 to-purple-600/5", textColor: "text-purple-600", border: "border-purple-200/50" }
          ].map((k, i) => (
            <Card key={i} className={`overflow-hidden border-2 ${k.border} shadow-sm group hover:shadow-md transition-all`}>
              <CardContent className={`p-5 bg-gradient-to-br ${k.color}`}>
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{k.label}</p>
                   <k.icon className={`h-4 w-4 ${k.textColor} opacity-60`} />
                </div>
                <p className={`text-2xl font-black ${k.textColor}`}>{k.val}</p>
              </CardContent>
            </Card>
=======
            <button onClick={() => setShowNewProduto(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Novo Produto
            </button>
            <button onClick={() => setShowNewMov(true)} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <ArrowDown className="h-4 w-4" /> Movimentação
            </button>
            <Link
              to="/entrega-epi"
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              title="Entregas de EPI agora vivem no módulo Entrega de EPI"
            >
              <HardHat className="h-4 w-4" /> Ir para Entrega de EPI
            </Link>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Produtos</p>
            <p className="text-2xl font-bold">{produtos.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Movimentações (mês)</p>
            <p className="text-2xl font-bold">{movimentacoes.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Abaixo do Mínimo</p>
            <p className="text-2xl font-bold text-destructive">{abaixoMinimo.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Valor Estoque</p>
            <p className="text-2xl font-bold">R$ {stockBalances.reduce((s, p) => {
              const lastEntry = movimentacoes.find(m => m.produto_id === p.id && m.tipo === "entrada" && m.valor_unitario);
              return s + (p.saldo * (lastEntry?.valor_unitario || 0));
            }, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Alerts */}
        {abaixoMinimo.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Produtos abaixo do estoque mínimo</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {abaixoMinimo.map(p => (
                <span key={p.id} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive font-medium">
                  {p.descricao} (saldo: {p.saldo} / mín: {p.estoque_minimo})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([["produtos", "Produtos"], ["movimentacoes", "Movimentações"], ["estoque_minimo", "Alertas"]] as [TabKey, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full max-w-2xl">
            <TabsTrigger value="produtos" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><LayoutDashboard className="h-4 w-4" /> Catálogo</TabsTrigger>
            <TabsTrigger value="movimentacoes" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><History className="h-4 w-4" /> Extrato</TabsTrigger>
            <TabsTrigger value="epi" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><HardHat className="h-4 w-4" /> EPIs</TabsTrigger>
            <TabsTrigger value="alertas" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><AlertTriangle className="h-4 w-4" /> Alertas</TabsTrigger>
          </TabsList>

<<<<<<< HEAD
          <TabsContent value="produtos" className="space-y-4 outline-none">
            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3 rounded-xl border shadow-sm">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input placeholder="Buscar por nome ou código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 border-none bg-slate-50 focus-visible:ring-1" />
=======
        {/* Content */}
        {tab === "produtos" && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <ScrollableTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Unidade</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Entradas</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saídas</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutos.map(p => (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${p.abaixoMinimo ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.codigo || "—"}</td>
                      <td className="px-4 py-3 font-medium">{p.descricao}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.categoria || "—"}</td>
                      <td className="px-4 py-3 text-center text-xs">{p.unidade}</td>
                      <td className="px-4 py-3 text-right text-success font-medium">{p.entradas}</td>
                      <td className="px-4 py-3 text-right text-destructive font-medium">{p.saidas}</td>
                      <td className="px-4 py-3 text-right font-bold">{p.saldo}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{p.estoque_minimo || "—"}</td>
                    </tr>
                  ))}
                  {filteredProdutos.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto cadastrado</td></tr>}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        {tab === "movimentacoes" && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <ScrollableTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qtd</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor Unit.</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs">{format(new Date(m.data_movimentacao), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.tipo === "entrada" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {m.tipo === "entrada" ? "Entrada" : m.tipo === "saida_epi" ? "Saída EPI" : "Saída"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{(m as any).produtos?.descricao || "—"}</td>
                      <td className="px-4 py-3 text-right">{m.quantidade}</td>
                      <td className="px-4 py-3 text-right text-xs">{m.valor_unitario ? `R$ ${Number(m.valor_unitario).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{(m as any).obras?.nome || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.documento || "—"}</td>
                    </tr>
                  ))}
                  {movimentacoes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma movimentação</td></tr>}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        {tab === "estoque_minimo" && (
          <div className="space-y-3">
            {abaixoMinimo.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <Package className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Todos os produtos estão acima do estoque mínimo!</p>
              </div>
            ) : (
              abaixoMinimo.map(p => (
                <div key={p.id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.descricao}</p>
                    <p className="text-xs text-muted-foreground">Código: {p.codigo || "—"} • {p.categoria || "Geral"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">{p.saldo} {p.unidade}</p>
                    <p className="text-xs text-muted-foreground">Mínimo: {p.estoque_minimo}</p>
                  </div>
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7
                </div>
                <div className="flex items-center gap-2">
                   <Label className="text-xs text-muted-foreground hidden sm:block">Ordenar por:</Label>
                   <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-40 h-9 bg-slate-50 border-none">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="descricao">Nome (A-Z)</SelectItem>
                         <SelectItem value="codigo">Código</SelectItem>
                         <SelectItem value="saldo">Maior Estoque</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
            </div>

            <ScrollableTable>
              <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Cód. IU</th>
                    <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Descrição do Material</th>
                    <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Categoria</th>
                    <th className="px-5 py-4 text-center font-bold text-slate-500 uppercase tracking-tighter text-[10px]">UN</th>
                    <th className="px-5 py-4 text-right font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Saldo Atual</th>
                    <th className="px-5 py-4 text-right font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Mínimo</th>
                    <th className="px-5 py-4 text-center font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFiltered.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">#{p.codigo || "N/A"}</td>
                      <td className="px-5 py-4 font-bold text-slate-700">{p.descricao}</td>
                      <td className="px-5 py-4">
                         <Badge variant="outline" className="text-[10px] font-normal">{p.categoria || "Geral"}</Badge>
                      </td>
                      <td className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase">{p.unidade}</td>
                      <td className="px-5 py-4 text-right">
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black ${p.statusColor} ${p.statusBg}`}>
                            {p.saldo}
                            {p.abaixoMinimo && <AlertTriangle className="h-3 w-3 animate-bounce" />}
                         </div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-400">{p.estoque_minimo}</td>
                      <td className="px-5 py-4 text-center">
                         <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => { setEditingProduto(p); setShowEditProduto(true); }}>
                               <Edit size={14} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => deleteProduto(p.id)}>
                               <Trash2 size={14} />
                            </Button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {sortedAndFiltered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">Nenhum item encontrado no estoque...</td></tr>}
                </tbody>
              </table>
              </div>
            </ScrollableTable>
          </TabsContent>

          <TabsContent value="movimentacoes" className="space-y-4">
             <ScrollableTable>
               <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="bg-slate-50 border-b">
                     <th className="px-4 py-3 text-left font-bold text-slate-500 text-[10px] uppercase">Data / Hora</th>
                     <th className="px-4 py-3 text-left font-bold text-slate-500 text-[10px] uppercase">Tipo</th>
                     <th className="px-4 py-3 text-left font-bold text-slate-500 text-[10px] uppercase">Material</th>
                     <th className="px-4 py-3 text-right font-bold text-slate-500 text-[10px] uppercase">Qtd</th>
                     <th className="px-4 py-3 text-left font-bold text-slate-500 text-[10px] uppercase">Obra Vinculada</th>
                     <th className="px-4 py-3 text-left font-bold text-slate-500 text-[10px] uppercase">Ref / Doc</th>
                   </tr>
                 </thead>
                 <tbody>
                   {movimentacoes.map(m => (
                     <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                       <td className="px-4 py-3 text-[10px] font-medium text-slate-500">{format(new Date(m.data_movimentacao), "dd/MM/yyyy HH:mm")}</td>
                       <td className="px-4 py-3">
                         <Badge variant="outline" className={`font-bold border-none ${m.tipo === "entrada" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                           {m.tipo === "entrada" ? "Entrada" : "Saída"}
                         </Badge>
                       </td>
                       <td className="px-4 py-3 font-bold text-slate-700">{(m as any).produtos?.descricao || "Excluído"}</td>
                       <td className={`px-4 py-3 text-right font-black ${m.tipo === "entrada" ? "text-emerald-600" : "text-rose-600"}`}>{m.tipo === "entrada" ? "+" : "-"}{m.quantidade}</td>
                       <td className="px-4 py-3 text-xs text-slate-500">{(m as any).obras?.nome || "Material Central"}</td>
                       <td className="px-4 py-3 text-xs text-slate-400 italic font-mono">{m.documento || "N/A"}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               </div>
             </ScrollableTable>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {abaixoMinimo.length === 0 ? (
                  <Card className="col-span-full py-12 text-center border-dashed bg-emerald-50/20 border-emerald-200">
                     <CheckCircle2 className="h-16 w-16 text-emerald-300 mx-auto mb-4" />
                     <h3 className="text-xl font-bold text-emerald-700">Tudo sob controle!</h3>
                     <p className="text-muted-foreground mt-2">Nenhum item está abaixo do estoque mínimo projetado.</p>
                  </Card>
                ) : (
                  abaixoMinimo.map(p => (
                    <Card key={p.id} className="relative overflow-hidden border-2 border-rose-100 shadow-lg hover:-translate-y-1 transition-all">
                       <div className="absolute top-0 right-0 p-2">
                          <AlertTriangle className="h-10 w-10 text-rose-500/10" />
                       </div>
                       <CardHeader className="pb-0 pt-6">
                          <CardTitle className="text-base font-black uppercase text-slate-700">{p.descricao}</CardTitle>
                          <p className="text-[10px] font-mono text-muted-foreground">COD: #{p.codigo || "SEM CÓDIGO"}</p>
                       </CardHeader>
                       <CardContent className="p-6">
                          <div className="flex items-end justify-between bg-rose-50 p-4 rounded-2xl border border-rose-100">
                             <div>
                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Estoque Crítico</p>
                                <p className="text-3xl font-black text-rose-600 leading-none">{p.saldo} <span className="text-sm font-normal uppercase">{p.unidade}</span></p>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Definido</p>
                                <p className="text-sm font-bold text-slate-600">{p.estoque_minimo}</p>
                             </div>
                          </div>
                          
                          <div className="mt-4 flex items-center gap-2">
                             <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(p.pctMinimo, 100)}%` }} />
                             </div>
                             <span className="text-[10px] font-bold text-rose-600">Reposição Urgente</span>
                          </div>
                       </CardContent>
                       <div className="bg-rose-600 p-3 flex items-center justify-center gap-2 text-white cursor-pointer hover:bg-rose-700 transition-colors" onClick={() => { setEditingProduto(p); setShowEditProduto(true); }}>
                          <ShoppingCart className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Aumentar Estoque Mínimo</span>
                       </div>
                    </Card>
                  ))
                )}
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: NOVO PRODUTO */}
      <Dialog open={showNewProduto} onOpenChange={setShowNewProduto}>
        <DialogContent className="max-w-xl">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Cadastrar Novo Material</DialogTitle>
              <DialogDescription>Adicione as informações base para o controle de estoque global.</DialogDescription>
           </DialogHeader>
           <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                 <Label>Nome Completo do Produto / Material *</Label>
                 <Input value={np.descricao} onChange={e => setNp({...np, descricao: e.target.value})} placeholder="Ex: Luva de Raspa G" />
              </div>
              <div className="space-y-2">
                 <Label>Código Interno IU</Label>
                 <Input value={np.codigo} onChange={e => setNp({...np, codigo: e.target.value})} placeholder="Ex: MAT-001" />
              </div>
              <div className="space-y-2">
                 <Label>Categoria</Label>
                 <Select value={np.categoria} onValueChange={v => setNp({...np, categoria: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       {["EPI", "Ferramentas", "Material", "Controle", "Escritório", "Consumível", "Outros"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2">
                 <Label>Unidade de Medida</Label>
                 <Select value={np.unidade} onValueChange={v => setNp({...np, unidade: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       {["un", "par", "kg", "m", "cx", "l", "sc", "m2", "m3"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
              <div className="space-y-2">
                 <Label>Estoque de Segurança (Mín.)</Label>
                 <Input type="number" value={np.estoque_minimo} onChange={e => setNp({...np, estoque_minimo: Number(e.target.value)})} />
              </div>
           </div>
           <DialogFooter>
              <Button onClick={saveProduto} className="w-full">Finalizar Cadastro</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

<<<<<<< HEAD
      {/* MODAL: EDITAR PRODUTO (MANUAL) */}
      <Dialog open={showEditProduto} onOpenChange={setShowEditProduto}>
        <DialogContent className="max-w-xl">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Corrigir Dados do Item</DialogTitle>
              <DialogDescription>Edição direta das informações do catálogo.</DialogDescription>
           </DialogHeader>
           {editingProduto && (
             <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                   <Label>Descrição</Label>
                   <Input value={editingProduto.descricao} onChange={e => setEditingProduto({...editingProduto, descricao: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <Label>Código</Label>
                   <Input value={editingProduto.codigo} onChange={e => setEditingProduto({...editingProduto, codigo: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <Label>Unidade</Label>
                   <Input value={editingProduto.unidade} onChange={e => setEditingProduto({...editingProduto, unidade: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <Label>Estoque Mínimo</Label>
                   <Input type="number" value={editingProduto.estoque_minimo} onChange={e => setEditingProduto({...editingProduto, estoque_minimo: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                   <Label>NCM</Label>
                   <Input value={editingProduto.ncm || ""} onChange={e => setEditingProduto({...editingProduto, ncm: e.target.value})} />
                </div>
             </div>
           )}
           <DialogFooter>
              <Button onClick={updateProduto} className="w-full">Aplicar Alterações</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: MOVIMENTAÇÃO */}
      <Dialog open={showNewMov} onOpenChange={setShowNewMov}>
        <DialogContent className="max-w-lg">
           <DialogHeader><DialogTitle>Registrar Movimento de Estoque</DialogTitle></DialogHeader>
           <div className="grid grid-cols-2 gap-4 py-4">
              <div><Label>Tipo</Label>
                 <Select value={nm.tipo} onValueChange={v => setNm({...nm, tipo: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="entrada">ENTRADA (Compra/Fundo)</SelectItem><SelectItem value="saida">SAÍDA (Interna/Obra)</SelectItem></SelectContent>
                 </Select>
              </div>
              <div><Label>Material</Label>
                 <Select value={nm.produto_id} onValueChange={v => setNm({...nm, produto_id: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={nm.quantidade} onChange={e => setNm({...nm, quantidade: Number(e.target.value)})} /></div>
              <div><Label>Valor Unitário (Opcional)</Label><Input type="number" step="0.01" value={nm.valor_unitario} onChange={e => setNm({...nm, valor_unitario: Number(e.target.value)})} /></div>
              <div className="col-span-2"><Label>Obra Destino / Centro de Custo</Label>
                 <Select value={nm.obra_id} onValueChange={v => setNm({...nm, obra_id: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Geral / Depósito" /></SelectTrigger>
                    <SelectContent><SelectItem value="">Depósito Central</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <div className="col-span-2"><Label>Documento / Ref</Label><Input value={nm.documento} onChange={e => setNm({...nm, documento: e.target.value})} placeholder="NF, Requisição, OC..." /></div>
           </div>
           <DialogFooter><Button onClick={saveMovimentacao} className="w-full">Registrar Agora</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ENTREGA EPI */}
      <Dialog open={showNewEpi} onOpenChange={setShowNewEpi}>
        <DialogContent className="max-w-xl">
           <DialogHeader><DialogTitle className="flex items-center gap-2"><HardHat className="text-amber-500" /> Registrar Entrega de EPI</DialogTitle></DialogHeader>
           <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2"><Label>Empresa do Funcionário</Label>
                 <Select value={ne.empresa_id} onValueChange={v => setNe({...ne, empresa_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
                    <SelectContent>{empresasList.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <div><Label>Funcionário</Label>
                 <Select value={ne.funcionario_id} onValueChange={v => setNe({...ne, funcionario_id: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <div><Label>Equipamento (EPI)</Label>
                 <Select value={ne.produto_id} onValueChange={v => setNe({...ne, produto_id: v})}>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Busque o item..." /></SelectTrigger>
                    <SelectContent>{produtos.filter(p => p.categoria === "EPI" || !p.categoria).map(p => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={ne.quantidade} onChange={e => setNe({...ne, quantidade: Number(e.target.value)})} /></div>
              <div><Label>CA do Produto</Label><Input value={ne.ca_numero} onChange={e => setNe({...ne, ca_numero: e.target.value})} placeholder="Nº do Certificado" /></div>
           </div>
           <DialogFooter><Button onClick={saveEpi} className="w-full bg-amber-500 hover:bg-amber-600 text-white">Finalizar Registro e Baixar Estoque</Button></DialogFooter>
        </DialogContent>
      </Dialog>

=======
      {/* Modal: Nova Movimentação */}
      {showNewMov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNewMov(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Nova Movimentação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Tipo *</label>
                <select value={nm.tipo} onChange={e => setNm(p => ({ ...p, tipo: e.target.value }))} className={inputClass}>
                  <option value="entrada">Entrada</option><option value="saida">Saída</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Produto *</label>
                <select value={nm.produto_id} onChange={e => setNm(p => ({ ...p, produto_id: e.target.value }))} className={inputClass}>
                  <option value="">Selecione...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.descricao}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Quantidade *</label><input type="number" value={nm.quantidade} onChange={e => setNm(p => ({ ...p, quantidade: Number(e.target.value) }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">Valor Unitário</label><input type="number" step="0.01" value={nm.valor_unitario} onChange={e => setNm(p => ({ ...p, valor_unitario: Number(e.target.value) }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">Obra</label>
                <select value={nm.obra_id} onChange={e => setNm(p => ({ ...p, obra_id: e.target.value }))} className={inputClass}>
                  <option value="">Nenhuma</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Documento</label><input value={nm.documento} onChange={e => setNm(p => ({ ...p, documento: e.target.value }))} className={inputClass} placeholder="Nº NF, OC..." /></div>
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Observações</label><input value={nm.observacoes} onChange={e => setNm(p => ({ ...p, observacoes: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewMov(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={saveMovimentacao} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Registrar</button>
            </div>
          </div>
        </div>
      )}
>>>>>>> 2a30e2dd8ed3247f1ab272e99936eaa6aa5670c7
    </AppLayout>
  );
}
