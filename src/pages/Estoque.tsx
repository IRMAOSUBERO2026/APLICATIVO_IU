import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Package, Plus, ArrowDown, Search, AlertTriangle, 
  Edit, Trash2, CheckCircle2, ShoppingCart,
  History, LayoutDashboard
} from "lucide-react";
import { format } from "date-fns";
import { ScrollableTable } from "@/components/shared/ScrollableTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabKey = "produtos" | "movimentacoes" | "alertas";
type SortKey = "descricao" | "codigo" | "saldo";

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

  const loadData = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: o }] = await Promise.all([
      supabase.from("produtos").select("*"),
      supabase.from("movimentacoes_estoque").select("*, produtos(descricao, unidade), obras(nome)").order("data_movimentacao", { ascending: false }).limit(300),
      supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
    ]);
    if (p) setProdutos(p);
    if (m) setMovimentacoes(m);
    if (o) setObras(o);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stockBalances = useMemo(() => {
    return produtos.map(p => {
      const pMovs = movimentacoes.filter(m => m.produto_id === p.id);
      const entradas = pMovs.filter(m => m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
      const saidas = pMovs.filter(m => m.tipo !== "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
      const saldo = entradas - saidas;
      const pctMinimo = p.estoque_minimo > 0 ? (saldo / p.estoque_minimo) * 100 : 100;
      
      let statusColor = "text-emerald-500";
      let statusBg = "bg-emerald-50";

      if (p.estoque_minimo > 0 && saldo < p.estoque_minimo) {
        statusColor = "text-rose-500";
        statusBg = "bg-rose-100";
      } else if (p.estoque_minimo > 0 && saldo < p.estoque_minimo * 1.5) {
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

  const stats = useMemo(() => {
    const criticos = stockBalances.filter(p => p.abaixoMinimo).length;
    const totalItens = stockBalances.reduce((s, p) => s + p.saldo, 0);
    const valorEst = stockBalances.reduce((s, p) => {
       const uVal = movimentacoes.find(m => m.produto_id === p.id && m.tipo === "entrada")?.valor_unitario || 0;
       return s + (p.saldo * uVal);
    }, 0);
    return { criticos, totalItens, valorEst };
  }, [stockBalances, movimentacoes]);

  const saveProduto = async () => {
    if (!np.descricao) return;
    const { error } = await supabase.from("produtos").insert({ ...np, estoque_minimo: Number(np.estoque_minimo) || 0 });
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Produto cadastrado!" });
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
    }).eq("id", editingProduto.id);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Atualizado!" });
    setShowEditProduto(false); loadData();
  };

  const saveMovimentacao = async () => {
    if (!nm.produto_id || !nm.quantidade) return;
    const { error } = await supabase.from("movimentacoes_estoque").insert({
      ...nm, quantidade: Number(nm.quantidade), valor_unitario: Number(nm.valor_unitario) || null,
      obra_id: nm.obra_id || null, data_movimentacao: new Date().toISOString()
    });
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Registrado!" });
    setShowNewMov(false); loadData();
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-sm">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><Package size={28} /></div>
              <div>
                 <h1 className="text-2xl font-black text-slate-800">Almoxarifado</h1>
                 <p className="text-sm text-muted-foreground">Gestão de saldos e materiais globais.</p>
              </div>
           </div>
           <div className="flex gap-2">
              <Button onClick={() => setShowNewProduto(true)} variant="outline">Novo Item</Button>
              <Button onClick={() => setShowNewMov(true)}><History className="mr-2 h-4 w-4" /> Movimentar</Button>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card className="bg-slate-50"><CardContent className="p-5"><p className="text-[10px] font-bold text-muted-foreground uppercase">Títulos Catalogados</p><p className="text-2xl font-black">{produtos.length}</p></CardContent></Card>
           <Card className="bg-rose-50 border-rose-100"><CardContent className="p-5"><p className="text-[10px] font-bold text-rose-600 uppercase">Abaixo do Mínimo</p><p className="text-2xl font-black text-rose-600">{stats.criticos}</p></CardContent></Card>
           <Card className="bg-emerald-50"><CardContent className="p-5"><p className="text-[10px] font-bold text-emerald-600 uppercase">Saldos Positivos</p><p className="text-2xl font-black text-emerald-600">{produtos.length - stats.criticos}</p></CardContent></Card>
           <Card className="bg-blue-50"><CardContent className="p-5"><p className="text-[10px] font-bold text-blue-600 uppercase">Valor em Estoque</p><p className="text-xl font-black text-blue-600">R$ {stats.valorEst.toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={(v:any) => setTab(v)}>
          <TabsList className="grid grid-cols-3 w-full max-w-md h-11 bg-slate-100 p-1">
            <TabsTrigger value="produtos" className="data-[state=active]:bg-white">Catálogo</TabsTrigger>
            <TabsTrigger value="movimentacoes" className="data-[state=active]:bg-white">Extrato</TabsTrigger>
            <TabsTrigger value="alertas" className="data-[state=active]:bg-white">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="space-y-4">
             <div className="flex gap-4 items-center bg-white p-3 rounded-xl border shadow-sm">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input placeholder="Localizar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-none bg-slate-50" />
                </div>
                <Select value={sortBy} onValueChange={(v:any) => setSortBy(v)}>
                   <SelectTrigger className="w-40 border-none bg-slate-50"><SelectValue /></SelectTrigger>
                   <SelectContent><SelectItem value="descricao">Nome (A-Z)</SelectItem><SelectItem value="codigo">Código IU</SelectItem><SelectItem value="saldo">Maior Saldo</SelectItem></SelectContent>
                </Select>
             </div>

             <ScrollableTable>
               <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="bg-slate-50 border-b">
                     <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-slate-400"># Cód</th>
                     <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-slate-400">Material</th>
                     <th className="px-5 py-3 text-center text-[10px] uppercase font-bold text-slate-400">UN</th>
                     <th className="px-5 py-3 text-right text-[10px] uppercase font-bold text-slate-400">Saldo</th>
                     <th className="px-5 py-3 text-right text-[10px] uppercase font-bold text-slate-400">Mínimo</th>
                     <th className="px-5 py-3 text-center text-[10px] uppercase font-bold text-slate-400">Ação</th>
                   </tr>
                 </thead>
                 <tbody>
                    {sortedAndFiltered.map(p => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="px-5 py-4 font-mono text-xs">{p.codigo || "—"}</td>
                        <td className="px-5 py-4 font-bold text-slate-700">{p.descricao}</td>
                        <td className="px-5 py-4 text-center font-bold text-slate-400 uppercase">{p.unidade}</td>
                        <td className="px-5 py-4 text-right">
                           <div className={`inline-flex px-2 py-0.5 rounded font-black ${p.statusColor} ${p.statusBg}`}>{p.saldo}</div>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-300">{p.estoque_minimo}</td>
                        <td className="px-5 py-4 text-center">
                           <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingProduto(p); setShowEditProduto(true); }}><Edit size={14} /></Button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
               </div>
             </ScrollableTable>
          </TabsContent>

          <TabsContent value="movimentacoes">
             <ScrollableTable>
                <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                   <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                         <tr>
                            <th className="p-4 text-left font-bold text-[10px] text-slate-400 uppercase">Data</th>
                            <th className="p-4 text-left font-bold text-[10px] text-slate-400 uppercase">Material</th>
                            <th className="p-4 text-right font-bold text-[10px] text-slate-400 uppercase">Qtd</th>
                            <th className="p-4 text-left font-bold text-[10px] text-slate-400 uppercase">Destino / Ref</th>
                         </tr>
                      </thead>
                      <tbody>
                         {movimentacoes.map(m => (
                           <tr key={m.id} className="border-b last:border-0">
                              <td className="p-4 text-[10px] text-slate-500">{format(new Date(m.data_movimentacao), "dd/MM/yyyy HH:mm")}</td>
                              <td className="p-4 font-bold">{(m as any).produtos?.descricao}</td>
                              <td className={`p-4 text-right font-black ${m.tipo === "entrada" ? "text-emerald-500" : "text-rose-500"}`}>
                                 {m.tipo === "entrada" ? "+" : "-"}{m.quantidade}
                              </td>
                              <td className="p-4 text-xs text-slate-400">{(m as any).obras?.nome || m.observacoes || "Geral"}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </ScrollableTable>
          </TabsContent>

          <TabsContent value="alertas">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stockBalances.filter(p => p.abaixoMinimo).map(p => (
                  <Card key={p.id} className="border-2 border-rose-100 shadow-md">
                     <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                           <h3 className="font-black text-slate-700 uppercase">{p.descricao}</h3>
                           <AlertTriangle className="text-rose-500 h-6 w-6" />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl">
                           <div><p className="text-[10px] font-bold text-rose-400">Saldo</p><p className="text-2xl font-black text-rose-600">{p.saldo}</p></div>
                           <div className="text-right"><p className="text-[10px] font-bold text-rose-400">Min</p><p className="text-xl font-bold text-slate-600">{p.estoque_minimo}</p></div>
                        </div>
                        <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white border-none" onClick={() => { setEditingProduto(p); setShowEditProduto(true); }}>Corrigir Saldo Mínimo</Button>
                     </CardContent>
                  </Card>
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL NOVO ITEM */}
      <Dialog open={showNewProduto} onOpenChange={setShowNewProduto}>
         <DialogContent><DialogHeader><DialogTitle>Categorizar Novo Material</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
               <div className="col-span-2 space-y-1"><Label>Nome</Label><Input value={np.descricao} onChange={e => setNp({...np, descricao: e.target.value})} /></div>
               <div className="space-y-1"><Label>Cód IU</Label><Input value={np.codigo} onChange={e => setNp({...np, codigo: e.target.value})} /></div>
               <div className="space-y-1"><Label>Meta Mín.</Label><Input type="number" value={np.estoque_minimo} onChange={e => setNp({...np, estoque_minimo: Number(e.target.value)})} /></div>
               <div className="space-y-1"><Label>Categoria</Label>
                  <Select value={np.categoria} onValueChange={v => setNp({...np, categoria: v})}>
                     <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                     <SelectContent>{["Material", "EPI", "Ferramenta", "Consumivel"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
            </div>
            <DialogFooter><Button onClick={saveProduto} className="w-full">Cadastrar</Button></DialogFooter>
         </DialogContent>
      </Dialog>

      {/* MODAL EDITAR MANUAL */}
      <Dialog open={showEditProduto} onOpenChange={setShowEditProduto}>
         <DialogContent><DialogHeader><DialogTitle>Editar Informações</DialogTitle></DialogHeader>
            {editingProduto && (
               <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-1"><Label>Descrição</Label><Input value={editingProduto.descricao} onChange={e => setEditingProduto({...editingProduto, descricao: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Código</Label><Input value={editingProduto.codigo} onChange={e => setEditingProduto({...editingProduto, codigo: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Mínimo</Label><Input type="number" value={editingProduto.estoque_minimo} onChange={e => setEditingProduto({...editingProduto, estoque_minimo: Number(e.target.value)})} /></div>
                  <div className="space-y-1"><Label>Unidade</Label><Input value={editingProduto.unidade} onChange={e => setEditingProduto({...editingProduto, unidade: e.target.value})} /></div>
               </div>
            )}
            <DialogFooter><Button onClick={updateProduto} className="w-full">Salvar Alterações</Button></DialogFooter>
         </DialogContent>
      </Dialog>

      {/* MODAL MOVIMENTAÇÃO */}
      <Dialog open={showNewMov} onOpenChange={setShowNewMov}>
         <DialogContent><DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <Select value={nm.tipo} onValueChange={v => setNm({...nm, tipo: v})}><SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada (+)</SelectItem><SelectItem value="saida">Saída (-)</SelectItem></SelectContent></Select>
               <Select value={nm.produto_id} onValueChange={v => setNm({...nm, produto_id: v})}><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Selecione o material..." /></SelectTrigger><SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>)}</SelectContent></Select>
               <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Qtd" value={nm.quantidade} onChange={e => setNm({...nm, quantidade: Number(e.target.value)})} />
                  <Input type="number" step="0.01" placeholder="Val Unit (R$)" value={nm.valor_unitario} onChange={e => setNm({...nm, valor_unitario: Number(e.target.value)})} />
               </div>
               <Select value={nm.obra_id} onValueChange={v => setNm({...nm, obra_id: v})}><SelectTrigger className="bg-slate-50"><SelectValue placeholder="Onde?" /></SelectTrigger><SelectContent><SelectItem value="">Depósito Central</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select>
               <Input placeholder="Ref / NF / OC" value={nm.documento} onChange={e => setNm({...nm, documento: e.target.value})} />
            </div>
            <DialogFooter><Button onClick={saveMovimentacao} className="w-full">Confirmar Registro</Button></DialogFooter>
         </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
