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
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { initBrandedDoc, finalizeBranded, brandedAddPage, sectionTitle, highlightValueBox, autoTableTheme, BRAND, ensureSpace, drawWatermark, decorateCurrentPage } from "@/lib/pdfBrand";

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
    { id: "1", etapa: "Fundação (Sapata/Bloco)", area: 0, valorM2: 250, taxa: 2, observacao: "" },
  ]);

  const addEtapa = () => {
    setEtapas(prev => [...prev, { id: `${Date.now()}`, etapa: "", area: 0, valorM2: 250, taxa: 1, observacao: "" }]);
  };

  const addEtapaPreDefinida = (item: { etapa: string; valorM2: number; taxa: number }) => {
    setEtapas(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, etapa: item.etapa, area: 0, valorM2: item.valorM2, taxa: item.taxa, observacao: "" }]);
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

  const gerarPDFProposta = async (orc?: Orcamento) => {
    const c = orc?.cliente || cliente;
    const p = orc?.proposta || proposta;
    const e = orc?.etapas || etapas;
    const total = e.reduce((sum, et) => sum + et.area * et.valorM2 * et.taxa, 0);
    const areaTot = e.reduce((sum, et) => sum + et.area, 0);

    // Empresa fixa Irmãos Ubero (não vinculada a registro de empresa do banco)
    const empresa = {
      razao_social: "IRMÃOS UBERO ENGENHARIA",
      nome_fantasia: "IRMÃOS UBERO",
      cnpj: null, telefone: null, email: null,
      endereco: null, cidade: null, uf: null,
    } as any;

    const ctx = await initBrandedDoc({ empresa, documentTitle: "Proposta Comercial" });
    const { doc, pageW, pageH, marginX } = ctx;

    // ===== CAPA PREMIUM (substitui o cabeçalho padrão) =====
    // Limpa fundo branco e desenha capa monocromática verde escuro
    doc.setFillColor(BRAND.greenDark[0], BRAND.greenDark[1], BRAND.greenDark[2]);
    doc.rect(0, 0, pageW, pageH, "F");
    drawWatermark(ctx); // watermark sobre a capa também

    // Faixa superior fina branca + verde claro
    doc.setFillColor(BRAND.green[0], BRAND.green[1], BRAND.green[2]);
    doc.rect(0, pageH * 0.42, pageW, 1, "F");
    doc.rect(0, pageH * 0.58, pageW, 1, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("PROPOSTA Nº " + format(new Date(p.data || new Date()), "yyyyMMdd"), marginX, 30);
    doc.text(format(new Date(p.data || new Date()), "dd 'de' MMMM 'de' yyyy"), pageW - marginX, 30, { align: "right" });

    doc.setFontSize(11);
    doc.text("PROPOSTA COMERCIAL", pageW / 2, pageH * 0.46, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    const empName = (c.empreendimento || "Empreendimento").toUpperCase();
    const empLines = doc.splitTextToSize(empName, pageW - marginX * 2);
    doc.text(empLines, pageW / 2, pageH * 0.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(c.construtora || "Construtora", pageW / 2, pageH * 0.55, { align: "center" });
    doc.setFontSize(10);
    doc.text(c.cidade || "Cidade", pageW / 2, pageH * 0.555 + 5, { align: "center" });

    // Marca embaixo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("IRMÃOS UBERO", pageW / 2, pageH * 0.85, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(200, 210, 195);
    doc.text("ENGENHARIA  •  ESTRUTURAS DE CONCRETO ARMADO", pageW / 2, pageH * 0.85 + 5, { align: "center" });

    // ===== APRESENTAÇÃO =====
    let y = brandedAddPage(ctx);
    y = sectionTitle(ctx, y, "Apresentação da Empresa", 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
    const splitText = doc.splitTextToSize(textoInstitucional, pageW - marginX * 2);
    doc.text(splitText, marginX, y);
    y += splitText.length * 5 + 6;

    y = sectionTitle(ctx, y, "Diferenciais", 2);
    diferenciais.forEach((d) => {
      y = ensureSpace(ctx, y, 7);
      doc.setFillColor(ctx.primary[0], ctx.primary[1], ctx.primary[2]);
      doc.circle(marginX + 1.5, y - 1.5, 1.2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
      doc.text(d, marginX + 6, y);
      y += 6;
    });

    // ===== OBJETO + RESUMO EXECUTIVO =====
    y = brandedAddPage(ctx);
    y = sectionTitle(ctx, y, "Objeto da Proposta", 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
    const objText = `Execução completa da estrutura em concreto armado do empreendimento ${c.empreendimento || "—"}, localizado em ${c.cidade || "—"}, sob responsabilidade da construtora ${c.construtora || "—"}.`;
    const objLines = doc.splitTextToSize(objText, pageW - marginX * 2);
    doc.text(objLines, marginX, y);
    y += objLines.length * 5 + 6;

    y = sectionTitle(ctx, y, "Resumo Executivo", 4);
    autoTable(doc, {
      startY: y,
      body: [
        ["Área total da estrutura", `${areaTot.toLocaleString("pt-BR")} m²`],
        ["Etapas previstas", `${e.length}`],
        ["Valor médio por m²", formatCurrency(areaTot > 0 ? total / areaTot : 0)],
        ["Investimento total estimado", formatCurrency(total)],
      ],
      ...autoTableTheme(ctx.primary),
      bodyStyles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" } },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // ===== ESCOPO =====
    y = brandedAddPage(ctx);
    y = sectionTitle(ctx, y, "Escopo dos Serviços", 5);
    const escopoEntries: [string, string][] = [
      ["Carpintaria", escopoServicos.carpintaria],
      ["Armação", escopoServicos.armacao],
      ["Concretagem", escopoServicos.concretagem],
      ["Segurança do Trabalho", escopoServicos.seguranca],
      ["Gestão Técnica", escopoServicos.gestao],
    ];
    escopoEntries.forEach(([title, desc]) => {
      y = ensureSpace(ctx, y, 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
      doc.text(`▸ ${title}`, marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
      const lines = doc.splitTextToSize(desc, pageW - marginX * 2 - 6);
      doc.text(lines, marginX + 6, y + 5);
      y += 6 + lines.length * 4.5 + 4;
    });

    // ===== TABELA ORÇAMENTO =====
    y = brandedAddPage(ctx);
    y = sectionTitle(ctx, y, "Tabela de Orçamento", 6);
    autoTable(doc, {
      startY: y,
      head: [["Etapa", "Área (m²)", "Valor/m²", "Taxa", "Subtotal"]],
      body: e.map(et => [
        et.etapa,
        et.area.toLocaleString("pt-BR"),
        formatCurrency(et.valorM2),
        et.taxa.toFixed(1),
        formatCurrency(et.area * et.valorM2 * et.taxa),
      ]),
      foot: [["TOTAL", areaTot.toLocaleString("pt-BR") + " m²", "", "", formatCurrency(total)]],
      ...autoTableTheme(ctx.primary),
      footStyles: { fillColor: BRAND.greenDark, textColor: [255,255,255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "center" }, 4: { halign: "right" } },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    y = highlightValueBox(ctx, y, "Investimento total da proposta", formatCurrency(total), `${areaTot.toLocaleString("pt-BR")} m² de estrutura`);

    // ===== ADMINISTRAÇÃO =====
    y = brandedAddPage(ctx);
    y = sectionTitle(ctx, y, "Serviços por Administração — Diárias", 7);
    autoTable(doc, {
      startY: y,
      head: [["Profissional", "Valor / Dia"]],
      body: servicosAdmin.map(s => [s.profissional, formatCurrency(s.valor)]),
      ...autoTableTheme(ctx.primary),
      columnStyles: { 1: { halign: "right", cellWidth: 50 } },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = sectionTitle(ctx, y, "Itens Não Inclusos", 8);
    itensNaoInclusos.forEach((item) => {
      y = ensureSpace(ctx, y, 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
      doc.text("•  " + item, marginX, y);
      y += 5;
    });

    // ===== ENCERRAMENTO =====
    y = brandedAddPage(ctx);
    y = sectionTitle(ctx, y, "Compromissos", 9);
    const compromissos = [
      "Cumprimento rigoroso das normas de segurança do trabalho",
      "Manutenção da documentação atualizada de todos os colaboradores",
      "Entrega conforme cronograma acordado",
      "Qualidade técnica na execução de todos os serviços",
      "Comunicação transparente e relatórios periódicos",
    ];
    compromissos.forEach((c2) => {
      y = ensureSpace(ctx, y, 7);
      doc.setFillColor(ctx.primary[0], ctx.primary[1], ctx.primary[2]);
      doc.circle(marginX + 1.5, y - 1.5, 1.2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
      doc.text(c2, marginX + 6, y);
      y += 6;
    });

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
    doc.text("Agradecemos a oportunidade.", pageW / 2, y, { align: "center" });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
    doc.text("IRMÃOS UBERO ENGENHARIA", pageW / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
    doc.text(`Responsável: ${p.responsavel || "—"}`, pageW / 2, y, { align: "center" });
    y += 5;
    doc.text(`Contato: ${c.telefone || "—"}  •  ${c.email || "—"}`, pageW / 2, y, { align: "center" });

    finalizeBranded(ctx);
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Tabela de Orçamento</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Adicionar Atividade <ChevronDown className="ml-1 h-3 w-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-[400px] overflow-y-auto w-[280px]">
                        {etapasPreDefinidas.map(grupo => (
                          <div key={grupo.grupo}>
                            <DropdownMenuLabel className="text-xs text-muted-foreground">{grupo.grupo}</DropdownMenuLabel>
                            {grupo.itens.map(item => (
                              <DropdownMenuItem key={item.etapa} onClick={() => addEtapaPreDefinida(item)}>
                                <span className="text-sm">{item.etapa}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </div>
                        ))}
                        <DropdownMenuItem onClick={addEtapa} className="font-medium text-primary">
                          <Plus className="mr-1 h-3.5 w-3.5" />Linha em branco
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
