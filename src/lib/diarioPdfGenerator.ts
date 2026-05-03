import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateDiarioPdf = (diario: any, obra: any) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Cores corporativas
  const primaryColor = [22, 163, 74]; // bg-primary (green-600 approx)
  const textColor = [51, 51, 51];
  
  let currentY = 15;

  // --- CABEÇALHO ---
  // Desenhando o box do cabeçalho
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, currentY, pageWidth - 28, 30, 2, 2, "FD");

  // Texto do cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("RELATÓRIO DIÁRIO DE OBRA (RDO)", pageWidth / 2, currentY + 10, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  // Logo placeholder (Se tiver base64 da logo, pode usar doc.addImage)
  doc.setFont("helvetica", "bold");
  doc.text("IU ENGENHARIA", 18, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Construção & Engenharia", 18, currentY + 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Obra:`, 18, currentY + 20);
  doc.setFont("helvetica", "normal");
  doc.text(`${obra?.codigo || ""} - ${obra?.nome || ""}`, 30, currentY + 20);

  doc.setFont("helvetica", "bold");
  doc.text(`Data:`, pageWidth - 60, currentY + 20);
  doc.setFont("helvetica", "normal");
  const dataFormatada = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(diario.data));
  doc.text(dataFormatada, pageWidth - 48, currentY + 20);

  doc.setFont("helvetica", "bold");
  doc.text(`Responsável:`, 18, currentY + 26);
  doc.setFont("helvetica", "normal");
  doc.text(diario.responsavel || "Não informado", 45, currentY + 26);

  currentY += 35;

  // Extrai os dados embutidos nas observacoes (JSON)
  let extraData: any = {};
  try {
    if (diario.observacoes && diario.observacoes.startsWith("{")) {
      extraData = JSON.parse(diario.observacoes);
    }
  } catch (e) {
    console.error("Falha ao ler dados extras do RDO", e);
  }

  // --- CLIMA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("1. CONDIÇÕES CLIMÁTICAS E DE OPERAÇÃO", 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['Manhã', 'Tarde', 'Condição da Obra']],
    body: [
      [extraData.climaManha || "—", extraData.climaTarde || "—", extraData.condicaoObra || "—"]
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor as any, textColor: 255 },
    styles: { fontSize: 9 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- MÃO DE OBRA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("2. EFETIVO (MÃO DE OBRA)", 14, currentY);
  currentY += 5;

  const equipeBody = [];
  if (extraData.maoDeObraPropria && extraData.maoDeObraPropria.length > 0) {
    extraData.maoDeObraPropria.forEach((m: any) => equipeBody.push(["IU Engenharia (Própria)", m.funcao || "—", m.quantidade || 0]));
  }
  if (extraData.maoDeObraTerceirizada && extraData.maoDeObraTerceirizada.length > 0) {
    extraData.maoDeObraTerceirizada.forEach((m: any) => equipeBody.push([m.empresa || "Terceirizada", m.funcao || "—", m.quantidade || 0]));
  }
  if (equipeBody.length === 0) equipeBody.push(["—", "Nenhum efetivo registrado", "0"]);

  autoTable(doc, {
    startY: currentY,
    head: [['Empresa', 'Função', 'Quantidade']],
    body: equipeBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor as any, textColor: 255 },
    styles: { fontSize: 9 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- EQUIPAMENTOS ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("3. EQUIPAMENTOS", 14, currentY);
  currentY += 5;

  const equipBody = [];
  if (extraData.equipamentos && extraData.equipamentos.length > 0) {
    extraData.equipamentos.forEach((e: any) => equipBody.push([e.descricao || "—", e.quantidade || 0, e.status || "—"]));
  } else {
    equipBody.push(["Nenhum equipamento registrado", "0", "—"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Equipamento', 'Quantidade', 'Status']],
    body: equipBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor as any, textColor: 255 },
    styles: { fontSize: 9 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- ATIVIDADES ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("4. ATIVIDADES EXECUTADAS", 14, currentY);
  currentY += 5;

  const ativBody = [];
  if (extraData.atividades && extraData.atividades.length > 0) {
    extraData.atividades.forEach((a: any) => ativBody.push([a.descricao || "—", a.local || "—", a.status || "—"]));
  } else {
    ativBody.push(["Nenhuma atividade registrada", "—", "—"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Descrição', 'Local', 'Status']],
    body: ativBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor as any, textColor: 255 },
    styles: { fontSize: 9 }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- OCORRÊNCIAS ---
  if (diario.ocorrencias) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red
    doc.text("5. OCORRÊNCIAS / OBSERVAÇÕES", 14, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitOcorrencias = doc.splitTextToSize(diario.ocorrencias, pageWidth - 28);
    doc.text(splitOcorrencias, 14, currentY);
    currentY += (splitOcorrencias.length * 5) + 10;
  }

  // --- RESUMO IA ---
  if (extraData.resumoIA) {
    // Nova página se não couber
    if (currentY > 250) { doc.addPage(); currentY = 20; }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("RESUMO EXECUTIVO (Gerado por Inteligência Artificial)", 14, currentY);
    currentY += 5;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const splitResumo = doc.splitTextToSize(extraData.resumoIA, pageWidth - 28);
    doc.text(splitResumo, 14, currentY);
    currentY += (splitResumo.length * 4) + 10;
  }

  // --- ASSINATURAS ---
  if (currentY > 230) { doc.addPage(); currentY = 30; } else { currentY += 30; }
  
  doc.setDrawColor(0);
  doc.line(30, currentY, 80, currentY); // Linha assin 1
  doc.line(130, currentY, 180, currentY); // Linha assin 2
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ENG. RESPONSÁVEL", 55, currentY + 5, { align: "center" });
  doc.text("FISCALIZAÇÃO / CLIENTE", 155, currentY + 5, { align: "center" });

  // Download
  const filename = `RDO_${obra?.codigo || "OBRA"}_${dataFormatada.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
};
