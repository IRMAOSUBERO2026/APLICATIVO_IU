import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle, ArrowRight, FileSpreadsheet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { parseRHiDCSV, sha256Hex, type RHiDParseResult, type TipoDia } from "@/utils/rhidCsvParser";
import {
  carregarMatch,
  preAnalisar,
  importarRelatorioRHiD,
  type PreAnalise,
  type ImportStats,
  type MatchMaps,
} from "@/utils/rhidImport";

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const TIPO_LABEL: Record<TipoDia, { label: string; cls: string }> = {
  normal: { label: "Normais", cls: "bg-success/10 text-success" },
  falta: { label: "Faltas", cls: "bg-destructive/10 text-destructive" },
  folga: { label: "Folgas", cls: "bg-muted text-muted-foreground" },
  feriado: { label: "Feriados", cls: "bg-primary/10 text-primary" },
  atestado: { label: "Atestados", cls: "bg-amber-500/10 text-amber-600" },
  sem_vinculo: { label: "Sem vínculo", cls: "bg-muted text-muted-foreground" },
};

const fmtCnpj = (d: string) =>
  d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : d;

export default function ImportacaoCSVRHiD() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parse, setParse] = useState<RHiDParseResult | null>(null);
  const [pre, setPre] = useState<PreAnalise | null>(null);
  const [maps, setMaps] = useState<MatchMaps | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParse(null);
    setPre(null);
    setMaps(null);
    setReviewed(false);
    setStats(null);
  };

  const handleSelect = async (f: File | null) => {
    setFile(f);
    reset();
    if (!f) return;
    setLoading(true);
    try {
      const text = await f.text();
      const p = parseRHiDCSV(text);
      if (p.registros.length === 0) {
        toast({ title: "Arquivo incompatível", description: "Nenhum registro válido encontrado. Verifique se é o Relatório de Ponto do RHiD.", variant: "destructive" });
        return;
      }
      const hash = await sha256Hex(text);
      const m = await carregarMatch();
      const analise = await preAnalisar(p, hash, m);
      setParse(p);
      setMaps(m);
      setPre(analise);
      toast({ title: "Arquivo compatível ✓", description: `${p.totalLinhas} linhas · ${p.cpfs.length} funcionários. Revise o resumo antes de confirmar.` });
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parse || !pre || !maps || !file) return;
    setSaving(true);
    try {
      const s = await importarRelatorioRHiD(parse, file.name, pre.hash, maps);
      setStats(s);
      if (s.importacaoId) {
        toast({ title: "Importação concluída", description: `${s.gravados} registros gravados no lote.` });
      } else {
        toast({ title: "Falha na importação", description: s.erros[0] || "Erro desconhecido.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Relatório de Ponto (RHiD)</h1>
          <p className="text-sm text-muted-foreground">
            Relatório mensal pré-calculado exportado do RHiD (ControlID). Fonte complementar de conciliação —
            não altera a apuração do AFD nem a folha automaticamente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Upload */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <Label>Arquivo .csv do Relatório de Ponto</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleSelect(e.dataTransfer.files?.[0] || null); }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.CSV,text/csv" className="hidden"
                  onChange={(e) => handleSelect(e.target.files?.[0] || null)} />
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
                      <p className="font-medium">Arraste ou clique para selecionar o CSV</p>
                      <p className="text-xs text-muted-foreground">20 colunas, separado por ; (aceita .csv e .CSV)</p>
                    </div>
                  )}
                </div>
              </div>
              {loading && <p className="text-sm text-muted-foreground">Analisando arquivo e cruzando CPFs...</p>}
            </div>

            {/* Pré-análise */}
            {pre && !stats && (
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg">Resumo da Pré-análise</h3>

                {pre.importacaoAnterior && (
                  <div className="p-3 rounded-lg border border-warning/40 bg-warning/5 text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <span>
                      Este arquivo <b>já foi importado</b> em{" "}
                      {new Date(pre.importacaoAnterior.importado_em).toLocaleString("pt-BR")} ({pre.importacaoAnterior.nome_arquivo}).
                      Você pode reprocessar mesmo assim — será criado um novo lote, preservando o histórico.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Competência</p>
                    <p className="text-lg font-bold">{pre.competenciaMes ? `${MESES[pre.competenciaMes]}/${pre.competenciaAno}` : "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Linhas</p>
                    <p className="text-lg font-bold">{pre.totalLinhas}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Funcionários</p>
                    <p className="text-lg font-bold">{pre.totalFuncionarios}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">CNPJs</p>
                    <p className="text-lg font-bold">{pre.cnpjs.length}</p>
                  </div>
                </div>

                {/* Contagem por tipo de dia */}
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Dias por classificação (sanidade)</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TIPO_LABEL) as TipoDia[]).map((k) => (
                      <span key={k} className={`px-2.5 py-1 rounded-full text-xs font-medium ${TIPO_LABEL[k].cls}`}>
                        {TIPO_LABEL[k].label}: {pre.contagemTipoDia[k]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CNPJs */}
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Centros de custo (CNPJ)</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {pre.cnpjs.map((c) => (
                      <span key={c} className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">{fmtCnpj(c)}</span>
                    ))}
                    {pre.cnpjs.length === 0 && <span className="text-muted-foreground">Nenhum</span>}
                  </div>
                </div>

                {/* CPFs não encontrados */}
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                    CPFs sem correspondência no cadastro ({pre.naoEncontrados.length})
                  </p>
                  {pre.naoEncontrados.length === 0 ? (
                    <p className="text-sm text-success flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Todos os funcionários foram localizados por CPF.</p>
                  ) : (
                    <div className="max-h-40 overflow-auto rounded border border-destructive/30 bg-destructive/5 divide-y">
                      {pre.naoEncontrados.map((f) => (
                        <div key={f.cpf} className="flex justify-between px-3 py-1.5 text-xs">
                          <span className="font-medium text-destructive">{f.nome}</span>
                          <span className="font-mono text-muted-foreground">{f.cpf}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Estes registros serão gravados sem vínculo de funcionário (para conciliação). Nenhum cadastro é criado automaticamente.
                  </p>
                </div>

                {parse && parse.erros.length > 0 && (
                  <div className="text-xs">
                    <p className="font-bold text-warning mb-1">Avisos de parsing ({parse.erros.length}):</p>
                    <div className="max-h-24 overflow-auto rounded bg-muted p-2 font-mono whitespace-pre-wrap">{parse.erros.slice(0, 50).join("\n")}</div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="h-4 w-4" />
                  Revisei o resumo acima e confirmo a importação.
                </label>

                <Button onClick={handleConfirm} disabled={saving || !reviewed} className="gap-2">
                  {saving ? "Importando..." : "Confirmar importação"}
                </Button>
              </div>
            )}

            {/* Resultado */}
            {stats && (
              <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in space-y-4">
                <h3 className="font-bold text-lg">Resultado da Importação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <p className="text-[10px] text-success uppercase font-bold">Registros gravados</p>
                    <p className="text-2xl font-bold text-success">{stats.gravados}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10">
                    <p className="text-[10px] text-warning uppercase font-bold">Sem vínculo (CPF não encontrado)</p>
                    <p className="text-2xl font-bold text-warning">{stats.funcionariosNaoEncontrados}</p>
                  </div>
                </div>
                {stats.erros.length > 0 && (
                  <div className="text-[11px]">
                    <p className="font-bold mb-1">Avisos ({stats.erros.length}):</p>
                    <div className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono whitespace-pre-wrap">{stats.erros.join("\n")}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link to="/ponto/relatorio-rhid">
                    <Button variant="outline" className="gap-2">Consultar registros importados <ArrowRight className="h-3 w-3" /></Button>
                  </Link>
                  <Button variant="ghost" onClick={() => { setFile(null); reset(); }}>Importar outro arquivo</Button>
                </div>
              </div>
            )}
          </div>

          {/* Lateral */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-primary/5 p-5">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Como funciona</h4>
              <ul className="text-xs space-y-2.5 text-muted-foreground">
                <li>• O funcionário é localizado apenas pelo <b>CPF</b> (matrícula não é usada).</li>
                <li>• Dias com todas as colunas <b>"-"</b> ou antes da admissão são marcados <b>sem vínculo</b> e não entram em somas.</li>
                <li>• Marcadores <b>(I)</b> e <b>(C)</b> são armazenados como metadado, sem regra de negócio.</li>
                <li>• Reimportar o mesmo arquivo cria um <b>novo lote</b>, mantendo o histórico.</li>
                <li>• Não alimenta a folha automaticamente — é fonte de <b>conciliação</b>.</li>
              </ul>
            </div>
            <div className="rounded-xl border p-4 text-xs text-muted-foreground flex gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Requer as tabelas <code>ponto_relatorio_importacoes</code> e <code>ponto_relatorio_rhid_diario</code> (script <code>criar_ponto_relatorio_rhid.sql</code>).</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
