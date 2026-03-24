import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Settings2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Bell,
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type ContaPagar = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  fornecedor_id: string | null;
  obra_id: string | null;
  empresa_id: string;
  categoria: string | null;
  forma_pagamento: string | null;
  documento: string | null;
  data_pagamento: string | null;
  valor_pago: number | null;
};

type ContaReceber = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  cliente: string | null;
  obra_id: string | null;
  empresa_id: string;
  categoria: string | null;
  data_recebimento: string | null;
  valor_recebido: number | null;
};

function gerarICS(contas: ContaPagar[], diasAntecedencia: number): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Irmaos Ubero//Financeiro//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  contas.forEach((c) => {
    const venc = parseISO(c.data_vencimento);
    const alerta = addDays(venc, -diasAntecedencia);
    const uid = `${c.id}@irmaos-ubero`;
    const dtVenc = format(venc, "yyyyMMdd");
    const dtAlerta = format(alerta, "yyyyMMdd");
    const valor = c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${dtVenc}`,
      `DTEND;VALUE=DATE:${dtVenc}`,
      `SUMMARY:💰 Vencimento: ${c.descricao}`,
      `DESCRIPTION:Valor: ${valor}\\nCategoria: ${c.categoria || "N/A"}\\nDoc: ${c.documento || "N/A"}`,
      "STATUS:CONFIRMED",
      `BEGIN:VALARM`,
      `TRIGGER;VALUE=DATE-TIME:${dtAlerta}T080000Z`,
      `ACTION:DISPLAY`,
      `DESCRIPTION:Conta a pagar vence em ${diasAntecedencia} dias: ${c.descricao} - ${valor}`,
      `END:VALARM`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(contas: ContaPagar[], dias: number) {
  const ics = gerarICS(contas, dias);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contas_a_pagar_${format(new Date(), "yyyy-MM")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Financeiro() {
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; razao_social: string }[]>([]);
  const [empresaSel, setEmpresaSel] = useState("todas");
  const [diasAntecedencia, setDiasAntecedencia] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: cp }, { data: cr }, { data: emp }] = await Promise.all([
      supabase.from("contas_pagar").select("*").order("data_vencimento"),
      supabase.from("contas_receber").select("*").order("data_vencimento"),
      supabase.from("empresas").select("id, razao_social").eq("ativo", true),
    ]);
    setContasPagar(cp || []);
    setContasReceber(cr || []);
    setEmpresas(emp || []);
    setLoading(false);
  }

  const filtradas = useMemo(() => {
    let cp = contasPagar;
    if (empresaSel !== "todas") cp = cp.filter((c) => c.empresa_id === empresaSel);
    return cp;
  }, [contasPagar, empresaSel]);

  const filtradasReceber = useMemo(() => {
    let cr = contasReceber;
    if (empresaSel !== "todas") cr = cr.filter((c) => c.empresa_id === empresaSel);
    return cr;
  }, [contasReceber, empresaSel]);

  const hoje = new Date();

  const atrasadas = filtradas.filter(
    (c) => c.status === "pendente" && differenceInDays(hoje, parseISO(c.data_vencimento)) > 0
  );
  const vencendoHoje = filtradas.filter(
    (c) => c.status === "pendente" && differenceInDays(hoje, parseISO(c.data_vencimento)) === 0
  );
  const proximas = filtradas.filter(
    (c) =>
      c.status === "pendente" &&
      differenceInDays(parseISO(c.data_vencimento), hoje) > 0 &&
      differenceInDays(parseISO(c.data_vencimento), hoje) <= diasAntecedencia
  );
  const pendentes = filtradas.filter((c) => c.status === "pendente");
  const pagas = filtradas.filter((c) => c.status === "pago");

  const totalPagar = pendentes.reduce((s, c) => s + c.valor, 0);
  const totalReceber = filtradasReceber
    .filter((c) => c.status === "pendente")
    .reduce((s, c) => s + c.valor, 0);
  const saldo = totalReceber - totalPagar;

  const contasParaCalendario = filtradas.filter((c) => c.status === "pendente");

  const statusBadge = (c: ContaPagar) => {
    const dias = differenceInDays(hoje, parseISO(c.data_vencimento));
    if (c.status === "pago") return <Badge className="bg-emerald-600 text-white">Pago</Badge>;
    if (dias > 0) return <Badge variant="destructive">{dias}d atrasado</Badge>;
    if (dias === 0) return <Badge className="bg-amber-500 text-white">Vence Hoje</Badge>;
    return <Badge variant="outline">{Math.abs(dias)}d restantes</Badge>;
  };

  async function marcarPago(id: string) {
    const { error } = await supabase
      .from("contas_pagar")
      .update({ status: "pago", data_pagamento: format(hoje, "yyyy-MM-dd") })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta marcada como paga!" });
      loadData();
    }
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa</label>
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              <Settings2 className="inline h-3 w-3 mr-1" />
              Antecedência (dias)
            </label>
            <Input
              type="number"
              min={1}
              max={30}
              value={diasAntecedencia}
              onChange={(e) => setDiasAntecedencia(Number(e.target.value) || 7)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => downloadICS(contasParaCalendario, diasAntecedencia)}
            disabled={contasParaCalendario.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Calendário (.ics)
          </Button>
        </div>

        {/* Alertas */}
        {atrasadas.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{atrasadas.length} conta(s) em atraso!</AlertTitle>
            <AlertDescription>
              Total em atraso: {fmt(atrasadas.reduce((s, c) => s + c.valor, 0))}
            </AlertDescription>
          </Alert>
        )}
        {vencendoHoje.length > 0 && (
          <Alert className="border-amber-500 bg-amber-50 text-amber-900">
            <Bell className="h-4 w-4 text-amber-600" />
            <AlertTitle>{vencendoHoje.length} conta(s) vencem hoje!</AlertTitle>
            <AlertDescription>
              Total: {fmt(vencendoHoje.reduce((s, c) => s + c.valor, 0))}
            </AlertDescription>
          </Alert>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> A Pagar</CardDescription>
              <CardTitle className="text-xl text-destructive">{fmt(totalPagar)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> A Receber</CardDescription>
              <CardTitle className="text-xl text-emerald-600">{fmt(totalReceber)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Saldo Projetado</CardDescription>
              <CardTitle className={`text-xl ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {fmt(saldo)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Atrasadas</CardDescription>
              <CardTitle className="text-xl text-destructive">{atrasadas.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Mural de Recados */}
        {proximas.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Mural — Vencimentos Próximos ({diasAntecedencia} dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {proximas.map((c) => {
                  const dias = differenceInDays(parseISO(c.data_vencimento), hoje);
                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-3 space-y-1 ${
                        dias <= 2 ? "border-destructive/50 bg-destructive/5" : "border-border"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium leading-tight">{c.descricao}</p>
                        <Badge variant="outline" className="ml-2 shrink-0">{dias}d</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(c.data_vencimento), "dd/MM/yyyy")} • {c.categoria || "Sem categoria"}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{fmt(c.valor)}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => marcarPago(c.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pagar">
          <TabsList>
            <TabsTrigger value="pagar">Contas a Pagar ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="pagas">Pagas ({pagas.length})</TabsTrigger>
            <TabsTrigger value="receber">Contas a Receber ({filtradasReceber.filter((c) => c.status === "pendente").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pagar">
            <Card>
              <CardContent className="pt-4">
                {pendentes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma conta pendente.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendentes.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.descricao}</TableCell>
                          <TableCell>{c.categoria || "—"}</TableCell>
                          <TableCell>{format(parseISO(c.data_vencimento), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-right">{fmt(c.valor)}</TableCell>
                          <TableCell>{statusBadge(c)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => marcarPago(c.id)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pagas">
            <Card>
              <CardContent className="pt-4">
                {pagas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma conta paga.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagas.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.descricao}</TableCell>
                          <TableCell>{c.categoria || "—"}</TableCell>
                          <TableCell>{format(parseISO(c.data_vencimento), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{c.data_pagamento ? format(parseISO(c.data_pagamento), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell className="text-right">{fmt(c.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receber">
            <Card>
              <CardContent className="pt-4">
                {filtradasReceber.filter((c) => c.status === "pendente").length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma conta a receber pendente.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtradasReceber
                        .filter((c) => c.status === "pendente")
                        .map((c) => {
                          const dias = differenceInDays(hoje, parseISO(c.data_vencimento));
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.descricao}</TableCell>
                              <TableCell>{c.cliente || "—"}</TableCell>
                              <TableCell>{format(parseISO(c.data_vencimento), "dd/MM/yyyy")}</TableCell>
                              <TableCell className="text-right">{fmt(c.valor)}</TableCell>
                              <TableCell>
                                {dias > 0 ? (
                                  <Badge variant="destructive">{dias}d atrasado</Badge>
                                ) : dias === 0 ? (
                                  <Badge className="bg-amber-500 text-white">Vence Hoje</Badge>
                                ) : (
                                  <Badge variant="outline">{Math.abs(dias)}d restantes</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
