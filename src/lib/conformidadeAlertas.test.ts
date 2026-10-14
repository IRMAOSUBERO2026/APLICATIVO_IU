import { describe, expect, it } from "vitest";
import { calcularAlertasConformidade, estaEmExperiencia } from "./conformidadeAlertas";

describe("conformidadeAlertas", () => {
  const hoje = new Date("2026-10-14T12:00:00");

  it("respeita as validades de ASO e NRs", () => {
    const alertas = calcularAlertasConformidade([{
      id: "f1", nome: "João", data_admissao: "2020-01-01",
      data_aso: "2025-10-10", data_nr6: "2025-11-01",
      data_nr12: "2024-10-20", data_nr18: "2024-12-31", data_nr35: "2024-01-01",
    }], [], hoje);
    expect(alertas.find((a) => a.id === "data_aso-f1")?.faixa).toBe("vencido");
    expect(alertas.find((a) => a.id === "data_nr6-f1")?.faixa).toBe("30_dias");
    expect(alertas.find((a) => a.id === "data_nr12-f1")?.faixa).toBe("7_dias");
    expect(alertas.find((a) => a.id === "data_nr18-f1")).toBeUndefined();
    expect(alertas.find((a) => a.id === "data_nr35-f1")?.faixa).toBe("vencido");
  });

  it("sinaliza documentos ausentes", () => {
    const alertas = calcularAlertasConformidade([{ id: "f2", nome: "Maria" }], [], hoje);
    expect(alertas.filter((a) => a.faixa === "sem_documento")).toHaveLength(5);
  });

  it("trata datas impossíveis como pendência de cadastro", () => {
    const alertas = calcularAlertasConformidade([{ id: "f5", nome: "José", data_aso: "0228-01-01" }], [], hoje);
    expect(alertas.find((a) => a.id === "data_aso-f5")).toMatchObject({ faixa: "sem_documento", titulo: "ASO com data inválida" });
  });

  it("alerta os marcos de experiência de 30 e 90 dias", () => {
    const alertas = calcularAlertasConformidade([
      { id: "f3", nome: "Ana", data_admissao: "2026-09-20", data_aso: "2026-09-20", data_nr6: "2026-09-20", data_nr12: "2026-09-20", data_nr18: "2026-09-20", data_nr35: "2026-09-20" },
      { id: "f4", nome: "Carlos", data_admissao: "2026-07-25", data_aso: "2026-07-25", data_nr6: "2026-07-25", data_nr12: "2026-07-25", data_nr18: "2026-07-25", data_nr35: "2026-07-25" },
    ], [], hoje);
    expect(alertas.some((a) => a.id === "experiencia-30-f3")).toBe(true);
    expect(alertas.some((a) => a.id === "experiencia-90-f4")).toBe(true);
  });

  it("alerta contrato com fim nos próximos 30 dias", () => {
    const alertas = calcularAlertasConformidade([], [{ id: "c1", descricao: "Casa da equipe", data_fim: "2026-10-30" }], hoje);
    expect(alertas[0]).toMatchObject({ categoria: "contrato", faixa: "30_dias", diasRestantes: 16 });
  });

  it("identifica experiência somente até 90 dias", () => {
    expect(estaEmExperiencia("2026-09-20", hoje)).toBe(true);
    expect(estaEmExperiencia("2026-01-01", hoje)).toBe(false);
  });
});