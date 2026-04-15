import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, HardHat, Package, AlertTriangle, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Entrega {
  id: string;
  data_entrega: string;
  quantidade: number;
  ca_numero: string | null;
  observacoes: string | null;
  funcionario: { nome: string } | null;
  produto: { descricao: string } | null;
  obra: { nome: string; codigo: string } | null;
}

interface Produto {
  id: string;
  descricao: string;
  categoria: string | null;
  unidade: string;
  saldo: number;
  estoque_minimo: number;
}

export default function EntregaEPI() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: entregasData }, { data: produtosData }, { data: movsData }] = await Promise.all([
      supabase.from("entregas_epi")
        .select("id, data_entrega, quantidade, ca_numero, observacoes, funcionarios(nome), produtos(descricao), obras(nome, codigo)")
        .order("data_entrega", { ascending: false })
        .limit(100),
      supabase.from("produtos").select("id, descricao, categoria, unidade, estoque_minimo").eq("ativo", true).order("descricao"),
      supabase.from("movimentacoes_estoque").select("produto_id, tipo, quantidade"),
    ]);

    if (entregasData) {
      setEntregas(entregasData.map((e: any) => ({
        ...e,
        funcionario: e.funcionarios,
        produto: e.produtos,
        obra: e.obras,
      })));
    }

    if (produtosData && movsData) {
      const prods = produtosData.map((p: any) => {
        const entradas = (movsData as any[]).filter(m => m.produto_id === p.id && m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
        const saidas = (movsData as any[]).filter(m => m.produto_id === p.id && m.tipo !== "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
        return { ...p, saldo: entradas - saidas };
      });
      // Show only EPI-related products or all if no category filter
      setProdutos(prods);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const epiCriticos = produtos.filter(p => p.estoque_minimo > 0 && p.saldo < p.estoque_minimo);

  const filtered = entregas.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.funcionario?.nome?.toLowerCase().includes(s) ||
      e.produto?.descricao?.toLowerCase().includes(s) ||
      e.obra?.nome?.toLowerCase().includes(s);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Entrega de EPI</h1>
            <p className="text-sm text-muted-foreground">
              {entregas.length} entregas registradas • {epiCriticos.length} itens críticos
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/entrega-epi-mobile"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <Smartphone className="h-4 w-4" /> Lançamento Rápido
            </Link>
          </div>
        </div>

        {/* Alerta de estoque crítico */}
        {epiCriticos.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Estoque Crítico de EPI</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {epiCriticos.map(item => (
                <span key={item.id} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  {item.descricao}: {item.saldo}/{item.estoque_minimo}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Estoque EPI Grid */}
        {produtos.length > 0 && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            {produtos.slice(0, 12).map(item => (
              <div key={item.id} className={`rounded-lg border p-3 text-center ${item.estoque_minimo > 0 && item.saldo < item.estoque_minimo ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}>
                <Package className={`mx-auto h-5 w-5 mb-1 ${item.estoque_minimo > 0 && item.saldo < item.estoque_minimo ? "text-destructive" : "text-primary"}`} />
                <p className="text-xs font-medium truncate">{item.descricao}</p>
                <p className={`text-lg font-bold ${item.estoque_minimo > 0 && item.saldo < item.estoque_minimo ? "text-destructive" : ""}`}>{item.saldo}</p>
                {item.estoque_minimo > 0 && <p className="text-[10px] text-muted-foreground">mín: {item.estoque_minimo}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar funcionário, EPI ou obra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Entregas table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funcionário</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">EPI</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Qtd</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {loading ? "Carregando..." : "Nenhuma entrega registrada. Use o botão 'Lançamento Rápido' para começar."}
                    </td>
                  </tr>
                ) : (
                  filtered.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 text-muted-foreground">{format(new Date(e.data_entrega), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3.5 font-medium">{e.funcionario?.nome || "—"}</td>
                      <td className="px-4 py-3.5">{e.produto?.descricao || "—"}</td>
                      <td className="px-4 py-3.5 text-center font-medium">{e.quantidade}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{e.obra ? `${e.obra.codigo} - ${e.obra.nome}` : "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{e.ca_numero || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
