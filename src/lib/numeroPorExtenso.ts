// Conversão de número para extenso em português (BRL)
const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(centenas[c]);
  if (r < 20) {
    if (r) partes.push(unidades[r]);
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    let s = dezenas[d];
    if (u) s += " e " + unidades[u];
    partes.push(s);
  }
  return partes.join(" e ");
}

function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(`${milhoes === 1 ? "um milhão" : ate999(milhoes) + " milhões"}`);
  if (milhares) partes.push(`${milhares === 1 ? "mil" : ate999(milhares) + " mil"}`);
  if (resto) partes.push(ate999(resto));
  return partes.join(" e ");
}

export function valorPorExtenso(valor: number): string {
  const inteira = Math.floor(valor);
  const cents = Math.round((valor - inteira) * 100);
  const reais = inteiroExtenso(inteira);
  const sufReais = inteira === 1 ? "real" : "reais";
  if (cents === 0) return `${reais} ${sufReais}`;
  const centsStr = inteiroExtenso(cents);
  const sufCents = cents === 1 ? "centavo" : "centavos";
  return `${reais} ${sufReais} e ${centsStr} ${sufCents}`;
}
