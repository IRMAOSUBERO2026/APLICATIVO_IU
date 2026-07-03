import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// Gravação do "Relatório de Ponto" RHiD usando a SERVICE ROLE KEY.
// O frontend faz o parsing e monta o payload; esta função apenas grava,
// contornando o RLS (não há login de admin no ERP ainda).
// Correção pontual: NÃO altera RLS nem outras tabelas.
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // O app usa o projeto externo OFICIAL (wtrefsziscauokudnxgz), onde vivem as
    // tabelas ponto_relatorio_*. Esta função roda no Lovable Cloud, então grava
    // no projeto externo usando a service role key dele (secret dedicada).
    const supabaseUrl = Deno.env.get("EXT_SUPABASE_URL") || "https://wtrefsziscauokudnxgz.supabase.co";
    const serviceKey = Deno.env.get("EXT_SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "EXT_SUPABASE_SERVICE_ROLE_KEY não configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const admin = createClient(supabaseUrl, serviceKey);

    const { importacao, registros } = await req.json();

    if (!importacao || !Array.isArray(registros)) {
      return new Response(
        JSON.stringify({ error: "Payload inválido: 'importacao' e 'registros' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const erros: string[] = Array.isArray(importacao.erros_parsing) ? [...importacao.erros_parsing] : [];
    const errosBaseLen = erros.length;

    // 1) Criar lote de importação
    const { data: logRow, error: logErr } = await admin
      .from("ponto_relatorio_importacoes")
      .insert({
        nome_arquivo: importacao.nome_arquivo,
        hash_arquivo: importacao.hash_arquivo,
        competencia_mes: importacao.competencia_mes || 0,
        competencia_ano: importacao.competencia_ano || 0,
        total_linhas: importacao.total_linhas || 0,
        total_funcionarios: importacao.total_funcionarios || 0,
        cnpjs_encontrados: importacao.cnpjs_encontrados || [],
        funcionarios_nao_encontrados: importacao.funcionarios_nao_encontrados || [],
        status: "processando",
      })
      .select("id")
      .single();

    if (logErr || !logRow) {
      return new Response(
        JSON.stringify({ error: `Falha ao criar lote: ${logErr?.message || "sem retorno"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const importacaoId = logRow.id as string;

    // 2) Gravar registros diários em lotes
    let gravados = 0;
    const rows = registros.map((r: any) => ({ ...r, importacao_id: importacaoId }));

    for (let k = 0; k < rows.length; k += 300) {
      const chunk = rows.slice(k, k + 300);
      const { error } = await admin
        .from("ponto_relatorio_rhid_diario")
        .upsert(chunk, { onConflict: "cpf_funcionario, data, importacao_id" });
      if (error) erros.push(`Registros (lote ${Math.floor(k / 300) + 1}): ${error.message}`);
      else gravados += chunk.length;
    }

    // 3) Fechar lote
    const naoEncontrados = importacao.funcionarios_nao_encontrados || [];
    const status =
      erros.length > errosBaseLen
        ? "erro"
        : naoEncontrados.length > 0
        ? "concluido_com_avisos"
        : "concluido";

    await admin
      .from("ponto_relatorio_importacoes")
      .update({ status, mensagens_erro: erros.length ? erros.slice(0, 200) : null })
      .eq("id", importacaoId);

    return new Response(
      JSON.stringify({
        importacaoId,
        gravados,
        funcionariosNaoEncontrados: importacao.total_nao_encontrados || 0,
        erros,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
