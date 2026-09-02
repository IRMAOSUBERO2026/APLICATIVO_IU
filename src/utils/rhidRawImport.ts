import { supabase } from "@/integrations/supabase/client";
import type { RHiDMarcacao, RHiDMarcacoesParseResult } from "@/utils/rhidCsvParser";
import type { MatchMaps } from "@/utils/rhidImport";

const nameKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export interface RawPreAnalysis {
  total: number; cpfs: number; dispositivos: string[]; dataInicio: string | null; dataFim: string | null;
  vinculadas: number; semVinculo: number; porCriterio: { cpf: number; pis: number; nome: number; sem: number };
  duplicadas: number; suspeitas: number; hash: string;
}
export interface RawImportStats { importacaoId: string | null; gravados: number; vinculadas: number; semVinculo: number; duplicadas: number; erros: string[]; }

/** Chave estável de agrupamento de marcações sem vínculo (CPF > PIS > nome). */
export function chaveVinculoRaw(row: RHiDMarcacao) {
  if (row.cpf) return `cpf:${row.cpf}`;
  if (row.pis) return `pis:${row.pis}`;
  return `nome:${nameKey(row.nome || "")}`;
}

export type VinculoManual = Record<string, string>;

function encontrarFuncionario(row: RHiDMarcacao, maps: MatchMaps, manuais?: VinculoManual) {
  const manualId = manuais?.[chaveVinculoRaw(row)];
  if (manualId) {
    const alvo = maps.funcionarios.find((f) => f.id === manualId);
    if (alvo) return { funcionario: alvo, criterio: "manual" as const };
  }
  const porCpf = row.cpf ? maps.funcPorCpf.get(row.cpf) : null;
  if (porCpf) return { funcionario: porCpf, criterio: "cpf" as const };
  const porPis = row.pis ? maps.funcPorPis.get(row.pis) : null;
  if (porPis) return { funcionario: porPis, criterio: "pis" as const };
  const porNome = row.nome ? maps.funcPorNome.get(nameKey(row.nome)) : null;
  if (porNome) return { funcionario: porNome, criterio: "nome" as const };
  return { funcionario: null, criterio: null };
}

export interface GrupoSemVinculo {
  chave: string; cpf: string | null; pis: string | null; nome: string; total: number; dias: number;
  primeira: string; ultima: string; dispositivos: string[];
}

/** Agrupa as marcações que não encontraram funcionário, para correção manual. */
export function listarSemVinculo(parse: RHiDMarcacoesParseResult, maps: MatchMaps, manuais?: VinculoManual): GrupoSemVinculo[] {
  const grupos = new Map<string, GrupoSemVinculo & { diasSet: Set<string>; dispSet: Set<string> }>();
  for (const row of parse.registros) {
    if (encontrarFuncionario(row, maps, manuais).funcionario) continue;
    const chave = chaveVinculoRaw(row);
    const item = grupos.get(chave) || { chave, cpf: row.cpf || null, pis: row.pis || null, nome: row.nome || "Sem nome no arquivo", total: 0, dias: 0, primeira: row.dataHora, ultima: row.dataHora, diasSet: new Set<string>(), dispSet: new Set<string>(), dispositivos: [] };
    item.total++;
    item.diasSet.add(row.dataHora.slice(0, 10));
    if (row.dataHora < item.primeira) item.primeira = row.dataHora;
    if (row.dataHora > item.ultima) item.ultima = row.dataHora;
    if ((row as any).dispositivo) item.dispSet.add((row as any).dispositivo);
    grupos.set(chave, item);
  }
  return Array.from(grupos.values())
    .map((g) => ({ chave: g.chave, cpf: g.cpf, pis: g.pis, nome: g.nome, total: g.total, dias: g.diasSet.size, primeira: g.primeira, ultima: g.ultima, dispositivos: Array.from(g.dispSet) }))
    .sort((a, b) => b.total - a.total);
}

export function prepararRawPreAnalise(parse: RHiDMarcacoesParseResult, maps: MatchMaps, hash: string, manuais?: VinculoManual): RawPreAnalysis {
  const porCriterio = { cpf: 0, pis: 0, nome: 0, sem: 0 }; const vistos = new Set<string>();
  let vinculadas = 0; let duplicadas = 0; let suspeitas = 0;
  for (const row of parse.registros) {
    const match = encontrarFuncionario(row, maps, manuais);
    if (match.criterio) { vinculadas++; if (match.criterio !== "manual") porCriterio[match.criterio]++; } else porCriterio.sem++;
    const chave = `${row.id}|${row.nsr ?? ""}|${row.dataHora}|${row.cpf ?? ""}`;
    if (vistos.has(chave)) duplicadas++; else vistos.add(chave);
    if (row.suspeita) suspeitas++;
  }
  return { total: parse.totalLinhas, cpfs: parse.cpfs.length, dispositivos: parse.dispositivos, dataInicio: parse.dataInicio, dataFim: parse.dataFim, vinculadas, semVinculo: porCriterio.sem, porCriterio, duplicadas, suspeitas, hash };
}


export async function importarMarcacoesRHiD(parse: RHiDMarcacoesParseResult, fileName: string, maps: MatchMaps): Promise<RawImportStats> {
  const erros = [...parse.erros]; const stats: RawImportStats = { importacaoId: null, gravados: 0, vinculadas: 0, semVinculo: 0, duplicadas: 0, erros };
  const { data: existentes } = await supabase.from("ponto_batidas_raw").select("timestamp_batida, funcionario_id, pis, nsr, arquivo_origem").eq("arquivo_origem", fileName);
  const jaImportadas = new Set((existentes || []).map((row: any) => `${row.timestamp_batida}|${row.funcionario_id || ""}|${row.pis || ""}|${row.nsr || ""}`));
  const rows: any[] = []; const seen = new Set<string>();
  for (const row of parse.registros) {
    const match = encontrarFuncionario(row, maps);
    if (match.funcionario) stats.vinculadas++; else stats.semVinculo++;
    const chave = `${row.id}|${row.nsr ?? ""}|${row.dataHora}|${row.cpf ?? ""}`;
    if (seen.has(chave)) { stats.duplicadas++; continue; }
    const dbChave = `${row.dataHora}|${match.funcionario?.id || ""}|${row.pis || ""}|${row.nsr || ""}`;
    if (jaImportadas.has(dbChave)) { stats.duplicadas++; continue; }
    seen.add(chave);
    rows.push({ equipamento_id: null, funcionario_id: match.funcionario?.id || null, pis: row.pis, timestamp_batida: row.dataHora, tipo_registro: "rhid_csv", obra_id_batida: match.funcionario?.obra_id || null, e_deslocamento: false, sequencia_afd: row.nsr, hash_verificacao: (row.id || "").slice(0, 10), arquivo_origem: fileName.slice(0, 100) });
  }
  const { data: log, error: logError } = await supabase.from("ponto_importacoes_log").insert({ equipamento_id: null, obra_id: null, arquivo_nome: fileName.slice(0, 100), periodo_inicio: parse.dataInicio, periodo_fim: parse.dataFim, total_registros: rows.length, registros_biometricos: rows.length, pis_desconhecidos: stats.semVinculo, status: erros.length ? "aviso" : "concluido", erros: erros.length ? erros.slice(0, 200).join("\n") : null }).select("id").single();
  if (logError || !log) { stats.erros.push(`Falha ao criar o lote: ${logError?.message || "sem retorno"}`); return stats; }
  stats.importacaoId = log.id;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500); const { error } = await supabase.from("ponto_batidas_raw").insert(chunk);
    if (error) stats.erros.push(`Falha ao gravar lote ${Math.floor(i / 500) + 1}: ${error.message}`); else stats.gravados += chunk.length;
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

