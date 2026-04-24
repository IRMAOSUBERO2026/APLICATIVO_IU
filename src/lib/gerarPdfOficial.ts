import jsPDF from "jspdf";

export async function gerarPdfA4(texto: string, nomeArquivo: string): Promise<Blob> {
  const doc = new jsPDF();
  
  // Configuração da Fonte e tamanho
  doc.setFont("helvetica");

  // Margens
  const margemEsq = 20;
  const margemTop = 20;
  const maxLargura = 170; // 210mm (A4) - margens
  
  // Dividir o texto em linhas pela largura configurada
  const linhas = doc.splitTextToSize(texto, maxLargura);
  
  // Desenho das linhas
  let y = margemTop;
  const linhaAltura = 7;

  linhas.forEach((linha: string) => {
    // Se a próxima linha for ultrapassar o limite da folha (297mm é A4), criar nova página
    if (y + linhaAltura > 280) {
      doc.addPage();
      y = margemTop;
    }
    
    // Tratamento para desenhar as linhas de assinatura de forma mais elegante
    if (linha.includes("_______________________________")) {
        doc.setFont("helvetica", "bold");
    } else {
        doc.setFont("helvetica", "normal");
    }
    
    doc.text(linha, margemEsq, y);
    y += linhaAltura;
  });

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
