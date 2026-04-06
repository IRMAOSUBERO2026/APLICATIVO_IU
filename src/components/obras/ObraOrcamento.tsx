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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, DollarSign, TrendingUp, Package, Save, Layers } from "lucide-react";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface OrcamentoItem {
  id: string; orcamento_id: string; atividade: string; descricao?: string;
  unidade: string; quantidade: number; custo_material: number; custo_mao_obra: number;
  custo_equipamento: number; custo_unitario_total: number; valor_total: number; observacoes?: string;
}

interface Orcamento {
  id: string; obra_id: string; empresa_id: string; nome: string; versao: number;
  custo_total: number; margem_percentual: number; preco_final: number; lucro_previsto: number;
  status: string; observacoes?: string;
}

interface Props { obraId: string; empresaId: string; }

export default function ObraOrcamento({ obraId, empresaId }: Props) {
  const { toast } = useToast();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [selectedOrc, setSelectedOrc] = useState<Orcamento | null>(null);
  const [itens, setItens] = useState<OrcamentoItem[]>([]);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<OrcamentoItem | null>(null);
  const [itemForm, setItemForm] = useState({
    atividade: "", descricao: "", unidade: "m²", quantidade: 0,
    custo_material: 0, custo_mao_obra: 0, custo_equipamento: 0, observacoes: ""
  });
  const [margem, setMargem] = useState(15);

  useEffect(() => { loadOrcamentos(); }, [obraId]);

  const loadOrcamentos = async () => {
    const { data } = await supabase.from("orcamentos").select("*").eq("obra_id", obraId).order("versao");
    if (data) {
      setOrcamentos(data as Orcamento[]);
      if (data.length > 0 && !selectedOrc) {
        setSelectedOrc(data[0] as Orcamento);
        setMargem((data[0] as Orcamento).margem_percentual);
        loadItens((data[0] as Orcamento).id);
      }
    }
  };

  const loadItens = async (orcId: string) => {
    const { data } = await supabase.from("orcamento_itens").select("*").eq("orcamento_id", orcId);
    if (data) setItens(data as OrcamentoItem[]);
  };

  const handleCreateOrcamento = async () => {
    const versao = orcamentos.length + 1;
    const { data, error } = await supabase.from("orcamentos")
      .insert({ obra_id: obraId, empresa_id: empresaId, nome: `Orçamento v${versao}`, versao })
      .select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Orçamento criado" });
    setSelectedOrc(data as Orcamento);
    setMargem(15);
    setItens([]);
    loadOrcamentos();
  };

  const handleSelectOrc = (orc: Orcamento) => {
    setSelectedOrc(orc);
    setMargem(orc.margem_percentual);
    loadItens(orc.id);
  };

  const custoTotal = useMemo(() => itens.reduce((s, i) => s + i.valor_total, 0), [itens]);
  const custoMaterial = useMemo(() => itens.reduce((s, i) => s + i.custo_material * i.quantidade, 0), [itens]);
  const custoMaoObra = useMemo(() => itens.reduce((s, i) => s + i.custo_mao_obra * i.quantidade, 0), [itens]);
  const custoEquip = useMemo(() => itens.reduce((s, i) => s + i.custo_equipamento * i.quantidade, 0), [itens]);
  const precoFinal = custoTotal * (1 + margem / 100);
  const lucro = precoFinal - custoTotal;

  const handleSaveItem = async () => {
    if (!selectedOrc || !itemForm.atividade) { toast({ title: "Preencha a atividade", variant: "destructive" }); return; }
    const custoUnit = itemForm.custo_material + itemForm.custo_mao_obra + itemForm.custo_equipamento;
    const valorTotal = custoUnit * itemForm.quantidade;
    const payload = { ...itemForm, orcamento_id: selectedOrc.id, custo_unitario_total: custoUnit, valor_total: valorTotal };
    if (editingItem) {
      await supabase.from("orcamento_itens").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("orcamento_itens").insert(payload);
    }
    toast({ title: editingItem ? "Item atualizado" : "Item adicionado" });
    setShowItemDialog(false);
    loadItens(selectedOrc.id);
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("orcamento_itens").delete().eq("id", id);
    if (selectedOrc) loadItens(selectedOrc.id);
  };

  const handleUpdateMargem = async () => {
    if (!selectedOrc) return;
    await supabase.from("orcamentos").update({
      margem_percentual: margem, custo_total: custoTotal, preco_final: precoFinal, lucro_previsto: lucro
    }).eq("id", selectedOrc.id);
    toast({ title: "Orçamento atualizado" });
    loadOrcamentos();
  };

  const openNewItem = () => {
    setEditingItem(null);
    setItemForm({ atividade: "", descricao: "", unidade: "m²", quantidade: 0, custo_material: 0, custo_mao_obra: 0, custo_equipamento: 0, observacoes: "" });
    setShowItemDialog(true);
  };

  const openEditItem = (item: OrcamentoItem) => {
    setEditingItem(item);
    setItemForm({
      atividade: item.atividade, descricao: item.descricao || "", unidade: item.unidade,
      quantidade: item.quantidade, custo_material: item.custo_material, custo_mao_obra: item.custo_mao_obra,
      custo_equipamento: item.custo_equipamento, observacoes: item.observacoes || ""
    });
    setShowItemDialog(true);
  };

  const custoUnitPreview = itemForm.custo_material + itemForm.custo_mao_obra + itemForm.custo_equipamento;
  const totalPreview = custoUnitPreview * itemForm.quantidade;

  return (
    <div className="space-y-4">
      {/* Version selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Layers className="h-4 w-4 text-muted-foreground" />
        {orcamentos.map(orc => (
          <Button key={orc.id} variant={selectedOrc?.id === orc.id ? "default" : "outline"} size="sm" onClick={() => handleSelectOrc(orc)}>
            {orc.nome}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={handleCreateOrcamento} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Novo
        </Button>
      </div>

      {!selectedOrc ? (
        <div className="py-16 text-center border rounded-lg bg-muted/30">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Crie um orçamento para iniciar a análise de custos</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleCreateOrcamento}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar Orçamento
          </Button>
        </div>
      ) : (
        <>
          {/* Summary Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo Total</p>
              <p className="text-base font-bold mt-0.5">{fmtBRL(custoTotal)}</p>
              <div className="flex gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground">Mat. {fmtBRL(custoMaterial)}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Mão de Obra</p>
              <p className="text-base font-bold mt-0.5">{fmtBRL(custoMaoObra)}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">{custoTotal > 0 ? ((custoMaoObra / custoTotal) * 100).toFixed(0) : 0}% do custo</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Equipamentos</p>
              <p className="text-base font-bold mt-0.5">{fmtBRL(custoEquip)}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">{custoTotal > 0 ? ((custoEquip / custoTotal) * 100).toFixed(0) : 0}% do custo</p>
            </div>
            <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Preço Final</p>
                <div className="flex items-center gap-1">
                  <Input type="number" value={margem} onChange={e => setMargem(Number(e.target.value))} className="h-6 w-12 text-[10px] text-center p-0" />
                  <span className="text-[10px] text-muted-foreground">%</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleUpdateMargem}><Save className="h-3 w-3" /></Button>
                </div>
              </div>
              <p className="text-base font-bold text-primary mt-0.5">{fmtBRL(precoFinal)}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lucro Previsto</p>
              <p className={`text-base font-bold mt-0.5 ${lucro >= 0 ? "text-green-600" : "text-destructive"}`}>{fmtBRL(lucro)}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">{margem}% margem</p>
            </div>
          </div>

          {/* Composição de Custos */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Composição de Custos ({itens.length} itens)</h3>
            <Button size="sm" variant="outline" onClick={openNewItem} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Adicionar Item
            </Button>
          </div>

          {itens.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
              <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              Adicione itens para compor o orçamento
            </div>
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead className="w-14">Un.</TableHead>
                    <TableHead className="w-16 text-right">Qtd.</TableHead>
                    <TableHead className="w-24 text-right">Material</TableHead>
                    <TableHead className="w-24 text-right">M. Obra</TableHead>
                    <TableHead className="w-24 text-right">Equip.</TableHead>
                    <TableHead className="w-24 text-right">C. Unit.</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="text-sm">
                        <div className="font-medium">{item.atividade}</div>
                        {item.descricao && <div className="text-xs text-muted-foreground mt-0.5">{item.descricao}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{item.unidade}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{item.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtBRL(item.custo_material)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtBRL(item.custo_mao_obra)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtBRL(item.custo_equipamento)}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{fmtBRL(item.custo_unitario_total)}</TableCell>
                      <TableCell className="text-right text-sm font-bold tabular-nums">{fmtBRL(item.valor_total)}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold text-xs">Subtotais:</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">{fmtBRL(custoMaterial)}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">{fmtBRL(custoMaoObra)}</TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">{fmtBRL(custoEquip)}</TableCell>
                    <TableCell className="text-right font-semibold">—</TableCell>
                    <TableCell className="text-right font-bold">{fmtBRL(custoTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Item Dialog - Professional Layout */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Item" : "Novo Item do Orçamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Atividade *</Label>
              <Input value={itemForm.atividade} onChange={e => setItemForm(f => ({ ...f, atividade: e.target.value }))} placeholder="Ex: Forma de pilares" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={itemForm.descricao} onChange={e => setItemForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhamento opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidade</Label>
                <Select value={itemForm.unidade} onValueChange={v => setItemForm(f => ({ ...f, unidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["un", "m²", "m³", "m", "kg", "t", "vb", "mês", "h", "l"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" step="0.01" value={itemForm.quantidade || ""} onChange={e => setItemForm(f => ({ ...f, quantidade: Number(e.target.value) }))} />
              </div>
            </div>

            {/* Cost breakdown with visual feedback */}
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Composição de Custo Unitário</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Material (R$)</Label>
                  <Input type="number" step="0.01" value={itemForm.custo_material || ""} onChange={e => setItemForm(f => ({ ...f, custo_material: Number(e.target.value) }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Mão de Obra (R$)</Label>
                  <Input type="number" step="0.01" value={itemForm.custo_mao_obra || ""} onChange={e => setItemForm(f => ({ ...f, custo_mao_obra: Number(e.target.value) }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Equipamento (R$)</Label>
                  <Input type="number" step="0.01" value={itemForm.custo_equipamento || ""} onChange={e => setItemForm(f => ({ ...f, custo_equipamento: Number(e.target.value) }))} className="h-9" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">Custo Unitário:</span>
                <span className="text-sm font-bold">{fmtBRL(custoUnitPreview)}</span>
              </div>
              {itemForm.quantidade > 0 && custoUnitPreview > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Total ({itemForm.quantidade} × {fmtBRL(custoUnitPreview)}):</span>
                  <span className="text-sm font-bold text-primary">{fmtBRL(totalPreview)}</span>
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={itemForm.observacoes} onChange={e => setItemForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
