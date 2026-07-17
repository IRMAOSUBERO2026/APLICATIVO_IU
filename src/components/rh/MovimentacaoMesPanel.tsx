import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresasObras } from "@/hooks/useEmpresasObras";
import { UserPlus, LogOut, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { FuncionarioAvatar } from "@/components/rh/FuncionarioAvatar";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

function fmtBR(d?: string | null) {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
}

export function MovimentacaoMesPanel() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1-12
  const [funcs, setFuncs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresas } = useEmpresasObras();

  const inicio = useMemo(() => `${ano}-${String(mes).padStart(2, "0")}-01`, [ano, mes]);
  const fim = useMemo(() => {
    const last = new Date(ano, mes, 0).getDate();
    return `${ano}-${String(mes).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  }, [ano, mes]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf, cargo, foto_url, empresa_id, obra_id, data_admissao, data_rescisao, motivo_rescisao, status")
        .or(`and(data_admissao.gte.${inicio},data_admissao.lte.${fim}),and(data_rescisao.gte.${inicio},data_rescisao.lte.${fim})`);
      setFuncs(data || []);
      setLoading(false);
    })();
  }, [inicio, fim]);

  const contratacoes = funcs.filter(f => f.data_admissao && f.data_admissao >= inicio && f.data_admissao <= fim);
  const demissoes = funcs.filter(f => f.data_rescisao && f.data_rescisao >= inicio && f.data_rescisao <= fim);
  const saldo = contratacoes.length - demissoes.length;

  const empNome = (id: string) => empresas.find((e: any) => e.id === id)?.nome_fantasia || empresas.find((e: any) => e.id === id)?.razao_social || "—";

  const changeMes = (delta: number) => {
    let m = mes + delta;
    let y = ano;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMes(m); setAno(y);
  };

  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
        <button onClick={() => changeMes(-1)} className="rounded-lg p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Movimentação da Empresa</p>
          <p className="text-lg font-bold">{meses[mes - 1]} / {ano}</p>
        </div>
        <button onClick={() => changeMes(1)} className="rounded-lg p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center"><UserPlus className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Contratações</p>
              <p className="text-2xl font-bold text-success">{contratacoes.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><LogOut className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Demissões</p>
              <p className="text-2xl font-bold text-destructive">{demissoes.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${saldo >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {saldo >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo do Mês</p>
              <p className={`text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{saldo > 0 ? "+" : ""}{saldo}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-success/5 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-success" />
              <h3 className="text-sm font-semibold">Contratações ({contratacoes.length})</h3>
            </div>
            <ScrollableTable>
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Funcionário</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cargo</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Empresa</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Admissão</th>
                  </tr>
                </thead>
                <tbody>
                  {contratacoes.map(f => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><FuncionarioAvatar nome={f.nome} foto={f.foto_url} size="sm" /><span className="font-medium">{f.nome}</span></div></td>
                      <td className="px-3 py-2 text-muted-foreground">{f.cargo || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{empNome(f.empresa_id)}</td>
                      <td className="px-3 py-2 text-center text-xs">{fmtBR(f.data_admissao)}</td>
                    </tr>
                  ))}
                  {contratacoes.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma contratação no período.</td></tr>}
                </tbody>
              </table>
            </ScrollableTable>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-destructive/5 flex items-center gap-2">
              <LogOut className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">Demissões ({demissoes.length})</h3>
            </div>
            <ScrollableTable>
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Funcionário</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Motivo</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Empresa</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Rescisão</th>
                  </tr>
                </thead>
                <tbody>
                  {demissoes.map(f => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><FuncionarioAvatar nome={f.nome} foto={f.foto_url} size="sm" /><span className="font-medium">{f.nome}</span></div></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.motivo_rescisao || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{empNome(f.empresa_id)}</td>
                      <td className="px-3 py-2 text-center text-xs">{fmtBR(f.data_rescisao)}</td>
                    </tr>
                  ))}
                  {demissoes.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma demissão no período.</td></tr>}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        </div>
      )}
    </div>
  );
}
