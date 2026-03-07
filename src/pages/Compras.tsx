import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShoppingCart, Plus, Search, FileDown, Package, CreditCard, TrendingUp, Eye,
  CheckCircle2, XCircle, FileText, BarChart3,
} from "lucide-react";
import { CompraForm } from "@/components/compras/CompraForm";
import { ImportadorArquivos } from "@/components/compras/ImportadorArquivos";
import { Compra, CompraStatus, STATUS_LABELS, STATUS_COLORS, ORIGEM_LABELS } from "@/components/compras/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const OBRAS_MOCK = ["Edifício Aurora", "Residencial Monte Verde", "Condomínio Solar", "Galpão Industrial BK"];

const COMPRAS_MOCK: Compra[] = [
  {
    id: "1", numero: "CP-001", fornecedor: "Aço Brasil Ltda", cnpjFornecedor: "12.345.678/0001-90",
    dataEmissao: "2025-06-01", dataEntrega: "2025-06-05", obra: "Edifício Aurora",
    status: "recebida", origem: "xml", formaPagamento: "boleto", parcelas: 3,
    observacoes: "", nfeNumero: "12345",
    itens: [
      { id: "i1", descricao: "Vergalhão CA-50 10mm", unidade: "kg", quantidade: 5000, valorUnitario: 6.5, subtotal: 32500, categoria: "Aço e Ferragens" },
      { id: "i2", descricao: "Arame recozido 18", unidade: "kg", quantidade: 200, valorUnitario: 12, subtotal: 2400, categoria: "Aço e Ferragens" },
    ],
    totalCompra: 34900,
  },
  {
    id: "2", numero: "CP-002", fornecedor: "Concreteira Max", cnpjFornecedor: "98.765.432/0001-10",
    dataEmissao: "2025-06-10", dataEntrega: "2025-06-12", obra: "Residencial Monte Verde",
    status: "aprovada", origem: "manual", formaPagamento: "pix", parcelas: 1,
    observacoes: "Entrega programada para segunda",
    itens: [
      { id: "i3", descricao: "Cimento CP-II 50kg", unidade: "sc", quantidade: 300, valorUnitario: 38, subtotal: 11400, categoria: "Cimento e Argamassa" },
    ],
    totalCompra: 11400,
  },
  {
    id: "3", numero: "CP-003", fornecedor: "EPI Segurança Total", cnpjFornecedor: "11.222.333/0001-44",
    dataEmissao: "2025-06-15", dataEntrega: "", obra: "Edifício Aurora",
    status: "pendente", origem: "manual", formaPagamento: "boleto", parcelas: 1,
    observacoes: "",
    itens: [
      { id: "i4", descricao: "Capacete classe B", unidade: "un", quantidade: 50, valorUnitario: 45, subtotal: 2250, categoria: "EPI" },
      { id: "i5", descricao: "Luva de raspa", unidade: "un", quantidade: 100, valorUnitario: 18, subtotal: 1800, categoria: "EPI" },
      { id: "i6", descricao: "Botina de segurança", unidade: "un", quantidade: 30, valorUnitario: 95, subtotal: 2850, categoria: "EPI" },
    ],
    totalCompra: 6900,
  },
];

export default function Compras() {
  const [compras, setCompras] = useState<Compra[]>(COMPRAS_MOCK);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [detalhesCompra, setDetalhesCompra] = useState<Compra | null>(null);
  const [filtroObra, setFiltroObra] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");

  const filtered = useMemo(() => {
    return compras.filter((c) => {
      if (filtroObra !== "todas" && c.obra !== filtroObra) return false;
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return c.fornecedor.toLowerCase().includes(q) || c.numero.toLowerCase().includes(q) || c.itens.some((i) => i.descricao.toLowerCase().includes(q));
      }
      return true;
    });
  }, [compras, filtroObra, filtroStatus, busca]);

  const kpis = useMemo(() => {
    const totalMes = compras.reduce((s, c) => s + c.totalCompra, 0);
    const pendentes = compras.filter((c) => c.status === "pendente").length;
    const recebidas = compras.filter((c) => c.status === "recebida").length;
    const totalItens = compras.reduce((s, c) => s + c.itens.length, 0);
    return { totalMes, pendentes, recebidas, totalItens };
  }, [compras]);

  const handleSave = (compra: Compra) => {
    setCompras([compra, ...compras]);
    setShowForm(false);
    toast.success("Compra registrada com sucesso!");
  };

  const handleImport = (data: Partial<Compra>) => {
    setShowImport(false);
    setShowForm(true);
    toast.info("Dados importados. Complete o cadastro da compra.");
  };

  const updateStatus = (id: string, status: CompraStatus) => {
    setCompras(compras.map((c) => (c.id === id ? { ...c, status } : c)));
    if (status === "recebida") toast.success("Compra recebida — itens disponíveis no Estoque e lançamento gerado no Financeiro.");
    if (status === "aprovada") toast.success("Compra aprovada — aguardando recebimento.");
    if (status === "cancelada") toast.info("Compra cancelada.");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Compras", 14, 20);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 27);

    autoTable(doc, {
      startY: 35,
      head: [["Nº", "Fornecedor", "Obra", "Data", "Total", "Status", "Origem"]],
      body: filtered.map((c) => [
        c.numero, c.fornecedor, c.obra,
        new Date(c.dataEmissao).toLocaleDateString("pt-BR"),
        c.totalCompra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        STATUS_LABELS[c.status], ORIGEM_LABELS[c.origem],
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 80, 36] },
    });

    doc.save("relatorio-compras.pdf");
  };

  const exportExcel = () => {
    const data = filtered.map((c) => ({
      Número: c.numero, Fornecedor: c.fornecedor, CNPJ: c.cnpjFornecedor,
      Obra: c.obra, "Data Emissão": c.dataEmissao, "NF-e": c.nfeNumero || "",
      Total: c.totalCompra, Status: STATUS_LABELS[c.status], Origem: ORIGEM_LABELS[c.origem],
      Pagamento: c.formaPagamento, Parcelas: c.parcelas,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    XLSX.writeFile(wb, "relatorio-compras.xlsx");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />Compras
            </h1>
            <p className="text-sm text-muted-foreground">Gestão de compras integrada ao Estoque e Financeiro</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <FileText className="h-4 w-4 mr-1" />Importar XML/PDF
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Nova Compra
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total em Compras</p>
                  <p className="text-lg font-bold">{kpis.totalMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2.5"><ShoppingCart className="h-5 w-5 text-warning" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-lg font-bold">{kpis.pendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2.5"><CheckCircle2 className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Recebidas</p>
                  <p className="text-lg font-bold">{kpis.recebidas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2.5"><Package className="h-5 w-5 text-accent" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Itens Comprados</p>
                  <p className="text-lg font-bold">{kpis.totalItens}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Dialog */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Importar Nota Fiscal</DialogTitle></DialogHeader>
            <ImportadorArquivos onImport={handleImport} obras={OBRAS_MOCK} />
          </DialogContent>
        </Dialog>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Compra — Lançamento Manual</DialogTitle></DialogHeader>
            <CompraForm onSave={handleSave} onCancel={() => setShowForm(false)} obras={OBRAS_MOCK} />
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={!!detalhesCompra} onOpenChange={() => setDetalhesCompra(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {detalhesCompra && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {detalhesCompra.numero} — {detalhesCompra.fornecedor}
                    <Badge className={STATUS_COLORS[detalhesCompra.status]}>{STATUS_LABELS[detalhesCompra.status]}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">CNPJ:</span><br />{detalhesCompra.cnpjFornecedor || "—"}</div>
                    <div><span className="text-muted-foreground">NF-e:</span><br />{detalhesCompra.nfeNumero || "—"}</div>
                    <div><span className="text-muted-foreground">Obra:</span><br />{detalhesCompra.obra}</div>
                    <div><span className="text-muted-foreground">Emissão:</span><br />{new Date(detalhesCompra.dataEmissao).toLocaleDateString("pt-BR")}</div>
                    <div><span className="text-muted-foreground">Pagamento:</span><br />{detalhesCompra.formaPagamento} ({detalhesCompra.parcelas}x)</div>
                    <div><span className="text-muted-foreground">Origem:</span><br />{ORIGEM_LABELS[detalhesCompra.origem]}</div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor Un.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalhesCompra.itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{item.categoria}</Badge></TableCell>
                          <TableCell className="text-right">{item.quantidade} {item.unidade}</TableCell>
                          <TableCell className="text-right">{item.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                          <TableCell className="text-right font-medium">{item.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center border-t pt-3">
                    <div className="flex gap-2">
                      {detalhesCompra.status === "pendente" && (
                        <>
                          <Button size="sm" onClick={() => { updateStatus(detalhesCompra.id, "aprovada"); setDetalhesCompra(null); }}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { updateStatus(detalhesCompra.id, "cancelada"); setDetalhesCompra(null); }}>
                            <XCircle className="h-4 w-4 mr-1" />Cancelar
                          </Button>
                        </>
                      )}
                      {detalhesCompra.status === "aprovada" && (
                        <Button size="sm" onClick={() => { updateStatus(detalhesCompra.id, "recebida"); setDetalhesCompra(null); }}>
                          <Package className="h-4 w-4 mr-1" />Confirmar Recebimento
                        </Button>
                      )}
                    </div>
                    <span className="text-xl font-bold">{detalhesCompra.totalCompra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por fornecedor, nº ou item..." className="pl-9" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filtroObra} onValueChange={setFiltroObra}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as obras</SelectItem>
                    {OBRAS_MOCK.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="recebida">Recebida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
                <Button variant="outline" size="sm" onClick={exportExcel}><BarChart3 className="h-4 w-4 mr-1" />Excel</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma compra encontrada.</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetalhesCompra(c)}>
                        <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                        <TableCell className="font-medium">{c.fornecedor}</TableCell>
                        <TableCell className="text-sm">{c.obra}</TableCell>
                        <TableCell className="text-sm">{new Date(c.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{ORIGEM_LABELS[c.origem]}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{c.totalCompra.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                        <TableCell><Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetalhesCompra(c); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Integration Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><Package className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="font-semibold text-sm">Integração com Estoque</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ao confirmar o recebimento de uma compra, os itens são automaticamente adicionados ao estoque da obra selecionada, atualizando quantidades e valores médios.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><CreditCard className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="font-semibold text-sm">Integração com Financeiro</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Cada compra aprovada gera automaticamente contas a pagar no módulo Financeiro, respeitando a forma de pagamento e o parcelamento definido.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
