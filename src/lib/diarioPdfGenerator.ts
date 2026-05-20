import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPreto from "@/assets/logo-preto.png";
import { getLinhaImpressao, NOME_EMPRESA_OFICIAL } from "./usuarioImpressao";

// Verde militar (identidade Irmãos Ubero Engenharia)
const PRIMARY: [number, number, number] = [60, 80, 45];
const TEXT: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [110, 110, 110];

import { normalizeStorageUrl } from "./storageUrl";

async function loadAsset(url: string): Promise<string | null> {
  try {
    const finalUrl = normalizeStorageUrl(url) || url;
    const r = await fetch(finalUrl);
    const b = await r.blob();
    return await new Promise(resolve => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

function detectImageFormat(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  return "JPEG";
}

async function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 4, h: 3 });
    img.src = dataUrl;
  });
}

function drawHeader(
  doc: jsPDF,
  logoData: string | null,
  diario: any,
  obra: any,
  dataFormatada: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Faixa superior verde (identidade)
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Caixa do cabeçalho
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(14, 12, pageWidth - 28, 32, 2, 2, "FD");

  // Logo
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 18, 16, 24, 24);
    } catch { /* ignore */ }
  }

  // Nome da empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text(NOME_EMPRESA_OFICIAL, 46, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Construção • Engenharia • Concreto", 46, 27);

  // Título à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text("RELATÓRIO DIÁRIO DE OBRA", pageWidth - 18, 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`RDO Nº ${(diario.id || "").slice(0, 8).toUpperCase()}`, pageWidth - 18, 28, { align: "right" });

  // Linha de info da obra
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("Obra:", 18, 38);
  doc.setFont("helvetica", "normal");
  doc.text(`${obra?.codigo || ""} — ${obra?.nome || ""}`, 30, 38);

  doc.setFont("helvetica", "bold");
  doc.text("Data:", pageWidth - 60, 38);
  doc.setFont("helvetica", "normal");
  doc.text(dataFormatada, pageWidth - 48, 38);
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const linhaImp = getLinhaImpressao();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Faixa inferior verde
    doc.setFillColor(...PRIMARY);
    doc.rect(0, pageHeight - 14, pageWidth, 14, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(NOME_EMPRESA_OFICIAL, 14, pageHeight - 8);
    doc.text(linhaImp, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }
}

function ensureSpace(doc: jsPDF, currentY: number, needed: number, redraw: () => void): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 22) {
    doc.addPage();
    redraw();
    return 50;
  }
  return currentY;
}

function sectionTitle(doc: jsPDF, y: number, num: string, title: string, color: [number, number, number] = PRIMARY) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...color);
  doc.text(`${num}. ${title}`, 14, y);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, 60, y + 1.5);
}

export const generateDiarioPdf = async (diario: any, obra: any) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const logoData = await loadAsset(logoPreto);

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(new Date(diario.data));

  const redrawHeader = () => drawHeader(doc, logoData, diario, obra, dataFormatada);
  redrawHeader();

  // Extrai dados embutidos no observacoes (JSON) — formato do form web
  let extraData: any = {};
  let observacoesTexto = "";
  try {
    if (diario.observacoes && diario.observacoes.trim().startsWith("{")) {
      extraData = JSON.parse(diario.observacoes);
    } else if (diario.observacoes) {
      observacoesTexto = String(diario.observacoes);
    }
  } catch {
    observacoesTexto = String(diario.observacoes || "");
  }

  // Fallback: se não veio fotos no JSON, usa coluna fotos[] da tabela (formato mobile)
  if ((!extraData.fotos || extraData.fotos.length === 0) && Array.isArray(diario.fotos) && diario.fotos.length > 0) {
    extraData.fotos = diario.fotos.map((url: string) => ({ url, descricao: "" }));
  }

  // Fallback de atividades quando vier somente texto (mobile)
  if ((!extraData.atividades || extraData.atividades.length === 0) && diario.atividades_executadas) {
    extraData.atividades = String(diario.atividades_executadas)
      .split("\n")
      .filter((l: string) => l.trim())
      .map((linha: string) => ({ descricao: linha.trim(), local: "—", status: "—" }));
  }

  // Fallback clima
  if (!extraData.climaManha && diario.clima) {
    const partes = String(diario.clima).split("/");
    extraData.climaManha = partes[0]?.trim() || "—";
    extraData.climaTarde = partes[1]?.trim() || "—";
  }

  let y = 50;

  // Responsável de campo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("Responsável pelo RDO:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(diario.responsavel || "Não informado", 56, y);
  y += 8;

  // 1. Clima
  sectionTitle(doc, y, "1", "CONDIÇÕES CLIMÁTICAS E DE OPERAÇÃO");
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Manhã", "Tarde", "Condição da Obra"]],
    body: [[extraData.climaManha || "—", extraData.climaTarde || "—", extraData.condicaoObra || "—"]],
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // 2. Mão de obra
  y = ensureSpace(doc, y, 30, redrawHeader);
  sectionTitle(doc, y, "2", "EFETIVO (MÃO DE OBRA)");
  y += 4;
  const equipeBody: any[] = [];
  // Novo formato: equipe estruturada com presença individual
  if (Array.isArray(extraData.equipe) && extraData.equipe.length > 0) {
    extraData.equipe.forEach((p: any) => {
      const origem = p.apoio ? `APOIO (${p.origem || "—"})` : "Própria da obra";
      const obs = [p.presente ? "Presente" : "Ausente", p.observacao].filter(Boolean).join(" • ");
      equipeBody.push([p.nome || "—", p.cargo || "—", origem, obs]);
    });
  } else {
    // Compatibilidade com diários antigos (formato anterior)
    (extraData.maoDeObraPropria || []).forEach((m: any) => {
      if (m.funcao) equipeBody.push([`${m.quantidade || 0}x`, m.funcao, "IU Engenharia (Própria)", "—"]);
    });
    (extraData.maoDeObraTerceirizada || []).forEach((m: any) => {
      if (m.empresa || m.funcao) equipeBody.push([`${m.quantidade || 0}x`, m.funcao || "—", m.empresa || "Terceirizada", "—"]);
    });
  }
  if (equipeBody.length === 0) equipeBody.push(["—", "Nenhum efetivo registrado", "—", "—"]);
  autoTable(doc, {
    startY: y,
    head: [["Nome", "Cargo", "Origem", "Status / Tarefa"]],
    body: equipeBody,
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: { 2: { cellWidth: 38 }, 3: { cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // 3. Equipamentos
  y = ensureSpace(doc, y, 30, redrawHeader);
  sectionTitle(doc, y, "3", "EQUIPAMENTOS");
  y += 4;
  const equipBody: any[] = [];
  (extraData.equipamentos || []).forEach((e: any) => {
    // Novo formato (com codigo + apoio) ou antigo (apenas descricao + quantidade)
    if (e.codigo || e.descricao) {
      const ident = e.codigo ? `${e.codigo} • ${e.descricao || ""}` : e.descricao;
      const origem = e.apoio ? `APOIO (${e.origem || "—"})` : (e.quantidade ? `Qtde: ${e.quantidade}` : "Da obra");
      equipBody.push([ident, origem, e.status || "—", e.observacao || "—"]);
    }
  });
  if (equipBody.length === 0) equipBody.push(["Nenhum equipamento registrado", "—", "—", "—"]);
  autoTable(doc, {
    startY: y,
    head: [["Equipamento", "Origem", "Status", "Observação"]],
    body: equipBody,
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: { 1: { cellWidth: 38 }, 2: { cellWidth: 28 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // 4. Atividades
  y = ensureSpace(doc, y, 30, redrawHeader);
  sectionTitle(doc, y, "4", "ATIVIDADES EXECUTADAS");
  y += 4;
  const ativBody: any[] = [];
  (extraData.atividades || []).forEach((a: any) => {
    if (a.descricao) {
      const desc = a.foraContrato
        ? `${a.descricao}\n[FORA DE CONTRATO]${a.observacao ? ` ${a.observacao}` : ""}`
        : a.descricao;
      ativBody.push([desc, a.local || "—", a.status || "—"]);
    }
  });
  if (ativBody.length === 0) ativBody.push(["Nenhuma atividade registrada", "—", "—"]);
  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Local / Item", "Status"]],
    body: ativBody,
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: { 2: { cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // 5. Ocorrências
  if (diario.ocorrencias) {
    y = ensureSpace(doc, y, 30, redrawHeader);
    sectionTitle(doc, y, "5", "OCORRÊNCIAS / OBSERVAÇÕES", [180, 30, 30]);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(diario.ocorrencias, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 6;
  }

  // 5b. Observações livres (formato mobile, sem JSON estruturado)
  if (observacoesTexto && observacoesTexto.trim()) {
    y = ensureSpace(doc, y, 30, redrawHeader);
    sectionTitle(doc, y, diario.ocorrencias ? "5b" : "5", "OBSERVAÇÕES ADICIONAIS");
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(observacoesTexto, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 6;
  }
  if (extraData.resumoIA) {
    y = ensureSpace(doc, y, 40, redrawHeader);
    sectionTitle(doc, y, "6", "RESUMO EXECUTIVO (INTELIGÊNCIA ARTIFICIAL)");
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(extraData.resumoIA, pageWidth - 28);
    // box leve atrás do resumo
    const boxH = lines.length * 4.2 + 6;
    doc.setFillColor(245, 248, 240);
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y - 4, pageWidth - 28, boxH, 2, 2, "FD");
    doc.text(lines, 17, y);
    y += boxH + 4;
  }

  // 7. Anexos (Fotos)
  const fotos: Array<{ url: string; descricao?: string }> = extraData.fotos || [];
  if (fotos.length > 0) {
    y = ensureSpace(doc, y, 60, redrawHeader);
    sectionTitle(doc, y, "7", "REGISTRO FOTOGRÁFICO (ANEXOS)");
    y += 6;

    const colCount = 2;
    const gap = 6;
    const usableW = pageWidth - 28;
    const cellW = (usableW - gap) / colCount;
    const cellH = 55;

    let col = 0;
    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i];
      const data = await loadAsset(foto.url);
      if (!data) continue;

      if (col === 0) {
        y = ensureSpace(doc, y, cellH + 12, redrawHeader);
      }
      const x = 14 + col * (cellW + gap);

      const dims = await getImageDimensions(data);
      const ratio = dims.w / dims.h;
      let drawW = cellW;
      let drawH = cellW / ratio;
      if (drawH > cellH) {
        drawH = cellH;
        drawW = cellH * ratio;
      }
      const ox = x + (cellW - drawW) / 2;
      const oy = y + (cellH - drawH) / 2;

      // moldura
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(x, y, cellW, cellH, 2, 2, "FD");
      try {
        doc.addImage(data, detectImageFormat(data), ox, oy, drawW, drawH);
      } catch { /* ignore */ }

      // legenda
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      const cap = `Foto ${i + 1}${foto.descricao ? ` — ${foto.descricao}` : ""}`;
      const capLines = doc.splitTextToSize(cap, cellW);
      doc.text(capLines, x + cellW / 2, y + cellH + 4, { align: "center" });

      col++;
      if (col >= colCount) {
        col = 0;
        y += cellH + 10;
      }
    }
    if (col !== 0) y += cellH + 10;
  }

  // 8. Assinaturas
  y = ensureSpace(doc, y, 40, redrawHeader);
  y += 12;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(30, y, 90, y);
  doc.line(120, y, 180, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("ENG. RESPONSÁVEL", 60, y + 5, { align: "center" });
  doc.text("FISCALIZAÇÃO / CLIENTE", 150, y + 5, { align: "center" });

  drawFooter(doc);

  const filename = `RDO_${obra?.codigo || "OBRA"}_${dataFormatada.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
};
