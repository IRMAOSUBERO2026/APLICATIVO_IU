import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, HardHat, Package } from "lucide-react";
import { useState } from "react";

const entregas = [
  { id: 1, data: "2026-03-05", funcionario: "Carlos Silva", obra: "Ed. Aurora", itens: [{ nome: "Capacete", qtd: 1 }, { nome: "Luva de raspa", qtd: 2 }, { nome: "Botina", qtd: 1 }], responsavel: "Pedro Lima" },
  { id: 2, data: "2026-03-04", funcionario: "José Santos", obra: "Ed. Aurora", itens: [{ nome: "Óculos de proteção", qtd: 1 }, { nome: "Protetor auricular", qtd: 2 }], responsavel: "Pedro Lima" },
  { id: 3, data: "2026-03-03", funcionario: "Marcos Oliveira", obra: "Galpão Alfa", itens: [{ nome: "Cinto paraquedista", qtd: 1 }, { nome: "Trava-queda", qtd: 1 }, { nome: "Capacete com jugular", qtd: 1 }], responsavel: "Fernando Dias" },
  { id: 4, data: "2026-03-01", funcionario: "Rafael Souza", obra: "Ed. Aurora", itens: [{ nome: "Luva de raspa", qtd: 2 }, { nome: "Máscara PFF2", qtd: 5 }], responsavel: "Pedro Lima" },
];

const estoqueEPI = [
  { nome: "Capacete", estoque: 45, minimo: 20 },
  { nome: "Luva de raspa", estoque: 8, minimo: 30 },
  { nome: "Botina", estoque: 22, minimo: 15 },
  { nome: "Óculos de proteção", estoque: 35, minimo: 20 },
  { nome: "Protetor auricular", estoque: 60, minimo: 30 },
  { nome: "Cinto paraquedista", estoque: 5, minimo: 10 },
  { nome: "Máscara PFF2", estoque: 12, minimo: 50 },
];

export default function EntregaEPI() {
  const [search, setSearch] = useState("");
  const filtered = entregas.filter(e =>
    e.funcionario.toLowerCase().includes(search.toLowerCase()) ||
    e.obra.toLowerCase().includes(search.toLowerCase())
  );

  const itensCriticos = estoqueEPI.filter(e => e.estoque < e.minimo);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Entrega de EPI</h1>
            <p className="text-sm text-muted-foreground">Controle de entrega vinculado ao estoque</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Nova Entrega
          </button>
        </div>

        {/* Alerta de estoque crítico */}
        {itensCriticos.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="text-sm font-semibold text-destructive mb-2">⚠️ Estoque Crítico de EPI</h3>
            <div className="flex flex-wrap gap-2">
              {itensCriticos.map(item => (
                <span key={item.nome} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  {item.nome}: {item.estoque}/{item.minimo}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Estoque EPI */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {estoqueEPI.map(item => (
            <div key={item.nome} className={`rounded-lg border p-3 text-center ${item.estoque < item.minimo ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}>
              <Package className={`mx-auto h-5 w-5 mb-1 ${item.estoque < item.minimo ? "text-destructive" : "text-primary"}`} />
              <p className="text-xs font-medium truncate">{item.nome}</p>
              <p className={`text-lg font-bold ${item.estoque < item.minimo ? "text-destructive" : ""}`}>{item.estoque}</p>
              <p className="text-[10px] text-muted-foreground">mín: {item.minimo}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar funcionário ou obra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Itens Entregues</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-muted-foreground">{new Date(e.data).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3.5 font-medium">{e.funcionario}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{e.obra}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {e.itens.map((item, i) => (
                          <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                            {item.qtd}x {item.nome}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{e.responsavel}</td>
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
