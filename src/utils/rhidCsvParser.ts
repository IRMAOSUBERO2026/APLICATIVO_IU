// ============================================================================
// Parser do "Relatório de Ponto" mensal do RHiD (ControlID) — CSV de 20 colunas.
// Este relatório vem PRÉ-CALCULADO (RHiD já soma normais/atraso/falta/extra por
// dia). É uma FONTE COMPLEMENTAR/DE CONCILIAÇÃO — não substitui o AFD/motorFolha.
//
// Tolerante a falhas: uma linha malformada não interrompe a importação — o erro
// é registrado e o processamento continua.
// ============================================================================

export type TipoDia = "normal" | "folga" | "feriado" | "falta" | "atestado" | "sem_vinculo";
export type Marcador = "I" | "C" | null;

export interface Batida {
  time: string | null; // "HH:MM:SS" puro (sem marcador) ou null
  marker: Marcador; // 'I' | 'C' | null (metadado bruto, sem significado de negócio)
}

export interface RHiDLinha {
  linha: number;
  nomeRhid: string;
  matriculaRhid: string; // pode ser '0' ou '' — NÃO usar como chave
  cnpjCentroCusto: string | null; // 14 dígitos ou null
  cpf: string; // somente dígitos — CHAVE DE MATCHING
  dataAdmissao: string | null; // ISO
  data: string; // ISO yyyy-mm-dd
  diaSemana: string; // SEG/TER/...
  tipoDia: TipoDia;
  entrada1: Batida;
  saida1: Batida;
  entrada2: Batida;
  saida2: Batida;
  entrada3: Batida;
  saida3: Batida;
  totalNormaisMin: number;
  diaFalta: boolean;
  horasFaltaMin: number;
  horasAtrasoMin: number;
  abonoMin: number;
  horasExtraMin: number; // "Extra 0%D"
  extrasTotalMin: number; // "Extras Total"
  nomeFeriado: string | null;
  justificativa: string | null;
}

export interface RHiDParseResult {
  registros: RHiDLinha[];
  erros: string[];
  totalLinhas: number; // linhas de dados válidas
  competenciaMes: number | null;
  competenciaAno: number | null;
  cpfs: string[]; // CPFs distintos
  cnpjs: string[]; // centros de custo distintos (14 dígitos)
  contagemTipoDia: Record<TipoDia, number>;
  funcionariosPorCpf: { cpf: string; nome: string }[];
}

/** Uma linha do CSV de marcações brutas exportado pelo RHiD/ControlID. */
export interface RHiDMarcacao {
  linha: number;
  id: string;
  nsr: number | null;
  dataHora: string; // ISO com o fuso de Brasília
  cpf: string | null;
  pis: string | null;
  nome: string;
  dispositivo: string;
  departamento: string;
  reconhecimentoFacial: string | null;
  suspeita: string | null;
  localTrabalho: string | null;
}

export interface RHiDMarcacoesParseResult {
  registros: RHiDMarcacao[];
  erros: string[];
  totalLinhas: number;
  cpfs: string[];
  dispositivos: string[];
  dataInicio: string | null;
  dataFim: string | null;
}

const EMPTY: Marcador = null;

const apenasDigitos = (s: string) => (s || "").replace(/\D/g, "");
const t = (s: string | undefined) => (s ?? "").trim();

/** "HH:MM" -> minutos totais. Vazio/espaço/"-" -> 0. Tolera "HHH:MM". */
function hhmmParaMinutos(v: string): number {
  const s = t(v);
  if (!s || s === "-") return 0;
  const m = s.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Extrai horário e marcador de uma célula de batida. */
function parseBatida(raw: string): Batida {
  const s = t(raw);
  if (!s) return { time: null, marker: EMPTY };
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(?:\(([IC])\))?$/i);
  if (!m) return { time: null, marker: EMPTY };
  const hh = m[1].padStart(2, "0");
  const marker = (m[3] ? (m[3].toUpperCase() as Marcador) : EMPTY);
  return { time: `${hh}:${m[2]}:00`, marker };
}

/** "01/06/2026" -> "2026-06-01". Aceita valor com dia da semana anexo. */
function parseDataISO(raw: string): string | null {
  const m = t(raw).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Mapeamento de cabeçalho -> índice, com fallback para índices fixos (spec 20 col).
const HEADER_ALVOS: Record<string, keyof typeof COL_FALLBACK> = {
  "nome do funcionario": "NOME",
  "numero de matricula": "MATRICULA",
  "nome do centro de custo": "CENTRO",
  "cpf do funcionario": "CPF",
  "data de admissao do funcionario": "ADMISSAO",
  dia: "DIA",
  "entrada 1": "E1",
  "saida 1": "S1",
  "entrada 2": "E2",
  "saida 2": "S2",
  "entrada 3": "E3",
  "saida 3": "S3",
  "total normais": "TOTAL_NORMAIS",
  "dia falta": "DIA_FALTA",
  "horas falta": "HORAS_FALTA",
  "horas atraso": "HORAS_ATRASO",
  abono: "ABONO",
  "extra 0%d": "EXTRA",
  "extras total": "EXTRAS_TOTAL",
  justificativas: "JUSTIFICATIVAS",
};

const COL_FALLBACK = {
  NOME: 0,
  MATRICULA: 1,
  CENTRO: 2,
  CPF: 3,
  ADMISSAO: 4,
  DIA: 5,
  E1: 6,
  S1: 7,
  E2: 8,
  S2: 9,
  E3: 10,
  S3: 11,
  TOTAL_NORMAIS: 12,
  DIA_FALTA: 13,
  HORAS_FALTA: 14,
  HORAS_ATRASO: 15,
  ABONO: 16,
  EXTRA: 17,
  EXTRAS_TOTAL: 18,
  JUSTIFICATIVAS: 19,
};

const normHeader = (s: string) =>
  t(s)
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

function montarMapaColunas(headerCols: string[]): typeof COL_FALLBACK {
  const mapa = { ...COL_FALLBACK };
  let algum = false;
  headerCols.forEach((h, idx) => {
    const key = HEADER_ALVOS[normHeader(h)];
    if (key) {
      mapa[key] = idx;
      algum = true;
    }
  });
  return algum ? mapa : COL_FALLBACK;
}

export function parseRHiDCSV(conteudo: string): RHiDParseResult {
  const erros: string[] = [];
  const registros: RHiDLinha[] = [];
  const cpfsSet = new Set<string>();
  const cnpjsSet = new Set<string>();
  const nomesPorCpf = new Map<string, string>();
  const contagemTipoDia: Record<TipoDia, number> = {
    normal: 0,
    folga: 0,
    feriado: 0,
    falta: 0,
    atestado: 0,
    sem_vinculo: 0,
  };
  const meses = new Map<string, number>(); // "ano-mes" -> contagem

  const limpo = conteudo.replace(/^\uFEFF/, "");
  const linhas = limpo.split(/\r?\n/);

  // Detectar cabeçalho
  let startIdx = 0;
  let COL = COL_FALLBACK;
  if (linhas.length > 0 && /cpf/i.test(linhas[0]) && /funcion/i.test(linhas[0])) {
    COL = montarMapaColunas(linhas[0].split(";"));
    startIdx = 1;
  }

  let totalLinhas = 0;

  for (let i = startIdx; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || !linha.trim()) continue;

    const cols = linha.split(";");
    if (cols.length < 12) {
      erros.push(`Linha ${i + 1}: formato inválido (${cols.length} colunas).`);
      continue;
    }

    try {
      const cpf = apenasDigitos(cols[COL.CPF]);
      const data = parseDataISO(cols[COL.DIA]);
      if (!cpf) {
        erros.push(`Linha ${i + 1}: CPF ausente.`);
        continue;
      }
      if (!data) {
        erros.push(`Linha ${i + 1}: data inválida ("${t(cols[COL.DIA])}").`);
        continue;
      }

      const nome = t(cols[COL.NOME]);
      const diaSemana = (t(cols[COL.DIA]).split(/\s+/)[1] || "").toUpperCase();
      const dataAdmissao = parseDataISO(cols[COL.ADMISSAO]);
      const cnpj = apenasDigitos(cols[COL.CENTRO]) || null;

      // Valores das 6 colunas de horário (bruto, trim)
      const rawHor = [
        t(cols[COL.E1]),
        t(cols[COL.S1]),
        t(cols[COL.E2]),
        t(cols[COL.S2]),
        t(cols[COL.E3]),
        t(cols[COL.S3]),
      ];

      const todos = (pred: (v: string) => boolean) => rawHor.every(pred);
      const algum = (pred: (v: string) => boolean) => rawHor.some(pred);

      const diaFaltaFlag = t(cols[COL.DIA_FALTA]) === "1";
      let nomeFeriado: string | null = null;

      // Classificação (ordem conforme spec)
      let tipoDia: TipoDia;
      let capturarHorarios = false;

      if (todos((v) => v === "-" || v === "")) {
        // considerado abaixo (regra de vínculo); marcamos como candidato
        tipoDia = todos((v) => v === "-") ? "sem_vinculo" : "normal";
        capturarHorarios = tipoDia === "normal";
      } else if (todos((v) => /^folga$/i.test(v))) {
        tipoDia = "folga";
      } else if (algum((v) => /feriado:/i.test(v))) {
        tipoDia = "feriado";
        const fer = rawHor.find((v) => /feriado:/i.test(v)) || "";
        nomeFeriado = t(fer.split(/feriado:/i)[1] || "") || null;
      } else if (algum((v) => /^justificado feriado$/i.test(v))) {
        tipoDia = "feriado";
      } else if (algum((v) => /justificado atestado/i.test(v))) {
        tipoDia = "atestado";
      } else if (diaFaltaFlag || algum((v) => /^falta$/i.test(v))) {
        tipoDia = "falta";
        capturarHorarios = true; // pode haver falta parcial com horários reais
      } else {
        tipoDia = "normal";
        capturarHorarios = true;
      }

      const vazia: Batida = { time: null, marker: EMPTY };
      const b = capturarHorarios
        ? [
            parseBatida(cols[COL.E1]),
            parseBatida(cols[COL.S1]),
            parseBatida(cols[COL.E2]),
            parseBatida(cols[COL.S2]),
            parseBatida(cols[COL.E3]),
            parseBatida(cols[COL.S3]),
          ]
        : [vazia, vazia, vazia, vazia, vazia, vazia];

      // Regra de vínculo ativo SEMPRE prevalece
      if (todos((v) => v === "-") || (dataAdmissao && data < dataAdmissao)) {
        tipoDia = "sem_vinculo";
      }

      contagemTipoDia[tipoDia]++;
      cpfsSet.add(cpf);
      if (!nomesPorCpf.has(cpf)) nomesPorCpf.set(cpf, nome);
      if (cnpj) cnpjsSet.add(cnpj);

      const [ano, mes] = data.split("-");
      const key = `${ano}-${mes}`;
      meses.set(key, (meses.get(key) || 0) + 1);

      registros.push({
        linha: i + 1,
        nomeRhid: nome,
        matriculaRhid: t(cols[COL.MATRICULA]),
        cnpjCentroCusto: cnpj,
        cpf,
        dataAdmissao,
        data,
        diaSemana,
        tipoDia,
        entrada1: b[0],
        saida1: b[1],
        entrada2: b[2],
        saida2: b[3],
        entrada3: b[4],
        saida3: b[5],
        totalNormaisMin: hhmmParaMinutos(cols[COL.TOTAL_NORMAIS]),
        diaFalta: diaFaltaFlag,
        horasFaltaMin: hhmmParaMinutos(cols[COL.HORAS_FALTA]),
        horasAtrasoMin: hhmmParaMinutos(cols[COL.HORAS_ATRASO]),
        abonoMin: hhmmParaMinutos(cols[COL.ABONO]),
        horasExtraMin: hhmmParaMinutos(cols[COL.EXTRA]),
        extrasTotalMin: hhmmParaMinutos(cols[COL.EXTRAS_TOTAL]),
        nomeFeriado,
        justificativa: t(cols[COL.JUSTIFICATIVAS]) || null,
      });
      totalLinhas++;
    } catch (err: any) {
      erros.push(`Linha ${i + 1}: ${err?.message || "erro ao processar"}.`);
    }
  }

  // Competência = mês/ano mais frequente
  let competenciaMes: number | null = null;
  let competenciaAno: number | null = null;
  let maior = -1;
  for (const [key, qtd] of meses) {
    if (qtd > maior) {
      maior = qtd;
      const [a, m] = key.split("-");
      competenciaAno = parseInt(a, 10);
      competenciaMes = parseInt(m, 10);
    }
  }

  return {
    registros,
    erros,
    totalLinhas,
    competenciaMes,
    competenciaAno,
    cpfs: Array.from(cpfsSet),
    cnpjs: Array.from(cnpjsSet),
    contagemTipoDia,
    funcionariosPorCpf: Array.from(nomesPorCpf, ([cpf, nome]) => ({ cpf, nome })),
  };
}

/** SHA-256 hex do conteúdo do arquivo (para detectar reimportação). */
export async function sha256Hex(conteudo: string): Promise<string> {
  const enc = new TextEncoder().encode(conteudo);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
