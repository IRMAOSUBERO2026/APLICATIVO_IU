// ============================================================================
// Serviço de importação do "Relatório de Ponto" RHiD (CSV mensal) para o banco.
//
// FONTE COMPLEMENTAR / DE CONCILIAÇÃO — NÃO alimenta ponto_apuracao_mensal nem
// folhas_pagamento. Grava em:
//   - ponto_relatorio_importacoes  (log de lote, com hash p/ idempotência)
//   - ponto_relatorio_rhid_diario  (1 registro por CPF/dia/lote)
//
// Matching de funcionário: SOMENTE por CPF. Nunca por matrícula.
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
}

export interface MatchMaps {
  funcPorCpf: Map<string, { id: string; nome: string }>;
  funcPorPis: Map<string, FuncionarioMatch>;
  funcPorNome: Map<string, FuncionarioMatch>;
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

const nomeChave = (nome: string) => nome.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function carregarMatch(): Promise<MatchMaps> {
  const { data } = await supabase.from("funcionarios").select("id, nome, cpf, pis, obra_id, status");
  const funcPorCpf = new Map<string, { id: string; nome: string }>();
  const funcPorPis = new Map<string, FuncionarioMatch>();
  const funcPorNome = new Map<string, FuncionarioMatch>();
  const funcionarios: FuncionarioMatch[] = [];
  for (const raw of data || []) {
    const f = raw as any;
    const funcionario: FuncionarioMatch = { id: f.id, nome: f.nome || "", cpf: apenasDigitos(f.cpf), pis: apenasDigitos(f.pis), obra_id: f.obra_id || null, status: f.status || null };
    funcionarios.push(funcionario);
    if (funcionario.cpf) funcPorCpf.set(funcionario.cpf, { id: funcionario.id, nome: funcionario.nome });
    if (funcionario.pis) funcPorPis.set(funcionario.pis, funcionario);
    if (funcionario.nome) funcPorNome.set(nomeChave(funcionario.nome), funcionario);
  }
  return { funcPorCpf, funcPorPis, funcPorNome, funcionarios };
}

/** Verifica se um arquivo com o mesmo hash já foi importado. */
export async function buscarImportacaoPorHash(hash: string) {
  const { data } = await supabase
    .from("ponto_relatorio_importacoes")
    .select("id, importado_em, nome_arquivo")
    .eq("hash_arquivo", hash)
    .order("importado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any) || null;
}

export async function preAnalisar(
  parse: RHiDParseResult,
  hash: string,
  maps: MatchMaps,
): Promise<PreAnalise> {
  const naoEncontrados: { cpf: string; nome: string }[] = [];
  for (const f of parse.funcionariosPorCpf) {
    if (!maps.funcPorCpf.has(f.cpf)) naoEncontrados.push(f);
  }
  const anterior = await buscarImportacaoPorHash(hash);
  return {
    competenciaMes: parse.competenciaMes,
    competenciaAno: parse.competenciaAno,
    totalLinhas: parse.totalLinhas,
    totalFuncionarios: parse.cpfs.length,
    cnpjs: parse.cnpjs,
    contagemTipoDia: parse.contagemTipoDia,
    naoEncontrados,
    hash,
    importacaoAnterior: anterior,
  };
}

export interface ImportStats {
  importacaoId: string | null;
  gravados: number;
  funcionariosNaoEncontrados: number;
  erros: string[];
}

const marker = (m: string | null) => (m === "I" || m === "C" ? m : null);

export async function importarRelatorioRHiD(
  parse: RHiDParseResult,
  fileName: string,
  hash: string,
  maps: MatchMaps,
): Promise<ImportStats> {
  const erros = [...parse.erros];
  const stats: ImportStats = {
    importacaoId: null,
    gravados: 0,
    funcionariosNaoEncontrados: 0,
    erros,
  };

  const naoEncontrados: { cpf: string; nome: string }[] = [];
  for (const f of parse.funcionariosPorCpf) {
    if (!maps.funcPorCpf.has(f.cpf)) naoEncontrados.push(f);
  }

  // Monta os registros diários (parsing e matching continuam no cliente).
  const registros = parse.registros.map((r: RHiDLinha) => {
    const func = maps.funcPorCpf.get(r.cpf) || null;
    if (!func) stats.funcionariosNaoEncontrados++;
    return {
      funcionario_id: func?.id || null,
      cpf_funcionario: r.cpf,
      nome_funcionario_rhid: r.nomeRhid,
      matricula_rhid: r.matriculaRhid || null,
      cnpj_centro_custo: r.cnpjCentroCusto,
      data: r.data,
      dia_semana: r.diaSemana,
      tipo_dia: r.tipoDia,
      entrada_1: r.entrada1.time,
      marcador_entrada_1: marker(r.entrada1.marker),
      saida_1: r.saida1.time,
      marcador_saida_1: marker(r.saida1.marker),
      entrada_2: r.entrada2.time,
      marcador_entrada_2: marker(r.entrada2.marker),
      saida_2: r.saida2.time,
      marcador_saida_2: marker(r.saida2.marker),
      entrada_3: r.entrada3.time,
      marcador_entrada_3: marker(r.entrada3.marker),
      saida_3: r.saida3.time,
      marcador_saida_3: marker(r.saida3.marker),
      total_normais_minutos: r.totalNormaisMin,
      dia_falta: r.diaFalta,
      horas_falta_minutos: r.horasFaltaMin,
      horas_atraso_minutos: r.horasAtrasoMin,
      abono_minutos: r.abonoMin,
      horas_extra_minutos: r.horasExtraMin,
      extras_total_minutos: r.extrasTotalMin,
      nome_feriado: r.nomeFeriado,
      justificativa: r.justificativa,
    };
  });

  // A gravação é feita numa Edge Function com service role key (não há login de
  // admin no ERP; o RLS bloquearia a gravação direta do cliente).
  // A função está hospedada no Lovable Cloud (não no projeto externo do app),
  // por isso chamamos o endpoint dela diretamente com a anon key do Cloud.
  const CLOUD_PROJECT_ID = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const CLOUD_ANON = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  let data: any = null;
  let error: { message: string } | null = null;
  try {
    const resp = await fetch(
      `https://${CLOUD_PROJECT_ID}.supabase.co/functions/v1/import-rhid`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: CLOUD_ANON || "",
          Authorization: `Bearer ${CLOUD_ANON || ""}`,
        },
        body: JSON.stringify({
          importacao: {
            nome_arquivo: fileName,
            hash_arquivo: hash,
            competencia_mes: parse.competenciaMes || 0,
            competencia_ano: parse.competenciaAno || 0,
            total_linhas: parse.totalLinhas,
            total_funcionarios: parse.cpfs.length,
            cnpjs_encontrados: parse.cnpjs,
            funcionarios_nao_encontrados: naoEncontrados,
            total_nao_encontrados: stats.funcionariosNaoEncontrados,
            erros_parsing: parse.erros,
          },
          registros,
        }),
      },
    );
    data = await resp.json().catch(() => null);
    if (!resp.ok) error = { message: data?.error || `HTTP ${resp.status}` };
  } catch (e: any) {
    error = { message: e?.message || "Falha de rede" };
  }

  if (error) {
    erros.push(`Falha na gravação (edge function): ${error.message}`);
    return stats;
  }

  const res = (data as any) || {};
  stats.importacaoId = res.importacaoId || null;
  stats.gravados = res.gravados || 0;
  if (Array.isArray(res.erros)) {
    for (const e of res.erros) if (!erros.includes(e)) erros.push(e);
  }
  if (!stats.importacaoId && !erros.length) {
    erros.push("Erro desconhecido ao gravar importação.");
  }

  return stats;
}
