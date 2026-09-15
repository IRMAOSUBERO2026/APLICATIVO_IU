import { initBrandedDoc, finalizeBranded, BRAND, ensureSpace, brandedAddPage, BrandEmpresa } from "./pdfBrand";

// Re-exporta para manter compatibilidade com imports antigos
export type EmpresaPdf = BrandEmpresa;
export { downloadBlob, imprimirBlob } from "./pdfBrand";

export type FormatoRecibosLote = "pagina-inteira" | "meia-pagina";

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

  // Corpo — renderiza fielmente TODO o texto da caixa de mensagem (sem omitir nenhuma linha)
  const linhasCorpo = texto.split("\n");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);

  linhasCorpo.forEach((raw) => {
    if (raw === "\f") {
      y = brandedAddPage(ctx);
      return;
    }
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

/**
 * Gera um único arquivo com todos os recibos do lote.
 * No formato meia página, posiciona dois recibos independentes em cada folha A4.
 */
export async function gerarPdfRecibosLote(
  textos: string[],
  empresa?: EmpresaPdf | null,
  formato: FormatoRecibosLote = "pagina-inteira",
): Promise<Blob> {
  const ctx = await initBrandedDoc({
    empresa: (empresa || { razao_social: "Empresa" }) as EmpresaPdf,
    documentTitle: "Recibos de Pagamento",
  });
  const { doc, pageW, pageH, marginX } = ctx;
  const largura = pageW - marginX * 2;

  const prepararPaginaSeguinte = () => {
    doc.addPage();
    ctx.decoratedPages.add(doc.getNumberOfPages());
  };

  const medirLinhas = (texto: string, fontSize: number) => {
    doc.setFontSize(fontSize);
    return texto.split("\n").reduce((total, linha) => {
      if (!linha.trim()) return total + 0.55;
      return total + doc.splitTextToSize(linha.replace(/_{5,}/g, "________________________"), largura).length;
    }, 0);
  };

  const renderizar = (texto: string, topo: number, limite: number, compacto: boolean) => {
    let fontSize = compacto ? 8.5 : 10.5;
    let linhaH = compacto ? 3.75 : 5.6;
    if (compacto) {
      while (fontSize > 6.5 && medirLinhas(texto, fontSize) * linhaH > limite - topo) {
        fontSize -= 0.5;
        linhaH -= 0.18;
      }
    }

    let y = topo;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
    texto.split("\n").forEach((raw) => {
      if (!raw.trim()) {
        y += linhaH * 0.55;
        return;
      }
      const linha = raw.replace(/_{5,}/g, "________________________");
      const wrapped = doc.splitTextToSize(linha, largura);
      wrapped.forEach((parte: string) => {
        const destaque = linha.includes("____") || linha.trim().toUpperCase() === "RECIBO DE PAGAMENTO";
        doc.setFont("helvetica", destaque ? "bold" : "normal");
        doc.text(parte, marginX, y);
        y += linhaH;
      });
    });
  };

  textos.forEach((texto, index) => {
    if (formato === "pagina-inteira") {
      if (index > 0) prepararPaginaSeguinte();
      renderizar(texto, index === 0 ? ctx.contentTop : 24, pageH - 20, false);
      return;
    }

    const posicao = index % 2;
    if (index > 0 && posicao === 0) prepararPaginaSeguinte();
    if (posicao === 0) {
      renderizar(texto, index === 0 ? 38 : 12, pageH / 2 - 7, true);
      doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(marginX, pageH / 2, pageW - marginX, pageH / 2);
      doc.setLineDashPattern([], 0);
    } else {
      renderizar(texto, pageH / 2 + 8, pageH - 18, true);
    }
  });

  finalizeBranded(ctx);
  return doc.output("blob");
}
