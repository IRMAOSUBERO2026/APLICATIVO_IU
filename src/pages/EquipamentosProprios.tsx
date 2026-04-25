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

interface SolicitacaoCompra {
  id: string;
  descricao: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  quantidade: number;
  valor_estimado: number;
  obra_id: string | null;
  solicitante: string | null;
  status: string;
  observacoes: string | null;
}

interface HistoricoAlocacao {
  id: string;
  data: string;
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

const STATUS_EQUIP: Record<string, { label: string; badgeClass: string; barClass: string; icon: React.ReactNode }> = {
  disponivel: { label: "Disponivel", badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", barClass: "bg-emerald-500", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
  em_uso: { label: "Em Uso", badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30", barClass: "bg-blue-500", icon: <Clock className="h-4 w-4 text-blue-500" /> },
  manutencao: { label: "Manutencao", badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30", barClass: "bg-amber-500", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
  sucata: { label: "Sucata", badgeClass: "bg-rose-500/15 text-rose-600 border-rose-500/30", barClass: "bg-rose-500", icon: <XCircle className="h-4 w-4 text-rose-500" /> },
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
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showManutForm, setShowManutForm] = useState(false);
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<Equipamento | null>(null);
  const [historicoEquip, setHistoricoEquip] = useState<Manutencao[]>([]);
  const [historicoAlocacao, setHistoricoAlocacao] = useState<HistoricoAlocacao[]>([]);

  const [formEquip, setFormEquip] = useState({
    codigo: "", descricao: "", tipo: TIPOS_EQUIPAMENTO[0], marca: "", modelo: "",
    numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "",
    empresa_id: "", status: "disponivel", observacoes: "", foto_url: ""
  });
  const [formManut, setFormManut] = useState({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" });
  const [formCompra, setFormCompra] = useState({ descricao: "", tipo: "Outros", marca: "", modelo: "", quantidade: 1, valor_estimado: 0, obra_id: "", solicitante: "", empresa_id: "", observacoes: "" });
  const [transferObraId, setTransferObraId] = useState("");
  const [transferResponsavel, setTransferResponsavel] = useState("");

  const loadData = async () => {
    const [eqRes, mtRes, scRes, emRes, obRes] = await Promise.all([
      supabase.from("equipamentos_proprios").select("*").order("codigo"),
      supabase.from("manutencoes_equipamento").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("solicitacoes_compra_equipamento").select("*").order("created_at", { ascending: false }),
      supabase.from("empresas").select("id, razao_social"),
      supabase.from("obras").select("id, nome, codigo"),
    ]);
    if (eqRes.data) setEquipamentos(eqRes.data);
    if (mtRes.data) setManutencoes(mtRes.data);
    if (scRes.data) setSolicitacoes(scRes.data);
    if (emRes.data) setEmpresas(emRes.data);
    if (obRes.data) setObras(obRes.data);
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => ({
    total: equipamentos.length,
    emUso: equipamentos.filter(e => e.status === "em_uso").length,
    disponiveis: equipamentos.filter(e => e.status === "disponivel").length,
    manutencao: equipamentos.filter(e => e.status === "manutencao").length,
    custoTotal: manutencoes.filter(m => m.status === "concluido" || m.status === "em_reparo").reduce((acc, m) => acc + (m.valor_aprovado || 0), 0)
  }), [equipamentos, manutencoes]);

  const filteredEquip = useMemo(() => {
    return equipamentos.filter(e => {
      const b = busca.toLowerCase();
      return e.descricao.toLowerCase().includes(b) || e.codigo.toLowerCase().includes(b);
    }).filter(e => filtroStatus === "todos" || e.status === filtroStatus);
  }, [equipamentos, busca, filtroStatus]);

  const obraMap = useMemo(() => {
    const m: Record<string, string> = {};
    obras.forEach(o => m[o.id] = o.nome);
    return m;
  }, [obras]);

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
    if (!formEquip.descricao || !formEquip.codigo) { toast({ title: "Preencha os campos", variant: "destructive" }); return; }
    const p = { ...formEquip, obra_id: formEquip.obra_id || null, empresa_id: formEquip.empresa_id || null, valor_aquisicao: formEquip.valor_aquisicao || 0, data_aquisicao: formEquip.data_aquisicao || null, foto_url: formEquip.foto_url || null };
    if (editingEquip) await supabase.from("equipamentos_proprios").update(p).eq("id", editingEquip.id);
    else await supabase.from("equipamentos_proprios").insert(p);
    setShowEquipForm(false); resetEquipForm(); loadData();
    toast({ title: "Salvo com sucesso!" });
  }

  async function handleTransfer() {
    if (!selectedEquip) return;
    await supabase.from("historico_alocacao_equipamento").insert({ equipamento_id: selectedEquip.id, obra_origem_id: selectedEquip.obra_id || null, obra_destino_id: transferObraId || null, responsavel: transferResponsavel, observacoes: "Transferencia via painel" });
    await supabase.from("equipamentos_proprios").update({ obra_id: transferObraId || null, status: transferObraId ? "em_uso" : "disponivel" }).eq("id", selectedEquip.id);
    setShowTransferForm(false); loadData();
    toast({ title: "Transferido!" });
  }

  async function quickMaintenance(eq: Equipamento) {
    await supabase.from("equipamentos_proprios").update({ status: "manutencao" }).eq("id", eq.id);
    setFormManut(p => ({ ...p, equipamento_id: eq.id, descricao: "Solicitado via painel rapido" }));
    setShowManutForm(true); loadData();
  }

  async function deleteEquip(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("equipamentos_proprios").delete().eq("id", id);
    loadData(); toast({ title: "Excluido" });
  }

  async function saveManut() {
    if (!formManut.equipamento_id || !formManut.descricao) return;
    const eq = equipamentos.find(e => e.id === formManut.equipamento_id);
    await supabase.from("manutencoes_equipamento").insert({ ...formManut, empresa_id: eq?.empresa_id || null });
    setShowManutForm(false); resetManutForm(); loadData();
    toast({ title: "Manutencao registrada!" });
  }

  async function updateManutStatus(id: string, status: string) {
    await supabase.from("manutencoes_equipamento").update({ status }).eq("id", id); loadData();
  }

  async function saveCompra() {
    if (!formCompra.descricao) return;
    await supabase.from("solicitacoes_compra_equipamento").insert({ ...formCompra, obra_id: formCompra.obra_id || null, empresa_id: formCompra.empresa_id || null });
    setShowCompraForm(false); resetCompraForm(); loadData();
    toast({ title: "Solicitacao criada!" });
  }

  function resetEquipForm() { setFormEquip({ codigo: "", descricao: "", tipo: TIPOS_EQUIPAMENTO[0], marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "", foto_url: "" }); }
  function resetManutForm() { setFormManut({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" }); }
  function resetCompraForm() { setFormCompra({ descricao: "", tipo: "Outros", marca: "", modelo: "", quantidade: 1, valor_estimado: 0, obra_id: "", solicitante: "", empresa_id: "", observacoes: "" }); }

  function openEdit(eq: Equipamento) {
    setEditingEquip(eq);
    setFormEquip({ codigo: eq.codigo, descricao: eq.descricao, tipo: eq.tipo, marca: eq.marca || "", modelo: eq.modelo || "", numero_serie: eq.numero_serie || "", data_aquisicao: eq.data_aquisicao || "", valor_aquisicao: eq.valor_aquisicao, obra_id: eq.obra_id || "", empresa_id: eq.empresa_id || "", status: eq.status, observacoes: eq.observacoes || "", foto_url: eq.foto_url || "" });
    setShowEquipForm(true);
  }

  async function openHistorico(eq: Equipamento) { 
    setSelectedEquip(eq); 
    setHistoricoEquip(manutencoes.filter(m => m.equipamento_id === eq.id));
    const { data } = await supabase.from("historico_alocacao_equipamento").select("*, obras_origem:obra_origem_id(nome), obras_destino:obra_destino_id(nome)").eq("equipamento_id", eq.id).order("data_movimentacao", { ascending: false });
    if (data) setHistoricoAlocacao(data.map((h: any) => ({ id: h.id, data: h.data_movimentacao, obra_origem: h.obras_origem?.nome || "Estoque", obra_destino: h.obras_destino?.nome || "Estoque", responsavel: h.responsavel })));
    setShowHistorico(true); 
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20"><Wrench className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Equipamentos</h1>
              <p className="text-muted-foreground text-sm">Gestao global de frota e ativos.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCompraForm(true)}><ShoppingCart className="h-4 w-4 mr-2" /> Compras</Button>
            <Button onClick={() => { setEditingEquip(null); resetEquipForm(); setShowEquipForm(true); }}><Plus className="h-4 w-4 mr-2" /> Novo</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", v: stats.total, i: <Package className="h-4 w-4" /> },
            { label: "Em Uso", v: stats.emUso, i: <Clock className="h-4 w-4" /> },
            { label: "Disponivel", v: stats.disponiveis, i: <CheckCircle2 className="h-4 w-4" /> },
            { label: "Manutencao", v: stats.manutencao, i: <AlertTriangle className="h-4 w-4" /> },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">{k.label}</p>
                <div className="flex items-center justify-between mt-1"><p className="text-2xl font-bold">{k.v}</p>{k.i}</div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-rose-50 border-rose-100">
            <CardContent className="p-4">
              <p className="text-[10px] font-medium text-rose-600 uppercase">Custo Manut.</p>
              <div className="flex items-center justify-between mt-1"><p className="text-xl font-black text-rose-700">R$ {stats.custoTotal.toLocaleString("pt-BR")}</p><DollarSign className="h-4 w-4 text-rose-500" /></div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="painel">Painel</TabsTrigger><TabsTrigger value="cadastro">Catalogo</TabsTrigger><TabsTrigger value="manutencao">Manutencoes</TabsTrigger></TabsList>
          
          <TabsContent value="painel" className="space-y-4 mt-4">
            {Object.entries(equipPorObra).map(([id, eqs]) => (
              <Card key={id}>
                <CardHeader className="py-2 px-4 bg-muted/30 border-b"><CardTitle className="text-sm">{obraMap[id] || "Obra"}</CardTitle></CardHeader>
                <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {eqs.map(eq => (
                    <div key={eq.id} className="flex gap-3 p-2 border rounded-lg bg-card">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">{eq.foto_url ? <img src={eq.foto_url} className="object-cover w-full h-full" /> : TIPO_ICON[eq.tipo]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{eq.descricao}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{eq.codigo}</p>
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px]" onClick={() => { setSelectedEquip(eq); setTransferObraId(eq.obra_id || ""); setShowTransferForm(true); }}><ArrowRightLeft size={12} className="mr-1" /> Transf.</Button>
                          <Button size="sm" variant="ghost" className="h-6 px-1 text-[10px] text-amber-600" onClick={() => quickMaintenance(eq)}><Wrench size={12} className="mr-1" /> Oficina</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="cadastro" className="space-y-4 mt-4">
            <div className="flex gap-3"><Input className="max-w-sm" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredEquip.map(eq => {
                const s = STATUS_EQUIP[eq.status];
                const custo = manutencoes.filter(m => m.equipamento_id === eq.id && (m.status === "concluido" || m.status === "em_reparo")).reduce((sum, m) => sum + (m.valor_aprovado || 0), 0);
                return (
                  <Card key={eq.id} className="overflow-hidden">
                    <div className={`h-1 ${s?.barClass}`} />
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="w-14 h-14 rounded-lg bg-muted border overflow-hidden flex items-center justify-center">{eq.foto_url ? <img src={eq.foto_url} className="object-cover w-full h-full" /> : <Camera className="text-muted-foreground/30" />}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{eq.descricao}</p>
                          <p className="text-xs text-muted-foreground">{eq.codigo}</p>
                          {custo > 0 && <p className="text-[10px] font-black text-rose-600 mt-1">R$ {custo.toLocaleString("pt-BR")}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 border-t pt-3">
                        <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={() => openHistorico(eq)}><History size={14} /></Button>
                        <Button size="sm" variant="ghost" className="h-8 flex-1 text-amber-600" onClick={() => quickMaintenance(eq)}><Wrench size={14} /></Button>
                        <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={() => openEdit(eq)}><Edit size={14} /></Button>
                        <Button size="sm" variant="ghost" className="h-8 flex-1 text-rose-500" onClick={() => deleteEquip(eq.id)}><Trash2 size={14} /></Button>
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
                 <TableHeader><TableRow><TableHead>Equipamento</TableHead><TableHead>Valores</TableHead><TableHead>Status</TableHead><TableHead>Acao</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {manutencoes.map(m => (
                     <TableRow key={m.id}>
                       <TableCell className="text-xs font-bold">{equipamentos.find(eq => eq.id === m.equipamento_id)?.descricao || "---"}</TableCell>
                       <TableCell className="text-[10px]">Orc: R${m.valor_orcamento} / Apr: R${m.valor_aprovado}</TableCell>
                       <TableCell><Badge variant="outline" className={STATUS_MANUT[m.status]?.class}>{STATUS_MANUT[m.status]?.label}</Badge></TableCell>
                       <TableCell>
                         <Select value={m.status} onValueChange={v => updateManutStatus(m.id, v)}>
                           <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                           <SelectContent>{Object.entries(STATUS_MANUT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Cadastro</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2"><Label>URL Foto</Label><Input value={formEquip.foto_url || ""} onChange={e => setFormEquip(p => ({ ...p, foto_url: e.target.value }))} /></div>
            <div><Label>Codigo</Label><Input value={formEquip.codigo} onChange={e => setFormEquip(p => ({ ...p, codigo: e.target.value }))} /></div>
            <div><Label>Descricao</Label><Input value={formEquip.descricao} onChange={e => setFormEquip(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><Label>Tipo</Label><Select value={formEquip.tipo} onValueChange={v => setFormEquip(p => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={formEquip.status} onValueChange={v => setFormEquip(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_EQUIP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={saveEquip} className="w-full">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferForm} onOpenChange={setShowTransferForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transferir</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={transferObraId} onValueChange={setTransferObraId}><SelectTrigger><SelectValue placeholder="Estoque" /></SelectTrigger><SelectContent><SelectItem value="">Estoque</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Responsavel" value={transferResponsavel} onChange={e => setTransferResponsavel(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleTransfer} className="w-full">Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historico</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
             {historicoAlocacao.map(h => <div key={h.id} className="text-xs border-b pb-2">{new Date(h.data).toLocaleDateString()} - {h.obra_origem} para {h.obra_destino} ({h.responsavel})</div>)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showManutForm} onOpenChange={setShowManutForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manutencao</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea placeholder="Descricao da falha" value={formManut.descricao} onChange={e => setFormManut(p => ({ ...p, descricao: e.target.value }))} />
            <Input placeholder="Fornecedor" value={formManut.fornecedor || ""} onChange={e => setFormManut(p => ({ ...p, fornecedor: e.target.value }))} />
          </div>
          <DialogFooter><Button onClick={saveManut} className="w-full">Enviar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompraForm} onOpenChange={setShowCompraForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compra</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><Input placeholder="Equipamento" value={formCompra.descricao} onChange={e => setFormCompra(p => ({ ...p, descricao: e.target.value }))} /></div>
          <DialogFooter><Button onClick={saveCompra} className="w-full">Solicitar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
