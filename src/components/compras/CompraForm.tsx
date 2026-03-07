import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { Compra, ItemCompra, CATEGORIAS_MATERIAL, UNIDADES, FormaPagamento } from "./types";

interface CompraFormProps {
  onSave: (compra: Compra) => void;
  onCancel: () => void;
  obras: string[];
}

export function CompraForm({ onSave, onCancel, obras }: CompraFormProps) {
  const [fornecedor, setFornecedor] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split("T")[0]);
  const [dataEntrega, setDataEntrega] = useState("");
  const [obra, setObra] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("boleto");
  const [parcelas, setParcelas] = useState(1);
  const [observacoes, setObservacoes] = useState("");
  const [nfeNumero, setNfeNumero] = useState("");
  const [itens, setItens] = useState<ItemCompra[]>([
    { id: crypto.randomUUID(), descricao: "", unidade: "un", quantidade: 1, valorUnitario: 0, subtotal: 0, categoria: "Outros" },
  ]);

  const addItem = () => {
    setItens([...itens, { id: crypto.randomUUID(), descricao: "", unidade: "un", quantidade: 1, valorUnitario: 0, subtotal: 0, categoria: "Outros" }]);
  };

  const removeItem = (id: string) => {
    if (itens.length > 1) setItens(itens.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemCompra, value: string | number) => {
    setItens(itens.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.subtotal = updated.quantidade * updated.valorUnitario;
      return updated;
    }));
  };

  const totalCompra = itens.reduce((sum, i) => sum + i.subtotal, 0);

  const handleSave = () => {
    if (!fornecedor || !obra) return;
    const compra: Compra = {
      id: crypto.randomUUID(),
      numero: `CP-${Date.now().toString(36).toUpperCase()}`,
      fornecedor,
      cnpjFornecedor: cnpj,
      dataEmissao,
      dataEntrega,
      obra,
      status: "pendente",
      origem: "manual",
      formaPagamento,
      parcelas,
      observacoes,
      itens,
      totalCompra,
      nfeNumero,
    };
    onSave(compra);
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
            <Label>Obra *</Label>
            <Select value={obra} onValueChange={setObra}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {obras.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
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
          <div className="md:col-span-3">
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
        <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />Salvar Compra</Button>
      </div>
    </div>
  );
}
