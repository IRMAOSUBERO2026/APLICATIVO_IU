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
  ca_numero: string;
  preco_unitario: number;
  quantidade_atual: number;
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
      ["Código", "Descrição", "Categoria", "Unidade", "Estoque Mínimo", "NCM", "CA (EPI)", "Preço Unitário", "Quantidade Atual"],
      ["EPI-001", "Capacete de Segurança", "EPI", "un", 10, "6506.10.00", "31469", 25.50, 25],
      ["EPI-002", "Luva de Proteção", "EPI", "par", 20, "", "12345", 8.90, 40],
      ["FER-001", "Furadeira Elétrica", "Ferramentas", "un", 2, "", "", 450.00, 5],
      ["MAT-001", "Cimento CP II", "Material", "sc", 50, "2523.29.10", "", 38.50, 120],
      ["CON-001", "Disco de Corte 7\"", "Consumível", "un", 30, "", "", 12.00, 60],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Força coluna CA como texto para preservar zeros à esquerda
    const range = XLSX.utils.decode_range(ws["!ref"]!);
    for (let R = 1; R <= range.e.r; R++) {
      const cellRef = XLSX.utils.encode_cell({ c: 6, r: R });
      if (ws[cellRef]) {
        ws[cellRef].t = "s";
        ws[cellRef].z = "@";
        ws[cellRef].v = String(ws[cellRef].v ?? "");
      }
    }
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
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
      ["• CA (EPI): Número do Certificado de Aprovação — TEXTO (preserva zeros à esquerda)"],
      ["• Preço Unitário: Valor de referência em R$ (ex: 25.50)"],
      ["• Quantidade Atual: Saldo inicial em estoque (gera movimentação de entrada)"],
      [""],
      ["IMPORTANTE: Apague as linhas de exemplo antes de importar"],
      ["Não altere os cabeçalhos da primeira linha"],
      ["Para CAs com zeros à esquerda, mantenha a célula como TEXTO"],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instrucoes);
    ws2["!cols"] = [{ wch: 70 }];
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
      const wb = XLSX.read(buffer, { type: "array", cellText: true, cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // raw:false → usa o valor formatado (texto), preservando CA com zeros à esquerda e evitando notação científica
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

      if (raw.length < 2) {
        setErrors(["Planilha vazia ou sem dados além do cabeçalho."]);
        setLoading(false);
        return;
      }

      const header = raw[0].map((h: any) => String(h ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const colMap = {
        codigo: header.findIndex(h => h === "codigo" || h.startsWith("cod")),
        descricao: header.findIndex(h => h.includes("descricao") || h === "nome" || h.includes("material")),
        categoria: header.findIndex(h => h.includes("categoria")),
        unidade: header.findIndex(h => h === "unidade" || h === "un" || h === "und"),
        estoque_minimo: header.findIndex(h => h.includes("minimo")),
        ncm: header.findIndex(h => h.includes("ncm")),
        // CA exato — evita colidir com "categoria", "codigo", etc.
        ca_numero: header.findIndex(h => h === "ca" || h.startsWith("ca ") || h.startsWith("ca(") || h.includes("ca (epi") || h.includes("certificado")),
        preco_unitario: header.findIndex(h => h.includes("preco") || h.includes("valor unit") || h.includes("custo")),
        quantidade_atual: header.findIndex(h => h.includes("quantidade") || h.includes("saldo") || h.includes("qtd")),
      };

      if (colMap.descricao === -1) {
        setErrors(["Coluna 'Descrição' não encontrada. Verifique o cabeçalho."]);
        setLoading(false);
        return;
      }

      const parseNum = (v: any): number => {
        if (v == null || v === "") return 0;
        const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        const n = Number(s);
        return isNaN(n) ? 0 : n;
      };
      const parseCa = (v: any): string => {
        if (v == null || v === "") return "";
        // Mantém apenas dígitos do CA (formato oficial Brasileiro)
        return String(v).trim().replace(/[^\d]/g, "");
      };

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
          estoque_minimo: colMap.estoque_minimo >= 0 ? parseNum(r[colMap.estoque_minimo]) : 0,
          ncm: colMap.ncm >= 0 ? String(r[colMap.ncm] || "").trim() : "",
          ca_numero: colMap.ca_numero >= 0 ? parseCa(r[colMap.ca_numero]) : "",
          preco_unitario: colMap.preco_unitario >= 0 ? parseNum(r[colMap.preco_unitario]) : 0,
          quantidade_atual: colMap.quantidade_atual >= 0 ? parseNum(r[colMap.quantidade_atual]) : 0,
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
      // Carrega TODOS os produtos para fazer match por código OU descrição (case-insensitive)
      const { data: existing } = await supabase.from("produtos").select("id, codigo, descricao, ca_numero");
      const byCode = new Map<string, { id: string; ca_numero: string | null }>();
      const byDesc = new Map<string, { id: string; ca_numero: string | null }>();
      (existing || []).forEach(p => {
        if (p.codigo) byCode.set(p.codigo.trim().toLowerCase(), { id: p.id, ca_numero: p.ca_numero });
        if (p.descricao) byDesc.set(p.descricao.trim().toLowerCase(), { id: p.id, ca_numero: p.ca_numero });
      });

      const toInsert: any[] = [];
      const toInsertOriginalIdx: number[] = [];
      const toUpdate: { id: string; ca_numero: string; estoque_minimo: number; ncm: string | null; categoria: string | null; unidade: string; preco_unitario: number }[] = [];

      preview.forEach((p, idx) => {
        const matchCode = p.codigo ? byCode.get(p.codigo.trim().toLowerCase()) : undefined;
        const matchDesc = byDesc.get(p.descricao.trim().toLowerCase());
        const match = matchCode || matchDesc;

        if (match) {
          if (p.ca_numero || p.estoque_minimo > 0 || p.ncm || p.preco_unitario > 0) {
            toUpdate.push({
              id: match.id,
              ca_numero: p.ca_numero,
              estoque_minimo: p.estoque_minimo,
              ncm: p.ncm || null,
              categoria: p.categoria || null,
              unidade: p.unidade,
              preco_unitario: p.preco_unitario,
            });
          }
        } else {
          toInsert.push({
            descricao: p.descricao,
            codigo: p.codigo || null,
            categoria: p.categoria || null,
            unidade: p.unidade,
            estoque_minimo: p.estoque_minimo,
            ncm: p.ncm || null,
            ca_numero: p.ca_numero || null,
            preco_unitario: p.preco_unitario || 0,
          } as any);
          toInsertOriginalIdx.push(idx);
        }
      });

      let atualizados = 0;
      for (const u of toUpdate) {
        const updatePayload: any = {};
        if (u.ca_numero) updatePayload.ca_numero = u.ca_numero;
        if (u.estoque_minimo > 0) updatePayload.estoque_minimo = u.estoque_minimo;
        if (u.ncm) updatePayload.ncm = u.ncm;
        if (u.categoria) updatePayload.categoria = u.categoria;
        if (u.unidade && u.unidade !== "un") updatePayload.unidade = u.unidade;
        if (u.preco_unitario > 0) updatePayload.preco_unitario = u.preco_unitario;

        if (Object.keys(updatePayload).length === 0) continue;

        const { error } = await supabase.from("produtos").update(updatePayload).eq("id", u.id);
        if (!error) atualizados++;
      }

      const inseridos: { id: string; quantidade_atual: number; preco_unitario: number }[] = [];
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { data: ins, error } = await supabase.from("produtos").insert(batch).select("id");
        if (error) throw error;
        (ins || []).forEach((row, idx) => {
          const origIdx = toInsertOriginalIdx[i + idx];
          const qtd = preview[origIdx]?.quantidade_atual || 0;
          const preco = preview[origIdx]?.preco_unitario || 0;
          if (qtd > 0) inseridos.push({ id: row.id, quantidade_atual: qtd, preco_unitario: preco });
        });
      }

      if (inseridos.length > 0) {
        const movs = inseridos.map(p => ({
          produto_id: p.id,
          tipo: "entrada",
          quantidade: p.quantidade_atual,
          valor_unitario: p.preco_unitario || null,
          observacoes: "Saldo inicial (importação de planilha)",
        }));
        await supabase.from("movimentacoes_estoque").insert(movs);
      }

      setImported(true);
      const partes: string[] = [];
      if (toInsert.length > 0) partes.push(`${toInsert.length} novo(s)`);
      if (atualizados > 0) partes.push(`${atualizados} atualizado(s)`);

      toast({
        title: partes.length > 0 ? `Importação concluída — ${partes.join(", ")}` : "Nada para atualizar",
        description: atualizados > 0 ? "CAs e demais campos foram sincronizados nos produtos existentes." : undefined,
      });
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

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              💡 Produtos já existentes (mesmo código ou descrição) terão o <strong>CA, estoque mínimo, NCM e categoria atualizados</strong> conforme a planilha. Produtos novos serão criados com saldo inicial.
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
                          <th className="px-2 py-1.5 text-left text-muted-foreground">CA</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground">Preço R$</th>
                          <th className="px-2 py-1.5 text-right text-muted-foreground">Qtd Atual</th>
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
                            <td className="px-2 py-1.5 font-mono">{p.ca_numero || "—"}</td>
                            <td className="px-2 py-1.5 text-right">{p.preco_unitario ? p.preco_unitario.toFixed(2) : "—"}</td>
                            <td className="px-2 py-1.5 text-right">{p.quantidade_atual || "—"}</td>
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
