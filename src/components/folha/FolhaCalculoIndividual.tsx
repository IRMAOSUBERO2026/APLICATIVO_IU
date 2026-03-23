import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FolhaInputForm } from "./FolhaInputForm";
import { FolhaResultado } from "./FolhaResultado";
import { EspelhoPonto, type HorarioPadrao, type PontoResult } from "./EspelhoPonto";
import { calcularFolha, type FolhaInput, type FolhaOutput } from "@/lib/motorFolha";
import { Calculator, CheckCircle, Save, User, ArrowLeft, RotateCcw, Clock } from "lucide-react";

interface FuncionarioData {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  salario_base: number;
  salario_combinado: number | null;
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
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FolhaCalculoIndividual({
  funcionario,
  initialInput,
  initialResult,
  isSaved,
  mes,
  ano,
  saving,
  onInputChange,
  onFechamento,
  onSalvarRascunho,
  onVoltar,
}: Props) {
  const [input, setInput] = useState<FolhaInput>(initialInput);
  const [result, setResult] = useState<FolhaOutput | null>(initialResult);
  const [calculated, setCalculated] = useState(initialResult !== null);

  const handleChange = (data: FolhaInput) => {
    setInput(data);
    setResult(null);
    setCalculated(false);
    onInputChange(data);
  };

  const handleCalc = () => {
    const r = calcularFolha(input);
    setResult(r);
    setCalculated(true);
  };

  const handleReset = () => {
    const sc = funcionario.salario_combinado ?? funcionario.salario_base;
    const reset: FolhaInput = {
      ...input,
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
      desconto_vale: 0,
      desconto_emprestimo: 0,
      outros_descontos: 0,
      salario_registro: funcionario.salario_base,
      salario_combinado: sc,
    };
    setInput(reset);
    setResult(null);
    setCalculated(false);
    onInputChange(reset);
  };

  return (
    <div className="space-y-4">
      {/* Header do Funcionário */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">{funcionario.nome}</h2>
                <p className="text-xs text-muted-foreground">
                  {funcionario.cargo} • CPF: {funcionario.cpf} • {mes}/{ano}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaved ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" /> Fechado
                </Badge>
              ) : calculated ? (
                <Badge variant="secondary">Calculado</Badge>
              ) : (
                <Badge variant="outline">Pendente</Badge>
              )}
            </div>
          </div>

          <Separator className="my-3" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Salário Registro</p>
              <p className="font-semibold text-sm">{fmt(funcionario.salario_base)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salário Combinado</p>
              <p className="font-semibold text-sm">{fmt(funcionario.salario_combinado ?? funcionario.salario_base)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salário Final</p>
              <p className={`font-bold text-sm ${result ? "text-primary" : "text-muted-foreground"}`}>
                {result ? fmt(result.salario_final) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Inputs */}
      <FolhaInputForm data={input} onChange={handleChange} />

      {/* Barra de Ações */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Limpar
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCalc} className="gap-2">
                <Calculator className="h-4 w-4" /> Calcular
              </Button>
              {calculated && result && (
                <Button variant="secondary" onClick={onSalvarRascunho} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Rascunho"}
                </Button>
              )}
              <Button onClick={() => { handleCalc(); onFechamento(); }} disabled={saving} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {saving ? "Fechando..." : "Fechamento Mensal"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {result && <FolhaResultado result={result} />}
    </div>
  );
}
