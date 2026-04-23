import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";
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
  Truck, Plus, MapPin, FileText, Search, Trash2, Edit,
  CheckCircle2, Clock, XCircle, DollarSign, Users, Activity, Package2
} from "lucide-react";

interface EquipLocado {
  id: string;
  descricao: string;
  tipo: string;
  fornecedor_id: string | null;
  obra_id: string | null;
  data_inicio: string;
  data_fim: string | null;
  tipo_contrato: string;
  numero_oc: string | null;
  valor_mensal: number;
  valor_diario: number;
  quantidade: number;
  status: string;
  observacoes: string | null;
  empresa_id: string;
}

const TIPOS_EQUIP = ["Retroescavadeira", "Escavadeira", "Caminhão", "Guindaste", "Plataforma", "Andaime", "Container", "Gerador", "Compressor", "Betoneira", "Outros"];
const TIPOS_CONTRATO = ["mensal", "diario", "por_medição", "empreitada"];

const STATUS_LOC: Record<string, { label: string; badgeClass: string; barClass: string; icon: React.ReactNode }> = {
  ativo:     { label: "Ativo",     badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", barClass: "bg-emerald-500", icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
  encerrado: { label: "Encerrado", badgeClass: "bg-slate-500/15 text-slate-500 border-slate-500/30",       barClass: "bg-slate-400",   icon: <XCircle className="h-3.5 w-3.5 text-slate-400" /> },
  pendente:  { label: "Pendente",  badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",       barClass: "bg-amber-500",   icon: <Clock className="h-3.5 w-3.5 text-amber-500" /> },
};

export default function EquipamentosLocados() {
  const [equipamentos, setEquipamentos] = useState<EquipLocado[]>([]);
  const [obras, setObras] = useState<{ id: string; nome: string; codigo: string }[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; razao_social: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; razao_social: string; nome_fantasia: string | null }[]>([]);
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("painel");
  const [mesFechamento, setMesFechamento] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EquipLocado | null>(null);
  const [form, setForm] = useState({
    descricao: "", tipo: "Outros", fornecedor_id: "", obra_id: "", data_inicio: "", data_fim: "",
    tipo_contrato: "mensal", numero_oc: "", valor_mensal: 0, valor_diario: 0, quantidade: 1,
    status: "ativo", observacoes: "", empresa_id: "",
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [eqRes, obRes, emRes, fnRes] = await Promise.all([
      supabase.from("equipamentos_locados").select("*").order("created_at", { ascending: false }),
      supabase.from("obras").select("id, nome, codigo").in("status", OBRA_STATUS_ATIVOS_ARR),
      supabase.from("empresas").select("id, razao_social").eq("ativo", true),
      supabase.from("fornecedores").select("id, razao_social, nome_fantasia").eq("ativo", true),
    ]);
    if (eqRes.data) setEquipamentos(eqRes.data as EquipLocado[]);
    if (obRes.data) setObras(obRes.data);
    if (emRes.data) setEmpresas(emRes.data);
    if (fnRes.data) setFornecedores(fnRes.data);
  }

  const obraMap = useMemo(() => Object.fromEntries(obras.map(o => [o.id, `${o.codigo} – ${o.nome}`])), [obras]);
  const fornecedorMap = useMemo(() => Object.fromEntries(fornecedores.map(f => [f.id, f.nome_fantasia || f.razao_social])), [fornecedores]);

  const filteredEquip = useMemo(() => {
    if (!busca) return equipamentos;
    const q = busca.toLowerCase();
    return equipamentos.filter(e => e.descricao.toLowerCase().includes(q) || e.numero_oc?.toLowerCase().includes(q));
  }, [equipamentos, busca]);

  const stats = useMemo(() => ({
    total: equipamentos.length,
    ativos: equipamentos.filter(e => e.status === "ativo").length,
    custoMensal: equipamentos.filter(e => e.status === "ativo").reduce((s, e) => s + (e.valor_mensal * e.quantidade), 0),
    fornecedoresAtivos: new Set(equipamentos.filter(e => e.status === "ativo" && e.fornecedor_id).map(e => e.fornecedor_id)).size,
  }), [equipamentos]);

  const equipPorObra = useMemo(() => {
    const map: Record<string, EquipLocado[]> = {};
    equipamentos.filter(e => e.obra_id && e.status === "ativo").forEach(e => {
      const key = e.obra_id!;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [equipamentos]);

  const fechamentoMensal = useMemo(() => {
    const [ano, mes] = mesFechamento.split("-").map(Number);
    const ativos = equipamentos.filter(e => {
      const inicio = new Date(e.data_inicio);
      const fim = e.data_fim ? new Date(e.data_fim) : null;
      const mesInicio = new Date(ano, mes - 1, 1);
      const mesFim = new Date(ano, mes, 0);
      return inicio <= mesFim && (!fim || fim >= mesInicio);
    });
    const map: Record<string, { fornecedor: string; items: EquipLocado[]; total: number }> = {};
    ativos.forEach(e => {
      const fId = e.fornecedor_id || "sem_fornecedor";
      if (!map[fId]) map[fId] = { fornecedor: e.fornecedor_id ? fornecedorMap[e.fornecedor_id] || "Desconhecido" : "Sem Fornecedor", items: [], total: 0 };
      map[fId].items.push(e);
      map[fId].total += e.valor_mensal * e.quantidade;
    });
    return Object.values(map);
  }, [equipamentos, mesFechamento, fornecedorMap]);

  function resetForm() {
    setForm({ descricao: "", tipo: "Outros", fornecedor_id: "", obra_id: "", data_inicio: "", data_fim: "", tipo_contrato: "mensal", numero_oc: "", valor_mensal: 0, valor_diario: 0, quantidade: 1, status: "ativo", observacoes: "", empresa_id: "" });
  }

  function openEdit(eq: EquipLocado) {
    setEditing(eq);
    setForm({
      descricao: eq.descricao, tipo: eq.tipo, fornecedor_id: eq.fornecedor_id || "", obra_id: eq.obra_id || "",
      data_inicio: eq.data_inicio, data_fim: eq.data_fim || "", tipo_contrato: eq.tipo_contrato,
      numero_oc: eq.numero_oc || "", valor_mensal: eq.valor_mensal, valor_diario: eq.valor_diario,
      quantidade: eq.quantidade, status: eq.status, observacoes: eq.observacoes || "", empresa_id: eq.empresa_id,
    });
    setShowForm(true);
  }

  async function saveEquip() {
    if (!form.descricao || !form.empresa_id || !form.data_inicio) {
      toast({ title: "Preencha campos obrigatórios", variant: "destructive" }); return;
    }
    const payload = { ...form, fornecedor_id: form.fornecedor_id || null, obra_id: form.obra_id || null, data_fim: form.data_fim || null, numero_oc: form.numero_oc || null };
    if (editing) {
      await supabase.from("equipamentos_locados").update(payload).eq("id", editing.id);
      toast({ title: "Locação atualizada!" });
    } else {
      await supabase.from("equipamentos_locados").insert(payload);
      toast({ title: "Locação cadastrada!" });
    }
    setShowForm(false); setEditing(null); resetForm(); loadData();
  }

  async function deleteEquip(id: string) {
    await supabase.from("equipamentos_locados").delete().eq("id", id);
    toast({ title: "Locação excluída" }); loadData();
  }

  /* ════════════════════════════════════════ */
  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Equipamentos Locados</h1>
              <p className="text-sm text-muted-foreground">Controle de locações · Fornecedores · Fechamento mensal</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova Locação
          </Button>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Locações",  value: stats.total,              fmt: false, gradient: "from-slate-500/20 to-slate-600/10",   icon: <Package2 className="h-5 w-5 text-slate-500" />,   textColor: "text-slate-600 dark:text-slate-300" },
            { label: "Ativas",          value: stats.ativos,             fmt: false, gradient: "from-emerald-500/20 to-emerald-600/10",icon: <Activity className="h-5 w-5 text-emerald-500" />, textColor: "text-emerald-600 dark:text-emerald-400" },
            { label: "Custo Mensal",    value: stats.custoMensal,        fmt: true,  gradient: "from-blue-500/20 to-blue-600/10",      icon: <DollarSign className="h-5 w-5 text-blue-500" />,  textColor: "text-blue-600 dark:text-blue-400" },
            { label: "Fornecedores",    value: stats.fornecedoresAtivos, fmt: false, gradient: "from-violet-500/20 to-violet-600/10",  icon: <Users className="h-5 w-5 text-violet-500" />,     textColor: "text-violet-600 dark:text-violet-400" },
          ].map(k => (
            <Card key={k.label} className="overflow-hidden border border-border/60">
              <CardContent className={`p-4 bg-gradient-to-br ${k.gradient}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</p>
                  {k.icon}
                </div>
                <p className={`text-2xl font-bold ${k.textColor} leading-tight`}>
                  {k.fmt ? `R$ ${(k.value as number).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : k.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10">
            <TabsTrigger value="painel" className="gap-1.5"><MapPin className="h-4 w-4" />Painel</TabsTrigger>
            <TabsTrigger value="locacoes" className="gap-1.5"><Truck className="h-4 w-4" />Locações</TabsTrigger>
            <TabsTrigger value="fechamento" className="gap-1.5"><FileText className="h-4 w-4" />Fechamento Mensal</TabsTrigger>
          </TabsList>

          {/* ══ PAINEL POR OBRA ══ */}
          <TabsContent value="painel" className="space-y-4 mt-4">
            {Object.keys(equipPorObra).length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Truck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum equipamento locado ativo em obras.</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(equipPorObra).map(([obraId, eqs]) => {
                const custoObra = eqs.reduce((s, e) => s + e.valor_mensal * e.quantidade, 0);
                return (
                  <Card key={obraId} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-primary/5 border-b border-border/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <CardTitle className="text-sm font-semibold text-primary flex-1">
                          {obraMap[obraId] || "Obra não identificada"}
                        </CardTitle>
                        <div className="flex items-center gap-2 ml-auto">
                          <Badge variant="outline" className="text-xs">{eqs.length} equip.</Badge>
                          <span className="text-sm font-bold text-emerald-600">
                            R$ {custoObra.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {eqs.map(eq => {
                          const st = STATUS_LOC[eq.status];
                          return (
                            <div key={eq.id} className="rounded-xl border border-border/60 p-3 hover:bg-muted/30 transition-colors">
                              <div className={`h-1 w-full rounded-full ${st?.barClass} mb-3`} />
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm leading-tight truncate">{eq.descricao}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{eq.tipo} · Qtd: {eq.quantidade}</p>
                                  {eq.fornecedor_id && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                      {fornecedorMap[eq.fornecedor_id] || "—"}
                                    </p>
                                  )}
                                  {eq.numero_oc && (
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">OC: {eq.numero_oc}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-primary">
                                    R$ {(eq.valor_mensal * eq.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">/mês</p>
                                  <div className="flex items-center gap-1 mt-1 justify-end">
                                    {st?.icon}
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st?.badgeClass}`}>{st?.label}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ══ LOCAÇÕES (lista completa) ══ */}
          <TabsContent value="locacoes" className="space-y-4 mt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por descrição ou OC..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            {filteredEquip.length === 0 ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhuma locação encontrada.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEquip.map(eq => {
                  const st = STATUS_LOC[eq.status];
                  const custoTotal = eq.valor_mensal * eq.quantidade;
                  return (
                    <Card key={eq.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`h-1.5 w-full ${st?.barClass}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm">{eq.descricao}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st?.badgeClass} flex items-center gap-0.5`}>
                                {st?.icon} {st?.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{eq.tipo} · Qtd: {eq.quantidade} · {eq.tipo_contrato.replace("_", " ")}</p>
                            {eq.fornecedor_id && <p className="text-xs text-muted-foreground mt-0.5 truncate">🏭 {fornecedorMap[eq.fornecedor_id]}</p>}
                            {eq.obra_id && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-primary" />
                                <p className="text-xs text-primary font-medium truncate">{obraMap[eq.obra_id]}</p>
                              </div>
                            )}
                            {eq.numero_oc && <p className="text-xs font-mono text-muted-foreground mt-0.5">OC: {eq.numero_oc}</p>}
                            <p className="text-xs text-muted-foreground mt-1">Início: {new Date(eq.data_inicio).toLocaleDateString("pt-BR")}{eq.data_fim ? ` · Fim: ${new Date(eq.data_fim).toLocaleDateString("pt-BR")}` : ""}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-primary">R$ {custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-muted-foreground">/mês</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/50">
                          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs gap-1.5" onClick={() => openEdit(eq)}>
                            <Edit className="h-3.5 w-3.5" /> Editar
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

          {/* ══ FECHAMENTO MENSAL ══ */}
          <TabsContent value="fechamento" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Label className="font-medium text-sm whitespace-nowrap">Mês / Ano:</Label>
              <Input type="month" value={mesFechamento} onChange={e => setMesFechamento(e.target.value)} className="max-w-[200px]" />
            </div>

            {fechamentoMensal.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma locação ativa no período selecionado.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {fechamentoMensal.map((grupo, idx) => (
                  <Card key={idx} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{grupo.fornecedor}</CardTitle>
                        <span className="text-base font-bold text-primary">R$ {grupo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead>Equipamento</TableHead><TableHead>Obra</TableHead>
                            <TableHead>OC</TableHead><TableHead>Qtd</TableHead>
                            <TableHead className="text-right">Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.items.map(e => (
                            <TableRow key={e.id} className="hover:bg-muted/20">
                              <TableCell className="text-sm font-medium">{e.descricao}</TableCell>
                              <TableCell className="text-sm">{e.obra_id ? obraMap[e.obra_id] || "—" : "—"}</TableCell>
                              <TableCell className="text-sm font-mono">{e.numero_oc || "—"}</TableCell>
                              <TableCell className="text-sm">{e.quantidade}</TableCell>
                              <TableCell className="text-right text-sm">R$ {e.valor_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-sm font-bold text-primary">R$ {(e.valor_mensal * e.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}

                {/* Total Geral */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Geral do Mês</p>
                      <p className="text-sm text-muted-foreground">{fechamentoMensal.reduce((s, g) => s + g.items.length, 0)} locações de {fechamentoMensal.length} fornecedor(es)</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      R$ {fechamentoMensal.reduce((s, g) => s + g.total, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog Form ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Locação" : "Nova Locação de Equipamento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_EQUIP.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Fornecedor</Label>
              <Select value={form.fornecedor_id} onValueChange={v => setForm(p => ({ ...p, fornecedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Obra Solicitada</Label>
              <Select value={form.obra_id} onValueChange={v => setForm(p => ({ ...p, obra_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} – {o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nº OC</Label><Input value={form.numero_oc} onChange={e => setForm(p => ({ ...p, numero_oc: e.target.value }))} /></div>
            <div><Label>Data Início *</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
            <div><Label>Data Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
            <div><Label>Tipo de Contrato</Label>
              <Select value={form.tipo_contrato} onValueChange={v => setForm(p => ({ ...p, tipo_contrato: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="por_medição">Por Medição</SelectItem>
                  <SelectItem value="empreitada">Empreitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: Number(e.target.value) }))} /></div>
            <div><Label>Valor Mensal (R$)</Label><Input type="number" value={form.valor_mensal} onChange={e => setForm(p => ({ ...p, valor_mensal: Number(e.target.value) }))} /></div>
            <div><Label>Valor Diário (R$)</Label><Input type="number" value={form.valor_diario} onChange={e => setForm(p => ({ ...p, valor_diario: Number(e.target.value) }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LOC).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Empresa *</Label>
              <Select value={form.empresa_id} onValueChange={v => setForm(p => ({ ...p, empresa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={saveEquip}>{editing ? "Salvar Alterações" : "Cadastrar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
