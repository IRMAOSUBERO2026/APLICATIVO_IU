import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EspelhoPonto, type HorarioPadrao, type PontoResult } from "./EspelhoPonto";
import { FolhaInputForm } from "./FolhaInputForm";
import { FolhaResultado } from "./FolhaResultado";
import { calcularFolha, type FolhaInput, type FolhaOutput } from "@/lib/motorFolha";
import {
  Calculator, CheckCircle, Save, User, ArrowLeft, RotateCcw, Clock, Eye, EyeOff, Play,
} from "lucide-react";

interface FuncionarioData {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  salario_base: number;
  salario_combinado: number | null;
  tipo_remuneracao?: string;
  escala?: string;
}

interface Props {
  funcionario: FuncionarioData;
  initialInput: FolhaInput;
  initialResult: FolhaOutput | null;
  isSaved: boolean;
  mes: string;
  mesIdx: number;
  ano: number;
  saving: boolean;
  horarioPadrao: HorarioPadrao | null;
  onInputChange: (data: FolhaInput) => void;
  onFechamento: () => void;
  onSalvarRascunho: () => void;
  onVoltar: () => void;
  isSimulacao?: boolean;
  onToggleSimulacao?: () => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FolhaCalculoIndividual({
  funcionario,
  initialInput,
  initialResult,
  isSaved,
  mes,
  mesIdx,
  ano,
  saving,
  horarioPadrao,
  onInputChange,
  onFechamento,
  onSalvarRascunho,
  onVoltar,
  isSimulacao = false,
  onToggleSimulacao,
}: Props) {
  const [input, setInput] = useState<FolhaInput>(initialInput);
  const [showPonto, setShowPonto] = useState(false);
  const [result, setResult] = useState<FolhaOutput | null>(initialResult);

  const handleChange = (data: FolhaInput) => {
    setInput(data);
    onInputChange(data);
  };

  const handlePontoResult = (pontoResult: PontoResult) => {
    const updated = {
      ...input,
      horas_extras_semanais: pontoResult.horasExtrasSemanais,
      horas_extras_sabado: pontoResult.horasExtrasSabado,
      horas_extras_100: pontoResult.horasExtras100,
      horas_negativas: pontoResult.horasNegativas,
      faltas: pontoResult.faltas,
      atestados: pontoResult.atestados ?? 0,
      semanas_com_falta: pontoResult.semanasComFalta ?? 0,
    };
    setInput(updated);
    onInputChange(updated);
  };

  const handleSimular = () => {
    const res = calcularFolha(input);
    setResult(res);
  };

  const handleReset = () => {
    const sc = funcionario.salario_combinado ?? funcionario.salario_base;
    const reset: FolhaInput = {
      ...input,
      tipo_remuneracao: (funcionario.tipo_remuneracao as "mensal" | "producao") ?? "mensal",
      valor_producao: 0,
      horas_extras_semanais: 0,
      horas_extras_sabado: 0,
      horas_extras_100: 0,
      horas_negativas: 0,
      faltas: 0,
      atestados: 0,
      semanas_com_falta: 0,
      bonificacao_meta: 0,
      bonificacao_assiduidade: 0,
      desconto_marmita: 0,
      qtd_marmitas: 0,
      valor_marmita_unitario: 0,
      desconto_vale: 0,
      desconto_emprestimo: 0,
      desconto_adiantamento: 0,
      desconto_sindicato: 0,
      outros_descontos: 0,
      salario_registro: funcionario.salario_base,
      salario_combinado: sc,
    };
    setInput(reset);
    onInputChange(reset);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">{funcionario.nome}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {funcionario.cargo} • {funcionario.escala ?? "5x2"} • {mes}/{ano}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSimulacao && <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Simulação</Badge>}
              {isSaved ? (
                <Badge variant="default" className="text-xs gap-1"><CheckCircle className="h-3 w-3" /> Fechado</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Pendente</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-1 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowPonto(!showPonto)} className="gap-1 text-xs">
          <Clock className="h-3.5 w-3.5" /> {showPonto ? "Ocultar Ponto" : "Espelho Ponto"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Limpar
        </Button>
        <Button variant="default" size="sm" onClick={handleSimular} className="gap-1 text-xs bg-amber-600 hover:bg-amber-700">
          <Play className="h-3.5 w-3.5" /> Simular Cálculo
        </Button>
        {onToggleSimulacao && (
          <Button variant="outline" size="sm" onClick={onToggleSimulacao} className="gap-1 text-xs">
            {isSimulacao ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {isSimulacao ? "Sair Simulação" : "Modo Simulação"}
          </Button>
        )}
        <div className="flex-1" />
        {!isSimulacao && (
          <>
            <Button variant="secondary" size="sm" onClick={onSalvarRascunho} disabled={saving} className="gap-1 text-xs">
              <Save className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Rascunho"}
            </Button>
            <Button size="sm" onClick={onFechamento} disabled={saving} className="gap-1 text-xs">
              <CheckCircle className="h-3.5 w-3.5" /> {saving ? "Fechando..." : "Fechar Mês"}
            </Button>
          </>
        )}
      </div>

      {/* Espelho Ponto (full width above 3 panels) */}
      {showPonto && (
        <EspelhoPonto
          mes={mesIdx}
          ano={ano}
          horarioPadrao={horarioPadrao}
          onResult={handlePontoResult}
        />
      )}

      {/* 3-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_280px] gap-3">
        {/* LEFT: Calendar summary / HE details */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold">📅 Ponto & Horas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">HE Semanais</label>
                <input
                  type="number" min={0} step={0.5}
                  value={input.horas_extras_semanais}
                  onChange={e => handleChange({ ...input, horas_extras_semanais: Number(e.target.value) || 0 })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">HE Sábado</label>
                <input
                  type="number" min={0} step={0.5}
                  value={input.horas_extras_sabado}
                  onChange={e => handleChange({ ...input, horas_extras_sabado: Number(e.target.value) || 0 })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">HE 100%</label>
                <input
                  type="number" min={0} step={0.5}
                  value={input.horas_extras_100}
                  onChange={e => handleChange({ ...input, horas_extras_100: Number(e.target.value) || 0 })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Horas Negativas</label>
                <input
                  type="number" min={0} step={0.5}
                  value={input.horas_negativas}
                  onChange={e => handleChange({ ...input, horas_negativas: Number(e.target.value) || 0 })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">FALTAS & ATESTADOS</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Faltas</label>
                  <input
                    type="number" min={0}
                    value={input.faltas}
                    onChange={e => handleChange({ ...input, faltas: Number(e.target.value) || 0 })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Atestados</label>
                  <input
                    type="number" min={0}
                    value={input.atestados}
                    onChange={e => handleChange({ ...input, atestados: Number(e.target.value) || 0 })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Sem. c/ Falta</label>
                  <input
                    type="number" min={0}
                    value={input.semanas_com_falta}
                    onChange={e => handleChange({ ...input, semanas_com_falta: Number(e.target.value) || 0 })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Quick info */}
            <div className="border-t pt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <p className="text-muted-foreground">Base/Dia</p>
                <p className="font-semibold">{fmt(result.base_dia)}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <p className="text-muted-foreground">Base/Hora</p>
                <p className="font-semibold">{fmt(result.base_hora)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CENTER: Config & Discounts */}
        <div className="space-y-3">
          <FolhaInputForm data={input} onChange={handleChange} />
        </div>

        {/* RIGHT: Live summary */}
        <div className="space-y-3">
          <FolhaResultado result={result} />
        </div>
      </div>
    </div>
  );
}
