import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { diarios } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!diarios || !Array.isArray(diarios) || diarios.length === 0) {
      throw new Error("Nenhum diário fornecido para resumo");
    }

    const diarioTexto = diarios.map((d: any, i: number) => {
      return `--- Registro ${i + 1} (${d.data}) ---
Obra: ${d.obra_nome || "N/A"}
Responsável: ${d.responsavel || "N/A"}
Clima: ${d.clima || "N/A"}
Mão de obra presente: ${d.mao_de_obra_presente || 0}
Atividades: ${d.atividades_executadas || "Nenhuma"}
Ocorrências: ${d.ocorrencias || "Nenhuma"}
Condições de trabalho: ${d.condicoes_trabalho || "N/A"}
Observações: ${d.observacoes || "Nenhuma"}`;
    }).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um engenheiro civil experiente que analisa diários de obra. Gere um resumo executivo em português brasileiro com as seguintes seções:

## Resumo Executivo
Visão geral do período analisado.

## Atividades Principais
Lista das principais atividades executadas.

## Mão de Obra
Análise da força de trabalho (presença, produtividade).

## Ocorrências e Riscos
Problemas identificados e riscos potenciais.

## Recomendações
Sugestões de melhoria baseadas nos dados.

Seja objetivo, profissional e use dados quantitativos quando disponíveis.`
          },
          {
            role: "user",
            content: `Analise os seguintes registros de diário de obra e gere um resumo executivo:\n\n${diarioTexto}`
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("resumo-diario error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
