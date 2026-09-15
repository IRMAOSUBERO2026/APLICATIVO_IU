import { valorPorExtenso } from "./numeroPorExtenso";

export interface TextoReciboInput {
  nomeFuncionario: string;
  cargoFuncionario?: string | null;
  nomeEmpresa: string;
  valor: number;
  referencia: string;
  data: string;
  cidade?: string | null;
  uf?: string | null;
}

export function lerValorBR(valor: string): number | null {
  const limpo = valor.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!limpo) return null;

  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const numero = Number(normalizado);

  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) / 100 : null;
}

export function formatarValorBR(valor: number): string {
  return valor
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/\u00a0/g, " ");
}

export function gerarTextoReciboPagamento(input: TextoReciboInput): string {
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${input.data}T12:00:00Z`),
  );
  const local = [input.cidade, input.uf].filter(Boolean).join("/") || "________________";
  const cargo = input.cargoFuncionario || "não informada";
  const referencia = input.referencia.trim() || "pagamento realizado pela empresa";

  return `RECIBO DE PAGAMENTO

Eu, ${input.nomeFuncionario}, exercendo a função de ${cargo}, declaro para os devidos fins de direito que recebi da empresa ${input.nomeEmpresa} a importância de ${formatarValorBR(input.valor)} (${valorPorExtenso(input.valor)}), referente a:

${referencia}

Para maior clareza, afirmo a veracidade e assino o presente recibo, dando ao pagador acima qualificado plena, geral e irrevogável quitação acerca do valor recebido, referente ao período e objeto discriminados, nada mais tendo a reclamar a qualquer título.

Local e data: ${local}, ${dataExtenso}

______________________________________________
${input.nomeFuncionario}
Recebedor`;
}

/** Garante que uma revisão por IA preservou os dados financeiros imutáveis. */
export function validarTextoReciboIA(texto: string, input: TextoReciboInput): boolean {
  if (!texto.trim()) return false;
  const valorFormatado = formatarValorBR(input.valor);
  const valorExtenso = valorPorExtenso(input.valor);
  return texto.includes(input.nomeFuncionario)
    && texto.includes(input.nomeEmpresa)
    && texto.includes(valorFormatado)
    && texto.toLocaleLowerCase("pt-BR").includes(valorExtenso.toLocaleLowerCase("pt-BR"));
}