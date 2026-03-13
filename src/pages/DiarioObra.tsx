import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Users, Calendar, Save, Trash2, Smartphone, Clock, Calculator, Wrench, UserPlus, Truck, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ObraOption { id: string; nome: string; codigo: string; }
interface FuncOption { id: string; nome: string; cargo: string; obra_id: string | null; }

interface FuncPresenca {
  id: string;
  nome: string;
  cargo: string;
  presente: boolean;
  horas: number;
}

interface Atividade {
  servico: string;
  quantidade: number;
  unidade: string;
  descricao: string;
}

interface EquipProprio {
  id: string;
  nome: string;
  selecionado: boolean;
}

interface EquipLocado {
  descricao: string;
  fornecedor: string;
  quantidade: number;
  valor_diario: number;
}

const SERVICOS = ["Carpintaria", "Armação", "Concretagem", "Regularização", "Alvenaria", "Elétrica", "Hidráulica", "Pintura", "Outros"];
const UNIDADES = ["m²", "m³", "kg", "m", "un", "vb"];

export default function DiarioObra() {
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [allFuncionarios, setAllFuncionarios] = useState<FuncOption[]>([]);
  const [selectedObra, setSelectedObra] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Presença da obra selecionada
  const [presencaObra, setPresencaObra] = useState<FuncPresenca[]>([]);
  // Presença de visitantes (de outras obras)
  const [presencaVisitantes, setPresencaVisitantes] = useState<FuncPresenca[]>([]);
  // Atividades
  const [atividades, setAtividades] = useState<Atividade[]>([{ servico: "", quantidade: 0, unidade: "m²", descricao: "" }]);
  // Equipamentos próprios
  const [equipsProprios, setEquipsProprios] = useState<EquipProprio[]>([]);
  // Equipamentos locados
  const [equipsLocados, setEquipsLocados] = useState<EquipLocado[]>([]);

  const [saving, setSaving] = useState(false);

  // AI Summary
  const [resumoIA, setResumoIA] = useState("");
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [diariosSalvos, setDiariosSalvos] = useState<any[]>([]);

  // Load saved diarios for the selected obra
  useEffect(() => {
    if (!selectedObra) { setDiariosSalvos([]); return; }
    supabase.from("diarios_obra").select("*, obras(nome)").eq("obra_id", selectedObra).order("data", { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setDiariosSalvos(data); });
  }, [selectedObra]);

  const gerarResumoIA = async () => {
    if (diariosSalvos.length === 0) {
      toast({ title: "Sem registros", description: "Salve pelo menos um diário para gerar o resumo.", variant: "destructive" });
      return;
    }
    setGerandoResumo(true);
    setResumoIA("");

    const diariosPayload = diariosSalvos.map(d => ({
      data: d.data,
      obra_nome: (d.obras as any)?.nome || "",
      responsavel: d.responsavel,
      clima: d.clima,
      mao_de_obra_presente: d.mao_de_obra_presente,
      atividades_executadas: d.atividades_executadas,
      ocorrencias: d.ocorrencias,
      condicoes_trabalho: d.condicoes_trabalho,
      observacoes: d.observacoes,
    }));

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resumo-diario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ diarios: diariosPayload }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        toast({ title: "Erro ao gerar resumo", description: (errData as any).error || "Tente novamente.", variant: "destructive" });
        setGerandoResumo(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; setResumoIA(fullText); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro de conexão", variant: "destructive" });
    }
    setGerandoResumo(false);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento"),
      supabase.from("funcionarios").select("id, nome, cargo, obra_id").eq("status", "ativo"),
    ]).then(([obrasRes, funcRes]) => {
      if (obrasRes.data) setObras(obrasRes.data);
      if (funcRes.data) setAllFuncionarios(funcRes.data);
    });
  }, []);

  // Quando muda a obra, carrega funcionários dessa obra e de outras
  useEffect(() => {
    if (!selectedObra) {
      setPresencaObra([]);
      setPresencaVisitantes([]);
      return;
    }
    const daObra = allFuncionarios.filter(f => f.obra_id === selectedObra);
    const deOutras = allFuncionarios.filter(f => f.obra_id !== selectedObra);

    setPresencaObra(daObra.map(f => ({ id: f.id, nome: f.nome, cargo: f.cargo, presente: true, horas: 8 })));
    setPresencaVisitantes(deOutras.map(f => ({ id: f.id, nome: f.nome, cargo: f.cargo, presente: false, horas: 8 })));
  }, [selectedObra, allFuncionarios]);

  // Cálculos automáticos
  const horasHomem = useMemo(() => {
    const horasObra = presencaObra.filter(f => f.presente).reduce((s, f) => s + f.horas, 0);
    const horasVisit = presencaVisitantes.filter(f => f.presente).reduce((s, f) => s + f.horas, 0);
    return horasObra + horasVisit;
  }, [presencaObra, presencaVisitantes]);

  const totalPresentes = useMemo(() => {
    return presencaObra.filter(f => f.presente).length + presencaVisitantes.filter(f => f.presente).length;
  }, [presencaObra, presencaVisitantes]);

  const totalQuantidade = useMemo(() => atividades.reduce((s, a) => s + a.quantidade, 0), [atividades]);
  const produtividade = useMemo(() => horasHomem > 0 ? (totalQuantidade / horasHomem).toFixed(4) : "—", [totalQuantidade, horasHomem]);

  const togglePresenca = (list: FuncPresenca[], setList: React.Dispatch<React.SetStateAction<FuncPresenca[]>>, id: string) => {
    setList(prev => prev.map(f => f.id === id ? { ...f, presente: !f.presente } : f));
  };

  const updateHoras = (list: FuncPresenca[], setList: React.Dispatch<React.SetStateAction<FuncPresenca[]>>, id: string, horas: number) => {
    setList(prev => prev.map(f => f.id === id ? { ...f, horas } : f));
  };

  const addAtividade = () => setAtividades(prev => [...prev, { servico: "", quantidade: 0, unidade: "m²", descricao: "" }]);
  const removeAtividade = (i: number) => setAtividades(prev => prev.filter((_, idx) => idx !== i));
  const updateAtividade = (i: number, field: keyof Atividade, value: any) => {
    setAtividades(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  const addEquipLocado = () => setEquipsLocados(prev => [...prev, { descricao: "", fornecedor: "", quantidade: 1, valor_diario: 0 }]);
  const removeEquipLocado = (i: number) => setEquipsLocados(prev => prev.filter((_, idx) => idx !== i));
  const updateEquipLocado = (i: number, field: keyof EquipLocado, value: any) => {
    setEquipsLocados(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  };

  const marcarTodosObra = (presente: boolean) => {
    setPresencaObra(prev => prev.map(f => ({ ...f, presente })));
  };

  const handleSave = async () => {
    if (!selectedObra) { toast({ title: "Selecione uma obra", variant: "destructive" }); return; }
    setSaving(true);

    const presentes = [
      ...presencaObra.filter(f => f.presente).map(f => ({ id: f.id, nome: f.nome, horas: f.horas, tipo: "obra" })),
      ...presencaVisitantes.filter(f => f.presente).map(f => ({ id: f.id, nome: f.nome, horas: f.horas, tipo: "visitante" })),
    ];

    const atividadesTexto = atividades
      .filter(a => a.servico)
      .map(a => `${a.servico}: ${a.quantidade} ${a.unidade} - ${a.descricao}`)
      .join("\n");

    const obsCompleta = [
      observacoes,
      `\n---\nPresença (${presentes.length} func.): ${JSON.stringify(presentes)}`,
      `\nAtividades estruturadas: ${JSON.stringify(atividades.filter(a => a.servico))}`,
      equipsLocados.length > 0 ? `\nEquip. locados: ${JSON.stringify(equipsLocados)}` : "",
      `\nHoras-Homem: ${horasHomem} | Produtividade: ${produtividade}`,
    ].join("");

    const { error } = await supabase.from("diarios_obra").insert({
      obra_id: selectedObra,
      data,
      mao_de_obra_presente: totalPresentes,
      atividades_executadas: atividadesTexto || null,
      observacoes: obsCompleta || null,
      responsavel: responsavel || null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Diário salvo com sucesso!" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diário de Obra</h1>
            <p className="text-sm text-muted-foreground">Registro diário de atividades, equipe e materiais</p>
          </div>
          <div className="flex gap-2">
            <Link to="/diario-obra-mobile" className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Smartphone className="h-4 w-4" /> Lançamento Mobile
            </Link>
          </div>
        </div>

        {/* Obra + Data + Responsável */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Informações Gerais</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Obra *</label>
              <select value={selectedObra} onChange={e => setSelectedObra(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring">
                <option value="">Selecione a obra...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável</label>
              <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do responsável" />
            </div>
          </div>
        </div>

        {selectedObra && (
          <>
            {/* KPIs automáticos */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Presentes</p>
                <p className="text-2xl font-bold text-primary">{totalPresentes}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Horas-Homem</p>
                <p className="text-2xl font-bold text-primary">{horasHomem}h</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Qtd. Executada</p>
                <p className="text-2xl font-bold text-primary">{totalQuantidade}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Produtividade</p>
                <p className="text-2xl font-bold text-primary">{produtividade}</p>
              </div>
            </div>

            {/* Presença - Funcionários da Obra */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Funcionários da Obra ({presencaObra.length})
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => marcarTodosObra(true)} className="text-[10px] rounded-md border px-2 py-1 text-muted-foreground hover:bg-muted transition-colors">
                    Marcar todos
                  </button>
                  <button onClick={() => marcarTodosObra(false)} className="text-[10px] rounded-md border px-2 py-1 text-muted-foreground hover:bg-muted transition-colors">
                    Desmarcar todos
                  </button>
                </div>
              </div>

              {presencaObra.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum funcionário alocado nesta obra.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">✓</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Funcionário</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cargo</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground w-24">
                          <span className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Horas</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {presencaObra.map(f => (
                        <tr key={f.id} className={`border-b last:border-0 transition-colors ${f.presente ? "bg-success/5" : "bg-muted/20 opacity-60"}`}>
                          <td className="px-3 py-2">
                            <Checkbox checked={f.presente} onCheckedChange={() => togglePresenca(presencaObra, setPresencaObra, f.id)} />
                          </td>
                          <td className="px-3 py-2 font-medium">{f.nome}</td>
                          <td className="px-3 py-2 text-muted-foreground">{f.cargo}</td>
                          <td className="px-3 py-2">
                            <Input type="number" min={0} max={24} step={0.5} value={f.horas}
                              onChange={e => updateHoras(presencaObra, setPresencaObra, f.id, Number(e.target.value))}
                              className="h-8 text-center w-20 mx-auto" disabled={!f.presente} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Funcionários visitantes (de outras obras) */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-warning" /> Funcionários de Outras Obras
              </h2>
              <p className="text-xs text-muted-foreground">Marque os funcionários de outras obras que trabalharam nesta obra hoje.</p>

              {presencaVisitantes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum funcionário cadastrado em outras obras.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">✓</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Funcionário</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cargo</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground w-24">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presencaVisitantes.map(f => (
                        <tr key={f.id} className={`border-b last:border-0 transition-colors ${f.presente ? "bg-warning/5" : ""}`}>
                          <td className="px-3 py-2">
                            <Checkbox checked={f.presente} onCheckedChange={() => togglePresenca(presencaVisitantes, setPresencaVisitantes, f.id)} />
                          </td>
                          <td className="px-3 py-2 font-medium">{f.nome}</td>
                          <td className="px-3 py-2 text-muted-foreground">{f.cargo}</td>
                          <td className="px-3 py-2">
                            <Input type="number" min={0} max={24} step={0.5} value={f.horas}
                              onChange={e => updateHoras(presencaVisitantes, setPresencaVisitantes, f.id, Number(e.target.value))}
                              className="h-8 text-center w-20 mx-auto" disabled={!f.presente} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Atividades Executadas */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Atividades Executadas
                </h2>
                <button onClick={addAtividade} className="inline-flex items-center gap-1 text-xs rounded-lg border px-3 py-1.5 text-muted-foreground hover:bg-muted transition-colors">
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {atividades.map((at, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Atividade {i + 1}</span>
                      {atividades.length > 1 && (
                        <button onClick={() => removeAtividade(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Serviço</label>
                        <select value={at.servico} onChange={e => updateAtividade(i, "servico", e.target.value)}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                          <option value="">Selecione...</option>
                          {SERVICOS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Quantidade</label>
                        <Input type="number" min={0} step={0.01} value={at.quantidade}
                          onChange={e => updateAtividade(i, "quantidade", Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Unidade</label>
                        <select value={at.unidade} onChange={e => updateAtividade(i, "unidade", e.target.value)}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Descrição</label>
                        <Input value={at.descricao} onChange={e => updateAtividade(i, "descricao", e.target.value)} placeholder="Detalhes..." />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipamentos */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Equipamentos Próprios
              </h2>
              <p className="text-xs text-muted-foreground">Marque os equipamentos próprios utilizados hoje.</p>
              {equipsProprios.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum equipamento próprio cadastrado.</p>
              )}
              {equipsProprios.map(eq => (
                <div key={eq.id} className="flex items-center gap-3">
                  <Checkbox checked={eq.selecionado} onCheckedChange={() => {
                    setEquipsProprios(prev => prev.map(e => e.id === eq.id ? { ...e, selecionado: !e.selecionado } : e));
                  }} />
                  <span className="text-sm">{eq.nome}</span>
                </div>
              ))}
            </div>

            {/* Equipamentos Locados */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-warning" /> Equipamentos Locados
                </h2>
                <button onClick={addEquipLocado} className="inline-flex items-center gap-1 text-xs rounded-lg border px-3 py-1.5 text-muted-foreground hover:bg-muted transition-colors">
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>

              {equipsLocados.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum equipamento locado registrado.</p>
              ) : (
                <div className="space-y-3">
                  {equipsLocados.map((eq, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Equip. Locado {i + 1}</span>
                        <button onClick={() => removeEquipLocado(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Descrição</label>
                          <Input value={eq.descricao} onChange={e => updateEquipLocado(i, "descricao", e.target.value)} placeholder="Ex: Retroescavadeira" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Fornecedor</label>
                          <Input value={eq.fornecedor} onChange={e => updateEquipLocado(i, "fornecedor", e.target.value)} placeholder="Nome do locador" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Quantidade</label>
                          <Input type="number" min={1} value={eq.quantidade} onChange={e => updateEquipLocado(i, "quantidade", Number(e.target.value))} />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Valor Diário (R$)</label>
                          <Input type="number" min={0} step={0.01} value={eq.valor_diario} onChange={e => updateEquipLocado(i, "valor_diario", Number(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <label className="text-sm font-semibold">Observações Gerais</label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} placeholder="Ocorrências, condições climáticas, atrasos..." />
            </div>

            {/* Salvar */}
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Diário de Obra"}
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
