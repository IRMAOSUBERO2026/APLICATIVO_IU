import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HardHat, Users, CheckCircle, Clock, DollarSign, ArrowRight } from "lucide-react";

interface ObraResumo {
  id: string;
  nome: string;
  codigo: string;
  totalFuncionarios: number;
  fechados: number;
  pendentes: number;
  folhaEstimada: number;
}

interface Props {
  obras: ObraResumo[];
  mes: string;
  ano: number;
  totalObras: number;
  totalFuncionarios: number;
  totalFechados: number;
  totalPendentes: number;
  totalFolhaEstimada: number;
  onSelectObra: (obraId: string) => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FolhaDashboard({
  obras,
  mes,
  ano,
  totalObras,
  totalFuncionarios,
  totalFechados,
  totalPendentes,
  totalFolhaEstimada,
  onSelectObra,
}: Props) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <HardHat className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Obras Ativas</p>
                <p className="text-2xl font-bold">{totalObras}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary p-2.5">
                <Users className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Funcionários</p>
                <p className="text-2xl font-bold">{totalFuncionarios}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2.5">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fechados</p>
                <p className="text-2xl font-bold">{totalFechados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{totalPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Folha Estimada</p>
                <p className="text-lg font-bold">{fmt(totalFolhaEstimada)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Obra */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="h-4 w-4" /> Resumo por Obra — {mes}/{ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {obras.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma obra ativa com funcionários encontrada.
            </p>
          )}
          {obras.map((obra) => {
            const progress = obra.totalFuncionarios > 0
              ? Math.round((obra.fechados / obra.totalFuncionarios) * 100)
              : 0;
            const allDone = obra.fechados === obra.totalFuncionarios && obra.totalFuncionarios > 0;

            return (
              <div
                key={obra.id}
                className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm truncate">{obra.codigo} — {obra.nome}</p>
                    {allDone && (
                      <Badge variant="default" className="text-xs shrink-0">100% Fechado</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {obra.totalFuncionarios} funcionários
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" /> {obra.fechados} fechados
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-600" /> {obra.pendentes} pendentes
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${allDone ? "bg-green-600" : "bg-primary"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <p className="text-sm font-semibold">{fmt(obra.folhaEstimada)}</p>
                  <Button
                    size="sm"
                    variant={allDone ? "outline" : "default"}
                    className="gap-1.5 text-xs"
                    onClick={() => onSelectObra(obra.id)}
                  >
                    {allDone ? "Ver Detalhes" : "Iniciar Cálculos"}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
