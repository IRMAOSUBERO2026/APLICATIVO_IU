// Variáveis dinâmicas para os modelos de comunicação/documentos oficiais.
// Uso: {{nome}}, {{cargo}}, {{obra}}, {{data}} etc. em títulos e no texto da ideia.

export interface ContextoVariaveis {
  nome?: string | null;
  cargo?: string | null;
  cpf?: string | null;
  rg?: string | null;
  matricula?: string | null;
  admissao?: string | null; // ISO
  empresa?: string | null;
  cnpj?: string | null;
  obra?: string | null;
  data?: string | null; // ISO (data do documento)
}

export interface VariavelDoc {
  chave: string;
  label: string;
  exemplo: string;
}

export const VARIAVEIS_DOCUMENTO: VariavelDoc[] = [
  { chave: "nome", label: "Nome do colaborador", exemplo: "João Batista Silva" },
  { chave: "primeiro_nome", label: "Primeiro nome", exemplo: "João" },
  { chave: "cargo", label: "Cargo / função", exemplo: "Servente" },
  { chave: "matricula", label: "Nº de registro", exemplo: "1024" },
  { chave: "cpf", label: "CPF", exemplo: "000.000.000-00" },
  { chave: "rg", label: "RG", exemplo: "00.000.000-0" },
  { chave: "admissao", label: "Data de admissão", exemplo: "01/03/2025" },
  { chave: "empresa", label: "Empresa", exemplo: "Irmãos Ubero Engenharia" },
  { chave: "cnpj", label: "CNPJ da empresa", exemplo: "00.000.000/0001-00" },
  { chave: "obra", label: "Obra / setor", exemplo: "Obra Terrace" },
  { chave: "data", label: "Data do documento", exemplo: "01/08/2026" },
  { chave: "data_extenso", label: "Data por extenso", exemplo: "1 de agosto de 2026" },
  { chave: "mes_ano", label: "Mês/ano de referência", exemplo: "agosto/2026" },
  { chave: "ano", label: "Ano", exemplo: "2026" },
];

function fmtData(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

function fmtDataExtenso(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(d);
}

function fmtMesAno(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(d)}/${d.getFullYear()}`;
}

/** Mapa chave -> valor resolvido a partir do contexto atual. */
export function resolverVariaveis(ctx: ContextoVariaveis): Record<string, string> {
  const nome = (ctx.nome || "").trim();
  const dataRef = ctx.data || new Date().toISOString().slice(0, 10);
  return {
    nome,
    primeiro_nome: nome.split(/\s+/)[0] || "",
    cargo: ctx.cargo || "",
    matricula: ctx.matricula || "",
    cpf: ctx.cpf || "",
    rg: ctx.rg || "",
    admissao: fmtData(ctx.admissao),
    empresa: ctx.empresa || "",
    cnpj: ctx.cnpj || "",
    obra: ctx.obra || "",
    data: fmtData(dataRef),
    data_extenso: fmtDataExtenso(dataRef),
    mes_ano: fmtMesAno(dataRef),
    ano: String(new Date(`${dataRef.slice(0, 10)}T12:00:00`).getFullYear() || new Date().getFullYear()),
  };
}

/**
 * Substitui as variáveis {{chave}} pelos valores do contexto.
 * Variáveis sem valor viram lacuna preenchível: [label].
 */
export function aplicarVariaveis(texto: string, ctx: ContextoVariaveis): string {
  if (!texto) return texto;
  const vals = resolverVariaveis(ctx);
  return texto.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, chaveRaw: string) => {
    const chave = chaveRaw.toLowerCase();
    if (!(chave in vals)) return match;
    const valor = vals[chave];
    if (valor) return valor;
    const meta = VARIAVEIS_DOCUMENTO.find(v => v.chave === chave);
    return `[${meta?.label || chave}]`;
  });
}

/** Indica se o texto possui variáveis dinâmicas. */
export function temVariaveis(texto: string): boolean {
  return /\{\{\s*[a-z_]+\s*\}\}/i.test(texto || "");
}

/** Insere uma variável numa string na posição do cursor. */
export function inserirVariavel(texto: string, chave: string, cursor?: number | null): { texto: string; cursor: number } {
  const token = `{{${chave}}}`;
  const pos = cursor == null || cursor < 0 || cursor > texto.length ? texto.length : cursor;
  const novo = texto.slice(0, pos) + token + texto.slice(pos);
  return { texto: novo, cursor: pos + token.length };
}
