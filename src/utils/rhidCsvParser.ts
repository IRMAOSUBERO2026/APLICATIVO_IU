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
  time: string | null;
  marker: Marcador;
}

export interface RHiDLinha {
  linha: number;
  nomeRhid: string;
  matriculaRhid: string;
  cnpjCentroCusto: string | null;
  cpf: string;
  dataAdmissao: string | null;
  data: string;
  diaSemana: string;
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
  horasExtraMin: number;
  extrasTotalMin: number;
  nomeFeriado: string | null;
  justificativa: string | null;
}

export interface RHiDParseResult {
  registros: RHiDLinha[];
  erros: string[];
  totalLinhas: number;
  competenciaMes: number | null;
  competenciaAno: number | null;
  cpfs: string[];
  cnpjs: string[];
  contagemTipoDia: Record<TipoDia, number>;
  funcionariosPorCpf: { cpf: string; nome: string }[];
}

/** Uma linha do CSV de marcações brutas exportado pelo RHiD/ControlID. */
export interface RHiDMarcacao {
  linha: number;
  id: string;
  nsr: number | null;
  dataHora: string;
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

function hhmmParaMinutos(v: string): number {
  const s = t(v);
  if (!s || s === "-") return 0;
  const m = s.match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function parseBatida(raw: string): Batida {
  const s = t(raw);
  if (!s || s === "-") return { time: null, marker: EMPTY };
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(?:\(([IC])\))?$/i);
  if (!m) return { time: null, marker: EMPTY };
  return {
    time: `${m[1].padStart(2, "0")}:${m[2]}:00`,
    marker: m[3] ? (m[3].toUpperCase() as Marcador) : EMPTY,
  };
}

function parseDataISO(raw: string): string | null {
  const m = t(raw).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

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
  NOME: 0, MATRICULA: 1, CENTRO: 2, CPF: 3, ADMISSAO: 4, DIA: 5,
  E1: 6, S1: 7, E2: 8, S2: 9, E3: 10, S3: 11, TOTAL_NORMAIS: 12,
  DIA_FALTA: 13, HORAS_FALTA: 14, HORAS_ATRASO: 15, ABONO: 16,
  EXTRA: 17, EXTRAS_TOTAL: 18, JUSTIFICATIVAS: 19,
};

const normHeader = (s: string) => t(s).replace(/^\uFEFF/, "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ");

function montarMapaColunas(headerCols: string[]): typeof COL_FALLBACK {
  const mapa = { ...COL_FALLBACK };
  let algum = false;
  headerCols.forEach((h, idx) => {
    const key = HEADER_ALVOS[normHeader(h)];
    if (key) { mapa[key] = idx; algum = true; }
  });
  return algum ? mapa : COL_FALLBACK;
}

export function parseRHiDCSV(conteudo: string): RHiDParseResult {
  const erros: string[] = [];
  const registros: RHiDLinha[] = [];
  const cpfsSet = new Set<string>();
  const cnpjsSet = new Set<string>();
  const nomesPorCpf = new Map<string, string>();
  const contagemTipoDia: Record<TipoDia, number> = { normal: 0, folga: 0, feriado: 0, falta: 0, atestado: 0, sem_vinculo: 0 };
  const meses = new Map<string, number>();
  const linhas = conteudo.replace(/^\uFEFF/, "").split(/\r?\n/);
  let startIdx = 0;
  let COL = COL_FALLBACK;
  if (linhas.length > 0 && /cpf/i.test(linhas[0]) && /funcion/i.test(linhas[0])) {
    COL = montarMapaColunas(linhas[0].split(";"));
    startIdx = 1;
  }

  for (let i = startIdx; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || !linha.trim()) continue;
    const cols = linha.split(";");
    if (cols.length < 12) { erros.push(`Linha ${i + 1}: formato inválido (${cols.length} colunas).`); continue; }
    try {
      const cpf = apenasDigitos(cols[COL.CPF]);
      const data = parseDataISO(cols[COL.DIA]);
      if (!cpf) { erros.push(`Linha ${i + 1}: CPF ausente.`); continue; }
      if (!data) { erros.push(`Linha ${i + 1}: data inválida ("${t(cols[COL.DIA])}").`); continue; }
      const nome = t(cols[COL.NOME]);
      const diaSemana = (t(cols[COL.DIA]).split(/\s+/)[1] || "").toUpperCase();
      const dataAdmissao = parseDataISO(cols[COL.ADMISSAO]);
      const cnpj = apenasDigitos(cols[COL.CENTRO]) || null;
      const rawHor = [COL.E1, COL.S1, COL.E2, COL.S2, COL.E3, COL.S3].map((c) => t(cols[c]));
      const todos = (pred: (v: string) => boolean) => rawHor.every(pred);
      const algum = (pred: (v: string) => boolean) => rawHor.some(pred);
      const diaFaltaFlag = t(cols[COL.DIA_FALTA]) === "1";
      let tipoDia: TipoDia;
      let nomeFeriado: string | null = null;
      let capturarHorarios = false;
      if (todos((v) => v === "-" || v === "")) { tipoDia = todos((v) => v === "-") ? "sem_vinculo" : "normal"; capturarHorarios = tipoDia === "normal"; }
      else if (todos((v) => /^folga$/i.test(v))) tipoDia = "folga";
      else if (algum((v) => /feriado:/i.test(v))) { tipoDia = "feriado"; nomeFeriado = t((rawHor.find((v) => /feriado:/i.test(v)) || "").split(/feriado:/i)[1] || "") || null; }
      else if (algum((v) => /^justificado feriado$/i.test(v))) tipoDia = "feriado";
      else if (algum((v) => /justificado atestado/i.test(v))) tipoDia = "atestado";
      else if (diaFaltaFlag || algum((v) => /^falta$/i.test(v))) { tipoDia = "falta"; capturarHorarios = true; }
      else { tipoDia = "normal"; capturarHorarios = true; }
      if (todos((v) => v === "-") || (dataAdmissao && data < dataAdmissao)) tipoDia = "sem_vinculo";
      const vazia: Batida = { time: null, marker: EMPTY };
      const b = capturarHorarios ? [COL.E1, COL.S1, COL.E2, COL.S2, COL.E3, COL.S3].map((c) => parseBatida(cols[c])) : [vazia, vazia, vazia, vazia, vazia, vazia];
      contagemTipoDia[tipoDia]++; cpfsSet.add(cpf); if (!nomesPorCpf.has(cpf)) nomesPorCpf.set(cpf, nome); if (cnpj) cnpjsSet.add(cnpj);
      const [ano, mes] = data.split("-"); const key = `${ano}-${mes}`; meses.set(key, (meses.get(key) || 0) + 1);
      registros.push({ linha: i + 1, nomeRhid: nome, matriculaRhid: t(cols[COL.MATRICULA]), cnpjCentroCusto: cnpj, cpf, dataAdmissao, data, diaSemana, tipoDia,
        entrada1: b[0], saida1: b[1], entrada2: b[2], saida2: b[3], entrada3: b[4], saida3: b[5],
        totalNormaisMin: hhmmParaMinutos(cols[COL.TOTAL_NORMAIS]), diaFalta: diaFaltaFlag, horasFaltaMin: hhmmParaMinutos(cols[COL.HORAS_FALTA]), horasAtrasoMin: hhmmParaMinutos(cols[COL.HORAS_ATRASO]), abonoMin: hhmmParaMinutos(cols[COL.ABONO]), horasExtraMin: hhmmParaMinutos(cols[COL.EXTRA]), extrasTotalMin: hhmmParaMinutos(cols[COL.EXTRAS_TOTAL]), nomeFeriado, justificativa: t(cols[COL.JUSTIFICATIVAS]) || null });
    } catch (err: any) { erros.push(`Linha ${i + 1}: ${err?.message || "erro ao processar"}.`); }
  }
  let competenciaMes: number | null = null; let competenciaAno: number | null = null; let maior = -1;
  for (const [key, qtd] of meses) if (qtd > maior) { maior = qtd; const [a, m] = key.split("-"); competenciaAno = parseInt(a, 10); competenciaMes = parseInt(m, 10); }
  return { registros, erros, totalLinhas: registros.length, competenciaMes, competenciaAno, cpfs: Array.from(cpfsSet), cnpjs: Array.from(cnpjsSet), contagemTipoDia, funcionariosPorCpf: Array.from(nomesPorCpf, ([cpf, nome]) => ({ cpf, nome })) };
}

/** Divide CSV respeitando campos entre aspas. O exportador atual não usa aspas, mas isso evita quebrar nomes futuros. */
function dividirCSV(linha: string): string[] {
  const out: string[] = []; let atual = ""; let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"' && linha[i + 1] === '"' && aspas) { atual += '"'; i++; continue; }
    if (ch === '"') { aspas = !aspas; continue; }
    if (ch === ";" && !aspas) { out.push(atual.trim()); atual = ""; } else atual += ch;
  }
  out.push(atual.trim());
  return out;
}

function documentoChave(raw: string | undefined, tamanho = 11): string | null {
  const digits = apenasDigitos(raw || "");
  if (!digits || digits === "0".repeat(digits.length)) return null;
  if (digits.length === tamanho) return digits;
  if (digits.length < tamanho) return digits.padStart(tamanho, "0");
  // Alguns relógios enviam o CPF com zeros à esquerda no campo PIS (ex.: 12 dígitos).
  const semZeros = digits.replace(/^0+/, "");
  if (semZeros.length === tamanho) return semZeros;
  return null;
}


function parseDataHoraRHiD(raw: string): string | null {
  const m = t(raw).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || "00"}-03:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Parser do CSV de marcações brutas: Id;NSR;Data*;PIS;CPF;Dispositivo*;... */
export function parseRHiDMarcacoesCSV(conteudo: string): RHiDMarcacoesParseResult {
  const linhas = conteudo.replace(/^\uFEFF/, "").split(/\r?\n/);
  const erros: string[] = []; const registros: RHiDMarcacao[] = [];
  const cpfs = new Set<string>(); const dispositivos = new Set<string>();
  const header = linhas.findIndex((line) => /(^|;)nsr;?/i.test(line) && /data/i.test(line) && /cpf/i.test(line));
  if (header < 0) return { registros: [], erros: ["Cabeçalho incompatível: esperado o CSV de marcações do RHiD com as colunas Id, NSR, Data, PIS e CPF."], totalLinhas: 0, cpfs: [], dispositivos: [], dataInicio: null, dataFim: null };
  const headerCols = dividirCSV(linhas[header]).map(normHeader);
  const indexOf = (names: string[]) => headerCols.findIndex((h) => names.includes(h));
  const col = { id: indexOf(["id"]), nsr: indexOf(["nsr"]), data: indexOf(["data"]), pis: indexOf(["pis"]), cpf: indexOf(["cpf"]), dispositivo: indexOf(["dispositivo"]), nome: indexOf(["funcionario"]), departamento: indexOf(["departamento"]), facial: indexOf(["reconhecimento facial"]), suspeita: indexOf(["suspeita"]), local: indexOf(["local de trabalho"]) };
  if (col.data < 0 || col.cpf < 0 || col.nome < 0) return { registros: [], erros: ["Cabeçalho incompatível: não foi possível localizar Data, CPF e Funcionário."], totalLinhas: 0, cpfs: [], dispositivos: [], dataInicio: null, dataFim: null };
  for (let i = header + 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;
    const cells = dividirCSV(linhas[i]); const dataHora = parseDataHoraRHiD(cells[col.data]);
    if (!dataHora) { erros.push(`Linha ${i + 1}: data/hora inválida.`); continue; }
    const cpf = documentoChave(col.cpf >= 0 ? cells[col.cpf] : ""); const pis = documentoChave(col.pis >= 0 ? cells[col.pis] : "");
    const nome = t(cells[col.nome]);
    if (!nome && !cpf && !pis) { erros.push(`Linha ${i + 1}: sem funcionário, CPF ou PIS.`); continue; }
    const dispositivo = t(col.dispositivo >= 0 ? cells[col.dispositivo] : "");
    const registro: RHiDMarcacao = { linha: i + 1, id: t(cells[col.id]), nsr: Number.isFinite(Number(cells[col.nsr])) ? Number(cells[col.nsr]) : null, dataHora, cpf, pis, nome, dispositivo, departamento: t(cells[col.departamento]), reconhecimentoFacial: t(cells[col.facial]) || null, suspeita: t(cells[col.suspeita]) || null, localTrabalho: t(cells[col.local]) || null };
    registros.push(registro); if (cpf) cpfs.add(cpf); if (dispositivo) dispositivos.add(dispositivo);
  }
  const ordenados = [...registros].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  return { registros, erros, totalLinhas: registros.length, cpfs: Array.from(cpfs), dispositivos: Array.from(dispositivos), dataInicio: ordenados[0]?.dataHora.slice(0, 10) || null, dataFim: ordenados.at(-1)?.dataHora.slice(0, 10) || null };
}

/** SHA-256 hex do conteúdo do arquivo (para detectar reimportação). */
export async function sha256Hex(conteudo: string): Promise<string> {
  const enc = new TextEncoder().encode(conteudo);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
