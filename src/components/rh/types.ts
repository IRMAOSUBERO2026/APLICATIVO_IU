export interface Funcionario {
  id: number;
  nome: string;
  foto: string;
  cnpj: string;
  empresa: string;
  obra: string;
  construtora: string;
  cidadeTrabalho: string;
  admissao: string;
  cargo: string;
  nascimento: string;
  telefone: string;
  rg: string;
  cpf: string;
  pis: string;
  codigoPix: string;
  salarioBase: number;
  salarioCombinado: number;
  clinica: string;
  aso: string;
  nr6: string;
  nr12: string;
  nr18: string;
  nr35: string;
  dataRescisao: string;
  status: string;
  abandono: string;
  atestado: string;
  // Pré-cadastro fields
  estadoCivil: string;
  nacionalidade: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  ctps: string;
  serieCtps: string;
  tituloEleitor: string;
  zonaEleitoral: string;
  secaoEleitoral: string;
  cnh: string;
  categoriaCnh: string;
  validadeCnh: string;
  nomeMae: string;
  nomePai: string;
  escolaridade: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  dependentes: number;
}

export const funcionariosData: Funcionario[] = [
  { id: 1, nome: "Carlos Silva", foto: "", cnpj: "12.345.678/0001-90", empresa: "Irmãos Ubero I", obra: "Ed. Aurora", construtora: "Horizonte", cidadeTrabalho: "São Paulo", admissao: "2023-03-15", cargo: "Pedreiro", nascimento: "1985-06-20", telefone: "(11) 99999-0001", rg: "12.345.678-9", cpf: "123.456.789-00", pis: "123.45678.90-1", codigoPix: "123.456.789-00", salarioBase: 2500, salarioCombinado: 3200, clinica: "MedWork", aso: "2025-11-20", nr6: "2025-11-20", nr12: "2025-01-10", nr18: "2025-01-10", nr35: "2025-01-10", dataRescisao: "", status: "Ativo", abandono: "", atestado: "", estadoCivil: "Casado", nacionalidade: "Brasileiro", endereco: "Rua das Flores, 123", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "01000-000", ctps: "123456", serieCtps: "0001", tituloEleitor: "1234567890", zonaEleitoral: "001", secaoEleitoral: "0123", cnh: "", categoriaCnh: "", validadeCnh: "", nomeMae: "Maria Silva", nomePai: "João Silva", escolaridade: "Ensino Médio", banco: "Bradesco", agencia: "1234", conta: "56789-0", tipoConta: "Corrente", dependentes: 2 },
  { id: 2, nome: "José Santos", foto: "", cnpj: "12.345.678/0001-90", empresa: "Irmãos Ubero I", obra: "Ed. Aurora", construtora: "Horizonte", cidadeTrabalho: "São Paulo", admissao: "2022-07-20", cargo: "Armador", nascimento: "1990-02-15", telefone: "(11) 99999-0002", rg: "23.456.789-0", cpf: "234.567.890-11", pis: "234.56789.01-2", codigoPix: "234.567.890-11", salarioBase: 2700, salarioCombinado: 3500, clinica: "MedWork", aso: "2026-01-15", nr6: "2026-01-15", nr12: "2024-06-10", nr18: "2024-06-10", nr35: "2024-06-10", dataRescisao: "", status: "Ativo", abandono: "", atestado: "", estadoCivil: "Solteiro", nacionalidade: "Brasileiro", endereco: "Av. Brasil, 456", bairro: "Vila Nova", cidade: "São Paulo", uf: "SP", cep: "02000-000", ctps: "234567", serieCtps: "0002", tituloEleitor: "2345678901", zonaEleitoral: "002", secaoEleitoral: "0234", cnh: "12345678900", categoriaCnh: "B", validadeCnh: "2027-05-10", nomeMae: "Ana Santos", nomePai: "Pedro Santos", escolaridade: "Ensino Fundamental", banco: "Itaú", agencia: "5678", conta: "12345-6", tipoConta: "Poupança", dependentes: 0 },
  { id: 3, nome: "Marcos Oliveira", foto: "", cnpj: "98.765.432/0001-10", empresa: "Irmãos Ubero II", obra: "Galpão Alfa", construtora: "Logística Norte", cidadeTrabalho: "Campinas", admissao: "2024-01-10", cargo: "Carpinteiro", nascimento: "1988-09-05", telefone: "(19) 99999-0003", rg: "34.567.890-1", cpf: "345.678.901-22", pis: "345.67890.12-3", codigoPix: "345.678.901-22", salarioBase: 2300, salarioCombinado: 3000, clinica: "SafeMed", aso: "2026-02-28", nr6: "2026-02-28", nr12: "2025-08-15", nr18: "2025-08-15", nr35: "2025-08-15", dataRescisao: "", status: "Ativo", abandono: "", atestado: "", estadoCivil: "Casado", nacionalidade: "Brasileiro", endereco: "Rua Campinas, 789", bairro: "Jardim", cidade: "Campinas", uf: "SP", cep: "13000-000", ctps: "345678", serieCtps: "0003", tituloEleitor: "", zonaEleitoral: "", secaoEleitoral: "", cnh: "", categoriaCnh: "", validadeCnh: "", nomeMae: "Luzia Oliveira", nomePai: "Antônio Oliveira", escolaridade: "Ensino Médio", banco: "Caixa", agencia: "0001", conta: "98765-4", tipoConta: "Corrente", dependentes: 3 },
  { id: 4, nome: "Ana Costa", foto: "", cnpj: "12.345.678/0001-90", empresa: "Irmãos Ubero I", obra: "Ponte BR-101", construtora: "DNIT", cidadeTrabalho: "Joinville", admissao: "2021-11-05", cargo: "Eng. Civil", nascimento: "1992-12-10", telefone: "(47) 99999-0004", rg: "45.678.901-2", cpf: "456.789.012-33", pis: "456.78901.23-4", codigoPix: "456.789.012-33", salarioBase: 9000, salarioCombinado: 12000, clinica: "MedWork", aso: "2025-09-01", nr6: "2025-09-01", nr12: "2024-12-01", nr18: "2024-12-01", nr35: "2024-12-01", dataRescisao: "", status: "Ativo", abandono: "", atestado: "", estadoCivil: "Solteira", nacionalidade: "Brasileira", endereco: "Rua Principal, 100", bairro: "Centro", cidade: "Joinville", uf: "SC", cep: "89200-000", ctps: "456789", serieCtps: "0004", tituloEleitor: "4567890123", zonaEleitoral: "004", secaoEleitoral: "0456", cnh: "98765432100", categoriaCnh: "AB", validadeCnh: "2028-03-15", nomeMae: "Teresa Costa", nomePai: "Roberto Costa", escolaridade: "Ensino Superior", banco: "Banco do Brasil", agencia: "3456", conta: "78901-2", tipoConta: "Corrente", dependentes: 0 },
  { id: 5, nome: "Rafael Souza", foto: "", cnpj: "98.765.432/0001-10", empresa: "Irmãos Ubero II", obra: "Ed. Aurora", construtora: "Horizonte", cidadeTrabalho: "São Paulo", admissao: "2024-08-01", cargo: "Servente", nascimento: "1995-04-25", telefone: "(11) 99999-0006", rg: "56.789.012-3", cpf: "567.890.123-44", pis: "567.89012.34-5", codigoPix: "567.890.123-44", salarioBase: 1800, salarioCombinado: 2200, clinica: "SafeMed", aso: "2026-03-10", nr6: "2026-03-10", nr12: "2025-10-20", nr18: "2025-10-20", nr35: "2025-10-20", dataRescisao: "", status: "Férias", abandono: "", atestado: "", estadoCivil: "Solteiro", nacionalidade: "Brasileiro", endereco: "Rua Nova, 200", bairro: "Liberdade", cidade: "São Paulo", uf: "SP", cep: "01500-000", ctps: "567890", serieCtps: "0005", tituloEleitor: "", zonaEleitoral: "", secaoEleitoral: "", cnh: "", categoriaCnh: "", validadeCnh: "", nomeMae: "Claudia Souza", nomePai: "", escolaridade: "Ensino Fundamental", banco: "Nubank", agencia: "0001", conta: "12345678-9", tipoConta: "Corrente", dependentes: 1 },
];

export function getExamStatus(dateStr: string, validityYears: number): "ok" | "warning" | "expired" {
  if (!dateStr) return "expired";
  const examDate = new Date(dateStr);
  const expiry = new Date(examDate);
  expiry.setFullYear(expiry.getFullYear() + validityYears);
  const now = new Date();
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < 30) return "warning";
  return "ok";
}
