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
import { Wrench, Plus, Search, MapPin, ShoppingCart, Settings, History, Trash2, Edit, Camera, Loader2, X } from "lucide-react";

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
  foto_url: string | null;
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
const STATUS_EQUIP: Record<string, { label: string; class: string }> = {
  disponivel: { label: "Disponível", class: "bg-success/15 text-success border-success/30" },
  em_uso: { label: "Em Uso", class: "bg-primary/15 text-primary border-primary/30" },
  manutencao: { label: "Manutenção", class: "bg-warning/15 text-warning border-warning/30" },
  inativo: { label: "Inativo", class: "bg-destructive/15 text-destructive border-destructive/30" },
};
const STATUS_MANUT: Record<string, { label: string; class: string }> = {
  solicitada: { label: "Solicitada", class: "bg-warning/15 text-warning border-warning/30" },
  aprovada: { label: "Aprovada", class: "bg-primary/15 text-primary border-primary/30" },
  em_andamento: { label: "Em Andamento", class: "bg-accent/15 text-accent border-accent/30" },
  concluida: { label: "Concluída", class: "bg-success/15 text-success border-success/30" },
};
const STATUS_COMPRA: Record<string, { label: string; class: string }> = {
  pendente: { label: "Pendente", class: "bg-warning/15 text-warning border-warning/30" },
  aprovada: { label: "Aprovada", class: "bg-primary/15 text-primary border-primary/30" },
  comprada: { label: "Comprada", class: "bg-success/15 text-success border-success/30" },
  cancelada: { label: "Cancelada", class: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function EquipamentosProprios() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([]);
  const [obras, setObras] = useState<{ id: string; nome: string; codigo: string }[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; razao_social: string }[]>([]);
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("painel");

  // Dialogs
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [showManutForm, setShowManutForm] = useState(false);
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [selectedEquipId, setSelectedEquipId] = useState<string>("");

  // Form states
  const [formEquip, setFormEquip] = useState({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "", foto_url: "" });
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [formManut, setFormManut] = useState({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" });
  const [formCompra, setFormCompra] = useState({ descricao: "", tipo: "Outros", marca: "", modelo: "", quantidade: 1, valor_estimado: 0, obra_id: "", solicitante: "", empresa_id: "", observacoes: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [eqRes, obRes, emRes, mnRes, scRes] = await Promise.all([
      supabase.from("equipamentos_proprios").select("*").order("codigo"),
      supabase.from("obras").select("id, nome, codigo").in("status", OBRA_STATUS_ATIVOS_ARR),
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

  const obraMap = useMemo(() => Object.fromEntries(obras.map(o => [o.id, `${o.codigo} - ${o.nome}`])), [obras]);

  const filteredEquip = useMemo(() => {
    if (!busca) return equipamentos;
    const q = busca.toLowerCase();
    return equipamentos.filter(e => e.descricao.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q) || (e.marca?.toLowerCase().includes(q)));
  }, [equipamentos, busca]);

  // Painel stats
  const stats = useMemo(() => ({
    total: equipamentos.length,
    emUso: equipamentos.filter(e => e.status === "em_uso").length,
    disponiveis: equipamentos.filter(e => e.status === "disponivel").length,
    manutencao: equipamentos.filter(e => e.status === "manutencao").length,
  }), [equipamentos]);

  // Group by obra for painel
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
    const payload = {
      ...formEquip,
      obra_id: formEquip.obra_id || null,
      valor_aquisicao: formEquip.valor_aquisicao || 0,
      data_aquisicao: formEquip.data_aquisicao || null,
    };
    if (editingEquip) {
      await supabase.from("equipamentos_proprios").update(payload).eq("id", editingEquip.id);
      toast({ title: "Equipamento atualizado!" });
    } else {
      await supabase.from("equipamentos_proprios").insert(payload);
      toast({ title: "Equipamento cadastrado!" });
    }
    setShowEquipForm(false);
    setEditingEquip(null);
    resetEquipForm();
    loadData();
  }

  async function deleteEquip(id: string) {
    await supabase.from("equipamentos_proprios").delete().eq("id", id);
    toast({ title: "Equipamento excluído" });
    loadData();
  }

  async function saveManut() {
    if (!formManut.equipamento_id || !formManut.descricao) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const eq = equipamentos.find(e => e.id === formManut.equipamento_id);
    await supabase.from("manutencoes_equipamento").insert({
      ...formManut,
      empresa_id: eq?.empresa_id || empresas[0]?.id,
      fornecedor: formManut.fornecedor || null,
    });
    toast({ title: "Manutenção solicitada!" });
    setShowManutForm(false);
    resetManutForm();
    loadData();
  }

  async function updateManutStatus(id: string, status: string) {
    await supabase.from("manutencoes_equipamento").update({ status }).eq("id", id);
    loadData();
  }

  async function saveCompra() {
    if (!formCompra.descricao || !formCompra.empresa_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    await supabase.from("solicitacoes_compra_equipamento").insert({
      ...formCompra,
      obra_id: formCompra.obra_id || null,
    });
    toast({ title: "Solicitação de compra criada!" });
    setShowCompraForm(false);
    resetCompraForm();
    loadData();
  }

  async function uploadFoto(file: File) {
    if (!file) return;
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `equipamentos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("documentos").getPublicUrl(path);
      setFormEquip(p => ({ ...p, foto_url: pub.publicUrl }));
      toast({ title: "Foto enviada!" });
    } catch (e: any) {
      toast({ title: "Erro ao enviar foto", description: e.message, variant: "destructive" });
    } finally {
      setUploadingFoto(false);
    }
  }

  function resetEquipForm() { setFormEquip({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "", foto_url: "" }); }
  function resetManutForm() { setFormManut({ equipamento_id: "", tipo: "corretiva", descricao: "", fornecedor: "", valor_orcamento: 0, valor_aprovado: 0, observacoes: "" }); }
  function resetCompraForm() { setFormCompra({ descricao: "", tipo: "Outros", marca: "", modelo: "", quantidade: 1, valor_estimado: 0, obra_id: "", solicitante: "", empresa_id: "", observacoes: "" }); }

  function openEdit(eq: Equipamento) {
    setEditingEquip(eq);
    setFormEquip({
      codigo: eq.codigo, descricao: eq.descricao, tipo: eq.tipo, marca: eq.marca || "", modelo: eq.modelo || "",
      numero_serie: eq.numero_serie || "", data_aquisicao: eq.data_aquisicao || "", valor_aquisicao: eq.valor_aquisicao,
      obra_id: eq.obra_id || "", empresa_id: eq.empresa_id, status: eq.status, observacoes: eq.observacoes || "",
      foto_url: eq.foto_url || "",
    });
    setShowEquipForm(true);
  }

  function openHistorico(eqId: string) {
    setSelectedEquipId(eqId);
    setShowHistorico(true);
  }

  const historicoEquip = useMemo(() => manutencoes.filter(m => m.equipamento_id === selectedEquipId), [manutencoes, selectedEquipId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" /> Equipamentos Próprios</h1>
            <p className="text-sm text-muted-foreground">Patrimônio, localização, manutenção e solicitações de compra</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => { resetEquipForm(); setEditingEquip(null); setShowEquipForm(true); }}><Plus className="h-4 w-4 mr-1" />Novo Equipamento</Button>
            <Button size="sm" variant="outline" onClick={() => { resetManutForm(); setShowManutForm(true); }}><Settings className="h-4 w-4 mr-1" />Solicitar Manutenção</Button>
            <Button size="sm" variant="outline" onClick={() => { resetCompraForm(); setShowCompraForm(true); }}><ShoppingCart className="h-4 w-4 mr-1" />Solicitar Compra</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Em Uso", value: stats.emUso, color: "text-primary" },
            { label: "Disponíveis", value: stats.disponiveis, color: "text-success" },
            { label: "Em Manutenção", value: stats.manutencao, color: "text-warning" },
          ].map(k => (
            <Card key={k.label}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{k.label}</p><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p></CardContent></Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="painel"><MapPin className="h-4 w-4 mr-1" />Painel</TabsTrigger>
            <TabsTrigger value="cadastro"><Wrench className="h-4 w-4 mr-1" />Cadastro</TabsTrigger>
            <TabsTrigger value="manutencao"><Settings className="h-4 w-4 mr-1" />Manutenções</TabsTrigger>
            <TabsTrigger value="compras"><ShoppingCart className="h-4 w-4 mr-1" />Solicitações de Compra</TabsTrigger>
          </TabsList>

          {/* PAINEL */}
          <TabsContent value="painel" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Localização dos Equipamentos por Obra</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(equipPorObra).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum equipamento alocado em obras.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(equipPorObra).map(([obraId, eqs]) => (
                      <div key={obraId} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-sm text-primary mb-2">{obraMap[obraId] || "Obra não identificada"}</h3>
                        <div className="flex flex-wrap gap-2">
                          {eqs.map(eq => (
                            <Badge key={eq.id} variant="outline" className={STATUS_EQUIP[eq.status]?.class}>
                              {eq.codigo} - {eq.descricao}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {equipamentos.filter(e => !e.obra_id).length > 0 && (
                  <div className="border rounded-lg p-4 mt-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Sem obra (Disponíveis / Estoque)</h3>
                    <div className="flex flex-wrap gap-2">
                      {equipamentos.filter(e => !e.obra_id).map(eq => (
                        <Badge key={eq.id} variant="outline" className={STATUS_EQUIP[eq.status]?.class}>
                          {eq.codigo} - {eq.descricao}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CADASTRO */}
          <TabsContent value="cadastro" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar equipamento..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-sm" />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquip.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum equipamento cadastrado</TableCell></TableRow>
                    ) : filteredEquip.map(eq => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-mono text-xs">{eq.codigo}</TableCell>
                        <TableCell className="font-medium">{eq.descricao}</TableCell>
                        <TableCell className="text-sm">{eq.tipo}</TableCell>
                        <TableCell className="text-sm">{[eq.marca, eq.modelo].filter(Boolean).join(" / ") || "—"}</TableCell>
                        <TableCell className="text-sm">{eq.obra_id ? obraMap[eq.obra_id] || "—" : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_EQUIP[eq.status]?.class}>{STATUS_EQUIP[eq.status]?.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openHistorico(eq.id)} title="Histórico"><History className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(eq)} title="Editar"><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteEquip(eq.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MANUTENÇÕES */}
          <TabsContent value="manutencao" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Orçamento</TableHead>
                      <TableHead className="text-right">Aprovado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manutencoes.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma manutenção registrada</TableCell></TableRow>
                    ) : manutencoes.map(m => {
                      const eq = equipamentos.find(e => e.id === m.equipamento_id);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm font-medium">{eq ? `${eq.codigo} - ${eq.descricao}` : "—"}</TableCell>
                          <TableCell className="text-sm capitalize">{m.tipo}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{m.descricao}</TableCell>
                          <TableCell className="text-sm">{m.fornecedor || "—"}</TableCell>
                          <TableCell className="text-right text-sm">R$ {m.valor_orcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right text-sm">R$ {m.valor_aprovado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell><Badge variant="outline" className={STATUS_MANUT[m.status]?.class}>{STATUS_MANUT[m.status]?.label}</Badge></TableCell>
                          <TableCell>
                            <Select value={m.status} onValueChange={v => updateManutStatus(m.id, v)}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* SOLICITAÇÕES DE COMPRA */}
          <TabsContent value="compras" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma solicitação</TableCell></TableRow>
                    ) : solicitacoes.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.descricao}</TableCell>
                        <TableCell className="text-sm">{s.tipo}</TableCell>
                        <TableCell className="text-sm">{s.quantidade}</TableCell>
                        <TableCell className="text-sm">{s.obra_id ? obraMap[s.obra_id] || "—" : "—"}</TableCell>
                        <TableCell className="text-sm">{s.solicitante || "—"}</TableCell>
                        <TableCell className="text-right text-sm">R$ {s.valor_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_COMPRA[s.status]?.class}>{STATUS_COMPRA[s.status]?.label}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Cadastro Equipamento */}
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
              <Select value={formEquip.obra_id || "__none__"} onValueChange={v => setFormEquip(p => ({ ...p, obra_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Sem obra" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem obra</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}
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
          <DialogFooter><Button onClick={saveEquip}>{editingEquip ? "Salvar" : "Cadastrar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Manutenção */}
      <Dialog open={showManutForm} onOpenChange={setShowManutForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Equipamento *</Label>
              <Select value={formManut.equipamento_id} onValueChange={v => setFormManut(p => ({ ...p, equipamento_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{equipamentos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.descricao}</SelectItem>)}</SelectContent>
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

      {/* Dialog Solicitação Compra */}
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
                <SelectContent>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>)}</SelectContent>
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

      {/* Dialog Histórico Manutenção */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Histórico de Manutenções</DialogTitle></DialogHeader>
          {historicoEquip.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhuma manutenção registrada para este equipamento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Aprovado</TableHead>
                  <TableHead>Status</TableHead>
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
