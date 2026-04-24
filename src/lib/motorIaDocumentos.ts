export type TipoDocumentoOficial =
  | "advertencia"
  | "suspensao"
  | "comunicado"
  | "recibo"
  | "justificativa_falta";

interface RequisicaoDocumento {
  tipo: TipoDocumentoOficial;
  nomeFuncionario: string;
  cargoFuncionario: string;
  nomeEmpresa: string;
  contexto: string;
}

/**
 * Motor Simplificado de IA que utiliza templates avançados baseados nas Leis Trabalhistas (CLT).
 * Isso simula um comportamento de LLM, gerando textos consistentes baseados no contexto.
 */
export function gerarTextoDocumentoOficial(req: RequisicaoDocumento): string {
  const { tipo, nomeFuncionario, cargoFuncionario, nomeEmpresa, contexto } = req;
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

  let textoBase = "";

  switch (tipo) {
    case "advertencia":
      textoBase = `TERMO DE ADVERTÊNCIA DISCIPLINAR

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

Nos termos do artigo 482 da Consolidação das Leis do Trabalho (CLT), serve a presente para aplicar-lhe pena de ADVERTÊNCIA DISCIPLINAR em virtude dos seguintes fatos:

${contexto || "[Escreva aqui de forma detalhada o que ocorreu. Ex: Falta de EPI, atrasos]"}

Esclarecemos que a não observância das normas regulatórias de segurança do trabalho ou das ordens expedidas por esta empresa configura ato de insubordinação ou indisciplina.

Solicitamos que a conduta relatada não se repita. Em caso de reincidência, a empresa poderá aplicar medidas disciplinares mais severas, tais como suspensão ou até mesmo a rescisão do seu contrato de trabalho por justa causa.

Por ser verdade, solicitamos que assine a presente via, confirmando o seu recebimento.

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Empregado`;
      break;

    case "suspensao":
      textoBase = `CARTA DE SUSPENSÃO DISCIPLINAR

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

A empresa ${nomeEmpresa}, usando de suas prerrogativas legais constantes no artigo 482 da CLT, vem pelo presente, aplicar-lhe SUSPENSÃO DISCIPLINAR pelo período de [X] dias, com início em [Data Inicial] e retorno às suas atividades normais em [Data Final], em decorrência do seguinte motivo:

${contexto || "[Escreva aqui o contexto da suspensão, ex: Reincidência na recusa de utilizar EPI]"}

A aplicação desta medida se faz necessária visando alertá-lo(a) quanto à gravidade de seu ato e que a reincidência em faltas poderá acarretar sanções mais severas, incluindo demissão por justa causa.

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Empregado`;
      break;

    case "comunicado":
        textoBase = `COMUNICADO OFICIAL

Aos cuidados do(a) colaborador(a):
${nomeFuncionario}
${cargoFuncionario}

Prezado(a) senhor(a),

A empresa ${nomeEmpresa} comunica a V.S.ª que:

${contexto || "[Escreva aqui o teor do comunicado]"}

Agradecemos desde já a sua atenção e colaboração. Permanecemos à disposição para eventuais esclarecimentos.

Atenciosamente,

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Empregado (Ciente)`;
        break;

    case "recibo":
      textoBase = `RECIBO DE PAGAMENTO

Eu, ${nomeFuncionario}, exercendo a função de ${cargoFuncionario}, declaro para os devidos fins de direito que recebi da empresa ${nomeEmpresa} a importância supra de R$ [VALOR] ( [VALOR POR EXTENSO] ), referente a:

${contexto || "[Escreva aqui a referência do recebimento, ex: Adiantamento salarial, bônus produtivo]"}

Para maior clareza, afirmo a veracidade e assino o presente recibo dando plena, geral e irrevogável quitação acerca do valor recebido respectivo ao período e objeto acima citados.

Local e data: [Cidade/UF], ${dataExtenso}

______________________________________________
${nomeFuncionario}
Recebedor`;
      break;

    case "justificativa_falta":
      textoBase = `TERMO DE JUSTIFICATIVA E ABONO DE FALTAS

À empresa ${nomeEmpresa}
A/C Departamento Pessoal / Recursos Humanos

${contexto || "[A solicitação pode partir tanto da empresa formalizando o abono, quanto do colaborador para registro. Detalhe os motivos e anexe eventual atestado / declaração horas.]"}

Colaborador: ${nomeFuncionario}
Função: ${cargoFuncionario}

Fica documentado por este termo o devido registro no respectivo cartão de ponto para os efeitos contábeis da folha de pagamento.

______________________________________________
${nomeFuncionario}
Colaborador

______________________________________________
${nomeEmpresa}
Aprovador Responsável`;
      break;
    default:
      textoBase = "Tipo de documento não selecionado.";
  }

  return textoBase;
}
