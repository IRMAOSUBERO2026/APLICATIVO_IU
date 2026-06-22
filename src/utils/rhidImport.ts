// ============================================================================
// Serviço de importação dos registros parseados do CSV RHiD para o banco.
// Cruza CPF -> funcionário e Departamento/CNPJ -> obra, grava em
// ponto_apuracao_diaria (fonte editável), ponto_batidas_raw (batidas) e
// gera log + inconsistências.
// ============================================================================
import { supabase } from "@/integrations/supabase/client";
import type { RHiDDiaRegistro } from "@/utils/rhidCsvParser";

const norm = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const apenasDigitos = (s: string) => (s || "").replace(/\D/g, "");

export interface PreviewItem extends RHiDDiaRegistro {
  funcionarioId: string | null;
  funcionarioNome: string | null;
  obraId: string | null;
  obraNome: string | null;
}

interface Mapeamentos {
  funcPorCpf: Map<string, { id: string; nome: string; obra_id: string | null }>;
  obras: { id: string; nome: string; codigo: string | null }[];
}

export async function carregarMapeamentos(): Promise<Mapeamentos> {
  const [funcRes, obraRes] = await Promise.all([
    supabase.from("funcionarios").select("id, nome, cpf, obra_id"),
    supabase.from("obras").select("id, nome, codigo"),
  ]);

  const funcPorCpf = new Map<string, { id: string; nome: string; obra_id: string | null }>();
  for (const f of funcRes.data || []) {
    const cpf = apenasDigitos((f as any).cpf || "");
    if (cpf) funcPorCpf.set(cpf, { id: (f as any).id, nome: (f as any).nome, obra_id: (f as any).obra_id });
  }
  return { funcPorCpf, obras: (obraRes.data as any) || [] };
}

function acharObra(departamento: string, maps: Mapeamentos): { id: string; nome: string } | null {
  const alvo = norm(departamento);
  if (!alvo) return null;
  // match exato
  let o = maps.obras.find((x) => norm(x.nome) === alvo);
  if (o) return { id: o.id, nome: o.nome };
  // match por inclusão (nomes parciais)
  o = maps.obras.find((x) => norm(x.nome).includes(alvo) || alvo.includes(norm(x.nome)));
  if (o) return { id: o.id, nome: o.nome };
  return null;
}

export function enriquecer(registros: RHiDDiaRegistro[], maps: Mapeamentos): PreviewItem[] {
  return registros.map((r) => {
    const func = maps.funcPorCpf.get(r.cpf) || null;
    const obraMatch = acharObra(r.departamento, maps);
    const obraId = obraMatch?.id || func?.obra_id || null;
    const obraNome = obraMatch?.nome || null;
    return {
      ...r,
      funcionarioId: func?.id || null,
      funcionarioNome: func?.nome || null,
      obraId,
      obraNome,
    };
  });
}

export interface ImportStats {
  processados: number;
  funcionariosNaoEncontrados: number;
  obrasNaoEncontradas: number;
  inconsistenciasGeradas: number;
  erros: string[];
}

const horarioParaTimestamp = (data: string, horario: string | null) =>
  horario ? `${data}T${horario}-03:00` : null;

export async function importarRHiD(
  items: PreviewItem[],
  fileName: string,
  parseErros: string[],
): Promise<ImportStats> {
  const erros = [...parseErros];
  const stats: ImportStats = {
    processados: 0,
    funcionariosNaoEncontrados: 0,
    obrasNaoEncontradas: 0,
    inconsistenciasGeradas: 0,
    erros,
  };

  if (items.length === 0) return stats;

  const datas = Array.from(new Set(items.map((i) => i.data))).sort();
  const obraIdParaLog = items.find((i) => i.obraId)?.obraId || null;

  // 1) Log de importação (cabeçalho)
  const { data: logRow, error: logErr } = await supabase
    .from("ponto_importacoes_log")
    .insert({
      obra_id: obraIdParaLog,
      arquivo_nome: fileName,
      periodo_inicio: datas[0] || null,
      periodo_fim: datas[datas.length - 1] || null,
      total_registros: items.length,
      registros_biometricos: items.filter((i) => i.origemBatida === "FACIAL" || i.origemBatida === "MISTO").length,
      status: "processando",
    })
    .select("id")
    .single();

  if (logErr) erros.push(`Log: ${logErr.message}`);
  const importacaoId = (logRow as any)?.id || null;

  // 2) Upsert apuração diária
  const apuracaoRows = items.map((i) => {
    if (!i.funcionarioId) stats.funcionariosNaoEncontrados++;
    if (!i.obraId) stats.obrasNaoEncontradas++;
    return {
      funcionario_id: i.funcionarioId,
      obra_id: i.obraId,
      importacao_id: importacaoId,
      nome_funcionario: i.nomeFuncionario,
      cpf: i.cpf,
      pis: i.pis || null,
      cargo: i.cargo || null,
      departamento: i.departamento || null,
      cnpj_obra: i.cnpjObra || null,
      data: i.data,
      entrada1: i.entrada1,
      saida1: i.saida1,
      entrada2: i.entrada2,
      saida2: i.saida2,
      entrada3: i.entrada3,
      saida3: i.saida3,
      origem_batida: i.origemBatida,
      tipo_dia: i.tipoDia,
      total_normais: i.totalNormais,
      falta_atraso: i.faltaAtraso,
      extra_diurna: i.extraDiurna,
      extra_noturna: i.extraNoturna,
      dia_falta: i.diaFalta,
      justificativa: i.justificativas || null,
    };
  });

  for (let k = 0; k < apuracaoRows.length; k += 200) {
    const chunk = apuracaoRows.slice(k, k + 200);
    const { error } = await supabase
      .from("ponto_apuracao_diaria")
      .upsert(chunk, { onConflict: "cpf, data" });
    if (error) erros.push(`Apuração (lote ${k / 200 + 1}): ${error.message}`);
    else stats.processados += chunk.length;
  }

  // 3) Batidas raw (apenas funcionários identificados). Remove batidas CSV
  //    anteriores das mesmas datas/funcionários para reimportação limpa.
  const funcIds = Array.from(new Set(items.map((i) => i.funcionarioId).filter(Boolean))) as string[];
  if (funcIds.length > 0 && datas.length > 0) {
    await supabase
      .from("ponto_batidas_raw")
      .delete()
      .eq("arquivo_origem", "importacao_csv_rhid")
      .in("funcionario_id", funcIds)
      .gte("timestamp_batida", `${datas[0]}T00:00:00-03:00`)
      .lte("timestamp_batida", `${datas[datas.length - 1]}T23:59:59-03:00`);
  }

  const batidas: any[] = [];
  for (const i of items) {
    if (!i.funcionarioId) continue;
    const pares: [string | null, string][] = [
      [i.entrada1, "ENTRADA"], [i.saida1, "SAIDA"],
      [i.entrada2, "ENTRADA"], [i.saida2, "SAIDA"],
      [i.entrada3, "ENTRADA"], [i.saida3, "SAIDA"],
    ];
    for (const [h, tipo] of pares) {
      const ts = horarioParaTimestamp(i.data, h);
      if (!ts) continue;
      batidas.push({
        funcionario_id: i.funcionarioId,
        pis: i.pis || null,
        timestamp_batida: ts,
        tipo_registro: tipo,
        obra_id_batida: i.obraId,
        arquivo_origem: "importacao_csv_rhid",
      });
    }
  }
  for (let k = 0; k < batidas.length; k += 200) {
    const chunk = batidas.slice(k, k + 200);
    const { error } = await supabase.from("ponto_batidas_raw").insert(chunk);
    if (error) erros.push(`Batidas (lote ${k / 200 + 1}): ${error.message}`);
  }

  // 4) Inconsistências geradas a partir do CSV
  const incs: any[] = [];
  for (const i of items) {
    if (!i.funcionarioId) {
      incs.push({
        obra_id: i.obraId,
        data_referencia: i.data,
        tipo: "cpf_desconhecido",
        descricao: `Funcionário "${i.nomeFuncionario}" (CPF ${i.cpf}) não cadastrado no sistema.`,
        pis_desconhecido: i.pis || null,
        status: "aberta",
      });
    } else if (i.tipoDia === "FALTA_PARCIAL") {
      incs.push({
        funcionario_id: i.funcionarioId,
        obra_id: i.obraId,
        data_referencia: i.data,
        tipo: "falta_parcial",
        descricao: `Batida(s) ausente(s) em ${i.data}. Importado do RHiD — aguardando atestado/justificativa.`,
        status: "aberta",
      });
    } else if (i.tipoDia === "FALTA_DIA_COMPLETO") {
      incs.push({
        funcionario_id: i.funcionarioId,
        obra_id: i.obraId,
        data_referencia: i.data,
        tipo: "falta_injustificada",
        descricao: `Falta o dia todo em ${i.data} (RHiD).`,
        status: "aberta",
      });
    }
  }
  for (let k = 0; k < incs.length; k += 200) {
    const chunk = incs.slice(k, k + 200);
    const { error } = await supabase.from("ponto_inconsistencias").insert(chunk);
    if (error) erros.push(`Inconsistências (lote ${k / 200 + 1}): ${error.message}`);
    else stats.inconsistenciasGeradas += chunk.length;
  }

  // 5) Fechar log
  if (importacaoId) {
    await supabase
      .from("ponto_importacoes_log")
      .update({
        pis_desconhecidos: stats.funcionariosNaoEncontrados,
        status: erros.length === 0 ? "concluido" : "aviso",
        erros: erros.join("\n").slice(0, 8000),
      })
      .eq("id", importacaoId);
  }

  return stats;
}
