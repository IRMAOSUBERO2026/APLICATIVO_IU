// src/utils/afdParser.ts
export interface AFDCabecalho {
  relogioSerial: string;
  empresa: string;
  formato: 'ANTIGO' | 'REP_C';
  dataInicio: string | null;
  dataFim: string | null;
}

export interface AFDBatida {
  nsr: number;
  cpf: string;
  dataHora: Date;
}

export interface AFDFuncionario {
  cpf: string;
  nome: string;
  operacao: 'I' | 'A' | 'E';
  dataHora: Date;
}

export interface AFDParseResult {
  cabecalho: AFDCabecalho;
  batidas: AFDBatida[];
  funcionarios: AFDFuncionario[];
  erros: string[];
}

export function formatarCPF(cpf: string) {
  let c = cpf.replace(/\D/g, "");
  if (c.length === 12 && c.startsWith("0")) c = c.substring(1);
  if (c.length !== 11) return c;
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function extractCpf(raw: string) {
  let c = raw.replace(/\D/g, "");
  if (c.length === 12 && c.startsWith("0")) c = c.substring(1);
  return c;
}

export function parseAFD(texto: string): AFDParseResult {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);
  const result: AFDParseResult = {
    cabecalho: {
      relogioSerial: "DESCONHECIDO",
      empresa: "NÃO IDENTIFICADA",
      formato: "ANTIGO",
      dataInicio: null,
      dataFim: null,
    },
    batidas: [],
    funcionarios: [],
    erros: [],
  };

  if (linhas.length === 0) {
    result.erros.push("Arquivo vazio");
    return result;
  }

  // Detecta o formato olhando a primeira linha (cabeçalho)
  const cabecalhoStr = linhas[0];
  if (cabecalhoStr.includes("REP_C") || cabecalhoStr.match(/\d{4}-\d{2}-\d{2}T/)) {
    result.cabecalho.formato = "REP_C";
  }

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.length < 10) continue;
    
    const nsrStr = linha.substring(0, 9);
    const tipo = linha.substring(9, 10);
    const nsr = parseInt(nsrStr, 10);

    try {
      if (tipo === "1") {
        // Cabeçalho (identificador do relógio e empresa)
        if (result.cabecalho.formato === "ANTIGO") {
          result.cabecalho.empresa = linha.substring(46, 196).trim(); // Estimativa comum
          const dataIni = linha.substring(196, 204);
          if (dataIni.length === 8) {
            result.cabecalho.dataInicio = `${dataIni.substring(0,2)}/${dataIni.substring(2,4)}/${dataIni.substring(4,8)}`;
          }
        } else {
          // REP-C header logic (flexível)
          const dateMatch = linha.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          if (dateMatch) {
             result.cabecalho.dataInicio = dateMatch[0].split("T")[0];
          }
        }
      } 
      else if (tipo === "3") {
        // Batida de Ponto
        if (result.cabecalho.formato === "ANTIGO") {
          // Formato: 000000000 (9) + 3 (1) + DDMMYYYY (8) + HHMM (4) + PIS (12)
          const data = linha.substring(10, 18);
          const hora = linha.substring(18, 22);
          const pis = linha.substring(22, 34);
          
          if (data.length === 8 && hora.length === 4) {
            // Monta ISO Date as local timezone
            const isoData = `${data.substring(4,8)}-${data.substring(2,4)}-${data.substring(0,2)}T${hora.substring(0,2)}:${hora.substring(2,4)}:00-03:00`;
            const dateObj = new Date(isoData);
            
            if (!isNaN(dateObj.getTime())) {
              result.batidas.push({ nsr, cpf: extractCpf(pis), dataHora: dateObj });
            } else {
              result.erros.push(`Data inválida na linha ${i+1}: ${isoData}`);
            }
          }
        } else {
          // REP_C
          // Procura data ISO e depois o CPF
          const dateMatch = linha.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2,4})?/);
          if (dateMatch) {
            const dateStr = dateMatch[0];
            const rest = linha.substring(linha.indexOf(dateStr) + dateStr.length);
            const cpfMatch = rest.match(/\d{11,12}/);
            
            if (cpfMatch) {
              const dateObj = new Date(dateStr);
              if (!isNaN(dateObj.getTime())) {
                result.batidas.push({ nsr, cpf: extractCpf(cpfMatch[0]), dataHora: dateObj });
              }
            }
          }
        }
      } 
      else if (tipo === "5") {
        // Funcionário Cadastrado
        if (result.cabecalho.formato === "ANTIGO") {
          const cpf = linha.substring(11, 23);
          const nome = linha.substring(23, 75).trim();
          result.funcionarios.push({ cpf: extractCpf(cpf), nome, operacao: 'I', dataHora: new Date() });
        } else {
          const cpfMatch = linha.match(/\d{11,12}/);
          if (cpfMatch) {
            const rest = linha.substring(linha.indexOf(cpfMatch[0]) + cpfMatch[0].length).replace(/[^A-Za-z \u00C0-\u00FF]/g, '').trim();
            result.funcionarios.push({ cpf: extractCpf(cpfMatch[0]), nome: rest || "Desconhecido", operacao: 'I', dataHora: new Date() });
          }
        }
      }
    } catch (err) {
      result.erros.push(`Falha no parse da linha ${i+1}`);
    }
  }

  // Ordena batidas por tempo
  result.batidas.sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

  if (result.batidas.length > 0 && !result.cabecalho.dataInicio) {
    result.cabecalho.dataInicio = result.batidas[0].dataHora.toISOString().split("T")[0];
    result.cabecalho.dataFim = result.batidas[result.batidas.length - 1].dataHora.toISOString().split("T")[0];
  }

  return result;
}

// ──────────────────────────────────────────────
// LÓGICA HEURÍSTICA DE 4 BATIDAS (ENT1, SAI1, ENT2, SAI2)
// ──────────────────────────────────────────────

export interface DiaPonto {
  ent1: Date | null;
  sai1: Date | null;
  ent2: Date | null;
  sai2: Date | null;
  incompleto: boolean;
  horasTrabalhadas: number; // em horas decimais
}

export function organizarBatidasDiarias(batidas: Date[]): DiaPonto {
  // Inicialmente ordenamos as batidas
  const ordenadas = [...batidas].sort((a, b) => a.getTime() - b.getTime());
  
  let ent1: Date | null = null;
  let sai1: Date | null = null;
  let ent2: Date | null = null;
  let sai2: Date | null = null;

  for (const b of ordenadas) {
    const hora = b.getHours() + (b.getMinutes() / 60);

    // Heurística de slots:
    // Slot 1 (Ent 1): Antes das 10:00
    // Slot 2 (Sai 1): 10:00 às 13:59
    // Slot 3 (Ent 2): 12:00 às 14:59 (com sobreposição prioriza Slot 2 se vazio, depois Slot 3)
    // Slot 4 (Sai 2): 15:00 em diante

    if (hora < 10) {
      if (!ent1) ent1 = b;
      // Se bater duas vezes antes das 10h, ignoramos a segunda ou sobresscrevemos? Ignoramos a primeira e assumimos a segunda (ou vice-versa).
      // Vamos manter a mais cedo.
    } else if (hora >= 10 && hora < 14) {
      if (!sai1) {
        sai1 = b;
      } else if (!ent2) {
        ent2 = b;
      }
    } else if (hora >= 14 && hora < 15) {
      if (!ent2) {
        ent2 = b;
      } else if (!sai1) {
        // Bateu estranho, mas joga no slot anterior se vazio
        sai1 = ent2;
        ent2 = b;
      } else if (!sai2) {
         sai2 = b;
      }
    } else if (hora >= 15) {
      if (!sai2) sai2 = b;
      // se já bateu sai2 mas bateu dnv mais tarde, atualiza o sai2 para a batida mais tardia
      else if (hora > (sai2.getHours() + sai2.getMinutes()/60)) sai2 = b;
    }
  }

  // Falha comum (ex: pessoa não bateu almoço: bateu 7h e 17h)
  // Caso existam exatamente 2 batidas no dia (uma manhã, uma tarde) e elas caíram num slot esquisito,
  // nós forçamos: a primeira é ENT1, a última é SAI2.
  if (ordenadas.length === 2) {
    const first = ordenadas[0];
    const last = ordenadas[1];
    if ((last.getTime() - first.getTime()) > (4 * 60 * 60 * 1000)) { // mais de 4 horas de diferença
      ent1 = first;
      sai1 = null;
      ent2 = null;
      sai2 = last;
    }
  }

  // Tratamento de dias com 4 batidas certinhas, ignorando a heuristica pesada
  if (ordenadas.length === 4) {
    ent1 = ordenadas[0];
    sai1 = ordenadas[1];
    ent2 = ordenadas[2];
    sai2 = ordenadas[3];
  }

  const incompleto = (ent1 === null || sai1 === null || ent2 === null || sai2 === null);
  
  // Cálculo de horas totais no dia
  let horasMs = 0;
  if (ent1 && sai1) horasMs += sai1.getTime() - ent1.getTime();
  if (ent2 && sai2) horasMs += sai2.getTime() - ent2.getTime();
  // Se bateu so inicio e fim (pulou almoco), soma tudo e avisa (incompleto=true)
  if (ent1 && !sai1 && !ent2 && sai2) {
     horasMs += sai2.getTime() - ent1.getTime();
  }

  const horasTrabalhadas = horasMs / (1000 * 60 * 60);

  return { ent1, sai1, ent2, sai2, incompleto, horasTrabalhadas };
}

export function formatTime(d: Date | null): string {
  if (!d) return "--:--";
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: "UTC" });
}
