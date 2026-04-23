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
import { Truck, Plus, MapPin, FileText, Search, Trash2, Edit } from "lucide-react";

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
const STATUS_LOC: Record<string, { label: string; class: string }> = {
  ativo: { label: "Ativo", class: "bg-success/15 text-success border-success/30" },
  encerrado: { label: "Encerrado", class: "bg-muted text-muted-foreground border-border" },
  pendente: { label: "Pendente", class: "bg-warning/15 text-warning border-warning/30" },
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

  const obraMap = useMemo(() => Object.fromEntries(obras.map(o => [o.id, `${o.codigo} - ${o.nome}`])), [obras]);
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

  // Painel: agrupar por obra
  const equipPorObra = useMemo(() => {
    const map: Record<string, EquipLocado[]> = {};
    equipamentos.filter(e => e.obra_id && e.status === "ativo").forEach(e => {
      const key = e.obra_id!;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [equipamentos]);

  // Fechamento mensal por fornecedor
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
    const payload = {
      ...form,
      fornecedor_id: form.fornecedor_id || null,
      obra_id: form.obra_id || null,
      data_fim: form.data_fim || null,
      numero_oc: form.numero_oc || null,
    };
    if (editing) {
      await supabase.from("equipamentos_locados").update(payload).eq("id", editing.id);
      toast({ title: "Locação atualizada!" });
    } else {
      await supabase.from("equipamentos_locados").insert(payload);
      toast({ title: "Locação cadastrada!" });
    }
    setShowForm(false);
    setEditing(null);
    resetForm();
    loadData();
  }

  async function deleteEquip(id: string) {
    await supabase.from("equipamentos_locados").delete().eq("id", id);
    toast({ title: "Locação excluída" });
    loadData();
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Equipamentos Locados</h1>
            <p className="text-sm text-muted-foreground">Controle de locações, fornecedores e fechamento mensal</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Nova Locação</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Locações", value: stats.total, format: false },
            { label: "Ativas", value: stats.ativos, format: false },
            { label: "Custo Mensal", value: stats.custoMensal, format: true },
            { label: "Fornecedores", value: stats.fornecedoresAtivos, format: false },
          ].map(k => (
            <Card key={k.label}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-2xl font-bold text-foreground">{k.format ? `R$ ${(k.value as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : k.value}</p></CardContent></Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="painel"><MapPin className="h-4 w-4 mr-1" />Painel</TabsTrigger>
            <TabsTrigger value="locacoes"><Truck className="h-4 w-4 mr-1" />Locações</TabsTrigger>
            <TabsTrigger value="fechamento"><FileText className="h-4 w-4 mr-1" />Fechamento Mensal</TabsTrigger>
          </TabsList>

          {/* PAINEL */}
          <TabsContent value="painel" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Equipamentos Locados por Obra</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(equipPorObra).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum equipamento locado ativo em obras.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(equipPorObra).map(([obraId, eqs]) => (
                      <div key={obraId} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-sm text-primary mb-2">{obraMap[obraId] || "Obra"}</h3>
                        <div className="space-y-1">
                          {eqs.map(eq => (
                            <div key={eq.id} className="flex items-center justify-between text-sm">
                              <span>{eq.descricao} (x{eq.quantidade})</span>
                              <span className="text-muted-foreground">{eq.fornecedor_id ? fornecedorMap[eq.fornecedor_id] : "—"} — R$ {(eq.valor_mensal * eq.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOCAÇÕES */}
          <TabsContent value="locacoes" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-sm" />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead className="text-right">Valor/Mês</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquip.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma locação</TableCell></TableRow>
                    ) : filteredEquip.map(eq => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-medium">{eq.descricao}</TableCell>
                        <TableCell className="text-sm">{eq.fornecedor_id ? fornecedorMap[eq.fornecedor_id] || "—" : "—"}</TableCell>
                        <TableCell className="text-sm">{eq.obra_id ? obraMap[eq.obra_id] || "—" : "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{eq.numero_oc || "—"}</TableCell>
                        <TableCell className="text-sm capitalize">{eq.tipo_contrato.replace("_", " ")}</TableCell>
                        <TableCell className="text-sm">{eq.quantidade}</TableCell>
                        <TableCell className="text-right text-sm">R$ {(eq.valor_mensal * eq.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_LOC[eq.status]?.class}>{STATUS_LOC[eq.status]?.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(eq)}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteEquip(eq.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FECHAMENTO MENSAL */}
          <TabsContent value="fechamento" className="space-y-4">
            <div className="flex items-center gap-2">
              <Label>Mês/Ano:</Label>
              <Input type="month" value={mesFechamento} onChange={e => setMesFechamento(e.target.value)} className="max-w-[200px]" />
            </div>
            {fechamentoMensal.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma locação ativa no período selecionado.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {fechamentoMensal.map((grupo, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{grupo.fornecedor}</CardTitle>
                        <span className="text-lg font-bold text-primary">R$ {grupo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Equipamento</TableHead>
                            <TableHead>Obra</TableHead>
                            <TableHead>OC</TableHead>
                            <TableHead>Qtd</TableHead>
                            <TableHead className="text-right">Valor Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.items.map(e => (
                            <TableRow key={e.id}>
                              <TableCell className="text-sm">{e.descricao}</TableCell>
                              <TableCell className="text-sm">{e.obra_id ? obraMap[e.obra_id] || "—" : "—"}</TableCell>
                              <TableCell className="text-sm font-mono">{e.numero_oc || "—"}</TableCell>
                              <TableCell className="text-sm">{e.quantidade}</TableCell>
                              <TableCell className="text-right text-sm">R$ {e.valor_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right text-sm font-medium">R$ {(e.valor_mensal * e.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardContent className="p-4 flex justify-between items-center">
                    <span className="font-semibold">Total Geral do Mês</span>
                    <span className="text-xl font-bold text-primary">R$ {fechamentoMensal.reduce((s, g) => s + g.total, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Form */}
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
                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}</SelectContent>
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
          <DialogFooter><Button onClick={saveEquip}>{editing ? "Salvar" : "Cadastrar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
