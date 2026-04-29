// Helper para gerar/importar planilha modelo de Funcionários (RH/DP)
// - Formato Excel (.xlsx)
// - Importa fazendo deduplicação por CPF, Nº Reg e Nome+Nascimento
// - Funcionários sem obra são alocados na obra global "SEM-OBRA"
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export const COLUNAS_MODELO = [
  "ID",
  "Nº REG",
  "NOME DO FUNCIONARIO",
  "CNPJ",
  "EMPRESA",
  "OBRA",
  "CONSTRUTORA",
  "CIDADE DE TRABALHO",
  "DATA DE ADMISSAO",
  "CARGO",
  "DATA DE NASCIMENTO",
  "TELEFONE",
  "RG",
  "CPF",
  "PIS",
  "CODIGO PIX",
  "SALARIO BASE",
  "SALARIO COMBINADO",
  "CLINICA",
  "ASO",
  "NR6",
  "NR12",
  "NR18",
  "NR35",
  "DATA DE RESCISAO",
  "STATUS",
  "ABANDONO",
  "ATESTADO",
] as const;

const SEM_OBRA_CODIGO = "SEM-OBRA";

/** Gera e baixa o arquivo modelo .xlsx limpo (somente cabeçalhos, sem funcionários antigos) */
export async function baixarModeloFuncionarios() {
  const rows: Record<string, unknown>[] = [];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUNAS_MODELO as unknown as string[] });

  // Largura das colunas
  ws["!cols"] = COLUNAS_MODELO.map((c) => ({ wch: Math.max(14, c.length + 2) }));

  XLSX.utils.book_append_sheet(wb, ws, "Funcionários");

  // Aba auxiliar com instruções
  const instrucoes = [
    ["INSTRUÇÕES DE PREENCHIMENTO"],
    [""],
    ["1. NÃO altere os nomes das colunas da aba 'Funcionários'."],
    ["2. CPF é a chave principal; se faltar/variar, o sistema também confere Nº Reg e Nome + Data de Nascimento."],
    ["3. Para deixar o funcionário SEM OBRA, preencha a coluna OBRA com: SEM OBRA (Funcionários sem alocação)."],
    ["4. Datas no formato AAAA-MM-DD (ex: 2024-01-15) ou DD/MM/AAAA."],
    ["5. STATUS aceitos no banco: ativo, ferias, afastado, desligado."],
    ["6. ABANDONO será tratado como desligado. ATESTADO será tratado como afastado e também registrado nas observações."],
    ["7. CNPJ deve corresponder a uma empresa já cadastrada no sistema (Empresas > CNPJ)."],
    ["8. ID: deixe em branco para novos cadastros. Nº REG será importado para o campo Nº Registro do funcionário."],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrucoes);
  wsInstr["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instruções");

  const data = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Modelo_Funcionarios_${data}.xlsx`);
}

// ---------- Importação ----------

function normCPF(v: any): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  return digits.length >= 9 && digits.length < 11 ? digits.padStart(11, "0") : digits;
}
function normRegistro(v: any): string {
  return String(v ?? "")
    .trim()
    .replace(/\.0$/, "")
    .replace(/,0$/, "")
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase();
}
function getCell(row: any, aliases: readonly string[]): any {
  const entries = Object.entries(row);
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (const alias of aliases) {
    const wanted = normalize(alias);
    const found = entries.find(([key, value]) => normalize(key) === wanted && String(value ?? "").trim() !== "");
    if (found) return found[1];
  }
  const fallback = entries.find(([key]) => aliases.map(normalize).includes(normalize(key)));
  return fallback?.[1] ?? "";
}
function normCNPJ(v: any): string {
  return String(v ?? "").replace(/\D/g, "");
}
function parseDate(v: any): string | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  // dd/mm/aaaa
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // aaaa-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const dt = XLSX.SSF.parse_date_code(num);
    if (dt) {
      const mm = String(dt.m).padStart(2, "0");
      const dd = String(dt.d).padStart(2, "0");
      return `${dt.y}-${mm}-${dd}`;
    }
  }
  return null;
}
function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = String(v).replace(/[R$\s]/g, "");
  const s = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
function normStatus(s: any): string {
  const v = String(s ?? "").toLowerCase().trim();
  const map: Record<string, string> = {
    "ativo": "ativo", "ativa": "ativo",
    "férias": "ferias", "ferias": "ferias",
    "atestado": "afastado", "afastamento": "afastado", "afastado": "afastado",
    "desligado": "desligado", "desligada": "desligado",
    "abandono": "desligado",
    "pré-cadastro": "ativo", "pre-cadastro": "ativo", "pré cadastro": "ativo",
    "experiência": "ativo", "experiencia": "ativo",
  };
  return map[v] || "ativo";
}

export interface ImportResult {
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  pulados_existentes: number;
  erros: { linha: number; cpf: string; erro: string }[];
}

export type ImportMode =
  | "atualizar_e_criar"   // padrão: atualiza existentes e cria novos
  | "atualizar_somente"   // só atualiza quem já existe — NUNCA cria
  | "criar_somente";      // só cria novos — pula quem já existe

function chaveNomeNasc(empresaId: string, nome: string, dataNasc: string | null): string {
  const n = String(nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return `${empresaId}|${n}|${dataNasc ?? ""}`;
}

const COL = {
  registro: ["Nº REG", "N° REG", "Nº REGISTRO", "N° REGISTRO", "NUMERO REGISTRO", "NRO REG", "NRO_REG", "REGISTRO", "N REG", "NREG", "ID", "MATRICULA", "MATRÍCULA", "CODIGO", "CÓDIGO", "REG"],
  nome: ["NOME DO FUNCIONARIO", "NOME DO FUNCIONÁRIO", "FUNCIONARIO", "FUNCIONÁRIO", "NOME"],
  cnpj: ["CNPJ", "CNPJ EMPRESA", "CNPJ DA EMPRESA"],
  obra: ["OBRA", "NOME DA OBRA", "OBRA ATUAL", "ALOCAÇÃO", "ALOCACAO"],
  admissao: ["DATA DE ADMISSAO", "DATA DE ADMISSÃO", "ADMISSAO", "ADMISSÃO"],
  cargo: ["CARGO", "FUNCAO", "FUNÇÃO"],
  nascimento: ["DATA DE NASCIMENTO", "NASCIMENTO", "DATA NASC"],
  telefone: ["TELEFONE", "CELULAR", "FONE"],
  rg: ["RG"],
  cpf: ["CPF"],
  pis: ["PIS", "PIS/PASEP", "PASEP"],
  pix: ["CODIGO PIX", "CÓDIGO PIX", "PIX", "CHAVE PIX"],
  salarioBase: ["SALARIO BASE", "SALÁRIO BASE", "SALARIO", "SALÁRIO"],
  salarioCombinado: ["SALARIO COMBINADO", "SALÁRIO COMBINADO"],
  clinica: ["CLINICA", "CLÍNICA", "CLINICA ASO", "CLÍNICA ASO"],
  aso: ["ASO", "DATA ASO"],
  nr6: ["NR6", "NR 6", "DATA NR6", "DATA NR 6"],
  nr12: ["NR12", "NR 12", "DATA NR12", "DATA NR 12"],
  nr18: ["NR18", "NR 18", "DATA NR18", "DATA NR 18"],
  nr35: ["NR35", "NR 35", "DATA NR35", "DATA NR 35"],
  rescisao: ["DATA DE RESCISAO", "DATA DE RESCISÃO", "RESCISAO", "RESCISÃO"],
  status: ["STATUS", "SITUAÇÃO", "SITUACAO"],
  abandono: ["ABANDONO"],
  atestado: ["ATESTADO", "AFASTAMENTO", "ATESTADO PROLONGADO"],
} as const;

/** Lê o arquivo .xlsx e importa funcionários conforme o modo escolhido */
export async function importarPlanilhaFuncionarios(
  file: File,
  modo: ImportMode = "atualizar_e_criar",
): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => /func/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

  // Carrega empresas, obras e SEM-OBRA
  const [{ data: empresas }, { data: obras }] = await Promise.all([
    supabase.from("empresas").select("id, cnpj, razao_social"),
    supabase.from("obras").select("id, codigo, nome, empresa_id"),
  ]);

  const empresasByCnpj = new Map<string, string>();
  (empresas ?? []).forEach((e: any) => empresasByCnpj.set(normCNPJ(e.cnpj), e.id));
  // Fallback: primeira empresa cadastrada (caso CNPJ não seja informado/encontrado)
  const empresaPadraoId = empresas?.[0]?.id ?? null;

  const obrasByNome = new Map<string, any>();
  const obrasByCodigo = new Map<string, any>();
  (obras ?? []).forEach((o: any) => {
    obrasByNome.set(String(o.nome ?? "").trim().toLowerCase(), o);
    obrasByCodigo.set(String(o.codigo ?? "").trim().toLowerCase(), o);
  });
  const semObra = obrasByCodigo.get(SEM_OBRA_CODIGO.toLowerCase()) ?? null;

  const result: ImportResult = {
    total: rows.length,
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    pulados_existentes: 0,
    erros: [],
  };

  // Carrega TODOS os funcionários existentes (com CPF, Nº Reg e nome+nascimento p/ matching de fallback)
  const { data: funcionariosExistentes, error: errFuncionarios } = await supabase
    .from("funcionarios")
    .select("id, empresa_id, cpf, numero_registro, nome, data_nascimento, status, obra_id, telefone, data_aso, data_nr6, data_nr12, data_nr18, data_nr35, created_at")
    .range(0, 9999);

  if (errFuncionarios) {
    throw new Error(`Não foi possível conferir funcionários existentes: ${errFuncionarios.message}`);
  }

  // Index por CPF normalizado, Nº Reg e nome+data_nascimento.
  // Quando houver duplicado legado, usa o cadastro mais completo para atualizar em vez de criar outro.
  const funcionariosPorCpf = new Map<string, string>();
  const funcionariosPorRegistro = new Map<string, string>();
  const funcionariosPorNomeNasc = new Map<string, string>();
  const qualidadeCadastro = (f: any) =>
    (normRegistro(f?.numero_registro) ? 100 : 0) +
    (normCPF(f?.cpf).length === 11 ? 20 : 0) +
    ["obra_id", "telefone", "data_aso", "data_nr6", "data_nr12", "data_nr18", "data_nr35"]
      .reduce((score, key) => score + (f?.[key] ? 1 : 0), 0) +
    (String(f?.status ?? "").toLowerCase() === "ativo" ? 2 : 0);
  (funcionariosExistentes ?? [])
    .slice()
    .sort((a: any, b: any) => qualidadeCadastro(b) - qualidadeCadastro(a) || String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .forEach((f: any) => {
      const cpfN = normCPF(f.cpf);
      if (cpfN && !funcionariosPorCpf.has(`${f.empresa_id}|${cpfN}`)) funcionariosPorCpf.set(`${f.empresa_id}|${cpfN}`, f.id);
      const regN = normRegistro(f.numero_registro);
      if (regN && !funcionariosPorRegistro.has(`${f.empresa_id}|${regN}`)) funcionariosPorRegistro.set(`${f.empresa_id}|${regN}`, f.id);
      const k = chaveNomeNasc(f.empresa_id, f.nome, f.data_nascimento);
      if (!funcionariosPorNomeNasc.has(k)) funcionariosPorNomeNasc.set(k, f.id);
    });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cpf = normCPF(getCell(r, COL.cpf));
    const numeroRegistro = normRegistro(getCell(r, COL.registro));
    const nome = String(getCell(r, COL.nome) ?? "").trim();
    const dataNascimento = parseDate(getCell(r, COL.nascimento));

    if (!nome) {
      result.ignorados++;
      result.erros.push({ linha: i + 2, cpf: cpf || "(vazio)", erro: "NOME é obrigatório" });
      continue;
    }

    // Resolve empresa antes do match por Nº Reg (registro é único por empresa)
    const cnpjNorm = normCNPJ(getCell(r, COL.cnpj));
    const empresa_id = empresasByCnpj.get(cnpjNorm) || empresaPadraoId;
    if (!empresa_id) {
      result.ignorados++;
      result.erros.push({ linha: i + 2, cpf, erro: "Nenhuma empresa cadastrada no sistema" });
      continue;
    }

    // Match: 1º por CPF, 2º por Nº REG dentro da empresa, 3º por NOME+DATA_NASCIMENTO dentro da empresa
    let funcionarioExistenteId: string | undefined = cpf ? funcionariosPorCpf.get(`${empresa_id}|${cpf}`) : undefined;
    if (!funcionarioExistenteId && numeroRegistro) {
      funcionarioExistenteId = funcionariosPorRegistro.get(`${empresa_id}|${numeroRegistro}`);
    }
    if (!funcionarioExistenteId) {
      funcionarioExistenteId = funcionariosPorNomeNasc.get(chaveNomeNasc(empresa_id, nome, dataNascimento));
    }

    // Se modo "criar_somente" e já existe, pula
    if (modo === "criar_somente" && funcionarioExistenteId) {
      result.pulados_existentes++;
      continue;
    }
    // Se modo "atualizar_somente" e NÃO existe, pula
    if (modo === "atualizar_somente" && !funcionarioExistenteId) {
      result.pulados_existentes++;
      continue;
    }

    // Para CRIAR é obrigatório CPF ou Nº Reg
    if (!funcionarioExistenteId && !cpf && !numeroRegistro) {
      result.ignorados++;
      result.erros.push({ linha: i + 2, cpf: "(vazio)", erro: "CPF ou Nº Reg obrigatório para novos cadastros" });
      continue;
    }

    // Resolve obra
    const obraTxt = String(getCell(r, COL.obra) ?? "").trim().toLowerCase();
    let obra_id: string | null = null;
    if (obraTxt) {
      const obra = obrasByNome.get(obraTxt) || obrasByCodigo.get(obraTxt);
      obra_id = obra?.id ?? null;
    }
    if (!obra_id) obra_id = semObra?.id ?? null; // fallback SEM OBRA

    // Observações: ABANDONO + ATESTADO
    const obsParts: string[] = [];
    const abandono = String(getCell(r, COL.abandono) ?? "").trim();
    const atestado = String(getCell(r, COL.atestado) ?? "").trim();
    if (abandono && abandono.toLowerCase() !== "não" && abandono.toLowerCase() !== "nao")
      obsParts.push(`Abandono: ${abandono}`);
    if (atestado) obsParts.push(`Atestado: ${atestado}`);
    const observacoes = obsParts.length ? obsParts.join(" | ") : null;

    const statusOriginal = getCell(r, COL.status);
    const statusForcado = abandono && abandono.toLowerCase() !== "não" && abandono.toLowerCase() !== "nao"
      ? "desligado"
      : atestado
        ? "afastado"
        : "";
    const status = normStatus(statusForcado || statusOriginal);

    // Helper: só inclui no payload se houver valor (evita sobrescrever com vazio em UPDATE)
    const txt = (v: any) => {
      const s = String(v ?? "").trim();
      return s || null;
    };
    const num = (v: any) => {
      if (v === null || v === undefined || v === "") return null;
      return parseNum(v);
    };

    if (funcionarioExistenteId) {
      // ===== UPDATE: atualiza apenas campos preenchidos (não apaga dados existentes) =====
      const updatePayload: Record<string, any> = {};
      const setIf = (key: string, val: any) => {
        if (val !== null && val !== undefined && val !== "") updatePayload[key] = val;
      };
      setIf("empresa_id", empresa_id);
      setIf("obra_id", obra_id);
      setIf("nome", nome);
      setIf("numero_registro", numeroRegistro);
      if (cpf) setIf("cpf", cpf);
      setIf("rg", txt(getCell(r, COL.rg)));
      setIf("pis", txt(getCell(r, COL.pis)));
      setIf("codigo_pix", txt(getCell(r, COL.pix)));
      setIf("telefone", txt(getCell(r, COL.telefone)));
      setIf("cargo", txt(getCell(r, COL.cargo)));
      setIf("data_admissao", parseDate(getCell(r, COL.admissao)));
      setIf("data_nascimento", dataNascimento);
      setIf("data_rescisao", parseDate(getCell(r, COL.rescisao)));
      setIf("data_aso", parseDate(getCell(r, COL.aso)));
      setIf("data_nr6", parseDate(getCell(r, COL.nr6)));
      setIf("data_nr12", parseDate(getCell(r, COL.nr12)));
      setIf("data_nr18", parseDate(getCell(r, COL.nr18)));
      setIf("data_nr35", parseDate(getCell(r, COL.nr35)));
      setIf("clinica_aso", txt(getCell(r, COL.clinica)));
      setIf("salario_base", num(getCell(r, COL.salarioBase)));
      setIf("salario_combinado", num(getCell(r, COL.salarioCombinado)));
      // Status só se vier explicitamente preenchido na planilha ou por ABANDONO/ATESTADO
      if (String(statusOriginal ?? "").trim() || statusForcado) setIf("status", status);
      if (observacoes) setIf("motivo_rescisao", observacoes);

      if (Object.keys(updatePayload).length === 0) {
        result.pulados_existentes++;
        continue;
      }

      const { error } = await supabase
        .from("funcionarios")
        .update(updatePayload)
        .eq("id", funcionarioExistenteId);
      if (error) {
        result.erros.push({ linha: i + 2, cpf, erro: error.message });
        result.ignorados++;
      } else {
        result.atualizados++;
        if (cpf) funcionariosPorCpf.set(`${empresa_id}|${cpf}`, funcionarioExistenteId);
        if (numeroRegistro) funcionariosPorRegistro.set(`${empresa_id}|${numeroRegistro}`, funcionarioExistenteId);
        funcionariosPorNomeNasc.set(chaveNomeNasc(empresa_id, nome, dataNascimento), funcionarioExistenteId);
      }
    } else {
      // ===== INSERT: criar novo =====
      const insertPayload: any = {
        empresa_id,
        obra_id,
        nome,
        numero_registro: numeroRegistro || null,
        cpf,
        rg: txt(getCell(r, COL.rg)),
        pis: txt(getCell(r, COL.pis)),
        codigo_pix: txt(getCell(r, COL.pix)),
        telefone: txt(getCell(r, COL.telefone)),
        cargo: txt(getCell(r, COL.cargo)) || "Não informado",
        data_admissao: parseDate(getCell(r, COL.admissao)) || new Date().toISOString().slice(0, 10),
        data_nascimento: dataNascimento,
        data_rescisao: parseDate(getCell(r, COL.rescisao)),
        data_aso: parseDate(getCell(r, COL.aso)),
        data_nr6: parseDate(getCell(r, COL.nr6)),
        data_nr12: parseDate(getCell(r, COL.nr12)),
        data_nr18: parseDate(getCell(r, COL.nr18)),
        data_nr35: parseDate(getCell(r, COL.nr35)),
        clinica_aso: txt(getCell(r, COL.clinica)),
        salario_base: parseNum(getCell(r, COL.salarioBase)),
        salario_combinado: getCell(r, COL.salarioCombinado) === "" ? null : parseNum(getCell(r, COL.salarioCombinado)),
        status,
      };
      if (observacoes) insertPayload.motivo_rescisao = observacoes;

      const { data: novoFuncionario, error } = await supabase
        .from("funcionarios")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) {
        result.erros.push({ linha: i + 2, cpf, erro: error.message });
        result.ignorados++;
      } else {
        result.criados++;
        if (novoFuncionario?.id) {
          if (cpf) funcionariosPorCpf.set(`${empresa_id}|${cpf}`, novoFuncionario.id);
          if (numeroRegistro) funcionariosPorRegistro.set(`${empresa_id}|${numeroRegistro}`, novoFuncionario.id);
          funcionariosPorNomeNasc.set(chaveNomeNasc(empresa_id, nome, dataNascimento), novoFuncionario.id);
        }
      }
    }
  }

  return result;
}

