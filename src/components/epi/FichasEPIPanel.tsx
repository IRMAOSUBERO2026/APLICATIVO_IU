import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { gerarFichaEPIEEnviarAssinatura } from "@/lib/gerarFichaEPI";
import { gerarFichaEPIPdf } from "@/lib/gerarFichaEPIPdf";
import { FileSignature, FileDown, Search, Loader2, Copy, ExternalLink, Users } from "lucide-react";
import { format } from "date-fns";

interface FuncRow {
  id: string;
  nome: string;
  cargo: string;
  empresa_id: string;
  obra_id: string | null;
  total_entregas: number;
  ultima_entrega: string | null;
  ultima_assinatura: { status: string; created_at: string; token: string } | null;
}

interface Obra { id: string; nome: string; codigo: string; }

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
  visualizado: { label: "Visualizado", cls: "bg-info/15 text-info-foreground border-info/30" },
  assinado: { label: "Assinado", cls: "bg-success/15 text-success-foreground border-success/30" },
  recusado: { label: "Recusado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  expirado: { label: "Expirado", cls: "bg-muted text-muted-foreground border-border" },
};

export default function FichasEPIPanel() {
  const [rows, setRows] = useState<FuncRow[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterObra, setFilterObra] = useState<string>("todas");
  const [busy, setBusy] = useState<string | null>(null);
  const [linkAtivo, setLinkAtivo] = useState<{ funcId: string; url: string } | null>(null);

  async function load() {
    setLoading(true);
    const [funcRes, entRes, assRes, obrasRes] = await Promise.all([
      supabase.from("funcionarios").select("id, nome, cargo, empresa_id, obra_id").eq("status", "ativo").order("nome"),
      supabase.from("entregas_epi").select("funcionario_id, data_entrega"),
      supabase.from("assinaturas_digitais").select("funcionario_id, status, created_at, token_acesso").eq("documento_tipo", "ficha_epi").order("created_at", { ascending: false }),
      supabase.from("obras").select("id, nome, codigo").order("codigo"),
    ]);

    const ents = entRes.data || [];
    const assinaturas = assRes.data || [];

    const list: FuncRow[] = (funcRes.data || []).map((f: any) => {
      const minhasEnt = ents.filter((e: any) => e.funcionario_id === f.id);
      const minhasAss = assinaturas.filter((a: any) => a.funcionario_id === f.id);
      const ultimaEnt = minhasEnt.length
        ? minhasEnt.map((e: any) => e.data_entrega).sort().slice(-1)[0]
        : null;
      const ultAss = minhasAss[0];
      return {
        ...f,
        total_entregas: minhasEnt.length,
        ultima_entrega: ultimaEnt,
        ultima_assinatura: ultAss
          ? { status: ultAss.status, created_at: ultAss.created_at, token: ultAss.token_acesso }
          : null,
      };
    });
    setRows(list);
    if (obrasRes.data) setObras(obrasRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterObra !== "todas" && r.obra_id !== filterObra) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return r.nome.toLowerCase().includes(s) || (r.cargo || "").toLowerCase().includes(s);
    });
  }, [rows, search, filterObra]);

  async function handleAssinaturaDigital(r: FuncRow) {
    if (r.total_entregas === 0) {
      toast({ title: "Sem entregas registradas", description: "Registre ao menos uma entrega de EPI antes de gerar a ficha.", variant: "destructive" });
      return;
    }
    setBusy(r.id);
    try {
      const res = await gerarFichaEPIEEnviarAssinatura(r.id, r.empresa_id);
      const url = `${window.location.origin}/assinatura?token=${res.token}`;
      setLinkAtivo({ funcId: r.id, url });
      toast({ title: "Ficha enviada para assinatura digital", description: `${res.totalItens} item(ns) — link válido por 7 dias.` });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao gerar ficha", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handlePdfFisico(r: FuncRow) {
    if (r.total_entregas === 0) {
      toast({ title: "Sem entregas registradas", description: "Registre ao menos uma entrega de EPI antes de gerar a ficha.", variant: "destructive" });
      return;
    }
    setBusy(r.id);
    try {
      const blob = await gerarFichaEPIPdf(r.id, r.empresa_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ficha_EPI_${r.nome.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF gerado!", description: "Imprima e colha a rubrica do funcionário em cada item." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Fichas de EPI por Funcionário</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        A ficha consolida automaticamente todo o histórico de entregas (NR-6) e pode ser enviada para assinatura digital ou impressa para assinatura física com coluna de rubrica por item.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar funcionário ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterObra}
          onChange={(e) => setFilterObra(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todas">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
        </select>
      </div>

      {linkAtivo && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-success">Link de assinatura gerado</p>
          <div className="rounded-md border bg-background p-2 text-[11px] break-all font-mono">{linkAtivo.url}</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(linkAtivo.url); toast({ title: "Link copiado!" }); }}
              className="inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Copy className="h-3 w-3" /> Copiar
            </button>
            <a
              href={linkAtivo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-3 w-3" /> Abrir
            </a>
            <button onClick={() => setLinkAtivo(null)} className="text-xs text-muted-foreground underline ml-auto">
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Entregas</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Última entrega</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Última assinatura</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhum funcionário encontrado.</td></tr>
              ) : (
                filtered.map(r => {
                  const status = r.ultima_assinatura ? STATUS_LABEL[r.ultima_assinatura.status] : null;
                  const isBusy = busy === r.id;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {r.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{r.nome}</p>
                            <p className="text-[11px] text-muted-foreground">{r.cargo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.total_entregas > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {r.total_entregas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {r.ultima_entrega ? format(new Date(r.ultima_entrega), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {status ? (
                          <div className="space-y-0.5">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                              {status.label}
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(r.ultima_assinatura!.created_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAssinaturaDigital(r)}
                            disabled={isBusy || r.total_entregas === 0}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Enviar ficha para assinatura digital do funcionário"
                          >
                            {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSignature className="h-3 w-3" />}
                            Assinatura Digital
                          </button>
                          <button
                            onClick={() => handlePdfFisico(r)}
                            disabled={isBusy || r.total_entregas === 0}
                            className="inline-flex items-center gap-1 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Baixar PDF para assinatura física (com coluna de rubrica)"
                          >
                            {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                            PDF Físico
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
