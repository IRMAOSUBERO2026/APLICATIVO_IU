/**
 * Usuário responsável pela impressão de relatórios.
 * Como não há autenticação real ainda, persistimos no localStorage.
 * Aparece no rodapé/cabeçalho de TODOS os PDFs do sistema.
 *
 * Exemplos:
 *  - "Luis - Engenheiro Sócio Proprietário"
 *  - "Setor Recursos Humanos"
 */
const LS_NOME = "user.impressao.nome";
const LS_CARGO = "user.impressao.cargo";

export interface UsuarioImpressao {
  nome: string;
  cargo: string;
  /** Linha pronta para exibir: "Nome — Cargo" ou só um deles */
  label: string;
}

export function getUsuarioImpressao(): UsuarioImpressao {
  const nome = (localStorage.getItem(LS_NOME) || "").trim();
  const cargo = (localStorage.getItem(LS_CARGO) || "").trim();
  let label = "";
  if (nome && cargo) label = `${nome} — ${cargo}`;
  else if (nome) label = nome;
  else if (cargo) label = cargo;
  return { nome, cargo, label };
}

export function setUsuarioImpressao(nome: string, cargo: string) {
  localStorage.setItem(LS_NOME, nome.trim());
  localStorage.setItem(LS_CARGO, cargo.trim());
  // Notifica componentes interessados
  window.dispatchEvent(new Event("usuario-impressao-changed"));
}

/** Linha de rodapé: "Impresso por: ... em dd/mm/aaaa hh:mm" */
export function getLinhaImpressao(): string {
  const u = getUsuarioImpressao();
  const agora = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const por = u.label || "Usuário não identificado";
  return `Impresso por: ${por}  •  ${agora}`;
}

export const NOME_EMPRESA_OFICIAL = "IRMÃOS UBERO ENGENHARIA";
