import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

function hexToRgb(hex?: string | null): [number, number, number] {
  const fallback: [number, number, number] = [60, 80, 45];
  if (!hex) return fallback;
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return fallback;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null as any);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function safeDate(d: any): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return format(dt, "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

/**
 * Gera PDF da Ficha de EPI (NR-6) com identidade da empresa e
 * coluna de rubrica para assinatura física por item entregue.
 */
export async function gerarFichaEPIPdf(funcionarioId: string, empresaId: string): Promise<Blob> {
  // 1. Buscar dados
  const { data: func } = await supabase
    .from("funcionarios")
    .select("nome, cpf, rg, cargo, data_admissao")
    .eq("id", funcionarioId)
    .single();
  if (!func) throw new Error("Funcionário não encontrado");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("razao_social, nome_fantasia, cnpj, endereco, cidade, uf, cep, telefone, email, logo_url, cor_primaria, cor_secundaria")
    .eq("id", empresaId)
    .single();
  if (!empresa) throw new Error("Empresa não encontrada");

  const { data: entregas } = await supabase
    .from("entregas_epi")
    .select(`
      id, data_entrega, quantidade, ca_numero, observacoes, produto_id, obra_id,
      produtos (descricao, ca_numero),
      obras (codigo, nome)
    `)
    .eq("funcionario_id", funcionarioId)
    .order("data_entrega", { ascending: true });

  // 2. Montar PDF
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const primary = hexToRgb(empresa.cor_primaria);
  const secondary = hexToRgb(empresa.cor_secundaria);

  // Barra superior
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageW, 4, "F");

  // Logo
  let textX = 14;
  if (empresa.logo_url) {
    const logo = await loadImageAsBase64(empresa.logo_url);
    if (logo) {
      try {
        doc.addImage(logo, "PNG", 14, 8, 28, 18);
        textX = 46;
      } catch { /* ignore */ }
    }
  }

  // Cabeçalho empresa
  doc.setTextColor(secondary[0], secondary[1], secondary[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(empresa.nome_fantasia || empresa.razao_social, textX, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  let y = 18;
  doc.text(`${empresa.razao_social} • CNPJ: ${empresa.cnpj}`, textX, y); y += 4;
  if (empresa.endereco) {
    const localizacao = [empresa.endereco, empresa.cidade, empresa.uf].filter(Boolean).join(", ");
    doc.text(localizacao, textX, y); y += 4;
  }
  const contato = [empresa.telefone, empresa.email].filter(Boolean).join(" • ");
  if (contato) { doc.text(contato, textX, y); y += 4; }

  // Título
  y = 36;
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageW - 14, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("FICHA DE CONTROLE DE EPI – NR-6", pageW / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Equipamento de Proteção Individual • Norma Regulamentadora nº 6 do MTE", pageW / 2, y, { align: "center" });
  y += 6;

  // Bloco do funcionário
  doc.setFillColor(245, 247, 240);
  doc.rect(14, y, pageW - 28, 22, "F");
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DADOS DO FUNCIONÁRIO", 17, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nome: ${func.nome}`, 17, y + 11);
  doc.text(`CPF: ${func.cpf || "—"}`, 17, y + 16);
  doc.text(`RG: ${func.rg || "—"}`, 80, y + 16);
  doc.text(`Cargo: ${func.cargo || "—"}`, 17, y + 21);
  doc.text(`Admissão: ${safeDate(func.data_admissao)}`, 110, y + 21);
  y += 26;

  // Tabela de itens com coluna RUBRICA
  const linhas = (entregas || []).map((e: any, i) => {
    return [
      String(i + 1),
      safeDate(e.data_entrega),
      e.produtos?.descricao || "EPI / Equipamento",
      e.ca_numero || e.produtos?.ca_numero || "—",
      String(e.quantidade),
      e.observacoes || "—",
      e.obras ? `${e.obras.codigo}` : "—",
      "", // RUBRICA
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Data", "EPI / Equipamento", "Nº CA", "Qtd", "Motivo", "Obra", "Rubrica"]],
    body: linhas.length ? linhas : [["—", "—", "Nenhuma entrega registrada", "—", "—", "—", "—", ""]],
    theme: "grid",
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: { fontSize: 8, valign: "middle" },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { halign: "center", cellWidth: 20 },
      2: { cellWidth: "auto" },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "center", cellWidth: 10 },
      5: { cellWidth: 30 },
      6: { halign: "center", cellWidth: 16 },
      7: { cellWidth: 28, minCellHeight: 12 }, // espaço para rubrica
    },
    margin: { left: 14, right: 14 },
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  const textoCustos = "Valores de referência para reposição (em caso de extrativo, perda ou não devolução): Camiseta R$ 25,00 | Calça R$ 60,00 | Bota R$ 50,0,0 | Cinto+Talabarte R$ 300,00 | Capacete R$ 30,00.";
  doc.text(textoCustos, 14, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("TERMO DE RESPONSABILIDADE – NR-6", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  const termo = [
    "Declaro ter recebido da empresa, gratuitamente, os Equipamentos de Proteção Individual (EPIs) acima discriminados, em perfeitas condições de uso, comprometendo-me a:",
    "1. Usar os EPIs apenas para a finalidade a que se destinam, durante toda a jornada de trabalho.",
    "2. Responsabilizar-me pela guarda e conservação dos EPIs recebidos.",
    "3. Comunicar ao empregador qualquer alteração que torne os EPIs impróprios para o uso.",
    "4. Cumprir as determinações do empregador sobre o uso adequado dos EPIs.",
    "5. Devolver os EPIs ao empregador quando do desligamento, troca por novos ou em caso de transferência.",
    "Estou ciente de que o não cumprimento das obrigações constitui ato faltoso, conforme art. 158 da CLT e NR-6 do MTE.",
  ];
  termo.forEach(linha => {
    const split = doc.splitTextToSize(linha, pageW - 28);
    doc.text(split, 14, y);
    y += split.length * 3.8 + 1;
  });

  y += 6;
  if (y > pageH - 40) { doc.addPage(); y = 20; }

  // Assinatura final
  const localData = `${empresa.cidade || ""}${empresa.uf ? `/${empresa.uf}` : ""}, ${format(new Date(), "dd/MM/yyyy")}`;
  doc.setFontSize(9);
  doc.text(localData, pageW - 14, y, { align: "right" });
  y += 14;

  // Linha de assinatura final
  const assW = 80;
  const assX = (pageW - assW) / 2;
  doc.setDrawColor(0, 0, 0);
  doc.line(assX, y, assX + assW, y);
  y += 4;
  doc.setFontSize(8);
  doc.text(func.nome, pageW / 2, y, { align: "center" });
  y += 4;
  doc.setTextColor(100, 100, 100);
  doc.text(`CPF: ${func.cpf || "—"}`, pageW / 2, y, { align: "center" });

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Ficha gerada em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} • Página ${i} de ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  return doc.output("blob");
}
