// Biblioteca de modelos de comunicação por categoria.
// Cada modelo já traz título e ideia com variáveis dinâmicas ({{nome}}, {{cargo}}, {{obra}}...).
import type { TipoDocumentoOficial } from "./motorIaDocumentos";

export type CategoriaModelo = "rh" | "dp" | "disciplinar" | "convites" | "seguranca";

export const CATEGORIAS_MODELO: { value: CategoriaModelo; label: string; descricao: string }[] = [
  { value: "rh", label: "RH / Gestão de Pessoas", descricao: "Reconhecimento, conduta, clima e desenvolvimento" },
  { value: "dp", label: "DP / Rotinas Trabalhistas", descricao: "Férias, jornada, salário, admissão e desligamento" },
  { value: "disciplinar", label: "Advertências e Disciplina", descricao: "Advertências, suspensões e notificações" },
  { value: "convites", label: "Convites e Convocações", descricao: "Reuniões, treinamentos, DDS, eventos" },
  { value: "seguranca", label: "Segurança do Trabalho", descricao: "EPI, NRs, orientações de campo" },
];

export interface ModeloComunicacao {
  id: string;
  categoria: CategoriaModelo;
  tipo: TipoDocumentoOficial;
  nome: string;
  titulo: string;
  ideia: string;
  tom?: string;
}

export const BIBLIOTECA_MODELOS: ModeloComunicacao[] = [
  // ---------------- RH ----------------
  {
    id: "rh-elogio-desempenho",
    categoria: "rh",
    tipo: "elogio",
    nome: "Elogio por desempenho",
    titulo: "ELOGIO FUNCIONAL - {{nome}}",
    ideia:
      "Reconhecer publicamente o desempenho de {{nome}}, {{cargo}} da {{obra}}, pelo comprometimento, pontualidade e qualidade na execução dos serviços no período de {{mes_ano}}. Registrar o elogio no prontuário e agradecer em nome da {{empresa}}.",
    tom: "cordial",
  },
  {
    id: "rh-orientacao-conduta",
    categoria: "rh",
    tipo: "orientacao_conduta",
    nome: "Orientação de conduta e convivência",
    titulo: "ORIENTAÇÃO DE CONDUTA E CÓDIGO DE ÉTICA",
    ideia:
      "Orientar {{nome}} ({{cargo}}) sobre as regras de convivência, respeito mútuo, uso de linguagem adequada e proibição de brincadeiras que gerem risco na {{obra}}, reforçando o Código de Ética da {{empresa}} a partir de {{data}}.",
    tom: "formal",
  },
  {
    id: "rh-comunicado-geral-clima",
    categoria: "rh",
    tipo: "comunicado_geral",
    nome: "Circular geral às equipes",
    titulo: "CIRCULAR INTERNA - {{mes_ano}}",
    ideia:
      "Comunicar a todas as equipes da {{empresa}} as informações gerais do mês de {{mes_ano}}: metas de produção, cuidados de segurança, organização do canteiro e canais de atendimento do RH. Vigência a partir de {{data_extenso}}.",
    tom: "formal",
  },
  {
    id: "rh-retorno-atestado",
    categoria: "rh",
    tipo: "retorno_atestado",
    nome: "Retorno de afastamento",
    titulo: "COMUNICADO DE RETORNO AO TRABALHO - {{nome}}",
    ideia:
      "Formalizar o retorno de {{nome}} ({{cargo}}) ao trabalho na {{obra}} em {{data_extenso}}, após afastamento por atestado médico, com necessidade de exame de retorno ao trabalho e reapresentação ao encarregado.",
    tom: "formal",
  },

  // ---------------- DP ----------------
  {
    id: "dp-aviso-ferias",
    categoria: "dp",
    tipo: "aviso_ferias",
    nome: "Aviso de férias individuais",
    titulo: "AVISO DE FÉRIAS - {{nome}}",
    ideia:
      "Comunicar a {{nome}} ({{cargo}}, matrícula {{matricula}}) o período de gozo de férias de 30 dias, com pagamento antecipado conforme a CLT. Documento emitido em {{data}} pela {{empresa}}.",
    tom: "juridico",
  },
  {
    id: "dp-ferias-coletivas",
    categoria: "dp",
    tipo: "ferias_coletivas",
    nome: "Férias coletivas da obra",
    titulo: "AVISO DE FÉRIAS COLETIVAS - {{obra}}",
    ideia:
      "Informar às equipes da {{obra}} o período de férias coletivas, datas de paralisação e retorno das atividades, orientações sobre pagamento e escala de plantão. Comunicado em {{data_extenso}}.",
    tom: "formal",
  },
  {
    id: "dp-mudanca-horario",
    categoria: "dp",
    tipo: "mudanca_horario",
    nome: "Alteração de jornada",
    titulo: "COMUNICADO DE ALTERAÇÃO DE JORNADA - {{obra}}",
    ideia:
      "Comunicar a {{nome}} ({{cargo}}) a alteração do horário de trabalho na {{obra}} a partir de {{data_extenso}}, detalhando entrada, intervalo e saída, e reforçando a obrigatoriedade do registro de ponto.",
    tom: "juridico",
  },
  {
    id: "dp-alteracao-salarial",
    categoria: "dp",
    tipo: "alteracao_salarial",
    nome: "Alteração salarial / CCT",
    titulo: "COMUNICADO DE ALTERAÇÃO SALARIAL - {{nome}}",
    ideia:
      "Formalizar a alteração do salário-base de {{nome}} ({{cargo}}) com vigência a partir de {{data_extenso}}, em razão da Convenção Coletiva de Trabalho vigente, com reflexo em folha de {{mes_ano}}.",
    tom: "juridico",
  },
  {
    id: "dp-transferencia",
    categoria: "dp",
    tipo: "transferencia_obra",
    nome: "Transferência de obra/setor",
    titulo: "COMUNICADO DE TRANSFERÊNCIA - {{nome}}",
    ideia:
      "Comunicar a transferência de {{nome}} ({{cargo}}) para a {{obra}} a partir de {{data_extenso}}, mantidas as condições contratuais, função e remuneração, com apresentação ao encarregado responsável.",
    tom: "formal",
  },
  {
    id: "dp-declaracao-vinculo",
    categoria: "dp",
    tipo: "declaracao_vinculo",
    nome: "Declaração de vínculo",
    titulo: "DECLARAÇÃO DE VÍNCULO EMPREGATÍCIO",
    ideia:
      "Declarar, para os devidos fins, que {{nome}}, CPF {{cpf}}, exerce a função de {{cargo}} na {{empresa}} (CNPJ {{cnpj}}) desde {{admissao}}, atualmente alocado na {{obra}}. Emitida em {{data_extenso}}.",
    tom: "formal",
  },
  {
    id: "dp-autorizacao-desconto",
    categoria: "dp",
    tipo: "autorizacao_desconto",
    nome: "Autorização de desconto em folha",
    titulo: "AUTORIZAÇÃO DE DESCONTO EM FOLHA - {{nome}}",
    ideia:
      "Formalizar a autorização de desconto em folha de {{nome}} ({{cargo}}) referente a {{mes_ano}}, discriminando o motivo, o valor e o número de parcelas, conforme art. 462 da CLT.",
    tom: "juridico",
  },
  {
    id: "dp-banco-horas",
    categoria: "dp",
    tipo: "banco_horas",
    nome: "Banco de horas",
    titulo: "COMUNICADO DE BANCO DE HORAS - {{mes_ano}}",
    ideia:
      "Informar a {{nome}} ({{cargo}}) o saldo de banco de horas apurado em {{mes_ano}}, as regras de compensação previstas na CCT e o prazo limite para quitação do saldo.",
    tom: "juridico",
  },
  {
    id: "dp-aviso-previo",
    categoria: "dp",
    tipo: "aviso_previo",
    nome: "Aviso prévio",
    titulo: "AVISO PRÉVIO - {{nome}}",
    ideia:
      "Comunicar a {{nome}} ({{cargo}}, admitido em {{admissao}}) o aviso prévio, indicando a modalidade (trabalhado ou indenizado), a data do último dia de trabalho e as orientações para exame demissional e acerto rescisório.",
    tom: "juridico",
  },
  {
    id: "dp-comunicado-feriado",
    categoria: "dp",
    tipo: "comunicado_feriado",
    nome: "Feriado / ponto facultativo",
    titulo: "COMUNICADO DE FERIADO - {{obra}}",
    ideia:
      "Informar às equipes da {{obra}} a paralisação das atividades no feriado, a escala de retorno e eventual compensação de jornada. Comunicado emitido em {{data}}.",
    tom: "formal",
  },

  // ---------------- Disciplinar ----------------
  {
    id: "disc-advertencia-falta",
    categoria: "disciplinar",
    tipo: "advertencia",
    nome: "Advertência por falta injustificada",
    titulo: "ADVERTÊNCIA DISCIPLINAR - FALTA INJUSTIFICADA",
    ideia:
      "Advertir {{nome}} ({{cargo}}) por falta injustificada na {{obra}}, sem apresentação de atestado ou comunicação prévia à liderança, com reflexo no DSR de {{mes_ano}} e alerta sobre reincidência.",
    tom: "firme",
  },
  {
    id: "disc-advertencia-epi",
    categoria: "disciplinar",
    tipo: "advertencia",
    nome: "Advertência por não uso de EPI",
    titulo: "ADVERTÊNCIA DISCIPLINAR - NÃO UTILIZAÇÃO DE EPI",
    ideia:
      "Advertir {{nome}} ({{cargo}}) por não utilizar o EPI obrigatório na {{obra}} em {{data}}, em descumprimento da NR-06 e do art. 158 da CLT, reforçando o caráter de ato faltoso.",
    tom: "firme",
  },
  {
    id: "disc-advertencia-atraso",
    categoria: "disciplinar",
    tipo: "advertencia",
    nome: "Advertência por atrasos reiterados",
    titulo: "ADVERTÊNCIA DISCIPLINAR - ATRASOS REITERADOS",
    ideia:
      "Advertir {{nome}} ({{cargo}}) pelos atrasos reiterados registrados no ponto eletrônico da {{obra}} em {{mes_ano}}, com orientação sobre cumprimento integral da jornada.",
    tom: "firme",
  },
  {
    id: "disc-suspensao",
    categoria: "disciplinar",
    tipo: "suspensao",
    nome: "Suspensão disciplinar",
    titulo: "SUSPENSÃO DISCIPLINAR - {{nome}}",
    ideia:
      "Aplicar suspensão disciplinar a {{nome}} ({{cargo}}) em razão de reincidência de conduta já advertida, informando o período de suspensão, o desconto correspondente e a data de retorno.",
    tom: "firme",
  },
  {
    id: "disc-falta-grave",
    categoria: "disciplinar",
    tipo: "notificacao_falta_grave",
    nome: "Notificação de falta grave (art. 482)",
    titulo: "NOTIFICAÇÃO DE FALTA GRAVE - {{nome}}",
    ideia:
      "Notificar {{nome}} ({{cargo}}) sobre apuração de falta grave ocorrida na {{obra}} em {{data}}, com enquadramento no art. 482 da CLT, oportunidade de defesa e prazo para manifestação.",
    tom: "juridico",
  },
  {
    id: "disc-abandono",
    categoria: "disciplinar",
    tipo: "abandono_emprego",
    nome: "Notificação de abandono de emprego",
    titulo: "NOTIFICAÇÃO DE ABANDONO DE EMPREGO - {{nome}}",
    ideia:
      "Notificar {{nome}} ({{cargo}}) sobre ausências consecutivas e injustificadas desde {{data}}, convocando o retorno ao trabalho na {{obra}} em até 48 horas, sob pena de caracterização de abandono de emprego.",
    tom: "juridico",
  },
  {
    id: "disc-justificativa",
    categoria: "disciplinar",
    tipo: "justificativa_falta",
    nome: "Abono / justificativa de falta",
    titulo: "JUSTIFICATIVA DE AUSÊNCIA - {{nome}}",
    ideia:
      "Registrar a justificativa apresentada por {{nome}} ({{cargo}}) para a ausência em {{data}}, com análise do RH sobre o abono e o reflexo no ponto de {{mes_ano}}.",
    tom: "formal",
  },

  // ---------------- Convites e Convocações ----------------
  {
    id: "conv-cipa-dds",
    categoria: "convites",
    tipo: "comunicado_reuniao_cipa",
    nome: "Convocação de DDS / CIPA",
    titulo: "CONVOCAÇÃO - DDS / REUNIÃO CIPA - {{obra}}",
    ideia:
      "Convocar as equipes da {{obra}} para o Diálogo Diário de Segurança / reunião da CIPA em {{data_extenso}}, informando horário, local, pauta (acidentes, EPI, ordem e limpeza) e presença obrigatória com registro em lista.",
    tom: "tecnico",
  },
  {
    id: "conv-treinamento-nr",
    categoria: "convites",
    tipo: "convocacao",
    nome: "Convocação para treinamento de NR",
    titulo: "CONVOCAÇÃO PARA TREINAMENTO - {{nome}}",
    ideia:
      "Convocar {{nome}} ({{cargo}}) para treinamento obrigatório de NR (NR-18/NR-35) em {{data_extenso}}, informando local, carga horária, documentos necessários e caráter obrigatório da participação.",
    tom: "tecnico",
  },
  {
    id: "conv-exames-clinica",
    categoria: "convites",
    tipo: "convocacao",
    nome: "Convocação para exames (clínica)",
    titulo: "CONVOCAÇÃO PARA EXAMES OCUPACIONAIS - {{nome}}",
    ideia:
      "Convocar {{nome}} ({{cargo}}) para comparecer à clínica credenciada em {{data_extenso}} para realização de ASO e exames complementares, com orientações de documentos, jejum e horário.",
    tom: "formal",
  },
  {
    id: "conv-reuniao-equipe",
    categoria: "convites",
    tipo: "convocacao",
    nome: "Convite para reunião de equipe",
    titulo: "CONVITE - REUNIÃO DE EQUIPE - {{obra}}",
    ideia:
      "Convidar a equipe da {{obra}} para reunião de alinhamento em {{data_extenso}}, com pauta de produtividade, cronograma, segurança e espaço para sugestões dos colaboradores.",
    tom: "cordial",
  },
  {
    id: "conv-evento-confraternizacao",
    categoria: "convites",
    tipo: "comunicado_geral",
    nome: "Convite para confraternização",
    titulo: "CONVITE - CONFRATERNIZAÇÃO {{ano}}",
    ideia:
      "Convidar os colaboradores da {{empresa}} para a confraternização de {{ano}}, informando data, horário, local, regras de convivência e confirmação de presença junto ao RH.",
    tom: "cordial",
  },

  // ---------------- Segurança ----------------
  {
    id: "seg-comunicado-seguranca",
    categoria: "seguranca",
    tipo: "seguranca_trabalho",
    nome: "Comunicado de segurança do trabalho",
    titulo: "COMUNICADO DE SEGURANÇA DO TRABALHO - {{obra}}",
    ideia:
      "Comunicar às equipes da {{obra}} as medidas de segurança obrigatórias a partir de {{data_extenso}}: uso de EPI, sinalização, trabalho em altura, movimentação de cargas e comunicação imediata de incidentes.",
    tom: "tecnico",
  },
  {
    id: "seg-termo-epi",
    categoria: "seguranca",
    tipo: "termo_responsabilidade_epi",
    nome: "Termo de responsabilidade de EPI",
    titulo: "TERMO DE RESPONSABILIDADE DE EPI - {{nome}}",
    ideia:
      "Formalizar a entrega e a responsabilidade de {{nome}} ({{cargo}}) pelos EPIs recebidos em {{data}} na {{obra}}, com obrigação de uso, conservação, devolução e comunicação de danos, conforme NR-06.",
    tom: "tecnico",
  },
];

export function modelosPorCategoria(cat: CategoriaModelo): ModeloComunicacao[] {
  return BIBLIOTECA_MODELOS.filter(m => m.categoria === cat);
}
