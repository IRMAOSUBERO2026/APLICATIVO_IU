export type TipoDocumentoOficial =
  | "advertencia"
  | "suspensao"
  | "comunicado"
  | "comunicado_geral"
  | "recibo"
  | "justificativa_falta"
  | "aviso_ferias"
  | "convocacao"
  | "mudanca_horario"
  | "seguranca_trabalho"
  | "elogio"
  | "aviso_previo";

interface RequisicaoDocumento {
  tipo: TipoDocumentoOficial;
  nomeFuncionario: string;
  cargoFuncionario: string;
  nomeEmpresa: string;
  contexto: string;
  data?: string; // ISO yyyy-mm-dd — data do documento (opcional)
}

/**
 * Motor Simplificado de IA que utiliza templates avançados baseados nas Leis Trabalhistas (CLT).
 * Isso simula um comportamento de LLM, gerando textos consistentes baseados no contexto.
 */
export function gerarTextoDocumentoOficial(req: RequisicaoDocumento): string {
  const { tipo, nomeFuncionario, cargoFuncionario, nomeEmpresa, contexto } = req;
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    req.data ? new Date(req.data + "T12:00:00") : new Date()
  );

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
    case "comunicado_geral":
      textoBase = `COMUNICADO GERAL / CIRCULAR INTERNA

A todos os colaboradores da empresa ${nomeEmpresa}

${contexto || "[Escreva aqui o teor do comunicado geral a ser divulgado no mural / grupos]"}

Contamos com a colaboração e atenção de todos.

${nomeEmpresa}
Administração / Recursos Humanos
${dataExtenso}`;
      break;

    case "aviso_ferias":
      textoBase = `AVISO DE FÉRIAS

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

Nos termos do artigo 135 da CLT, comunicamos que suas férias serão concedidas conforme abaixo:

${contexto || "Período aquisitivo: [__/__/____ a __/__/____]\nPeríodo de gozo: [__/__/____ a __/__/____]\nRetorno ao trabalho: [__/__/____]"}

O pagamento correspondente será efetuado até 2 (dois) dias antes do início do período de gozo, conforme legislação vigente.

${dataExtenso}

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Empregado (Ciente)`;
      break;

    case "convocacao":
      textoBase = `CONVOCAÇÃO

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

A empresa ${nomeEmpresa} vem, por meio deste, CONVOCAR V.S.ª para:

${contexto || "[Descreva o motivo da convocação — reunião, treinamento, retorno ao trabalho, hora extra — informando data, horário e local]"}

Solicitamos o seu comparecimento e pontualidade.

${dataExtenso}

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Ciente`;
      break;

    case "mudanca_horario":
      textoBase = `COMUNICADO DE ALTERAÇÃO DE JORNADA / HORÁRIO

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

Comunicamos a alteração de sua jornada/horário de trabalho conforme detalhado abaixo:

${contexto || "Novo horário: [__:__ às __:__]\nEscala: [___]\nVigência a partir de: [__/__/____]"}

Permanecemos à disposição para eventuais esclarecimentos.

${dataExtenso}

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Empregado (Ciente)`;
      break;

    case "seguranca_trabalho":
      textoBase = `COMUNICADO DE SEGURANÇA DO TRABALHO

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

Em cumprimento às Normas Regulamentadoras (NR) e visando à integridade física dos colaboradores, a empresa ${nomeEmpresa} comunica:

${contexto || "[Descreva a orientação de segurança — uso obrigatório de EPI, procedimento, DDS, advertência preventiva]"}

O descumprimento das normas de segurança poderá ensejar medidas disciplinares. A segurança é responsabilidade de todos.

${dataExtenso}

______________________________________________
${nomeEmpresa}
SESMT / Empregador

______________________________________________
${nomeFuncionario}
Empregado (Ciente)`;
      break;

    case "elogio":
      textoBase = `CARTA DE ELOGIO E RECONHECIMENTO

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

A empresa ${nomeEmpresa} vem, por meio deste, expressar seu reconhecimento e agradecimento:

${contexto || "[Descreva o motivo do elogio — desempenho, dedicação, conduta exemplar, resultado alcançado]"}

Colaboradores como você fazem a diferença. Parabéns e continue assim!

${dataExtenso}

______________________________________________
${nomeEmpresa}
Administração`;
      break;

    case "aviso_previo":
      textoBase = `AVISO PRÉVIO

À(o) Sr(a). ${nomeFuncionario}
Cargo: ${cargoFuncionario}

Nos termos dos artigos 487 e seguintes da CLT, comunicamos o presente AVISO PRÉVIO:

${contexto || "Modalidade: [ ] Trabalhado  [ ] Indenizado\nData de início do aviso: [__/__/____]\nData de desligamento: [__/__/____]\nMotivo: [___]"}

Fica assegurado o cumprimento dos prazos e direitos legais correspondentes.

${dataExtenso}

______________________________________________
${nomeEmpresa}
Empregador

______________________________________________
${nomeFuncionario}
Empregado (Ciente)`;
      break;

    default:
      textoBase = "Tipo de documento não selecionado.";
  }

  return textoBase;
}
