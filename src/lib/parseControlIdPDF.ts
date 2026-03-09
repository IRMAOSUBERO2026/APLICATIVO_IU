import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PontoFuncionario {
  nome: string;
  cpf: string;
  cargo: string;
  departamento: string;
  faltas: number;
  extraDiurnaHoras: number; // total em horas decimais
  extraNoturnHoras: number;
  horasNegativas: number;
}

/**
 * Converte "HH:MM" para horas decimais. Ex: "37:43" => 37.7167
 */
function hhmmToDecimal(hhmm: string): number {
  const match = hhmm.match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
}

/**
 * Parse a single page text block for one employee
 */
function parseEmployeePage(text: string): PontoFuncionario | null {
  // Extract employee info
  const nomeMatch = text.match(/NOME DO FUNCION[ÁA]RIO:\s*(.+)/i);
  const cpfMatch = text.match(/CPF DO FUNCION[ÁA]RIO:\s*(\d+)/i);
  const cargoMatch = text.match(/NOME DO CARGO:\s*(.+)/i);
  const deptoMatch = text.match(/NOME DO DEPARTAMENTO:\s*(.+)/i);

  if (!nomeMatch || !cpfMatch) return null;

  const nome = nomeMatch[1].trim();
  const cpf = cpfMatch[1].trim();
  const cargo = cargoMatch?.[1]?.trim() ?? "";
  const departamento = deptoMatch?.[1]?.trim() ?? "";

  // Count faltas: lines containing "Falta" as clock entries
  // Each day with all entries as "Falta" = 1 day of absence
  // We look for the TOTAIS line which has the summary
  let faltas = 0;
  let extraDiurnaHoras = 0;
  let extraNoturnHoras = 0;

  // Strategy: count lines where all ENT/SAÍ are "Falta"
  const lines = text.split("\n");
  
  for (const line of lines) {
    // Match day lines like "02/02/2026 - SEG" with schedule
    const dayMatch = line.match(/^\d{2}\/\d{2}\/\d{4}\s*-\s*(SEG|TER|QUA|QUI|SEX|SAB|DOM)/i);
    if (!dayMatch) continue;
    
    const dayOfWeek = dayMatch[1].toUpperCase();
    if (dayOfWeek === "DOM" || dayOfWeek === "SAB") continue; // Skip weekends
    
    // Check if this is a full day absence (all entries are "Falta")
    // A working day with schedule that has all punch entries as "Falta"
    const hasPrevisto = /\d{2}:\d{2}-\d{2}:\d{2}/.test(line);
    if (!hasPrevisto) continue; // No schedule = not a working day
    
    // Count "Falta" occurrences in this line
    const faltaCount = (line.match(/Falta/gi) || []).length;
    // If all 4 entries (ENT.1, SAÍ.1, ENT.2, SAÍ.2) are Falta, it's a full day absence
    if (faltaCount >= 4) {
      faltas++;
    }
  }

  // Extract totals from TOTAIS line
  // Look for time patterns in the TOTAIS line area
  const totaisIdx = text.indexOf("TOTAIS");
  if (totaisIdx !== -1) {
    const totaisBlock = text.substring(totaisIdx, totaisIdx + 500);
    
    // Find all time values (HH:MM format) in the totals area
    const timeValues = totaisBlock.match(/\d+:\d{2}/g) || [];
    
    // The structure varies, but typically the last time values in TOTAIS
    // represent hours worked and extras. We need a more robust approach.
    // Look for the TOTAIS row in the table format
    const totaisLines = totaisBlock.split("\n");
    for (const tl of totaisLines) {
      if (/TOTAIS/i.test(tl)) {
        // Extract all HH:MM values from this line
        const times = tl.match(/\d+:\d{2}/g) || [];
        // In the Control iD format, the TOTAIS row contains:
        // [total_normais, total_falta_horas, extra_diurna, extra_noturna, ...]
        // But the exact positions vary. Let's use a heuristic:
        // Usually the pattern is: total_worked, falta_count, falta_hours, extra_diurna, extra_noturna
        if (times.length >= 2) {
          // The last few times are usually extras
          // Let's look for the extra values - they tend to appear after falta hours
          // For now, simple approach: if there are extras, they appear at the end
          extraDiurnaHoras = times.length > 2 ? hhmmToDecimal(times[times.length - 2]) : 0;
          // Check if the last two times are identical (which means only diurna)
          if (times.length >= 2 && times[times.length - 1] === times[times.length - 2]) {
            extraDiurnaHoras = hhmmToDecimal(times[times.length - 1]);
          }
        }
        break;
      }
    }
  }

  // Alternative: sum extra diurna per day line
  // This is more reliable than parsing TOTAIS
  let totalExtraDiurna = 0;
  for (const line of lines) {
    const dayMatch = line.match(/^\d{2}\/\d{2}\/\d{4}\s*-\s*(SEG|TER|QUA|QUI|SEX|SAB|DOM)/i);
    if (!dayMatch) continue;
    
    // Look for time patterns that could be extras
    // In the table, extras appear after the regular hours columns
    // We need to find patterns like "04:02" in the extra columns
    // This is tricky without proper column parsing
  }

  return {
    nome,
    cpf,
    cargo,
    departamento,
    faltas,
    extraDiurnaHoras: totalExtraDiurna || extraDiurnaHoras,
    extraNoturnHoras,
    horasNegativas: 0,
  };
}

/**
 * Parse a Control iD "Cartão de Ponto" PDF
 * Returns extracted data per employee
 */
export async function parseControlIdPDF(file: File): Promise<PontoFuncionario[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const results: PontoFuncionario[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Reconstruct text with positioning info for better parsing
    const items = content.items as any[];
    
    // Sort by Y position (top to bottom), then X (left to right)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]; // Y is inverted in PDF
      if (Math.abs(yDiff) > 3) return yDiff; // Same line threshold
      return a.transform[4] - b.transform[4]; // Sort by X
    });
    
    // Group items into lines based on Y position
    const lineGroups: { y: number; items: any[] }[] = [];
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      const existing = lineGroups.find((g) => Math.abs(g.y - y) < 4);
      if (existing) {
        existing.items.push(item);
      } else {
        lineGroups.push({ y, items: [item] });
      }
    }
    
    // Sort lines top to bottom, items left to right
    lineGroups.sort((a, b) => b.y - a.y);
    const textLines = lineGroups.map((g) => {
      g.items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
      return g.items.map((it: any) => it.str).join(" ");
    });
    
    const fullText = textLines.join("\n");
    
    // Each page is one employee
    if (fullText.includes("Cartão de Ponto") || fullText.includes("NOME DO FUNCION")) {
      const emp = parseEmployeePage(fullText);
      if (emp) {
        results.push(emp);
      }
    }
  }
  
  return results;
}

/**
 * Simpler approach: use AI to extract structured data
 * For now, use the regex parser above.
 * If the regex parser proves unreliable, switch to AI-based extraction.
 */
