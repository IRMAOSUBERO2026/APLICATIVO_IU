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
  CheckCircle2, AlertTriangle, Clock, XCircle, Package, ArrowRightLeft, Camera, DollarSign
} from "lucide-react";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

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
  
  const [formEquip, setFormEquip] = useState({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "", foto_url: "" });
  const [formManut, setFormManut] = useState({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" });
  const [transferObraId, setTransferObraId] = useState("");
  const [transferResponsavel, setTransferResponsavel] = useState("");

  const loadData = async () => {
    const [eq, mt, ob, em] = await Promise.all([
      supabase.from("equipamentos_proprios").select("*").order("codigo"),
      supabase.from("manutencoes_equipamento").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("obras").select("id, nome, codigo"),
      supabase.from("empresas").select("id, razao_social"),
    ]);
    if (eq.data) setEquipamentos(eq.data);
    if (mt.data) setManutencoes(mt.data);
    if (ob.data) setObras(ob.data);
    if (em.data) setEmpresas(em.data);
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
    const g: Record<string, Equipamento[]> = {};
    equipamentos.forEach(e => {
      if (!e.obra_id) return;
      if (!g[e.obra_id]) g[e.obra_id] = [];
      g[e.obra_id].push(e);
    });
    return g;
  }, [equipamentos]);

  async function saveEquip() {
    if (!formEquip.codigo || !formEquip.descricao) return;
    const p = { ...formEquip, obra_id: formEquip.obra_id || null, empresa_id: formEquip.empresa_id || null };
    if (editingEquip) await supabase.from("equipamentos_proprios").update(p).eq("id", editingEquip.id);
    else await supabase.from("equipamentos_proprios").insert(p);
    setShowEquipForm(false); loadData(); toast({ title: "Salvo!" });
  }

  async function handleTransfer() {
    if (!selectedEquip) return;
    await supabase.from("historico_alocacao_equipamento").insert({
      equipamento_id: selectedEquip.id,
      obra_origem_id: selectedEquip.obra_id || null,
      obra_destino_id: transferObraId || null,
      responsavel: transferResponsavel,
      observacoes: "Transferencia via painel"
    });
    await supabase.from("equipamentos_proprios").update({ 
      obra_id: transferObraId || null, 
      status: transferObraId ? "em_uso" : "disponivel" 
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
          <Button onClick={() => { setEditingEquip(null); setShowEquipForm(true); }} className="gap-2"><Plus size={18} /> Novo Equipamento</Button>
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
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={() => { setSelectedEquip(eq); setTransferObraId(eq.obra_id || ""); setShowTransferForm(true); }}><ArrowRightLeft size={12} /> Transf.</Button>
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
                              <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={() => openHistorico(eq)}><History size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1 text-amber-600" onClick={() => quickMaintenance(eq)}><Wrench size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={() => { setEditingEquip(eq); setFormEquip({ ...eq, marca: eq.marca || "", modelo: eq.modelo || "", numero_serie: eq.numero_serie || "", data_aquisicao: eq.data_aquisicao || "", foto_url: eq.foto_url || "", empresa_id: eq.empresa_id || "", obra_id: eq.obra_id || "", observacoes: eq.observacoes || "" }); setShowEquipForm(true); }}><Edit size={16} /></Button>
                              <Button size="sm" variant="ghost" className="h-8 flex-1 text-rose-500" onClick={async () => { if(confirm("Excluir?")) { await supabase.from("equipamentos_proprios").delete().eq("id", eq.id); loadData(); } }}><Trash2 size={16} /></Button>
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
               <div className="md:col-span-2"><Label>URL Foto</Label><Input value={formEquip.foto_url} onChange={e => setFormEquip({...formEquip, foto_url: e.target.value})} placeholder="https://..." /></div>
               <div><Label>Codigo IU *</Label><Input value={formEquip.codigo} onChange={e => setFormEquip({...formEquip, codigo: e.target.value})} /></div>
               <div><Label>Descricao *</Label><Input value={formEquip.descricao} onChange={e => setFormEquip({...formEquip, descricao: e.target.value})} /></div>
               <div><Label>Tipo</Label><Select value={formEquip.tipo} onValueChange={v => setFormEquip({...formEquip, tipo: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
               <div><Label>Status Atual</Label><Select value={formEquip.status} onValueChange={v => setFormEquip({...formEquip, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_EQUIP).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
               <div><Label>Empresa Proprietaria</Label><Select value={formEquip.empresa_id || ""} onValueChange={v => setFormEquip({...formEquip, empresa_id: v})}><SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger><SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent></Select></div>
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
               <div><Label>Obra Destino</Label><Select value={transferObraId} onValueChange={setTransferObraId}><SelectTrigger><SelectValue placeholder="Estoque Principal" /></SelectTrigger><SelectContent><SelectItem value="">Estoque Principal</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select></div>
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
