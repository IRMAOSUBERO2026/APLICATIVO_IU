import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcularVencimento, calcularStatus } from "@/utils/seguranca";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

export default function ImportacaoHistoricoASO() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ importados: number; naoEncontrados: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processarPlanilha = async (dadosBrutos: any[]) => {
    // Buscar todos os funcionários e clínicas para fazer o match em memória
    const [{ data: funcs }, { data: clins }] = await Promise.all([
      supabase.from("funcionarios").select("id, nome, numero_registro, obra_id").eq("status", "ativo"),
      supabase.from("seguranca_clinicas").select("id, nome").eq("ativo", true)
    ]);

    const funcionariosAtivos = funcs || [];
    const clinicasAtivas = clins || [];
    const naoEncontrados: string[] = [];
    const docsParaInserir: any[] = [];

    // Colunas esperadas na planilha: ID | NOME DO FUNCIONARIO | CLINICA | ASO | NR6 | NR12 | NR18 | NR35
    for (const row of dadosBrutos) {
      const rowId = row["ID"]?.toString().trim();
      const rowNome = row["NOME DO FUNCIONARIO"]?.toString().trim();
      const rowClinica = row["CLINICA"]?.toString().trim();

      if (!rowId && !rowNome) continue;

      // 1. Achar funcionário (por numero_registro ou por nome parcial)
      let funcionarioEncontrado = funcionariosAtivos.find(f => f.numero_registro === rowId);
      if (!funcionarioEncontrado && rowNome) {
        funcionarioEncontrado = funcionariosAtivos.find(f => f.nome.toLowerCase() === rowNome.toLowerCase());
      }

      if (!funcionarioEncontrado) {
        naoEncontrados.push(`${rowId || ""} - ${rowNome || "Sem nome"}`);
        continue;
      }

      // 2. Achar clínica (match parcial)
      let clinicaId = null;
      if (rowClinica) {
        const c = clinicasAtivas.find(c => c.nome.toLowerCase().includes(rowClinica.toLowerCase()));
        if (c) clinicaId = c.id;
      }

      // 3. Processar cada tipo de exame
      const tipos = ["ASO", "NR6", "NR12", "NR18", "NR35"];
      
      for (const tipo of tipos) {
        const rawDate = row[tipo];
        if (!rawDate) continue;

        let dataRealizacaoStr = "";
        
        // Tratar data do Excel (pode vir como número de série ou string DD/MM/YYYY)
        if (typeof rawDate === "number") {
          const jsDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
          dataRealizacaoStr = jsDate.toISOString().split("T")[0];
        } else if (typeof rawDate === "string") {
          // Tentar parse DD/MM/YYYY
          const parts = rawDate.split("/");
          if (parts.length === 3) {
             dataRealizacaoStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
             // Tentar ISO fallback
             dataRealizacaoStr = new Date(rawDate).toISOString().split("T")[0];
          }
        }

        if (dataRealizacaoStr && !isNaN(new Date(dataRealizacaoStr).getTime())) {
          const dReal = new Date(dataRealizacaoStr + "T12:00:00");
          const dVenc = calcularVencimento(tipo, dReal);
          const statusCalc = calcularStatus(dVenc);

          docsParaInserir.push({
            funcionario_id: funcionarioEncontrado.id,
            obra_id: funcionarioEncontrado.obra_id,
            clinica_id: clinicaId,
            tipo: tipo,
            subtipo: tipo === "ASO" ? "periodico" : null,
            data_realizacao: dataRealizacaoStr,
            data_vencimento: dVenc.toISOString().split("T")[0],
            status: statusCalc,
            observacoes: "Importado do Histórico Legado"
          });
        }
      }
    }

    // Inserir no banco
    if (docsParaInserir.length > 0) {
      // Chunk insert para evitar limite
      for (let i = 0; i < docsParaInserir.length; i += 100) {
         const { error } = await supabase.from("seguranca_documentos").insert(docsParaInserir.slice(i, i + 100));
         if (error) throw error;
      }
    }

    setResult({
      importados: docsParaInserir.length,
      naoEncontrados
    });
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        await processarPlanilha(json);
        toast({ title: "Importação concluída!" });
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast({ title: "Erro fatal", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Histórico (ASO/NRs)</h1>
          <p className="text-sm text-muted-foreground">Migração de dados da planilha de controle legada para o novo GED</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              
              <div className="space-y-2">
                <Label>1. Upload da Planilha (.xlsx, .csv)</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}`}
                >
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
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
                        <p className="font-medium">Clique para selecionar a planilha</p>
                        <p className="text-xs text-muted-foreground">Deve conter as colunas: ID, NOME, CLINICA, ASO, NR6...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleProcess} 
                disabled={loading || !file} 
                className="w-full h-12 text-lg font-bold"
              >
                {loading ? "Processando..." : "Processar e Importar"}
              </Button>
            </div>

            {result && (
              <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-bold text-lg mb-4">Resultado da Importação</h3>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-success/10 border border-success/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-sm font-bold text-success">Importação de Documentos Concluída</p>
                    <p className="text-2xl font-bold">{result.importados} <span className="text-sm font-normal text-success">registros salvos</span></p>
                  </div>
                </div>

                {result.naoEncontrados.length > 0 && (
                  <div className="p-4 rounded-lg border border-warning/30 bg-warning/5 space-y-2">
                    <div className="flex items-center gap-2 text-warning font-bold">
                      <AlertCircle className="h-5 w-5" />
                      <span>{result.naoEncontrados.length} Funcionários não localizados</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Verifique se o "ID" corresponde ao Nº de Registro no cadastro. Esses funcionários foram ignorados:</p>
                    <div className="max-h-40 overflow-y-auto rounded bg-background border p-2 text-xs font-mono whitespace-pre">
                      {result.naoEncontrados.join("\n")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-primary/5 p-5">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Formato da Planilha
              </h4>
              <p className="text-xs text-muted-foreground mb-3">A primeira linha (cabeçalho) deve conter exatamente estas colunas:</p>
              <ul className="text-xs space-y-1 font-mono bg-background p-2 rounded border">
                <li>ID</li>
                <li>NOME DO FUNCIONARIO</li>
                <li>CLINICA</li>
                <li>ASO</li>
                <li>NR6</li>
                <li>NR12</li>
                <li>...</li>
              </ul>
            </div>
            
            <Link to="/rh/seguranca/painel" className="block">
              <div className="rounded-xl border p-5 hover:bg-muted/50 transition-colors">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Próximo Passo</p>
                <p className="font-bold flex items-center gap-2">Acessar Painel <ArrowRight className="h-4 w-4" /></p>
                <p className="text-xs text-muted-foreground mt-1">Verifique os documentos importados e os alertas gerados.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
