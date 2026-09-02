import { supabase } from "@/integrations/supabase/client";
import type { RHiDMarcacao, RHiDMarcacoesParseResult } from "@/utils/rhidCsvParser";
import type { MatchMaps } from "@/utils/rhidImport";

const digits = (value: string | null | undefined) => (value || "").replace(/\D/g, "");
const nameKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export interface RawPreAnalysis {
  total: number;
  cpfs: number;
  dispositivos: string[];
  dataInicio: string | null;
  dataFim: string | null;
  vinculadas: number;
  semVinculo: number;
  porCriterio: { cpf: number; pis: number; nome: number; sem: number };
  duplicadas: number;
  suspeitas: number;
  hash: string;
  importacaoAnterior: { id: string; importado_em: string; arquivo_nome: string | null } | null;
}

export interface RawImportStats {
  importacaoId: string | null;
  gravados: number;
  vinculadas: number;
  semVinculo: number;
  duplicadas: number;
  erros: string[];
}

export function prepararRawPreAnalise(parse: RHiDMarcacoesParseResult, maps: MatchMaps, hash: string, importacaoAnterior: RawPreAnalysis["importacaoAnterior"] = null): RawPreAnalysis {
  const porCriterio = { cpf: 0, pis: 0, nome: 0, sem: 0 };
  let vinculadas = 0;
  const vistos = new Set<string>(); let duplicadas = 0; let suspeitas = 0;
  for (const row of parse.registros) {
    const match = encontrarFuncionario(row, maps);
    if (match.criterio) { vinculadas++; porCriterio[match.criterio]++; } else porCriterio.sem++;
    const chave = `${row.id}|${row.nsr ?? ""}|${row.dataHora}|${row.cpf ?? ""}`;
    if (vistos.has(chave)) duplicadas++; else vistos.add(chave);
    if (row.suspeita) suspeitas++;
  }
  return { total: parse.totalLinhas, cpfs: parse.cpfs.length, dispositivos: parse.dispositivos, dataInicio: parse.dataInicio, dataFim: parse.dataFim, vinculadas, semVinculo: porCriterio.sem, porCriterio, duplicadas, suspeitas, hash, importacaoAnterior };
}

function encontrarFuncionario(row: RHiDMarcacao, maps: MatchMaps): { funcionario: any | null; criterio: "cpf" | "pis" | "nome" | null } {
  const cpf = row.cpf ? maps.funcPorCpf.get(row.cpf) : null;
  if (cpf) return { funcionario: cpf, criterio: "cpf" };
  const pis = row.pis ? maps.funcPorPis.get(row.pis) : null;
  if (pis) return { funcionario: pis, criterio: "pis" };
  const nome = row.nome ? maps.funcPorNome.get(nameKey(row.nome)) : null;
  if (nome) return { funcionario: nome, criterio: "nome" };
  return { funcionario: null, criterio: null };
}

export async function buscarImportacaoRawPorHash(hash: string) {
  const { data } = await supabase.from("ponto_importacoes_log").select("id, importado_em, arquivo_nome").eq("hash_arquivo", hash).order("importado_em", { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

export async function importarMarcacoesRHiD(parse: RHiDMarcacoesParseResult, fileName: string, hash: string, maps: MatchMaps): Promise<RawImportStats> {
  const erros = [...parse.erros]; const stats: RawImportStats = { importacaoId: null, gravados: 0, vinculadas: 0, semVinculo: 0, duplicadas: 0, erros };
  const rows: any[] = []; const seen = new Set<string>();
  for (const row of parse.registros) {
    const match = encontrarFuncionario(row, maps);
    if (match.funcionario) stats.vinculadas++; else stats.semVinculo++;
    const chave = `${row.id}|${row.nsr ?? ""}|${row.dataHora}|${row.cpf ?? ""}`;
    if (seen.has(chave)) { stats.duplicadas++; continue; }
    seen.add(chave);
    rows.push({ equipamento_id: null, funcionario_id: match.funcionario?.id || null, pis: row.pis, timestamp_batida: row.dataHora, tipo_registro: "rhid_csv", obra_id_batida: match.funcionario?.obra_id || null, e_deslocamento: false, sequencia_afd: row.nsr, hash_verificacao: row.id || null, arquivo_origem: fileName });
  }
  const { data: log, error: logError } = await supabase.from("ponto_importacoes_log").insert({ equipamento_id: null, obra_id: null, arquivo_nome: fileName, periodo_inicio: parse.dataInicio, periodo_fim: parse.dataFim, total_registros: rows.length, registros_biometricos: rows.length, pis_desconhecidos: stats.semVinculo, status: erros.length ? "aviso" : "concluido", erros: erros.length ? erros.slice(0, 200).join("\n") : null, hash_arquivo: hash }).select("id").single();
  if (logError || !log) { stats.erros.push(`Falha ao criar o lote: ${logError?.message || "sem retorno"}`); return stats; }
  stats.importacaoId = log.id;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("ponto_batidas_raw").insert(rows.slice(i, i + 500));
    if (error) stats.erros.push(`Falha ao gravar lote ${Math.floor(i / 500) + 1}: ${error.message}`); else stats.gravados += Math.min(500, rows.length - i);
  }
  if (stats.erros.length > erros.length) await supabase.from("ponto_importacoes_log").update({ status: "aviso", erros: stats.erros.slice(0, 200).join("\n") }).eq("id", stats.importacaoId);
  return stats;
}

export function resumoPorFuncionario(parse: RHiDMarcacoesParseResult, maps: MatchMaps) {
  const result = new Map<string, { nome: string; total: number; dias: Set<string>; batidas: RHiDMarcacao[]; vinculo: string }>();
  for (const row of parse.registros) {
    const match = encontrarFuncionario(row, maps); const key = match.funcionario?.id || `sem-${row.cpf || row.nome}`;
    const item = result.get(key) || { nome: match.funcionario?.nome || row.nome || "Sem cadastro", total: 0, dias: new Set<string>(), batidas: [], vinculo: match.criterio || "sem" };
    item.total++; item.dias.add(row.dataHora.slice(0, 10)); item.batidas.push(row); result.set(key, item);
  }
  return Array.from(result.values()).map((item) => ({ ...item, dias: item.dias.size }));
}
