import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Search, Package, AlertTriangle, Smartphone, Plus, 
  FileSignature, History, CheckCircle2, User, HardHat 
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
import { Textarea } from "@/components/ui/textarea";
import FichasEPIPanel from "@/components/epi/FichasEPIPanel";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

export default function EntregaEPI() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("entregas");
  const [showNewDelivery, setShowNewDelivery] = useState(false);

  // Form de Entrega
  const [form, setForm] = useState({ 
    funcionario_id: "", 
    produto_id: "", 
    obra_id: "", 
    quantidade: 1, 
    ca_numero: "", 
    observacoes: "", 
    empresa_id: "",
    motivo: "Primeira entrega"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ent, prd, mov, obs, fun, emp] = await Promise.all([
      supabase.from("entregas_epi").select("*, funcionarios(nome), produtos(descricao), obras(nome, codigo)").order("data_entrega", { ascending: false }).limit(200),
      supabase.from("produtos").select("*").eq("ativo", true).eq("categoria", "EPI").order("descricao"),
      supabase.from("movimentacoes_estoque").select("produto_id, tipo, quantidade"),
      supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
      supabase.from("funcionarios").select("id, nome, obra_id, empresa_id").eq("status", "ativo").order("nome"),
      supabase.from("empresas").select("id, razao_social, nome_fantasia"),
    ]);

    if (ent.data) setEntregas(ent.data);
    if (obs.data) setObras(obs.data);
    if (fun.data) setFuncionarios(fun.data);
    if (emp.data) setEmpresas(emp.data);

    if (prd.data && mov.data) {
      const calculated = prd.data.map(p => {
        const entradas = (mov.data as any[]).filter(m => m.produto_id === p.id && m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
        const saidas = (mov.data as any[]).filter(m => m.produto_id === p.id && m.tipo !== "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
        return { ...p, saldo: entradas - saidas };
      });
      setProdutos(calculated);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredEntregas = useMemo(() => {
    return entregas.filter(e => 
      !search || 
      e.funcionarios?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      e.produtos?.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      e.obras?.nome?.toLowerCase().includes(search.toLowerCase())
    );
  }, [entregas, search]);

  const handleSaveDelivery = async () => {
    if (!form.funcionario_id || !form.produto_id || !form.empresa_id) {
       toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
       return;
    }

    const { error: deliveryError } = await supabase.from("entregas_epi").insert({
       funcionario_id: form.funcionario_id,
       produto_id: form.produto_id,
       obra_id: form.obra_id || null,
       empresa_id: form.empresa_id,
       quantidade: Number(form.quantidade),
       ca_numero: form.ca_numero || null,
       motivo: form.motivo,
       observacoes: form.observacoes || null,
       data_entrega: new Date().toISOString()
    });

    if (deliveryError) {
       toast({ title: "Erro ao registrar entrega", variant: "destructive" });
       return;
    }

    // BAIXA NO ESTOQUE AUTOMÁTICA
    const funcName = funcionarios.find(f => f.id === form.funcionario_id)?.nome || "";
    await supabase.from("movimentacoes_estoque").insert({
       produto_id: form.produto_id,
       tipo: "saida_epi",
       quantidade: Number(form.quantidade),
       obra_id: form.obra_id || null,
       observacoes: `Entrega de EPI para ${funcName}`
    });

    toast({ title: "🛡️ EPI entregue e estoque atualizado!" });
    setShowNewDelivery(false);
    setForm({ funcionario_id: "", produto_id: "", obra_id: "", quantidade: 1, ca_numero: "", observacoes: "", empresa_id: "", motivo: "Primeira entrega" });
    loadData();
  };

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
                 <p className="text-sm text-muted-foreground flex items-center gap-2">Gestão de entregas e fichas NR-6 integradas ao estoque.</p>
              </div>
           </div>
           <div className="flex gap-2">
              <Button onClick={() => setShowNewDelivery(true)} className="bg-amber-500 hover:bg-amber-600 text-white border-none gap-2 px-6">
                 <Plus size={18} /> Nova Entrega
              </Button>
              <Button variant="outline" asChild className="gap-2">
                 <a href="/entrega-epi-mobile"><Smartphone size={18} /> Mobile</a>
              </Button>
           </div>
        </div>

        {/* DASHBOARD MINI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm"><CardContent className="p-5 flex items-center gap-4 text-emerald-700">
              <CheckCircle2 size={24} /><div className="flex-1">
                 <p className="text-[10px] font-bold uppercase opacity-70">Total Entregue (30d)</p>
                 <p className="text-2xl font-black">{entregas.length}</p>
              </div></CardContent></Card>
           <Card className="bg-amber-50/50 border-amber-100 shadow-sm"><CardContent className="p-5 flex items-center gap-4 text-amber-700">
              <Package size={24} /><div className="flex-1">
                 <p className="text-[10px] font-bold uppercase opacity-70">Itens em Alerta</p>
                 <p className="text-2xl font-black">{produtos.filter(p => p.saldo < p.estoque_minimo).length}</p>
              </div></CardContent></Card>
           <Card className="bg-blue-50/50 border-blue-100 shadow-sm"><CardContent className="p-5 flex items-center gap-4 text-blue-700">
              <User size={24} /><div className="flex-1">
                 <p className="text-[10px] font-bold uppercase opacity-70">Colaboradores Ativos</p>
                 <p className="text-2xl font-black">{funcionarios.length}</p>
              </div></CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 mb-4 h-11 w-full max-w-sm rounded-xl">
            <TabsTrigger value="entregas" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white"><History size={16} /> Entregas</TabsTrigger>
            <TabsTrigger value="fichas" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white"><FileSignature size={16} /> Fichas NR-6</TabsTrigger>
          </TabsList>

          <TabsContent value="entregas" className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border shadow-sm">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input placeholder="Buscar por funcionário, material ou obra..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 border-none bg-slate-50" />
                </div>
             </div>

             <ScrollableTable>
               <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                 <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                       <tr>
                          <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-slate-400">Data</th>
                          <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-slate-400">Funcionário</th>
                          <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-slate-400">EPI Entregue</th>
                          <th className="px-5 py-3 text-center text-[10px] uppercase font-bold text-slate-400">Qtd</th>
                          <th className="px-5 py-3 text-left text-[10px] uppercase font-bold text-slate-400">Obra / Alocação</th>
                          <th className="px-5 py-3 text-center text-[10px] uppercase font-bold text-slate-400">CA</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredEntregas.map(e => (
                         <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 text-xs font-medium text-slate-500">{format(new Date(e.data_entrega), "dd/MM/yyyy HH:mm")}</td>
                            <td className="px-5 py-4 font-bold text-slate-700">{e.funcionarios?.nome || "Excluído"}</td>
                            <td className="px-5 py-4 text-slate-600">{e.produtos?.descricao || "—"}</td>
                            <td className="px-5 py-4 text-center font-black text-amber-600 bg-amber-50/30">{e.quantidade}x</td>
                            <td className="px-5 py-4">
                               <span className="text-xs text-slate-500">{e.obras?.nome ? `${e.obras.codigo} - ${e.obras.nome}` : "Depósito Central"}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                               <Badge variant="outline" className="font-mono text-[10px] text-slate-400 border-slate-200">{e.ca_numero || "N/A"}</Badge>
                            </td>
                         </tr>
                       ))}
                       {filteredEntregas.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground italic">Nenhum registro encontrado.</td></tr>}
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

      {/* MODAL: NOVA ENTREGA (DESKTOP) */}
      <Dialog open={showNewDelivery} onOpenChange={setShowNewDelivery}>
         <DialogContent className="max-w-2xl">
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2"><HardHat className="text-amber-500" /> Registrar Nova Entrega de EPI</DialogTitle>
               <DialogDescription>A baixa no estoque do almoxarifado será automática.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
               <div className="col-span-2 space-y-1.5"><Label>Empresa do Colaborador *</Label>
                  <Select value={form.empresa_id} onValueChange={v => setForm({...form, empresa_id: v})}>
                     <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                     <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5"><Label>Funcionário *</Label>
                  <Select value={form.funcionario_id} onValueChange={v => {
                      const f = funcionarios.find(fn => fn.id === v);
                      setForm({...form, funcionario_id: v, obra_id: f?.obra_id || "", empresa_id: f?.empresa_id || form.empresa_id });
                  }}>
                     <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                     <SelectContent>{funcionarios.filter(f => !form.empresa_id || f.empresa_id === form.empresa_id).map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5"><Label>Produto (EPI) *</Label>
                  <Select value={form.produto_id} onValueChange={v => {
                      const p = produtos.find(item => item.id === v);
                      setForm({...form, produto_id: v, ca_numero: p?.ca_numero || ""});
                  }}>
                     <SelectTrigger><SelectValue placeholder="Buscar item no estoque..." /></SelectTrigger>
                     <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.descricao} (Estoque: {p.saldo})</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5"><Label>Quantidade Entrega</Label><Input type="number" value={form.quantidade} onChange={e => setForm({...form, quantidade: Number(e.target.value)})} /></div>
               <div className="space-y-1.5"><Label>Certificado de Aprovação (CA)</Label><Input value={form.ca_numero} onChange={e => setForm({...form, ca_numero: e.target.value})} /></div>
               <div className="col-span-2 space-y-1.5"><Label>Motivo da Entrega</Label>
                  <Select value={form.motivo} onValueChange={v => setForm({...form, motivo: v})}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>{["Entrada na empresa", "Troca por desgaste", "Extravio/Perda", "Novo EPI", "Dano acidental"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="col-span-2 space-y-1.5"><Label>Observações Adicionais</Label><Textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} placeholder="Pode citar o motivo da troca..." /></div>
            </div>
            <DialogFooter><Button onClick={handleSaveDelivery} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12">Finalizar Registro de Entrega</Button></DialogFooter>
         </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
