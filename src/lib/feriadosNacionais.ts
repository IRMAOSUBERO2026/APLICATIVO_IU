/**
 * Feriados Nacionais Brasileiros
 * Calcula feriados fixos e móveis (baseados na Páscoa) para qualquer ano
 */

export interface Feriado {
  dia: number;
  mes: number; // 0-11
  nome: string;
}

/**
 * Calcula a data da Páscoa pelo algoritmo de Meeus/Jones/Butcher
 */
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Retorna todos os feriados nacionais para um determinado ano
 */
export function getFeriadosNacionais(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano);
  const sextaSanta = addDays(pascoa, -2);
  const carnavalTerca = addDays(pascoa, -47); // Terça de Carnaval
  const carnavalSegunda = addDays(pascoa, -48); // Segunda de Carnaval (ponto facultativo, mas tratado como feriado)
  const corpusChristi = addDays(pascoa, 60);

  return [
    // Fixos
    { dia: 1, mes: 0, nome: "Confraternização Universal" },
    { dia: 21, mes: 3, nome: "Tiradentes" },
    { dia: 1, mes: 4, nome: "Dia do Trabalho" },
    { dia: 7, mes: 8, nome: "Independência do Brasil" },
    { dia: 12, mes: 9, nome: "Nossa Senhora Aparecida" },
    { dia: 2, mes: 10, nome: "Finados" },
    { dia: 15, mes: 10, nome: "Proclamação da República" },
    { dia: 20, mes: 10, nome: "Consciência Negra" },
    { dia: 25, mes: 11, nome: "Natal" },
    // Móveis
    { dia: carnavalSegunda.getDate(), mes: carnavalSegunda.getMonth(), nome: "Carnaval (Segunda)" },
    { dia: carnavalTerca.getDate(), mes: carnavalTerca.getMonth(), nome: "Carnaval (Terça)" },
    { dia: sextaSanta.getDate(), mes: sextaSanta.getMonth(), nome: "Sexta-feira Santa" },
    { dia: corpusChristi.getDate(), mes: corpusChristi.getMonth(), nome: "Corpus Christi" },
  ];
}

/**
 * Verifica se um dia específico (mes 0-11) é feriado nacional
 */
export function isFeriadoNacional(ano: number, mes: number, dia: number): Feriado | null {
  const feriados = getFeriadosNacionais(ano);
  return feriados.find(f => f.mes === mes && f.dia === dia) || null;
}
