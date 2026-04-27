import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Search, Package, AlertTriangle, Smartphone, Plus, 
  FileSignature, History, CheckCircle2, User, HardHat,
  Trash2, ShoppingCart, RefreshCw, Clipboard, Edit
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { ScrollableTable } from "@/components/shared/ScrollableTable";

export default function EntregaEPI() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("entregas");
  const [showNewDelivery, setShowNewDelivery] = useState(false);

  // Multi-seleção
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [form, setForm] = useState({ funcionario_id: "", obra_id: "central" });
  
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ent, prd, mov, obs, fun] = await Promise.all([
        supabase.from("entregas_epi").select("*, funcionarios(nome), produtos(descricao), obras(nome, codigo)").order("data_entrega", { ascending: false }).limit(200),
        supabase.from("produtos").select("*").order("descricao"),
        supabase.from("movimentacoes_estoque").select("produto_id, tipo, quantidade"),
        supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
        supabase.from("funcionarios").select("id, nome, obra_id, empresa_id").eq("status", "ativo").order("nome"),
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

  const handleToggleItem = (produto: any) => {
    const exists = selectedItems.find(i => i.produto_id === produto.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.produto_id !== produto.id));
    } else {
      setSelectedItems([...selectedItems, { 
        produto_id: produto.id, 
        descricao: produto.descricao, 
        quantidade: 1, 
        ca_numero: produto.ca_numero || "",
        observacoes: "Primeira Entrega"
      }]);
    }
  };

  const updateSelectedItem = (produtoId: string, field: string, value: any) => {
    setSelectedItems(selectedItems.map(i => i.produto_id === produtoId ? { ...i, [field]: value } : i));
  };

  const handleSaveMultiDelivery = async () => {
    if (!form.funcionario_id || selectedItems.length === 0) {
       toast({ title: "Selecione o funcionário e ao menos um EPI", variant: "destructive" });
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
        observacoes: item.observacoes,
        data_entrega: new Date().toISOString()
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
      console.error("Erro ao salvar entrega:", err);
      toast({ 
        title: "Erro ao salvar entrega", 
        description: err.message || "Verifique os dados e tente novamente",
        variant: "destructive" 
      });
    }
  };

  const handleUpdateDelivery = async () => {
    if (!editingDelivery) return;
    try {
      const { error } = await supabase
        .from("entregas_epi")
        .update({
          quantidade: Number(editingDelivery.quantidade),
          ca_numero: editingDelivery.ca_numero,
          observacoes: editingDelivery.observacoes,
          data_entrega: editingDelivery.data_entrega
        })
        .eq("id", editingDelivery.id);

      if (error) throw error;
      toast({ title: "Entrega atualizada com sucesso!" });
      setShowEditDialog(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

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

  const filteredEntregas = useMemo(() => {
    return entregas.filter(e => 
      !search || 
      e.funcionarios?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      e.produtos?.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      e.obras?.nome?.toLowerCase().includes(search.toLowerCase())
    );
  }, [entregas, search]);

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
                 <p className="text-sm text-muted-foreground font-medium">Gestão de entregas múltiplas e estoque NR-6.</p>
              </div>
           </div>
           <div className="flex gap-2">
              <Button onClick={() => { setSelectedItems([]); setShowNewDelivery(true); }} className="bg-amber-500 hover:bg-amber-600 text-white border-none gap-2 px-6 shadow-lg shadow-amber-500/20">
                 <Plus size={18} /> Nova Entrega Múltipla
              </Button>
              <Button variant="outline" asChild className="gap-2">
                 <a href="/entrega-epi-mobile"><Smartphone size={18} /> Mobile</a>
              </Button>
           </div>
        </div>

        {/* KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm"><CardContent className="p-5 flex items-center gap-4 text-emerald-700">
              <CheckCircle2 size={24} /><div className="flex-1">
                 <p className="text-[10px] font-bold uppercase opacity-70">Entregues (30d)</p>
                 <p className="text-2xl font-black">{entregas.length}</p>
              </div></CardContent></Card>
           <Card className="bg-amber-50/50 border-amber-100 shadow-sm"><CardContent className="p-5 flex items-center gap-4 text-amber-700">
              <Package size={24} /><div className="flex-1">
                 <p className="text-[10px] font-bold uppercase opacity-70">Abaixo do Mínimo</p>
                 <p className="text-2xl font-black">{produtos.filter(p => p.saldo < p.estoque_minimo).length}</p>
              </div></CardContent></Card>
           <Card className="bg-blue-50/50 border-blue-100 shadow-sm"><CardContent className="p-5 flex items-center gap-4 text-blue-700">
              <User size={24} /><div className="flex-1">
                 <p className="text-[10px] font-bold uppercase opacity-70">Colaboradores</p>
                 <p className="text-2xl font-black">{funcionarios.length}</p>
              </div></CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 mb-4 h-11 w-full max-w-sm rounded-xl border">
            <TabsTrigger value="entregas" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white font-bold text-xs"><History size={16} /> Histórico</TabsTrigger>
            <TabsTrigger value="fichas" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white font-bold text-xs"><FileSignature size={16} /> Fichas NR-6</TabsTrigger>
          </TabsList>

          <TabsContent value="entregas" className="space-y-4">
             <div className="flex gap-3 bg-white p-4 rounded-2xl border shadow-sm">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input placeholder="Localizar funcionário, material ou obra..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 border-none bg-slate-50 h-10" />
                </div>
             </div>

             <ScrollableTable>
               <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                 <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                       <tr>
                          <th className="px-5 py-4 text-left text-[10px] uppercase font-bold text-slate-400">Data</th>
                          <th className="px-5 py-4 text-left text-[10px] uppercase font-bold text-slate-400">Funcionário</th>
                          <th className="px-5 py-4 text-left text-[10px] uppercase font-bold text-slate-400">EPI</th>
                          <th className="px-5 py-4 text-center text-[10px] uppercase font-bold text-slate-400">Qtd</th>
                          <th className="px-5 py-4 text-left text-[10px] uppercase font-bold text-slate-400">Obra / Alocação</th>
                          <th className="px-5 py-4 text-left text-[10px] uppercase font-bold text-slate-400">Motivo</th>
                          <th className="px-5 py-4 text-center text-[10px] uppercase font-bold text-slate-400">CA</th>
                          <th className="px-5 py-4 text-right text-[10px] uppercase font-bold text-slate-400"></th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredEntregas.map(e => (
                         <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors group">
                            <td className="px-5 py-4 text-xs font-medium text-slate-500">{format(new Date(e.data_entrega), "dd/MM/yyyy HH:mm")}</td>
                            <td className="px-5 py-4 font-bold text-slate-700">{e.funcionarios?.nome || "Excluído"}</td>
                            <td className="px-5 py-4 text-slate-600 font-medium">{e.produtos?.descricao || "—"}</td>
                            <td className="px-5 py-4 text-center">
                               <span className="px-2 py-1 rounded-lg font-black text-amber-600 bg-amber-50 border border-amber-100">{e.quantidade}x</span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-400">
                               {e.obras?.nome ? `${e.obras.codigo} - ${e.obras.nome}` : "Depósito Central"}
                            </td>
                            <td className="px-5 py-4 text-left text-[11px] text-slate-400 italic">
                               {e.observacoes || "—"}
                            </td>
                            <td className="px-5 py-4 text-center">
                               <Badge variant="outline" className="font-mono text-[9px] border-slate-200">{e.ca_numero || "N/A"}</Badge>
                            </td>
                            <td className="px-5 py-4 text-right flex items-center justify-end gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 onClick={() => { setEditingDelivery({...e}); setShowEditDialog(true); }}
                                 className="h-8 w-8 text-slate-300 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all"
                               >
                                  <Edit size={14} />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 onClick={() => handleDeleteDelivery(e)}
                                 className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                               >
                                  <Trash2 size={14} />
                               </Button>
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

      <Dialog open={showNewDelivery} onOpenChange={setShowNewDelivery}>
         <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
            <DialogHeader className="p-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
               <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black flex items-center gap-2 italic text-slate-800 uppercase">
                     <HardHat className="text-amber-500 h-8 w-8" /> 
                     Checkout de Segurança (Multi-EPI)
                  </DialogTitle>
                  <DialogDescription>Selecione os dados do colaborador e clique nos EPIs para entregar.</DialogDescription>
               </div>
            </DialogHeader>
            
            <div className="flex-1 flex overflow-hidden">
               <div className="w-7/12 border-r bg-slate-50/30 p-6 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5"><Label className="text-slate-500 font-bold uppercase text-[10px] ml-1">1. Localizar Obra</Label>
                        <Select value={form.obra_id} onValueChange={v => setForm({...form, obra_id: v, funcionario_id: ""})}>
                           <SelectTrigger className="bg-white rounded-2xl h-12 shadow-sm border-slate-200"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                           <SelectContent className="rounded-xl"><SelectItem value="central">📦 Depósito Central</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1.5"><Label className="text-slate-500 font-bold uppercase text-[10px] ml-1">2. Quem está recebendo?</Label>
                        <Select value={form.funcionario_id} onValueChange={v => setForm({...form, funcionario_id: v})}>
                           <SelectTrigger className="bg-white rounded-2xl h-12 shadow-sm border-slate-200"><SelectValue placeholder="Buscar funcionário..." /></SelectTrigger>
                           <SelectContent className="rounded-xl">
                              {funcionarios.filter(f => form.obra_id === "central" || f.obra_id === form.obra_id).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                     <Label className="text-amber-600 font-black uppercase text-[10px] tracking-widest ml-1">3. Itens disponíveis no Almoxarifado</Label>
                     <div className="grid grid-cols-3 gap-3">
                        {produtos.map(p => {
                           const isSelected = selectedItems.find(i => i.produto_id === p.id);
                           return (
                              <button 
                                key={p.id}
                                onClick={() => handleToggleItem(p)}
                                className={`group p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col items-center text-center ${
                                  isSelected 
                                  ? "border-amber-500 bg-amber-50 shadow-md scale-95" 
                                  : "border-white bg-white hover:border-slate-200 shadow-sm"
                                }`}
                              >
                                 <div className={`p-3 rounded-full mb-2 ${isSelected ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-slate-100 text-slate-400 group-hover:bg-amber-100"}`}>
                                    <Package size={20} />
                                 </div>
                                 <p className="text-[11px] font-bold text-slate-700 leading-tight block mb-1 uppercase h-9 overflow-hidden">{p.descricao}</p>
                                 <p className="text-[10px] font-bold opacity-60">Saldo: <span className={p.saldo < 1 ? "text-rose-500" : "text-emerald-600"}>{p.saldo}</span></p>
                                 {isSelected && (
                                    <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-0.5 shadow-sm animate-in zoom-in"><CheckCircle2 size={14} /></div>
                                 )}
                              </button>
                           );
                        })}
                     </div>
                  </div>
               </div>

               <div className="w-5/12 p-6 overflow-y-auto bg-white flex flex-col justify-between border-l border-slate-100">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center gap-2"><ShoppingCart className="text-slate-400" size={20} /><p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Resumo do Kit</p></div>
                        <Badge className="bg-slate-800 text-white rounded-full px-4 h-6">{selectedItems.length} itens</Badge>
                     </div>

                     <div className="space-y-3">
                        {selectedItems.map(item => (
                           <Card key={item.produto_id} className="border-slate-100 shadow-none bg-slate-50/50 rounded-2xl">
                              <CardContent className="p-4 space-y-3">
                                 <div className="flex justify-between items-start gap-2">
                                    <p className="text-xs font-black text-slate-700 uppercase leading-snug">{item.descricao}</p>
                                    <button onClick={() => setSelectedItems(selectedItems.filter(i => i.produto_id !== item.produto_id))} className="text-rose-300 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Quantidade</Label><Input type="number" value={item.quantidade} onChange={e => updateSelectedItem(item.produto_id, "quantidade", e.target.value)} className="h-10 bg-white font-bold rounded-xl" /></div>
                                    <div className="space-y-1"><Label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Nº CA Vigente</Label><Input value={item.ca_numero} onChange={e => updateSelectedItem(item.produto_id, "ca_numero", e.target.value)} className="h-10 bg-white font-bold rounded-xl" /></div>
                                 </div>
                                 <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Motivo / Justificativa</Label>
                                    <Select value={item.observacoes} onValueChange={v => updateSelectedItem(item.produto_id, "observacoes", v)}>
                                       <SelectTrigger className="h-9 bg-white text-xs rounded-xl shadow-sm">
                                          <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent className="rounded-xl font-medium">
                                          <SelectItem value="Primeira Entrega">Primeira Entrega</SelectItem>
                                          <SelectItem value="Reposição (Uso)">Reposição (Uso)</SelectItem>
                                          <SelectItem value="Danificado">Danificado</SelectItem>
                                          <SelectItem value="Perda/Extravio">Perda/Extravio</SelectItem>
                                          <SelectItem value="Troca de Tamanho">Troca de Tamanho</SelectItem>
                                       </SelectContent>
                                    </Select>
                                 </div>
                              </CardContent>
                           </Card>
                        ))}
                     </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                     <Button 
                       onClick={handleSaveMultiDelivery}
                       disabled={selectedItems.length === 0 || !form.funcionario_id}
                       className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-lg shadow-xl shadow-emerald-500/30 gap-3 transition-all active:scale-95 rounded-2xl"
                     >
                        Confirmar e Entregar <CheckCircle2 size={24} />
                     </Button>
                  </div>
               </div>
            </div>
         </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
         <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader><DialogTitle>Editar Lançamento de EPI</DialogTitle></DialogHeader>
            {editingDelivery && (
               <div className="space-y-4 py-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed text-xs space-y-1">
                     <p className="font-bold text-slate-600 uppercase">{editingDelivery.produtos?.descricao}</p>
                     <p className="text-slate-400">Funcionário: {editingDelivery.funcionarios?.nome}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Quantidade</Label><Input type="number" value={editingDelivery.quantidade} onChange={e => setEditingDelivery({...editingDelivery, quantidade: e.target.value})} /></div>
                     <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">CA Vigente</Label><Input value={editingDelivery.ca_numero || ""} onChange={e => setEditingDelivery({...editingDelivery, ca_numero: e.target.value})} /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Motivo / Observação</Label>
                     <Input value={editingDelivery.observacoes || ""} onChange={e => setEditingDelivery({...editingDelivery, observacoes: e.target.value})} />
                  </div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Data da Entrega</Label>
                     <Input type="datetime-local" value={editingDelivery.data_entrega ? new Date(new Date(editingDelivery.data_entrega).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""} onChange={e => setEditingDelivery({...editingDelivery, data_entrega: new Date(e.target.value).toISOString()})} />
                  </div>
               </div>
            )}
            <DialogFooter><Button onClick={handleUpdateDelivery} className="w-full bg-slate-800">Salvar Alterações</Button></DialogFooter>
         </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
