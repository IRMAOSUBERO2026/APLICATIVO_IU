import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Camera, Cloud, Sun, CloudRain, CloudSnow, Users, Save, ArrowLeft,
  Plus, X, Thermometer, Clock, Calculator, UserPlus, Wrench, Truck, Trash2, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

interface ObraOption { id: string; nome: string; codigo: string; }
interface FuncOption { id: string; nome: string; cargo: string; obra_id: string | null; }
interface FuncPresenca { id: string; nome: string; cargo: string; presente: boolean; horas: number; }
interface Atividade { servico: string; quantidade: number; unidade: string; descricao: string; }
interface EquipLocado { descricao: string; fornecedor: string; quantidade: number; valor_diario: number; }
interface EquipProprio { id: string; nome: string; selecionado: boolean; }

const CLIMAS = [
  { icon: Sun, label: "Ensolarado" },
  { icon: Cloud, label: "Nublado" },
  { icon: CloudRain, label: "Chuvoso" },
  { icon: CloudSnow, label: "Frio" },
];

const SERVICOS = ["Carpintaria", "Armação", "Concretagem", "Regularização", "Alvenaria", "Elétrica", "Hidráulica", "Pintura", "Outros"];
const UNIDADES = ["m²", "m³", "kg", "m", "un", "vb"];

export default function DiarioObraMobile() {
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [allFuncionarios, setAllFuncionarios] = useState<FuncOption[]>([]);
  const [obraId, setObraId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [clima, setClima] = useState("Ensolarado");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ocorrencias, setOcorrencias] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Presença
  const [presencaObra, setPresencaObra] = useState<FuncPresenca[]>([]);
  const [presencaVisitantes, setPresencaVisitantes] = useState<FuncPresenca[]>([]);
  // Atividades
  const [atividades, setAtividades] = useState<Atividade[]>([{ servico: "", quantidade: 0, unidade: "m²", descricao: "" }]);
  // Equipamentos
  const [equipsProprios, setEquipsProprios] = useState<EquipProprio[]>([]);
  const [equipsLocados, setEquipsLocados] = useState<EquipLocado[]>([]);

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    equipe: true, visitantes: false, atividades: true, equipProprios: false, equipLocados: false
  });
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  useEffect(() => {
    Promise.all([
      supabase.from("obras").select("id, nome, codigo").in("status", OBRA_STATUS_ATIVOS_ARR),
      supabase.from("funcionarios").select("id, nome, cargo, obra_id").eq("status", "ativo"),
    ]).then(([obrasRes, funcRes]) => {
      if (obrasRes.data) setObras(obrasRes.data);
      if (funcRes.data) setAllFuncionarios(funcRes.data);
    });
  }, []);

  useEffect(() => {
    if (!obraId) { setPresencaObra([]); setPresencaVisitantes([]); return; }
    const daObra = allFuncionarios.filter(f => f.obra_id === obraId);
    const deOutras = allFuncionarios.filter(f => f.obra_id !== obraId);
    setPresencaObra(daObra.map(f => ({ id: f.id, nome: f.nome, cargo: f.cargo, presente: true, horas: 8 })));
    setPresencaVisitantes(deOutras.map(f => ({ id: f.id, nome: f.nome, cargo: f.cargo, presente: false, horas: 8 })));
  }, [obraId, allFuncionarios]);

  // Cálculos
  const horasHomem = useMemo(() => {
    return presencaObra.filter(f => f.presente).reduce((s, f) => s + f.horas, 0)
      + presencaVisitantes.filter(f => f.presente).reduce((s, f) => s + f.horas, 0);
  }, [presencaObra, presencaVisitantes]);

  const totalPresentes = useMemo(() =>
    presencaObra.filter(f => f.presente).length + presencaVisitantes.filter(f => f.presente).length
  , [presencaObra, presencaVisitantes]);

  const totalQuantidade = useMemo(() => atividades.reduce((s, a) => s + a.quantidade, 0), [atividades]);
  const produtividade = useMemo(() => horasHomem > 0 ? (totalQuantidade / horasHomem).toFixed(4) : "—", [totalQuantidade, horasHomem]);

  const togglePresenca = (list: FuncPresenca[], setList: React.Dispatch<React.SetStateAction<FuncPresenca[]>>, id: string) => {
    setList(prev => prev.map(f => f.id === id ? { ...f, presente: !f.presente } : f));
  };

  const updateHoras = (list: FuncPresenca[], setList: React.Dispatch<React.SetStateAction<FuncPresenca[]>>, id: string, horas: number) => {
    setList(prev => prev.map(f => f.id === id ? { ...f, horas } : f));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const path = `diario-obra/${obraId}/${data}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
        setFotos(prev => [...prev, urlData.publicUrl]);
      }
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!obraId) { toast({ title: "Selecione uma obra", variant: "destructive" }); return; }
    setSaving(true);

    const presentes = [
      ...presencaObra.filter(f => f.presente).map(f => ({ id: f.id, nome: f.nome, horas: f.horas, tipo: "obra" })),
      ...presencaVisitantes.filter(f => f.presente).map(f => ({ id: f.id, nome: f.nome, horas: f.horas, tipo: "visitante" })),
    ];

    const atividadesTexto = atividades.filter(a => a.servico).map(a => `${a.servico}: ${a.quantidade} ${a.unidade} - ${a.descricao}`).join("\n");

    const obsCompleta = [
      observacoes,
      `\n---\nPresença (${presentes.length} func.): ${JSON.stringify(presentes)}`,
      `\nAtividades estruturadas: ${JSON.stringify(atividades.filter(a => a.servico))}`,
      equipsLocados.length > 0 ? `\nEquip. locados: ${JSON.stringify(equipsLocados)}` : "",
      `\nHoras-Homem: ${horasHomem} | Produtividade: ${produtividade}`,
    ].join("");

    const { error } = await supabase.from("diarios_obra").insert({
      obra_id: obraId,
      data,
      clima,
      temperatura_min: tempMin ? Number(tempMin) : null,
      temperatura_max: tempMax ? Number(tempMax) : null,
      mao_de_obra_presente: totalPresentes,
      atividades_executadas: atividadesTexto || null,
      ocorrencias: ocorrencias || null,
      condicoes_trabalho: condicoes || null,
      observacoes: obsCompleta || null,
      responsavel: responsavel || null,
      fotos: fotos.length > 0 ? fotos : null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Diário salvo com sucesso!" });
      setSaved(true);
    }
  };

  const SectionHeader = ({ icon: Icon, title, sectionKey, count, color = "text-primary" }: { icon: any; title: string; sectionKey: string; count?: number; color?: string }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between py-2">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={`h-4 w-4 ${color}`} />
        {title}
        {count !== undefined && <span className="text-xs font-normal text-muted-foreground">({count})</span>}
      </span>
      {openSections[sectionKey] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
    </button>
  );

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Save className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Registro salvo!</h2>
          <p className="text-sm text-muted-foreground">O diário de obra foi registrado com sucesso.</p>
          <button onClick={() => { setSaved(false); setAtividades([{ servico: "", quantidade: 0, unidade: "m²", descricao: "" }]); setOcorrencias(""); setFotos([]); setObservacoes(""); }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Novo Registro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md">
        <Link to="/diario-obra" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-base font-bold">Diário de Obra</h1>
          <p className="text-[10px] opacity-80">Lançamento Mobile</p>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-28">
        {/* Obra + Data */}
        <div className="space-y-3">
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm focus:ring-2 focus:ring-primary">
            <option value="">Selecione a obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full rounded-xl border bg-card px-3 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Responsável</label>
              <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Seu nome" className="w-full rounded-xl border bg-card px-3 py-3 text-sm" />
            </div>
          </div>
        </div>

        {/* Clima */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clima</label>
          <div className="grid grid-cols-4 gap-2">
            {CLIMAS.map(c => (
              <button key={c.label} onClick={() => setClima(c.label)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-colors ${
                  clima === c.label ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                <c.icon className="h-5 w-5" />
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <Thermometer className="h-4 w-4 text-primary" />
              <input type="number" value={tempMin} onChange={e => setTempMin(e.target.value)} placeholder="Min °C" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <Thermometer className="h-4 w-4 text-destructive" />
              <input type="number" value={tempMax} onChange={e => setTempMax(e.target.value)} placeholder="Max °C" className="w-full bg-transparent text-sm outline-none" />
            </div>
          </div>
        </div>

        {obraId && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="text-[9px] font-medium text-muted-foreground uppercase">Presentes</p>
                <p className="text-xl font-bold text-primary">{totalPresentes}</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="text-[9px] font-medium text-muted-foreground uppercase">Horas-Homem</p>
                <p className="text-xl font-bold text-primary">{horasHomem}h</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="text-[9px] font-medium text-muted-foreground uppercase">Qtd. Executada</p>
                <p className="text-xl font-bold text-primary">{totalQuantidade}</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="text-[9px] font-medium text-muted-foreground uppercase">Produtividade</p>
                <p className="text-xl font-bold text-primary">{produtividade}</p>
              </div>
            </div>

            {/* Funcionários da Obra */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <SectionHeader icon={Users} title="Equipe da Obra" sectionKey="equipe" count={presencaObra.length} />
              {openSections.equipe && (
                <>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setPresencaObra(p => p.map(f => ({ ...f, presente: true })))} className="text-[10px] rounded-lg border px-2 py-1 text-muted-foreground">Marcar todos</button>
                    <button onClick={() => setPresencaObra(p => p.map(f => ({ ...f, presente: false })))} className="text-[10px] rounded-lg border px-2 py-1 text-muted-foreground">Desmarcar todos</button>
                  </div>
                  {presencaObra.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum funcionário alocado.</p>
                  ) : (
                    <div className="space-y-1">
                      {presencaObra.map(f => (
                        <div key={f.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${f.presente ? "bg-primary/5" : "opacity-50"}`}>
                          <Checkbox checked={f.presente} onCheckedChange={() => togglePresenca(presencaObra, setPresencaObra, f.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{f.nome}</p>
                            <p className="text-[10px] text-muted-foreground">{f.cargo}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <input type="number" min={0} max={24} step={0.5} value={f.horas}
                              onChange={e => updateHoras(presencaObra, setPresencaObra, f.id, Number(e.target.value))}
                              className="w-12 rounded-lg border bg-background px-1 py-1 text-center text-xs" disabled={!f.presente} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Visitantes */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <SectionHeader icon={UserPlus} title="Funcionários de Outras Obras" sectionKey="visitantes" count={presencaVisitantes.filter(f => f.presente).length} color="text-orange-500" />
              {openSections.visitantes && (
                presencaVisitantes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum funcionário em outras obras.</p>
                ) : (
                  <div className="space-y-1 max-h-[250px] overflow-y-auto">
                    {presencaVisitantes.map(f => (
                      <div key={f.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${f.presente ? "bg-orange-500/5" : ""}`}>
                        <Checkbox checked={f.presente} onCheckedChange={() => togglePresenca(presencaVisitantes, setPresencaVisitantes, f.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{f.cargo}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <input type="number" min={0} max={24} step={0.5} value={f.horas}
                            onChange={e => updateHoras(presencaVisitantes, setPresencaVisitantes, f.id, Number(e.target.value))}
                            className="w-12 rounded-lg border bg-background px-1 py-1 text-center text-xs" disabled={!f.presente} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Atividades Executadas */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <SectionHeader icon={Calculator} title="Atividades Executadas" sectionKey="atividades" count={atividades.filter(a => a.servico).length} />
              {openSections.atividades && (
                <>
                  {atividades.map((at, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">Atividade {i + 1}</span>
                        {atividades.length > 1 && (
                          <button onClick={() => setAtividades(p => p.filter((_, idx) => idx !== i))} className="p-1 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <select value={at.servico} onChange={e => setAtividades(p => p.map((a, idx) => idx === i ? { ...a, servico: e.target.value } : a))}
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm">
                        <option value="">Selecione serviço...</option>
                        {SERVICOS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={0} step={0.01} value={at.quantidade}
                          onChange={e => setAtividades(p => p.map((a, idx) => idx === i ? { ...a, quantidade: Number(e.target.value) } : a))}
                          placeholder="Qtd" className="rounded-lg border bg-background px-3 py-2.5 text-sm" />
                        <select value={at.unidade} onChange={e => setAtividades(p => p.map((a, idx) => idx === i ? { ...a, unidade: e.target.value } : a))}
                          className="rounded-lg border bg-background px-3 py-2.5 text-sm">
                          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <input type="text" value={at.descricao}
                        onChange={e => setAtividades(p => p.map((a, idx) => idx === i ? { ...a, descricao: e.target.value } : a))}
                        placeholder="Descrição..." className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
                    </div>
                  ))}
                  <button onClick={() => setAtividades(p => [...p, { servico: "", quantidade: 0, unidade: "m²", descricao: "" }])}
                    className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed py-2.5 text-xs text-muted-foreground">
                    <Plus className="h-3 w-3" /> Adicionar Atividade
                  </button>
                </>
              )}
            </div>

            {/* Equipamentos Próprios */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <SectionHeader icon={Wrench} title="Equipamentos Próprios" sectionKey="equipProprios" />
              {openSections.equipProprios && (
                equipsProprios.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum equipamento próprio cadastrado.</p>
                ) : (
                  <div className="space-y-1">
                    {equipsProprios.map(eq => (
                      <div key={eq.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                        <Checkbox checked={eq.selecionado} onCheckedChange={() => setEquipsProprios(p => p.map(e => e.id === eq.id ? { ...e, selecionado: !e.selecionado } : e))} />
                        <span className="text-sm">{eq.nome}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Equipamentos Locados */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <SectionHeader icon={Truck} title="Equipamentos Locados" sectionKey="equipLocados" count={equipsLocados.length} color="text-orange-500" />
              {openSections.equipLocados && (
                <>
                  {equipsLocados.map((eq, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground">Equip. {i + 1}</span>
                        <button onClick={() => setEquipsLocados(p => p.filter((_, idx) => idx !== i))} className="p-1 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input type="text" value={eq.descricao} onChange={e => setEquipsLocados(p => p.map((x, idx) => idx === i ? { ...x, descricao: e.target.value } : x))}
                        placeholder="Ex: Retroescavadeira" className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
                      <input type="text" value={eq.fornecedor} onChange={e => setEquipsLocados(p => p.map((x, idx) => idx === i ? { ...x, fornecedor: e.target.value } : x))}
                        placeholder="Fornecedor" className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={1} value={eq.quantidade} onChange={e => setEquipsLocados(p => p.map((x, idx) => idx === i ? { ...x, quantidade: Number(e.target.value) } : x))}
                          placeholder="Qtd" className="rounded-lg border bg-background px-3 py-2.5 text-sm" />
                        <input type="number" min={0} step={0.01} value={eq.valor_diario} onChange={e => setEquipsLocados(p => p.map((x, idx) => idx === i ? { ...x, valor_diario: Number(e.target.value) } : x))}
                          placeholder="R$/dia" className="rounded-lg border bg-background px-3 py-2.5 text-sm" />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setEquipsLocados(p => [...p, { descricao: "", fornecedor: "", quantidade: 1, valor_diario: 0 }])}
                    className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed py-2.5 text-xs text-muted-foreground">
                    <Plus className="h-3 w-3" /> Adicionar Equipamento
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Ocorrências */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ocorrências</label>
          <textarea value={ocorrencias} onChange={e => setOcorrencias(e.target.value)} rows={2} placeholder="Acidentes, chuva, atrasos..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none" />
        </div>

        {/* Condições */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Condições de Trabalho</label>
          <textarea value={condicoes} onChange={e => setCondicoes(e.target.value)} rows={2} placeholder="Condições gerais do canteiro..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none" />
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</label>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Observações adicionais..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none" />
        </div>

        {/* Fotos */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fotos</label>
          <div className="flex flex-wrap gap-2">
            {fotos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 rounded-full bg-destructive/90 p-0.5 text-destructive-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} disabled={!obraId}
              className="w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
              <Camera className="h-5 w-5" />
              <span className="text-[9px]">Foto</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhoto} />
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg">
        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="h-5 w-5" />
          {saving ? "Salvando..." : "Salvar Diário de Obra"}
        </button>
      </div>
    </div>
  );
}
