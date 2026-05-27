/**
 * Gerador da Ficha de Pré-Cadastro do Funcionário (PDF).
 * Documento destinado à contabilidade para realização do registro do colaborador.
 */
import jsPDF from "jspdf";
import {
  BRAND,
  initBrandedDoc,
  finalizeBranded,
  sectionTitle,
  ensureSpace,
  brandedAddPage,
  signatureBlock,
  type BrandEmpresa,
} from "./pdfBrand";
import { supabase } from "@/integrations/supabase/client";

export interface FichaPreCadastroData {
  // Pessoais
  nome: string;
  foto?: string | null;
  data_nascimento?: string | null;
  estado_civil?: string | null;
  nacionalidade?: string | null;
  nome_mae?: string | null;
  nome_pai?: string | null;
  escolaridade?: string | null;
  telefone?: string | null;
  dependentes?: number | null;
  rne?: string | null;
  data_entrada_pais?: string | null;
  // Documentos
  cpf?: string | null;
  rg?: string | null;
  pis?: string | null;
  ctps?: string | null;
  serie_ctps?: string | null;
  titulo_eleitor?: string | null;
  zona_eleitoral?: string | null;
  secao_eleitoral?: string | null;
  cnh?: string | null;
  categoria_cnh?: string | null;
  validade_cnh?: string | null;
  // Endereço
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  // Trabalho
  cargo?: string | null;
  data_admissao?: string | null;
  salario_base?: number | null;
  salario_combinado?: number | null;
  tipo_remuneracao?: string | null;
  escala?: string | null;
  obra_nome?: string | null;
  // Bancário
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: string | null;
  codigo_pix?: string | null;
  // Dependentes
  dependentes_lista?: Array<{ nome: string; cpf: string; dataNascimento: string }>;
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("pt-BR");
  } catch {
    return d || "—";
  }
}

function fmtMoney(v?: number | null): string {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function v(value?: string | number | null): string {
  if (value === 0) return "0";
  return value != null && String(value).trim() !== "" ? String(value) : "—";
}

/** Renderiza grid de campos com rótulo em caixa alta + valor; quebra de página automática. */
function fieldsGrid(
  ctx: Awaited<ReturnType<typeof initBrandedDoc>>,
  y: number,
  fields: Array<[string, string]>,
  cols = 3,
): number {
  const { doc, pageW, marginX } = ctx;
  const rowH = 11;
  const w = (pageW - marginX * 2) / cols;
  const rows = Math.ceil(fields.length / cols);

  for (let r = 0; r < rows; r++) {
    y = ensureSpace(ctx, y, rowH + 2);
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= fields.length) break;
      const [label, value] = fields[idx];
      const x = marginX + c * w;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
      const text = doc.splitTextToSize(value || "—", w - 4);
      doc.text(text[0] || "—", x, y + 4.5);
      // sublinha
      doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
      doc.setLineWidth(0.2);
      doc.line(x, y + 6.5, x + w - 4, y + 6.5);
    }
    y += rowH;
  }
  return y + 2;
}

async function loadEmpresa(empresaId?: string | null): Promise<BrandEmpresa> {
  if (!empresaId) {
    return { razao_social: "Irmãos Ubero Engenharia" };
  }
  const { data } = await supabase
    .from("empresas")
    .select("razao_social, nome_fantasia, cnpj, endereco, cidade, uf, cep, telefone, email, cor_primaria, cor_secundaria")
    .eq("id", empresaId)
    .maybeSingle();
  return (data as BrandEmpresa) || { razao_social: "Irmãos Ubero Engenharia" };
}

export async function gerarFichaPreCadastroPdf(
  data: FichaPreCadastroData,
  empresaId?: string | null,
  options?: { download?: boolean; returnBlob?: boolean },
): Promise<Blob | void> {
  const download = options?.download ?? true;
  const returnBlob = options?.returnBlob ?? false;
  const empresa = await loadEmpresa(empresaId);

  const ctx = await initBrandedDoc({
    empresa,
    documentTitle: "Ficha de Pré-Cadastro",
    orientation: "portrait",
  });
  const { doc, pageW, marginX } = ctx;
  let y = 40;

  // Cartão com foto (se houver) + nome/cargo
  const cardH = 28;
  doc.setFillColor(BRAND.surface[0], BRAND.surface[1], BRAND.surface[2]);
  doc.roundedRect(marginX, y, pageW - marginX * 2, cardH, 2, 2, "F");
  doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(marginX, y, pageW - marginX * 2, cardH, 2, 2, "S");

  let textX = marginX + 6;
  if (data.foto) {
    try {
      doc.addImage(data.foto, "JPEG", marginX + 3, y + 3, 22, 22, undefined, "FAST");
      textX = marginX + 30;
    } catch { /* ignore */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
  doc.text(data.nome || "—", textX, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
  doc.text(`Cargo: ${v(data.cargo)}`, textX, y + 16);
  doc.text(
    `Admissão: ${fmtDate(data.data_admissao)}   •   Obra: ${v(data.obra_nome)}`,
    textX,
    y + 22,
  );
  y += cardH + 6;

  // Aviso para contabilidade
  doc.setFillColor(BRAND.green[0], BRAND.green[1], BRAND.green[2]);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.roundedRect(marginX, y, pageW - marginX * 2, 8, 1.5, 1.5, "F");
  doc.text(
    "DOCUMENTO PARA REGISTRO — encaminhar à contabilidade",
    pageW / 2,
    y + 5.3,
    { align: "center" },
  );
  y += 12;

  // 1. Dados Pessoais
  y = sectionTitle(ctx, y, "Dados Pessoais", 1);
  y = fieldsGrid(ctx, y, [
    ["Nome Completo", v(data.nome)],
    ["Data de Nascimento", fmtDate(data.data_nascimento)],
    ["Estado Civil", v(data.estado_civil)],
    ["Nacionalidade", v(data.nacionalidade)],
    ["Escolaridade", v(data.escolaridade)],
    ["Telefone", v(data.telefone)],
    ["Nome da Mãe", v(data.nome_mae)],
    ["Nome do Pai", v(data.nome_pai)],
    ["Nº de Dependentes", v(data.dependentes ?? 0)],
    ...(data.rne
      ? ([
          ["RNE", v(data.rne)],
          ["Entrada no País", fmtDate(data.data_entrada_pais)],
        ] as Array<[string, string]>)
      : []),
  ]);

  // 2. Documentos
  y = sectionTitle(ctx, y, "Documentos", 2);
  y = fieldsGrid(ctx, y, [
    ["CPF", v(data.cpf)],
    ["RG", v(data.rg)],
    ["PIS/PASEP", v(data.pis)],
    ["CTPS", v(data.ctps)],
    ["Série CTPS", v(data.serie_ctps)],
    ["Título de Eleitor", v(data.titulo_eleitor)],
    ["Zona Eleitoral", v(data.zona_eleitoral)],
    ["Seção Eleitoral", v(data.secao_eleitoral)],
    ["CNH", v(data.cnh)],
    ["Categoria CNH", v(data.categoria_cnh)],
    ["Validade CNH", fmtDate(data.validade_cnh)],
  ]);

  // 3. Endereço
  y = sectionTitle(ctx, y, "Endereço", 3);
  y = fieldsGrid(ctx, y, [
    ["Logradouro", v(data.endereco)],
    ["Bairro", v(data.bairro)],
    ["Cidade", v(data.cidade)],
    ["UF", v(data.uf)],
    ["CEP", v(data.cep)],
  ]);

  // 4. Dados de Trabalho
  y = sectionTitle(ctx, y, "Dados de Trabalho", 4);
  y = fieldsGrid(ctx, y, [
    ["Cargo", v(data.cargo)],
    ["Data de Admissão", fmtDate(data.data_admissao)],
    ["Tipo de Remuneração", v(data.tipo_remuneracao)],
    ["Escala", v(data.escala)],
    ["Salário Base (Registro)", fmtMoney(data.salario_base)],
    ["Salário Combinado", fmtMoney(data.salario_combinado)],
    ["Obra de Lotação", v(data.obra_nome)],
  ]);

  // 5. Dados Bancários
  y = sectionTitle(ctx, y, "Dados Bancários", 5);
  y = fieldsGrid(ctx, y, [
    ["Banco", v(data.banco)],
    ["Agência", v(data.agencia)],
    ["Conta", v(data.conta)],
    ["Tipo de Conta", v(data.tipo_conta)],
    ["Código PIX", v(data.codigo_pix)],
  ]);

  // 6. Dependentes
  if (data.dependentes_lista && data.dependentes_lista.length > 0) {
    y = sectionTitle(ctx, y, "Dependentes", 6);
    const colW = (pageW - marginX * 2) / 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
    y = ensureSpace(ctx, y, 8);
    doc.text("NOME", marginX, y);
    doc.text("CPF", marginX + colW, y);
    doc.text("DATA DE NASCIMENTO", marginX + colW * 2, y);
    y += 2;
    doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
    doc.line(marginX, y, pageW - marginX, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(BRAND.black[0], BRAND.black[1], BRAND.black[2]);
    for (const d of data.dependentes_lista) {
      y = ensureSpace(ctx, y, 7);
      doc.text(v(d.nome), marginX, y);
      doc.text(v(d.cpf), marginX + colW, y);
      doc.text(fmtDate(d.dataNascimento), marginX + colW * 2, y);
      y += 6;
    }
    y += 4;
  }

  // Observações para contabilidade
  y = ensureSpace(ctx, y, 28);
  doc.setFillColor(BRAND.surface[0], BRAND.surface[1], BRAND.surface[2]);
  doc.roundedRect(marginX, y, pageW - marginX * 2, 22, 2, 2, "F");
  doc.setDrawColor(BRAND.hairline[0], BRAND.hairline[1], BRAND.hairline[2]);
  doc.roundedRect(marginX, y, pageW - marginX * 2, 22, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRAND.muted[0], BRAND.muted[1], BRAND.muted[2]);
  doc.text("OBSERVAÇÕES DA CONTABILIDADE", marginX + 4, y + 6);
  y += 26;

  // Assinaturas
  y = ensureSpace(ctx, y, 36);
  y = signatureBlock(ctx, y, [
    { nome: data.nome || "Funcionário(a)", papel: "Assinatura do Funcionário", documento: data.cpf ? `CPF: ${data.cpf}` : undefined },
    { nome: empresa.nome_fantasia || empresa.razao_social, papel: "RH / Responsável pelo Pré-Cadastro" },
  ]);

  finalizeBranded(ctx);
  const safeName = (data.nome || "funcionario").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
  if (download) doc.save(`ficha_pre_cadastro_${safeName}.pdf`);
  if (returnBlob) return doc.output("blob");
}
