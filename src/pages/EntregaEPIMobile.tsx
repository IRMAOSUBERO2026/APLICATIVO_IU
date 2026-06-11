import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, HardHat, Plus, Save, Check, Search, X, ChevronDown, ChevronUp, Camera, FileSignature, Copy, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { gerarFichaEPIEEnviarAssinatura } from "@/lib/gerarFichaEPI";

interface Funcionario { id: string; nome: string; cargo: string; obra_id: string | null; empresa_id: string; }
interface Obra { id: string; nome: string; codigo: string; }
interface Produto { id: string; descricao: string; categoria: string | null; ca_numero: string | null; }

export const MOTIVOS_NR6 = [
  "Entrada na empresa",
  "Primeira entrega",
  "Troca por desgaste",
  "Substituição periódica",
  "Perda / Extravio",
  "Dano / Avaria",
  "Devolução",
  "Reposição por contaminação",
  "Mudança de função",
  "Retorno de afastamento",
  "Outro",
];

interface ItemEntrega {
  produto_id: string | null; // null quando "Outro"
  produto_nome: string;
  quantidade: number;
  ca_numero: string;
  motivo: string;
  is_novo?: boolean;
}

function formatData(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

export default function EntregaEPIMobile() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [allFuncionarios, setAllFuncionarios] = useState<Funcionario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [obraId, setObraId] = useState("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [searchFunc, setSearchFunc] = useState("");
  const [searchProd, setSearchProd] = useState("");
  const [itens, setItens] = useState<ItemEntrega[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [localEntrega, setLocalEntrega] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gerandoFicha, setGerandoFicha] = useState(false);
  const [fichaUrl, setFichaUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"obra" | "funcionario" | "itens" | "confirma">("obra");

  useEffect(() => {
    Promise.all([
      supabase.from("obras").select("id, nome, codigo").in("status", OBRA_STATUS_ATIVOS_ARR).order("codigo"),
      supabase.from("funcionarios").select("id, nome, cargo, obra_id, empresa_id").neq("status", "desligado").order("nome"),
      supabase.from("produtos").select("id, descricao, categoria, ca_numero").eq("ativo", true).eq("categoria", "EPI").order("descricao"),
    ]).then(([o, f, p]) => {
      if (o.data) setObras(o.data);
      if (f.data) setAllFuncionarios(f.data);
      if (p.data) setProdutos(p.data);
    });
  }, []);

  const funcionariosObra = obraId
    ? allFuncionarios.filter(f => f.obra_id === obraId)
    : allFuncionarios;

  const funcFiltered = funcionariosObra.filter(f =>
    !searchFunc || f.nome.toLowerCase().includes(searchFunc.toLowerCase())
  );

  const prodFiltered = produtos.filter(p =>
    !searchProd || p.descricao.toLowerCase().includes(searchProd.toLowerCase())
  );

  const selectedFunc = allFuncionarios.find(f => f.id === funcionarioId);

  const addItem = (prod: Produto) => {
    if (itens.find(i => i.produto_id === prod.id)) return;
    setItens(prev => [...prev, { produto_id: prod.id, produto_nome: prod.descricao, quantidade: 1, ca_numero: prod.ca_numero || "", motivo: "Primeira entrega" }]);
  };

  const addItemNovo = () => {
    setItens(prev => [...prev, { produto_id: null, produto_nome: "", quantidade: 1, ca_numero: "", motivo: "Primeira entrega", is_novo: true }]);
  };

  const removeItem = (idx: number) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemEntrega, value: any) => {
    setItens(prev => prev.map((i, ix) => ix === idx ? { ...i, [field]: value } : i));
  };

  const allCaFilled = itens.every(i => i.ca_numero.trim() !== "");
  const allNomesFilled = itens.every(i => i.produto_nome.trim() !== "");
  const podeRevisar = itens.length > 0 && allCaFilled && allNomesFilled;

  const handleSave = async () => {
    if (!funcionarioId || itens.length === 0) return;
    if (!allCaFilled || !allNomesFilled) {
      toast({ title: "Preencha nome e Nº CA de todos os itens", variant: "destructive" });
      return;
    }
    setSaving(true);

    const func = allFuncionarios.find(f => f.id === funcionarioId);
    if (!func) { setSaving(false); return; }

    const agora = new Date();

    // Upload da foto de comprovação (se houver) — nome padrão Epi-DDMMAAAA-Nome
    let fotoUrl: string | null = null;
    if (fotoFile) {
      try {
        const ext = (fotoFile.name.split(".").pop() || "jpg").toLowerCase();
        const primeiroNome = (func.nome || "func")
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "");
        const nomeArquivo = `Epi-${formatData(agora)}-${primeiroNome}_${agora.getTime()}.${ext}`;
        const path = `funcionarios/${func.id}/EPI/${nomeArquivo}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(path, fotoFile, { upsert: true, contentType: fotoFile.type || undefined });
        if (upErr) {
          toast({ title: "Erro ao enviar foto", description: upErr.message, variant: "destructive" });
        } else {
          fotoUrl = supabase.storage.from("documentos").getPublicUrl(path).data.publicUrl;
        }
      } catch (e: any) {
        toast({ title: "Falha no upload da foto", description: e?.message, variant: "destructive" });
      }
    }

    const localFinal = localEntrega.trim()
      || (obraId ? `${obras.find(o => o.id === obraId)?.codigo} - ${obras.find(o => o.id === obraId)?.nome}` : "")
      || null;

    for (const item of itens) {
      let produtoId = item.produto_id;

      // Se for "Outro" (novo EPI), cria o produto antes
      if (!produtoId && item.is_novo) {
        const { data: novoProd, error: prodError } = await supabase
          .from("produtos")
          .insert({
            descricao: item.produto_nome,
            categoria: "EPI",
            unidade: "un",
            ca_numero: item.ca_numero || null,
            ativo: true,
          })
          .select("id")
          .single();

        if (prodError || !novoProd) {
          toast({ title: "Erro ao cadastrar novo EPI", description: prodError?.message, variant: "destructive" });
          setSaving(false);
          return;
        }
        produtoId = novoProd.id;
      }

      const { error: epiError } = await supabase.from("entregas_epi").insert({
        funcionario_id: funcionarioId,
        produto_id: produtoId!,
        obra_id: obraId || null,
        empresa_id: func.empresa_id,
        quantidade: item.quantidade,
        ca_numero: item.ca_numero || null,
        motivo: item.motivo || "Primeira entrega",
        observacoes: observacoes || null,
        foto_entrega_url: fotoUrl,
        local_entrega: localFinal,
        data_hora_entrega: agora.toISOString(),
      } as any);

      if (epiError) {
        toast({ title: "Erro ao salvar", description: epiError.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      await supabase.from("movimentacoes_estoque").insert({
        produto_id: produtoId!,
        tipo: "saida_epi",
        quantidade: item.quantidade,
        obra_id: obraId || null,
        observacoes: `EPI para ${func.nome} - ${item.produto_nome}`,
      });
    }

    setSaving(false);
    setSaved(true);
    toast({ title: `${itens.length} EPI(s) entregue(s) com sucesso!` });
  };

  const reset = () => {
    setFuncionarioId("");
    setItens([]);
    setObservacoes("");
    setSaved(false);
    setFichaUrl(null);
    setStep("obra");
    setSearchFunc("");
    setSearchProd("");
  };

  const handleGerarFicha = async () => {
    if (!selectedFunc) return;
    setGerandoFicha(true);
    try {
      const r = await gerarFichaEPIEEnviarAssinatura(selectedFunc.id, selectedFunc.empresa_id);
      setFichaUrl(r.url);
      toast({ title: "Ficha de EPI gerada!", description: `${r.totalItens} item(ns) — link de assinatura pronto.` });
    } catch (e: any) {
      toast({ title: "Erro ao gerar ficha", description: e.message, variant: "destructive" });
    } finally {
      setGerandoFicha(false);
    }
  };

  const copiarLink = () => {
    if (!fichaUrl) return;
    navigator.clipboard.writeText(fichaUrl);
    toast({ title: "Link copiado!" });
  };

  // Success screen
  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Entrega Registrada!</h2>
          <p className="text-sm text-muted-foreground">{itens.length} item(ns) entregue(s) para {selectedFunc?.nome}</p>

          {!fichaUrl ? (
            <div className="rounded-xl border bg-card p-4 space-y-3 text-left">
              <div className="flex items-start gap-2">
                <FileSignature className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Ficha de EPI (NR-6)</p>
                  <p className="text-xs text-muted-foreground">Gere a ficha consolidada com todo o histórico de entregas e envie para assinatura digital do funcionário.</p>
                </div>
              </div>
              <button
                onClick={handleGerarFicha}
                disabled={gerandoFicha}
                className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {gerandoFicha ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                {gerandoFicha ? "Gerando..." : "Gerar Ficha e Enviar para Assinatura"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-success bg-success/5 p-4 space-y-3 text-left">
              <p className="text-sm font-semibold text-success flex items-center gap-2"><Check className="h-4 w-4" /> Ficha pronta para assinatura!</p>
              <p className="text-xs text-muted-foreground">Compartilhe este link com o funcionário (válido por 7 dias):</p>
              <div className="rounded-lg border bg-background p-2 text-[10px] break-all font-mono">{fichaUrl}</div>
              <div className="flex gap-2">
                <button onClick={copiarLink} className="flex-1 rounded-lg border bg-card px-3 py-2 text-xs font-medium flex items-center justify-center gap-1">
                  <Copy className="h-3 w-3" /> Copiar Link
                </button>
                <a href={fichaUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground text-center">
                  Abrir Ficha
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button onClick={reset} className="rounded-xl border bg-card px-6 py-3 text-sm font-medium">
              <Plus className="h-4 w-4 inline mr-2" /> Nova Entrega
            </button>
            <Link to="/entrega-epi" className="text-sm text-muted-foreground underline">Voltar ao painel</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md">
        <Link to="/entrega-epi" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-base font-bold">Entrega de EPI</h1>
          <p className="text-[10px] opacity-80">Lançamento Rápido</p>
        </div>
        <HardHat className="h-5 w-5 opacity-70" />
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-3 flex items-center gap-2">
        {["obra", "funcionario", "itens", "confirma"].map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${
              ["obra", "funcionario", "itens", "confirma"].indexOf(step) >= i ? "bg-primary" : "bg-muted"
            }`} />
          </div>
        ))}
      </div>

      <div className="p-4 pb-28">
        {/* Step 1: Select Obra */}
        {step === "obra" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Selecione a Obra</h2>
            <p className="text-sm text-muted-foreground">Filtra os funcionários da obra selecionada</p>
            <div className="space-y-2">
              <button
                onClick={() => { setObraId(""); setStep("funcionario"); }}
                className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/50 ${!obraId ? "border-primary bg-primary/5" : ""}`}
              >
                <p className="text-sm font-medium">Todas as obras</p>
                <p className="text-xs text-muted-foreground">{allFuncionarios.length} funcionários</p>
              </button>
              {obras.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setObraId(o.id); setStep("funcionario"); }}
                  className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/50 ${obraId === o.id ? "border-primary bg-primary/5" : ""}`}
                >
                  <p className="text-sm font-medium">{o.codigo} - {o.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {allFuncionarios.filter(f => f.obra_id === o.id).length} funcionários
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Funcionario */}
        {step === "funcionario" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Selecione o Funcionário</h2>
              <button onClick={() => setStep("obra")} className="text-xs text-muted-foreground underline">Voltar</button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar nome..."
                value={searchFunc}
                onChange={e => setSearchFunc(e.target.value)}
                className="w-full rounded-xl border bg-card py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {funcFiltered.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setFuncionarioId(f.id); setStep("itens"); }}
                  className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-primary/10"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {f.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{f.cargo}</p>
                  </div>
                </button>
              ))}
              {funcFiltered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum funcionário encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Add EPI Items */}
        {step === "itens" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Itens de EPI</h2>
                <p className="text-xs text-muted-foreground">Para: {selectedFunc?.nome}</p>
              </div>
              <button onClick={() => setStep("funcionario")} className="text-xs text-muted-foreground underline">Voltar</button>
            </div>

            {/* Filtro rápido */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar lista de EPIs..."
                value={searchProd}
                onChange={e => setSearchProd(e.target.value)}
                className="w-full rounded-xl border bg-card py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Lista completa de EPIs (sempre visível) */}
            <div className="rounded-xl border bg-card max-h-[55vh] overflow-y-auto">
              <div className="px-3 py-2 border-b bg-muted/30 sticky top-0">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                  {prodFiltered.length} EPI(s) disponível(is) — toque para adicionar
                </p>
              </div>
              {prodFiltered.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground text-center">Nenhum EPI encontrado</p>
              ) : (
                prodFiltered.map(p => {
                  const jaAdicionado = !!itens.find(i => i.produto_id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      disabled={jaAdicionado}
                      className="w-full flex items-start gap-3 px-4 py-3 border-b last:border-0 text-left hover:bg-muted/50 disabled:opacity-50 disabled:bg-primary/5 transition-colors"
                    >
                      <span className={`mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full ${jaAdicionado ? "bg-primary/15" : "bg-primary/10"}`}>
                        {jaAdicionado ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Plus className="h-4 w-4 text-primary" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug break-words">{p.descricao}</p>
                        {p.ca_numero && <p className="mt-0.5 text-[10px] text-muted-foreground">CA: {p.ca_numero}</p>}
                      </div>
                    </button>
                  );
                })
              )}
              {/* Opção "Outro" */}
              <button
                onClick={addItemNovo}
                className="w-full flex items-center gap-2 px-4 py-3 border-t-2 border-dashed text-left hover:bg-accent/30 transition-colors"
              >
                <Plus className="h-4 w-4 text-accent-foreground" />
                <div>
                  <p className="text-sm font-semibold">Outro EPI (não cadastrado)</p>
                  <p className="text-[10px] text-muted-foreground">Descrever manualmente um novo item</p>
                </div>
              </button>
            </div>

            {/* Selected items */}
            {itens.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{itens.length} item(ns) selecionado(s)</p>
                {itens.map((item, idx) => (
                  <div key={idx} className={`rounded-xl border bg-card p-4 space-y-3 ${item.is_novo ? "border-accent" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      {item.is_novo ? (
                        <div className="flex-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Descrição do novo EPI <span className="text-destructive">*</span></label>
                          <input
                            type="text"
                            value={item.produto_nome}
                            onChange={e => updateItem(idx, "produto_nome", e.target.value)}
                            placeholder="Ex: Luva nitrílica azul"
                            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${!item.produto_nome.trim() ? "border-destructive" : ""}`}
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-medium flex-1">{item.produto_nome}</p>
                      )}
                      <button onClick={() => removeItem(idx)} className="p-1 text-destructive shrink-0"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">Quantidade</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={e => updateItem(idx, "quantidade", Number(e.target.value))}
                          className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground">Nº CA <span className="text-destructive">*</span></label>
                        <input
                          type="text"
                          value={item.ca_numero}
                          onChange={e => updateItem(idx, "ca_numero", e.target.value)}
                          placeholder="Obrigatório"
                          className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${!item.ca_numero.trim() ? "border-destructive" : ""}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Motivo da entrega (NR-6)</label>
                      <select
                        value={item.motivo}
                        onChange={e => updateItem(idx, "motivo", e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                      >
                        {MOTIVOS_NR6.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observações (opcional)</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: troca por desgaste..."
                rows={2}
                className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none"
              />
            </div>

            {itens.length > 0 && (
              <button onClick={() => setStep("confirma")}
                disabled={!podeRevisar}
                className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50">
                {!podeRevisar ? "Preencha nome e CA de todos os itens" : "Revisar Entrega →"}
              </button>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirma" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Confirmar Entrega</h2>
              <button onClick={() => setStep("itens")} className="text-xs text-muted-foreground underline">Voltar</button>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {selectedFunc?.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{selectedFunc?.nome}</p>
                  <p className="text-xs text-muted-foreground">{selectedFunc?.cargo}</p>
                </div>
              </div>
              {obraId && (
                <p className="text-xs text-muted-foreground">
                  Obra: {obras.find(o => o.id === obraId)?.codigo} - {obras.find(o => o.id === obraId)?.nome}
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-card divide-y">
              {itens.map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.produto_nome} {item.is_novo && <span className="text-[9px] uppercase text-accent-foreground bg-accent/30 px-1.5 py-0.5 rounded ml-1">NOVO</span>}</p>
                    {item.ca_numero && <p className="text-[10px] text-muted-foreground">CA: {item.ca_numero}</p>}
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{item.quantidade}x</span>
                </div>
              ))}
            </div>

            {observacoes && (
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{observacoes}</p>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50"
            >
              {saving ? "Salvando..." : "✓ Confirmar Entrega"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
