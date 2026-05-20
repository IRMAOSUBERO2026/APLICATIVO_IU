import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseAFD, type ParseResult } from "@/utils/pontoParser";
import { detectarInconsistencias } from "@/utils/motorInconsistencias";
import { Link } from "react-router-dom";
import { parseISO } from "date-fns";

export default function ImportacaoAFDNew() {
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [selectedEq, setSelectedEq] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("ponto_equipamentos")
      .select("id, serial_numero, modelo, obras:obra_id(nome)")
      .eq("ativo", true)
      .then(({ data }) => { if (data) setEquipamentos(data); });
  }, []);

  const handleProcess = async () => {
    if (!selectedEq || !file) {
      toast({ title: "Erro", description: "Selecione um equipamento e um arquivo.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const r = await parseAFD(text, selectedEq);
      setResult(r);
      
      if (r.erros.length > 0) {
        toast({ title: "Importação concluída com avisos", description: `${r.erros.length} erros detectados.`, variant: "destructive" });
      } else {
        toast({ title: "Sucesso!", description: "Arquivo processado e batidas importadas." });
      }

      // Rodar motor de inconsistências para as datas processadas
      if (eq?.obra_id) {
        for (const dataStr of r.datasProcessadas) {
          await detectarInconsistencias(eq.obra_id, parseISO(dataStr));
        }
      }

      // Registrar log de importação
      const { data: eq } = await supabase.from("ponto_equipamentos").select("obra_id").eq("id", selectedEq).single();
      
      await supabase.from("ponto_importacoes_log").insert({
        equipamento_id: selectedEq,
        obra_id: eq?.obra_id,
        arquivo_nome: file.name,
        total_registros: r.total,
        registros_biometricos: r.biometricos,
        pis_desconhecidos: r.desconhecidos,
        status: r.erros.length === 0 ? "concluido" : "aviso",
        erros: r.erros.join("\n"),
      });

    } catch (error: any) {
      toast({ title: "Erro fatal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importação de AFD</h1>
          <p className="text-sm text-muted-foreground">Importe o arquivo original do relógio de ponto (Portaria 671)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <Label>1. Selecione o Equipamento de Origem</Label>
                <select
                  value={selectedEq}
                  onChange={(e) => setSelectedEq(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione o relógio...</option>
                  {equipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.serial_numero} - {eq.modelo} ({eq.obras?.nome})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>2. Upload do Arquivo .txt (AFD)</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".txt" 
                    className="hidden" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${file ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {file ? <CheckCircle2 className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                    </div>
                    {file ? (
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">Clique para selecionar o arquivo</p>
                        <p className="text-xs text-muted-foreground">Apenas arquivos .txt originais do relógio</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleProcess} 
                disabled={loading || !selectedEq || !file} 
                className="w-full h-12 text-lg font-bold"
              >
                {loading ? "Processando..." : "Processar Arquivo"}
              </Button>
            </div>

            {result && (
              <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-bold text-lg mb-4">Resultado do Processamento</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Lidos</p>
                    <p className="text-2xl font-bold">{result.total}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10">
                    <p className="text-[10px] text-success uppercase font-bold">Batidas</p>
                    <p className="text-2xl font-bold text-success">{result.biometricos}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10">
                    <p className="text-[10px] text-warning uppercase font-bold">Desconhecidos</p>
                    <p className="text-2xl font-bold text-warning">{result.desconhecidos}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <p className="text-[10px] text-destructive uppercase font-bold">Erros</p>
                    <p className="text-2xl font-bold text-destructive">{result.erros.length}</p>
                  </div>
                </div>

                {result.desconhecidos > 0 && (
                  <div className="mt-4 p-4 rounded-lg border border-warning/30 bg-warning/5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-warning">Atenção: PIS Desconhecidos</p>
                      <p className="text-xs text-muted-foreground mb-3">Detectamos batidas de funcionários que ainda não possuem o PIS cadastrado no sistema.</p>
                      <Link to="/ponto/inconsistencias">
                        <Button variant="outline" size="sm" className="gap-2 border-warning/30 text-warning hover:bg-warning/10">
                          Resolver no Painel <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {result.erros.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-bold">Detalhes dos Erros:</p>
                    <div className="max-h-32 overflow-y-auto rounded bg-muted p-2 text-[10px] font-mono whitespace-pre">
                      {result.erros.join("\n")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-primary/5 p-5">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Dicas de Importação
              </h4>
              <ul className="text-xs space-y-3 text-muted-foreground">
                <li>• O arquivo deve ser o <b>AFD (Arquivo de Fonte de Dados)</b> bruto exportado pelo relógio.</li>
                <li>• Certifique-se de que o equipamento selecionado corresponde ao local de origem do arquivo.</li>
                <li>• Funcionários novos devem ter o <b>PIS preenchido</b> no cadastro para serem reconhecidos automaticamente.</li>
                <li>• Batidas duplicadas (mesma sequência no mesmo relógio) são ignoradas automaticamente.</li>
              </ul>
            </div>
            
            <Link to="/ponto/inconsistencias" className="block">
              <div className="rounded-xl border p-5 hover:bg-muted/50 transition-colors">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Próximo Passo</p>
                <p className="font-bold">Gerir Inconsistências</p>
                <p className="text-xs text-muted-foreground mt-1">Verifique faltas, batidas incompletas e PIS desconhecidos.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
