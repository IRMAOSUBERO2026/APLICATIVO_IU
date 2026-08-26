/**
 * Motor de permissões do Portal / ERP.
 *
 * Cada módulo do sistema tem uma chave. As permissões liberadas para cada
 * colaborador ficam gravadas em portal_credentials.permissoes (jsonb: string[]).
 * O perfil "admin" tem acesso total e ignora a lista.
 */

export type ModuloKey = string;

export interface ModuloDef {
  key: ModuloKey;
  label: string;
  grupo: string;
  /** Rotas cobertas por este módulo (prefixos). */
  paths: string[];
}

export const MODULOS: ModuloDef[] = [
  // Principal
  { key: "dashboard", label: "Dashboard", grupo: "Principal", paths: ["/"] },
  { key: "relatorios", label: "Relatórios", grupo: "Principal", paths: ["/relatorios"] },

  // Obras
  { key: "obras", label: "Obras", grupo: "Obras", paths: ["/obras", "/custos-obra"] },
  { key: "diario_obra", label: "Diário de Obra", grupo: "Obras", paths: ["/diario-obra", "/diario-obra-mobile"] },
  { key: "medicoes", label: "Medições", grupo: "Obras", paths: ["/medicoes"] },
  { key: "orcamentos", label: "Orçamentos", grupo: "Obras", paths: ["/orcamento"] },

  // Segurança / EPI
  { key: "entrega_epi", label: "Entrega de EPI", grupo: "Segurança", paths: ["/entrega-epi", "/entrega-epi-mobile"] },
  { key: "seguranca", label: "Segurança e NRs", grupo: "Segurança", paths: ["/rh/seguranca", "/seguranca-trabalho"] },

  // RH
  { key: "rh", label: "RH / DP", grupo: "RH & Pessoal", paths: ["/rh", "/area-funcionario"] },
  { key: "salarios_base", label: "Salário-Base por Função", grupo: "RH & Pessoal", paths: ["/rh/salarios-base"] },
  { key: "folha", label: "Folha Salarial", grupo: "RH & Pessoal", paths: ["/folha"] },
  { key: "ferias", label: "Férias", grupo: "RH & Pessoal", paths: ["/ferias"] },
  { key: "ponto", label: "Ponto (importação e apuração)", grupo: "RH & Pessoal", paths: ["/ponto", "/ponto-afd", "/ponto-consolidado"] },
  { key: "documentacao_mensal", label: "Documentação Mensal", grupo: "RH & Pessoal", paths: ["/documentacao-mensal"] },

  // Operacional
  { key: "compras", label: "Compras", grupo: "Operacional", paths: ["/compras"] },
  { key: "estoque", label: "Estoque", grupo: "Operacional", paths: ["/estoque"] },
  { key: "equipamentos", label: "Equipamentos", grupo: "Operacional", paths: ["/equipamentos-proprios", "/equipamentos-locados", "/contratos-locacao"] },

  // Financeiro
  { key: "financeiro", label: "Financeiro", grupo: "Financeiro", paths: ["/financeiro"] },
  { key: "clientes", label: "Clientes", grupo: "Financeiro", paths: ["/clientes"] },
  { key: "fornecedores", label: "Fornecedores", grupo: "Financeiro", paths: ["/fornecedores"] },

  // Administrativo
  { key: "empresas", label: "Empresas", grupo: "Administrativo", paths: ["/empresas"] },
  { key: "comunicacoes", label: "Comunicações", grupo: "Administrativo", paths: ["/comunicacoes"] },
  { key: "solicitacoes", label: "Solicitações", grupo: "Administrativo", paths: ["/solicitacoes"] },
  { key: "assinaturas", label: "Assinaturas Digitais", grupo: "Administrativo", paths: ["/assinaturas", "/config-documentos"] },
  { key: "acesso", label: "Controle de Acesso", grupo: "Administrativo", paths: ["/acesso"] },
];

export const GRUPOS = Array.from(new Set(MODULOS.map((m) => m.grupo)));

/** Presets rápidos de perfis operacionais. */
export const PRESETS: { nome: string; descricao: string; permissoes: ModuloKey[] }[] = [
  {
    nome: "Somente Portal",
    descricao: "Acesso apenas às páginas pessoais do Portal do Colaborador.",
    permissoes: [],
  },
  {
    nome: "Campo (Diário + EPI)",
    descricao: "Lança diário de obra e registra entrega de EPI.",
    permissoes: ["diario_obra", "entrega_epi"],
  },
  {
    nome: "Encarregado",
    descricao: "Diário, EPI, obras e estoque.",
    permissoes: ["diario_obra", "entrega_epi", "obras", "estoque", "dashboard"],
  },
  {
    nome: "RH / DP",
    descricao: "Pessoal, ponto, folha e documentação.",
    permissoes: ["dashboard", "rh", "folha", "ferias", "ponto", "documentacao_mensal", "seguranca", "entrega_epi", "comunicacoes", "relatorios"],
  },
  {
    nome: "Gestor de Obras",
    descricao: "Obras, medições, orçamentos, compras e equipamentos.",
    permissoes: ["dashboard", "obras", "diario_obra", "medicoes", "orcamentos", "compras", "estoque", "equipamentos", "entrega_epi", "relatorios"],
  },
];

/** Normaliza o valor gravado no banco para string[]. */
export function parsePermissoes(valor: unknown): ModuloKey[] {
  if (Array.isArray(valor)) return valor.filter((v): v is string => typeof v === "string");
  if (typeof valor === "string") {
    try {
      const p = JSON.parse(valor);
      return Array.isArray(p) ? p.filter((v: unknown): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizar(path: string) {
  const limpo = path.split("?")[0].replace(/\/+$/, "");
  return limpo === "" ? "/" : limpo;
}

/** Retorna o módulo que cobre a rota informada (o match mais específico). */
export function moduloDaRota(path: string): ModuloDef | null {
  const p = normalizar(path);
  let melhor: { mod: ModuloDef; len: number } | null = null;
  for (const mod of MODULOS) {
    for (const raw of mod.paths) {
      const base = normalizar(raw);
      const casa = base === "/" ? p === "/" : p === base || p.startsWith(base + "/");
      if (casa && (!melhor || base.length > melhor.len)) melhor = { mod, len: base.length };
    }
  }
  return melhor?.mod ?? null;
}

/** Verifica se as permissões liberadas dão acesso à rota. */
export function podeAcessarRota(
  path: string,
  perfil: string,
  permissoes: ModuloKey[]
): boolean {
  if (perfil === "admin") return true;
  const mod = moduloDaRota(path);
  if (!mod) return false;
  return permissoes.includes(mod.key);
}

/** Primeira rota disponível para o usuário (destino após login). */
export function rotaInicial(perfil: string, permissoes: ModuloKey[]): string {
  if (perfil === "admin") return "/";
  for (const mod of MODULOS) {
    if (permissoes.includes(mod.key)) {
      if (mod.key === "diario_obra") return "/diario-obra-mobile";
      return mod.paths[0];
    }
  }
  return "/portal";
}
