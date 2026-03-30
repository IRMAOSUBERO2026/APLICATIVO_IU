import { describe, it, expect } from "vitest";
import { calcularFolha, FolhaInput } from "./motorFolha";

const baseInput: FolhaInput = {
  salario_registro: 2500,
  salario_combinado: 3200,
  dias_do_mes: 30,
  horas_extras_semanais: 0,
  horas_extras_sabado: 0,
  horas_extras_100: 0,
  horas_negativas: 0,
  faltas: 0,
  atestados: 0,
  semanas_com_falta: 0,
  domingos_feriados_no_mes: 5,
  bonificacao_meta: 0,
  bonificacao_assiduidade: 0,
  desconto_marmita: 0,
  desconto_vale: 0,
  desconto_emprestimo: 0,
  outros_descontos: 0,
  usar_salario_sindicato_para_HE: true,
};

describe("motorFolha", () => {
  it("sem extras retorna salário combinado", () => {
    const r = calcularFolha(baseInput);
    expect(r.salario_final).toBe(3200);
    expect(r.total_HE).toBe(0);
    expect(r.total_descontos).toBe(0);
  });

  it("calcula HE semanais com salário sindicato (base /220)", () => {
    const r = calcularFolha({ ...baseInput, horas_extras_semanais: 10 });
    // base_hora = 2500/220 = 11.36
    expect(r.base_hora).toBe(11.36);
    // HE_semanal = 11.36 * 1.5 * 10 = 170.40
    expect(r.HE_semanal).toBe(170.4);
    expect(r.total_HE).toBe(170.4);
    // Sem DSR_HE
    expect(r.salario_final).toBe(3200 + 170.4);
  });

  it("calcula HE com salário combinado (base /220)", () => {
    const r = calcularFolha({
      ...baseInput,
      usar_salario_sindicato_para_HE: false,
      horas_extras_semanais: 10,
    });
    // base_hora = 3200/220 = 14.55
    expect(r.base_hora).toBe(14.55);
    // HE_semanal = 14.55 * 1.5 * 10 = 218.25
    expect(r.HE_semanal).toBe(218.25);
  });

  it("desconta faltas e DSR perdido", () => {
    const r = calcularFolha({ ...baseInput, faltas: 2, semanas_com_falta: 2 });
    // base_dia = 3200/30 = 106.67
    expect(r.base_dia).toBe(106.67);
    expect(r.desconto_faltas).toBe(213.34); // 106.67 * 2
    expect(r.dsr_perdido).toBe(213.34); // 106.67 * 2
    expect(r.salario_final).toBe(2773.32);
  });

  it("calcula atestados pelo salário de registro", () => {
    const r = calcularFolha({ ...baseInput, atestados: 3 });
    // 2500/30 * 3 = 250
    expect(r.valor_atestados).toBe(250);
    expect(r.salario_final).toBe(3200 + 250);
  });

  it("calcula HE 100%", () => {
    const r = calcularFolha({ ...baseInput, horas_extras_100: 8 });
    // 11.36 * 2 * 8 = 181.76
    expect(r.HE_100).toBe(181.76);
  });

  it("funciona com todos os valores zerados", () => {
    const r = calcularFolha({
      ...baseInput,
      salario_registro: 0,
      salario_combinado: 0,
    });
    expect(r.salario_final).toBe(0);
  });

  it("funciona para meses de 28 dias", () => {
    const r = calcularFolha({ ...baseInput, dias_do_mes: 28 });
    expect(r.base_dia).toBe(114.29); // 3200/28
    expect(r.salario_final).toBe(3200);
  });

  it("aplica bonificações e descontos", () => {
    const r = calcularFolha({
      ...baseInput,
      bonificacao_meta: 500,
      bonificacao_assiduidade: 200,
      desconto_marmita: 300,
      desconto_vale: 150,
      desconto_emprestimo: 100,
    });
    expect(r.total_bonificacoes).toBe(700);
    expect(r.total_descontos).toBe(550);
    expect(r.salario_final).toBe(3200 + 700 - 550);
  });
});
