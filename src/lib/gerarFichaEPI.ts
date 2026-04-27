import { supabase } from "@/integrations/supabase/client";

/**
 * Gera/atualiza uma Ficha de EPI (NR-6) e cria solicitação de assinatura digital.
 * A ficha consolida TODO o histórico de entregas do funcionário + dados da empresa
 * + termo de responsabilidade NR-6.
 */
export async function gerarFichaEPIEEnviarAssinatura(funcionarioId: string, empresaId: string) {
  // 1. Buscar dados completos do funcionário
  const { data: func, error: funcErr } = await supabase
    .from("funcionarios")
    .select("id, nome, cpf, rg, cargo, data_admissao, foto_url")
    .eq("id", funcionarioId)
    .single();
  if (funcErr || !func) throw new Error("Funcionário não encontrado");

  // 2. Buscar dados completos da empresa
  const { data: empresa, error: empErr } = await supabase
    .from("empresas")
    .select("id, razao_social, nome_fantasia, cnpj, endereco, cidade, uf, cep, telefone, email, logo_url")
    .eq("id", empresaId)
    .single();
  if (empErr || !empresa) throw new Error("Empresa não encontrada");

  // 3. Buscar histórico completo de entregas de EPI do funcionário
  const { data: entregas, error: entrErr } = await supabase
    .from("entregas_epi")
    .select("id, data_entrega, quantidade, ca_numero, motivo, observacoes, produto_id, obra_id")
    .eq("funcionario_id", funcionarioId)
    .order("data_entrega", { ascending: true });
  if (entrErr) throw entrErr;

  // 4. Resolver nomes de produtos e obras
  const produtoIds = [...new Set((entregas || []).map(e => e.produto_id))];
  const obraIds = [...new Set((entregas || []).map(e => e.obra_id).filter(Boolean) as string[])];

  const [prodRes, obraRes] = await Promise.all([
    produtoIds.length
      ? supabase.from("produtos").select("id, descricao, ca_numero").in("id", produtoIds)
      : Promise.resolve({ data: [] as any[] }),
    obraIds.length
      ? supabase.from("obras").select("id, codigo, nome").in("id", obraIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const prodMap = new Map((prodRes.data || []).map((p: any) => [p.id, p]));
  const obraMap = new Map((obraRes.data || []).map((o: any) => [o.id, o]));

  // 5. Montar payload estruturado da ficha
  const itens = (entregas || []).map(e => {
    const prod = prodMap.get(e.produto_id);
    const obra = e.obra_id ? obraMap.get(e.obra_id) : null;
    return {
      entrega_id: e.id,
      data: e.data_entrega,
      nome: prod?.descricao || "EPI",
      qtd: Number(e.quantidade),
      ca_numero: e.ca_numero || prod?.ca_numero || "",
      observacoes: e.observacoes || e.motivo || "Primeira entrega",
      obra: obra ? `${obra.codigo} - ${obra.nome}` : "",
    };
  });

  const payload = {
    versao: "NR-6/2024",
    empresa: {
      razao_social: empresa.razao_social,
      nome_fantasia: empresa.nome_fantasia,
      cnpj: empresa.cnpj,
      endereco: empresa.endereco,
      cidade: empresa.cidade,
      uf: empresa.uf,
      cep: empresa.cep,
      telefone: empresa.telefone,
      email: empresa.email,
      logo_url: empresa.logo_url,
    },
    funcionario: {
      nome: func.nome,
      cpf: func.cpf,
      rg: func.rg,
      cargo: func.cargo,
      data_admissao: func.data_admissao,
      foto_url: func.foto_url,
    },
    itens,
    termo: [
      "Declaro ter recebido da empresa, gratuitamente, os Equipamentos de Proteção Individual (EPIs) acima discriminados, em perfeitas condições de uso, comprometendo-me a:",
      "1. Usar os EPIs apenas para a finalidade a que se destinam, durante toda a jornada de trabalho.",
      "2. Responsabilizar-me pela guarda e conservação dos EPIs recebidos.",
      "3. Comunicar ao empregador qualquer alteração que torne os EPIs impróprios para o uso.",
      "4. Cumprir as determinações do empregador sobre o uso adequado dos EPIs.",
      "5. Devolver os EPIs ao empregador quando do desligamento da empresa, da troca por novos ou em caso de transferência.",
      "Estou ciente de que o não cumprimento das obrigações acima constitui ato faltoso, conforme art. 158 da CLT e NR-6 do MTE.",
    ],
    geradaEm: new Date().toISOString(),
  };

  // 6. Gerar token único de acesso (7 dias de validade)
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const expiracao = new Date();
  expiracao.setDate(expiracao.getDate() + 7);

  const titulo = `Ficha de EPI - ${func.nome}`;
  const descricao = `Ficha consolidada de Entrega de EPI conforme NR-6 — ${itens.length} item(ns) registrado(s)`;

  const { data: assinatura, error: assErr } = await supabase
    .from("assinaturas_digitais")
    .insert({
      empresa_id: empresaId,
      funcionario_id: funcionarioId,
      documento_tipo: "ficha_epi",
      documento_titulo: titulo,
      documento_descricao: descricao,
      documento_dados: payload as any,
      token_acesso: token,
      token_expiracao: expiracao.toISOString(),
      solicitado_por: "Sistema (Entrega EPI)",
      status: "pendente",
    })
    .select("id, token_acesso")
    .single();

  if (assErr || !assinatura) throw assErr || new Error("Erro ao criar solicitação");

  const url = `${window.location.origin}/assinatura?token=${assinatura.token_acesso}`;
  return { id: assinatura.id, token: assinatura.token_acesso, url, totalItens: itens.length };
}
