export type CategoriaConformidade = "aso" | "nr" | "experiencia" | "contrato";
export type FaixaConformidade = "vencido" | "7_dias" | "15_dias" | "30_dias" | "sem_documento";

export interface FuncionarioConformidade {
  id: string;
  nome: string;
  empresa_id?: string | null;
  obra_id?: string | null;
  data_admissao?: string | null;
  data_aso?: string | null;
  data_nr6?: string | null;
  data_nr12?: string | null;
  data_nr18?: string | null;
  data_nr35?: string | null;
}

export interface ContratoConformidade {
  id: string;
  descricao: string;
  data_fim?: string | null;
}

export interface AlertaConformidade {
  id: string;
  categoria: CategoriaConformidade;
  faixa: FaixaConformidade;
  titulo: string;
  descricao: string;
  diasRestantes: number | null;
  dataVencimento: string | null;
  link: string;
}

const DIA_MS = 86_400_000;

function dataLocal(valor: string): Date | null {
  const data = new Date(`${valor.slice(0, 10)}T12:00:00`);
  const ano = data.getFullYear();
  if (Number.isNaN(data.getTime()) || ano < 1900 || ano > 2100) return null;
  return data;
}

function inicioDia(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(12, 0, 0, 0);
  return copia;
}

function somarAnos(data: Date, anos: number): Date {
  const copia = new Date(data);
  copia.setFullYear(copia.getFullYear() + anos);
  return copia;
}

function somarDias(data: Date, dias: number): Date {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function isoData(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function diferencaDias(data: Date, hoje: Date): number {
  return Math.round((inicioDia(data).getTime() - inicioDia(hoje).getTime()) / DIA_MS);
}

function faixaPorDias(dias: number): FaixaConformidade | null {
  if (dias < 0) return "vencido";
  if (dias <= 7) return "7_dias";
  if (dias <= 15) return "15_dias";
  if (dias <= 30) return "30_dias";
  return null;
}

function descricaoPrazo(dias: number): string {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} dia(s)`;
}

const DOCUMENTOS = [
  { campo: "data_aso", nome: "ASO", anos: 1, categoria: "aso" as const },
  { campo: "data_nr6", nome: "NR-6", anos: 1, categoria: "nr" as const },
  { campo: "data_nr12", nome: "NR-12", anos: 2, categoria: "nr" as const },
  { campo: "data_nr18", nome: "NR-18", anos: 2, categoria: "nr" as const },
  { campo: "data_nr35", nome: "NR-35", anos: 2, categoria: "nr" as const },
] as const;

export function calcularAlertasConformidade(
  funcionarios: FuncionarioConformidade[],
  contratos: ContratoConformidade[],
  referencia = new Date(),
): AlertaConformidade[] {
  const alertas: AlertaConformidade[] = [];

  funcionarios.forEach((funcionario) => {
    DOCUMENTOS.forEach((documento) => {
      const realizacao = funcionario[documento.campo];
      const dataRealizacao = realizacao ? dataLocal(realizacao) : null;
      if (!dataRealizacao) {
        alertas.push({
          id: `${documento.campo}-${funcionario.id}`,
          categoria: documento.categoria,
          faixa: "sem_documento",
          titulo: `${documento.nome} ${realizacao ? "com data inválida" : "não informado"}`,
          descricao: `${funcionario.nome} • Corrigir no cadastro`,
          diasRestantes: null,
          dataVencimento: null,
          link: `/rh/seguranca/funcionario/${funcionario.id}`,
        });
        return;
      }

      const vencimento = somarAnos(dataRealizacao, documento.anos);
      const dias = diferencaDias(vencimento, referencia);
      const faixa = faixaPorDias(dias);
      if (!faixa) return;
      alertas.push({
        id: `${documento.campo}-${funcionario.id}`,
        categoria: documento.categoria,
        faixa,
        titulo: `${documento.nome} — ${funcionario.nome}`,
        descricao: descricaoPrazo(dias),
        diasRestantes: dias,
        dataVencimento: isoData(vencimento),
        link: `/rh/seguranca/funcionario/${funcionario.id}`,
      });
    });

    if (funcionario.data_admissao) {
      const admissao = dataLocal(funcionario.data_admissao);
      if (!admissao) return;
      const diasDeCasa = -diferencaDias(admissao, referencia);
      const marco = diasDeCasa <= 30 ? 30 : diasDeCasa <= 90 ? 90 : null;
      if (marco) {
        const fimPeriodo = somarDias(admissao, marco);
        const dias = diferencaDias(fimPeriodo, referencia);
        if (dias <= 15) {
          alertas.push({
            id: `experiencia-${marco}-${funcionario.id}`,
            categoria: "experiencia",
            faixa: faixaPorDias(dias) ?? "15_dias",
            titulo: `${marco === 30 ? "1º" : "2º"} período — ${funcionario.nome}`,
            descricao: `${descricaoPrazo(dias)} • ${marco === 30 ? "30 dias" : "30 + 60 dias"}`,
            diasRestantes: dias,
            dataVencimento: isoData(fimPeriodo),
            link: "/rh?filtro=experiencia",
          });
        }
      }
    }
  });

  contratos.forEach((contrato) => {
    if (!contrato.data_fim) return;
    const fim = dataLocal(contrato.data_fim);
    if (!fim) return;
    const dias = diferencaDias(fim, referencia);
    const faixa = faixaPorDias(dias);
    if (!faixa) return;
    alertas.push({
      id: `contrato-${contrato.id}`,
      categoria: "contrato",
      faixa,
      titulo: contrato.descricao,
      descricao: `Contrato de locação • ${descricaoPrazo(dias)}`,
      diasRestantes: dias,
      dataVencimento: isoData(fim),
      link: "/contratos-locacao",
    });
  });

  const prioridade: Record<FaixaConformidade, number> = {
    vencido: 0,
    sem_documento: 1,
    "7_dias": 2,
    "15_dias": 3,
    "30_dias": 4,
  };

  return alertas.sort((a, b) => {
    const porFaixa = prioridade[a.faixa] - prioridade[b.faixa];
    if (porFaixa !== 0) return porFaixa;
    return (a.diasRestantes ?? -1) - (b.diasRestantes ?? -1);
  });
}

export function estaEmExperiencia(dataAdmissao?: string | null, referencia = new Date()): boolean {
  if (!dataAdmissao) return false;
  const admissao = dataLocal(dataAdmissao);
  if (!admissao) return false;
  const dias = -diferencaDias(admissao, referencia);
  return dias >= 0 && dias <= 90;
}