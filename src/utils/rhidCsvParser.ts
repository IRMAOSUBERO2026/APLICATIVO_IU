// ============================================================================
// Parser de CSV do RHiD (software ControlID) — relatório de ponto por dia.
// Substitui/complementa a importação AFD. Tolerante a falhas: uma linha
// malformada não interrompe a importação — registra o erro e continua.
// ============================================================================

export type OrigemBatida = "FACIAL" | "REP" | "MISTO" | null;
export type TipoDia = "NORMAL" | "FALTA_DIA_COMPLETO" | "FALTA_PARCIAL" | "SEM_REGISTRO";

export interface RHiDDiaRegistro {
  linha: number;
  nomeFuncionario: string;
  cpf: string;
  pis: string;
  dataAdmissao: string | null;
  cargo: string;
  departamento: string; // nome da obra
  cnpjObra: string; // 14 dígitos, somente números
  data: string; // ISO yyyy-mm-dd
  entrada1: string | null;
  saida1: string | null;
  entrada2: string | null;
  saida2: string | null;
  entrada3: string | null;
  saida3: string | null;
  origemBatida: OrigemBatida;
  tipoDia: TipoDia;
  totalNormais: number; // horas decimais
  diaFalta: boolean;
  faltaAtraso: number; // horas decimais
  extraDiurna: number; // horas decimais
  extraNoturna: number; // horas decimais
  justificativas: string;
}

export interface RHiDParseResult {
  registros: RHiDDiaRegistro[];
  erros: string[];
  totalLinhas: number;
  datas: string[]; // datas ISO únicas processadas
  cnpjsObra: string[]; // CNPJs de obra únicos encontrados
}

// Índices de coluna (0-based) conforme cabeçalho do RHiD (29 colunas)
const COL = {
  CPF: 4,
  PIS: 6,
  ADMISSAO: 8,
  CARGO: 9,
  DEPARTAMENTO: 11,
  CENTRO_CUSTO: 12,
  DIA: 13,
  ENT1: 14,
  SAI1: 15,
  ENT2: 16,
  SAI2: 17,
  ENT3: 18,
  SAI3: 19,
  TOTAL_NORMAIS: 20,
  DIA_FALTA: 21,
  FALTA_ATRASO: 22,
  ABONO: 23,
  EXTRA_DIURNA: 24,
  EXTRA_NOTURNA: 25,
  JUSTIFICATIVAS: 28,
  NOME: 3,
};

const apenasDigitos = (s: string) => (s || "").replace(/\D/g, "");

/** Converte "HH:MM" em horas decimais. Vazio -> 0. */
function hhmmParaDecimal(v: string): number {
  const t = (v || "").trim();
  if (!t) return 0;
  const m = t.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

/** Extrai HH:MM:00 de um campo de batida, removendo o sufixo " (C)". */
function extrairHorario(raw: string): { horario: string | null; facial: boolean; falta: boolean } {
  const v = (raw || "").trim();
  if (!v) return { horario: null, facial: false, falta: false };
  if (/falta/i.test(v)) return { horario: null, facial: false, falta: true };
  const facial = /\(C\)/i.test(v);
  const limpo = v.replace(/\(C\)/i, "").trim();
  const m = limpo.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { horario: null, facial, falta: false };
  const hh = m[1].padStart(2, "0");
  return { horario: `${hh}:${m[2]}:00`, facial, falta: false };
}

/** Extrai a data ISO de "01/06/2026 SEG" -> "2026-06-01". */
function extrairDataISO(raw: string): string | null {
  const m = (raw || "").trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Converte "07/10/2024" -> "2024-10-07". */
function extrairDataAdmissao(raw: string): string | null {
  return extrairDataISO(raw);
}

export function parseRHiDCSV(conteudo: string): RHiDParseResult {
  const erros: string[] = [];
  const registros: RHiDDiaRegistro[] = [];
  const datasSet = new Set<string>();
  const cnpjsSet = new Set<string>();

  // Remover BOM e quebrar linhas
  const limpo = conteudo.replace(/^\uFEFF/, "");
  const linhas = limpo.split(/\r?\n/);

  let totalLinhas = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || !linha.trim()) continue;

    const cols = linha.split(";");
    // Cabeçalho
    if (i === 0 && /CPF do funcion/i.test(linha)) continue;
    // Linhas muito curtas / inválidas
    if (cols.length < 26) {
      // Pode ser o cabeçalho sem o texto esperado, ou linha quebrada
      if (i === 0) continue;
      erros.push(`Linha ${i + 1}: formato inválido (${cols.length} colunas).`);
      continue;
    }

    totalLinhas++;

    try {
      const cpf = apenasDigitos(cols[COL.CPF]);
      const data = extrairDataISO(cols[COL.DIA]);
      if (!data) {
        erros.push(`Linha ${i + 1}: data inválida ("${(cols[COL.DIA] || "").trim()}").`);
        continue;
      }

      const b1 = extrairHorario(cols[COL.ENT1]);
      const b2 = extrairHorario(cols[COL.SAI1]);
      const b3 = extrairHorario(cols[COL.ENT2]);
      const b4 = extrairHorario(cols[COL.SAI2]);
      const b5 = extrairHorario(cols[COL.ENT3]);
      const b6 = extrairHorario(cols[COL.SAI3]);

      const principais = [b1, b2, b3, b4];
      const qtdFaltaPrincipal = principais.filter((b) => b.falta).length;
      const qtdHorarios = [b1, b2, b3, b4, b5, b6].filter((b) => b.horario).length;
      const diaFaltaFlag = apenasDigitos(cols[COL.DIA_FALTA]) === "1";

      let tipoDia: TipoDia;
      if (qtdFaltaPrincipal >= 4 || (diaFaltaFlag && qtdHorarios === 0)) {
        tipoDia = "FALTA_DIA_COMPLETO";
      } else if (qtdFaltaPrincipal > 0) {
        tipoDia = "FALTA_PARCIAL";
      } else if (qtdHorarios === 0) {
        tipoDia = "SEM_REGISTRO";
      } else {
        tipoDia = "NORMAL";
      }

      // Origem da batida
      const algumFacial = [b1, b2, b3, b4, b5, b6].some((b) => b.horario && b.facial);
      const algumRep = [b1, b2, b3, b4, b5, b6].some((b) => b.horario && !b.facial);
      let origemBatida: OrigemBatida = null;
      if (algumFacial && algumRep) origemBatida = "MISTO";
      else if (algumFacial) origemBatida = "FACIAL";
      else if (algumRep) origemBatida = "REP";

      const cnpjObra = apenasDigitos(cols[COL.CENTRO_CUSTO]);
      if (cnpjObra) cnpjsSet.add(cnpjObra);
      datasSet.add(data);

      registros.push({
        linha: i + 1,
        nomeFuncionario: (cols[COL.NOME] || "").trim(),
        cpf,
        pis: apenasDigitos(cols[COL.PIS]),
        dataAdmissao: extrairDataAdmissao(cols[COL.ADMISSAO]),
        cargo: (cols[COL.CARGO] || "").trim(),
        departamento: (cols[COL.DEPARTAMENTO] || "").trim(),
        cnpjObra,
        data,
        entrada1: b1.horario,
        saida1: b2.horario,
        entrada2: b3.horario,
        saida2: b4.horario,
        entrada3: b5.horario,
        saida3: b6.horario,
        origemBatida,
        tipoDia,
        totalNormais: hhmmParaDecimal(cols[COL.TOTAL_NORMAIS]),
        diaFalta: diaFaltaFlag || tipoDia === "FALTA_DIA_COMPLETO",
        faltaAtraso: hhmmParaDecimal(cols[COL.FALTA_ATRASO]),
        extraDiurna: hhmmParaDecimal(cols[COL.EXTRA_DIURNA]),
        extraNoturna: hhmmParaDecimal(cols[COL.EXTRA_NOTURNA]),
        justificativas: (cols[COL.JUSTIFICATIVAS] || "").trim(),
      });
    } catch (err: any) {
      erros.push(`Linha ${i + 1}: ${err?.message || "erro ao processar"}.`);
    }
  }

  return {
    registros,
    erros,
    totalLinhas,
    datas: Array.from(datasSet).sort(),
    cnpjsObra: Array.from(cnpjsSet),
  };
}
