import { AppLayout } from "@/components/layout/AppLayout";
import { HardHat, Plus, Search, MapPin, Calendar, FolderOpen } from "lucide-react";
import { useState } from "react";
import { DocumentManagerGeneric } from "@/components/shared/DocumentManagerGeneric";

const SUBPASTAS_OBRA = [
  "Contrato",
  "Adicionais",
  "Medições",
  "Projetos",
  "Notas Fiscais",
  "Diário de Obra",
  "Reuniões e Atas",
  "Documentos de Segurança",
  "Documentos Diversos",
  "Outros",
];

const obrasData = [
  {
    id: 1, nome: "Edifício Aurora", cliente: "Construtora Horizonte", local: "São Paulo, SP",
    inicio: "2025-08-15", previsao: "2026-12-30", contrato: 2400000, medido: 1632000,
    status: "Em andamento", progresso: 68,
  },
  {
    id: 2, nome: "Galpão Industrial Alfa", cliente: "Logística Norte", local: "Campinas, SP",
    inicio: "2025-11-01", previsao: "2026-08-15", contrato: 1100000, medido: 495000,
    status: "Em andamento", progresso: 45,
  },
  {
    id: 3, nome: "Ponte BR-101 Km 42", cliente: "DNIT", local: "Joinville, SC",
    inicio: "2025-03-10", previsao: "2026-06-30", contrato: 3800000, medido: 3116000,
    status: "Medição pendente", progresso: 82,
  },
  {
    id: 4, nome: "Residencial Sol Nascente", cliente: "Inc. Solar", local: "Curitiba, PR",
    inicio: "2026-02-01", previsao: "2027-06-30", contrato: 890000, medido: 106800,
    status: "Iniciando", progresso: 12,
  },
];

export default function Obras() {
  const [search, setSearch] = useState("");
  const [docOpen, setDocOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState<{ id: string; nome: string } | null>(null);

  const filtered = obrasData.filter((o) =>
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const openDocs = (obra: typeof obrasData[0]) => {
    setSelectedObra({ id: String(obra.id), nome: obra.nome });
    setDocOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Obras</h1>
            <p className="text-sm text-muted-foreground">{obrasData.length} obras cadastradas</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Nova Obra
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar obra ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((obra) => (
            <div
              key={obra.id}
              className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer animate-fade-in"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <HardHat className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{obra.nome}</h3>
                    <p className="text-xs text-muted-foreground">{obra.cliente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); openDocs(obra); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                    title="Pasta de Documentos"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </button>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    obra.status === "Em andamento" ? "bg-success/10 text-success"
                    : obra.status === "Medição pendente" ? "bg-warning/10 text-warning"
                    : "bg-accent/10 text-accent"
                  }`}>
                    {obra.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {obra.local}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Previsão: {new Date(obra.previsao).toLocaleDateString("pt-BR")}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{obra.progresso}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${obra.progresso}%` }} />
                  </div>
                </div>

                {/* Values */}
                <div className="flex justify-between border-t pt-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Contrato</p>
                    <p className="font-semibold">R$ {(obra.contrato / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Medido</p>
                    <p className="font-semibold">R$ {(obra.medido / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedObra && (
        <DocumentManagerGeneric
          open={docOpen}
          onOpenChange={setDocOpen}
          entityId={selectedObra.id}
          entityNome={selectedObra.nome}
          basePath="obras"
          subpastas={SUBPASTAS_OBRA}
        />
      )}
    </AppLayout>
  );
}