/**
 * SISTEMA VISUAL MASTER — IRMÃOS UBERO ENGENHARIA
 * Padrão corporativo premium: verde militar, preto, branco.
 * Componentes reutilizáveis: cabeçalho executivo, marca d'água,
 * seções, destaques, blocos de assinatura e rodapé institucional.
 */
import jsPDF from "jspdf";
import logoPreto from "@/assets/logo-preto.png";
import { getLinhaImpressao, NOME_EMPRESA_OFICIAL } from "./usuarioImpressao";

export const BRAND = {
  green: [60, 80, 45] as [number, number, number],
  greenDark: [40, 55, 30] as [number, number, number],
  black: [17, 17, 17] as [number, number, number],
  graphite: [45, 45, 45] as [number, number, number],
  muted: [110, 110, 110] as [number, number, number],
  hairline: [210, 215, 205] as [number, number, number],
  surface: [248, 249, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export interface BrandEmpresa {
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  nome_responsavel?: string | null;
  cargo_responsavel?: string | null;
}

export function hexToRgb(hex?: string | null, fb: [number, number, number] = BRAND.green): [number, number, number] {
  if (!hex) return fb;
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return fb;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null as any);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let _logoFallback: string | null = null;
async function getLogoOficial(): Promise<string | null> {
  if (_logoFallback) return _logoFallback;
  _logoFallback = await fetchAsDataUrl(logoPreto);
  return _logoFallback;
}

export interface BrandContext {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  marginX: number;
  contentTop: number;
  contentBottom: number;
  empresa: BrandEmpresa;
  logoData: string | null;
  watermarkData: string | null;
  primary: [number, number, number];
  secondary: [number, number, number];
  /** título usado no cabeçalho compacto das páginas seguintes */
  documentTitle: string;
  /** páginas já decoradas com watermark+header (evita duplicação) */
  decoratedPages: Set<number>;
}

export interface InitBrandedOptions {
  empresa: BrandEmpresa;
  documentTitle: string;
  orientation?: "portrait" | "landscape";
  format?: "a4";
}

/** Inicializa um PDF branded e desenha o cabeçalho da página 1. */
export async function initBrandedDoc(opts: InitBrandedOptions): Promise<BrandContext> {
  const doc = new jsPDF({ unit: "mm", format: opts.format || "a4", orientation: opts.orientation || "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const empresa = opts.empresa;

  const primary = hexToRgb(empresa.cor_primaria, BRAND.green);
  const secondary = hexToRgb(empresa.cor_secundaria, BRAND.black);

  // Carrega logos em paralelo
  const oficial = await getLogoOficial();
  const empresaLogo = empresa.logo_url ? await fetchAsDataUrl(empresa.logo_url) : null;
  const logoData = empresaLogo || oficial;
  const watermarkData = oficial || empresaLogo;

  const ctx: BrandContext = {
    doc, pageW, pageH,
    marginX: 16,
    contentTop: 46,
    contentBottom: pageH - 22,
    empresa, logoData, watermarkData,
    primary, secondary,
    documentTitle: opts.documentTitle,
  };

  drawWatermark(ctx);
  drawHeader(ctx, true);
  return ctx;
}

/** Marca d'água central com baixa opacidade (4-8%). */
export function drawWatermark(ctx: BrandContext) {
  if (!ctx.watermarkData) return;
  const { doc, pageW, pageH } = ctx;
  try {
    // jsPDF GState p/ controlar opacidade
    const gs = (doc as any).GState ? new (doc as any).GState({ opacity: 0.06 }) : null;
    if (gs) (doc as any).setGState(gs);
    const size = Math.min(pageW, pageH) * 0.55;
    doc.addImage(ctx.watermarkData, "PNG", (pageW - size) / 2, (pageH - size) / 2, size, size, undefined, "FAST");
    if (gs) {
      const gs2 = new (doc as any).GState({ opacity: 1 });
      (doc as any).setGState(gs2);
    }
  } catch { /* ignore */ }
}

/** Cabeçalho premium: faixa preta fina + faixa verde + logo + identidade. */
export function drawHeader(ctx: BrandContext, primeiraPagina = false) {
  const { doc, pageW, marginX, primary, empresa, logoData } = ctx;

  // Faixa superior fina preta
  doc.setFillColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  doc.rect(0, 0, pageW, 3, "F");

  // Faixa principal verde
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 3, pageW, primeiraPagina ? 30 : 14, "F");

  // Logo sempre sobre cartão BRANCO para garantir contraste em qualquer cabeçalho colorido
  let textX = marginX;
  if (logoData) {
    try {
      const h = primeiraPagina ? 22 : 9;
      const w = h;
      const pad = primeiraPagina ? 2 : 1;
      const cardX = marginX;
      const cardY = 5.5 - pad;
      const cardW = w + pad * 2;
      const cardH = h + pad * 2;
      // Cartão branco arredondado
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardX, cardY, cardW, cardH, 1.5, 1.5, "F");
      // Borda hairline sutil
      doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(cardX, cardY, cardW, cardH, 1.5, 1.5, "S");
      // Logo dentro do cartão
      doc.addImage(logoData, "PNG", cardX + pad, cardY + pad, w, h, undefined, "FAST");
      textX = cardX + cardW + 5;
    } catch { /* ignore */ }
  }

  // Nome
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(primeiraPagina ? 14 : 9);
  const nome = (empresa.nome_fantasia || empresa.razao_social || NOME_EMPRESA_OFICIAL).toUpperCase();
  doc.text(nome, textX, primeiraPagina ? 13 : 9);

  if (primeiraPagina) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const linhas: string[] = [];
    if (empresa.cnpj) linhas.push(`CNPJ: ${empresa.cnpj}`);
    const end = [empresa.endereco, [empresa.cidade, empresa.uf].filter(Boolean).join("/"), empresa.cep].filter(Boolean).join(" • ");
    if (end) linhas.push(end);
    const ct = [empresa.telefone, empresa.email].filter(Boolean).join(" • ");
    if (ct) linhas.push(ct);
    let y = 18;
    linhas.slice(0, 3).forEach((l) => { doc.text(l, textX, y); y += 4; });

    // Selo do documento à direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(ctx.documentTitle.toUpperCase(), pageW - marginX, 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, pageW - marginX, 18, { align: "right" });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(ctx.documentTitle, pageW - marginX, 9, { align: "right" });
  }

  // Hairline verde escuro
  doc.setDrawColor(BRAND.greenDark[0], BRAND.greenDark[1], BRAND.greenDark[2]);
  doc.setLineWidth(0.4);
  const hairY = primeiraPagina ? 33.4 : 17.4;
  doc.line(0, hairY, pageW, hairY);
}

/** Rodapé institucional elegante. */
export function drawFooter(ctx: BrandContext, page: number, total: number) {
  const { doc, pageW, pageH, marginX, empresa } = ctx;

  // Linha fina
  doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
  doc.setLineWidth(0.2);
  doc.line(marginX, pageH - 16, pageW - marginX, pageH - 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
  const nome = empresa.nome_fantasia || empresa.razao_social || NOME_EMPRESA_OFICIAL;
  doc.text(nome.toUpperCase(), marginX, pageH - 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
  const linha2 = [
    empresa.cnpj ? `CNPJ ${empresa.cnpj}` : null,
    [empresa.cidade, empresa.uf].filter(Boolean).join("/") || null,
    empresa.telefone, empresa.email,
  ].filter(Boolean).join("  •  ");
  if (linha2) doc.text(linha2, marginX, pageH - 7);

  // Centro: linha de impressão
  doc.text(getLinhaImpressao(), pageW / 2, pageH - 7, { align: "center" });

  // Direita: paginação
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
  doc.text(`${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, pageW - marginX, pageH - 9, { align: "right" });

  // Faixa preta inferior
  doc.setFillColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  doc.rect(0, pageH - 3, pageW, 3, "F");
}

/** Aplica rodapé a TODAS as páginas. Chamar antes do output. */
export function finalizeBranded(ctx: BrandContext) {
  const total = ctx.doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    ctx.doc.setPage(p);
    drawFooter(ctx, p, total);
  }
}

/** Adiciona uma página, redesenhando watermark e cabeçalho compacto. */
export function brandedAddPage(ctx: BrandContext) {
  ctx.doc.addPage();
  drawWatermark(ctx);
  drawHeader(ctx, false);
  return 24; // y inicial do conteúdo nas páginas internas
}

/** Garante espaço; se não houver, cria nova página e retorna novo Y. */
export function ensureSpace(ctx: BrandContext, currentY: number, needed: number): number {
  if (currentY + needed > ctx.contentBottom) {
    return brandedAddPage(ctx);
  }
  return currentY;
}

/** Título de seção com barra colorida lateral. */
export function sectionTitle(ctx: BrandContext, y: number, label: string, numero?: string | number): number {
  const { doc, marginX, primary } = ctx;
  y = ensureSpace(ctx, y, 14);
  // barra lateral
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(marginX, y - 4, 3, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  const txt = numero != null ? `${numero}.  ${label.toUpperCase()}` : label.toUpperCase();
  doc.text(txt, marginX + 7, y + 2);
  // hairline
  doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
  doc.setLineWidth(0.2);
  doc.line(marginX + 7, y + 5, ctx.pageW - marginX, y + 5);
  return y + 11;
}

/** Bloco em destaque (ex.: VALOR / total). */
export function highlightValueBox(ctx: BrandContext, y: number, label: string, value: string, sub?: string): number {
  const { doc, pageW, marginX, primary } = ctx;
  y = ensureSpace(ctx, y, 28);
  const w = pageW - marginX * 2;
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.roundedRect(marginX, y, w, 24, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label.toUpperCase(), marginX + 6, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(value, pageW - marginX - 6, y + 15, { align: "right" });
  if (sub) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(sub, marginX + 6, y + 18);
  }
  return y + 30;
}

/** Linhas key/value em duas colunas. */
export function infoGrid(ctx: BrandContext, y: number, items: Array<[string, string]>): number {
  const { doc, pageW, marginX } = ctx;
  y = ensureSpace(ctx, y, items.length * 5 + 6);
  const w = pageW - marginX * 2;
  doc.setFillColor(BRAND.surface[0], BRAND.surface[1], BRAND.surface[2]);
  doc.rect(marginX, y, w, items.length * 5 + 4, "F");
  doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
  doc.setLineWidth(0.2);
  doc.rect(marginX, y, w, items.length * 5 + 4, "S");
  let yy = y + 5;
  items.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
    doc.text(k.toUpperCase(), marginX + 4, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
    doc.text(v || "—", marginX + 50, yy);
    yy += 5;
  });
  return y + items.length * 5 + 8;
}

/** Bloco de assinatura elegante (1 ou 2 colunas). */
export function signatureBlock(ctx: BrandContext, y: number, signers: Array<{ nome: string; papel: string; documento?: string }>): number {
  const { doc, pageW, marginX } = ctx;
  y = ensureSpace(ctx, y, 30);
  const cols = signers.length;
  const gap = 8;
  const colW = (pageW - marginX * 2 - gap * (cols - 1)) / cols;
  signers.forEach((s, i) => {
    const x = marginX + i * (colW + gap);
    doc.setDrawColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
    doc.setLineWidth(0.4);
    doc.line(x, y + 14, x + colW, y + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
    doc.text(s.nome.toUpperCase(), x + colW / 2, y + 19, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
    doc.text(s.papel, x + colW / 2, y + 23, { align: "center" });
    if (s.documento) doc.text(s.documento, x + colW / 2, y + 27, { align: "center" });
  });
  return y + 32;
}

export const autoTableTheme = (primary: [number, number, number]) => ({
  theme: "grid" as const,
  headStyles: {
    fillColor: primary,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 8.5,
    halign: "center" as const,
    cellPadding: 3,
  },
  bodyStyles: {
    fontSize: 8.5,
    textColor: [30, 30, 30] as [number, number, number],
    cellPadding: 2.8,
  },
  alternateRowStyles: { fillColor: BRAND.surface },
  styles: { lineColor: BRAND.hairline, lineWidth: 0.15 },
});

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function imprimirBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) w.addEventListener("load", () => { try { w.print(); } catch { /* */ } });
}
