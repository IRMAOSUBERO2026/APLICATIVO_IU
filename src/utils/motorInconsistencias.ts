import { supabase } from "@/integrations/supabase/client";
import { format, isWeekend, parseISO } from "date-fns";

export async function detectarInconsistencias(obraId: string, dataReferencia: Date) {
  const dataStr = format(dataReferencia, "yyyy-MM-dd");
  
  // 1. Obter todos os funcionários ativos desta obra
  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select("id, nome, pis, obra_id")
    .eq("obra_id", obraId)
    .eq("status", "ativo");

  if (!funcionarios) return;

  // 2. Obter todas as batidas deste dia para esta obra
  // Nota: pegamos batidas de qualquer relógio, pois o funcionário pode ter batido em outro relógio da mesma obra ou de outra obra
  // Mas para a detecção de falta na obra BASE, focamos nos funcionários da obra.
  
  for (const func of funcionarios) {
    // Buscar batidas do funcionário no dia
    const { data: batidas } = await supabase
      .from("ponto_batidas_raw")
      .select("*")
      .eq("funcionario_id", func.id)
      .gte("timestamp_batida", `${dataStr}T00:00:00`)
      .lte("timestamp_batida", `${dataStr}T23:59:59`);

    const qtdBatidas = batidas?.length || 0;

    // REGRA 1: Batida Faltando (1, 2 ou 3 batidas)
    // Se 2 batidas, mas o intervalo for muito curto (ex: esqueceu de bater a volta do almoço)
    // Para simplificar a regra do arquiteto: 1, 2 ou 3 batidas = batida_faltando
    if (qtdBatidas > 0 && qtdBatidas < 4) {
      await registrarInconsistencia({
        funcionario_id: func.id,
        obra_id: obraId,
        data_referencia: dataStr,
        tipo: "batida_faltando",
        descricao: `Funcionário registrou apenas ${qtdBatidas} batida(s). São necessárias 4 batidas para jornada completa.`,
      });
    }

    // REGRA 2: Falta Injustificada (0 batidas em dia útil)
    const eFimDeSemana = isWeekend(dataReferencia);
    if (qtdBatidas === 0 && !eFimDeSemana) {
      await registrarInconsistencia({
        funcionario_id: func.id,
        obra_id: obraId,
        data_referencia: dataStr,
        tipo: "falta_injustificada",
        descricao: "Nenhum registro de ponto encontrado em dia útil.",
        prazo_resolucao: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h
      });
    }

    // REGRA 4: Deslocamento (já marcado no parser, mas garantimos aqui se necessário)
    const temDeslocamento = batidas?.some(b => b.e_deslocamento);
    if (temDeslocamento) {
      await registrarInconsistencia({
        funcionario_id: func.id,
        obra_id: obraId,
        data_referencia: dataStr,
        tipo: "deslocamento",
        descricao: "Batida registrada em equipamento de outra obra.",
      });
    }
  }
}

async function registrarInconsistencia(data: {
  funcionario_id: string;
  obra_id: string;
  data_referencia: string;
  tipo: string;
  descricao: string;
  prazo_resolucao?: string;
}) {
  // Evitar duplicidade (mesmo funcionário, mesma data, mesmo tipo)
  const { data: existente } = await supabase
    .from("ponto_inconsistencias")
    .select("id")
    .eq("funcionario_id", data.funcionario_id)
    .eq("data_referencia", data.data_referencia)
    .eq("tipo", data.tipo)
    .maybeSingle();

  if (!existente) {
    await supabase.from("ponto_inconsistencias").insert({
      ...data,
      status: "aberta",
    });
  }
}
