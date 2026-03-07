import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Download, FileText, Save, Eye, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoPreto from "@/assets/logo-preto.png";

interface EtapaOrcamento {
  id: string;
  etapa: string;
  area: number;
  valorM2: number;
  taxa: number;
  observacao: string;
}

interface DadosCliente {
  construtora: string;
  empreendimento: string;
  cidade: string;
  contato: string;
  telefone: string;
  email: string;
}

interface DadosProposta {
  data: string;
  responsavel: string;
  observacoes: string;
}

interface Orcamento {
  id: string;
  cliente: DadosCliente;
  proposta: DadosProposta;
  etapas: EtapaOrcamento[];
  createdAt: string;
}

const textoInstitucional = `A Irmãos Ubero Engenharia é especializada na execução de estruturas de concreto armado, atuando com excelência em obras residenciais, comerciais e industriais. Com equipe altamente qualificada e compromisso com prazos e qualidade, entregamos resultados que superam expectativas.`;

const diferenciais = [
  "Engenheiro responsável dedicado à obra",
  "Mestre geral permanente na obra",
  "Equipe especializada em estrutura de concreto armado",
  "Controle documental completo (NRs, ASOs, EPIs)",
  "Segurança do trabalho com técnico próprio",
  "Acompanhamento técnico diário com diário de obra digital",
];

const servicosAdmin = [
  { profissional: "Carpinteiro", valor: 420 },
  { profissional: "Armador", valor: 420 },
  { profissional: "Pedreiro", valor: 420 },
  { profissional: "Meio Oficial", valor: 355 },
  { profissional: "Servente", valor: 295 },
  { profissional: "Encarregado", valor: 500 },
  { profissional: "Mestre de Obras", valor: 600 },
  { profissional: "Técnico de Segurança", valor: 480 },
  { profissional: "Apontador", valor: 380 },
  { profissional: "Guincheiro", valor: 400 },
];

const etapasPreDefinidas = [
  { grupo: "Estrutura", itens: [
    { etapa: "Fundação (Sapata/Bloco)", valorM2: 250, taxa: 2 },
    { etapa: "Fundação (Estaca/Tubulão)", valorM2: 280, taxa: 2 },
    { etapa: "Pilares Subsolo", valorM2: 250, taxa: 1.5 },
    { etapa: "Pilares Tipo", valorM2: 250, taxa: 1 },
    { etapa: "Vigas Baldrame", valorM2: 250, taxa: 1.5 },
    { etapa: "Vigas Tipo", valorM2: 250, taxa: 1 },
    { etapa: "Laje Subsolo", valorM2: 250, taxa: 1.5 },
    { etapa: "Laje Tipo", valorM2: 250, taxa: 1 },
    { etapa: "Laje Cobertura", valorM2: 250, taxa: 1.2 },
    { etapa: "Laje Ático", valorM2: 250, taxa: 1.3 },
    { etapa: "Laje Pé Direito Duplo", valorM2: 250, taxa: 1.5 },
    { etapa: "Escadas", valorM2: 280, taxa: 1.5 },
    { etapa: "Reservatório Superior", valorM2: 300, taxa: 1.8 },
    { etapa: "Reservatório Inferior", valorM2: 280, taxa: 1.5 },
    { etapa: "Casa de Máquinas", valorM2: 280, taxa: 1.3 },
    { etapa: "Muros de Arrimo", valorM2: 250, taxa: 1.5 },
  ]},
  { grupo: "Alvenaria / Cinza", itens: [
    { etapa: "Levantamento de Paredes (Tijolos)", valorM2: 85, taxa: 1 },
    { etapa: "Chapisco", valorM2: 18, taxa: 1 },
    { etapa: "Reboco Interno", valorM2: 45, taxa: 1 },
    { etapa: "Reboco Externo", valorM2: 55, taxa: 1.2 },
    { etapa: "Contrapiso", valorM2: 40, taxa: 1 },
    { etapa: "Regularização de Piso", valorM2: 35, taxa: 1 },
  ]},
  { grupo: "Infraestrutura", itens: [
    { etapa: "Calçada Perimetral", valorM2: 120, taxa: 1 },
    { etapa: "Tapume", valorM2: 95, taxa: 1 },
    { etapa: "Bandeja de Proteção", valorM2: 150, taxa: 1.3 },
    { etapa: "Área de Vivência", valorM2: 180, taxa: 1 },
    { etapa: "Plataforma de Proteção (Tela)", valorM2: 80, taxa: 1 },
    { etapa: "Rampas de Acesso", valorM2: 130, taxa: 1.2 },
  ]},
];

const itensNaoInclusos = [
  "Aço cortado e dobrado",
  "Equipamentos de transporte vertical (grua, cremalheira)",
  "Máquinas de escavação",
  "Topografia",
  "Concreto usinado",
  "Formas metálicas (quando aplicável)",
];

const escopoServicos = {
  carpintaria: "Execução completa de formas em madeira e/ou metálicas para toda a estrutura, incluindo pilares, vigas, lajes e escadas.",
  armacao: "Montagem e amarração de armaduras conforme projeto estrutural, incluindo espaçadores e verificação de cobrimento.",
  concretagem: "Lançamento, adensamento e acabamento do concreto, com acompanhamento de slump test e corpo de prova.",
  seguranca: "Fornecimento de EPIs, treinamentos NR-18 e NR-35, e acompanhamento diário por técnico de segurança.",
  gestao: "Planejamento executivo, controle de produtividade, gestão de equipe e interface com fiscalização.",
};

export default function Orcamento() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [activeTab, setActiveTab] = useState("novo");

  const [cliente, setCliente] = useState<DadosCliente>({ construtora: "", empreendimento: "", cidade: "", contato: "", telefone: "", email: "" });
  const [proposta, setProposta] = useState<DadosProposta>({ data: format(new Date(), "yyyy-MM-dd"), responsavel: "", observacoes: "" });
  const [etapas, setEtapas] = useState<EtapaOrcamento[]>([
    { id: "1", etapa: "Fundação", area: 0, valorM2: 250, taxa: 1, observacao: "" },
  ]);

  const addEtapa = () => {
    setEtapas(prev => [...prev, { id: `${Date.now()}`, etapa: "", area: 0, valorM2: 250, taxa: 1, observacao: "" }]);
  };

  const removeEtapa = (id: string) => setEtapas(prev => prev.filter(e => e.id !== id));

  const updateEtapa = (id: string, field: keyof EtapaOrcamento, value: string | number) => {
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const calcSubtotal = (e: EtapaOrcamento) => e.area * e.valorM2 * e.taxa;
  const totalGeral = etapas.reduce((sum, e) => sum + calcSubtotal(e), 0);
  const areaTotal = etapas.reduce((sum, e) => sum + e.area, 0);
  const valorMedioM2 = areaTotal > 0 ? totalGeral / areaTotal : 0;

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const salvarOrcamento = () => {
    const novo: Orcamento = {
      id: `orc-${Date.now()}`,
      cliente: { ...cliente },
      proposta: { ...proposta },
      etapas: [...etapas],
      createdAt: new Date().toISOString(),
    };
    setOrcamentos(prev => [...prev, novo]);
    setActiveTab("lista");
  };

  const gerarPDFProposta = (orc?: Orcamento) => {
    const c = orc?.cliente || cliente;
    const p = orc?.proposta || proposta;
    const e = orc?.etapas || etapas;
    const total = e.reduce((sum, et) => sum + et.area * et.valorM2 * et.taxa, 0);
    const areaTot = e.reduce((sum, et) => sum + et.area, 0);

    const doc = new jsPDF();
    const green = [60, 80, 45] as [number, number, number];
    const darkGreen = [40, 55, 30] as [number, number, number];
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // === CAPA ===
    doc.setFillColor(...darkGreen);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.text("PROPOSTA COMERCIAL", pageW / 2, 80, { align: "center" });
    doc.setFontSize(12);
    doc.setDrawColor(255, 255, 255);
    doc.line(60, 90, pageW - 60, 90);
    doc.setFontSize(16);
    doc.text(c.empreendimento || "Empreendimento", pageW / 2, 110, { align: "center" });
    doc.setFontSize(12);
    doc.text(c.construtora || "Construtora", pageW / 2, 125, { align: "center" });
    doc.text(c.cidade || "Cidade", pageW / 2, 138, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Data: ${p.data ? format(new Date(p.data), "dd/MM/yyyy") : "—"}`, pageW / 2, 160, { align: "center" });
    doc.setFontSize(22);
    doc.text("IRMÃOS UBERO", pageW / 2, 220, { align: "center" });
    doc.setFontSize(10);
    doc.text("Engenharia", pageW / 2, 230, { align: "center" });

    // === APRESENTAÇÃO ===
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(40, 55, 30);
    doc.setFontSize(18);
    doc.text("1. APRESENTAÇÃO DA EMPRESA", 14, 30);
    doc.setDrawColor(...green);
    doc.line(14, 34, 120, 34);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const splitText = doc.splitTextToSize(textoInstitucional, pageW - 28);
    doc.text(splitText, 14, 45);
    doc.setFontSize(12);
    doc.setTextColor(40, 55, 30);
    doc.text("Nossos Diferenciais:", 14, 80);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    diferenciais.forEach((d, i) => {
      doc.text(`✓  ${d}`, 18, 92 + i * 10);
    });

    // === OBJETO ===
    doc.setFontSize(18);
    doc.setTextColor(40, 55, 30);
    doc.text("2. OBJETO DA PROPOSTA", 14, 170);
    doc.setDrawColor(...green);
    doc.line(14, 174, 120, 174);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const objText = `Execução completa da estrutura em concreto armado do empreendimento ${c.empreendimento || "—"}, localizado em ${c.cidade || "—"}, sob responsabilidade da construtora ${c.construtora || "—"}.`;
    doc.text(doc.splitTextToSize(objText, pageW - 28), 14, 185);

    // === ESCOPO ===
    doc.addPage();
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(40, 55, 30);
    doc.setFontSize(18);
    doc.text("3. ESCOPO DOS SERVIÇOS", 14, 30);
    doc.line(14, 34, 120, 34);
    let yPos = 48;
    const escopoEntries = [
      ["Carpintaria", escopoServicos.carpintaria],
      ["Armação", escopoServicos.armacao],
      ["Concretagem", escopoServicos.concretagem],
      ["Segurança do Trabalho", escopoServicos.seguranca],
      ["Gestão Técnica", escopoServicos.gestao],
    ];
    escopoEntries.forEach(([title, desc]) => {
      doc.setFontSize(11);
      doc.setTextColor(40, 55, 30);
      doc.text(`▸ ${title}`, 14, yPos);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(desc, pageW - 35);
      doc.text(lines, 20, yPos + 7);
      yPos += 7 + lines.length * 5 + 8;
    });

    // === TABELA ORÇAMENTO ===
    doc.addPage();
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(40, 55, 30);
    doc.setFontSize(18);
    doc.text("4. TABELA DE ORÇAMENTO", 14, 30);
    doc.line(14, 34, 120, 34);

    autoTable(doc, {
      startY: 42,
      head: [["Etapa", "Área (m²)", "Valor/m²", "Taxa", "Subtotal"]],
      body: e.map(et => [
        et.etapa,
        et.area.toLocaleString("pt-BR"),
        formatCurrency(et.valorM2),
        et.taxa.toFixed(1),
        formatCurrency(et.area * et.valorM2 * et.taxa),
      ]),
      foot: [["TOTAL", areaTot.toLocaleString("pt-BR") + " m²", "", "", formatCurrency(total)]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: "bold" },
      footStyles: { fillColor: darkGreen, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 242] },
    });

    // Valor destaque
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFillColor(...darkGreen);
    doc.roundedRect(30, finalY, pageW - 60, 30, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("VALOR TOTAL DA PROPOSTA", pageW / 2, finalY + 12, { align: "center" });
    doc.setFontSize(18);
    doc.text(formatCurrency(total), pageW / 2, finalY + 24, { align: "center" });

    // === SERVIÇOS POR ADMINISTRAÇÃO ===
    doc.addPage();
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(40, 55, 30);
    doc.setFontSize(18);
    doc.text("5. SERVIÇOS POR ADMINISTRAÇÃO", 14, 30);
    doc.line(14, 34, 120, 34);

    autoTable(doc, {
      startY: 42,
      head: [["Profissional", "Valor/Dia"]],
      body: servicosAdmin.map(s => [s.profissional, formatCurrency(s.valor)]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: green, textColor: [255, 255, 255] },
    });

    // === CONDIÇÕES ===
    let condY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(18);
    doc.setTextColor(40, 55, 30);
    doc.text("6. CONDIÇÕES E OBSERVAÇÕES", 14, condY);
    doc.line(14, condY + 4, 130, condY + 4);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Itens não inclusos na proposta:", 14, condY + 15);
    itensNaoInclusos.forEach((item, i) => {
      doc.text(`•  ${item}`, 18, condY + 25 + i * 7);
    });

    // === ENCERRAMENTO ===
    doc.addPage();
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(40, 55, 30);
    doc.setFontSize(18);
    doc.text("7. COMPROMISSOS", 14, 30);
    doc.line(14, 34, 80, 34);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const compromissos = [
      "Cumprimento rigoroso das normas de segurança do trabalho",
      "Manutenção da documentação atualizada de todos os colaboradores",
      "Entrega conforme cronograma acordado",
      "Qualidade técnica na execução de todos os serviços",
      "Comunicação transparente e relatórios periódicos",
    ];
    compromissos.forEach((c2, i) => {
      doc.text(`✓  ${c2}`, 18, 48 + i * 10);
    });

    doc.setFontSize(16);
    doc.setTextColor(40, 55, 30);
    doc.text("Agradecemos a oportunidade.", pageW / 2, 130, { align: "center" });
    doc.setFontSize(11);
    doc.text("IRMÃOS UBERO ENGENHARIA", pageW / 2, 150, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Responsável: ${p.responsavel || "—"}`, pageW / 2, 165, { align: "center" });
    doc.text(`Contato: ${c.telefone || "—"} | ${c.email || "—"}`, pageW / 2, 175, { align: "center" });

    doc.save(`proposta-${c.empreendimento || "orcamento"}.pdf`);
  };

  const exportExcel = () => {
    const data = etapas.map(e => ({
      Etapa: e.etapa,
      "Área (m²)": e.area,
      "Valor/m²": e.valorM2,
      Taxa: e.taxa,
      Subtotal: calcSubtotal(e),
      Observação: e.observacao,
    }));
    data.push({ Etapa: "TOTAL", "Área (m²)": areaTotal, "Valor/m²": 0, Taxa: 0, Subtotal: totalGeral, Observação: "" });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orçamento");
    XLSX.writeFile(wb, `orcamento-${cliente.empreendimento || "proposta"}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos & Propostas</h1>
          <p className="text-sm text-muted-foreground">Crie orçamentos de estrutura de concreto armado e gere propostas profissionais</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="novo">Novo Orçamento</TabsTrigger>
            <TabsTrigger value="lista">Orçamentos Salvos ({orcamentos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="novo" className="space-y-6">
            {/* Dados do Cliente */}
            <Card>
              <CardHeader><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><Label>Construtora</Label><Input value={cliente.construtora} onChange={e => setCliente(p => ({ ...p, construtora: e.target.value }))} placeholder="Nome da construtora" /></div>
                  <div><Label>Empreendimento</Label><Input value={cliente.empreendimento} onChange={e => setCliente(p => ({ ...p, empreendimento: e.target.value }))} placeholder="Nome do empreendimento" /></div>
                  <div><Label>Cidade</Label><Input value={cliente.cidade} onChange={e => setCliente(p => ({ ...p, cidade: e.target.value }))} placeholder="Cidade" /></div>
                  <div><Label>Contato</Label><Input value={cliente.contato} onChange={e => setCliente(p => ({ ...p, contato: e.target.value }))} placeholder="Nome do contato" /></div>
                  <div><Label>Telefone</Label><Input value={cliente.telefone} onChange={e => setCliente(p => ({ ...p, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
                  <div><Label>Email</Label><Input type="email" value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
                </div>
              </CardContent>
            </Card>

            {/* Dados da Proposta */}
            <Card>
              <CardHeader><CardTitle className="text-base">Dados da Proposta</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Data</Label><Input type="date" value={proposta.data} onChange={e => setProposta(p => ({ ...p, data: e.target.value }))} /></div>
                  <div><Label>Responsável</Label><Input value={proposta.responsavel} onChange={e => setProposta(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" /></div>
                </div>
                <div className="mt-4"><Label>Observações Gerais</Label><Textarea value={proposta.observacoes} onChange={e => setProposta(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações..." rows={3} /></div>
              </CardContent>
            </Card>

            {/* Tabela de Cálculo */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tabela de Orçamento</CardTitle>
                  <Button size="sm" variant="outline" onClick={addEtapa}><Plus className="mr-1 h-4 w-4" />Adicionar Etapa</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Etapa</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Área (m²)</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Valor/m²</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Taxa</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Obs.</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {etapas.map(e => (
                        <tr key={e.id} className="border-b hover:bg-muted/30">
                          <td className="px-3 py-2"><Input value={e.etapa} onChange={ev => updateEtapa(e.id, "etapa", ev.target.value)} className="h-8" placeholder="Ex: Fundação" /></td>
                          <td className="px-3 py-2"><Input type="number" value={e.area || ""} onChange={ev => updateEtapa(e.id, "area", parseFloat(ev.target.value) || 0)} className="h-8 w-24" /></td>
                          <td className="px-3 py-2"><Input type="number" value={e.valorM2 || ""} onChange={ev => updateEtapa(e.id, "valorM2", parseFloat(ev.target.value) || 0)} className="h-8 w-24" /></td>
                          <td className="px-3 py-2"><Input type="number" step="0.1" value={e.taxa || ""} onChange={ev => updateEtapa(e.id, "taxa", parseFloat(ev.target.value) || 0)} className="h-8 w-20" /></td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">{formatCurrency(calcSubtotal(e))}</td>
                          <td className="px-3 py-2"><Input value={e.observacao} onChange={ev => updateEtapa(e.id, "observacao", ev.target.value)} className="h-8" placeholder="Obs." /></td>
                          <td className="px-3 py-2">
                            {etapas.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeEtapa(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumo */}
                <div className="mt-6 rounded-lg bg-muted/50 p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Área Total</p>
                      <p className="text-xl font-bold">{areaTotal.toLocaleString("pt-BR")} m²</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Valor Médio/m²</p>
                      <p className="text-xl font-bold">{formatCurrency(valorMedioM2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total da Proposta</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={exportExcel}><Download className="mr-1 h-4 w-4" />Excel</Button>
                  <Button variant="outline" size="sm" onClick={() => gerarPDFProposta()}><FileText className="mr-1 h-4 w-4" />Gerar Proposta PDF</Button>
                  <Button size="sm" onClick={salvarOrcamento}><Save className="mr-1 h-4 w-4" />Salvar Orçamento</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lista">
            {orcamentos.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum orçamento salvo ainda.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {orcamentos.map(orc => (
                  <Card key={orc.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold">{orc.cliente.empreendimento || "Sem nome"}</h3>
                          <p className="text-sm text-muted-foreground">{orc.cliente.construtora} — {orc.cliente.cidade}</p>
                          <p className="text-xs text-muted-foreground">Criado em {format(new Date(orc.createdAt), "dd/MM/yyyy")}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-bold text-primary">{formatCurrency(orc.etapas.reduce((s, e) => s + e.area * e.valorM2 * e.taxa, 0))}</p>
                          <Button size="sm" variant="outline" onClick={() => gerarPDFProposta(orc)}><FileText className="mr-1 h-4 w-4" />PDF</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
