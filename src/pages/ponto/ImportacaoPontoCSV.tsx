import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { parseRHiDCSV } from "@/utils/rhidCsvParser";
import {
  carregarMapeamentos,
  enriquecer,
  importarRHiD,
  type PreviewItem,
  type ImportStats,
} from "@/utils/rhidImport";

const TIPO_LABEL: Record<string, { label: string; cls: string }> = {
  NORMAL: { label: "Normal", cls: "bg-success/10 text-success" },
  FALTA_PARCIAL: { label: "Falta parcial", cls: "bg-warning/10 text-warning" },
  FALTA_DIA_COMPLETO: { label: "Falta", cls: "bg-destructive/10 text-destructive" },
  SEM_REGISTRO: { label: "Sem registro", cls: "bg-muted text-muted-foreground" },
};

export default function ImportacaoPontoCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [parseErros, setParseErros] = useState<string[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fmtData = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleSelect = async (f: File | null) => {
    setFile(f);
    setPreview(null);
    setStats(null);
    setParseErros([]);
    if (!f) return;
    setLoading(true);
    try {
      const text = await f.text();
      const r = parseRHiDCSV(text);
      if (r.registros.length === 0) {
        toast({ title: "Nada encontrado", description: "Nenhum registro válido no arquivo.", variant: "destructive" });
        setParseErros(r.erros);
        return;
      }
      const maps = await carregarMapeamentos();
      const enriched = enriquecer(r.registros, maps);
      setPreview(enriched);
      setParseErros(r.erros);
      toast({ title: "Arquivo lido", description: `${enriched.length} registros prontos para conferência.` });
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !file) return;
    setSaving(true);
    try {
      const s = await importarRHiD(preview, file.name, parseErros);
      setStats(s);
      toast({
        title: "Importação concluída",
        description: `${s.processados} dias importados, ${s.inconsistenciasGeradas} inconsistências geradas.`,
      });
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const naoEncontrados = preview?.filter((p) => !p.funcionarioId).length || 0;
  const obrasNaoEncontradas = preview?.filter((p) => !p.obraId).length || 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importação de Ponto (CSV RHiD)</h1>
          <p className="text-sm text-muted-foreground">
            Importe o relatório CSV exportado do RHiD (ControlID). As marcações são lançadas automaticamente por
            funcionário e dia. Atestados e justificativas podem ser lançados depois no módulo Folha.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <Label>Upload do arquivo .csv (RHiD)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleSelect(e.dataTransfer.files?.[0] || null);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleSelect(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      file ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {file ? <CheckCircle2 className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                  </div>
                  {file ? (
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Arraste ou clique para selecionar o CSV</p>
                      <p className="text-xs text-muted-foreground">Arquivo exportado pelo RHiD (separado por ;)</p>
                    </div>
                  )}
                </div>
              </div>
              {loading && <p className="text-sm text-muted-foreground">Lendo e cruzando com o banco...</p>}
            </div>

            {preview && !stats && (
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-bold text-lg">Conferência ({preview.length} registros)</h3>
                  <Button onClick={handleConfirm} disabled={saving}>
                    {saving ? "Importando..." : "Confirmar Importação"}
                  </Button>
                </div>

                {(naoEncontrados > 0 || obrasNaoEncontradas > 0) && (
                  <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <span>
                      {naoEncontrados} registro(s) com funcionário não encontrado e {obrasNaoEncontradas} sem obra
                      identificada. Serão importados mesmo assim e gerarão inconsistências.
                    </span>
                  </div>
                )}

                <div className="max-h-[420px] overflow-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Funcionário</th>
                        <th className="text-left p-2">CPF</th>
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Batidas</th>
                        <th className="text-left p-2">Obra</th>
                        <th className="text-left p-2">Origem</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, idx) => {
                        const batidas = [p.entrada1, p.saida1, p.entrada2, p.saida2, p.entrada3, p.saida3]
                          .filter(Boolean)
                          .map((h) => h!.slice(0, 5))
                          .join(" · ");
                        const t = TIPO_LABEL[p.tipoDia] || TIPO_LABEL.SEM_REGISTRO;
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-2">
                              {p.funcionarioId ? (
                                <span>{p.funcionarioNome || p.nomeFuncionario}</span>
                              ) : (
                                <span className="text-destructive">{p.nomeFuncionario} (não cadastrado)</span>
                              )}
                            </td>
                            <td className="p-2 font-mono">{p.cpf}</td>
                            <td className="p-2 whitespace-nowrap">{fmtData(p.data)}</td>
                            <td className="p-2 font-mono whitespace-nowrap">{batidas || "—"}</td>
                            <td className="p-2">
                              {p.obraId ? p.obraNome || p.departamento : (
                                <span className="text-warning">{p.departamento} (?)</span>
                              )}
                            </td>
                            <td className="p-2">{p.origemBatida || "—"}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${t.cls}`}>{t.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats && (
              <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in space-y-4">
                <h3 className="font-bold text-lg">Resultado da Importação</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <p className="text-[10px] text-success uppercase font-bold">Dias importados</p>
                    <p className="text-2xl font-bold text-success">{stats.processados}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10">
                    <p className="text-[10px] text-warning uppercase font-bold">Func. não encontrados</p>
                    <p className="text-2xl font-bold text-warning">{stats.funcionariosNaoEncontrados}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10">
                    <p className="text-[10px] text-warning uppercase font-bold">Obras não encontradas</p>
                    <p className="text-2xl font-bold text-warning">{stats.obrasNaoEncontradas}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <p className="text-[10px] text-destructive uppercase font-bold">Inconsistências</p>
                    <p className="text-2xl font-bold text-destructive">{stats.inconsistenciasGeradas}</p>
                  </div>
                </div>
                {stats.erros.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold">Avisos / Erros ({stats.erros.length}):</p>
                    <div className="max-h-40 overflow-y-auto rounded bg-muted p-2 text-[10px] font-mono whitespace-pre-wrap">
                      {stats.erros.join("\n")}
                    </div>
                  </div>
                )}
                <Link to="/ponto/inconsistencias">
                  <Button variant="outline" className="gap-2">
                    Gerir Inconsistências <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-primary/5 p-5">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Como funciona
              </h4>
              <ul className="text-xs space-y-3 text-muted-foreground">
                <li>• Cada linha do CSV é um <b>dia de um funcionário</b>.</li>
                <li>• O funcionário é localizado pelo <b>CPF</b> e a obra pelo <b>departamento/CNPJ</b>.</li>
                <li>• Marcações com <b>(C)</b> são reconhecidas como biométricas (facial).</li>
                <li>• Campos com <b>"Falta"</b> geram inconsistência automática.</li>
                <li>• Os valores calculados pelo RHiD são gravados e podem ser <b>editados na Folha</b> após receber atestados.</li>
              </ul>
            </div>
            <Link to="/ponto/importar" className="block">
              <div className="rounded-xl border p-5 hover:bg-muted/50 transition-colors">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Outro método</p>
                <p className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Importar AFD</p>
                <p className="text-xs text-muted-foreground mt-1">Arquivo bruto do relógio (Portaria 671).</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
