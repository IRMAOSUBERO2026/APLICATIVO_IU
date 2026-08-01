import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Gera textos oficiais (advertências, comunicados, recibos, etc.) a partir de
// uma ideia curta do usuário, usando o Lovable AI Gateway. Retorna texto pronto
// para revisão/impressão. Não persiste nada.

const TIPO_INSTRUCOES: Record<string, string> = {
  advertencia:
    "Termo de Advertência Disciplinar fundamentado no poder diretivo do empregador (art. 2º da CLT) e nas hipóteses do art. 482 da CLT. Descrever o fato de forma objetiva (o que, quando, onde), o impacto operacional, a norma interna descumprida e a gradação de penalidades em caso de reincidência.",
  suspensao:
    "Carta de Suspensão Disciplinar (arts. 474 e 482 da CLT), com período (máximo 30 dias), datas de início e retorno, fato gerador, histórico disciplinar e advertência sobre justa causa em caso de reincidência.",
  comunicado: "Comunicado oficial individual ao colaborador, com objeto, teor detalhado, providências esperadas e prazo.",
  comunicado_geral:
    "Comunicado geral/circular institucional a todos os colaboradores (mural e grupos), com objeto, vigência, orientações práticas numeradas e canal de dúvidas.",
  recibo:
    "Recibo de pagamento/quitação com valor em número e por extenso, referência (verba), período e cláusula de quitação.",
  justificativa_falta:
    "Termo de Justificativa e Abono de Faltas para registro no ponto/DP, indicando data(s), horários, motivo, documento comprobatório e efeito na folha (abono, desconto ou compensação).",
  aviso_ferias:
    "Aviso de Férias (arts. 134 a 137 da CLT), com período aquisitivo, período concessivo, datas de gozo e retorno, eventual abono pecuniário (1/3 — art. 143) e pagamento até 2 dias antes do início (art. 145).",
  convocacao:
    "Convocação formal (reunião, treinamento, retorno ao trabalho ou jornada extraordinária), com data, horário, local, pauta, obrigatoriedade e consequência da ausência.",
  mudanca_horario:
    "Comunicado de alteração de jornada/escala, com horário anterior e novo, intervalos, vigência, fundamento (art. 468 da CLT e Convenção Coletiva) e impacto em adicional noturno/horas extras quando houver.",
  seguranca_trabalho:
    "Comunicado de Segurança do Trabalho citando as NRs aplicáveis (NR-1, NR-6, NR-18, NR-35 etc.), risco identificado, medidas de controle, EPI obrigatório e consequências disciplinares do descumprimento (art. 158 da CLT).",
  elogio:
    "Carta de Elogio/Reconhecimento, com fato concreto reconhecido, competências demonstradas, impacto para a equipe/obra e registro no prontuário.",
  aviso_previo:
    "Aviso Prévio (arts. 487 a 491 da CLT e Lei 12.506/2011), com modalidade (trabalhado ou indenizado), prazo proporcional ao tempo de serviço, datas e verbas a serem quitadas no prazo do art. 477.",
  transferencia_obra:
    "Comunicado de transferência de local de prestação de serviços (art. 469 da CLT), com obra/setor de origem e destino, data de início, jornada, responsável imediato e manutenção das condições contratuais.",
  alteracao_salarial:
    "Comunicado de alteração salarial (art. 468 da CLT), com salário anterior, novo salário, percentual, fundamento (Convenção Coletiva, mérito ou enquadramento), vigência e registro em ficha/CTPS digital.",
  promocao:
    "Comunicado de promoção/mudança de função, com função anterior e nova, novas atribuições e responsabilidades, salário, vigência e necessidade de treinamentos/exames complementares.",
  declaracao_vinculo:
    "Declaração de vínculo empregatício para fins de comprovação, com função, data de admissão, jornada, remuneração e finalidade, sem informações não fornecidas.",
  autorizacao_desconto:
    "Termo de autorização expressa de desconto em folha (art. 462 da CLT e Súmula 342 do TST), com origem do débito, valor total, número de parcelas e valor de cada parcela.",
  banco_horas:
    "Acordo/comunicado de banco de horas (art. 59, §§ 2º e 5º, da CLT), com regra de compensação, prazo de quitação, saldo atual e forma de acompanhamento.",
  ferias_coletivas:
    "Aviso de Férias Coletivas (arts. 139 a 141 da CLT), com setores abrangidos, período, retorno, comunicação ao sindicato e tratamento de empregados com menos de 12 meses.",
  retorno_atestado:
    "Comunicado de retorno de afastamento com recebimento de atestado, período abonado, exigência de exame de retorno ao trabalho (NR-7) e eventuais restrições médicas a observar.",
  abandono_emprego:
    "Notificação de ausências injustificadas consecutivas, convocando o colaborador a retornar ou justificar em prazo determinado, sob pena de caracterização de abandono de emprego (art. 482, alínea i, da CLT e Súmula 32 do TST). Tom formal, sem afirmar a demissão como já ocorrida.",
  termo_responsabilidade_epi:
    "Termo de responsabilidade de recebimento, uso, guarda e conservação de EPI/uniforme/ferramentas (NR-6, itens 6.7 e 6.8), com deveres do empregado e previsão de substituição em caso de dano ou extravio.",
  comunicado_feriado:
    "Comunicado de feriado/ponto facultativo, com datas, escala de funcionamento, plantões, compensação e reflexo no ponto e na folha.",
  orientacao_conduta:
    "Orientação de conduta e código de ética, com comportamentos esperados e vedados, política de combate ao assédio e à discriminação, canal de denúncia e consequências disciplinares.",
  comunicado_reuniao_cipa:
    "Convocação para DDS/reunião de CIPA ou treinamento de segurança (NR-1 e NR-5), com data, horário, local, pauta, carga horária e obrigatoriedade de registro de presença.",
  notificacao_falta_grave:
    "Notificação de apuração de falta grave (art. 482 da CLT), narrando os fatos, indicando a alínea potencialmente violada e concedendo prazo para defesa prévia por escrito, sem prejulgamento.",
};

const TOM_INSTRUCOES: Record<string, string> = {
  formal: "Tom formal corporativo, impessoal, claro e objetivo.",
  juridico: "Tom jurídico, com fundamentação legal explícita e linguagem técnica trabalhista.",
  firme: "Tom firme e assertivo, próprio de medida disciplinar, mantendo respeito e urbanidade.",
  cordial: "Tom cordial, positivo e motivacional, preservando a formalidade institucional.",
  tecnico: "Tom técnico de Segurança do Trabalho, com referência a NRs, riscos e medidas de controle.",
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
      titulo = "",
      tom = "formal",
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

    const system = `Você é um Especialista Sênior em Recursos Humanos e Departamento Pessoal (mais de 20 anos de experiência em construção civil/engenharia), com domínio da CLT, das Normas Regulamentadoras (NRs), das Convenções Coletivas da construção civil e das melhores práticas de comunicação corporativa. Você escreve pela empresa "${nomeEmpresa}".

MISSÃO: transformar a ideia curta e informal do gestor em um DOCUMENTO OFICIAL DE RH completo, técnico, juridicamente seguro e pronto para impressão e assinatura.

ESTRUTURA OBRIGATÓRIA (nesta ordem):
1) TÍTULO em CAIXA ALTA.
2) Bloco de identificação: destinatário (nome e cargo), empresa, obra/setor quando informado, e data.
3) Corpo estruturado em itens numerados, tipicamente: 1. OBJETO/FATOS (narrativa objetiva com datas, horários, locais e evidências); 2. FUNDAMENTAÇÃO LEGAL E NORMATIVA (CLT, NRs, Convenção Coletiva, normas internas); 3. ORIENTAÇÕES / PROVIDÊNCIAS E PRAZOS; 4. CONSEQUÊNCIAS OU EFEITOS (disciplinares, contratuais, de folha de pagamento, quando aplicável).
4) Parágrafo de CIÊNCIA E RECEBIMENTO (o colaborador declara ter lido, compreendido e recebido uma via).
5) Linhas de assinatura: empresa (RH/DP ou responsável) e colaborador; incluir testemunhas apenas em documentos disciplinares.

PADRÕES DE ESCRITA:
- Português formal do Brasil, 3ª pessoa institucional, frases claras, sem juridiquês desnecessário e sem floreio.
- Densidade adequada: 4 a 8 parágrafos substanciais. Nunca entregue texto raso de 3 linhas.
- Cite dispositivos legais somente quando pertinentes e corretos (ex.: art. 482 da CLT em disciplina; art. 468 em alteração contratual; NR-6 em EPI). Nunca invente número de artigo ou NR.
- NÃO invente fatos, valores, datas, nomes ou percentuais que não foram informados: use lacunas entre colchetes, ex.: [__/__/____], [R$ ____], [nome da obra].
- Preserve integralmente os fatos informados pelo gestor, corrigindo apenas gramática, ordem lógica e formalidade.
- Neutralidade: em documentos disciplinares, descreva conduta e norma violada, sem adjetivos ofensivos, juízo moral ou prejulgamento.
- Sem markdown, sem asteriscos, sem comentários seus, sem explicações. Retorne SOMENTE o texto final do documento.`;

    const user = `Tipo de documento: ${instrucaoTipo}
Título/assunto a utilizar: ${titulo ? String(titulo).toUpperCase() : "(defina o título técnico mais adequado ao tipo)"}
Tom de escrita: ${TOM_INSTRUCOES[tom] || TOM_INSTRUCOES.formal}
Empresa emitente: ${nomeEmpresa}
${nomeFuncionario ? `Colaborador destinatário: ${nomeFuncionario}` : "Destinatário: comunicado geral, a todos os colaboradores"}
${cargoFuncionario ? `Cargo/função: ${cargoFuncionario}` : ""}
Data do documento: ${dataFmt}

Ideia / contexto informado pelo gestor (linguagem informal):
"""${ideia.trim()}"""

Desenvolva agora o documento oficial completo, técnico e estruturado conforme as regras do sistema.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.5,
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
