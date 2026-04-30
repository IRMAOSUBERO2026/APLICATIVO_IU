import { supabase } from "@/integrations/supabase/client";

export interface BonificacaoPadrao {
  descricao: string;
  valor: number;
  tipo: "fixo" | "condicional";
}

const BLOCK_START = "[[BONIFICACOES_PADRAO]]";
const BLOCK_END = "[[/BONIFICACOES_PADRAO]]";
const BLOCK_REGEX = /\s*\[\[BONIFICACOES_PADRAO\]\][\s\S]*?\[\[\/BONIFICACOES_PADRAO\]\]\s*/m;

export function normalizeBonificacoesPadrao(value: unknown): BonificacaoPadrao[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = item as Partial<BonificacaoPadrao>;
      return {
        descricao: String(row.descricao || "").trim(),
        valor: Number(row.valor) || 0,
        tipo: row.tipo === "condicional" ? "condicional" : "fixo",
      } satisfies BonificacaoPadrao;
    })
    .filter((item) => item.descricao || item.valor > 0);
}

export function calcularPrefillBonificacoes(
  bons: BonificacaoPadrao[] | null | undefined,
): { meta: number; assiduidade: number } {
  const list = normalizeBonificacoesPadrao(bons);
  let meta = 0;
  let assiduidade = 0;

  for (const b of list) {
    const desc = b.descricao.toLowerCase();
    if (desc.includes("meta") || desc.includes("desempenho") || desc.includes("produtiv")) {
      meta += b.valor;
    } else {
      assiduidade += b.valor;
    }
  }

  return { meta, assiduidade };
}

export function parseBonificacoesFromObservacoes(observacoes: unknown): BonificacaoPadrao[] {
  if (typeof observacoes !== "string") return [];
  const match = observacoes.match(/\[\[BONIFICACOES_PADRAO\]\]([\s\S]*?)\[\[\/BONIFICACOES_PADRAO\]\]/m);
  if (!match?.[1]) return [];

  try {
    return normalizeBonificacoesPadrao(JSON.parse(match[1]));
  } catch {
    return [];
  }
}

export function stripBonificacoesFromObservacoes(observacoes: unknown): string | null {
  if (typeof observacoes !== "string") return null;
  const cleaned = observacoes.replace(BLOCK_REGEX, "").trim();
  return cleaned || null;
}

export function encodeBonificacoesInObservacoes(
  observacoes: unknown,
  bonificacoes: unknown,
): string | null {
  const base = stripBonificacoesFromObservacoes(observacoes);
  const list = normalizeBonificacoesPadrao(bonificacoes);
  if (list.length === 0) return base;

  const block = `${BLOCK_START}${JSON.stringify(list)}${BLOCK_END}`;
  return base ? `${base}\n\n${block}` : block;
}

export function getBonificacoesFromFuncionario(funcionario: Record<string, unknown>): BonificacaoPadrao[] {
  const fromColumn = normalizeBonificacoesPadrao(funcionario.bonificacoes_padrao);
  return fromColumn.length > 0 ? fromColumn : parseBonificacoesFromObservacoes(funcionario.observacoes);
}

function isMissingBonificacoesColumnError(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  return (err?.code === "PGRST204" || err?.code === "42703") && /bonificacoes_padrao|schema cache/i.test(err.message || "");
}

export async function salvarFuncionarioComBonificacoes(
  funcionarioId: string,
  updateData: Record<string, unknown>,
) {
  const firstAttempt = await supabase.from("funcionarios").update(updateData as any).eq("id", funcionarioId);
  if (!isMissingBonificacoesColumnError(firstAttempt.error)) return firstAttempt;

  const { bonificacoes_padrao, observacoes, ...fallbackData } = updateData;
  fallbackData.observacoes = encodeBonificacoesInObservacoes(observacoes, bonificacoes_padrao);
  return supabase.from("funcionarios").update(fallbackData as any).eq("id", funcionarioId);
}

export async function inserirFuncionarioComBonificacoes(insertData: Record<string, unknown>) {
  const firstAttempt = await supabase.from("funcionarios").insert(insertData as any);
  if (!isMissingBonificacoesColumnError(firstAttempt.error)) return firstAttempt;

  const { bonificacoes_padrao, observacoes, ...fallbackData } = insertData;
  fallbackData.observacoes = encodeBonificacoesInObservacoes(observacoes, bonificacoes_padrao);
  return supabase.from("funcionarios").insert(fallbackData as any);
}

export async function buscarFuncionariosFolha(obraId: string) {
  const columnsWithBonuses = "id, nome, cpf, cargo, salario_base, salario_combinado, tipo_remuneracao, escala, bonificacoes_padrao, observacoes";
  const firstAttempt = await supabase
    .from("funcionarios")
    .select(columnsWithBonuses)
    .eq("obra_id", obraId)
    .eq("status", "ativo")
    .order("nome");

  if (!isMissingBonificacoesColumnError(firstAttempt.error)) {
    return {
      ...firstAttempt,
      data: (firstAttempt.data || []).map((funcionario: Record<string, unknown>) => ({
        ...funcionario,
        bonificacoes_padrao: getBonificacoesFromFuncionario(funcionario),
      })),
    };
  }

  const fallback = await supabase
    .from("funcionarios")
    .select("id, nome, cpf, cargo, salario_base, salario_combinado, tipo_remuneracao, escala, observacoes")
    .eq("obra_id", obraId)
    .eq("status", "ativo")
    .order("nome");

  return {
    ...fallback,
    data: (fallback.data || []).map((funcionario: Record<string, unknown>) => ({
      ...funcionario,
      bonificacoes_padrao: getBonificacoesFromFuncionario(funcionario),
    })),
  };
}