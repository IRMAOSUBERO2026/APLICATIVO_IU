/**
 * Motor de Cálculo de Fechamento de Funcionários
 * Módulo puro de cálculo — sem dependência de interface.
 * Suporta: mensal, produção, encargos (FGTS/INSS).
 */

export interface FolhaInput {
  salario_registro: number;
  salario_combinado: number;
  dias_do_mes: number;

  tipo_remuneracao: "mensal" | "producao";
  valor_producao: number;

  horas_extras_semanais: number;
  horas_extras_sabado: number;
  horas_extras_100: number;
  horas_negativas: number;

  faltas: number;
  atestados: number;

  semanas_com_falta: number;
  domingos_feriados_no_mes: number;

  bonificacao_meta: number;
  bonificacao_assiduidade: number;

  desconto_marmita: number;
  qtd_marmitas: number;
  valor_marmita_unitario: number;
  desconto_vale: number;
  desconto_emprestimo: number;
  desconto_adiantamento: number;
  desconto_sindicato: number;
  outros_descontos: number;

  usar_salario_sindicato_para_HE: boolean;
}

export interface FolhaOutput {
  base_dia: number;
  base_hora: number;

  HE_semanal: number;
  HE_sabado: number;
  HE_100: number;
  total_HE: number;

  valor_atestados: number;

  desconto_faltas: number;
  desconto_horas_negativas: number;
  dsr_perdido: number;

  total_bonificacoes: number;
  total_descontos: number;

  valor_producao: number;

  fgts: number;
  inss_empresa: number;
  custo_total_empresa: number;

  salario_final: number;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;

export function calcularFolha(input: FolhaInput): FolhaOutput {
  const {
    salario_registro,
    salario_combinado,
    dias_do_mes,
    tipo_remuneracao,
    valor_producao,
    horas_extras_semanais,
    horas_extras_sabado,
    horas_extras_100,
    horas_negativas,
    faltas,
    atestados,
    semanas_com_falta,
    bonificacao_meta,
    bonificacao_assiduidade,
    desconto_marmita,
    qtd_marmitas,
    valor_marmita_unitario,
    desconto_vale,
    desconto_emprestimo,
    desconto_adiantamento,
    desconto_sindicato,
    outros_descontos,
    usar_salario_sindicato_para_HE,
  } = input;

  const isProducao = tipo_remuneracao === "producao";

  // Para produção, o valor_producao substitui o salário combinado
  const salarioEfetivo = isProducao ? valor_producao : salario_combinado;

  // Salário para cálculo de HE
  const salario_calculo = usar_salario_sindicato_para_HE
    ? salario_registro
    : salario_combinado;

  // Bases
  const base_dia = r2(salarioEfetivo / dias_do_mes);
  const base_hora = r2(salario_calculo / 220);

  // Horas extras — só para mensal
  const HE_semanal = isProducao ? 0 : r2(base_hora * 1.5 * horas_extras_semanais);
  const HE_sabado = isProducao ? 0 : r2(base_hora * 1.5 * horas_extras_sabado);
  const HE_100 = isProducao ? 0 : r2(base_hora * 2 * horas_extras_100);
  const total_HE = r2(HE_semanal + HE_sabado + HE_100);

  // Horas negativas — só para mensal
  const desconto_horas_negativas = isProducao ? 0 : r2(base_hora * horas_negativas);

  // Atestados (pago pelo salário de registro, deduzido do combinado) — só para mensal
  // Dias atestado são pagos pela carteira. Dias restantes são pagos pelo combinado.
  // Assumimos mês comercial de 30 dias para a dedução do atestado
  const valor_atestados = isProducao ? 0 : r2((salario_registro / 30) * atestados);
  const deducao_atestado_combinado = isProducao ? 0 : r2((salarioEfetivo / 30) * atestados);

  // Faltas e DSR — só para mensal
  let desconto_faltas = 0;
  let dsr_perdido = 0;

  // Calculo automático de semanas com falta (DSR) se não for preenchido manualmente
  const semanasFaltaAuto = semanas_com_falta > 0 ? semanas_com_falta : (faltas > 0 ? Math.ceil(faltas / 5) : 0);

  if (!isProducao) {
    desconto_faltas = r2(base_dia * faltas);
    const valor_dsr_dia = r2(salarioEfetivo / dias_do_mes);
    dsr_perdido = r2(valor_dsr_dia * semanasFaltaAuto);
  }

  // Marmita: pode ser valor direto ou qtd × unitário (aplica em ambos)
  const totalMarmita = r2(desconto_marmita > 0 ? desconto_marmita : qtd_marmitas * valor_marmita_unitario);

  // Bonificações — só para mensal (produção não soma proventos)
  const total_bonificacoes = isProducao ? 0 : r2(bonificacao_meta + bonificacao_assiduidade);

  // Descontos
  // Mensal: descontos completos (vale, marmita, faltas, h.neg, DSR, etc.)
  // Produção: apenas descontos administrativos (vale, empréstimo, adiantamento, sindicato, marmita, outros)
  const total_descontos = r2(
    totalMarmita +
    desconto_vale +
    desconto_emprestimo +
    desconto_adiantamento +
    desconto_sindicato +
    outros_descontos +
    desconto_horas_negativas +
    desconto_faltas +
    dsr_perdido +
    deducao_atestado_combinado // <- Removemos do salário combinado os dias de atestado
  );

  // Salário final
  // Mensal: salário combinado + HE + atestados + bonificações - descontos
  // Produção: valor_producao - descontos administrativos
  const salario_final = r2(
    salarioEfetivo +
    total_HE +
    valor_atestados + // <- Somamos o valor do atestado pago pela carteira
    total_bonificacoes -
    total_descontos
  );

  // Encargos sobre salário de registro
  const fgts = r2(salario_registro * 0.08);
  const inss_empresa = r2(salario_registro * 0.20);
  const custo_total_empresa = r2(salario_final + fgts + inss_empresa);

  return {
    base_dia,
    base_hora,
    HE_semanal,
    HE_sabado,
    HE_100,
    total_HE,
    valor_atestados,
    desconto_faltas,
    desconto_horas_negativas,
    dsr_perdido,
    total_bonificacoes,
    total_descontos,
    valor_producao: isProducao ? valor_producao : 0,
    fgts,
    inss_empresa,
    custo_total_empresa,
    salario_final,
  };
}
