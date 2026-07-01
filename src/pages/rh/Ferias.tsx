import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, AlertTriangle, Clock, CheckCircle, Download, Plus, Search, Filter, Users } from "lucide-react";
import { format, addMonths, addDays, differenceInDays, isBefore, isAfter, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  obra: string;
  dataAdmissao: string;
  status: "Ativo" | "Desligado";
}

interface Ferias {
  id: string;
  funcionarioId: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  periodoConcesivoFim: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  status: "Planejada" | "Em férias" | "Finalizada";
  parcela: number;
  totalParcelas: number;
}

const mockFuncionarios: Funcionario[] = [
  { id: "1", nome: "João Silva", cpf: "123.456.789-00", cargo: "Pedreiro", obra: "Ed. Aurora", dataAdmissao: "2024-03-01", status: "Ativo" },
  { id: "2", nome: "Maria Santos", cpf: "987.654.321-00", cargo: "Armador", obra: "Galpão Alfa", dataAdmissao: "2023-06-15", status: "Ativo" },
  { id: "3", nome: "Carlos Oliveira", cpf: "456.789.123-00", cargo: "Carpinteiro", obra: "Ed. Aurora", dataAdmissao: "2023-01-10", status: "Ativo" },
  { id: "4", nome: "Ana Souza", cpf: "321.654.987-00", cargo: "Servente", obra: "Res. Sol Nascente", dataAdmissao: "2024-08-20", status: "Ativo" },
  { id: "5", nome: "Pedro Lima", cpf: "654.987.321-00", cargo: "Encarregado", obra: "Ponte BR-101", dataAdmissao: "2022-11-05", status: "Ativo" },
  { id: "6", nome: "Luciana Costa", cpf: "789.123.456-00", cargo: "Técnico Seg.", obra: "Ed. Aurora", dataAdmissao: "2023-09-01", status: "Ativo" },
];

const today = new Date();

function calcularPeriodoAquisitivo(dataAdmissao: string): { inicio: Date; fim: Date; concessivoFim: Date; vencido: boolean; diasParaVencer: number } {
  const admissao = new Date(dataAdmissao);
  let inicio = new Date(admissao);
  while (addMonths(inicio, 12) <= today) {
    inicio = addMonths(inicio, 12);
  }
  const fim = addMonths(inicio, 12);
  const concessivoFim = addMonths(fim, 12);
  const vencido = isBefore(concessivoFim, today);
  const diasParaVencer = differenceInDays(concessivoFim, today);
  return { inicio, fim, concessivoFim, vencido, diasParaVencer };
}

const mockFerias: Ferias[] = [
  { id: "f1", funcionarioId: "2", periodoAquisitivoInicio: "2024-06-15", periodoAquisitivoFim: "2025-06-15", periodoConcesivoFim: "2026-06-15", dataInicio: "2026-03-10", dataFim: "2026-03-20", dias: 10, status: "Em férias", parcela: 1, totalParcelas: 3 },
  { id: "f2", funcionarioId: "5", periodoAquisitivoInicio: "2024-11-05", periodoAquisitivoFim: "2025-11-05", periodoConcesivoFim: "2026-11-05", dataInicio: "2026-04-01", dataFim: "2026-04-30", dias: 30, status: "Planejada", parcela: 1, totalParcelas: 1 },
  { id: "f3", funcionarioId: "3", periodoAquisitivoInicio: "2024-01-10", periodoAquisitivoFim: "2025-01-10", periodoConcesivoFim: "2026-01-10", dataInicio: "2025-12-01", dataFim: "2025-12-30", dias: 30, status: "Finalizada", parcela: 1, totalParcelas: 1 },
];

export default function Ferias() {
  const [ferias, setFerias] = useState<Ferias[]>(mockFerias);
  const [filtroObra, setFiltroObra] = useState("todas");
  const [filtroCargo, setFiltroCargo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaFerias, setNovaFerias] = useState({ funcionarioId: "", dataInicio: "", dias: "30", parcela: "1", totalParcelas: "1" });

  const obras = [...new Set(mockFuncionarios.map(f => f.obra))];
  const cargos = [...new Set(mockFuncionarios.map(f => f.cargo))];

  const funcionariosAtivos = mockFuncionarios.filter(f => f.status === "Ativo");

  const feriasVencidas = useMemo(() => {
    return funcionariosAtivos.filter(f => {
      const pa = calcularPeriodoAquisitivo(f.dataAdmissao);
      return pa.vencido;
    });
  }, []);

  const feriasProximasVencer = useMemo(() => {
    return funcionariosAtivos.filter(f => {
      const pa = calcularPeriodoAquisitivo(f.dataAdmissao);
      return !pa.vencido && pa.diasParaVencer <= 90 && pa.diasParaVencer > 0;
    });
  }, []);

  const emFerias = ferias.filter(f => f.status === "Em férias");
  const planejadas = ferias.filter(f => f.status === "Planejada");

  const funcionariosFiltrados = funcionariosAtivos.filter(f => {
    if (filtroObra !== "todas" && f.obra !== filtroObra) return false;
    if (filtroCargo !== "todos" && f.cargo !== filtroCargo) return false;
    if (busca && !f.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const handleNovaFerias = () => {
    const func = mockFuncionarios.find(f => f.id === novaFerias.funcionarioId);
    if (!func) return;
    const pa = calcularPeriodoAquisitivo(func.dataAdmissao);
    const dataInicio = new Date(novaFerias.dataInicio);
    const dataFim = addDays(dataInicio, parseInt(novaFerias.dias) - 1);
    const nova: Ferias = {
      id: `f${Date.now()}`,
      funcionarioId: novaFerias.funcionarioId,
      periodoAquisitivoInicio: format(pa.inicio, "yyyy-MM-dd"),
      periodoAquisitivoFim: format(pa.fim, "yyyy-MM-dd"),
      periodoConcesivoFim: format(pa.concessivoFim, "yyyy-MM-dd"),
      dataInicio: novaFerias.dataInicio,
      dataFim: format(dataFim, "yyyy-MM-dd"),
      dias: parseInt(novaFerias.dias),
      status: "Planejada",
      parcela: parseInt(novaFerias.parcela),
      totalParcelas: parseInt(novaFerias.totalParcelas),
    };
    setFerias(prev => [...prev, nova]);
    setDialogOpen(false);
    setNovaFerias({ funcionarioId: "", dataInicio: "", dias: "30", parcela: "1", totalParcelas: "1" });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Férias — Irmãos Ubero Engenharia", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(today, "dd/MM/yyyy")}`, 14, 28);

    const rows = funcionariosFiltrados.map(f => {
      const pa = calcularPeriodoAquisitivo(f.dataAdmissao);
      const feriasFunc = ferias.filter(fe => fe.funcionarioId === f.id);
      const ultimaFerias = feriasFunc.length > 0 ? feriasFunc[feriasFunc.length - 1] : null;
      return [
        f.nome,
        f.obra,
        `${format(pa.inicio, "dd/MM/yy")} - ${format(pa.fim, "dd/MM/yy")}`,
        ultimaFerias ? `${ultimaFerias.dataInicio} a ${ultimaFerias.dataFim}` : "—",
        pa.vencido ? "VENCIDA" : pa.diasParaVencer <= 90 ? "Próx. vencer" : "Regular",
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [["Nome", "Obra", "Per. Aquisitivo", "Férias", "Status"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 80, 45] },
    });

    doc.save("relatorio-ferias.pdf");
  };

  const exportExcel = () => {
    const data = funcionariosFiltrados.map(f => {
      const pa = calcularPeriodoAquisitivo(f.dataAdmissao);
      const feriasFunc = ferias.filter(fe => fe.funcionarioId === f.id);
      const ultimaFerias = feriasFunc.length > 0 ? feriasFunc[feriasFunc.length - 1] : null;
      return {
        Nome: f.nome,
        CPF: f.cpf,
        Cargo: f.cargo,
        Obra: f.obra,
        "Per. Aquisitivo Início": format(pa.inicio, "dd/MM/yyyy"),
        "Per. Aquisitivo Fim": format(pa.fim, "dd/MM/yyyy"),
        "Concessivo Até": format(pa.concessivoFim, "dd/MM/yyyy"),
        "Férias Início": ultimaFerias?.dataInicio || "—",
        "Férias Fim": ultimaFerias?.dataFim || "—",
        Dias: ultimaFerias?.dias || "—",
        Status: pa.vencido ? "VENCIDA" : pa.diasParaVencer <= 90 ? "Próx. vencer" : "Regular",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Férias");
    XLSX.writeFile(wb, "relatorio-ferias.xlsx");
  };

  // Calendar data
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), i, 1);
    return { mes: i, nome: format(d, "MMM", { locale: ptBR }), dias: new Date(today.getFullYear(), i + 1, 0).getDate() };
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Controle de Férias</h1>
            <p className="text-sm text-muted-foreground">Gestão completa de férias dos funcionários</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}><Download className="mr-1 h-4 w-4" />PDF</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-1 h-4 w-4" />Excel</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" />Agendar Férias</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Agendar Férias</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Funcionário</Label>
                    <Select value={novaFerias.funcionarioId} onValueChange={v => setNovaFerias(p => ({ ...p, funcionarioId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {funcionariosAtivos.map(f => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Data Início</Label><Input type="date" value={novaFerias.dataInicio} onChange={e => setNovaFerias(p => ({ ...p, dataInicio: e.target.value }))} /></div>
                    <div><Label>Dias</Label><Input type="number" value={novaFerias.dias} onChange={e => setNovaFerias(p => ({ ...p, dias: e.target.value }))} min="5" max="30" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Parcela</Label><Input type="number" value={novaFerias.parcela} onChange={e => setNovaFerias(p => ({ ...p, parcela: e.target.value }))} min="1" max="3" /></div>
                    <div><Label>Total Parcelas</Label><Input type="number" value={novaFerias.totalParcelas} onChange={e => setNovaFerias(p => ({ ...p, totalParcelas: e.target.value }))} min="1" max="3" /></div>
                  </div>
                  <Button className="w-full" onClick={handleNovaFerias}>Confirmar Agendamento</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{feriasVencidas.length}</p>
                  <p className="text-xs text-muted-foreground">Férias Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-[hsl(var(--warning))]" />
                <div>
                  <p className="text-2xl font-bold">{feriasProximasVencer.length}</p>
                  <p className="text-xs text-muted-foreground">Próximas a Vencer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{planejadas.length}</p>
                  <p className="text-xs text-muted-foreground">Férias Planejadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{emFerias.length}</p>
                  <p className="text-xs text-muted-foreground">Em Férias Agora</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {(feriasVencidas.length > 0 || feriasProximasVencer.length > 0) && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <h3 className="mb-2 font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Alertas de Férias</h3>
              <div className="space-y-1 text-sm">
                {feriasVencidas.map(f => (
                  <p key={f.id} className="text-destructive font-medium">⚠️ {f.nome} — Férias VENCIDAS (Obra: {f.obra})</p>
                ))}
                {feriasProximasVencer.map(f => {
                  const pa = calcularPeriodoAquisitivo(f.dataAdmissao);
                  return <p key={f.id} className="text-[hsl(var(--warning))]">⏰ {f.nome} — Vence em {pa.diasParaVencer} dias (Obra: {f.obra})</p>;
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tabela">
          <TabsList>
            <TabsTrigger value="tabela">Tabela Geral</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
          </TabsList>

          <TabsContent value="tabela" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar funcionário..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <Select value={filtroObra} onValueChange={setFiltroObra}>
                <SelectTrigger className="w-[180px]"><Filter className="mr-1 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as obras</SelectItem>
                  {obras.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroCargo} onValueChange={setFiltroCargo}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os cargos</SelectItem>
                  {cargos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cargo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admissão</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Per. Aquisitivo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Concessivo Até</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dias p/ Vencer</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionariosFiltrados.map(f => {
                    const pa = calcularPeriodoAquisitivo(f.dataAdmissao);
                    const feriasFunc = ferias.filter(fe => fe.funcionarioId === f.id);
                    const emFeriasAgora = feriasFunc.some(fe => fe.status === "Em férias");
                    return (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{f.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.cargo}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.obra}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(f.dataAdmissao), "dd/MM/yyyy")}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{format(pa.inicio, "dd/MM/yy")} — {format(pa.fim, "dd/MM/yy")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(pa.concessivoFim, "dd/MM/yyyy")}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${pa.vencido ? "text-destructive" : pa.diasParaVencer <= 90 ? "text-[hsl(var(--warning))]" : "text-primary"}`}>
                            {pa.vencido ? "VENCIDA" : `${pa.diasParaVencer}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {emFeriasAgora ? <Badge className="bg-accent text-accent-foreground">Em férias</Badge>
                            : pa.vencido ? <Badge variant="destructive">Vencida</Badge>
                            : pa.diasParaVencer <= 90 ? <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">Atenção</Badge>
                            : <Badge variant="secondary">Regular</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="calendario">
            <Card>
              <CardHeader><CardTitle className="text-base">Calendário de Férias — {today.getFullYear()}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Header months */}
                    <div className="grid grid-cols-[180px_repeat(12,1fr)] gap-0 mb-2">
                      <div className="text-xs font-medium text-muted-foreground px-2">Funcionário</div>
                      {meses.map(m => (
                        <div key={m.mes} className="text-center text-xs font-medium text-muted-foreground uppercase">{m.nome}</div>
                      ))}
                    </div>
                    {/* Rows */}
                    {funcionariosAtivos.map(func => {
                      const feriasFunc = ferias.filter(f => f.funcionarioId === func.id);
                      return (
                        <div key={func.id} className="grid grid-cols-[180px_repeat(12,1fr)] gap-0 border-t py-1 items-center">
                          <div className="text-xs font-medium px-2 truncate">{func.nome}</div>
                          {meses.map(m => {
                            const mesInicio = new Date(today.getFullYear(), m.mes, 1);
                            const mesFim = new Date(today.getFullYear(), m.mes + 1, 0);
                            const temFerias = feriasFunc.some(f => {
                              const fi = new Date(f.dataInicio);
                              const ff = new Date(f.dataFim);
                              return !(isAfter(fi, mesFim) || isBefore(ff, mesInicio));
                            });
                            const statusFerias = feriasFunc.find(f => {
                              const fi = new Date(f.dataInicio);
                              const ff = new Date(f.dataFim);
                              return !(isAfter(fi, mesFim) || isBefore(ff, mesInicio));
                            });
                            return (
                              <div key={m.mes} className="h-6 mx-0.5 rounded-sm flex items-center justify-center">
                                {temFerias && (
                                  <div className={`w-full h-5 rounded-sm text-[10px] flex items-center justify-center font-medium text-primary-foreground ${
                                    statusFerias?.status === "Em férias" ? "bg-accent" 
                                    : statusFerias?.status === "Planejada" ? "bg-primary"
                                    : "bg-muted-foreground"
                                  }`}>
                                    {statusFerias?.dias}d
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-accent" /> Em férias</span>
                      <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-primary" /> Planejada</span>
                      <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted-foreground" /> Finalizada</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
