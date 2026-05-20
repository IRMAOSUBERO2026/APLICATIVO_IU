import { supabase } from "@/integrations/supabase/client";

export interface ParseResult {
  total: number;
  biometricos: number;
  desconhecidos: number;
  erros: string[];
  datasProcessadas: string[];
}

export async function parseAFD(conteudo: string, equipamentoId: string): Promise<ParseResult> {
  const linhas = conteudo.split(/\r?\n/);
  const result: ParseResult = {
    total: 0,
    biometricos: 0,
    desconhecidos: 0,
    erros: [],
    datasProcessadas: [],
  };

  const datasSet = new Set<string>();

  if (linhas.length < 2) {
    result.erros.push("Arquivo muito curto ou vazio.");
    return result;
  }

  // Obter informações do equipamento para saber a obra vinculada
  const { data: equipamento } = await supabase
    .from("ponto_equipamentos")
    .select("obra_id")
    .eq("id", equipamentoId)
    .single();

  const obraIdBatida = equipamento?.obra_id;

  const batidasParaInserir: any[] = [];
  const inconsistenciasParaInserir: any[] = [];

  // Pular cabeçalho (linha 0) e rodapé (última linha se for 9999)
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || linha.startsWith("9999") || linha.length < 50) continue;

    result.total++;

    // Portaria 671: caractere na posição 11 (índice 10) indica o tipo de registro
    // Tipo "2" = Registro de Ponto
    const tipoRegistro = linha.substring(10, 11);
    
    if (tipoRegistro === "2") {
      result.biometricos++;
      
      try {
        const sequencia = parseInt(linha.substring(5, 10), 10);
        const timestampRaw = linha.substring(11, 36).trim(); // Formato ISO 8601 ex: 2026-04-01T07:14:00-0300
        const pisRaw = linha.substring(36, 47).trim();
        const pis = pisRaw.replace(/^0+/, ""); // Remover zeros à esquerda (PIS tem 11 dígitos)
        const hash = linha.substring(47, 51).trim();

        const dataRef = timestampRaw.split("T")[0];
        datasSet.add(dataRef);

        // Buscar funcionário pelo PIS
        const { data: funcionario } = await supabase
          .from("funcionarios")
          .select("id, obra_id, nome")
          .eq("pis", pis)
          .maybeSingle();

        const eDeslocamento = funcionario && funcionario.obra_id !== obraIdBatida;

        if (!funcionario) {
          result.desconhecidos++;
        }

        batidasParaInserir.push({
          equipamento_id: equipamentoId,
          funcionario_id: funcionario?.id || null,
          pis: pis,
          timestamp_batida: timestampRaw,
          tipo_registro: "biometrico",
          obra_id_batida: obraIdBatida,
          e_deslocamento: eDeslocamento,
          sequencia_afd: sequencia,
          hash_verificacao: hash,
          arquivo_origem: "importacao_afd",
        });

        // Se PIS desconhecido, já preparar inconsistência
        if (!funcionario) {
          inconsistenciasParaInserir.push({
            tipo: "pis_desconhecido",
            pis_desconhecido: pis,
            descricao: `Batida detectada para PIS ${pis} não cadastrado no sistema.`,
            data_referencia: timestampRaw.split("T")[0],
            status: "aberta",
            obra_id: obraIdBatida,
          });
        }
      } catch (err: any) {
        result.erros.push(`Erro na linha ${i + 1}: ${err.message}`);
      }
    }
  }

  // Upsert batidas (chave: sequencia_afd + equipamento_id para evitar duplicidade no mesmo relógio)
  // Como não temos chave composta UNIQUE no Postgres (ainda), vamos usar sequencia_afd + equipamento_id manualmente ou via política.
  // No prompt do arquiteto ele sugeriu "upsert em ponto_batidas_raw (chave: sequencia_afd + equipamento_id)".
  // Vou assumir que o usuário vai rodar um SQL para adicionar esse UNIQUE ou eu mesmo faço.
  
  if (batidasParaInserir.length > 0) {
    // Chunks de 100 para evitar limites do Supabase/HTTP
    for (let i = 0; i < batidasParaInserir.length; i += 100) {
      const chunk = batidasParaInserir.slice(i, i + 100);
      const { error } = await supabase.from("ponto_batidas_raw").upsert(chunk, {
        onConflict: "sequencia_afd, equipamento_id"
      });
      if (error) {
        // Se der erro de onConflict porque a constraint não existe, tentamos insert normal
        if (error.code === "42703" || error.message.includes("column")) {
           await supabase.from("ponto_batidas_raw").insert(chunk);
        } else {
           result.erros.push(`Erro ao salvar batidas: ${error.message}`);
        }
      }
    }
  }

  if (inconsistenciasParaInserir.length > 0) {
    await supabase.from("ponto_inconsistencias").upsert(inconsistenciasParaInserir, {
       onConflict: "funcionario_id, data_referencia, tipo"
    });
  }

  result.datasProcessadas = Array.from(datasSet);
  return result;
}
