import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseControlIdPDF, type PontoFuncionario } from "@/lib/parseControlIdPDF";
import { Badge } from "@/components/ui/badge";

interface Props {
  funcionariosCpfs: { cpf: string; idx: number }[];
  onImport: (data: Map<string, { faltas: number; heSemanais: number }>) => void;
}

export function ImportarPontoPDF({ funcionariosCpfs, onImport }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const pontos = await parseControlIdPDF(file);
      
      if (pontos.length === 0) {
        toast({ title: "Nenhum funcionário encontrado no PDF", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Normalize CPFs (remove dots and dashes)
      const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");
      
      // Build a map: CPF -> ponto data
      const pontoMap = new Map<string, PontoFuncionario>();
      for (const p of pontos) {
        pontoMap.set(normalizeCpf(p.cpf), p);
      }

      // Match with funcionarios
      const importData = new Map<string, { faltas: number; heSemanais: number }>();
      let matched = 0;

      for (const f of funcionariosCpfs) {
        const cpfNorm = normalizeCpf(f.cpf);
        const ponto = pontoMap.get(cpfNorm);
        if (ponto) {
          matched++;
          importData.set(cpfNorm, {
            faltas: ponto.faltas,
            heSemanais: ponto.extraDiurnaHoras,
          });
        }
      }

      setMatchCount(matched);
      setImported(true);
      onImport(importData);
      
      toast({
        title: `Ponto importado: ${matched}/${funcionariosCpfs.length} funcionários`,
        description: `${pontos.length} registros no PDF, ${matched} correspondências por CPF`,
      });
    } catch (err: any) {
      console.error("Erro ao processar PDF:", err);
      toast({ title: "Erro ao processar PDF", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        onChange={handleFile}
        className="hidden"
        id="ponto-pdf-input"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : imported ? (
          <FileCheck className="h-4 w-4 text-green-600" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {loading ? "Processando..." : "Importar Ponto (PDF)"}
      </Button>
      {imported && (
        <Badge variant="secondary" className="text-xs">
          {matchCount} importados
        </Badge>
      )}
    </div>
  );
}
