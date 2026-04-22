import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, Plus, Search, FileDown, Package, TrendingUp, Eye,
  CheckCircle2, XCircle, FileText, BarChart3,
} from "lucide-react";
import { CompraForm } from "@/components/compras/CompraForm";
import { ImportadorArquivos } from "@/components/compras/ImportadorArquivos";
import { ConferenciaRecebimento } from "@/components/compras/ConferenciaRecebimento";
import { CompraStatus, STATUS_LABELS, STATUS_COLORS, ORIGEM_LABELS, OrigemLancamento } from "@/components/compras/types";
import { useCompras, useEmpresas, useObras, useCreateCompra, useUpdateCompraStatus, CompraDB } from "@/hooks/useCompras";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Compras() {
  const { data: compras = [], isLoading } = useCompras();
  const { data: empresas = [] } = useEmpresas();
  const { data: obras = [] } = useObras();
  const createCompra = useCreateCompra();
  const updateStatus = useUpdateCompraStatus();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [detalhesCompra, setDetalhesCompra] = useState<CompraDB | null>(null);
  const [conferenciaCompra, setConferenciaCompra] = useState<CompraDB | null>(null);
  const [filtroObra, setFiltroObra] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");

  const filtered = useMemo(() => {
    return compras.filter((c) => {
      if (filtroObra !== "todas" && c.obra_id !== filtroObra) return false;
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const fornNome = c.fornecedores?.razao_social?.toLowerCase() || "";
        const itensMatch = c.itens_compra?.some((i) => i.descricao.toLowerCase().includes(q)) || false;
        return fornNome.includes(q) || c.numero.toLowerCase().includes(q) || itensMatch;
      }
      return true;
    });
  }, [compras, filtroObra, filtroStatus, busca]);

  const kpis = useMemo(() => {
    const totalMes = compras.reduce((s, c) => s + (c.total || 0), 0);
    const pendentes = compras.filter((c) => c.status === "pendente").length;
    const recebidas = compras.filter((c) => c.status === "recebida").length;
    const totalItens = compras.reduce((s, c) => s + (c.itens_compra?.length || 0), 0);
    return { totalMes, pendentes, recebidas, totalItens };
  }, [compras]);

  const handleSave = (data: Parameters<typeof createCompra.mutate>[0]) => {
    createCompra.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleImport = () => {
    setShowImport(false);
    setShowForm(true);
  };

  const handleUpdateStatus = (id: string, status: CompraStatus) => {
    updateStatus.mutate({ id, status });
    setDetalhesCompra(null);
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
        c.numero,
        c.fornecedores?.razao_social || "—",
        c.obras?.nome || "—",
        new Date(c.data_emissao).toLocaleDateString("pt-BR"),
        (c.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        STATUS_LABELS[c.status as CompraStatus] || c.status,
        ORIGEM_LABELS[c.origem as OrigemLancamento] || c.origem,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 80, 36] },
    });
    doc.save("relatorio-compras.pdf");
  };

  const exportExcel = () => {
    const data = filtered.map((c) => ({
      Número: c.numero,
      Fornecedor: c.fornecedores?.razao_social || "",
      CNPJ: c.fornecedores?.cnpj || "",
      Obra: c.obras?.nome || "",
      "Data Emissão": c.data_emissao,
      "NF-e": c.nfe_numero || "",
      Total: c.total,
      Status: STATUS_LABELS[c.status as CompraStatus] || c.status,
      Origem: ORIGEM_LABELS[c.origem as OrigemLancamento] || c.origem,
      Pagamento: c.forma_pagamento || "",
      Parcelas: c.parcelas || 1,
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
                <div className="rounded-lg bg-orange-500/10 p-2.5"><ShoppingCart className="h-5 w-5 text-orange-500" /></div>
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
                <div className="rounded-lg bg-green-500/10 p-2.5"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
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
                <div className="rounded-lg bg-blue-500/10 p-2.5"><Package className="h-5 w-5 text-blue-500" /></div>
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
            <ImportadorArquivos onImport={handleImport} obras={obras.map(o => o.nome)} />
          </DialogContent>
        </Dialog>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Compra — Lançamento Manual</DialogTitle></DialogHeader>
            <CompraForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              obras={obras}
              empresas={empresas}
              isSaving={createCompra.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={!!detalhesCompra} onOpenChange={() => setDetalhesCompra(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {detalhesCompra && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {detalhesCompra.numero} — {detalhesCompra.fornecedores?.razao_social || "Sem fornecedor"}
                    <Badge className={STATUS_COLORS[detalhesCompra.status as CompraStatus] || ""}>{STATUS_LABELS[detalhesCompra.status as CompraStatus] || detalhesCompra.status}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">CNPJ:</span><br />{detalhesCompra.fornecedores?.cnpj || "—"}</div>
                    <div><span className="text-muted-foreground">NF-e:</span><br />{detalhesCompra.nfe_numero || "—"}</div>
                    <div><span className="text-muted-foreground">Obra:</span><br />{detalhesCompra.obras?.nome || "—"}</div>
                    <div><span className="text-muted-foreground">Emissão:</span><br />{new Date(detalhesCompra.data_emissao).toLocaleDateString("pt-BR")}</div>
                    <div><span className="text-muted-foreground">Pagamento:</span><br />{detalhesCompra.forma_pagamento || "—"} ({detalhesCompra.parcelas || 1}x)</div>
                    <div><span className="text-muted-foreground">Origem:</span><br />{ORIGEM_LABELS[detalhesCompra.origem as OrigemLancamento] || detalhesCompra.origem}</div>
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
                      {(detalhesCompra.itens_compra || []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{item.categoria || "—"}</Badge></TableCell>
                          <TableCell className="text-right">{item.quantidade} {item.unidade}</TableCell>
                          <TableCell className="text-right">{item.valor_unitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                          <TableCell className="text-right font-medium">{item.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center border-t pt-3">
                    <div className="flex gap-2">
                      {detalhesCompra.status === "pendente" && (
                        <>
                          <Button size="sm" onClick={() => handleUpdateStatus(detalhesCompra.id, "aprovada")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(detalhesCompra.id, "cancelada")}>
                            <XCircle className="h-4 w-4 mr-1" />Cancelar
                          </Button>
                        </>
                      )}
                      {detalhesCompra.status === "aprovada" && (
                        <Button size="sm" onClick={() => { const c = detalhesCompra; setDetalhesCompra(null); setConferenciaCompra(c); }}>
                          <Package className="h-4 w-4 mr-1" />Conferir e Receber
                        </Button>
                      )}
                    </div>
                    <span className="text-xl font-bold">{(detalhesCompra.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {conferenciaCompra && (
          <ConferenciaRecebimento
            compraId={conferenciaCompra.id}
            obraId={conferenciaCompra.obra_id}
            open={!!conferenciaCompra}
            onClose={() => setConferenciaCompra(null)}
            onCompleted={() => { /* react-query auto-invalidate via mutation; refetch via window */ window.location.reload(); }}
          />
        )}

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
                    {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
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
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
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
                          <TableCell className="font-medium">{c.fornecedores?.razao_social || "—"}</TableCell>
                          <TableCell className="text-sm">{c.obras?.nome || "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(c.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{ORIGEM_LABELS[c.origem as OrigemLancamento] || c.origem}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{(c.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                          <TableCell><Badge className={`text-xs ${STATUS_COLORS[c.status as CompraStatus] || ""}`}>{STATUS_LABELS[c.status as CompraStatus] || c.status}</Badge></TableCell>
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
