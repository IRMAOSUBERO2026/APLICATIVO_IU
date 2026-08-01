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
  | "aviso_previo"
  | "transferencia_obra"
  | "alteracao_salarial"
  | "promocao"
  | "declaracao_vinculo"
  | "autorizacao_desconto"
  | "banco_horas"
  | "ferias_coletivas"
  | "retorno_atestado"
  | "abandono_emprego"
  | "termo_responsabilidade_epi"
  | "comunicado_feriado"
  | "orientacao_conduta"
  | "comunicado_reuniao_cipa"
  | "notificacao_falta_grave";

/** Rótulo exibido na interface para cada tipo de documento. */
export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumentoOficial, string> = {
  advertencia: "Advertência Disciplinar",
  suspensao: "Suspensão Disciplinar",
  comunicado: "Comunicado (Individual)",
  comunicado_geral: "Comunicado Geral / Circular",
  recibo: "Recibo de Pagamento",
  justificativa_falta: "Justificativa / Abono de Falta",
  aviso_ferias: "Aviso de Férias",
  convocacao: "Convocação",
  mudanca_horario: "Alteração de Jornada / Horário",
  seguranca_trabalho: "Comunicado de Segurança do Trabalho",
  elogio: "Elogio / Reconhecimento",
  aviso_previo: "Aviso Prévio",
  transferencia_obra: "Transferência de Obra / Setor",
  alteracao_salarial: "Alteração Salarial",
  promocao: "Promoção / Mudança de Função",
  declaracao_vinculo: "Declaração de Vínculo Empregatício",
  autorizacao_desconto: "Autorização de Desconto em Folha",
  banco_horas: "Acordo / Comunicado de Banco de Horas",
  ferias_coletivas: "Aviso de Férias Coletivas",
  retorno_atestado: "Retorno de Afastamento / Atestado",
  abandono_emprego: "Notificação de Abandono de Emprego",
  termo_responsabilidade_epi: "Termo de Responsabilidade de EPI",
  comunicado_feriado: "Comunicado de Feriado / Ponto Facultativo",
  orientacao_conduta: "Orientação de Conduta e Código de Ética",
  comunicado_reuniao_cipa: "Convocação de DDS / Reunião CIPA",
  notificacao_falta_grave: "Notificação de Falta Grave (art. 482)",
};

/** Pasta do prontuário digital onde o PDF é arquivado. */
export const TIPO_DOCUMENTO_PASTA: Record<TipoDocumentoOficial, string> = {
  advertencia: "Advertências",
  suspensao: "Advertências",
  notificacao_falta_grave: "Advertências",
  abandono_emprego: "Advertências",
  comunicado: "Comunicados",
  comunicado_geral: "Comunicados",
  recibo: "Holerites",
  autorizacao_desconto: "Holerites",
  alteracao_salarial: "Holerites",
  justificativa_falta: "Cartão Ponto",
  banco_horas: "Cartão Ponto",
  retorno_atestado: "Cartão Ponto",
  aviso_ferias: "Comunicados",
  ferias_coletivas: "Comunicados",
  convocacao: "Comunicados",
  mudanca_horario: "Comunicados",
  seguranca_trabalho: "Comunicados",
  termo_responsabilidade_epi: "Comunicados",
  comunicado_reuniao_cipa: "Comunicados",
  comunicado_feriado: "Comunicados",
  orientacao_conduta: "Comunicados",
  elogio: "Comunicados",
  promocao: "Comunicados",
  transferencia_obra: "Comunicados",
  declaracao_vinculo: "Comunicados",
  aviso_previo: "Comunicados",
};

/** Modelos de título/assunto sugeridos por tipo de documento. */
export const TITULOS_SUGERIDOS: Record<TipoDocumentoOficial, string[]> = {
  advertencia: [
    "TERMO DE ADVERTÊNCIA DISCIPLINAR",
    "ADVERTÊNCIA ESCRITA — DESCUMPRIMENTO DE NORMA INTERNA",
    "ADVERTÊNCIA POR AUSÊNCIA INJUSTIFICADA",
    "ADVERTÊNCIA POR NÃO UTILIZAÇÃO DE EPI",
    "ADVERTÊNCIA POR ATRASOS REITERADOS",
  ],
  suspensao: [
    "CARTA DE SUSPENSÃO DISCIPLINAR",
    "SUSPENSÃO DISCIPLINAR POR REINCIDÊNCIA",
    "SUSPENSÃO PREVENTIVA PARA APURAÇÃO DE FATOS",
  ],
  comunicado: [
    "COMUNICADO OFICIAL AO COLABORADOR",
    "NOTIFICAÇÃO INTERNA — DEPARTAMENTO PESSOAL",
    "COMUNICADO DE ORIENTAÇÃO FUNCIONAL",
  ],
  comunicado_geral: [
    "COMUNICADO GERAL / CIRCULAR INTERNA",
    "CIRCULAR ADMINISTRATIVA A TODOS OS COLABORADORES",
    "AVISO DE MURAL — RECURSOS HUMANOS",
  ],
  recibo: [
    "RECIBO DE PAGAMENTO",
    "RECIBO DE ADIANTAMENTO SALARIAL",
    "RECIBO DE QUITAÇÃO DE VALORES",
  ],
  justificativa_falta: [
    "TERMO DE JUSTIFICATIVA E ABONO DE FALTAS",
    "ABONO DE FALTA MEDIANTE ATESTADO MÉDICO",
    "JUSTIFICATIVA DE AUSÊNCIA PARCIAL (ATRASO / SAÍDA ANTECIPADA)",
  ],
  aviso_ferias: [
    "AVISO DE FÉRIAS INDIVIDUAIS",
    "AVISO E RECIBO DE FÉRIAS — ART. 135 DA CLT",
    "COMUNICAÇÃO DE PERÍODO DE GOZO DE FÉRIAS",
  ],
  convocacao: [
    "CONVOCAÇÃO PARA REUNIÃO",
    "CONVOCAÇÃO PARA TREINAMENTO OBRIGATÓRIO",
    "CONVOCAÇÃO PARA JORNADA EXTRAORDINÁRIA",
    "CONVOCAÇÃO PARA RETORNO AO TRABALHO",
  ],
  mudanca_horario: [
    "COMUNICADO DE ALTERAÇÃO DE JORNADA DE TRABALHO",
    "COMUNICADO DE MUDANÇA DE ESCALA",
    "COMUNICADO DE ANTECIPAÇÃO DE HORÁRIO POR CONDIÇÕES CLIMÁTICAS",
  ],
  seguranca_trabalho: [
    "COMUNICADO DE SEGURANÇA DO TRABALHO",
    "ORIENTAÇÃO DE SEGURANÇA — USO OBRIGATÓRIO DE EPI",
    "COMUNICADO SESMT — PROCEDIMENTO OPERACIONAL SEGURO",
    "ALERTA PREVENTIVO DE ACIDENTE DE TRABALHO",
  ],
  elogio: [
    "CARTA DE ELOGIO E RECONHECIMENTO",
    "RECONHECIMENTO POR DESEMPENHO EXEMPLAR",
    "MENÇÃO HONROSA — DESTAQUE DO MÊS",
  ],
  aviso_previo: [
    "AVISO PRÉVIO",
    "AVISO PRÉVIO TRABALHADO",
    "AVISO PRÉVIO INDENIZADO",
  ],
  transferencia_obra: [
    "COMUNICADO DE TRANSFERÊNCIA DE OBRA",
    "TRANSFERÊNCIA DE LOCAL DE PRESTAÇÃO DE SERVIÇOS",
    "REMANEJAMENTO INTERNO DE EQUIPE",
  ],
  alteracao_salarial: [
    "COMUNICADO DE ALTERAÇÃO SALARIAL",
    "REAJUSTE SALARIAL CONFORME CONVENÇÃO COLETIVA",
    "COMUNICADO DE ENQUADRAMENTO SALARIAL",
  ],
  promocao: [
    "COMUNICADO DE PROMOÇÃO",
    "MUDANÇA DE FUNÇÃO E ENQUADRAMENTO",
    "TERMO DE PROMOÇÃO FUNCIONAL",
  ],
  declaracao_vinculo: [
    "DECLARAÇÃO DE VÍNCULO EMPREGATÍCIO",
    "DECLARAÇÃO PARA FINS DE COMPROVAÇÃO DE RENDA",
    "DECLARAÇÃO DE EXERCÍCIO DE FUNÇÃO",
  ],
  autorizacao_desconto: [
    "AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO",
    "TERMO DE AUTORIZAÇÃO DE DESCONTO — ART. 462 DA CLT",
    "AUTORIZAÇÃO DE DESCONTO POR DANO / AVARIA",
  ],
  banco_horas: [
    "COMUNICADO DE BANCO DE HORAS",
    "ACORDO INDIVIDUAL DE COMPENSAÇÃO DE JORNADA",
    "EXTRATO E ORIENTAÇÃO DE COMPENSAÇÃO DE HORAS",
  ],
  ferias_coletivas: [
    "AVISO DE FÉRIAS COLETIVAS",
    "COMUNICADO DE FÉRIAS COLETIVAS — ART. 139 DA CLT",
    "PARADA COLETIVA DE FIM DE ANO",
  ],
  retorno_atestado: [
    "COMUNICADO DE RETORNO DE AFASTAMENTO",
    "TERMO DE RECEBIMENTO DE ATESTADO MÉDICO",
    "ORIENTAÇÃO PARA EXAME DE RETORNO AO TRABALHO (NR-7)",
  ],
  abandono_emprego: [
    "NOTIFICAÇÃO DE ABANDONO DE EMPREGO",
    "CONVOCAÇÃO PARA RETORNO SOB PENA DE JUSTA CAUSA",
    "NOTIFICAÇÃO DE AUSÊNCIAS INJUSTIFICADAS CONSECUTIVAS",
  ],
  termo_responsabilidade_epi: [
    "TERMO DE RESPONSABILIDADE E RECEBIMENTO DE EPI",
    "TERMO DE GUARDA E CONSERVAÇÃO DE EQUIPAMENTOS",
    "TERMO DE RESPONSABILIDADE DE FERRAMENTAS E UNIFORME",
  ],
  comunicado_feriado: [
    "COMUNICADO DE FERIADO E PONTO FACULTATIVO",
    "ESCALA DE FUNCIONAMENTO EM FERIADO",
    "COMUNICADO DE COMPENSAÇÃO DE PONTE DE FERIADO",
  ],
  orientacao_conduta: [
    "ORIENTAÇÃO DE CONDUTA E CÓDIGO DE ÉTICA",
    "COMUNICADO SOBRE POSTURA E RELACIONAMENTO NO CANTEIRO",
    "POLÍTICA DE COMBATE AO ASSÉDIO E À DISCRIMINAÇÃO",
  ],
  comunicado_reuniao_cipa: [
    "CONVOCAÇÃO PARA DIÁLOGO DIÁRIO DE SEGURANÇA (DDS)",
    "CONVOCAÇÃO PARA REUNIÃO ORDINÁRIA DA CIPA",
    "COMUNICADO DE TREINAMENTO DE INTEGRAÇÃO EM SEGURANÇA",
  ],
  notificacao_falta_grave: [
    "NOTIFICAÇÃO DE FALTA GRAVE — ART. 482 DA CLT",
    "NOTIFICAÇÃO PARA APRESENTAÇÃO DE DEFESA PRÉVIA",
    "COMUNICAÇÃO DE APURAÇÃO DE CONDUTA GRAVE",
  ],
};

/** Tons de escrita disponíveis para a IA. */
export const TONS_DOCUMENTO = [
  { value: "formal", label: "Formal corporativo (padrão)" },
  { value: "juridico", label: "Jurídico / fundamentado na CLT" },
  { value: "firme", label: "Firme e assertivo (disciplinar)" },
  { value: "cordial", label: "Cordial e motivacional" },
  { value: "tecnico", label: "Técnico / segurança do trabalho" },
] as const;


interface RequisicaoDocumento {
  tipo: TipoDocumentoOficial;
  titulo?: string;
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
  const tituloEscolhido = (req.titulo || TITULOS_SUGERIDOS[tipo]?.[0] || TIPO_DOCUMENTO_LABEL[tipo] || "DOCUMENTO OFICIAL").toUpperCase();
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    req.data ? new Date(req.data + "T12:00:00") : new Date()
  );

  let textoBase = "";

  switch (tipo) {
    case "advertencia":
      textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

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
        textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

A todos os colaboradores da empresa ${nomeEmpresa}

${contexto || "[Escreva aqui o teor do comunicado geral a ser divulgado no mural / grupos]"}

Contamos com a colaboração e atenção de todos.

${nomeEmpresa}
Administração / Recursos Humanos
${dataExtenso}`;
      break;

    case "aviso_ferias":
      textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

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
      textoBase = `${tituloEscolhido}

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
      // Modelo genérico estruturado para os demais tipos de documento.
      textoBase = `${tituloEscolhido}

À(o) Sr(a). ${nomeFuncionario || "[Nome do colaborador]"}
${cargoFuncionario ? `Cargo: ${cargoFuncionario}` : ""}
Empresa: ${nomeEmpresa}
Data: ${dataExtenso}

1. OBJETO
A empresa ${nomeEmpresa}, por meio de seu Departamento de Recursos Humanos, formaliza o presente documento nos seguintes termos:

${contexto || "[Descreva o teor do documento — fatos, datas, valores e providências esperadas]"}

2. FUNDAMENTAÇÃO E ORIENTAÇÕES
O presente documento observa a legislação trabalhista vigente (CLT), a Convenção Coletiva aplicável à categoria e as normas internas da empresa. Eventuais dúvidas deverão ser tratadas diretamente com o RH/DP.

3. CIÊNCIA
Ao assinar, o colaborador declara ter lido e compreendido integralmente o conteúdo acima, recebendo uma via do documento.

______________________________________________
${nomeEmpresa}
Recursos Humanos / Departamento Pessoal

______________________________________________
${nomeFuncionario || "Colaborador"}
Colaborador (Ciente)`;
  }

  return textoBase;
}
