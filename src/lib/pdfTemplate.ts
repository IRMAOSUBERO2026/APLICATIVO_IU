import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLinhaImpressao, NOME_EMPRESA_OFICIAL } from "./usuarioImpressao";

export interface EmpresaBranding {
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj: string;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  logo_url?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  nome_responsavel?: string | null;
  cargo_responsavel?: string | null;
}

export interface PDFDocConfig {
  titulo: string;
  subtitulo?: string;
  empresa: EmpresaBranding;
  obraNome?: string;
  obraEndereco?: string;
  orientation?: "portrait" | "landscape";
  logoClienteUrl?: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function createBrandedPDF(config: PDFDocConfig): Promise<{ doc: jsPDF; startY: number; colors: { primary: [number, number, number]; secondary: [number, number, number] } }> {
  const doc = new jsPDF({ orientation: config.orientation || "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const primaryHex = config.empresa.cor_primaria || "#3c502d";
  const secondaryHex = config.empresa.cor_secundaria || "#1a1a1a";
  const primary = hexToRgb(primaryHex);
  const secondary = hexToRgb(secondaryHex);

  // Header bar
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 4, "F");

  let currentY = 12;

  // Logo empresa (left)
  let logoLoaded = false;
  if (config.empresa.logo_url) {
    const logoBase64 = await loadImageAsBase64(config.empresa.logo_url);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 14, 8, 30, 15);
        logoLoaded = true;
      } catch { /* ignore */ }
    }
  }

  // Logo cliente (right)
  if (config.logoClienteUrl) {
    const clienteLogo = await loadImageAsBase64(config.logoClienteUrl);
    if (clienteLogo) {
      try {
        doc.addImage(clienteLogo, "PNG", pageWidth - 44, 8, 30, 15);
      } catch { /* ignore */ }
    }
  }

  const textStartX = logoLoaded ? 48 : 14;

  // Company name
  doc.setFontSize(14);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFont("helvetica", "bold");
  doc.text(config.empresa.nome_fantasia || config.empresa.razao_social, textStartX, currentY + 4);

  // CNPJ
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`CNPJ: ${config.empresa.cnpj}`, textStartX, currentY + 9);

  // Contact line
  const contactParts = [
    config.empresa.telefone,
    config.empresa.email,
  ].filter(Boolean);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(" | "), textStartX, currentY + 13);
  }

  currentY = 30;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // Document title
  doc.setFontSize(16);
  doc.setTextColor(secondary[0], secondary[1], secondary[2]);
  doc.setFont("helvetica", "bold");
  doc.text(config.titulo, 14, currentY + 4);
  currentY += 8;

  // Subtitle
  if (config.subtitulo) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(config.subtitulo, 14, currentY + 2);
    currentY += 6;
  }

  // Obra info
  if (config.obraNome) {
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text(`Obra: ${config.obraNome}`, 14, currentY + 4);
    currentY += 5;
    if (config.obraEndereco) {
      doc.setFont("helvetica", "normal");
      doc.text(`Endereço: ${config.obraEndereco}`, 14, currentY + 2);
      currentY += 5;
    }
  }

  // Date
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 14, currentY, { align: "right" });
  currentY += 6;

  return { doc, startY: currentY, colors: { primary, secondary } };
}

export function addPDFFooter(doc: jsPDF, empresa: EmpresaBranding) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryHex = empresa.cor_primaria || "#3c502d";
  const primary = hexToRgb(primaryHex);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer bar
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, pageHeight - 16, pageWidth, 16, "F");

    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");

    const empName = empresa.nome_fantasia || empresa.razao_social || NOME_EMPRESA_OFICIAL;
    const footerLeft = `${empName} — CNPJ: ${empresa.cnpj}`;
    doc.text(footerLeft, 14, pageHeight - 8);

    const contactParts = [empresa.telefone, empresa.email].filter(Boolean);
    if (contactParts.length) {
      doc.text(contactParts.join(" | "), 14, pageHeight - 4);
    }

    // Linha do responsável pela impressão (usuário logado / setor)
    doc.text(getLinhaImpressao(), pageWidth / 2, pageHeight - 6, { align: "center" });

    // Page number
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  }
}

export function getAutoTableStyles(primary: [number, number, number]) {
  return {
    headStyles: { fillColor: primary, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] as [number, number, number] },
    footStyles: { fillColor: primary, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
    styles: { cellPadding: 2, lineWidth: 0.1, lineColor: [200, 200, 200] as [number, number, number] },
  };
}

export function addSignatureBlock(doc: jsPDF, empresa: EmpresaBranding, yPos?: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = yPos || pageHeight - 50;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(14, y, 90, y);
  doc.line(120, y, 196, y);

  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");

  if (empresa.nome_responsavel) {
    doc.text(empresa.nome_responsavel, 52, y + 4, { align: "center" });
    doc.text(empresa.cargo_responsavel || "Responsável Técnico", 52, y + 8, { align: "center" });
  } else {
    doc.text("Responsável Técnico", 52, y + 4, { align: "center" });
  }

  doc.text("Contratante", 158, y + 4, { align: "center" });
}
