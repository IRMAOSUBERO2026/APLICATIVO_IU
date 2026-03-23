import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { HorarioPadrao } from "./EspelhoPonto";

const DIAS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
] as const;

const DEFAULT: HorarioPadrao = {
  seg: { e1: "07:00", s1: "12:00", e2: "13:00", s2: "17:00" },
  ter: { e1: "07:00", s1: "12:00", e2: "13:00", s2: "17:00" },
  qua: { e1: "07:00", s1: "12:00", e2: "13:00", s2: "17:00" },
  qui: { e1: "07:00", s1: "12:00", e2: "13:00", s2: "17:00" },
  sex: { e1: "07:00", s1: "12:00", e2: "13:00", s2: "16:00" },
  sab: { e1: "", s1: "", e2: "", s2: "" },
  dom: { e1: "", s1: "", e2: "", s2: "" },
};

interface Props {
  obraId: string;
  obraNome: string;
  initial: HorarioPadrao | null;
  onSaved: (h: HorarioPadrao) => void;
  onClose: () => void;
}

function calcHours(p: { e1: string; s1: string; e2: string; s2: string }) {
  let total = 0;
  const toMin = (t: string) => { if (!t) return null; const [h,m] = t.split(":").map(Number); return h*60+m; };
  const a = toMin(p.e1), b = toMin(p.s1), c = toMin(p.e2), d = toMin(p.s2);
  if (a !== null && b !== null) total += b - a;
  if (c !== null && d !== null) total += d - c;
  return total > 0 ? `${Math.floor(total/60)}h${String(total%60).padStart(2,"0")}` : "—";
}

export function HorarioPadraoEditor({ obraId, obraNome, initial, onSaved, onClose }: Props) {
  const { toast } = useToast();
  const [horario, setHorario] = useState<HorarioPadrao>(initial ?? DEFAULT);
  const [saving, setSaving] = useState(false);

  const handleChange = (dia: string, field: "e1"|"s1"|"e2"|"s2", value: string) => {
    setHorario(prev => ({
      ...prev,
      [dia]: { ...prev[dia as keyof HorarioPadrao], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("obras")
      .update({ horario_padrao: horario as any })
      .eq("id", obraId);

    if (error) {
      toast({ title: "Erro ao salvar horário", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Horário padrão salvo!" });
      onSaved(horario);
    }
    setSaving(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Horário Padrão — {obraNome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_50px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
          <span>Dia</span>
          <span>Entrada 1</span>
          <span>Saída 1</span>
          <span>Entrada 2</span>
          <span>Saída 2</span>
          <span className="text-right">Total</span>
        </div>

        {DIAS.map(({ key, label }) => (
          <div key={key} className={`grid grid-cols-[100px_1fr_1fr_1fr_1fr_50px] gap-2 items-center ${
            key === "sab" || key === "dom" ? "opacity-60" : ""
          }`}>
            <Label className="text-xs font-medium">{label}</Label>
            <Input type="time" value={horario[key as keyof HorarioPadrao].e1}
              onChange={e => handleChange(key, "e1", e.target.value)} className="h-8 text-xs" />
            <Input type="time" value={horario[key as keyof HorarioPadrao].s1}
              onChange={e => handleChange(key, "s1", e.target.value)} className="h-8 text-xs" />
            <Input type="time" value={horario[key as keyof HorarioPadrao].e2}
              onChange={e => handleChange(key, "e2", e.target.value)} className="h-8 text-xs" />
            <Input type="time" value={horario[key as keyof HorarioPadrao].s2}
              onChange={e => handleChange(key, "s2", e.target.value)} className="h-8 text-xs" />
            <span className="text-xs text-right font-mono text-muted-foreground">
              {calcHours(horario[key as keyof HorarioPadrao])}
            </span>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2" size="sm">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Horário"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
