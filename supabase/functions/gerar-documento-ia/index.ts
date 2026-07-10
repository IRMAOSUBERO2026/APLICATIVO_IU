import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Gera textos oficiais (advertências, comunicados, recibos, etc.) a partir de
// uma ideia curta do usuário, usando o Lovable AI Gateway. Retorna texto pronto
// para revisão/impressão. Não persiste nada.

const TIPO_INSTRUCOES: Record<string, string> = {
  advertencia:
    "Termo de Advertência Disciplinar fundamentado no art. 482 da CLT. Tom formal, firme e respeitoso.",
  suspensao:
    "Carta de Suspensão Disciplinar fundamentada no art. 482 da CLT, indicando período e motivo.",
  comunicado: "Comunicado oficial dirigido ao colaborador, tom cordial e claro.",
  comunicado_geral:
    "Comunicado geral/circular a todos os colaboradores da empresa (mural), tom institucional.",
  recibo:
    "Recibo de pagamento/quitação com espaço para valor, tom jurídico de quitação.",
  justificativa_falta:
    "Termo de Justificativa e Abono de Faltas para registro no ponto/DP.",
  aviso_ferias:
    "Aviso de Férias conforme art. 135 da CLT, informando período aquisitivo e datas de gozo.",
  convocacao:
    "Convocação formal (reunião, treinamento, retorno ao trabalho ou hora extra), com data, horário e local.",
  mudanca_horario:
    "Comunicado de alteração de jornada/horário de trabalho ou escala, informando novo horário e vigência.",
  seguranca_trabalho:
    "Comunicado de Segurança do Trabalho (uso obrigatório de EPI, DDS, procedimentos NR), tom preventivo.",
  elogio:
    "Carta de Elogio/Reconhecimento por bom desempenho ou conduta exemplar, tom positivo e motivador.",
  aviso_previo:
    "Aviso Prévio (trabalhado ou indenizado) conforme CLT, com prazos legais.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      tipo = "comunicado",
      ideia = "",
      nomeFuncionario = "",
      cargoFuncionario = "",
      nomeEmpresa = "Empresa",
      data = "",
    } = body ?? {};

    if (!ideia || typeof ideia !== "string" || ideia.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Descreva a ideia do documento." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instrucaoTipo = TIPO_INSTRUCOES[tipo] || TIPO_INSTRUCOES.comunicado;
    const dataFmt = data
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(data + "T12:00:00"))
      : new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

    const system = `Você é um especialista em Departamento Pessoal e Direito do Trabalho brasileiro (CLT) da empresa "${nomeEmpresa}".
Redija documentos oficiais de RH prontos para impressão, em português formal do Brasil.
Regras:
- Use apenas as informações fornecidas; NÃO invente valores, datas ou fatos não informados — deixe lacunas entre colchetes [ ] quando faltar dado.
- Estruture com título em caixa alta, corpo bem redigido e linhas de assinatura ao final (empresa e colaborador).
- Fundamente juridicamente quando aplicável, sem citar artigos incorretos.
- Retorne SOMENTE o texto do documento, sem comentários, sem markdown.`;

    const user = `Tipo de documento: ${instrucaoTipo}
Empresa: ${nomeEmpresa}
${nomeFuncionario ? `Colaborador: ${nomeFuncionario}` : "Colaborador: (comunicado geral, sem destinatário específico)"}
${cargoFuncionario ? `Cargo: ${cargoFuncionario}` : ""}
Data do documento: ${dataFmt}

Ideia / contexto informado pelo gestor:
"""${ideia.trim()}"""

Desenvolva o documento completo e profissional a partir dessa ideia.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Falha na IA: ${t.slice(0, 200)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataResp = await resp.json();
    const texto = dataResp?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ texto }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
