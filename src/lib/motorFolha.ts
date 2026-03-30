/**
 * Motor de Cálculo de Fechamento de Funcionários
 * Módulo puro de cálculo — sem dependência de interface.
 */

export interface FolhaInput {
  salario_registro: number;
  salario_combinado: number;
  dias_do_mes: number;

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
  desconto_vale: number;
  desconto_emprestimo: number;
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

  salario_final: number;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;

export function calcularFolha(input: FolhaInput): FolhaOutput {
  const {
    salario_registro,
    salario_combinado,
    dias_do_mes,
    horas_extras_semanais,
    horas_extras_sabado,
    horas_extras_100,
    horas_negativas,
    faltas,
    atestados,
    semanas_com_falta,
    domingos_feriados_no_mes,
    bonificacao_meta,
    bonificacao_assiduidade,
    desconto_marmita,
    desconto_vale,
    desconto_emprestimo,
    outros_descontos,
    usar_salario_sindicato_para_HE,
  } = input;

  // 2. Salário para cálculo de HE
  const salario_calculo = usar_salario_sindicato_para_HE
    ? salario_registro
    : salario_combinado;

  // 3. Bases
  const base_dia = r2(salario_combinado / dias_do_mes);
  const base_hora = r2(salario_calculo / 200);

  // 4. Horas extras
  const HE_semanal = r2(base_hora * 1.5 * horas_extras_semanais);
  const HE_sabado = r2(base_hora * 1.5 * horas_extras_sabado);
  const HE_100 = r2(base_hora * 2 * horas_extras_100);

  // 5. Total HE
  const total_HE = r2(HE_semanal + HE_sabado + HE_100);

  // 6. DSR sobre HE
  const dias_uteis = dias_do_mes - domingos_feriados_no_mes;
  const DSR_HE = dias_uteis > 0
    ? r2((total_HE / dias_uteis) * domingos_feriados_no_mes)
    : 0;

  // 7. Horas negativas
  const desconto_horas_negativas = r2(base_hora * horas_negativas);

  // 8. Atestados (pago pelo salário de registro)
  const valor_atestados = r2((salario_registro / dias_do_mes) * atestados);

  // 9. Faltas
  const desconto_faltas = r2(base_dia * faltas);

  // 10. DSR perdido por falta
  const valor_dsr_dia = r2(salario_combinado / dias_do_mes);
  const dsr_perdido = r2(valor_dsr_dia * semanas_com_falta);

  // 11. Bonificações
  const total_bonificacoes = r2(bonificacao_meta + bonificacao_assiduidade);

  // 12. Descontos
  const total_descontos = r2(
    desconto_marmita +
    desconto_vale +
    desconto_emprestimo +
    outros_descontos +
    desconto_horas_negativas +
    desconto_faltas +
    dsr_perdido
  );

  // 13. Salário final
  const salario_final = r2(
    salario_combinado +
    total_HE +
    DSR_HE +
    valor_atestados +
    total_bonificacoes -
    total_descontos
  );

  return {
    base_dia,
    base_hora,
    HE_semanal,
    HE_sabado,
    HE_100,
    total_HE,
    DSR_HE,
    valor_atestados,
    desconto_faltas,
    desconto_horas_negativas,
    dsr_perdido,
    total_bonificacoes,
    total_descontos,
    salario_final,
  };
}
