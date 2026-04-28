// Helper para gerar/importar planilha modelo de Funcionários (RH/DP)
// - Formato Excel (.xlsx)
// - Importa fazendo UPSERT por CPF
// - Funcionários sem obra são alocados na obra global "SEM-OBRA"
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export const COLUNAS_MODELO = [
  "ID",
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

/** Gera e baixa o arquivo modelo .xlsx (com 1 linha de exemplo) */
export async function baixarModeloFuncionarios() {
  // Carrega lista atual de funcionários para já preencher o modelo (facilita atualização)
  const { data: funcs } = await supabase
    .from("funcionarios")
    .select(`
      id, nome, cpf, rg, pis, codigo_pix, telefone, cargo,
      data_admissao, data_nascimento, data_rescisao,
      data_aso, data_nr6, data_nr12, data_nr18, data_nr35,
      clinica_aso, salario_base, salario_combinado, status, observacoes,
      empresas:empresa_id ( cnpj, razao_social ),
      obras:obra_id ( codigo, nome, construtora, cidade )
    `)
    .order("nome", { ascending: true });

  const rows = (funcs ?? []).map((f: any) => ({
    "ID": f.id ?? "",
    "NOME DO FUNCIONARIO": f.nome ?? "",
    "CNPJ": f.empresas?.cnpj ?? "",
    "EMPRESA": f.empresas?.razao_social ?? "",
    "OBRA": f.obras?.nome ?? "",
    "CONSTRUTORA": f.obras?.construtora ?? "",
    "CIDADE DE TRABALHO": f.obras?.cidade ?? "",
    "DATA DE ADMISSAO": f.data_admissao ?? "",
    "CARGO": f.cargo ?? "",
    "DATA DE NASCIMENTO": f.data_nascimento ?? "",
    "TELEFONE": f.telefone ?? "",
    "RG": f.rg ?? "",
    "CPF": f.cpf ?? "",
    "PIS": f.pis ?? "",
    "CODIGO PIX": f.codigo_pix ?? "",
    "SALARIO BASE": f.salario_base ?? 0,
    "SALARIO COMBINADO": f.salario_combinado ?? "",
    "CLINICA": f.clinica_aso ?? "",
    "ASO": f.data_aso ?? "",
    "NR6": f.data_nr6 ?? "",
    "NR12": f.data_nr12 ?? "",
    "NR18": f.data_nr18 ?? "",
    "NR35": f.data_nr35 ?? "",
    "DATA DE RESCISAO": f.data_rescisao ?? "",
    "STATUS": f.status ?? "ativo",
    "ABANDONO": "",
    "ATESTADO": "",
  }));

  // Se não tem nenhum funcionário, cria 1 linha de exemplo para orientar o preenchimento
  if (rows.length === 0) {
    rows.push({
      "ID": "",
      "NOME DO FUNCIONARIO": "João da Silva",
      "CNPJ": "12.345.678/0001-90",
      "EMPRESA": "Irmãos Ubero Engenharia",
      "OBRA": "SEM OBRA (Funcionários sem alocação)",
      "CONSTRUTORA": "",
      "CIDADE DE TRABALHO": "São Paulo",
      "DATA DE ADMISSAO": "2024-01-15",
      "CARGO": "Pedreiro",
      "DATA DE NASCIMENTO": "1985-06-20",
      "TELEFONE": "(11) 99999-0000",
      "RG": "12.345.678-9",
      "CPF": "123.456.789-00",
      "PIS": "123.45678.90-1",
      "CODIGO PIX": "123.456.789-00",
      "SALARIO BASE": 2500,
      "SALARIO COMBINADO": 3200,
      "CLINICA": "MedWork",
      "ASO": "2025-11-20",
      "NR6": "2025-11-20",
      "NR12": "",
      "NR18": "2025-01-10",
      "NR35": "",
      "DATA DE RESCISAO": "",
      "STATUS": "ativo",
      "ABANDONO": "",
      "ATESTADO": "",
    });
  }

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
    ["2. CPF é a chave de identificação. Se já existir, o registro será atualizado; se não, será criado."],
    ["3. Para deixar o funcionário SEM OBRA, preencha a coluna OBRA com: SEM OBRA (Funcionários sem alocação)."],
    ["4. Datas no formato AAAA-MM-DD (ex: 2024-01-15) ou DD/MM/AAAA."],
    ["5. STATUS aceitos: ativo, ferias, atestado, afastado, desligado, abandono, pre-cadastro."],
    ["6. ABANDONO: preencha 'sim' para marcar abandono. ATESTADO: período / texto livre."],
    ["7. CNPJ deve corresponder a uma empresa já cadastrada no sistema (Empresas > CNPJ)."],
    ["8. ID: deixe em branco para novos cadastros. Não altere o ID dos existentes."],
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
  const s = String(v).replace(/[R$\s.]/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
function normStatus(s: any): string {
  const v = String(s ?? "").toLowerCase().trim();
  const map: Record<string, string> = {
    "ativo": "ativo", "ativa": "ativo",
    "férias": "ferias", "ferias": "ferias",
    "atestado": "atestado",
    "afastado": "afastado",
    "desligado": "desligado", "desligada": "desligado",
    "abandono": "abandono",
    "pré-cadastro": "pre-cadastro", "pre-cadastro": "pre-cadastro", "pré cadastro": "pre-cadastro",
    "experiência": "ativo", "experiencia": "ativo",
  };
  return map[v] || (v || "ativo");
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

function chaveNomeNasc(nome: string, dataNasc: string | null): string {
  const n = String(nome ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${n}|${dataNasc ?? ""}`;
}

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

  // Carrega TODOS os funcionários existentes (com nome e data_nascimento p/ matching de fallback)
  const { data: funcionariosExistentes, error: errFuncionarios } = await supabase
    .from("funcionarios")
    .select("id, cpf, nome, data_nascimento, created_at")
    .range(0, 9999);

  if (errFuncionarios) {
    throw new Error(`Não foi possível conferir funcionários existentes: ${errFuncionarios.message}`);
  }

  // Index por CPF normalizado (apenas o mais antigo) e por nome+data_nascimento (fallback)
  const funcionariosPorCpf = new Map<string, string>();
  const funcionariosPorNomeNasc = new Map<string, string>();
  (funcionariosExistentes ?? [])
    .slice()
    .sort((a: any, b: any) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .forEach((f: any) => {
      const cpfN = normCPF(f.cpf);
      if (cpfN && !funcionariosPorCpf.has(cpfN)) funcionariosPorCpf.set(cpfN, f.id);
      const k = chaveNomeNasc(f.nome, f.data_nascimento);
      if (!funcionariosPorNomeNasc.has(k)) funcionariosPorNomeNasc.set(k, f.id);
    });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cpf = normCPF(r["CPF"]);
    const nome = String(r["NOME DO FUNCIONARIO"] ?? "").trim();
    const dataNascimento = parseDate(r["DATA DE NASCIMENTO"]);

    if (!nome) {
      result.ignorados++;
      result.erros.push({ linha: i + 2, cpf: cpf || "(vazio)", erro: "NOME é obrigatório" });
      continue;
    }

    // Match: 1º por CPF, 2º por NOME+DATA_NASCIMENTO
    let funcionarioExistenteId: string | undefined = cpf ? funcionariosPorCpf.get(cpf) : undefined;
    if (!funcionarioExistenteId) {
      funcionarioExistenteId = funcionariosPorNomeNasc.get(chaveNomeNasc(nome, dataNascimento));
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

    // Para CRIAR é obrigatório CPF
    if (!funcionarioExistenteId && !cpf) {
      result.ignorados++;
      result.erros.push({ linha: i + 2, cpf: "(vazio)", erro: "CPF obrigatório para novos cadastros" });
      continue;
    }

    // Resolve empresa
    const cnpjNorm = normCNPJ(r["CNPJ"]);
    const empresa_id = empresasByCnpj.get(cnpjNorm) || empresaPadraoId;
    if (!empresa_id) {
      result.ignorados++;
      result.erros.push({ linha: i + 2, cpf, erro: "Nenhuma empresa cadastrada no sistema" });
      continue;
    }

    // Resolve obra
    const obraTxt = String(r["OBRA"] ?? "").trim().toLowerCase();
    let obra_id: string | null = null;
    if (obraTxt) {
      const obra = obrasByNome.get(obraTxt) || obrasByCodigo.get(obraTxt);
      obra_id = obra?.id ?? null;
    }
    if (!obra_id) obra_id = semObra?.id ?? null; // fallback SEM OBRA

    // Observações: ABANDONO + ATESTADO
    const obsParts: string[] = [];
    const abandono = String(r["ABANDONO"] ?? "").trim();
    const atestado = String(r["ATESTADO"] ?? "").trim();
    if (abandono && abandono.toLowerCase() !== "não" && abandono.toLowerCase() !== "nao")
      obsParts.push(`Abandono: ${abandono}`);
    if (atestado) obsParts.push(`Atestado: ${atestado}`);
    const observacoes = obsParts.length ? obsParts.join(" | ") : null;

    const status = normStatus(r["STATUS"]);

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
      if (cpf) setIf("cpf", cpf);
      setIf("rg", txt(r["RG"]));
      setIf("pis", txt(r["PIS"]));
      setIf("codigo_pix", txt(r["CODIGO PIX"]));
      setIf("telefone", txt(r["TELEFONE"]));
      setIf("cargo", txt(r["CARGO"]));
      setIf("data_admissao", parseDate(r["DATA DE ADMISSAO"]));
      setIf("data_nascimento", dataNascimento);
      setIf("data_rescisao", parseDate(r["DATA DE RESCISAO"]));
      setIf("data_aso", parseDate(r["ASO"]));
      setIf("data_nr6", parseDate(r["NR6"]));
      setIf("data_nr12", parseDate(r["NR12"]));
      setIf("data_nr18", parseDate(r["NR18"]));
      setIf("data_nr35", parseDate(r["NR35"]));
      setIf("clinica_aso", txt(r["CLINICA"]));
      setIf("salario_base", num(r["SALARIO BASE"]));
      setIf("salario_combinado", num(r["SALARIO COMBINADO"]));
      // Status só se vier explicitamente preenchido na planilha
      if (String(r["STATUS"] ?? "").trim()) setIf("status", status);
      if (observacoes) updatePayload.observacoes = observacoes;

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
      }
    } else {
      // ===== INSERT: criar novo =====
      const insertPayload: any = {
        empresa_id,
        obra_id,
        nome,
        cpf,
        rg: txt(r["RG"]),
        pis: txt(r["PIS"]),
        codigo_pix: txt(r["CODIGO PIX"]),
        telefone: txt(r["TELEFONE"]),
        cargo: txt(r["CARGO"]) || "Não informado",
        data_admissao: parseDate(r["DATA DE ADMISSAO"]) || new Date().toISOString().slice(0, 10),
        data_nascimento: dataNascimento,
        data_rescisao: parseDate(r["DATA DE RESCISAO"]),
        data_aso: parseDate(r["ASO"]),
        data_nr6: parseDate(r["NR6"]),
        data_nr12: parseDate(r["NR12"]),
        data_nr18: parseDate(r["NR18"]),
        data_nr35: parseDate(r["NR35"]),
        clinica_aso: txt(r["CLINICA"]),
        salario_base: parseNum(r["SALARIO BASE"]),
        salario_combinado: r["SALARIO COMBINADO"] === "" ? null : parseNum(r["SALARIO COMBINADO"]),
        status,
      };
      if (observacoes) insertPayload.observacoes = observacoes;

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
          funcionariosPorCpf.set(cpf, novoFuncionario.id);
          funcionariosPorNomeNasc.set(chaveNomeNasc(nome, dataNascimento), novoFuncionario.id);
        }
      }
    }
  }

  return result;
}

