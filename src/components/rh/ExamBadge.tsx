import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { getExamStatus } from "./types";

export function ExamBadge({ date, validityYears, label }: { date: string; validityYears: number; label: string }) {
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
