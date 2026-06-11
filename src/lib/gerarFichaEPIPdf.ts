/**
 * FICHA DE CONTROLE DE EPI — NR-6
 * Layout corporativo Irmãos Ubero Engenharia.
 * Paginação automática, carimbo digital, layout verde e preto.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import logoBranco from "@/assets/logo-oficial.png";
import { carregarAssinaturaFuncionario } from "@/lib/assinaturaImagem";

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

function fit(doc: jsPDF, text: string, maxW: number): string {
  if (!text) return "—";
  let s = String(text);
  if (doc.getTextWidth(s) <= maxW) return s;
  while (s.length > 1 && doc.getTextWidth(s + "…") > maxW) s = s.slice(0, -1);
  return s + "…";
}

// ---------- Cabeçalho ----------
function drawHeader(doc: jsPDF, logo: string | null) {
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");

  if (logo) {
    try {
      const h = 14;
      const w = h; // imagem quadrada
      const x = MX + 2;
      const y = (HEADER_H - h) / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 1, 1, "F");
      doc.addImage(logo, "PNG", x, y, w, h, undefined, "FAST");
    } catch { /* ignore */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("FICHA DE CONTROLE DE EPI", PAGE_W - MX - 2, 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("NR-6 — Equipamento de Proteção Individual — MTE", PAGE_W - MX - 2, 14, { align: "right" });

  doc.setFontSize(7);
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy")}`, PAGE_W - MX - 2, 18.5, { align: "right" });

  const stripY = HEADER_H;
  const stripH = 1;
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
function drawFooter(doc: jsPDF, pageNum: number, totalPagesStr: string) {
  const y = PAGE_H - FOOTER_H;
  doc.setFillColor(C_BLACK[0], C_BLACK[1], C_BLACK[2]);
  doc.rect(0, y, PAGE_W, FOOTER_H, "F");

  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("IRMAOS UBERO ENGENHARIA LTDA — CNPJ: 31.370.964/0001-55", MX + 2, y + 5.5);

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
  doc.text(`Impresso em ${format(new Date(), "dd/MM/yyyy")} — Pág. ${String(pageNum).padStart(2, '0')}/${totalPagesStr}`, PAGE_W - MX - 2, y + 5.5, { align: "right" });
}

// ---------- Identificação ----------
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

  doc.setDrawColor(C_BORDER_DK[0], C_BORDER_DK[1], C_BORDER_DK[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(MX, y, totalW, totalH, 0.8, 0.8, "S");

  for (let i = 0; i < items.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = MX + c * colW;
    const cy = y + r * rowH;
    if (r % 2 === 0) {
      doc.setFillColor(C_ALT_BG[0], C_ALT_BG[1], C_ALT_BG[2]);
      doc.rect(cx + 0.2, cy + 0.2, colW - 0.4, rowH - 0.4, "F");
    }
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.15);
    if (c < cols - 1) doc.line(cx + colW, cy + 0.5, cx + colW, cy + rowH - 0.5);
    if (r < rows - 1) doc.line(cx + 1, cy + rowH, cx + colW - 1, cy + rowH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(C_LABEL[0], C_LABEL[1], C_LABEL[2]);
    doc.text(items[i][0], cx + 2.5, cy + 3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(C_TEXT[0], C_TEXT[1], C_TEXT[2]);
    doc.text(fit(doc, items[i][1], colW - 5), cx + 2.5, cy + 6.2);
  }

  return y + totalH + 2;
}

// ---------- Termo ----------
const TERMO_PRINCIPAL = `Declaro ter recebido os equipamentos de proteção individual (EPI) descritos nesta ficha, destinados ao meu uso pessoal durante o serviço, bem como treinamento e orientação para utilização, guarda e limpeza. Certifico-me de que tomei conhecimento das normas pertinentes e assumo a responsabilidade pela sua devida utilização.`;
const TERMO_NEGLIGENCIA = `Conforme item 6.7.1 da NR-6 e art. 461 da CLT, prejuízos decorrentes de extravio ou dano causado por negligência poderão ser descontados em folha. Danos ou lesões resultantes da não utilização ou utilização inadequada de EPI são de responsabilidade do colaborador.`;
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

  const dl = doc.splitTextToSize(TERMO_DESCONTOS, innerW - 2);
  const dH = dl.length * lh + padY * 2;
  doc.setFillColor(C_AMBER_BG[0], C_AMBER_BG[1], C_AMBER_BG[2]);
  doc.rect(MX, yy, w, dH, "F");
  doc.setFillColor(C_AMBER[0], C_AMBER[1], C_AMBER[2]);
  doc.rect(MX, yy, 1, dH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(C_BODY[0], C_BODY[1], C_BODY[2]);
  doc.text(dl, MX + padX + 1, yy + padY + 2, { maxWidth: innerW - 2 });

  return yy + dH + 2;
}

// ---------- Assinaturas ----------
function drawAssinaturas(doc: jsPDF, y: number, func: any, empresa: any, logo: string | null, docHash: string, sigImg: string | null, origem: string): number {
  const gap = 8;
  const colW = (PAGE_W - MX * 2 - gap) / 2;
  
  // Colaborador (Esquerda)
  const xColab = MX;
  const yColab = y + 12;

  // Imagem de assinatura sobre a linha
  if (sigImg) {
    try {
      const imgW = Math.min(colW - 8, 46);
      const imgH = imgW / 3; // proporção ~3:1 (600x200)
      doc.addImage(sigImg, "PNG", xColab + (colW - imgW) / 2, yColab - imgH - 0.5, imgW, imgH, undefined, "FAST");
    } catch { /* ignore */ }
  }

  doc.setDrawColor(42, 42, 42);
  doc.setLineWidth(0.3);
  doc.line(xColab, yColab, xColab + colW, yColab);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(C_TEXT[0], C_TEXT[1], C_TEXT[2]);
  doc.text(fit(doc, (func.nome || "").toUpperCase(), colW), xColab + colW / 2, yColab + 3.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(102, 102, 102);
  doc.text("Colaborador", xColab + colW / 2, yColab + 6.5, { align: "center" });
  if (func.cpf) {
    doc.setFontSize(6);
    doc.setTextColor(153, 153, 153);
    doc.text(`CPF: ${func.cpf}`, xColab + colW / 2, yColab + 9, { align: "center" });
  }
  doc.setFontSize(5.5);
  doc.setTextColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.text(
    origem === "portal" ? "Assinatura eletrônica cadastrada no Portal" : "Assinatura eletrônica (carimbo nominal)",
    xColab + colW / 2, yColab + 11.5, { align: "center" }
  );

  // Carimbo Digital (Direita)
  const xEmp = MX + colW + gap;
  const yEmp = y;
  const hEmp = 32;
  
  doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(xEmp, yEmp, colW, hEmp, 1, 1, "S");
  
  let ty = yEmp + 4;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", xEmp + 2, ty - 2, 8, 8, undefined, "FAST");
    } catch {}
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(C_TEXT[0], C_TEXT[1], C_TEXT[2]);
  doc.text(fit(doc, (empresa.razao_social || "IRMÃOS UBERO ENGENHARIA LTDA").toUpperCase(), colW - 12), xEmp + 12, ty);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`CNPJ: ${empresa.cnpj || "31.370.964/0001-55"}`, xEmp + 12, ty + 3);
  
  ty += 8;
  doc.setFont("helvetica", "bold");
  doc.text(fit(doc, empresa.responsavel_tecnico_1 || "Luis Fernando Gomez Ubero", colW - 4), xEmp + 2, ty);
  doc.setFont("helvetica", "normal");
  doc.text(`CREA ${empresa.crea_1 || "PR-95695/D"}`, xEmp + 2, ty + 3);
  
  ty += 7;
  doc.setFont("helvetica", "bold");
  doc.text(fit(doc, empresa.responsavel_tecnico_2 || "Marcos Paulo Gomez Ubero", colW - 4), xEmp + 2, ty);
  doc.setFont("helvetica", "normal");
  doc.text(`CREA ${empresa.crea_2 || "SC-120717-4"}`, xEmp + 2, ty + 3);
  
  ty += 7;
  doc.setFont("helvetica", "italic");
  doc.setTextColor(C_LABEL[0], C_LABEL[1], C_LABEL[2]);
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, xEmp + 2, ty);
  doc.text(`Doc: ${docHash}`, xEmp + 2, ty + 3);

  return Math.max(yColab + 11, yEmp + hEmp + 2);
}

// ---------- Main ----------
export async function gerarFichaEPIPdf(funcionarioId: string, empresaId: string): Promise<Blob> {
  const { data: func } = await supabase.from("funcionarios").select("*").eq("id", funcionarioId).single();
  const { data: empresa } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
  if (!func || !empresa) throw new Error("Dados base não localizados.");

  // O hash do documento usa os primeiros 8 caracteres de alguma entrega_id ou do funcionario_id
  const docHash = func.id.substring(0, 8).toUpperCase();

  const { data: entregas } = await supabase
    .from("entregas_epi")
    .select(`id, data_entrega, quantidade, ca_numero, motivo, observacoes,
      foto_entrega_url, local_entrega, data_hora_entrega,
      produto:produtos!left (descricao, ca_numero)`)
    .eq("funcionario_id", funcionarioId)
    .order("data_entrega", { ascending: true });

  // Assinatura/rubrica automática (Portal ou carimbo cursivo)
  const assinatura = await carregarAssinaturaFuncionario(funcionarioId, func.nome || "");
  const sigImg = assinatura.assinaturaDataUrl;

  // Comprovação fotográfica: usa a entrega mais recente com foto
  const comComprovante = (entregas || [])
    .filter((e: any) => e.foto_entrega_url)
    .sort((a: any, b: any) => String(b.data_hora_entrega || b.data_entrega).localeCompare(String(a.data_hora_entrega || a.data_entrega)))[0];
  let fotoDataUrl: string | null = null;
  if (comComprovante?.foto_entrega_url) {
    fotoDataUrl = await fetchAsDataUrl(comComprovante.foto_entrega_url);
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = await getLogoBranco();

  // Seção 1 (apenas na 1ª página)
  let startY = HEADER_H + 3;
  startY = sectionTitle(doc, startY, "Identificação do Colaborador");
  startY = drawIdentificacao(doc, startY, func);

  // Seção 2 — Equipamentos
  startY = sectionTitle(doc, startY, "Equipamentos Entregues");

  const linhas = (entregas || []).map((e: any, i: number) => {
    const descricao = e.produto?.descricao || "Equipamento / EPI";
    // Prioriza CA da entrega; fallback para CA do produto.
    // Se o valor "CA" for igual à descrição (dado corrompido), ignora.
    let ca = e.ca_numero || e.produto?.ca_numero || "";
    if (ca && descricao && ca.trim().toUpperCase() === descricao.trim().toUpperCase()) {
      ca = "";
    }
    return [
      String(i + 1).padStart(2, "0"),
      safeDate(e.data_entrega),
      descricao,
      ca || "—",
      String(e.quantidade ?? 1),
      e.motivo || e.observacoes || "—",
      "",
    ];
  });


  const totalPagesExp = "{total_pages_count_string}";

  autoTable(doc, {
    startY: startY,
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
      // Limpa o texto da coluna de rubrica — a imagem é desenhada em didDrawCell
      if (data.section === "body" && data.column.index === 6) {
        data.cell.text = [""];
      }
    },
    didDrawCell: (data) => {
      // Desenha a assinatura/rubrica automática em cada linha de entrega
      if (data.section === "body" && data.column.index === 6 && sigImg && linhas.length) {
        try {
          const cell = data.cell;
          const maxW = cell.width - 3;
          const maxH = cell.height - 1.5;
          let w = maxW;
          let h = w / 3; // proporção 3:1
          if (h > maxH) { h = maxH; w = h * 3; }
          const cx = cell.x + (cell.width - w) / 2;
          const cy = cell.y + (cell.height - h) / 2;
          doc.addImage(sigImg, "PNG", cx, cy, w, h, undefined, "FAST");
        } catch { /* ignore */ }
      }
    },
    didDrawPage: (data) => {
      drawWatermark(doc, logo);
      drawHeader(doc, logo);
      drawFooter(doc, data.pageNumber, totalPagesExp);
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 2;

  // Verifica se há espaço na página atual para o Termo + Assinaturas
  // Altura aproximada do Termo (25) + Assinaturas (35) = 60mm
  if (finalY + 60 > PAGE_H - FOOTER_H) {
    doc.addPage();
    finalY = HEADER_H + 3;
  }

  // Seção 3 — Termo
  finalY = sectionTitle(doc, finalY, "Termo de Responsabilidade");
  finalY = drawTermo(doc, finalY);

  // Local + data (linha curta)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(C_BODY[0], C_BODY[1], C_BODY[2]);
  doc.text(`${empresa.cidade || "—"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`, PAGE_W - MX, finalY + 1, { align: "right" });
  finalY += 4;

  // Assinaturas e Carimbo Digital
  finalY = drawAssinaturas(doc, finalY, func, empresa, logo, docHash);

  // Atualiza placeholders de paginação
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    // Replace expression (jspdf can use putTotalPages)
  }
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  return doc.output("blob");
}
