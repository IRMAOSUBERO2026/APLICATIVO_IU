// ============================================================================
// Serviço de importação do "Relatório de Ponto" RHiD (CSV mensal) para o banco.
//
// FONTE COMPLEMENTAR / DE CONCILIAÇÃO — NÃO alimenta ponto_apuracao_mensal nem
// folhas_pagamento. Grava em:
//   - ponto_relatorio_importacoes  (log de lote, com hash p/ idempotência)
//   - ponto_relatorio_rhid_diario  (1 registro por CPF/dia/lote)
// ============================================================================
import { supabase } from "@/integrations/supabase/client";
import type { RHiDLinha, RHiDParseResult } from "@/utils/rhidCsvParser";

const apenasDigitos = (s: string) => (s || "").replace(/\D/g, "");

export interface FuncionarioMatch {
  id: string;
  nome: string;
  cpf: string;
  pis: string;
  obra_id: string | null;
  status: string | null;
  data_rescisao: string | null;
  numero_registro: string | null;
}

export interface MatchMaps {
  funcPorCpf: Map<string, FuncionarioMatch>;
  funcPorPis: Map<string, FuncionarioMatch>;
  /** Nomes duplicados recebem null e nunca são usados para vínculo automático. */
  funcPorNome: Map<string, FuncionarioMatch | null>;
  funcionarios: FuncionarioMatch[];
}

export interface PreAnalise {
  competenciaMes: number | null;
  competenciaAno: number | null;
  totalLinhas: number;
  totalFuncionarios: number;
  cnpjs: string[];
  contagemTipoDia: RHiDParseResult["contagemTipoDia"];
  naoEncontrados: { cpf: string; nome: string }[];
  hash: string;
  importacaoAnterior: { id: string; importado_em: string; nome_arquivo: string } | null;
}

const nomeChave = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function carregarMatch(): Promise<MatchMaps> {
  const { data } = await supabase.from("funcionarios").select("id, nome, cpf, pis, obra_id, status, data_rescisao, numero_registro");
  const funcPorCpf = new Map<string, FuncionarioMatch>();
  const funcPorPis = new Map<string, FuncionarioMatch>();
  const funcPorNome = new Map<string, FuncionarioMatch | null>();
  const funcionarios: FuncionarioMatch[] = [];
  for (const raw of data || []) {
    const f = raw as any;
    const funcionario: FuncionarioMatch = { id: f.id, nome: f.nome || "", cpf: apenasDigitos(f.cpf), pis: apenasDigitos(f.pis), obra_id: f.obra_id || null, status: f.status || null, data_rescisao: f.data_rescisao ? String(f.data_rescisao).slice(0, 10) : null, numero_registro: f.numero_registro || null };
    funcionarios.push(funcionario);
    if (funcionario.cpf) funcPorCpf.set(funcionario.cpf, funcionario);
    if (funcionario.pis) funcPorPis.set(funcionario.pis, funcionario);
    if (funcionario.nome) {
      const key = nomeChave(funcionario.nome);
      funcPorNome.set(key, funcPorNome.has(key) ? null : funcionario);
    }
  }
  return { funcPorCpf, funcPorPis, funcPorNome, funcionarios };
}

export async function buscarImportacaoPorHash(hash: string) {
  const { data } = await supabase.from("ponto_relatorio_importacoes").select("id, importado_em, nome_arquivo").eq("hash_arquivo", hash).order("importado_em", { ascending: false }).limit(1).maybeSingle();
  return (data as any) || null;
}

export async function preAnalisar(parse: RHiDParseResult, hash: string, maps: MatchMaps): Promise<PreAnalise> {
  const naoEncontrados: { cpf: string; nome: string }[] = [];
  for (const f of parse.funcionariosPorCpf) if (!maps.funcPorCpf.has(f.cpf)) naoEncontrados.push(f);
  return { competenciaMes: parse.competenciaMes, competenciaAno: parse.competenciaAno, totalLinhas: parse.totalLinhas, totalFuncionarios: parse.cpfs.length, cnpjs: parse.cnpjs, contagemTipoDia: parse.contagemTipoDia, naoEncontrados, hash, importacaoAnterior: await buscarImportacaoPorHash(hash) };
}

export interface ImportStats { importacaoId: string | null; gravados: number; funcionariosNaoEncontrados: number; erros: string[]; }
const marker = (m: string | null) => (m === "I" || m === "C" ? m : null);

export async function importarRelatorioRHiD(parse: RHiDParseResult, fileName: string, hash: string, maps: MatchMaps): Promise<ImportStats> {
  const erros = [...parse.erros];
  const stats: ImportStats = { importacaoId: null, gravados: 0, funcionariosNaoEncontrados: 0, erros };
  const naoEncontrados: { cpf: string; nome: string }[] = [];
  for (const f of parse.funcionariosPorCpf) if (!maps.funcPorCpf.has(f.cpf)) naoEncontrados.push(f);
  const registros = parse.registros.map((r: RHiDLinha) => {
    const func = maps.funcPorCpf.get(r.cpf) || null;
    if (!func) stats.funcionariosNaoEncontrados++;
    return { funcionario_id: func?.id || null, cpf_funcionario: r.cpf, nome_funcionario_rhid: r.nomeRhid, matricula_rhid: r.matriculaRhid || null, cnpj_centro_custo: r.cnpjCentroCusto, data: r.data, dia_semana: r.diaSemana, tipo_dia: r.tipoDia, entrada_1: r.entrada1.time, marcador_entrada_1: marker(r.entrada1.marker), saida_1: r.saida1.time, marcador_saida_1: marker(r.saida1.marker), entrada_2: r.entrada2.time, marcador_entrada_2: marker(r.entrada2.marker), saida_2: r.saida2.time, marcador_saida_2: marker(r.saida2.marker), entrada_3: r.entrada3.time, marcador_entrada_3: marker(r.entrada3.marker), saida_3: r.saida3.time, marcador_saida_3: marker(r.saida3.marker), total_normais_minutos: r.totalNormaisMin, dia_falta: r.diaFalta, horas_falta_minutos: r.horasFaltaMin, horas_atraso_minutos: r.horasAtrasoMin, abono_minutos: r.abonoMin, horas_extra_minutos: r.horasExtraMin, extras_total_minutos: r.extrasTotalMin, nome_feriado: r.nomeFeriado, justificativa: r.justificativa };
  });
  const CLOUD_PROJECT_ID = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const CLOUD_ANON = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  let data: any = null; let error: { message: string } | null = null;
  try {
    const resp = await fetch(`https://${CLOUD_PROJECT_ID}.supabase.co/functions/v1/import-rhid`, { method: "POST", headers: { "Content-Type": "application/json", apikey: CLOUD_ANON || "", Authorization: `Bearer ${CLOUD_ANON || ""}` }, body: JSON.stringify({ importacao: { nome_arquivo: fileName, hash_arquivo: hash, competencia_mes: parse.competenciaMes || 0, competencia_ano: parse.competenciaAno || 0, total_linhas: parse.totalLinhas, total_funcionarios: parse.cpfs.length, cnpjs_encontrados: parse.cnpjs, funcionarios_nao_encontrados: naoEncontrados, total_nao_encontrados: stats.funcionariosNaoEncontrados, erros_parsing: parse.erros }, registros }) });
    data = await resp.json().catch(() => null); if (!resp.ok) error = { message: data?.error || `HTTP ${resp.status}` };
  } catch (e: any) { error = { message: e?.message || "Falha de rede" }; }
  if (error) { erros.push(`Falha na gravação (edge function): ${error.message}`); return stats; }
  const result = data || {}; stats.importacaoId = result.importacaoId || null; stats.gravados = result.gravados || 0;
  if (Array.isArray(result.erros)) for (const item of result.erros) if (!erros.includes(item)) erros.push(item);
  if (!stats.importacaoId && !erros.length) erros.push("Erro desconhecido ao gravar importação.");
  return stats;
}
