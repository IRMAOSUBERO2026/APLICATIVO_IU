import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSalariosBase } from "@/hooks/useSalariosBase";
import { CARGOS_PADRAO } from "@/lib/cargosPadrao";
import { getUsuarioImpressao } from "@/lib/usuarioImpressao";
import { DollarSign, Plus, Save, Search, Trash2, RefreshCw, History, PlusCircle, Pencil, MinusCircle } from "lucide-react";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

interface LogSalario {
  id: string;
  cargo: string;
  acao: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  usuario: string | null;
  created_at: string;
}

async function registrarLog(entrada: {
  cargo: string;
  acao: "adicao" | "edicao" | "remocao";
  valor_anterior: number | null;
  valor_novo: number | null;
}) {
  const usuario = getUsuarioImpressao().label || "Usuário não identificado";
  await supabase.from("salarios_base_cargo_log").insert({ ...entrada, usuario });
}

export default function SalariosBaseCargo() {
  const { lista, loading, carregar } = useSalariosBase();
  const [busca, setBusca] = useState("");
  const [editValores, setEditValores] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [novoCargo, setNovoCargo] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [aba, setAba] = useState<"valores" | "historico">("valores");
  const [logs, setLogs] = useState<LogSalario[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const carregarLogs = useCallback(async () => {
    setLoadingLog(true);
    const { data } = await supabase
      .from("salarios_base_cargo_log")
      .select("id, cargo, acao, valor_anterior, valor_novo, usuario, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs((data as LogSalario[]) ?? []);
    setLoadingLog(false);
  }, []);

  useEffect(() => {
    if (aba === "historico") carregarLogs();
  }, [aba, carregarLogs]);

  const filtrada = useMemo(
    () =>
      lista.filter((r) =>
        r.cargo.toLowerCase().includes(busca.trim().toLowerCase()),
      ),
    [lista, busca],
  );

  const cargosDisponiveis = useMemo(
    () => CARGOS_PADRAO.filter((c) => !lista.some((r) => r.cargo === c)),
    [lista],
  );

  const salvar = async (id: string, cargo: string) => {
    const raw = editValores[id];
    const valor = Number(raw);
    if (raw === undefined || isNaN(valor) || valor < 0) {
      toast({ title: "Valor inválido", description: "Informe um valor numérico válido.", variant: "destructive" });
      return;
    }
    setSalvando(id);
    const { error } = await supabase
      .from("salarios_base_cargo")
      .update({ salario_base: valor })
      .eq("id", id);
    setSalvando(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Salário atualizado", description: `${cargo}: ${brl(valor)}` });
    setEditValores((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    carregar();
  };

  const adicionar = async () => {
    const cargo = novoCargo.trim();
    const valor = Number(novoValor);
    if (!cargo) {
      toast({ title: "Informe o cargo", variant: "destructive" });
      return;
    }
    if (isNaN(valor) || valor < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("salarios_base_cargo")
      .insert({ cargo, salario_base: valor });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cargo adicionado", description: `${cargo}: ${brl(valor)}` });
    setNovoCargo("");
    setNovoValor("");
    carregar();
  };

  const remover = async (id: string, cargo: string) => {
    if (!confirm(`Remover o salário-base de "${cargo}"?`)) return;
    const { error } = await supabase.from("salarios_base_cargo").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removido", description: cargo });
    carregar();
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Salário-Base por Função</h1>
          <p className="text-sm text-muted-foreground">
            Valores de piso (convenção coletiva) aplicados automaticamente ao selecionar o cargo no cadastro.
          </p>
        </div>
      </div>

      {/* Adicionar */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Adicionar cargo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px,auto] gap-2">
          <input
            list="cargos-salario-list"
            value={novoCargo}
            onChange={(e) => setNovoCargo(e.target.value)}
            placeholder="Nome do cargo"
            className="rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="cargos-salario-list">
            {cargosDisponiveis.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            type="number"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
            placeholder="Salário-base"
            className="rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={adicionar}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cargo..."
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={carregar}
          className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Lista */}
      <div className="rounded-xl border bg-card divide-y">
        {loading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
        {!loading && filtrada.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground text-center">Nenhum cargo encontrado.</p>
        )}
        {filtrada.map((r) => {
          const emEdicao = editValores[r.id] !== undefined;
          return (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.cargo}</p>
                {!emEdicao && (
                  <p className="text-xs text-muted-foreground">{brl(Number(r.salario_base))}</p>
                )}
              </div>
              <input
                type="number"
                value={emEdicao ? editValores[r.id] : r.salario_base}
                onChange={(e) => setEditValores((p) => ({ ...p, [r.id]: e.target.value }))}
                className="w-32 rounded-lg border bg-card py-1.5 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => salvar(r.id, r.cargo)}
                disabled={!emEdicao || salvando === r.id}
                className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" /> Salvar
              </button>
              <button
                onClick={() => remover(r.id, r.cargo)}
                className="p-1.5 text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
