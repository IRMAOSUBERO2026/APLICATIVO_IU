import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { initBrandedDoc, finalizeBranded, sectionTitle, infoGrid, signatureBlock, autoTableTheme, BRAND, ensureSpace } from "./pdfBrand";

function safeDate(d: any): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, "dd/MM/yyyy");
  } catch { return "—"; }
}

const TERMO_RESPONSABILIDADE = `Declaro ter recebido(a) equipamento(s) de proteção(ões) individual(ais) descritos nessa ficha, destinados ao meu uso pessoal durante o serviço.
Declaro ter recebido treinamento(s) e orientação(ões) sobre o uso, guarda e conservação dos mesmos, responsabilizando-me também por sua devolução à empresa na eventual rescisão do meu contrato de trabalho, ou quando não mais se fizerem necessários ao fim a que se destinam.
Conforme descrito no item 6.7.1 da NR-6 e artigo 461 da CLT, o prejuízo decorrente do extravio ou danificação do equipamento a mim confiado poderá ser descontado do meu salário, salvo quando causado pelo desgaste natural de utilização.
Que na não observância do seu uso, por negligência, os danos e/ou lesões resultantes de acidentes serão de minha inteira responsabilidade.
É obrigatória a devolução na rescisão do contrato de trabalho, sob pena de ser descontada a falta de entrega destes, podendo agora ser descontado: Camisa R$ 15,00 — Calça R$ 40,00 — Sapatão R$ 25,00 — Cinto R$ 350,00.`;

export async function gerarFichaEPIPdf(funcionarioId: string, empresaId: string): Promise<Blob> {
  const { data: func } = await supabase.from("funcionarios").select("*").eq("id", funcionarioId).single();
  const { data: empresa } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
  if (!func || !empresa) throw new Error("Dados base não localizados.");

  const { data: entregas } = await supabase
    .from("entregas_epi")
    .select(`id, data_entrega, quantidade, ca_numero, motivo, observacoes,
      produto:produtos!left (descricao, ca_numero),
      obra:obras!left (codigo, nome)`)
    .eq("funcionario_id", funcionarioId)
    .order("data_entrega", { ascending: true });

  const ctx = await initBrandedDoc({ empresa: empresa as any, documentTitle: "Ficha de EPI — NR-6" });
  const { doc, pageW, marginX } = ctx;

  let y = ctx.contentTop;

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  doc.text("FICHA DE CONTROLE DE EPI", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
  doc.text("Equipamento de Proteção Individual • Norma Regulamentadora nº 6 do MTE", marginX, y + 5);
  y += 12;

  y = sectionTitle(ctx, y, "Identificação do Colaborador", 1);
  y = infoGrid(ctx, y, [
    ["Nome", func.nome || "—"],
    ["Cargo", func.cargo || "—"],
    ["CPF", func.cpf || "—"],
    ["RG", func.rg || "—"],
    ["Admissão", safeDate(func.data_admissao)],
    ["Registro", func.numero_registro || "—"],
  ]);

  y = sectionTitle(ctx, y, "Equipamentos Entregues", 2);

  const linhas = (entregas || []).map((e: any, i: number) => [
    String(i + 1).padStart(2, "0"),
    safeDate(e.data_entrega),
    e.produto?.descricao || "Equipamento / EPI",
    e.ca_numero || e.produto?.ca_numero || "—",
    String(e.quantidade ?? 1),
    e.motivo || e.observacoes || "—",
    e.obra?.codigo || e.obra?.nome || "—",
    "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Data", "EPI / Equipamento", "Nº CA", "Qtd", "Motivo", "Obra", "Rubrica"]],
    body: linhas.length ? linhas : [["—", "—", "Nenhuma entrega registrada para este colaborador.", "—", "—", "—", "—", ""]],
    ...autoTableTheme(ctx.primary),
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { halign: "center", cellWidth: 20 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "center", cellWidth: 10 },
      6: { halign: "center", cellWidth: 18 },
      7: { minCellHeight: 11, cellWidth: 28 },
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: () => { /* watermark/header já desenhados via brandedAddPage seria ideal; aceitável */ },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Termo de Responsabilidade
  y = sectionTitle(ctx, y, "Termo de Responsabilidade — NR-6 / CLT", 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
  const linhasTermo = doc.splitTextToSize(TERMO_RESPONSABILIDADE, pageW - marginX * 2);
  y = ensureSpace(ctx, y, linhasTermo.length * 4 + 4);
  doc.text(linhasTermo, marginX, y);
  y += linhasTermo.length * 4 + 6;

  // Local + data
  y = ensureSpace(ctx, y, 40);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.graphite[0], BRAND.graphite[1], BRAND.graphite[2]);
  doc.text(`${empresa.cidade || "—"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy")}`, pageW - marginX, y, { align: "right" });
  y += 10;

  y = signatureBlock(ctx, y, [
    { nome: func.nome, papel: "Colaborador", documento: func.cpf ? `CPF ${func.cpf}` : undefined },
    { nome: empresa.nome_responsavel || empresa.nome_fantasia || empresa.razao_social, papel: empresa.cargo_responsavel || "Responsável — Empregador" },
  ]);

  finalizeBranded(ctx);
  return doc.output("blob");
}
