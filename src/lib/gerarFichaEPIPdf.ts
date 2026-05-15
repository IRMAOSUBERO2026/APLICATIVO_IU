/**
 * FICHA DE CONTROLE DE EPI — NR-6
 * Layout corporativo Irmãos Ubero Engenharia.
 * 1 página A4, identidade visual verde (#2D6A1A) + preto (#1A1A1A).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import logoBranco from "@/assets/logo-iu-fundo-branco.png";

// ---------- Paleta ----------
const C_GREEN: [number, number, number] = [45, 106, 26];      // #2D6A1A
const C_GREEN_DARK: [number, number, number] = [26, 61, 10];  // #1A3D0A
const C_GREEN_LIGHT: [number, number, number] = [76, 175, 80]; // #4CAF50
const C_BLACK: [number, number, number] = [26, 26, 26];        // #1A1A1A
const C_TEXT: [number, number, number] = [26, 26, 26];
const C_LABEL: [number, number, number] = [153, 153, 153];     // #999
const C_BODY: [number, number, number] = [68, 68, 68];         // #444
const C_BORDER: [number, number, number] = [229, 229, 229];    // #E5E5E5
const C_BORDER_DK: [number, number, number] = [216, 216, 216]; // #D8D8D8
const C_ALT_BG: [number, number, number] = [248, 248, 248];    // #F8F8F8
const C_RUBRICA_BG: [number, number, number] = [240, 245, 238];// #F0F5EE
const C_AMBER_BG: [number, number, number] = [255, 248, 225];  // #FFF8E1
const C_AMBER: [number, number, number] = [245, 158, 11];      // #F59E0B
const C_TERMO_BG: [number, number, number] = [250, 250, 250];  // #FAFAFA
const C_RUBRICA_TX: [number, number, number] = [170, 170, 170];

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 5;          // margem lateral pequena (≈14px)
const HEADER_H = 22;
const FOOTER_H = 9;

// ---------- Utils ----------
function safeDate(d: any): string {
  if (!d) return "—";
  try { const dt = new Date(d); if (isNaN(dt.getTime())) return "—"; return format(dt, "dd/MM/yyyy"); } catch { return "—"; }
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null as any);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

let _logoCache: string | null = null;
async function getLogoBranco(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  _logoCache = await fetchAsDataUrl(logoBranco);
  return _logoCache;
}

// Trunca texto para caber em uma largura máxima (sem quebrar linha)
function fit(doc: jsPDF, text: string, maxW: number): string {
  if (!text) return "—";
  let s = String(text);
  if (doc.getTextWidth(s) <= maxW) return s;
  while (s.length > 1 && doc.getTextWidth(s + "…") > maxW) s = s.slice(0, -1);
  return s + "…";
}

// ---------- Cabeçalho ----------
function drawHeader(doc: jsPDF, logo: string | null) {
  // Faixa verde
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");

  // Logo à esquerda (já tem fundo branco)
  if (logo) {
    try {
      const h = 14;
      const w = h; // imagem quadrada
      const x = MX + 2;
      const y = (HEADER_H - h) / 2;
      // Cartão branco para contraste extra
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 1, 1, "F");
      doc.addImage(logo, "PNG", x, y, w, h, undefined, "FAST");
    } catch { /* ignore */ }
  }

  // Texto à direita
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("FICHA DE CONTROLE DE EPI", PAGE_W - MX - 2, 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  // 80% branco aproximado em verde: usar tom claro
  doc.text("NR-6 — Equipamento de Proteção Individual — MTE", PAGE_W - MX - 2, 14, { align: "right" });

  doc.setFontSize(7);
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy")}`, PAGE_W - MX - 2, 18.5, { align: "right" });

  // Faixa decorativa gradiente simulado (3 segmentos)
  const stripY = HEADER_H;
  const stripH = 1; // ≈3px
  const seg = PAGE_W / 3;
  doc.setFillColor(C_GREEN_DARK[0], C_GREEN_DARK[1], C_GREEN_DARK[2]);
  doc.rect(0, stripY, seg, stripH, "F");
  doc.setFillColor(C_GREEN_LIGHT[0], C_GREEN_LIGHT[1], C_GREEN_LIGHT[2]);
  doc.rect(seg, stripY, seg, stripH, "F");
  doc.setFillColor(C_GREEN_DARK[0], C_GREEN_DARK[1], C_GREEN_DARK[2]);
  doc.rect(seg * 2, stripY, seg, stripH, "F");
}

// ---------- Marca d'água ----------
function drawWatermark(doc: jsPDF, logo: string | null) {
  if (!logo) return;
  try {
    const gs = (doc as any).GState ? new (doc as any).GState({ opacity: 0.05 }) : null;
    if (gs) (doc as any).setGState(gs);
    const size = 170;
    doc.addImage(logo, "PNG", (PAGE_W - size) / 2, (PAGE_H - size) / 2, size, size, undefined, "FAST");
    if (gs) (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  } catch { /* ignore */ }
}

// ---------- Título de seção ----------
function sectionTitle(doc: jsPDF, y: number, label: string): number {
  const h = 5;
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.roundedRect(MX, y, PAGE_W - MX * 2, h, 0.6, 0.6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), MX + 3, y + 3.5);
  return y + h + 1.5;
}

// ---------- Footer ----------
function drawFooter(doc: jsPDF) {
  const y = PAGE_H - FOOTER_H;
  doc.setFillColor(C_BLACK[0], C_BLACK[1], C_BLACK[2]);
  doc.rect(0, y, PAGE_W, FOOTER_H, "F");

  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("IRMAOS UBERO ENGENHARIA LTDA — CNPJ: 15.595.310/0001-73", MX + 2, y + 5.5);

  // Badge centralizada
  const badgeText = "NR-6 / MTE";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const bw = doc.getTextWidth(badgeText) + 6;
  const bh = 4.2;
  const bx = (PAGE_W - bw) / 2;
  const by = y + (FOOTER_H - bh) / 2;
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.roundedRect(bx, by, bw, bh, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, PAGE_W / 2, by + 3, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(220, 220, 220);
  doc.text(`Impresso em ${format(new Date(), "dd/MM/yyyy")} — Pág. 01/01`, PAGE_W - MX - 2, y + 5.5, { align: "right" });
}

// ---------- Identificação (grid 3x2) ----------
function drawIdentificacao(doc: jsPDF, y: number, func: any): number {
  const items: Array<[string, string]> = [
    ["NOME", func.nome || "—"],
    ["CARGO", func.cargo || "—"],
    ["ADMISSÃO", safeDate(func.data_admissao)],
    ["CPF", func.cpf || "—"],
    ["RG", func.rg || "—"],
    ["REGISTRO", func.numero_registro || "—"],
  ];
  const cols = 3;
  const rows = 2;
  const totalW = PAGE_W - MX * 2;
  const colW = totalW / cols;
  const rowH = 8;
  const totalH = rowH * rows;

  // Fundo + borda externa
  doc.setDrawColor(C_BORDER_DK[0], C_BORDER_DK[1], C_BORDER_DK[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(MX, y, totalW, totalH, 0.8, 0.8, "S");

  for (let i = 0; i < items.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = MX + c * colW;
    const cy = y + r * rowH;
    // alternância: linhas ímpares (índice 0) cinza claro
    if (r % 2 === 0) {
      doc.setFillColor(C_ALT_BG[0], C_ALT_BG[1], C_ALT_BG[2]);
      doc.rect(cx + 0.2, cy + 0.2, colW - 0.4, rowH - 0.4, "F");
    }
    // Bordas internas
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.15);
    if (c < cols - 1) doc.line(cx + colW, cy + 0.5, cx + colW, cy + rowH - 0.5);
    if (r < rows - 1) doc.line(cx + 1, cy + rowH, cx + colW - 1, cy + rowH);

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(C_LABEL[0], C_LABEL[1], C_LABEL[2]);
    doc.text(items[i][0], cx + 2.5, cy + 3);

    // Valor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(C_TEXT[0], C_TEXT[1], C_TEXT[2]);
    doc.text(fit(doc, items[i][1], colW - 5), cx + 2.5, cy + 6.2);
  }

  return y + totalH + 2;
}

// ---------- Termo ----------
const TERMO_PRINCIPAL = `Declaro ter recebido os equipamentos de proteção individual (EPI) descritos nesta ficha, destinados ao meu uso pessoal durante o serviço, bem como treinamento e orientação sobre o uso, guarda e conservação dos mesmos. Comprometo-me a utilizá-los corretamente, a zelar pela sua conservação e a devolvê-los à empresa na rescisão do contrato de trabalho ou quando não mais necessários ao fim a que se destinam.`;
const TERMO_NEGLIGENCIA = `Conforme item 6.7.1 da NR-6 e art. 461 da CLT, prejuízos decorrentes de extravio ou dano causado por negligência poderão ser descontados em folha. Danos ou lesões resultantes da não observância do uso correto serão de minha inteira responsabilidade.`;
const TERMO_DESCONTOS = `Em caso de não devolução na rescisão, poderão ser descontados: Camisa R$ 15,00 — Calça R$ 40,00 — Sapatão R$ 25,00 — Cinto R$ 350,00.`;

function drawTermo(doc: jsPDF, y: number): number {
  const w = PAGE_W - MX * 2;
  const padX = 3;
  const padY = 2.5;
  const innerW = w - padX * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);

  const l1 = doc.splitTextToSize(TERMO_PRINCIPAL, innerW);
  const l2 = doc.splitTextToSize(TERMO_NEGLIGENCIA, innerW);
  const lh = 2.6;
  const textH = (l1.length + l2.length) * lh + 1.5;

  // Bloco principal
  const boxH = textH + padY * 2;
  doc.setFillColor(C_TERMO_BG[0], C_TERMO_BG[1], C_TERMO_BG[2]);
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.2);
  doc.roundedRect(MX, y, w, boxH, 0.8, 0.8, "FD");

  doc.setTextColor(C_BODY[0], C_BODY[1], C_BODY[2]);
  let ty = y + padY + 2;
  doc.text(l1, MX + padX, ty, { maxWidth: innerW, align: "justify" });
  ty += l1.length * lh + 1.2;
  doc.text(l2, MX + padX, ty, { maxWidth: innerW, align: "justify" });

  let yy = y + boxH + 1.5;

  // Bloco destaque amarelo (descontos)
  const dl = doc.splitTextToSize(TERMO_DESCONTOS, innerW - 2);
  const dH = dl.length * lh + padY * 2;
  doc.setFillColor(C_AMBER_BG[0], C_AMBER_BG[1], C_AMBER_BG[2]);
  doc.rect(MX, yy, w, dH, "F");
  // border-left amber
  doc.setFillColor(C_AMBER[0], C_AMBER[1], C_AMBER[2]);
  doc.rect(MX, yy, 1, dH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(C_BODY[0], C_BODY[1], C_BODY[2]);
  doc.text(dl, MX + padX + 1, yy + padY + 2, { maxWidth: innerW - 2 });

  return yy + dH + 2;
}

// ---------- Assinaturas ----------
function drawAssinaturas(doc: jsPDF, y: number, func: any, empresa: any): number {
  const gap = 8;
  const colW = (PAGE_W - MX * 2 - gap) / 2;
  const baseY = y + 12; // espaço para assinar acima da linha

  const cols = [
    { x: MX, nome: (func.nome || "").toUpperCase(), papel: "Colaborador", doc: func.cpf ? `CPF: ${func.cpf}` : "" },
    { x: MX + colW + gap, nome: (empresa.nome_responsavel || empresa.nome_fantasia || empresa.razao_social || "").toUpperCase(), papel: empresa.cargo_responsavel || "Empregador / Responsável", doc: empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "" },
  ];

  for (const c of cols) {
    // linha
    doc.setDrawColor(42, 42, 42);
    doc.setLineWidth(0.3);
    doc.line(c.x, baseY, c.x + colW, baseY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(C_TEXT[0], C_TEXT[1], C_TEXT[2]);
    doc.text(fit(doc, c.nome, colW), c.x + colW / 2, baseY + 3.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(102, 102, 102);
    doc.text(c.papel, c.x + colW / 2, baseY + 6.5, { align: "center" });
    if (c.doc) {
      doc.setFontSize(6);
      doc.setTextColor(153, 153, 153);
      doc.text(c.doc, c.x + colW / 2, baseY + 9, { align: "center" });
    }
  }
  return baseY + 11;
}

// ---------- Main ----------
export async function gerarFichaEPIPdf(funcionarioId: string, empresaId: string): Promise<Blob> {
  const { data: func } = await supabase.from("funcionarios").select("*").eq("id", funcionarioId).single();
  const { data: empresa } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
  if (!func || !empresa) throw new Error("Dados base não localizados.");

  const { data: entregas } = await supabase
    .from("entregas_epi")
    .select(`id, data_entrega, quantidade, ca_numero, motivo, observacoes,
      produto:produtos!left (descricao, ca_numero)`)
    .eq("funcionario_id", funcionarioId)
    .order("data_entrega", { ascending: true });

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = await getLogoBranco();

  // Camadas: marca d'água primeiro (fica embaixo)
  drawWatermark(doc, logo);
  drawHeader(doc, logo);

  let y = HEADER_H + 3;

  // Seção 1
  y = sectionTitle(doc, y, "Identificação do Colaborador");
  y = drawIdentificacao(doc, y, func);

  // Seção 2 — Equipamentos
  y = sectionTitle(doc, y, "Equipamentos Entregues");

  const linhas = (entregas || []).map((e: any, i: number) => [
    String(i + 1).padStart(2, "0"),
    safeDate(e.data_entrega),
    e.produto?.descricao || "Equipamento / EPI",
    e.ca_numero || e.produto?.ca_numero || "—",
    String(e.quantidade ?? 1),
    e.motivo || e.observacoes || "—",
    "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Data", "EPI / Equipamento", "Nº CA", "Qtd", "Motivo", "Rubrica"]],
    body: linhas.length ? linhas : [["—", "—", "Nenhuma entrega registrada", "—", "—", "—", ""]],
    theme: "grid",
    margin: { left: MX, right: MX, top: HEADER_H + 3, bottom: FOOTER_H + 2 },
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: { top: 1.6, right: 2, bottom: 1.6, left: 2 },
      lineColor: C_BORDER,
      lineWidth: 0.15,
      textColor: C_TEXT,
      overflow: "hidden",       // sem quebra de linha
      minCellHeight: 6,
      valign: "middle",
    },
    headStyles: {
      fillColor: C_GREEN,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      lineColor: [255, 255, 255],
      lineWidth: 0.1,
      cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
    },
    alternateRowStyles: { fillColor: [248, 249, 248] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8, textColor: C_GREEN, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "left" },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "center", cellWidth: 9 },
      5: { halign: "left", cellWidth: 38 },
      6: { halign: "center", cellWidth: 28, fillColor: C_RUBRICA_BG, textColor: C_RUBRICA_TX, fontSize: 5.5 },
    },
    didParseCell: (data) => {
      // Conteúdo "assinatura" só visual nas linhas do corpo
      if (data.section === "body" && data.column.index === 6) {
        data.cell.text = ["assinatura"];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  // Seção 3 — Termo
  y = sectionTitle(doc, y, "Termo de Responsabilidade");
  y = drawTermo(doc, y);

  // Local + data (linha curta)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(C_BODY[0], C_BODY[1], C_BODY[2]);
  doc.text(`${empresa.cidade || "—"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`, PAGE_W - MX, y + 1, { align: "right" });
  y += 4;

  // Assinaturas
  y = drawAssinaturas(doc, y, func, empresa);

  // Footer (sempre por último, fixo no rodapé)
  drawFooter(doc);

  // Garante 1 única página: se autoTable estourou, removemos páginas extras
  const total = doc.getNumberOfPages();
  if (total > 1) {
    for (let p = total; p > 1; p--) doc.deletePage(p);
  }

  return doc.output("blob");
}
