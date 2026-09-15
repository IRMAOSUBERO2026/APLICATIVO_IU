import { describe, expect, it } from "vitest";
import { gerarTextoReciboPagamento, lerValorBR, validarTextoReciboIA } from "./reciboPagamento";
import { valorPorExtenso } from "./numeroPorExtenso";

describe("reciboPagamento", () => {
  it("lê valores no formato brasileiro", () => {
    expect(lerValorBR("R$ 1.234,56")).toBe(1234.56);
    expect(lerValorBR("250,00")).toBe(250);
    expect(lerValorBR("0,00")).toBeNull();
  });

  it("escreve algarismos e valor por extenso sem marcadores", () => {
    const texto = gerarTextoReciboPagamento({
      nomeFuncionario: "AMAURI PEDROSO DE RAMOS",
      cargoFuncionario: "Armador I",
      nomeEmpresa: "IRMAOS UBERO ENGENHARIA E EMPREITEIRA DE MAO DE OBRA",
      valor: 1234.56,
      referencia: "adiantamento salarial",
      data: "2026-09-15",
      cidade: "Asunción",
      uf: "PY",
    });

    expect(texto).toContain("R$ 1.234,56 (mil e duzentos e trinta e quatro reais e cinquenta e seis centavos)");
    expect(texto).toContain("adiantamento salarial");
    expect(texto).not.toContain("[VALOR]");
  });

  it("carrega centavos arredondados para o próximo real", () => {
    expect(valorPorExtenso(1.999)).toBe("dois reais");
  });

  it("rejeita revisão por IA que altere ou omita dados financeiros", () => {
    const input = {
      nomeFuncionario: "JOÃO SILVA",
      nomeEmpresa: "EMPRESA TESTE",
      valor: 1250.5,
      referencia: "produção da obra",
      data: "2026-09-15",
    };
    const correto = gerarTextoReciboPagamento(input);
    expect(validarTextoReciboIA(correto, input)).toBe(true);
    expect(validarTextoReciboIA(correto.replace("R$ 1.250,50", "R$ 1.200,00"), input)).toBe(false);
  });
});