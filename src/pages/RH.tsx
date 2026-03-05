import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, Filter, Upload, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Funcionario {
  id: number;
  nome: string;
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
}

const funcionariosData: Funcionario[] = [
  { id: 1, nome: "Carlos Silva", cnpj: "12.345.678/0001-90", empresa: "Irmãos Ubero I", obra: "Ed. Aurora", construtora: "Horizonte", cidadeTrabalho: "São Paulo", admissao: "2023-03-15", cargo: "Pedreiro", nascimento: "1985-06-20", telefone: "(11) 99999-0001", rg: "12.345.678-9", cpf: "123.456.789-00", pis: "123.45678.90-1", codigoPix: "123.456.789-00", salarioBase: 2500, salarioCombinado: 3200, clinica: "MedWork", aso: "2025-11-20", nr6: "2025-11-20", nr12: "2025-01-10", nr18: "2025-01-10", nr35: "2025-01-10", dataRescisao: "", status: "Ativo", abandono: "", atestado: "" },
  { id: 2, nome: "José Santos", cnpj: "12.345.678/0001-90", empresa: "Irmãos Ubero I", obra: "Ed. Aurora", construtora: "Horizonte", cidadeTrabalho: "São Paulo", admissao: "2022-07-20", cargo: "Armador", nascimento: "1990-02-15", telefone: "(11) 99999-0002", rg: "23.456.789-0", cpf: "234.567.890-11", pis: "234.56789.01-2", codigoPix: "234.567.890-11", salarioBase: 2700, salarioCombinado: 3500, clinica: "MedWork", aso: "2026-01-15", nr6: "2026-01-15", nr12: "2024-06-10", nr18: "2024-06-10", nr35: "2024-06-10", dataRescisao: "", status: "Ativo", abandono: "", atestado: "" },
  { id: 3, nome: "Marcos Oliveira", cnpj: "98.765.432/0001-10", empresa: "Irmãos Ubero II", obra: "Galpão Alfa", construtora: "Logística Norte", cidadeTrabalho: "Campinas", admissao: "2024-01-10", cargo: "Carpinteiro", nascimento: "1988-09-05", telefone: "(19) 99999-0003", rg: "34.567.890-1", cpf: "345.678.901-22", pis: "345.67890.12-3", codigoPix: "345.678.901-22", salarioBase: 2300, salarioCombinado: 3000, clinica: "SafeMed", aso: "2026-02-28", nr6: "2026-02-28", nr12: "2025-08-15", nr18: "2025-08-15", nr35: "2025-08-15", dataRescisao: "", status: "Ativo", abandono: "", atestado: "" },
  { id: 4, nome: "Ana Costa", cnpj: "12.345.678/0001-90", empresa: "Irmãos Ubero I", obra: "Ponte BR-101", construtora: "DNIT", cidadeTrabalho: "Joinville", admissao: "2021-11-05", cargo: "Eng. Civil", nascimento: "1992-12-10", telefone: "(47) 99999-0004", rg: "45.678.901-2", cpf: "456.789.012-33", pis: "456.78901.23-4", codigoPix: "456.789.012-33", salarioBase: 9000, salarioCombinado: 12000, clinica: "MedWork", aso: "2025-09-01", nr6: "2025-09-01", nr12: "2024-12-01", nr18: "2024-12-01", nr35: "2024-12-01", dataRescisao: "", status: "Ativo", abandono: "", atestado: "" },
  { id: 5, nome: "Rafael Souza", cnpj: "98.765.432/0001-10", empresa: "Irmãos Ubero II", obra: "Ed. Aurora", construtora: "Horizonte", cidadeTrabalho: "São Paulo", admissao: "2024-08-01", cargo: "Servente", nascimento: "1995-04-25", telefone: "(11) 99999-0006", rg: "56.789.012-3", cpf: "567.890.123-44", pis: "567.89012.34-5", codigoPix: "567.890.123-44", salarioBase: 1800, salarioCombinado: 2200, clinica: "SafeMed", aso: "2026-03-10", nr6: "2026-03-10", nr12: "2025-10-20", nr18: "2025-10-20", nr35: "2025-10-20", dataRescisao: "", status: "Férias", abandono: "", atestado: "" },
];

function getExamStatus(dateStr: string, validityYears: number): "ok" | "warning" | "expired" {
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

function ExamBadge({ date, validityYears, label }: { date: string; validityYears: number; label: string }) {
  const status = getExamStatus(date, validityYears);
  const expiry = date ? new Date(new Date(date).setFullYear(new Date(date).getFullYear() + validityYears)) : null;
  return (
    <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
      status === "ok" ? "bg-success/10 text-success" :
      status === "warning" ? "bg-warning/10 text-warning" :
      "bg-destructive/10 text-destructive"
    }`}>
      {status === "ok" ? <CheckCircle className="h-3 w-3" /> :
       status === "warning" ? <Clock className="h-3 w-3" /> :
       <AlertTriangle className="h-3 w-3" />}
      {label}
      {expiry && <span className="ml-1 opacity-70">{expiry.toLocaleDateString("pt-BR")}</span>}
    </div>
  );
}

function parseCSV(text: string): Partial<Funcionario>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[;\t,]/).map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(/[;\t,]/).map(v => v.trim());
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

export default function RH() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"lista" | "exames">("lista");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [funcionarios, setFuncionarios] = useState(funcionariosData);

  const filtered = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo.toLowerCase().includes(search.toLowerCase()) ||
    f.obra.toLowerCase().includes(search.toLowerCase()) ||
    f.empresa.toLowerCase().includes(search.toLowerCase())
  );

  const examesVencendo = funcionarios.filter(f => {
    return getExamStatus(f.aso, 1) !== "ok" ||
           getExamStatus(f.nr6, 1) !== "ok" ||
           getExamStatus(f.nr12, 2) !== "ok" ||
           getExamStatus(f.nr18, 2) !== "ok" ||
           getExamStatus(f.nr35, 2) !== "ok";
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Erro", description: "Nenhum dado encontrado no arquivo.", variant: "destructive" });
        return;
      }
      toast({ title: "Upload realizado", description: `${parsed.length} registros importados com sucesso.` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
            <p className="text-sm text-muted-foreground">{funcionarios.length} funcionários cadastrados</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importar Excel/CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden" onChange={handleFileUpload} />
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              Novo Funcionário
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button onClick={() => setTab("lista")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "lista" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Lista de Funcionários
          </button>
          <button onClick={() => setTab("exames")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors relative ${tab === "exames" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Exames e Treinamentos
            {examesVencendo.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {examesVencendo.length}
              </span>
            )}
          </button>
        </div>

        {/* Alertas de exames vencendo */}
        {examesVencendo.length > 0 && tab === "exames" && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-warning">Atenção: Exames/Treinamentos vencendo ou vencidos</h3>
            </div>
            <p className="text-xs text-muted-foreground">{examesVencendo.length} funcionário(s) com pendências</p>
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar funcionário, cargo, obra ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {tab === "lista" ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa/CNPJ</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cargo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admissão</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Salário</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {f.nome.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <span className="font-medium">{f.nome}</span>
                            <p className="text-[10px] text-muted-foreground">{f.cpf}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="text-xs font-medium">{f.empresa}</span>
                          <p className="text-[10px] text-muted-foreground">{f.cnpj}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{f.cargo}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{f.obra}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{new Date(f.admissao).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.status === "Ativo" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                        }`}>{f.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        R$ {f.salarioCombinado.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">ASO (1 ano)</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR6 (1 ano)</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR12 (2 anos)</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR18 (2 anos)</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR35 (2 anos)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {f.nome.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="font-medium">{f.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{f.empresa}</td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.aso} validityYears={1} label="ASO" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr6} validityYears={1} label="NR6" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr12} validityYears={2} label="NR12" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr18} validityYears={2} label="NR18" /></td>
                      <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr35} validityYears={2} label="NR35" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
