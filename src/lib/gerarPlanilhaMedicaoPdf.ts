import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ordenarItensContrato } from "@/lib/sortItens";

const fmtBRL = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface MedicaoPdfDados {
  empresa: {
    razao_social?: string; nome_fantasia?: string; cnpj?: string;
    endereco?: string; cidade?: string; uf?: string; telefone?: string; email?: string;
    logo_url?: string; cor_primaria?: string;
  };
  obra: {
    codigo: string; nome: string; cliente?: string; construtora?: string;
    cidade?: string; uf?: string; endereco?: string;
  };
  medicao: {
    numero: number; periodo_inicio: string; periodo_fim: string; data_emissao: string;
    valor_bruto: number; percentual_retencao: number; valor_retencao: number;
    valor_liquido: number; status: string; observacoes?: string;
  };
  itens: Array<{
    item_numero: string; descricao: string; unidade: string;
    quantidade_contrato: number; valor_unitario: number;
    quantidade_anterior: number; quantidade_atual: number;
    quantidade_acumulada: number; saldo_qtd: number;
    valor_atual: number; valor_acumulado: number; saldo_valor: number;
    percentual_acumulado: number;
  }>;
  impostos: Array<{ imposto: string; aliquota: number; valor: number }>;
}

export async function gerarPlanilhaMedicaoPdf(dados: MedicaoPdfDados): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const cor = dados.empresa.cor_primaria || "#3c502d";

  // Cabeçalho
  if (dados.empresa.logo_url) {
    try {
      const img = await fetch(dados.empresa.logo_url).then(r => r.blob());
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(img);
      });
      doc.addImage(base64, "PNG", 10, 8, 22, 22);
    } catch { /* ignora logo */ }
  }

  doc.setTextColor(cor);
  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text(dados.empresa.nome_fantasia || dados.empresa.razao_social || "", 36, 14);
  doc.setTextColor(80);
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text(`CNPJ: ${dados.empresa.cnpj || "-"}  •  ${dados.empresa.cidade || ""}/${dados.empresa.uf || ""}`, 36, 19);
  doc.text(`${dados.empresa.endereco || ""}`, 36, 23);
  doc.text(`Tel: ${dados.empresa.telefone || "-"}  •  ${dados.empresa.email || ""}`, 36, 27);

  // Título
  doc.setFillColor(cor);
  doc.rect(10, 33, pageWidth - 20, 10, "F");
  doc.setTextColor(255).setFontSize(12).setFont("helvetica", "bold");
  doc.text(`BOLETIM DE MEDIÇÃO Nº ${String(dados.medicao.numero).padStart(3, "0")}`, 14, 40);
  doc.text(`Status: ${dados.medicao.status.toUpperCase()}`, pageWidth - 14, 40, { align: "right" });

  // Bloco da Obra
  doc.setTextColor(40).setFontSize(9).setFont("helvetica", "normal");
  let y = 49;
  doc.setFont("helvetica", "bold").text("Obra:", 14, y);
  doc.setFont("helvetica", "normal").text(`${dados.obra.codigo} - ${dados.obra.nome}`, 28, y);
  doc.setFont("helvetica", "bold").text("Cliente:", pageWidth / 2, y);
  doc.setFont("helvetica", "normal").text(`${dados.obra.cliente || dados.obra.construtora || "-"}`, pageWidth / 2 + 16, y);
  y += 5;
  doc.setFont("helvetica", "bold").text("Local:", 14, y);
  doc.setFont("helvetica", "normal").text(`${dados.obra.endereco || ""} - ${dados.obra.cidade || ""}/${dados.obra.uf || ""}`, 28, y);
  doc.setFont("helvetica", "bold").text("Período:", pageWidth / 2, y);
  doc.setFont("helvetica", "normal").text(`${dados.medicao.periodo_inicio} a ${dados.medicao.periodo_fim}`, pageWidth / 2 + 16, y);

  // Tabela
  const linhas = dados.itens.map(it => [
    it.item_numero,
    it.descricao,
    it.unidade,
    fmtNum(it.quantidade_contrato),
    fmtBRL(it.valor_unitario),
    fmtNum(it.quantidade_anterior),
    fmtNum(it.quantidade_atual),
    fmtNum(it.quantidade_acumulada),
    `${it.percentual_acumulado.toFixed(2)}%`,
    fmtBRL(it.valor_atual),
    fmtBRL(it.valor_acumulado),
    fmtBRL(it.saldo_valor),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [[
      "Item", "Descrição", "Un",
      "Qtd Contrato", "V.Unit",
      "Qtd Anterior", "Qtd Atual", "Qtd Acum.", "% Acum.",
      "Valor Atual", "Valor Acum.", "Saldo R$",
    ]],
    body: linhas,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: cor as any, textColor: 255, fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 65 },
      2: { cellWidth: 10, halign: "center" },
      3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" },
      7: { halign: "right" }, 8: { halign: "right" },
      9: { halign: "right" }, 10: { halign: "right" }, 11: { halign: "right" },
    },
    didDrawPage: () => {
      doc.setFontSize(7).setTextColor(150);
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" }
      );
    },
  });

  // Resumo financeiro
  let yEnd = (doc as any).lastAutoTable.finalY + 6;
  if (yEnd > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    yEnd = 20;
  }

  const resumo: any[] = [
    ["Valor Bruto da Medição", fmtBRL(dados.medicao.valor_bruto)],
    [`Retenção Contratual (${dados.medicao.percentual_retencao}%)`, `- ${fmtBRL(dados.medicao.valor_retencao)}`],
  ];
  for (const imp of dados.impostos) {
    resumo.push([`${imp.imposto} (${imp.aliquota}%)`, `- ${fmtBRL(imp.valor)}`]);
  }
  const totalImpostos = dados.impostos.reduce((s, i) => s + i.valor, 0);
  const liquido = dados.medicao.valor_bruto - dados.medicao.valor_retencao - totalImpostos;
  resumo.push(["VALOR LÍQUIDO A RECEBER", fmtBRL(liquido)]);

  autoTable(doc, {
    startY: yEnd,
    body: resumo,
    theme: "plain",
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" },
      1: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.row.index === resumo.length - 1) {
        data.cell.styles.fillColor = cor as any;
        data.cell.styles.textColor = 255;
      }
    },
    tableWidth: 180,
    margin: { left: pageWidth - 200 },
  });

  if (dados.medicao.observacoes) {
    const yObs = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(8).setTextColor(40).setFont("helvetica", "bold").text("Observações:", 14, yObs);
    doc.setFont("helvetica", "normal").text(dados.medicao.observacoes, 14, yObs + 5, { maxWidth: pageWidth - 28 });
  }

  // Assinaturas
  const yAss = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(120);
  doc.line(20, yAss, 100, yAss);
  doc.line(pageWidth - 100, yAss, pageWidth - 20, yAss);
  doc.setFontSize(8).setTextColor(80);
  doc.text("Responsável Técnico (Contratada)", 60, yAss + 5, { align: "center" });
  doc.text("Fiscal / Cliente (Contratante)", pageWidth - 60, yAss + 5, { align: "center" });

  doc.save(`Medicao_${String(dados.medicao.numero).padStart(3, "0")}_${dados.obra.codigo}.pdf`);
}
