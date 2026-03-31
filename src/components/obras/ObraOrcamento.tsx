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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Calculator, DollarSign, TrendingUp, Package } from "lucide-react";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  atividade: string;
  descricao?: string;
  unidade: string;
  quantidade: number;
  custo_material: number;
  custo_mao_obra: number;
  custo_equipamento: number;
  custo_unitario_total: number;
  valor_total: number;
  observacoes?: string;
}

interface Orcamento {
  id: string;
  obra_id: string;
  empresa_id: string;
  nome: string;
  versao: number;
  custo_total: number;
  margem_percentual: number;
  preco_final: number;
  lucro_previsto: number;
  status: string;
  observacoes?: string;
}

interface Props {
  obraId: string;
  empresaId: string;
}

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

  return (
    <div className="space-y-4">
      {/* Orçamento selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {orcamentos.map(orc => (
            <Button key={orc.id} variant={selectedOrc?.id === orc.id ? "default" : "outline"} size="sm" onClick={() => handleSelectOrc(orc)}>
              {orc.nome}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleCreateOrcamento}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Orçamento</Button>
      </div>

      {!selectedOrc ? (
        <div className="py-12 text-center text-sm text-muted-foreground border rounded-lg">
          Crie um orçamento para começar
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><Package className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground uppercase">Custo Total</span></div>
                <p className="text-sm font-bold">{fmtBRL(custoTotal)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground uppercase">Margem</span></div>
                <div className="flex items-center gap-2">
                  <Input type="number" value={margem} onChange={e => setMargem(Number(e.target.value))} className="h-7 w-16 text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={handleUpdateMargem}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground uppercase">Preço Final</span></div>
                <p className="text-sm font-bold text-primary">{fmtBRL(precoFinal)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><Calculator className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground uppercase">Lucro Previsto</span></div>
                <p className="text-sm font-bold text-green-600">{fmtBRL(lucro)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Items table */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Composição de Custos ({itens.length} itens)</h3>
            <Button size="sm" variant="outline" onClick={openNewItem}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Item</Button>
          </div>

          {itens.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">Nenhum item cadastrado</div>
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
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        <div>{item.atividade}</div>
                        {item.descricao && <div className="text-xs text-muted-foreground">{item.descricao}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{item.unidade}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-xs">{fmtBRL(item.custo_material)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtBRL(item.custo_mao_obra)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtBRL(item.custo_equipamento)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtBRL(item.custo_unitario_total)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmtBRL(item.valor_total)}</TableCell>
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
                    <TableCell colSpan={7} className="text-right font-semibold">Custo Total:</TableCell>
                    <TableCell className="text-right font-bold">{fmtBRL(custoTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Item" : "Novo Item do Orçamento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Atividade *</Label><Input value={itemForm.atividade} onChange={e => setItemForm(f => ({ ...f, atividade: e.target.value }))} placeholder="Ex: Forma de pilares" /></div>
            <div className="col-span-2"><Label>Descrição</Label><Input value={itemForm.descricao} onChange={e => setItemForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div>
              <Label>Unidade</Label>
              <Select value={itemForm.unidade} onValueChange={v => setItemForm(f => ({ ...f, unidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["un", "m²", "m³", "m", "kg", "t", "vb", "mês", "h", "l"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" step="0.01" value={itemForm.quantidade || ""} onChange={e => setItemForm(f => ({ ...f, quantidade: Number(e.target.value) }))} /></div>
            <div><Label>Custo Material (R$)</Label><Input type="number" step="0.01" value={itemForm.custo_material || ""} onChange={e => setItemForm(f => ({ ...f, custo_material: Number(e.target.value) }))} /></div>
            <div><Label>Custo Mão de Obra (R$)</Label><Input type="number" step="0.01" value={itemForm.custo_mao_obra || ""} onChange={e => setItemForm(f => ({ ...f, custo_mao_obra: Number(e.target.value) }))} /></div>
            <div><Label>Custo Equipamento (R$)</Label><Input type="number" step="0.01" value={itemForm.custo_equipamento || ""} onChange={e => setItemForm(f => ({ ...f, custo_equipamento: Number(e.target.value) }))} /></div>
            <div>
              <Label>Custo Unitário Total</Label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
                {fmtBRL(itemForm.custo_material + itemForm.custo_mao_obra + itemForm.custo_equipamento)}
              </div>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea value={itemForm.observacoes} onChange={e => setItemForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
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
