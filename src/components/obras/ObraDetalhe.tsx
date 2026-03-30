import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentManagerGeneric } from "@/components/shared/DocumentManagerGeneric";
import {
  ArrowLeft, Edit, HardHat, MapPin, Calendar, Building2, FolderOpen,
  Plus, Trash2, FileText, TrendingUp, Percent, RefreshCw, Users, ClipboardList,
  DollarSign, Clock, Save
} from "lucide-react";

interface Obra {
  id: string; codigo: string; nome: string; empresa_id: string; construtora?: string;
  endereco?: string; cidade?: string; uf?: string; status: string;
  data_inicio?: string; data_previsao_fim?: string; data_fim?: string; observacoes?: string;
}
interface Empresa { id: string; razao_social: string; nome_fantasia?: string; cnpj: string; }
interface ContratoItem {
  id: string; obra_id: string; empresa_id: string; item_numero: string; descricao: string;
  unidade: string; quantidade: number; valor_unitario: number; valor_total: number;
  is_aditivo: boolean; aditivo_numero?: number; aditivo_data?: string; observacoes?: string;
}
interface Reajuste {
  id: string; obra_id: string; data_aplicacao: string; percentual: number;
  tipo: string; motivo?: string; observacoes?: string;
}

interface Props {
  obra: Obra;
  empresas: Empresa[];
  onBack: () => void;
  onEdit: () => void;
  subpastasDoc: string[];
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ObraDetalhe({ obra, empresas, onBack, onEdit, subpastasDoc }: Props) {
  const { toast } = useToast();
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [reajustes, setReajustes] = useState<Reajuste[]>([]);
  const [funcionariosCount, setFuncionariosCount] = useState(0);
  const [diariosCount, setDiariosCount] = useState(0);
  const [medicoesCount, setMedicoesCount] = useState(0);
  const [docOpen, setDocOpen] = useState(false);

  // Escala (horário padrão)
  const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;
  const DIAS_LABELS: Record<string, string> = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo" };
  const defaultHorario = () => Object.fromEntries(DIAS_SEMANA.map(d => [d, { e1: "", s1: "", e2: "", s2: "" }]));
  const [escala, setEscala] = useState<Record<string, { e1: string; s1: string; e2: string; s2: string }>>(
    (obra as any).horario_padrao ? (typeof (obra as any).horario_padrao === "string" ? JSON.parse((obra as any).horario_padrao) : (obra as any).horario_padrao) : defaultHorario()
  );
  const [escalaSaving, setEscalaSaving] = useState(false);

  const calcHorasDia = (h: { e1: string; s1: string; e2: string; s2: string }) => {
    const toMin = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + (mm || 0); };
    if (!h.e1 || !s1Valid(h)) return 0;
    let total = 0;
    if (h.e1 && h.s1) total += toMin(h.s1) - toMin(h.e1);
    if (h.e2 && h.s2) total += toMin(h.s2) - toMin(h.e2);
    return total / 60;
  };
  const s1Valid = (h: { e1: string; s1: string }) => h.e1 && h.s1;

  const handleEscalaChange = (dia: string, field: string, value: string) => {
    setEscala(prev => ({ ...prev, [dia]: { ...prev[dia], [field]: value } }));
  };

  const handleSalvarEscala = async () => {
    setEscalaSaving(true);
    const { error } = await supabase.from("obras").update({ horario_padrao: escala }).eq("id", obra.id);
    if (error) toast({ title: "Erro ao salvar escala", variant: "destructive" });
    else toast({ title: "Escala salva com sucesso!" });
    setEscalaSaving(false);
  };

  const totalHorasSemana = DIAS_SEMANA.reduce((s, d) => s + calcHorasDia(escala[d] || { e1: "", s1: "", e2: "", s2: "" }), 0);

  // Item dialog
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContratoItem | null>(null);
  const [itemForm, setItemForm] = useState({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: false, aditivo_numero: 0, observacoes: "" });

  // Reajuste dialog
  const [showReajusteDialog, setShowReajusteDialog] = useState(false);
  const [reajusteForm, setReajusteForm] = useState({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" });

  useEffect(() => { loadAll(); }, [obra.id]);

  const loadAll = async () => {
    const [itensRes, reajRes, funcRes, diarRes, medRes] = await Promise.all([
      supabase.from("medicao_contrato_itens").select("*").eq("obra_id", obra.id).order("item_numero"),
      supabase.from("medicao_reajustes").select("*").eq("obra_id", obra.id).order("data_aplicacao"),
      supabase.from("funcionarios").select("id", { count: "exact", head: true }).eq("obra_id", obra.id).eq("status", "ativo"),
      supabase.from("diarios_obra").select("id", { count: "exact", head: true }).eq("obra_id", obra.id),
      supabase.from("medicoes").select("id", { count: "exact", head: true }).eq("obra_id", obra.id),
    ]);
    if (itensRes.data) setContratoItens(itensRes.data as ContratoItem[]);
    if (reajRes.data) setReajustes(reajRes.data as Reajuste[]);
    setFuncionariosCount(funcRes.count || 0);
    setDiariosCount(diarRes.count || 0);
    setMedicoesCount(medRes.count || 0);
  };

  const fatorReajuste = useMemo(() => {
    let f = 1;
    for (const r of reajustes) f *= (1 + r.percentual / 100);
    return f;
  }, [reajustes]);

  const itensContrato = contratoItens.filter(i => !i.is_aditivo);
  const itensAditivo = contratoItens.filter(i => i.is_aditivo);

  const totalContrato = useMemo(() => itensContrato.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0), [itensContrato]);
  const totalAditivos = useMemo(() => itensAditivo.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0), [itensAditivo]);
  const totalGeralReajustado = (totalContrato + totalAditivos) * fatorReajuste;

  const empresa = empresas.find(e => e.id === obra.empresa_id);

  // CRUD Item
  const openNewItem = (isAditivo: boolean) => {
    setEditingItem(null);
    setItemForm({ item_numero: "", descricao: "", unidade: "un", quantidade: 0, valor_unitario: 0, is_aditivo: isAditivo, aditivo_numero: isAditivo ? (itensAditivo.length > 0 ? Math.max(...itensAditivo.map(i => i.aditivo_numero || 0)) : 1) : 0, observacoes: "" });
    setShowItemDialog(true);
  };

  const openEditItem = (item: ContratoItem) => {
    setEditingItem(item);
    setItemForm({ item_numero: item.item_numero, descricao: item.descricao, unidade: item.unidade, quantidade: item.quantidade, valor_unitario: item.valor_unitario, is_aditivo: item.is_aditivo, aditivo_numero: item.aditivo_numero || 0, observacoes: item.observacoes || "" });
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.item_numero || !itemForm.descricao) { toast({ title: "Preencha item e descrição", variant: "destructive" }); return; }
    const payload = { ...itemForm, obra_id: obra.id, empresa_id: obra.empresa_id, valor_total: itemForm.quantidade * itemForm.valor_unitario };
    if (editingItem) {
      await supabase.from("medicao_contrato_itens").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("medicao_contrato_itens").insert(payload);
    }
    toast({ title: editingItem ? "Item atualizado" : "Item adicionado" });
    setShowItemDialog(false);
    loadAll();
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("medicao_contrato_itens").delete().eq("id", id);
    toast({ title: "Item removido" });
    loadAll();
  };

  // CRUD Reajuste
  const handleSaveReajuste = async () => {
    if (!reajusteForm.data_aplicacao || !reajusteForm.percentual) { toast({ title: "Preencha data e percentual", variant: "destructive" }); return; }
    await supabase.from("medicao_reajustes").insert({ ...reajusteForm, obra_id: obra.id, empresa_id: obra.empresa_id });
    toast({ title: "Reajuste aplicado" });
    setShowReajusteDialog(false);
    setReajusteForm({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" });
    loadAll();
  };

  const handleDeleteReajuste = async (id: string) => {
    await supabase.from("medicao_reajustes").delete().eq("id", id);
    toast({ title: "Reajuste removido" });
    loadAll();
  };

  const renderItemTable = (items: ContratoItem[], title: string, isAditivo: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title} ({items.length} itens)</h3>
        <Button size="sm" variant="outline" onClick={() => openNewItem(isAditivo)}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">Nenhum item cadastrado</div>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Item</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-16">Un.</TableHead>
                <TableHead className="w-20 text-right">Qtd.</TableHead>
                <TableHead className="w-28 text-right">V. Unit.</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
                {fatorReajuste !== 1 && <TableHead className="w-28 text-right">Reajustado</TableHead>}
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.item_numero}</TableCell>
                  <TableCell className="text-sm">{item.descricao}</TableCell>
                  <TableCell className="text-xs">{item.unidade}</TableCell>
                  <TableCell className="text-right text-sm">{item.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-sm">{fmtBRL(item.valor_unitario)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmtBRL(item.quantidade * item.valor_unitario)}</TableCell>
                  {fatorReajuste !== 1 && <TableCell className="text-right text-sm font-medium text-primary">{fmtBRL(item.quantidade * item.valor_unitario * fatorReajuste)}</TableCell>}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right font-semibold">Total:</TableCell>
                <TableCell className="text-right font-bold">{fmtBRL(items.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0))}</TableCell>
                {fatorReajuste !== 1 && <TableCell className="text-right font-bold text-primary">{fmtBRL(items.reduce((s, i) => s + i.quantidade * i.valor_unitario * fatorReajuste, 0))}</TableCell>}
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><HardHat className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{obra.codigo} — {obra.nome}</h1>
              <p className="text-sm text-muted-foreground">{obra.construtora || (empresa?.nome_fantasia || empresa?.razao_social)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDocOpen(true)}><FolderOpen className="h-4 w-4 mr-1" /> Documentos</Button>
            <Button variant="outline" size="sm" onClick={onEdit}><Edit className="h-4 w-4 mr-1" /> Editar</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Contrato Original", value: fmtBRL(totalContrato), icon: FileText },
            { label: "Aditivos", value: fmtBRL(totalAditivos), icon: Plus },
            { label: "Total Reajustado", value: fmtBRL(totalGeralReajustado), icon: DollarSign },
            { label: "Reajuste", value: fatorReajuste !== 1 ? `${((fatorReajuste - 1) * 100).toFixed(2)}%` : "—", icon: TrendingUp },
            { label: "Funcionários", value: String(funcionariosCount), icon: Users },
            { label: "Medições", value: String(medicoesCount), icon: ClipboardList },
          ].map(kpi => (
            <Card key={kpi.label} className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><kpi.icon className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground uppercase font-medium">{kpi.label}</span></div>
                <p className="text-sm font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dados" className="space-y-4">
          <TabsList>
           <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="escala">Escala</TabsTrigger>
            <TabsTrigger value="planilha">Planilha de Contrato</TabsTrigger>
            <TabsTrigger value="aditivos">Aditivos</TabsTrigger>
            <TabsTrigger value="reajustes">Reajustes</TabsTrigger>
          </TabsList>

          {/* Dados Gerais */}
          <TabsContent value="dados">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Código:</span> <span className="font-medium ml-1">{obra.codigo}</span></div>
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium ml-1">{obra.nome}</span></div>
                  <div><span className="text-muted-foreground">Empresa:</span> <span className="font-medium ml-1">{empresa?.nome_fantasia || empresa?.razao_social || "—"}</span></div>
                  <div><span className="text-muted-foreground">Contratante:</span> <span className="font-medium ml-1">{obra.construtora || "—"}</span></div>
                  <div><span className="text-muted-foreground">Endereço:</span> <span className="font-medium ml-1">{obra.endereco || "—"}</span></div>
                  <div><span className="text-muted-foreground">Local:</span> <span className="font-medium ml-1">{obra.cidade || ""}{obra.uf ? `/${obra.uf}` : ""}</span></div>
                  <div><span className="text-muted-foreground">Início:</span> <span className="font-medium ml-1">{obra.data_inicio ? new Date(obra.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
                  <div><span className="text-muted-foreground">Previsão:</span> <span className="font-medium ml-1">{obra.data_previsao_fim ? new Date(obra.data_previsao_fim + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
                  <div><span className="text-muted-foreground">Conclusão:</span> <span className="font-medium ml-1">{obra.data_fim ? new Date(obra.data_fim + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="ml-1">{obra.status}</Badge></div>
                  <div><span className="text-muted-foreground">Diários:</span> <span className="font-medium ml-1">{diariosCount}</span></div>
                  {obra.observacoes && <div className="sm:col-span-2 lg:col-span-3"><span className="text-muted-foreground">Observações:</span> <span className="ml-1">{obra.observacoes}</span></div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Planilha de Contrato */}
          <TabsContent value="planilha">
            {renderItemTable(itensContrato, "Itens do Contrato Original", false)}
          </TabsContent>

          {/* Aditivos */}
          <TabsContent value="aditivos">
            {renderItemTable(itensAditivo, "Itens Aditivos", true)}
          </TabsContent>

          {/* Reajustes */}
          <TabsContent value="reajustes">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Reajustes Contratuais</h3>
                <Button size="sm" variant="outline" onClick={() => { setReajusteForm({ data_aplicacao: "", percentual: 0, tipo: "anual", motivo: "", observacoes: "" }); setShowReajusteDialog(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Novo Reajuste
                </Button>
              </div>

              {fatorReajuste !== 1 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                  <span className="text-muted-foreground">Fator acumulado:</span> <span className="font-bold text-primary">{fatorReajuste.toFixed(4)} ({((fatorReajuste - 1) * 100).toFixed(2)}%)</span>
                  <span className="text-muted-foreground ml-4">Saldo original:</span> <span className="font-medium">{fmtBRL(totalContrato + totalAditivos)}</span>
                  <span className="text-muted-foreground ml-4">Saldo reajustado:</span> <span className="font-bold text-primary">{fmtBRL(totalGeralReajustado)}</span>
                </div>
              )}

              {reajustes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">Nenhum reajuste aplicado</div>
              ) : (
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Percentual</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reajustes.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{new Date(r.data_aplicacao + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="capitalize">{r.tipo}</TableCell>
                          <TableCell className="text-right font-medium">{r.percentual.toFixed(2)}%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.motivo || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteReajuste(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Item" : (itemForm.is_aditivo ? "Novo Item Aditivo" : "Novo Item de Contrato")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº Item *</Label><Input value={itemForm.item_numero} onChange={e => setItemForm(f => ({ ...f, item_numero: e.target.value }))} placeholder="1.1" /></div>
            <div><Label>Unidade</Label>
              <Select value={itemForm.unidade} onValueChange={v => setItemForm(f => ({ ...f, unidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["un", "m²", "m³", "m", "kg", "t", "vb", "mês", "h", "l"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Descrição *</Label><Input value={itemForm.descricao} onChange={e => setItemForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Quantidade</Label><Input type="number" value={itemForm.quantidade || ""} onChange={e => setItemForm(f => ({ ...f, quantidade: Number(e.target.value) }))} /></div>
            <div><Label>Valor Unitário</Label><Input type="number" step="0.01" value={itemForm.valor_unitario || ""} onChange={e => setItemForm(f => ({ ...f, valor_unitario: Number(e.target.value) }))} /></div>
            {itemForm.is_aditivo && (
              <div><Label>Nº Aditivo</Label><Input type="number" value={itemForm.aditivo_numero || ""} onChange={e => setItemForm(f => ({ ...f, aditivo_numero: Number(e.target.value) }))} /></div>
            )}
            <div className={itemForm.is_aditivo ? "" : "col-span-2"}><Label>Observações</Label><Textarea value={itemForm.observacoes} onChange={e => setItemForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reajuste Dialog */}
      <Dialog open={showReajusteDialog} onOpenChange={setShowReajusteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Reajuste</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data Aplicação *</Label><Input type="date" value={reajusteForm.data_aplicacao} onChange={e => setReajusteForm(f => ({ ...f, data_aplicacao: e.target.value }))} /></div>
            <div><Label>Percentual (%) *</Label><Input type="number" step="0.01" value={reajusteForm.percentual || ""} onChange={e => setReajusteForm(f => ({ ...f, percentual: Number(e.target.value) }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={reajusteForm.tipo} onValueChange={v => setReajusteForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["anual", "convenção", "acordo", "outro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Motivo</Label><Input value={reajusteForm.motivo} onChange={e => setReajusteForm(f => ({ ...f, motivo: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={reajusteForm.observacoes} onChange={e => setReajusteForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReajusteDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveReajuste}>Aplicar Reajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Manager */}
      <DocumentManagerGeneric open={docOpen} onOpenChange={setDocOpen} entityId={obra.id} entityNome={obra.nome} basePath="obras" subpastas={subpastasDoc} />
    </AppLayout>
  );
}
