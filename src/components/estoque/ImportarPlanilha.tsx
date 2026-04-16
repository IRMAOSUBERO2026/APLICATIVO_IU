import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Props {
  onImportComplete: () => void;
}

interface ProdutoRow {
  codigo: string;
  descricao: string;
  categoria: string;
  unidade: string;
  estoque_minimo: number;
  ncm: string;
}

const VALID_CATEGORIES = ["EPI", "Ferramentas", "Material", "Consumível", "Outros"];
const VALID_UNITS = ["un", "par", "kg", "m", "m²", "m³", "l", "cx", "sc"];

export function ImportarPlanilha({ onImportComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProdutoRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Código", "Descrição", "Categoria", "Unidade", "Estoque Mínimo", "NCM"],
      ["EPI-001", "Capacete de Segurança", "EPI", "un", 10, "6506.10.00"],
      ["EPI-002", "Luva de Proteção", "EPI", "par", 20, ""],
      ["FER-001", "Furadeira Elétrica", "Ferramentas", "un", 2, ""],
      ["MAT-001", "Cimento CP II", "Material", "sc", 50, "2523.29.10"],
      ["CON-001", "Disco de Corte 7\"", "Consumível", "un", 30, ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");

    const instrucoes = [
      ["MODELO DE IMPORTAÇÃO - ESTOQUE"],
      [""],
      ["Preencha a aba 'Produtos' seguindo as regras:"],
      [""],
      ["• Descrição: Obrigatório"],
      ["• Código: Opcional (identificador único)"],
      ["• Categoria: EPI, Ferramentas, Material, Consumível ou Outros"],
      ["• Unidade: un, par, kg, m, m², m³, l, cx, sc"],
      ["• Estoque Mínimo: Número inteiro (0 se não aplicável)"],
      ["• NCM: Opcional (código fiscal)"],
      [""],
      ["IMPORTANTE: Apague as linhas de exemplo antes de importar"],
      ["Não altere os cabeçalhos da primeira linha"],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instrucoes);
    ws2["!cols"] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Instruções");

    XLSX.writeFile(wb, "modelo_importacao_estoque.xlsx");
  };

  const parseFile = async (file: File) => {
    setLoading(true);
    setErrors([]);
    setPreview([]);
    setImported(false);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (raw.length < 2) {
        setErrors(["Planilha vazia ou sem dados além do cabeçalho."]);
        setLoading(false);
        return;
      }

      const header = raw[0].map((h: any) => String(h).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const colMap = {
        codigo: header.findIndex(h => h.includes("codigo")),
        descricao: header.findIndex(h => h.includes("descricao")),
        categoria: header.findIndex(h => h.includes("categoria")),
        unidade: header.findIndex(h => h.includes("unidade")),
        estoque_minimo: header.findIndex(h => h.includes("estoque") || h.includes("minimo")),
        ncm: header.findIndex(h => h.includes("ncm")),
      };

      if (colMap.descricao === -1) {
        setErrors(["Coluna 'Descrição' não encontrada. Verifique o cabeçalho."]);
        setLoading(false);
        return;
      }

      const rows: ProdutoRow[] = [];
      const errs: string[] = [];

      for (let i = 1; i < raw.length; i++) {
        const r = raw[i];
        if (!r || r.length === 0 || !r[colMap.descricao]) continue;

        const descricao = String(r[colMap.descricao] || "").trim();
        if (!descricao) { errs.push(`Linha ${i + 1}: descrição vazia, ignorada`); continue; }

        const categoria = colMap.categoria >= 0 ? String(r[colMap.categoria] || "").trim() : "";
        const unidade = colMap.unidade >= 0 ? String(r[colMap.unidade] || "un").trim().toLowerCase() : "un";

        rows.push({
          descricao,
          codigo: colMap.codigo >= 0 ? String(r[colMap.codigo] || "").trim() : "",
          categoria: VALID_CATEGORIES.includes(categoria) ? categoria : categoria || "Outros",
          unidade: VALID_UNITS.includes(unidade) ? unidade : "un",
          estoque_minimo: colMap.estoque_minimo >= 0 ? Number(r[colMap.estoque_minimo]) || 0 : 0,
          ncm: colMap.ncm >= 0 ? String(r[colMap.ncm] || "").trim() : "",
        });
      }

      if (rows.length === 0) {
        errs.push("Nenhum produto válido encontrado na planilha.");
      }

      setPreview(rows);
      setErrors(errs);
    } catch (err: any) {
      setErrors(["Erro ao ler arquivo: " + err.message]);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);

    try {
      const { data: existing } = await supabase.from("produtos").select("codigo");
      const existingCodes = new Set((existing || []).map(p => p.codigo).filter(Boolean));

      const toInsert = preview
        .filter(p => !p.codigo || !existingCodes.has(p.codigo))
        .map(p => ({
          descricao: p.descricao,
          codigo: p.codigo || null,
          categoria: p.categoria || null,
          unidade: p.unidade,
          estoque_minimo: p.estoque_minimo,
          ncm: p.ncm || null,
        }));

      const skipped = preview.length - toInsert.length;

      if (toInsert.length === 0) {
        toast({ title: "Nenhum produto novo para importar", description: `${skipped} já existem no sistema.`, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Insert in batches of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { error } = await supabase.from("produtos").insert(batch);
        if (error) throw error;
      }

      setImported(true);
      toast({ title: `${toInsert.length} produtos importados!`, description: skipped > 0 ? `${skipped} ignorados (código duplicado)` : undefined });
      onImportComplete();
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
        <FileSpreadsheet className="h-4 w-4" /> Importar Planilha
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setOpen(false); setPreview([]); setErrors([]); setImported(false); }}>
      <div className="bg-card rounded-xl p-6 w-full max-w-2xl shadow-xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Importar Produtos via Planilha
        </h3>

        {!imported && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                <Download className="h-4 w-4" /> Baixar Modelo (.xlsx)
              </button>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])} className="hidden" id="import-estoque" />
                <button onClick={() => fileRef.current?.click()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-full justify-center">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {loading ? "Processando..." : "Selecionar Arquivo"}
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{e}
                  </p>
                ))}
              </div>
            )}

            {preview.length > 0 && (
              <>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium mb-2">{preview.length} produtos encontrados — Preview:</p>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="px-2 py-1.5 text-left text-muted-foreground">Código</th>
                          <th className="px-2 py-1.5 text-left text-muted-foreground">Descrição</th>
                          <th className="px-2 py-1.5 text-left text-muted-foreground">Categoria</th>
                          <th className="px-2 py-1.5 text-center text-muted-foreground">Un</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground">Mín</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 20).map((p, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-2 py-1.5">{p.codigo || "—"}</td>
                            <td className="px-2 py-1.5 font-medium">{p.descricao}</td>
                            <td className="px-2 py-1.5">{p.categoria}</td>
                            <td className="px-2 py-1.5 text-center">{p.unidade}</td>
                            <td className="px-2 py-1.5 text-right">{p.estoque_minimo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 20 && <p className="text-xs text-muted-foreground text-center py-2">... e mais {preview.length - 20} produtos</p>}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setPreview([]); setErrors([]); }} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
                  <button onClick={confirmImport} disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirmar Importação
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {imported && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <p className="text-lg font-semibold">Importação concluída!</p>
            <button onClick={() => { setOpen(false); setPreview([]); setImported(false); }} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
