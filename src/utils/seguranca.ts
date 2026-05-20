import { supabase } from "@/integrations/supabase/client";

// Calcula data de vencimento baseada no tipo do documento
export function calcularVencimento(tipo: string, dataRealizacao: Date): Date {
  const meses = ['NR12', 'NR18', 'NR35'].includes(tipo.toUpperCase()) ? 24 : 6;
  const vencimento = new Date(dataRealizacao);
  vencimento.setMonth(vencimento.getMonth() + meses);
  return vencimento;
}

// Calcula status baseado na data de vencimento
export function calcularStatus(dataVencimento: Date): 'vigente' | 'a_vencer' | 'vencido' {
  const hoje = new Date();
  // Zera as horas para comparar apenas os dias
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);

  const diasRestantes = Math.ceil(
    (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diasRestantes < 0) return 'vencido';
  if (diasRestantes <= 30) return 'a_vencer';
  return 'vigente';
}

// Retorna dias restantes (negativo = já vencido)
export function diasRestantes(dataVencimento: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);

  return Math.ceil(
    (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export async function verificarAlertas() {
  // 1. Buscar documento mais recente por (funcionario_id + tipo)
  // No postgres, o ideal seria uma view ou distinct on, mas pelo cliente supabase:
  const { data: todos } = await supabase
    .from("seguranca_documentos")
    .select("id, funcionario_id, tipo, data_vencimento, status")
    .order("data_vencimento", { ascending: false });

  if (!todos) return { vencidos: 0, a_vencer_7: 0, a_vencer_15: 0, a_vencer_30: 0 };

  // Agrupar apenas o mais recente por funcionario+tipo
  const maisRecentes = new Map<string, any>();
  for (const doc of todos) {
    const key = `${doc.funcionario_id}_${doc.tipo}`;
    if (!maisRecentes.has(key)) {
      maisRecentes.set(key, doc);
    }
  }

  let vencidos = 0;
  let a_vencer_7 = 0;
  let a_vencer_15 = 0;
  let a_vencer_30 = 0;

  for (const doc of Array.from(maisRecentes.values())) {
    const d = new Date(doc.data_vencimento + "T12:00:00");
    const dias = diasRestantes(d);
    let tipo_alerta = "";
    let novo_status = "vigente";

    if (dias < 0) {
      tipo_alerta = "vencido";
      novo_status = "vencido";
      vencidos++;
    } else if (dias <= 7) {
      tipo_alerta = "7_dias";
      novo_status = "a_vencer";
      a_vencer_7++;
    } else if (dias <= 15) {
      tipo_alerta = "15_dias";
      novo_status = "a_vencer";
      a_vencer_15++;
    } else if (dias <= 30) {
      tipo_alerta = "30_dias";
      novo_status = "a_vencer";
      a_vencer_30++;
    }

    if (doc.status !== novo_status) {
      await supabase.from("seguranca_documentos").update({ status: novo_status }).eq("id", doc.id);
    }

    if (tipo_alerta) {
      const { data: jaAvisado } = await supabase
        .from("seguranca_alertas_log")
        .select("id")
        .eq("documento_id", doc.id)
        .eq("tipo_alerta", tipo_alerta)
        .maybeSingle();

      if (!jaAvisado) {
        await supabase.from("seguranca_alertas_log").insert({
          documento_id: doc.id,
          funcionario_id: doc.funcionario_id,
          tipo_alerta,
        });
      }
    }
  }

  return { vencidos, a_vencer_7, a_vencer_15, a_vencer_30 };
}
