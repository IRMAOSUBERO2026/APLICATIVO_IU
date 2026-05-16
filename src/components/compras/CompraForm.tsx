import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { CATEGORIAS_MATERIAL, UNIDADES, Compra } from "./types";
import { ObraOption, EmpresaOption } from "@/hooks/useCompras";

interface ItemForm {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
  categoria: string;
}

interface CompraFormProps {
  onSave: (data: {
    empresa_id: string;
    obra_id?: string;
    fornecedor_nome: string;
    fornecedor_cnpj?: string;
    nfe_numero?: string;
    data_emissao: string;
    data_entrega?: string;
    origem: string;
    forma_pagamento?: string;
    parcelas?: number;
    observacoes?: string;
    itens: { descricao: string; categoria?: string; unidade: string; quantidade: number; valor_unitario: number; subtotal: number }[];
  }) => void;
  onCancel: () => void;
  obras: ObraOption[];
  empresas: EmpresaOption[];
  isSaving?: boolean;
  initialData?: Partial<Compra> | null;
}

export function CompraForm({ onSave, onCancel, obras, empresas, isSaving, initialData }: CompraFormProps) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id || "");
  const [fornecedor, setFornecedor] = useState(initialData?.fornecedor || "");
  const [cnpj, setCnpj] = useState(initialData?.cnpjFornecedor || "");
  const [dataEmissao, setDataEmissao] = useState(initialData?.dataEmissao || new Date().toISOString().split("T")[0]);
  const [dataEntrega, setDataEntrega] = useState("");
  const [obraId, setObraId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("boleto");
  const [parcelas, setParcelas] = useState(1);
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || "");
  const [nfeNumero, setNfeNumero] = useState(initialData?.nfeNumero || "");
  const [itens, setItens] = useState<ItemForm[]>(
    initialData?.itens && initialData.itens.length > 0
      ? initialData.itens.map(i => ({
          id: i.id || crypto.randomUUID(),
          descricao: i.descricao,
          unidade: i.unidade || "un",
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
          subtotal: i.subtotal,
          categoria: i.categoria || "Outros",
        }))
      : [{ id: crypto.randomUUID(), descricao: "", unidade: "un", quantidade: 1, valorUnitario: 0, subtotal: 0, categoria: "Outros" }]
  );

  const addItem = () => {
    setItens([...itens, { id: crypto.randomUUID(), descricao: "", unidade: "un", quantidade: 1, valorUnitario: 0, subtotal: 0, categoria: "Outros" }]);
  };

  const removeItem = (id: string) => {
    if (itens.length > 1) setItens(itens.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemForm, value: string | number) => {
    setItens(itens.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.subtotal = updated.quantidade * updated.valorUnitario;
      return updated;
    }));
  };

  const totalCompra = itens.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSave = () => {
    if (!fornecedor || !empresaId) return;
    onSave({
      empresa_id: empresaId,
      obra_id: obraId || undefined,
      fornecedor_nome: fornecedor,
      fornecedor_cnpj: cnpj || undefined,
      nfe_numero: nfeNumero || undefined,
      data_emissao: dataEmissao,
      data_entrega: dataEntrega || undefined,
      origem: "manual",
      forma_pagamento: formaPagamento,
      parcelas,
      observacoes: observacoes || undefined,
      itens: itens.filter(i => i.descricao).map(i => ({
        descricao: i.descricao,
        categoria: i.categoria,
        unidade: i.unidade,
        quantidade: i.quantidade,
        valor_unitario: i.valorUnitario,
        subtotal: i.subtotal,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados do Fornecedor</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Fornecedor *</Label>
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Razão social" />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <Label>Nº NF-e</Label>
            <Input value={nfeNumero} onChange={(e) => setNfeNumero(e.target.value)} placeholder="Número da nota" />
          </div>
          <div>
            <Label>Data Emissão *</Label>
            <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
          </div>
          <div>
            <Label>Data Entrega</Label>
            <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Destino e Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Empresa *</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Obra</Label>
            <Select value={obraId} onValueChange={setObraId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Parcelas</Label>
            <Input type="number" min={1} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações da compra..." rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens da Compra</CardTitle>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Adicionar Item</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor Un.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value)} placeholder="Material..." className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Select value={item.categoria} onValueChange={(v) => updateItem(item.id, "categoria", v)}>
                        <SelectTrigger className="h-8 text-sm w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIAS_MATERIAL.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={item.unidade} onValueChange={(v) => updateItem(item.id, "unidade", v)}>
                        <SelectTrigger className="h-8 text-sm w-[70px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} value={item.quantidade} onChange={(e) => updateItem(item.id, "quantidade", Number(e.target.value))} className="h-8 text-sm text-right w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step={0.01} value={item.valorUnitario} onChange={(e) => updateItem(item.id, "valorUnitario", Number(e.target.value))} className="h-8 text-sm text-right w-[100px]" />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {item.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end mt-4 border-t pt-3">
            <span className="text-lg font-bold">Total: {totalCompra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaving}><Save className="h-4 w-4 mr-1" />{isSaving ? "Salvando..." : "Salvar Compra"}</Button>
      </div>
    </div>
  );
}
