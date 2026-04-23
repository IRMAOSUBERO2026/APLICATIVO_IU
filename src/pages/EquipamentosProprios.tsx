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
  CheckCircle2, AlertTriangle, Clock, XCircle, Package
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
  empresa_id: string;
  status: string;
  observacoes: string | null;
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
  inativo: {
    label: "Inativo",
    badgeClass: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    barClass: "bg-rose-500",
    icon: <XCircle className="h-4 w-4 text-rose-500" />,
  },
};

const STATUS_MANUT: Record<string, { label: string; class: string }> = {
  solicitada:   { label: "Solicitada",   class: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  aprovada:     { label: "Aprovada",     class: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  em_andamento: { label: "Em Andamento", class: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  concluida:    { label: "Concluída",    class: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

const STATUS_COMPRA: Record<string, { label: string; class: string }> = {
  pendente:  { label: "Pendente",  class: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  aprovada:  { label: "Aprovada",  class: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  comprada:  { label: "Comprada",  class: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  cancelada: { label: "Cancelada", class: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
};

export default function EquipamentosProprios() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([]);
  const [obras, setObras] = useState<{ id: string; nome: string; codigo: string }[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; razao_social: string }[]>([]);
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("painel");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showManutForm, setShowManutForm] = useState(false);
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [selectedEquipId, setSelectedEquipId] = useState<string>("");

  const [formEquip, setFormEquip] = useState({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "" });
  const [formManut, setFormManut] = useState({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" });
  const [formCompra, setFormCompra] = useState({ descricao: "", tipo: "Outros", marca: "", modelo: "", quantidade: 1, valor_estimado: 0, obra_id: "", solicitante: "", empresa_id: "", observacoes: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [eqRes, obRes, emRes, mnRes, scRes] = await Promise.all([
      supabase.from("equipamentos_proprios").select("*").order("codigo"),
      supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
      supabase.from("empresas").select("id, razao_social").eq("ativo", true),
      supabase.from("manutencoes_equipamento").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("solicitacoes_compra_equipamento").select("*").order("created_at", { ascending: false }),
    ]);
    if (eqRes.data) setEquipamentos(eqRes.data as Equipamento[]);
    if (obRes.data) setObras(obRes.data);
    if (emRes.data) setEmpresas(emRes.data);
    if (mnRes.data) setManutencoes(mnRes.data as Manutencao[]);
    if (scRes.data) setSolicitacoes(scRes.data as SolicitacaoCompra[]);
  }

  const obraMap = useMemo(() => Object.fromEntries(obras.map(o => [o.id, `${o.codigo} – ${o.nome}`])), [obras]);

  const filteredEquip = useMemo(() => {
    let list = equipamentos;
    if (filtroStatus !== "todos") list = list.filter(e => e.status === filtroStatus);
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(e => e.descricao.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q) || (e.marca?.toLowerCase().includes(q)));
    }
    return list;
  }, [equipamentos, busca, filtroStatus]);

  const stats = useMemo(() => ({
    total: equipamentos.length,
    emUso: equipamentos.filter(e => e.status === "em_uso").length,
    disponiveis: equipamentos.filter(e => e.status === "disponivel").length,
    manutencao: equipamentos.filter(e => e.status === "manutencao").length,
  }), [equipamentos]);

  const equipPorObra = useMemo(() => {
    const map: Record<string, Equipamento[]> = {};
    equipamentos.filter(e => e.obra_id).forEach(e => {
      const key = e.obra_id!;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [equipamentos]);

  async function saveEquip() {
    if (!formEquip.descricao || !formEquip.codigo || !formEquip.empresa_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const payload = { ...formEquip, obra_id: formEquip.obra_id || null, valor_aquisicao: formEquip.valor_aquisicao || 0, data_aquisicao: formEquip.data_aquisicao || null };
    if (editingEquip) {
      await supabase.from("equipamentos_proprios").update(payload).eq("id", editingEquip.id);
      toast({ title: "Equipamento atualizado!" });
    } else {
      await supabase.from("equipamentos_proprios").insert(payload);
      toast({ title: "Equipamento cadastrado!" });
    }
    setShowEquipForm(false); setEditingEquip(null); resetEquipForm(); loadData();
  }

  async function deleteEquip(id: string) {
    await supabase.from("equipamentos_proprios").delete().eq("id", id);
    toast({ title: "Equipamento excluído" }); loadData();
  }

  async function saveManut() {
    if (!formManut.equipamento_id || !formManut.descricao) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const eq = equipamentos.find(e => e.id === formManut.equipamento_id);
    await supabase.from("manutencoes_equipamento").insert({ ...formManut, empresa_id: eq?.empresa_id || empresas[0]?.id, fornecedor: formManut.fornecedor || null });
    toast({ title: "Manutenção solicitada!" }); setShowManutForm(false); resetManutForm(); loadData();
  }

  async function updateManutStatus(id: string, status: string) {
    await supabase.from("manutencoes_equipamento").update({ status }).eq("id", id); loadData();
  }

  async function saveCompra() {
    if (!formCompra.descricao || !formCompra.empresa_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    await supabase.from("solicitacoes_compra_equipamento").insert({ ...formCompra, obra_id: formCompra.obra_id || null });
    toast({ title: "Solicitação de compra criada!" }); setShowCompraForm(false); resetCompraForm(); loadData();
  }

  function resetEquipForm() { setFormEquip({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "" }); }
  function resetManutForm() { setFormManut({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" }); }
  function resetCompraForm() { setFormCompra({ descricao: "", tipo: "Outros", marca: "", modelo: "", quantidade: 1, valor_estimado: 0, obra_id: "", solicitante: "", empresa_id: "", observacoes: "" }); }

  function openEdit(eq: Equipamento) {
    setEditingEquip(eq);
    setFormEquip({ codigo: eq.codigo, descricao: eq.descricao, tipo: eq.tipo, marca: eq.marca || "", modelo: eq.modelo || "", numero_serie: eq.numero_serie || "", data_aquisicao: eq.data_aquisicao || "", valor_aquisicao: eq.valor_aquisicao, obra_id: eq.obra_id || "", empresa_id: eq.empresa_id, status: eq.status, observacoes: eq.observacoes || "" });
    setShowEquipForm(true);
  }

  function openHistorico(eqId: string) { setSelectedEquipId(eqId); setShowHistorico(true); }
  const historicoEquip = useMemo(() => manutencoes.filter(m => m.equipamento_id === selectedEquipId), [manutencoes, selectedEquipId]);

  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Equipamentos Próprios</h1>
              <p className="text-sm text-muted-foreground">Patrimônio · Localização · Manutenção · Compras</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => { resetEquipForm(); setEditingEquip(null); setShowEquipForm(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo Equipamento
            </Button>
            <Button size="sm" variant="outline" onClick={() => { resetManutForm(); setShowManutForm(true); }}>
              <Settings className="h-4 w-4 mr-1.5" /> Solicitar Manutenção
            </Button>
            <Button size="sm" variant="outline" onClick={() => { resetCompraForm(); setShowCompraForm(true); }}>
              <ShoppingCart className="h-4 w-4 mr-1.5" /> Solicitar Compra
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",        value: stats.total,       gradient: "from-slate-500/20 to-slate-600/10",  icon: <Package className="h-5 w-5 text-slate-500" />,  textColor: "text-slate-600 dark:text-slate-300" },
            { label: "Em Uso",       value: stats.emUso,       gradient: "from-blue-500/20 to-blue-600/10",    icon: <Clock className="h-5 w-5 text-blue-500" />,     textColor: "text-blue-600 dark:text-blue-400" },
            { label: "Disponíveis",  value: stats.disponiveis, gradient: "from-emerald-500/20 to-emerald-600/10", icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, textColor: "text-emerald-600 dark:text-emerald-400" },
            { label: "Manutenção",   value: stats.manutencao,  gradient: "from-amber-500/20 to-amber-600/10",  icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, textColor: "text-amber-600 dark:text-amber-400" },
          ].map(k => (
            <Card key={k.label} className="overflow-hidden border border-border/60">
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

        {/* ── Tabs ── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10">
            <TabsTrigger value="painel" className="gap-1.5"><MapPin className="h-4 w-4" />Painel</TabsTrigger>
            <TabsTrigger value="cadastro" className="gap-1.5"><Wrench className="h-4 w-4" />Cadastro</TabsTrigger>
            <TabsTrigger value="manutencao" className="gap-1.5"><Settings className="h-4 w-4" />Manutenções</TabsTrigger>
            <TabsTrigger value="compras" className="gap-1.5"><ShoppingCart className="h-4 w-4" />Compras</TabsTrigger>
          </TabsList>

          {/* ══ PAINEL ══ */}
          <TabsContent value="painel" className="space-y-4 mt-4">
            {Object.keys(equipPorObra).length === 0 && equipamentos.filter(e => !e.obra_id).length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Wrench className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum equipamento cadastrado ainda.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {Object.entries(equipPorObra).map(([obraId, eqs]) => (
                  <Card key={obraId} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-primary/5 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-semibold text-primary">
                          {obraMap[obraId] || "Obra não identificada"}
                        </CardTitle>
                        <Badge variant="outline" className="ml-auto text-xs">{eqs.length} equip.</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {eqs.map(eq => {
                          const st = STATUS_EQUIP[eq.status];
                          return (
                            <div key={eq.id} className="rounded-xl border border-border/60 p-3 flex gap-3 items-start hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
                                {TIPO_ICON[eq.tipo] ?? <Wrench className="h-5 w-5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{eq.descricao}</p>
                                <p className="text-xs text-muted-foreground font-mono">{eq.codigo}</p>
                                {eq.marca && <p className="text-xs text-muted-foreground">{eq.marca}{eq.modelo ? ` · ${eq.modelo}` : ""}</p>}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {st?.icon}
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${st?.badgeClass}`}>{st?.label}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {equipamentos.filter(e => !e.obra_id).length > 0 && (
                  <Card className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium text-muted-foreground">Estoque / Sem Obra Alocada</CardTitle>
                        <Badge variant="outline" className="ml-auto text-xs">{equipamentos.filter(e => !e.obra_id).length} equip.</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {equipamentos.filter(e => !e.obra_id).map(eq => {
                          const st = STATUS_EQUIP[eq.status];
                          return (
                            <div key={eq.id} className="rounded-xl border border-border/60 p-3 flex gap-3 items-start hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
                                {TIPO_ICON[eq.tipo] ?? <Wrench className="h-5 w-5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{eq.descricao}</p>
                                <p className="text-xs text-muted-foreground font-mono">{eq.codigo}</p>
                                {eq.marca && <p className="text-xs text-muted-foreground">{eq.marca}{eq.modelo ? ` · ${eq.modelo}` : ""}</p>}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {st?.icon}
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${st?.badgeClass}`}>{st?.label}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ══ CADASTRO ══ */}
          <TabsContent value="cadastro" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar equipamento..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {Object.entries(STATUS_EQUIP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {filteredEquip.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum equipamento encontrado.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEquip.map(eq => {
                  const st = STATUS_EQUIP[eq.status];
                  return (
                    <Card key={eq.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      {/* barra de status */}
                      <div className={`h-1.5 w-full ${st?.barClass}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-muted/70 text-muted-foreground flex-shrink-0">
                            {TIPO_ICON[eq.tipo] ?? <Wrench className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-bold text-sm leading-tight truncate">{eq.descricao}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${st?.badgeClass}`}>{st?.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{eq.codigo} · {eq.tipo}</p>
                            {(eq.marca || eq.modelo) && (
                              <p className="text-xs text-muted-foreground mt-0.5">{[eq.marca, eq.modelo].filter(Boolean).join(" / ")}</p>
                            )}
                            {eq.obra_id && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                                <p className="text-xs text-primary font-medium truncate">{obraMap[eq.obra_id] || "—"}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/50">
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1" onClick={() => openHistorico(eq.id)}>
                            <History className="h-3.5 w-3.5" /> Histórico
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEdit(eq)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-500 hover:text-rose-600" onClick={() => deleteEquip(eq.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ══ MANUTENÇÕES ══ */}
          <TabsContent value="manutencao" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollableTable>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Orçamento</TableHead>
                      <TableHead className="text-right">Aprovado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Alterar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manutencoes.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Nenhuma manutenção registrada</TableCell></TableRow>
                    ) : manutencoes.map(m => {
                      const eq = equipamentos.find(e => e.id === m.equipamento_id);
                      return (
                        <TableRow key={m.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm font-medium">{eq ? `${eq.codigo} – ${eq.descricao}` : "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize text-xs">{m.tipo}</Badge></TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{m.descricao}</TableCell>
                          <TableCell className="text-sm">{m.fornecedor || "—"}</TableCell>
                          <TableCell className="text-right text-sm">R$ {m.valor_orcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-sm font-medium">R$ {m.valor_aprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell><Badge variant="outline" className={STATUS_MANUT[m.status]?.class}>{STATUS_MANUT[m.status]?.label}</Badge></TableCell>
                          <TableCell>
                            <Select value={m.status} onValueChange={v => updateManutStatus(m.id, v)}>
                              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_MANUT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </ScrollableTable>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ COMPRAS ══ */}
          <TabsContent value="compras" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                <ScrollableTable>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead className="text-right">Valor Est.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoes.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Nenhuma solicitação</TableCell></TableRow>
                    ) : solicitacoes.map(s => (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{s.descricao}</TableCell>
                        <TableCell className="text-sm">{s.tipo}</TableCell>
                        <TableCell className="text-sm">{s.quantidade}</TableCell>
                        <TableCell className="text-sm">{s.obra_id ? obraMap[s.obra_id] || "—" : "—"}</TableCell>
                        <TableCell className="text-sm">{s.solicitante || "—"}</TableCell>
                        <TableCell className="text-right text-sm font-medium">R$ {s.valor_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_COMPRA[s.status]?.class}>{STATUS_COMPRA[s.status]?.label}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </ScrollableTable>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog Cadastro Equipamento ── */}
      <Dialog open={showEquipForm} onOpenChange={setShowEquipForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEquip ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Código *</Label><Input value={formEquip.codigo} onChange={e => setFormEquip(p => ({ ...p, codigo: e.target.value }))} /></div>
            <div><Label>Descrição *</Label><Input value={formEquip.descricao} onChange={e => setFormEquip(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={formEquip.tipo} onValueChange={v => setFormEquip(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Marca</Label><Input value={formEquip.marca} onChange={e => setFormEquip(p => ({ ...p, marca: e.target.value }))} /></div>
            <div><Label>Modelo</Label><Input value={formEquip.modelo} onChange={e => setFormEquip(p => ({ ...p, modelo: e.target.value }))} /></div>
            <div><Label>Nº Série</Label><Input value={formEquip.numero_serie} onChange={e => setFormEquip(p => ({ ...p, numero_serie: e.target.value }))} /></div>
            <div><Label>Data Aquisição</Label><Input type="date" value={formEquip.data_aquisicao} onChange={e => setFormEquip(p => ({ ...p, data_aquisicao: e.target.value }))} /></div>
            <div><Label>Valor Aquisição</Label><Input type="number" value={formEquip.valor_aquisicao} onChange={e => setFormEquip(p => ({ ...p, valor_aquisicao: Number(e.target.value) }))} /></div>
            <div><Label>Empresa *</Label>
              <Select value={formEquip.empresa_id} onValueChange={v => setFormEquip(p => ({ ...p, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Obra (Localização)</Label>
              <Select value={formEquip.obra_id} onValueChange={v => setFormEquip(p => ({ ...p, obra_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sem obra" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem obra</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} – {o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={formEquip.status} onValueChange={v => setFormEquip(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_EQUIP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={formEquip.observacoes} onChange={e => setFormEquip(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={saveEquip}>{editingEquip ? "Salvar Alterações" : "Cadastrar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Manutenção ── */}
      <Dialog open={showManutForm} onOpenChange={setShowManutForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Equipamento *</Label>
              <Select value={formManut.equipamento_id} onValueChange={v => setFormManut(p => ({ ...p, equipamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{equipamentos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} – {e.descricao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={formManut.tipo} onValueChange={v => setFormManut(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="preventiva">Preventiva</SelectItem><SelectItem value="corretiva">Corretiva</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Descrição *</Label><Textarea value={formManut.descricao} onChange={e => setFormManut(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><Label>Fornecedor</Label><Input value={formManut.fornecedor} onChange={e => setFormManut(p => ({ ...p, fornecedor: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor Orçamento</Label><Input type="number" value={formManut.valor_orcamento} onChange={e => setFormManut(p => ({ ...p, valor_orcamento: Number(e.target.value) }))} /></div>
              <div><Label>Valor Aprovado</Label><Input type="number" value={formManut.valor_aprovado} onChange={e => setFormManut(p => ({ ...p, valor_aprovado: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={formManut.observacoes} onChange={e => setFormManut(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={saveManut}>Solicitar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Solicitação Compra ── */}
      <Dialog open={showCompraForm} onOpenChange={setShowCompraForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Compra de Equipamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descrição *</Label><Input value={formCompra.descricao} onChange={e => setFormCompra(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={formCompra.tipo} onValueChange={v => setFormCompra(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantidade</Label><Input type="number" value={formCompra.quantidade} onChange={e => setFormCompra(p => ({ ...p, quantidade: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Marca</Label><Input value={formCompra.marca} onChange={e => setFormCompra(p => ({ ...p, marca: e.target.value }))} /></div>
              <div><Label>Modelo</Label><Input value={formCompra.modelo} onChange={e => setFormCompra(p => ({ ...p, modelo: e.target.value }))} /></div>
            </div>
            <div><Label>Valor Estimado</Label><Input type="number" value={formCompra.valor_estimado} onChange={e => setFormCompra(p => ({ ...p, valor_estimado: Number(e.target.value) }))} /></div>
            <div><Label>Obra</Label>
              <Select value={formCompra.obra_id} onValueChange={v => setFormCompra(p => ({ ...p, obra_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} – {o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Solicitante</Label><Input value={formCompra.solicitante} onChange={e => setFormCompra(p => ({ ...p, solicitante: e.target.value }))} /></div>
            <div><Label>Empresa *</Label>
              <Select value={formCompra.empresa_id} onValueChange={v => setFormCompra(p => ({ ...p, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={formCompra.observacoes} onChange={e => setFormCompra(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={saveCompra}>Criar Solicitação</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Histórico ── */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Manutenções</DialogTitle></DialogHeader>
          {historicoEquip.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhuma manutenção registrada para este equipamento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead><TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Aprovado</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoEquip.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.data_solicitacao).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-sm capitalize">{m.tipo}</TableCell>
                    <TableCell className="text-sm">{m.descricao}</TableCell>
                    <TableCell className="text-sm">{m.fornecedor || "—"}</TableCell>
                    <TableCell className="text-right text-sm">R$ {m.valor_orcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-sm">R$ {m.valor_aprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_MANUT[m.status]?.class}>{STATUS_MANUT[m.status]?.label}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
