import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, Filter } from "lucide-react";
import { useState } from "react";

const funcionarios = [
  { id: 1, nome: "Carlos Silva", cargo: "Pedreiro", obra: "Ed. Aurora", admissao: "2023-03-15", status: "Ativo", salario: 3200 },
  { id: 2, nome: "José Santos", cargo: "Armador", obra: "Ed. Aurora", admissao: "2022-07-20", status: "Ativo", salario: 3500 },
  { id: 3, nome: "Marcos Oliveira", cargo: "Carpinteiro", obra: "Galpão Alfa", admissao: "2024-01-10", status: "Ativo", salario: 3000 },
  { id: 4, nome: "Ana Costa", cargo: "Eng. Civil", obra: "Ponte BR-101", admissao: "2021-11-05", status: "Ativo", salario: 12000 },
  { id: 5, nome: "Pedro Lima", cargo: "Mestre de Obras", obra: "Res. Sol", admissao: "2020-06-15", status: "Ativo", salario: 6500 },
  { id: 6, nome: "Rafael Souza", cargo: "Servente", obra: "Ed. Aurora", admissao: "2024-08-01", status: "Férias", salario: 2200 },
  { id: 7, nome: "Lucas Ferreira", cargo: "Op. Betoneira", obra: "Galpão Alfa", admissao: "2023-09-12", status: "Ativo", salario: 2800 },
  { id: 8, nome: "Fernando Dias", cargo: "Encarregado", obra: "Ponte BR-101", admissao: "2019-04-22", status: "Ativo", salario: 5200 },
];

export default function RH() {
  const [search, setSearch] = useState("");
  const filtered = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo.toLowerCase().includes(search.toLowerCase()) ||
    f.obra.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
            <p className="text-sm text-muted-foreground">{funcionarios.length} funcionários cadastrados</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Novo Funcionário
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar funcionário, cargo ou obra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cargo</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Obra</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Admissão</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Salário</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {f.nome.split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="font-medium">{f.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{f.cargo}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{f.obra}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{new Date(f.admissao).toLocaleDateString("pt-BR")}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.status === "Ativo" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">
                      R$ {f.salario.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
