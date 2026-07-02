import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const TIPO_CLS: Record<string, string> = {
  normal: "bg-success/10 text-success",
  falta: "bg-destructive/10 text-destructive",
  folga: "bg-muted text-muted-foreground",
  feriado: "bg-primary/10 text-primary",
  atestado: "bg-amber-500/10 text-amber-600",
  sem_vinculo: "bg-muted text-muted-foreground",
};

const minToStr = (m: number) => (m ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}` : "—");
const hora = (t: string | null) => (t ? t.slice(0, 5) : "—");
const fmtData = (iso: string) => iso.split("-").reverse().join("/");

export default function ConsultaRelatorioRHiD() {
  const [lotes, setLotes] = useState<any[]>([]);
  const [loteId, setLoteId] = useState("");
  const [busca, setBusca] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("ponto_relatorio_importacoes")
      .select("id, nome_arquivo, competencia_mes, competencia_ano, importado_em, total_linhas, status")
      .order("importado_em", { ascending: false })
      .then(({ data, error }) => {
        if (error) { toast({ title: "Erro ao carregar lotes", description: error.message, variant: "destructive" }); return; }
        setLotes(data || []);
        if (data && data.length) setLoteId(data[0].id);
      });
  }, []);

  const carregar = async () => {
    if (!loteId) return;
    setLoading(true);
    try {
      let q = supabase
        .from("ponto_relatorio_rhid_diario")
        .select("*")
        .eq("importacao_id", loteId)
        .order("nome_funcionario_rhid")
        .order("data")
        .limit(3000);
      const b = busca.trim();
      if (b) {
        const digits = b.replace(/\D/g, "");
        if (digits.length >= 3) q = q.ilike("cpf_funcionario", `%${digits}%`);
        else q = q.ilike("nome_funcionario_rhid", `%${b}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows(data || []);
      if (!data?.length) toast({ title: "Nenhum registro", description: "Sem resultados para o filtro." });
    } catch (e: any) {
      toast({ title: "Erro na consulta", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (loteId) carregar(); /* eslint-disable-next-line */ }, [loteId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultar Relatório RHiD</h1>
          <p className="text-sm text-muted-foreground">Registros diários importados do Relatório de Ponto (fonte de conciliação).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end p-4 rounded-xl border bg-card/50">
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Lote de importação</Label>
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              {lotes.length === 0 && <option value="">Nenhum lote importado</option>}
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {MESES[l.competencia_mes] || "?"}/{l.competencia_ano} — {l.nome_arquivo} ({new Date(l.importado_em).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar por nome ou CPF</Label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && carregar()} placeholder="Nome ou CPF..." className="h-10" />
          </div>
          <Button onClick={carregar} disabled={loading || !loteId} className="gap-2 h-10">
            <Search className="h-4 w-4" /> {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Funcionário</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Tipo</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">E1</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">S1</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">E2</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">S2</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Normais</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Atraso</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Extras</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Justif.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-1.5">
                    <div className="font-medium">{r.nome_funcionario_rhid}{!r.funcionario_id && <span className="ml-1 text-[10px] text-destructive">(sem cadastro)</span>}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.cpf_funcionario}</div>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtData(r.data)} <span className="text-muted-foreground">{r.dia_semana}</span></td>
                  <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded-full font-medium ${TIPO_CLS[r.tipo_dia] || ""}`}>{r.tipo_dia}</span></td>
                  <td className="px-3 py-1.5 text-center font-mono">{hora(r.entrada_1)}</td>
                  <td className="px-3 py-1.5 text-center font-mono">{hora(r.saida_1)}</td>
                  <td className="px-3 py-1.5 text-center font-mono">{hora(r.entrada_2)}</td>
                  <td className="px-3 py-1.5 text-center font-mono">{hora(r.saida_2)}</td>
                  <td className="px-3 py-1.5 text-center font-mono">{minToStr(r.total_normais_minutos)}</td>
                  <td className="px-3 py-1.5 text-center font-mono">{minToStr(r.horas_atraso_minutos)}</td>
                  <td className="px-3 py-1.5 text-center font-mono">{minToStr(r.extras_total_minutos)}</td>
                  <td className="px-3 py-1.5">{r.nome_feriado || r.justificativa || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    Selecione um lote para visualizar os registros importados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <p className="text-xs text-muted-foreground">{rows.length} registro(s) exibido(s).</p>}
      </div>
    </AppLayout>
  );
}
