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
      toast({ title: "Erro ao salvar entrega", description: err.message, variant: "destructive" });
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
                 <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Gestão de fichas e estoque NR-6.</p>
              </div>
           </div>
           <div className="flex gap-2">
              <Button onClick={() => { setSelectedItems([]); setShowNewDelivery(true); }} className="bg-amber-500 hover:bg-amber-600 text-white border-none h-12 gap-3 px-8 shadow-xl shadow-amber-500/20 rounded-xl font-bold">
                 <Plus size={20} /> Nova Entrega
              </Button>
              <Button variant="outline" asChild className="h-12 rounded-xl border-slate-200">
                 <a href="/entrega-epi-mobile" className="gap-2"><Smartphone size={18} /> Mobile</a>
              </Button>
           </div>
        </div>

        {/* KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-emerald-200 transition-colors"><CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={28} /></div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Entregas Recentes</p>
                 <p className="text-3xl font-black text-slate-800">{entregas.length}</p>
              </div></CardContent></Card>
           <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-amber-200 transition-colors"><CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Package size={28} /></div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Abaixo do Mínimo</p>
                 <p className="text-3xl font-black text-slate-800">{produtos.filter(p => p.saldo < p.estoque_minimo).length}</p>
              </div></CardContent></Card>
           <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-blue-200 transition-colors"><CardContent className="p-6 flex items-center gap-5">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><User size={28} /></div>
              <div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Colaboradores</p>
                 <p className="text-3xl font-black text-slate-800">{funcionarios.length}</p>
              </div></CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-slate-100/50 p-1 mb-6 h-12 w-full max-w-md rounded-2xl border border-slate-200/50">
            <TabsTrigger value="entregas" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider"><History size={16} /> Histórico</TabsTrigger>
            <TabsTrigger value="fichas" className="flex-1 gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider"><FileSignature size={16} /> Fichas Digitais</TabsTrigger>
          </TabsList>

          <TabsContent value="entregas" className="space-y-4">
             <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center gap-2">
                <div className="relative flex-1">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                   <Input placeholder="Localizar por nome, material ou obra..." value={search} onChange={e => setSearch(e.target.value)} className="pl-12 border-none bg-transparent h-12 font-medium" />
                </div>
             </div>

             <ScrollableTable>
               <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                 <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-5 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">📅 Data / Hora</th>
                          <th className="px-6 py-5 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">👤 Funcionário</th>
                          <th className="px-6 py-5 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">🛡️ Equipamento (EPI)</th>
                          <th className="px-6 py-5 text-center text-[10px] uppercase font-black text-slate-400 tracking-widest">Qtd</th>
                          <th className="px-6 py-5 text-left text-[10px] uppercase font-black text-slate-400 tracking-widest">📍 Obra</th>
                          <th className="px-6 py-5 text-right text-[10px] uppercase font-black text-slate-400 tracking-widest">Ações</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredEntregas.map(e => (
                         <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-5 text-xs font-semibold text-slate-400">{format(new Date(e.data_entrega), "dd/MM/yyyy HH:mm")}</td>
                            <td className="px-6 py-5 font-bold text-slate-800">{e.funcionarios?.nome || "Excluído"}</td>
                            <td className="px-6 py-5 text-slate-600">
                               <div className="flex flex-col">
                                  <span className="font-semibold">{e.produtos?.descricao}</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">CA: {e.ca_numero || "—"} • {e.observacoes}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                               <span className="px-3 py-1.5 rounded-xl font-black text-amber-600 bg-amber-50 border border-amber-100 text-xs">{e.quantidade}x</span>
                            </td>
                            <td className="px-6 py-5">
                               <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] uppercase px-2 font-bold">{e.obras?.codigo || "CENTRAL"}</Badge>
                            </td>
                            <td className="px-6 py-5 text-right flex items-center justify-end gap-1">
                               <Button variant="ghost" size="icon" onClick={() => { setEditingDelivery({...e}); setShowEditDialog(true); }} className="h-9 w-9 text-slate-300 hover:text-amber-500 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl"><Edit size={16} /></Button>
                               <Button variant="ghost" size="icon" onClick={() => handleDeleteDelivery(e)} className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl"><Trash2 size={16} /></Button>
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
         <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <DialogHeader className="p-8 border-b bg-white flex flex-row items-center justify-between">
               <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tight italic">
                     <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/30"><HardHat size={24} /></div>
                     Checkout de Segurança
                  </DialogTitle>
                  <p className="text-slate-400 font-medium text-sm">Selecione os itens e confirme o recebimento do colaborador.</p>
               </div>
            </DialogHeader>
            
            <div className="flex-1 flex overflow-hidden">
               <div className="w-7/12 border-r bg-slate-50/50 p-8 overflow-y-auto space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2"><Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">📍 Destino / Obra</Label>
                        <Select value={form.obra_id} onValueChange={v => setForm({...form, obra_id: v, funcionario_id: ""})}>
                           <SelectTrigger className="bg-white rounded-2xl h-14 shadow-sm border-slate-100 focus:ring-amber-500"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                           <SelectContent className="rounded-2xl"><SelectItem value="central">📦 Depósito Central (Sede)</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2"><Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">👤 Colaborador Beneficiado</Label>
                        <Select value={form.funcionario_id} onValueChange={v => setForm({...form, funcionario_id: v})}>
                           <SelectTrigger className="bg-white rounded-2xl h-14 shadow-sm border-slate-100 focus:ring-amber-500"><SelectValue placeholder="Buscar funcionário..." /></SelectTrigger>
                           <SelectContent className="rounded-2xl">
                              {funcionarios.filter(f => form.obra_id === "central" || f.obra_id === form.obra_id).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     {produtos.map(p => {
                        const isSelected = selectedItems.find(i => i.produto_id === p.id);
                        return (
                           <button key={p.id} onClick={() => handleToggleItem(p)} className={`group p-6 rounded-3xl border-2 transition-all relative overflow-hidden flex flex-col items-center text-center gap-3 ${
                             isSelected ? "border-amber-500 bg-amber-50 shadow-lg scale-95" : "border-white bg-white hover:border-slate-200 shadow-sm hover:shadow-md"
                           }`}>
                              <div className={`p-4 rounded-2xl transition-all ${isSelected ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-300 group-hover:text-amber-500"}`}>
                                 <Package size={24} />
                              </div>
                              <div className="space-y-1">
                                 <p className="text-[11px] font-black text-slate-700 uppercase leading-tight h-8 overflow-hidden">{p.descricao}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Estoque: <span className={p.saldo < 1 ? "text-rose-500" : "text-emerald-600"}>{p.saldo} un</span></p>
                              </div>
                              {isSelected && <div className="absolute top-3 right-3 bg-amber-500 text-white rounded-full p-1"><CheckCircle2 size={12} /></div>}
                           </button>
                        );
                     })}
                  </div>
               </div>

               <div className="w-5/12 p-8 overflow-y-auto bg-white flex flex-col justify-between">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-3"><ShoppingCart className="text-slate-300" size={24} /><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Itens para Entrega</p></div>
                        <Badge className="bg-slate-900 px-4 h-7 rounded-full text-[10px] font-black uppercase text-white tracking-widest leading-none">{selectedItems.length} un</Badge>
                     </div>

                     <div className="space-y-3">
                        {selectedItems.map(item => (
                           <Card key={item.produto_id} className="border-slate-100 shadow-none bg-slate-50/50 rounded-3xl overflow-hidden">
                              <CardContent className="p-5 space-y-4">
                                 <div className="flex justify-between items-start gap-4">
                                    <p className="text-[11px] font-black text-slate-800 uppercase leading-snug">{item.descricao}</p>
                                    <button onClick={() => setSelectedItems(selectedItems.filter(i => i.produto_id !== item.produto_id))} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20} /></button>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</Label><Input type="number" value={item.quantidade} onChange={e => updateSelectedItem(item.produto_id, "quantidade", e.target.value)} className="h-12 bg-white font-bold rounded-2xl border-transparent shadow-sm" /></div>
                                    <div className="space-y-2"><Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do CA</Label><Input value={item.ca_numero} onChange={e => updateSelectedItem(item.produto_id, "ca_numero", e.target.value)} className="h-12 bg-white font-bold rounded-2xl border-transparent shadow-sm" /></div>
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo da Entrega</Label>
                                    <Select value={item.observacoes} onValueChange={v => updateSelectedItem(item.produto_id, "observacoes", v)}>
                                       <SelectTrigger className="h-12 bg-white font-bold rounded-2xl border-transparent shadow-sm"><SelectValue /></SelectTrigger>
                                       <SelectContent className="rounded-2xl">
                                          {[
                                            "ADMISSÃO / ENTRADA", 
                                            "REPOSIÇÃO POR USO", 
                                            "REPOSIÇÃO POR DESGASTE", 
                                            "TROCA POR VENCIMENTO CA", 
                                            "TROCA POR DANIFICADO", 
                                            "EXTRAVIO / PERDA"
                                          ].map(m => <SelectItem key={m} value={m} className="font-semibold">{m}</SelectItem>)}
                                       </SelectContent>
                                    </Select>
                                 </div>
                              </CardContent>
                           </Card>
                        ))}
                        {selectedItems.length === 0 && <div className="py-24 text-center opacity-30 grayscale"><ShoppingCart size={48} className="mx-auto mb-4" /><p className="text-xs font-black uppercase tracking-widest">Nenhum item selecionado</p></div>}
                     </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50">
                     <Button onClick={handleSaveMultiDelivery} disabled={selectedItems.length === 0 || !form.funcionario_id} className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xl shadow-2xl shadow-emerald-500/30 gap-4 transition-all active:scale-[0.98] rounded-[2rem]">
                        Confirmar Recebimento <CheckCircle2 size={32} />
                     </Button>
                  </div>
               </div>
            </div>
         </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
         <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
            <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2"><Edit className="text-amber-500" /> Editar Registro</DialogTitle></DialogHeader>
            {editingDelivery && (
               <div className="space-y-5 py-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     <p className="text-xs font-black text-slate-800 uppercase mb-1">{editingDelivery.produtos?.descricao}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={12} /> {editingDelivery.funcionarios?.nome}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2"><Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">Quantidade</Label><Input type="number" value={editingDelivery.quantidade} onChange={e => setEditingDelivery({...editingDelivery, quantidade: e.target.value})} className="h-12 rounded-2xl" /></div>
                     <div className="space-y-2"><Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">CA Vigente</Label><Input value={editingDelivery.ca_numero || ""} onChange={e => setEditingDelivery({...editingDelivery, ca_numero: e.target.value})} className="h-12 rounded-2xl" /></div>
                  </div>
                  <div className="space-y-2"><Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">Justificativa</Label><Input value={editingDelivery.observacoes || ""} onChange={e => setEditingDelivery({...editingDelivery, observacoes: e.target.value})} className="h-12 rounded-2xl" /></div>
                  <div className="space-y-2"><Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-slate-400">Data e Hora</Label><Input type="datetime-local" value={editingDelivery.data_entrega ? new Date(new Date(editingDelivery.data_entrega).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""} onChange={e => setEditingDelivery({...editingDelivery, data_entrega: new Date(e.target.value).toISOString()})} className="h-12 rounded-2xl" /></div>
               </div>
            )}
            <DialogFooter><Button onClick={handleUpdateDelivery} className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl shadow-slate-900/20">Atualizar Agora</Button></DialogFooter>
         </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
