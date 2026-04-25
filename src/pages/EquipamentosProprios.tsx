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
  disponivel: {
    label: "Disponível",
    badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    barClass: "bg-emerald-500",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  em_uso: {
    label: "Em Uso",
    badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    barClass: "bg-blue-500",
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
  manutencao: {
    label: "Manutenção",
    badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    barClass: "bg-amber-500",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  },
  sucata: {
    label: "Sucata",
    badgeClass: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    barClass: "bg-rose-500",
    icon: <XCircle className="h-4 w-4 text-rose-500" />,
  },
};

const STATUS_MANUT: Record<string, { label: string; class: string }> = {
  pendente:  { label: "Pendente",  class: "bg-amber-100 text-amber-700 border-amber-200" },
  orcamento: { label: "Orçamento", class: "bg-blue-100 text-blue-700 border-blue-200" },
  em_reparo: { label: "Em Reparo",  class: "bg-purple-100 text-purple-700 border-purple-200" },
  concluido: { label: "Concluído", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const STATUS_COMPRA: Record<string, { label: string; class: string }> = {
  solicitado: { label: "Solicitado", class: "bg-amber-100 text-amber-700 border-amber-200" },
  cotacao:    { label: "Cotação",    class: "bg-blue-100 text-blue-700 border-blue-200" },
  aprovado:   { label: "Aprovado",   class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  entregue:   { label: "Entregue",   class: "bg-slate-100 text-slate-700 border-slate-200" },
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
      const matchBusca = e.descricao.toLowerCase().includes(busca.toLowerCase()) || e.codigo.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || e.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [equipamentos, busca, filtroStatus]);

  const obraMap = useMemo(() => {
    const map: Record<string, string> = {};
    obras.forEach(o => map[o.id] = o.nome);
    return map;
  }, [obras]);

  const equipPorObra = useMemo(() => {
    const groups: Record<string, Equipamento[]> = {};
    equipamentos.forEach(e => {
      if (!e.obra_id) return;
      if (!groups[e.obra_id]) groups[e.obra_id] = [];
      groups[e.obra_id].push(e);
    });
    return groups;
  }, [equipamentos]);

  async function saveEquip() {
    if (!formEquip.descricao || !formEquip.codigo) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const payload = { 
      ...formEquip, 
      obra_id: formEquip.obra_id || null, 
      empresa_id: formEquip.empresa_id || null,
      valor_aquisicao: formEquip.valor_aquisicao || 0, 
      data_aquisicao: formEquip.data_aquisicao || null,
      foto_url: formEquip.foto_url || null
    };

    if (editingEquip) {
      const { error } = await supabase.from("equipamentos_proprios").update(payload).eq("id", editingEquip.id);
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Equipamento atualizado!" });
    } else {
      const { error } = await supabase.from("equipamentos_proprios").insert(payload);
      if (error) { toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Equipamento cadastrado!" });
    }
    setShowEquipForm(false); setEditingEquip(null); resetEquipForm(); loadData();
  }

  async function handleTransfer() {
    if (!selectedEquip) return;
    
    // Registrar histrico (se a tabela existir)
    await supabase.from("historico_alocacao_equipamento").insert({
      equipamento_id: selectedEquip.id,
      obra_origem_id: selectedEquip.obra_id || null,
      obra_destino_id: transferObraId || null,
      responsavel: transferResponsavel,
      observacoes: `Transferência manual via painel`
    });

    const newStatus = transferObraId ? "em_uso" : "disponivel";
    await supabase.from("equipamentos_proprios").update({ 
      obra_id: transferObraId || null,
      status: newStatus 
    }).eq("id", selectedEquip.id);

    toast({ title: "Equipamento transferido!" }); setShowTransferForm(false); loadData();
  }

  async function quickMaintenance(eq: Equipamento) {
    await supabase.from("equipamentos_proprios").update({ status: "manutencao" }).eq("id", eq.id);
    setFormManut(p => ({ ...p, equipamento_id: eq.id, descricao: "Enviado para manutenção via painel rápido" }));
    setShowManutForm(true);
    loadData();
  }

  async function deleteEquip(id: string) {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;
    await supabase.from("equipamentos_proprios").delete().eq("id", id);
    toast({ title: "Equipamento excluído" }); loadData();
  }

  async function saveManut() {
    if (!formManut.equipamento_id || !formManut.descricao) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const eq = equipamentos.find(e => e.id === formManut.equipamento_id);
    await supabase.from("manutencoes_equipamento").insert({ ...formManut, empresa_id: eq?.empresa_id || empresas[0]?.id || null });
    toast({ title: "Manutenção solicitada!" }); setShowManutForm(false); resetManutForm(); loadData();
  }

  async function updateManutStatus(id: string, status: string) {
    await supabase.from("manutencoes_equipamento").update({ status }).eq("id", id); 
    if (status === "concluido") {
       // Opcional: Voltar equipamento para disponvel se a manuteno acabou
    }
    loadData();
  }

  async function saveCompra() {
    if (!formCompra.descricao) {
      toast({ title: "Preencha a descrição", variant: "destructive" }); return;
    }
    await supabase.from("solicitacoes_compra_equipamento").insert({ ...formCompra, obra_id: formCompra.obra_id || null, empresa_id: formCompra.empresa_id || null });
    toast({ title: "Solicitação de compra criada!" }); setShowCompraForm(false); resetCompraForm(); loadData();
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
    if (data) {
      setHistoricoAlocacao(data.map((h: any) => ({
        id: h.id,
        data: h.data_movimentacao,
        obra_origem: h.obras_origem?.nome || "Estoque",
        obra_destino: h.obras_destino?.nome || "Estoque",
        responsavel: h.responsavel
      })));
    }
    setShowHistorico(true); 
  }

  return (
    <AppLayout title="Equipamentos Próprios">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestão de Equipamentos</h1>
              <p className="text-muted-foreground text-sm">Controle de ativos, manutenções e histórico global.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowCompraForm(true)}><ShoppingCart className="h-4 w-4" /> Solicitar Compra</Button>
            <Button className="gap-2" onClick={() => { setEditingEquip(null); resetEquipForm(); setShowEquipForm(true); }}><Plus className="h-4 w-4" /> Novo Equipamento</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",        value: stats.total,       gradient: "from-slate-500/20 to-slate-600/10",  icon: <Package className="h-5 w-5 text-slate-500" />,  textColor: "text-slate-600 dark:text-slate-300" },
            { label: "Em Uso",       value: stats.emUso,       gradient: "from-blue-500/20 to-blue-600/10",    icon: <Clock className="h-5 w-5 text-blue-500" />,    textColor: "text-blue-600 dark:text-blue-400" },
            { label: "Disponíveis",  value: stats.disponiveis, gradient: "from-emerald-500/20 to-emerald-600/10", icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, textColor: "text-emerald-600 dark:text-emerald-400" },
            { label: "Manutenção",   value: stats.manutencao,  gradient: "from-amber-500/20 to-amber-600/10",  icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, textColor: "text-amber-600 dark:text-amber-400" },
            { label: "Custo Manut. Total", value: `R$ ${stats.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, gradient: "from-rose-500/10 to-rose-600/5", icon: <DollarSign className="h-5 w-5 text-rose-500" />, textColor: "text-rose-600" },
          ].map(k => (
            <Card key={k.label} className="overflow-hidden border border-border/60 shadow-sm">
              <CardContent className={`p-4 bg-gradient-to-br ${k.gradient}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</p>
                  {k.icon}
                </div>
                <p className={`text-3xl font-bold ${k.textColor}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10">
            <TabsTrigger value="painel" className="gap-1.5"><MapPin className="h-4 w-4" />Painel por Obra</TabsTrigger>
            <TabsTrigger value="cadastro" className="gap-1.5"><Wrench className="h-4 w-4" />Catálogo Geral</TabsTrigger>
            <TabsTrigger value="manutencao" className="gap-1.5"><Settings className="h-4 w-4" />Manutenções</TabsTrigger>
            <TabsTrigger value="compras" className="gap-1.5"><ShoppingCart className="h-4 w-4" />Compras</TabsTrigger>
          </TabsList>

          <TabsContent value="painel" className="space-y-4 mt-4">
            {Object.entries(equipPorObra).map(([obraId, eqs]) => (
              <Card key={obraId} className="overflow-hidden shadow-sm">
                <CardHeader className="py-3 px-4 bg-primary/5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold text-primary">{obraMap[obraId] || "Obra"}</CardTitle>
                    <Badge variant="outline" className="ml-auto text-xs">{eqs.length} itens</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {eqs.map(eq => (
                    <div key={eq.id} className="rounded-xl border border-border/60 p-3 flex gap-3 items-start bg-card hover:bg-muted/30 transition-colors">
                      <div className="relative w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/40">
                         {eq.foto_url ? <img src={eq.foto_url} className="w-full h-full object-cover" /> : TIPO_ICON[eq.tipo] || <Wrench className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{eq.descricao}</p>
                        <p className="text-[10px] uppercase font-mono text-muted-foreground">{eq.codigo}</p>
                        <div className="flex gap-2 mt-2">
                           <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] gap-1" onClick={() => { setSelectedEquip(eq); setTransferObraId(eq.obra_id || ""); setShowTransferForm(true); }}><ArrowRightLeft className="h-3 w-3" /> Transf.</Button>
                           <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] gap-1 text-amber-600" onClick={() => quickMaintenance(eq)}><AlertTriangle className="h-3 w-3" /> Oficina</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="cadastro" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {Object.entries(STATUS_EQUIP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEquip.map(eq => {
                const st = STATUS_EQUIP[eq.status];
                return (
                  <Card key={eq.id} className="overflow-hidden hover:shadow-md transition-all border border-border/60">
                    <div className={`h-1 w-full ${st?.barClass}`} />
                    <CardContent className="p-4">
                      <div className="flex gap-3 mb-3">
                         <div className="w-16 h-16 rounded-xl bg-muted border overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {eq.foto_url ? <img src={eq.foto_url} className="w-full h-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground/40" />}
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{eq.descricao}</p>
                            <div className="flex items-center justify-between mt-0.5">
                               <p className="text-xs text-muted-foreground font-mono">{eq.codigo}</p>
                               <p className="text-[10px] font-bold text-rose-500">
                                 R$ {manutencoes.filter(m => m.equipamento_id === eq.id && (m.status === "concluido" || m.status === "em_reparo"))
                                     .reduce((sum, m) => sum + (m.valor_aprovado || 0), 0)
                                     .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                               </p>
                            </div>
                            <Badge variant="outline" className={`mt-2 text-[10px] h-5 ${st?.badgeClass}`}>{st?.label}</Badge>
                         </div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-3 border-t">
                        <Button size="sm" variant="ghost" className="h-8 flex-1 gap-1 text-[10px] sm:text-xs" onClick={() => openHistorico(eq)}><History className="h-3.5 w-3.5" /> Hist.</Button>
                        <Button size="sm" variant="ghost" className="h-8 flex-1 gap-1 text-[10px] sm:text-xs text-amber-600 hover:text-amber-700" onClick={() => quickMaintenance(eq)}><Wrench className="h-3.5 w-3.5" /> Manut.</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEdit(eq)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-500 hover:text-rose-600" onClick={() => deleteEquip(eq.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="manutencao" className="mt-4">
            <Card className="overflow-hidden">
               <ScrollableTable>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/50"><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição/Falha</TableHead><TableHead>Valores (Orc/Aprov)</TableHead><TableHead>Status</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
                    <TableBody>
                       {manutencoes.map(m => (
                         <TableRow key={m.id}>
                           <TableCell className="text-sm font-medium">{equipamentos.find(eq => eq.id === m.equipamento_id)?.descricao || "—"}</TableCell>
                           <TableCell><Badge variant="outline" className="capitalize text-xs">{m.tipo}</Badge></TableCell>
                           <TableCell className="text-xs max-w-[150px] truncate">{m.descricao}</TableCell>
                           <TableCell>
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[10px] text-muted-foreground">Orc: R$ {m.valor_orcamento?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                 <span className="text-[11px] font-bold text-emerald-600">Apr: R$ {m.valor_aprovado?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              </div>
                           </TableCell>
                           <TableCell><Badge variant="outline" className={STATUS_MANUT[m.status]?.class}>{STATUS_MANUT[m.status]?.label}</Badge></TableCell>
                           <TableCell>
                  </Table>
               </ScrollableTable>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL CADASTRO/EDIÇÃO */}
      <Dialog open={showEquipForm} onOpenChange={setShowEquipForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEquip ? "Editar Equipamento" : "Novo Cadastro"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2">
               <Label>URL da Foto (Recuperada)</Label>
               <Input value={formEquip.foto_url || ""} onChange={e => setFormEquip(p => ({ ...p, foto_url: e.target.value }))} placeholder="https://..." />
               <p className="text-[10px] text-muted-foreground mt-1">Cole aqui a URL da foto recuperada ou de um novo servidor.</p>
            </div>
            <div><Label>Código IU *</Label><Input value={formEquip.codigo} onChange={e => setFormEquip(p => ({ ...p, codigo: e.target.value }))} /></div>
            <div><Label>Descrição *</Label><Input value={formEquip.descricao} onChange={e => setFormEquip(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
               <Select value={formEquip.tipo} onValueChange={v => setFormEquip(p => ({ ...p, tipo: v }))}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
               </Select>
            </div>
            <div><Label>Marca</Label><Input value={formEquip.marca || ""} onChange={e => setFormEquip(p => ({ ...p, marca: e.target.value }))} /></div>
            <div><Label>Modelo</Label><Input value={formEquip.modelo || ""} onChange={e => setFormEquip(p => ({ ...p, modelo: e.target.value }))} /></div>
            <div><Label>Status Atual</Label>
               <Select value={formEquip.status} onValueChange={v => setFormEquip(p => ({ ...p, status: v }))}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>{Object.entries(STATUS_EQUIP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
               </Select>
            </div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={formEquip.observacoes || ""} onChange={e => setFormEquip(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={saveEquip} className="w-full sm:w-auto">Confirmar Dados</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TRANSFERÊNCIA */}
      <Dialog open={showTransferForm} onOpenChange={setShowTransferForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Transferir Equipamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Equipamento</p>
                <p className="font-bold">{selectedEquip?.codigo} - {selectedEquip?.descricao}</p>
             </div>
             <div>
                <Label>Obra de Destino</Label>
                <Select value={transferObraId} onValueChange={setTransferObraId}>
                  <SelectTrigger><SelectValue placeholder="Estoque / Central" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Estoque / Central</SelectItem>
                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
             <div><Label>Responsável pela Movimentação</Label><Input value={transferResponsavel} onChange={e => setTransferResponsavel(e.target.value)} placeholder="Encarregado / Motorista" /></div>
          </div>
          <DialogFooter><Button onClick={handleTransfer} className="w-full">Realizar Transferência</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL HISTÓRICO */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico e Rastreabilidade</DialogTitle></DialogHeader>
          <Tabs defaultValue="movimentacao" className="mt-4">
            <TabsList><TabsTrigger value="movimentacao">Alocações</TabsTrigger><TabsTrigger value="manutencao">Manutenções</TabsTrigger></TabsList>
            <TabsContent value="movimentacao" className="space-y-4">
               {historicoAlocacao.length === 0 ? <p className="text-sm py-8 text-center text-muted-foreground">Sem registro de manutenções.</p> : (
                 <Table>
                   <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Responsável</TableHead></TableRow></TableHeader>
                   <TableBody>
                     {historicoAlocacao.map(h => (
                       <TableRow key={h.id}>
                         <TableCell className="text-xs">{new Date(h.data).toLocaleString()}</TableCell>
                         <TableCell className="text-xs">{h.obra_origem}</TableCell>
                         <TableCell className="text-xs">{h.obra_destino}</TableCell>
                         <TableCell className="text-xs">{h.responsavel || "—"}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               )}
            </TabsContent>
            <TabsContent value="manutencao">
               <Table>
                 <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                 <TableBody>
                    {historicoEquip.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs font-mono">{new Date(m.data_solicitacao).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs">{m.descricao}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{m.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* MODAL MANUTENÇÃO (REUTILIZADO) */}
      <Dialog open={showManutForm} onOpenChange={setShowManutForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Tipo</Label>
              <Select value={formManut.tipo} onValueChange={v => setFormManut(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="preventiva">Preventiva</SelectItem><SelectItem value="corretiva">Corretiva</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Descrição da Falha *</Label><Textarea value={formManut.descricao} onChange={e => setFormManut(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><Label>Fornecedor / Oficina</Label><Input value={formManut.fornecedor || ""} onChange={e => setFormManut(p => ({ ...p, fornecedor: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={saveManut} className="w-full">Registrar Solicitação</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL COMPRA (REUTILIZADO) */}
      <Dialog open={showCompraForm} onOpenChange={setShowCompraForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Solicitação de Compra</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Equipamento Desejado *</Label><Input value={formCompra.descricao} onChange={e => setFormCompra(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantidade</Label><Input type="number" value={formCompra.quantidade} onChange={e => setFormCompra(p => ({ ...p, quantidade: Number(e.target.value) }))} /></div>
                <div><Label>Valor Est. Un.</Label><Input type="number" value={formCompra.valor_estimado} onChange={e => setFormCompra(p => ({ ...p, valor_estimado: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Empresa Destino</Label>
              <Select value={formCompra.empresa_id || ""} onValueChange={v => setFormCompra(p => ({ ...p, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
                <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={saveCompra} className="w-full">Criar Solicitação</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
