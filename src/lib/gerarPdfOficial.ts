import jsPDF from "jspdf";

export interface EmpresaPdf {
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
}

/** Converte HEX (#RRGGBB) para [r,g,b] */
function hexToRgb(hex?: string | null): [number, number, number] {
  const fallback: [number, number, number] = [60, 80, 45]; // verde corporativo padrão
  if (!hex) return fallback;
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return fallback;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Carrega imagem como dataURL para embutir no PDF */
async function carregarImagemDataURL(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfA4(
  texto: string,
  _nomeArquivo: string,
  empresa?: EmpresaPdf | null
): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margemEsq = 20;
  const margemDir = 20;
  const larguraConteudo = pageWidth - margemEsq - margemDir;

  const corPrim = hexToRgb(empresa?.cor_primaria);
  const corSec = hexToRgb(empresa?.cor_secundaria);

  // ===== CABEÇALHO =====
  // Faixa superior colorida
  doc.setFillColor(corPrim[0], corPrim[1], corPrim[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Logo (se houver)
  let logoOcupou = 0;
  if (empresa?.logo_url) {
    const dataUrl = await carregarImagemDataURL(empresa.logo_url);
    if (dataUrl) {
      try {
        // Tentativa de detectar formato pela string
        const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt, margemEsq, 6, 18, 18);
        logoOcupou = 22;
      } catch {
        // ignora se falhar
      }
    }
  }

  // Nome da empresa (em branco sobre faixa colorida)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const nomeEmp = empresa?.nome_fantasia || empresa?.razao_social || "EMPRESA";
  doc.text(nomeEmp.toUpperCase(), margemEsq + logoOcupou, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const linhasEmp: string[] = [];
  if (empresa?.razao_social && empresa?.nome_fantasia && empresa.razao_social !== empresa.nome_fantasia) {
    linhasEmp.push(empresa.razao_social);
  }
  if (empresa?.cnpj) linhasEmp.push(`CNPJ: ${empresa.cnpj}`);
  const enderecoLinha = [empresa?.endereco, empresa?.cidade && empresa?.uf ? `${empresa.cidade}/${empresa.uf}` : empresa?.cidade || empresa?.uf, empresa?.cep]
    .filter(Boolean)
    .join(" • ");
  if (enderecoLinha) linhasEmp.push(enderecoLinha);
  const contatoLinha = [empresa?.telefone, empresa?.email].filter(Boolean).join(" • ");
  if (contatoLinha) linhasEmp.push(contatoLinha);

  let yHeader = 18;
  linhasEmp.slice(0, 3).forEach(l => {
    doc.text(l, margemEsq + logoOcupou, yHeader);
    yHeader += 3.5;
  });

  // Linha fina secundária
  doc.setDrawColor(corSec[0], corSec[1], corSec[2]);
  doc.setLineWidth(0.6);
  doc.line(0, 28.4, pageWidth, 28.4);

  // ===== CORPO =====
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const margemTop = 38;
  const margemBottom = 22; // espaço pro rodapé
  let y = margemTop;
  const linhaAltura = 6.2;

  const linhas = doc.splitTextToSize(texto, larguraConteudo);

  const desenharRodape = (pagina: number, totalPag: number) => {
    doc.setDrawColor(corSec[0], corSec[1], corSec[2]);
    doc.setLineWidth(0.4);
    doc.line(margemEsq, pageHeight - 16, pageWidth - margemDir, pageHeight - 16);

    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const dataGer = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
    doc.text(`Documento gerado em ${dataGer}`, margemEsq, pageHeight - 11);
    doc.text(`Página ${pagina} de ${totalPag}`, pageWidth - margemDir, pageHeight - 11, { align: "right" });
    if (empresa?.razao_social) {
      doc.text(empresa.razao_social, pageWidth / 2, pageHeight - 11, { align: "center" });
    }
  };

  // Primeira passada: desenha texto criando páginas conforme necessário
  let paginaAtual = 1;
  linhas.forEach((linha: string) => {
    if (y + linhaAltura > pageHeight - margemBottom) {
      doc.addPage();
      paginaAtual++;
      // Re-desenha cabeçalho compacto na continuação
      doc.setFillColor(corPrim[0], corPrim[1], corPrim[2]);
      doc.rect(0, 0, pageWidth, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(nomeEmp.toUpperCase(), margemEsq, 8);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      y = 22;
    }

    if (linha.includes("___________")) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(linha, margemEsq, y);
    y += linhaAltura;
  });

  // Desenha rodapés em todas as páginas (com total correto)
  const totalPag = doc.getNumberOfPages();
  for (let p = 1; p <= totalPag; p++) {
    doc.setPage(p);
    desenharRodape(p, totalPag);
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Abre PDF em nova aba para impressão direta */
export function imprimirBlob(blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.addEventListener("load", () => {
      try { w.print(); } catch { /* ignora */ }
    });
  }
}
