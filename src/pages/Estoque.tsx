import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Package, Plus, ArrowDown, Search, AlertTriangle } from "lucide-react";
import { ImportarPlanilha } from "@/components/estoque/ImportarPlanilha";
import { format } from "date-fns";
import { useEmpresasObras } from "@/hooks/useEmpresasObras";

type TabKey = "produtos" | "movimentacoes" | "epi" | "estoque_minimo";

export default function Estoque() {
  const [tab, setTab] = useState<TabKey>("produtos");
  const [produtos, setProdutos] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [allMovs, setAllMovs] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showNewProduto, setShowNewProduto] = useState(false);
  const [showNewMov, setShowNewMov] = useState(false);
  const [showNewEpi, setShowNewEpi] = useState(false);

  // New produto form
  const [np, setNp] = useState({ descricao: "", codigo: "", categoria: "", unidade: "un", estoque_minimo: 0, ncm: "" });
  // New movimentação form
  const [nm, setNm] = useState({ produto_id: "", tipo: "entrada", quantidade: 0, valor_unitario: 0, obra_id: "", documento: "", observacoes: "" });
  // New EPI delivery form
  const [ne, setNe] = useState({ funcionario_id: "", produto_id: "", obra_id: "", quantidade: 1, ca_numero: "", observacoes: "", empresa_id: "" });
  const { empresas: empresasList } = useEmpresasObras();

  const loadData = useCallback(async () => {
    const [{ data: p }, { data: m }, { data: mAll }, { data: o }, { data: f }] = await Promise.all([
      supabase.from("produtos").select("*").order("descricao"),
      supabase.from("movimentacoes_estoque").select("*, produtos(descricao, unidade), obras(nome)").order("data_movimentacao", { ascending: false }).limit(100),
      // Saldo total — sem limite, apenas campos necessários
      supabase.from("movimentacoes_estoque").select("produto_id, tipo, quantidade, valor_unitario"),
      supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
      supabase.from("funcionarios").select("id, nome, obra_id").eq("status", "ativo"),
    ]);
    if (p) setProdutos(p);
    if (m) setMovimentacoes(m);
    if (mAll) setAllMovs(mAll);
    if (o) setObras(o);
    if (f) setFuncionarios(f);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate stock balance per product (usa allMovs para saldo correto, sem limite)
  const stockBalances = produtos.map(p => {
    const entradas = allMovs.filter(m => m.produto_id === p.id && m.tipo === "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
    const saidas = allMovs.filter(m => m.produto_id === p.id && m.tipo !== "entrada").reduce((s, m) => s + Number(m.quantidade), 0);
    const saldo = entradas - saidas;
    return { ...p, saldo, entradas, saidas, abaixoMinimo: p.estoque_minimo > 0 && saldo < p.estoque_minimo };
  });

  const filteredProdutos = stockBalances.filter(p => !search || p.descricao?.toLowerCase().includes(search.toLowerCase()) || p.codigo?.toLowerCase().includes(search.toLowerCase()));
  const abaixoMinimo = stockBalances.filter(p => p.abaixoMinimo);

  const saveProduto = async () => {
    if (!np.descricao) { toast({ title: "Informe a descrição", variant: "destructive" }); return; }
    const { error } = await supabase.from("produtos").insert({ ...np, estoque_minimo: Number(np.estoque_minimo) || 0 });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Produto cadastrado" });
    setNp({ descricao: "", codigo: "", categoria: "", unidade: "un", estoque_minimo: 0, ncm: "" });
    setShowNewProduto(false);
    loadData();
  };

  const saveMovimentacao = async () => {
    if (!nm.produto_id || !nm.quantidade) { toast({ title: "Produto e quantidade obrigatórios", variant: "destructive" }); return; }
    const { error } = await supabase.from("movimentacoes_estoque").insert({
      produto_id: nm.produto_id, tipo: nm.tipo, quantidade: Number(nm.quantidade),
      valor_unitario: Number(nm.valor_unitario) || null, obra_id: nm.obra_id || null,
      documento: nm.documento || null, observacoes: nm.observacoes || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${nm.tipo === "entrada" ? "Entrada" : "Saída"} registrada` });
    // If saida, auto-generate conta_pagar? No, just track stock
    setNm({ produto_id: "", tipo: "entrada", quantidade: 0, valor_unitario: 0, obra_id: "", documento: "", observacoes: "" });
    setShowNewMov(false);
    loadData();
  };

  const saveEpi = async () => {
    if (!ne.funcionario_id || !ne.produto_id || !ne.empresa_id) { toast({ title: "Funcionário, EPI e Empresa são obrigatórios", variant: "destructive" }); return; }
    const empresaId = ne.empresa_id;

    // Register EPI delivery
    const { error: epiError } = await supabase.from("entregas_epi").insert({
      funcionario_id: ne.funcionario_id, produto_id: ne.produto_id,
      obra_id: ne.obra_id || null, empresa_id: empresaId,
      quantidade: Number(ne.quantidade), ca_numero: ne.ca_numero || null,
      observacoes: ne.observacoes || null,
    });
    if (epiError) { toast({ title: "Erro", description: epiError.message, variant: "destructive" }); return; }

    // Auto stock withdrawal
    await supabase.from("movimentacoes_estoque").insert({
      produto_id: ne.produto_id, tipo: "saida_epi", quantidade: Number(ne.quantidade),
      obra_id: ne.obra_id || null, observacoes: `Entrega EPI - ${funcionarios.find(f => f.id === ne.funcionario_id)?.nome || ""}`,
    });

    toast({ title: "EPI entregue e baixa no estoque realizada" });
    setNe({ funcionario_id: "", produto_id: "", obra_id: "", quantidade: 1, ca_numero: "", observacoes: "", empresa_id: "" });
    setShowNewEpi(false);
    loadData();
  };

  const inputClass = "w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
            <p className="text-sm text-muted-foreground">{produtos.length} produtos • {abaixoMinimo.length} abaixo do mínimo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ImportarPlanilha onImportComplete={loadData} />
            <button onClick={() => setShowNewProduto(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Novo Produto
            </button>
            <button onClick={() => setShowNewMov(true)} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <ArrowDown className="h-4 w-4" /> Movimentação
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground -mt-3">
          As entradas são geradas automaticamente quando uma compra é recebida. Para entrega de EPI, use o módulo dedicado.
        </p>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Produtos</p>
            <p className="text-2xl font-bold">{produtos.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Movimentações (mês)</p>
            <p className="text-2xl font-bold">{movimentacoes.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Abaixo do Mínimo</p>
            <p className="text-2xl font-bold text-destructive">{abaixoMinimo.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Valor Estoque</p>
            <p className="text-2xl font-bold">R$ {stockBalances.reduce((s, p) => {
              const lastEntry = movimentacoes.find(m => m.produto_id === p.id && m.tipo === "entrada" && m.valor_unitario);
              return s + (p.saldo * (lastEntry?.valor_unitario || 0));
            }, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Alerts */}
        {abaixoMinimo.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">Produtos abaixo do estoque mínimo</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {abaixoMinimo.map(p => (
                <span key={p.id} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive font-medium">
                  {p.descricao} (saldo: {p.saldo} / mín: {p.estoque_minimo})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([["produtos", "Produtos"], ["movimentacoes", "Movimentações"], ["epi", "Entregas EPI"], ["estoque_minimo", "Alertas"]] as [TabKey, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Content */}
        {tab === "produtos" && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Unidade</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Entradas</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saídas</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutos.map(p => (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${p.abaixoMinimo ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.codigo || "—"}</td>
                      <td className="px-4 py-3 font-medium">{p.descricao}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.categoria || "—"}</td>
                      <td className="px-4 py-3 text-center text-xs">{p.unidade}</td>
                      <td className="px-4 py-3 text-right text-success font-medium">{p.entradas}</td>
                      <td className="px-4 py-3 text-right text-destructive font-medium">{p.saidas}</td>
                      <td className="px-4 py-3 text-right font-bold">{p.saldo}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{p.estoque_minimo || "—"}</td>
                    </tr>
                  ))}
                  {filteredProdutos.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto cadastrado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "movimentacoes" && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qtd</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor Unit.</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs">{format(new Date(m.data_movimentacao), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.tipo === "entrada" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {m.tipo === "entrada" ? "Entrada" : m.tipo === "saida_epi" ? "Saída EPI" : "Saída"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{(m as any).produtos?.descricao || "—"}</td>
                      <td className="px-4 py-3 text-right">{m.quantidade}</td>
                      <td className="px-4 py-3 text-right text-xs">{m.valor_unitario ? `R$ ${Number(m.valor_unitario).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{(m as any).obras?.nome || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.documento || "—"}</td>
                    </tr>
                  ))}
                  {movimentacoes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhuma movimentação</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "epi" && (
          <div className="rounded-xl border bg-card shadow-sm p-6">
            <p className="text-sm text-muted-foreground mb-4">Entregas de EPI são registradas com baixa automática no estoque. Use o botão "Entrega EPI" para registrar.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qtd</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.filter(m => m.tipo === "saida_epi").map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs">{format(new Date(m.data_movimentacao), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3 font-medium">{(m as any).produtos?.descricao || "—"}</td>
                      <td className="px-4 py-3 text-right">{m.quantidade}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.observacoes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "estoque_minimo" && (
          <div className="space-y-3">
            {abaixoMinimo.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center">
                <Package className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Todos os produtos estão acima do estoque mínimo!</p>
              </div>
            ) : (
              abaixoMinimo.map(p => (
                <div key={p.id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.descricao}</p>
                    <p className="text-xs text-muted-foreground">Código: {p.codigo || "—"} • {p.categoria || "Geral"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">{p.saldo} {p.unidade}</p>
                    <p className="text-xs text-muted-foreground">Mínimo: {p.estoque_minimo}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal: Novo Produto */}
      {showNewProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNewProduto(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Novo Produto</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Descrição *</label><input value={np.descricao} onChange={e => setNp(p => ({ ...p, descricao: e.target.value }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">Código</label><input value={np.codigo} onChange={e => setNp(p => ({ ...p, codigo: e.target.value }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">Categoria</label>
                <select value={np.categoria} onChange={e => setNp(p => ({ ...p, categoria: e.target.value }))} className={inputClass}>
                  <option value="">Selecione...</option>
                  <option value="EPI">EPI</option><option value="Ferramentas">Ferramentas</option><option value="Material">Material</option><option value="Consumível">Consumível</option><option value="Outros">Outros</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Unidade</label>
                <select value={np.unidade} onChange={e => setNp(p => ({ ...p, unidade: e.target.value }))} className={inputClass}>
                  <option value="un">un</option><option value="par">par</option><option value="kg">kg</option><option value="m">m</option><option value="m²">m²</option><option value="m³">m³</option><option value="l">l</option><option value="cx">cx</option><option value="sc">sc</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Estoque Mínimo</label><input type="number" value={np.estoque_minimo} onChange={e => setNp(p => ({ ...p, estoque_minimo: Number(e.target.value) }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">NCM</label><input value={np.ncm} onChange={e => setNp(p => ({ ...p, ncm: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewProduto(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={saveProduto} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Movimentação */}
      {showNewMov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNewMov(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Nova Movimentação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Tipo *</label>
                <select value={nm.tipo} onChange={e => setNm(p => ({ ...p, tipo: e.target.value }))} className={inputClass}>
                  <option value="entrada">Entrada</option><option value="saida">Saída</option>
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Produto *</label>
                <select value={nm.produto_id} onChange={e => setNm(p => ({ ...p, produto_id: e.target.value }))} className={inputClass}>
                  <option value="">Selecione...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.descricao}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Quantidade *</label><input type="number" value={nm.quantidade} onChange={e => setNm(p => ({ ...p, quantidade: Number(e.target.value) }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">Valor Unitário</label><input type="number" step="0.01" value={nm.valor_unitario} onChange={e => setNm(p => ({ ...p, valor_unitario: Number(e.target.value) }))} className={inputClass} /></div>
              <div><label className="text-xs text-muted-foreground">Obra</label>
                <select value={nm.obra_id} onChange={e => setNm(p => ({ ...p, obra_id: e.target.value }))} className={inputClass}>
                  <option value="">Nenhuma</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-muted-foreground">Documento</label><input value={nm.documento} onChange={e => setNm(p => ({ ...p, documento: e.target.value }))} className={inputClass} placeholder="Nº NF, OC..." /></div>
              <div className="col-span-2"><label className="text-xs text-muted-foreground">Observações</label><input value={nm.observacoes} onChange={e => setNm(p => ({ ...p, observacoes: e.target.value }))} className={inputClass} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewMov(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={saveMovimentacao} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Registrar</button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
}
