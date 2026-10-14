import { Link } from "react-router-dom";
import { AlertTriangle, BriefcaseBusiness, ChevronRight, FileWarning, ShieldCheck, Stethoscope } from "lucide-react";
import { AlertaConformidade, CategoriaConformidade, FaixaConformidade } from "@/lib/conformidadeAlertas";

const categorias: Array<{ chave: CategoriaConformidade; rotulo: string; icon: typeof Stethoscope }> = [
  { chave: "aso", rotulo: "ASO", icon: Stethoscope },
  { chave: "nr", rotulo: "Treinamentos NR", icon: ShieldCheck },
  { chave: "experiencia", rotulo: "Experiência", icon: BriefcaseBusiness },
  { chave: "contrato", rotulo: "Contratos", icon: FileWarning },
];

const faixaLabel: Record<FaixaConformidade, string> = {
  vencido: "Vencido",
  sem_documento: "Pendente",
  "7_dias": "Até 7 dias",
  "15_dias": "Até 15 dias",
  "30_dias": "Até 30 dias",
};

export function CentralConformidade({ alertas, loading }: { alertas: AlertaConformidade[]; loading: boolean }) {
  const criticos = alertas.filter((item) => item.faixa === "vencido" || item.faixa === "sem_documento" || item.faixa === "7_dias").length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border bg-primary px-5 py-4 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary-foreground">Central de Blindagem Trabalhista</h2>
            <p className="text-xs text-primary-foreground/75">Documentos, experiência e contratos que exigem atenção</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{loading ? "—" : criticos}</span>
          <span className="text-xs font-medium uppercase">críticos</span>
        </div>
      </div>

      <div className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-4">
        {categorias.map(({ chave, rotulo, icon: Icon }, index) => {
          const total = alertas.filter((item) => item.categoria === chave).length;
          return (
            <div key={chave} className={`flex items-center gap-3 px-5 py-4 ${index < categorias.length - 1 ? "lg:border-r lg:border-border" : ""}`}>
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{loading ? "—" : total}</p>
                <p className="text-xs text-muted-foreground">{rotulo}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="divide-y divide-border">
        {!loading && alertas.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-success">
            <ShieldCheck className="h-5 w-5" /> Nenhuma pendência de conformidade nos próximos 30 dias.
          </div>
        )}
        {loading && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Verificando vencimentos...</p>}
        {!loading && alertas.slice(0, 6).map((alerta) => {
          const urgente = alerta.faixa === "vencido" || alerta.faixa === "sem_documento" || alerta.faixa === "7_dias";
          return (
            <Link key={alerta.id} to={alerta.link} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${urgente ? "bg-destructive" : "bg-warning"}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{alerta.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{alerta.descricao}</p>
              </div>
              <span className={`hidden rounded-md px-2 py-1 text-[10px] font-semibold sm:block ${urgente ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                {faixaLabel[alerta.faixa]}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
      {alertas.length > 6 && (
        <Link to="/rh/seguranca/painel" className="block border-t border-border px-5 py-3 text-center text-xs font-semibold text-primary hover:bg-muted/40">
          Ver todas as {alertas.length} pendências
        </Link>
      )}
    </section>
  );
}