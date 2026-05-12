import { format } from "date-fns";
import autoTable from "jspdf-autotable";
import { initBrandedDoc, finalizeBranded, sectionTitle, infoGrid, signatureBlock, highlightValueBox, BRAND, autoTableTheme, ensureSpace, BrandEmpresa } from "./pdfBrand";
import { valorPorExtenso } from "./numeroPorExtenso";

export interface ReciboInput {
  empresa: BrandEmpresa;
  funcionario: {
    nome: string;
    cargo?: string | null;
    cpf?: string | null;
    rg?: string | null;
  };
  valor: number;
  referencia: string; // descrição do que está sendo pago
  /** opcional: detalhamento em tabela */
  itens?: Array<{ descricao: string; valor: number }>;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function gerarReciboPdf(input: ReciboInput): Promise<Blob> {
  const { empresa, funcionario, valor, referencia, itens } = input;
  const ctx = await initBrandedDoc({ empresa, documentTitle: "Recibo de Pagamento" });
  const { doc, pageW, marginX } = ctx;

  let y = ctx.contentTop;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  doc.text("RECIBO DE PAGAMENTO", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
  doc.text(`Nº ${Date.now().toString().slice(-8)}`, pageW - marginX, y - 2, { align: "right" });
  doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy"), pageW - marginX, y + 3, { align: "right" });
  y += 10;

  // VALOR DESTACADO
  y = highlightValueBox(ctx, y, "Valor recebido", fmtBRL(valor), "Quitação plena, geral e irrevogável");

  // Por extenso
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
  const ext = `(${valorPorExtenso(valor)})`;
  const extLines = doc.splitTextToSize(ext, pageW - marginX * 2);
  doc.text(extLines, marginX, y);
  y += extLines.length * 4 + 4;

  // Identificação do recebedor
  y = sectionTitle(ctx, y, "Identificação do Recebedor", 1);
  y = infoGrid(ctx, y, [
    ["Nome", funcionario.nome],
    ["Cargo", funcionario.cargo || "—"],
    ["CPF", funcionario.cpf || "—"],
    ["RG", funcionario.rg || "—"],
  ]);

  // Pagador
  y = sectionTitle(ctx, y, "Pagador", 2);
  y = infoGrid(ctx, y, [
    ["Razão Social", empresa.razao_social],
    ["CNPJ", empresa.cnpj || "—"],
    ["Endereço", [empresa.endereco, empresa.cidade, empresa.uf].filter(Boolean).join(" — ") || "—"],
  ]);

  // Referência / discriminação
  y = sectionTitle(ctx, y, "Referência do Pagamento", 3);
  if (itens && itens.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Valor"]],
      body: itens.map(i => [i.descricao, fmtBRL(i.valor)]),
      foot: [["TOTAL", fmtBRL(valor)]],
      ...autoTableTheme(ctx.primary),
      footStyles: { fillColor: BRAND.greenDark, textColor: [255,255,255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right", cellWidth: 40 } },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
    const refLines = doc.splitTextToSize(referencia || "—", pageW - marginX * 2);
    y = ensureSpace(ctx, y, refLines.length * 5 + 4);
    doc.text(refLines, marginX, y);
    y += refLines.length * 5 + 6;
  }

  // Cláusula de quitação
  y = ensureSpace(ctx, y, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
  const clausula = `Para maior clareza, afirmo a veracidade e assino o presente recibo, dando ao pagador acima qualificado plena, geral e irrevogável quitação acerca do valor recebido, referente ao período e objeto discriminados, nada mais tendo a reclamar a qualquer título.`;
  const lc = doc.splitTextToSize(clausula, pageW - marginX * 2);
  doc.text(lc, marginX, y);
  y += lc.length * 4.4 + 10;

  y = signatureBlock(ctx, y, [
    { nome: funcionario.nome, papel: "Recebedor", documento: funcionario.cpf ? `CPF ${funcionario.cpf}` : undefined },
    { nome: empresa.nome_responsavel || empresa.nome_fantasia || empresa.razao_social, papel: empresa.cargo_responsavel || "Pagador" },
  ]);

  finalizeBranded(ctx);
  return doc.output("blob");
}
