import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const PIPELINE_STAGES = [
  { value: "prospeccao", label: "Prospecção", color: "bg-muted text-muted-foreground", emoji: "🔍" },
  { value: "orcamento", label: "Orçamento", color: "bg-yellow-500/10 text-yellow-700", emoji: "🟡" },
  { value: "proposta_enviada", label: "Proposta Enviada", color: "bg-orange-500/10 text-orange-700", emoji: "📨" },
  { value: "negociacao", label: "Negociação", color: "bg-amber-500/10 text-amber-700", emoji: "🟠" },
  { value: "contrato_fechado", label: "Contrato Fechado", color: "bg-blue-500/10 text-blue-700", emoji: "📋" },
  { value: "em_execucao", label: "Em Execução", color: "bg-green-500/10 text-green-700", emoji: "🟢" },
  { value: "finalizada", label: "Finalizada", color: "bg-slate-500/10 text-slate-600", emoji: "🔵" },
  { value: "paralisada", label: "Paralisada", color: "bg-red-500/10 text-red-600", emoji: "⛔" },
] as const;

export const getStageIndex = (status: string) => {
  const idx = PIPELINE_STAGES.findIndex(s => s.value === status);
  return idx >= 0 ? idx : 0;
};

export const getStage = (status: string) => {
  return PIPELINE_STAGES.find(s => s.value === status) || PIPELINE_STAGES[0];
};

export const isContractClosed = (status: string) => {
  const idx = getStageIndex(status);
  return idx >= 4; // contrato_fechado or later (excluding paralisada which is idx 7)
};

interface Props {
  currentStatus: string;
  onChangeStatus?: (status: string) => void;
  compact?: boolean;
}

export function ObraPipeline({ currentStatus, onChangeStatus, compact }: Props) {
  const currentIdx = getStageIndex(currentStatus);
  // Don't show paralisada in pipeline, it's a special status
  const mainStages = PIPELINE_STAGES.filter(s => s.value !== "paralisada");

  if (compact) {
    const stage = getStage(currentStatus);
    return (
      <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", stage.color)}>
        {stage.emoji} {stage.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {mainStages.map((stage, idx) => {
        const stageIdx = PIPELINE_STAGES.findIndex(s => s.value === stage.value);
        const isActive = currentStatus === stage.value;
        const isPast = currentIdx > stageIdx;
        const isFuture = currentIdx < stageIdx;

        return (
          <div key={stage.value} className="flex items-center">
            <button
              onClick={() => onChangeStatus?.(stage.value)}
              disabled={!onChangeStatus}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                isActive && "ring-2 ring-primary bg-primary/10 text-primary font-semibold",
                isPast && !isActive && "bg-primary/5 text-primary/70",
                isFuture && "bg-muted/50 text-muted-foreground/60",
                onChangeStatus && "cursor-pointer hover:opacity-80"
              )}
            >
              {isPast && !isActive ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="text-xs">{stage.emoji}</span>
              )}
              <span className="hidden sm:inline">{stage.label}</span>
            </button>
            {idx < mainStages.length - 1 && (
              <div className={cn(
                "w-4 h-0.5 mx-0.5",
                isPast ? "bg-primary/40" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
