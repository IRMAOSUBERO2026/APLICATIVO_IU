import { initBrandedDoc, finalizeBranded, BRAND, ensureSpace, brandedAddPage, BrandEmpresa } from "./pdfBrand";

// Re-exporta para manter compatibilidade com imports antigos
export type EmpresaPdf = BrandEmpresa;
export { downloadBlob, imprimirBlob } from "./pdfBrand";

/**
 * Renderiza um texto plano A4 com cabeçalho/marca d'água/rodapé premium.
 * Suporta separadores (linhas com "____") como blocos de assinatura.
 */
export async function gerarPdfA4(
  texto: string,
  _nomeArquivo: string,
  empresa?: EmpresaPdf | null,
): Promise<Blob> {
  // Tenta extrair título da primeira linha não vazia
  const primeiraLinha = (texto || "").split("\n").find(l => l.trim().length > 0) || "Documento";
  const documentTitle = primeiraLinha.length > 60 ? "Documento Oficial" : primeiraLinha.trim();

  const ctx = await initBrandedDoc({
    empresa: (empresa || { razao_social: "Empresa" }) as EmpresaPdf,
    documentTitle,
  });
  const { doc, pageW, marginX } = ctx;

  let y = ctx.contentTop;
  const larg = pageW - marginX * 2;
  const linhaH = 5.6;

  // Título destacado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  const tituloFmt = doc.splitTextToSize(documentTitle.toUpperCase(), larg);
  doc.text(tituloFmt, marginX, y);
  y += tituloFmt.length * 6;
  doc.setDrawColor(ctx.primary[0], ctx.primary[1], ctx.primary[2]);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, marginX + 30, y);
  y += 6;

  // Corpo
  const linhasCorpo = texto.split("\n").slice(1); // pula o título
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);

  linhasCorpo.forEach((raw) => {
    const linha = raw.replace(/_{5,}/g, "________________________");
    if (linha.trim() === "") {
      y += linhaH * 0.6;
      return;
    }
    const wrapped = doc.splitTextToSize(linha, larg);
    wrapped.forEach((w: string) => {
      if (y + linhaH > ctx.contentBottom) y = brandedAddPage(ctx);
      // Linhas de assinatura vão em negrito menor
      if (w.includes("____")) {
        doc.setFont("helvetica", "bold");
        doc.text(w, marginX, y);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(w, marginX, y);
      }
      y += linhaH;
    });
  });

  finalizeBranded(ctx);
  return doc.output("blob");
}
