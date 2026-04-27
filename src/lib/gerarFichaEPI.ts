import { supabase } from "@/integrations/supabase/client";

/**
 * Gera/atualiza uma Ficha de EPI (NR-6) e cria solicitação de assinatura digital.
 */
export async function gerarFichaEPIEEnviarAssinatura(funcionarioId: string, empresaId: string) {
  // 1. Buscar dados fundamentais
  const { data: func } = await supabase.from("funcionarios").select("*").eq("id", funcionarioId).single();
  const { data: empresa } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
  
  if (!func || !empresa) throw new Error("Dados não encontrados");

  // 2. Buscar Entregas usando a consulta PADRÃO consistente
  const { data: entregas, error: entrErr } = await supabase
    .from("entregas_epi")
    .select("*, produtos(descricao, ca_numero), obras(codigo, nome)")
    .eq("funcionario_id", funcionarioId)
    .order("data_entrega", { ascending: true });

  if (entrErr) throw entrErr;

  // 3. Montar payload estruturado da ficha
  const itens = (entregas || []).map((e: any) => ({
    entrega_id: e.id,
    data: e.data_entrega,
    nome: e.produtos?.descricao || "Equipamento não identificado",
    qtd: Number(e.quantidade),
    ca_numero: e.ca_numero || e.produtos?.ca_numero || "",
    observacoes: e.observacoes || "Entrega registrada",
    obra: e.obras ? `${e.obras.codigo} - ${e.obras.nome}` : "",
  }));

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

  // 4. Gerar token único de acesso
  const generateToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let t = '';
    for (let i = 0; i < 48; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
    return t;
  };
  const token = generateToken();
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
