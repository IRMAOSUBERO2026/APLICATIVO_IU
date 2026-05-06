import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Save, Sparkles, Loader2, Upload, Trash2, Camera, CloudRain, Sun, Cloud, AlertTriangle, HardHat, Wrench, Users, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface FotoUpload {
  file: File;
  previewUrl: string;
  descricao: string;
}

export default function DiarioObraForm() {
  const { obraId, diarioId } = useParams();
  const isEdit = Boolean(diarioId);
  const navigate = useNavigate();
  const [obra, setObra] = useState<any>(null);
  const [loadingDiario, setLoadingDiario] = useState(isEdit);
  
  const [activeTab, setActiveTab] = useState("geral");

  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [responsavel, setResponsavel] = useState("");
  
  const [climaManha, setClimaManha] = useState("");
  const [climaTarde, setClimaTarde] = useState("");
  const [condicaoObra, setCondicaoObra] = useState("Operável");

  const [maoDeObraPropria, setMaoDeObraPropria] = useState([{ funcao: "", quantidade: 1 }]);
  const [maoDeObraTerceirizada, setMaoDeObraTerceirizada] = useState([{ empresa: "", funcao: "", quantidade: 1 }]);

  const [equipamentos, setEquipamentos] = useState([{ descricao: "", quantidade: 1, status: "Operando" }]);

  const [atividades, setAtividades] = useState([{ descricao: "", local: "", status: "Em andamento" }]);
  const [ocorrencias, setOcorrencias] = useState("");
  
  const [fotos, setFotos] = useState<FotoUpload[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState<Array<{ url: string; descricao: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumoIA, setResumoIA] = useState("");
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [aprovado, setAprovado] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (obraId) {
      supabase.from("obras").select("nome, codigo").eq("id", obraId).single()
        .then(({ data }) => setObra(data));
    }
  }, [obraId]);

  useEffect(() => {
    if (!isEdit || !diarioId) return;
    (async () => {
      setLoadingDiario(true);
      const { data: d, error } = await supabase
        .from("diarios_obra")
        .select("*")
        .eq("id", diarioId)
        .single();
      if (error || !d) {
        toast({ title: "Erro", description: "Diário não encontrado.", variant: "destructive" });
        setLoadingDiario(false);
        return;
      }
      setData(d.data);
      setResponsavel(d.responsavel || "");
      let extra: any = {};
      try {
        if (d.observacoes && d.observacoes.trim().startsWith("{")) extra = JSON.parse(d.observacoes);
      } catch {}
      setClimaManha(extra.climaManha || (d.clima || "").split("/")[0]?.trim() || "");
      setClimaTarde(extra.climaTarde || (d.clima || "").split("/")[1]?.trim() || "");
      setCondicaoObra(extra.condicaoObra || "Operável");
      if (Array.isArray(extra.maoDeObraPropria) && extra.maoDeObraPropria.length) setMaoDeObraPropria(extra.maoDeObraPropria);
      if (Array.isArray(extra.maoDeObraTerceirizada) && extra.maoDeObraTerceirizada.length) setMaoDeObraTerceirizada(extra.maoDeObraTerceirizada);
      if (Array.isArray(extra.equipamentos) && extra.equipamentos.length) setEquipamentos(extra.equipamentos);
      if (Array.isArray(extra.atividades) && extra.atividades.length) {
        setAtividades(extra.atividades);
      } else if (d.atividades_executadas) {
        const linhas = String(d.atividades_executadas).split("\n").filter((l: string) => l.trim());
        if (linhas.length) setAtividades(linhas.map((linha: string) => ({ descricao: linha, local: "", status: "Concluído" })));
      }
      setOcorrencias(d.ocorrencias || "");
      setResumoIA(extra.resumoIA || "");
      if (Array.isArray(extra.fotos) && extra.fotos.length) {
        setFotosExistentes(extra.fotos.map((f: any) => typeof f === "string" ? { url: f, descricao: "" } : f));
      } else if (Array.isArray(d.fotos) && d.fotos.length) {
        setFotosExistentes(d.fotos.map((url: string) => ({ url, descricao: "" })));
      }
      setAprovado(true);
      setLoadingDiario(false);
    })();
  }, [isEdit, diarioId]);

  // Helpers para arrays
  const addArrayItem = (setter: any, defaultItem: any) => setter((prev: any) => [...prev, defaultItem]);
  const removeArrayItem = (setter: any, index: number) => setter((prev: any) => prev.filter((_: any, i: number) => i !== index));
  const updateArrayItem = (setter: any, index: number, field: string, value: any) => {
    setter((prev: any) => prev.map((item: any, i: number) => i === index ? { ...item, [field]: value } : item));
  };

  // Upload de Fotos Local
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFotos = Array.from(e.target.files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        descricao: ""
      }));
      setFotos(prev => [...prev, ...newFotos]);
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(fotos[index].previewUrl);
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const gerarResumoIA = async () => {
    setGerandoResumo(true);
    setResumoIA("");

    // Constrói payload do dia atual para a IA resumir
    const payload = {
      obra: obra?.nome,
      data,
      clima: `Manhã: ${climaManha}, Tarde: ${climaTarde}. Condição: ${condicaoObra}`,
      equipe: `Própria: ${maoDeObraPropria.reduce((acc, curr) => acc + (Number(curr.quantidade)||0), 0)} pessoas. Terceiros: ${maoDeObraTerceirizada.reduce((acc, curr) => acc + (Number(curr.quantidade)||0), 0)} pessoas.`,
      atividades: atividades.map(a => `- ${a.descricao} (${a.local}) [${a.status}]`).join("\n"),
      ocorrencias: ocorrencias || "Nenhuma ocorrência registrada."
    };

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resumo-diario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ diarios: [payload] }),
      });

      if (!resp.ok) throw new Error("Falha na IA");

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (let line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) { fullText += content; setResumoIA(fullText); }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      toast({ title: "Erro na IA", description: "Não foi possível gerar o resumo automático.", variant: "destructive" });
    }
    setGerandoResumo(false);
  };

  const handleSave = async () => {
    if (!aprovado) {
      toast({ title: "Atenção", description: "Você precisa confirmar e aprovar o diário antes de salvar.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      const atividadesTexto = atividades.filter(a => a.descricao).map(a => `[${a.status}] ${a.descricao} (Local: ${a.local})`).join("\n");

      // Upload de novas fotos primeiro
      const novasFotosUrls: Array<{ url: string; descricao: string }> = [];
      if (fotos.length > 0) {
        toast({ title: "Enviando fotos..." });
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          const fileExt = foto.file.name.split('.').pop();
          const fileName = `${obraId}/rdo_${Date.now()}_${i}.${fileExt}`;
          const filePath = `diarios/${fileName}`;
          const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, foto.file);
          if (!uploadError) {
            const { data: pubData } = supabase.storage.from("documentos").getPublicUrl(filePath);
            novasFotosUrls.push({ url: pubData.publicUrl, descricao: foto.descricao });
          }
        }
      }

      const todasFotos = [...fotosExistentes, ...novasFotosUrls];

      const rawData = {
        climaManha, climaTarde, condicaoObra,
        maoDeObraPropria, maoDeObraTerceirizada,
        equipamentos, atividades, resumoIA, ocorrencias,
        fotos: todasFotos,
      };

      const payload = {
        obra_id: obraId,
        data,
        responsavel,
        clima: `${climaManha} / ${climaTarde}`,
        mao_de_obra_presente: maoDeObraPropria.reduce((s, c) => s + (Number(c.quantidade)||0), 0) + maoDeObraTerceirizada.reduce((s, c) => s + (Number(c.quantidade)||0), 0),
        atividades_executadas: atividadesTexto,
        observacoes: JSON.stringify(rawData),
        ocorrencias: ocorrencias || null,
        fotos: todasFotos.length > 0 ? todasFotos.map(f => f.url) : null,
      };

      if (isEdit && diarioId) {
        const { error: dbError } = await supabase.from("diarios_obra").update(payload).eq("id", diarioId);
        if (dbError) throw dbError;
        toast({ title: "Sucesso!", description: "Diário atualizado com sucesso." });
      } else {
        const { error: dbError } = await supabase.from("diarios_obra").insert(payload);
        if (dbError) throw dbError;
        toast({ title: "Sucesso!", description: "Diário de Obra salvo com sucesso." });
      }
      navigate(`/diario-obra/${obraId}`);
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeFotoExistente = (i: number) => setFotosExistentes(prev => prev.filter((_, idx) => idx !== i));

  if (loadingDiario) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Link to={`/diario-obra/${obraId}`} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Editar Diário de Obra" : "Novo Diário de Obra"}</h1>
            <p className="text-sm text-primary font-medium">{obra?.codigo} - {obra?.nome}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto rounded-lg bg-muted/50 p-1">
          {[
            { id: "geral", label: "Dados Gerais e Clima" },
            { id: "equipe", label: "Equipe e Equipamentos" },
            { id: "atividades", label: "Atividades e Ocorrências" },
            { id: "fotos", label: "Fotos e Aprovação" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Dados Gerais e Clima */}
        {activeTab === "geral" && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold border-b pb-2">Informações Iniciais</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Data do Diário *</label>
                  <Input type="date" value={data} onChange={e => setData(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Responsável pelo Preenchimento *</label>
                  <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do Engenheiro/Técnico" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                <Sun className="h-5 w-5 text-warning" /> Condições Climáticas
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Clima - Manhã</label>
                  <select className="w-full rounded-md border p-2 text-sm" value={climaManha} onChange={e => setClimaManha(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Bom">Bom (Ensolarado)</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Chuva Leve">Chuva Leve</option>
                    <option value="Chuva Forte">Chuva Forte</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Clima - Tarde</label>
                  <select className="w-full rounded-md border p-2 text-sm" value={climaTarde} onChange={e => setClimaTarde(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Bom">Bom (Ensolarado)</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Chuva Leve">Chuva Leve</option>
                    <option value="Chuva Forte">Chuva Forte</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Condição da Obra</label>
                  <select className="w-full rounded-md border p-2 text-sm" value={condicaoObra} onChange={e => setCondicaoObra(e.target.value)}>
                    <option value="Operável">Operável (Trabalho Normal)</option>
                    <option value="Parcialmente Impraticável">Parcialmente Impraticável</option>
                    <option value="Impraticável">Impraticável (Obra Parada)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button onClick={() => setActiveTab("equipe")} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Avançar</button>
            </div>
          </div>
        )}

        {/* TAB 2: Equipe e Equipamentos */}
        {activeTab === "equipe" && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Mão de Obra Própria */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Equipe Própria</h2>
                  <button onClick={() => addArrayItem(setMaoDeObraPropria, { funcao: "", quantidade: 1 })} className="text-sm text-primary font-medium hover:underline">+ Adicionar</button>
                </div>
                {maoDeObraPropria.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Função (ex: Pedreiro)" value={m.funcao} onChange={e => updateArrayItem(setMaoDeObraPropria, i, "funcao", e.target.value)} className="flex-1" />
                    <Input type="number" min={1} value={m.quantidade} onChange={e => updateArrayItem(setMaoDeObraPropria, i, "quantidade", e.target.value)} className="w-20" />
                    <button onClick={() => removeArrayItem(setMaoDeObraPropria, i)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              {/* Mão de Obra Terceirizada */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><HardHat className="h-5 w-5 text-warning" /> Equipe Terceirizada</h2>
                  <button onClick={() => addArrayItem(setMaoDeObraTerceirizada, { empresa: "", funcao: "", quantidade: 1 })} className="text-sm text-primary font-medium hover:underline">+ Adicionar</button>
                </div>
                {maoDeObraTerceirizada.map((m, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20 relative">
                    <button onClick={() => removeArrayItem(setMaoDeObraTerceirizada, i)} className="absolute top-2 right-2 p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                    <Input placeholder="Nome da Empresa" value={m.empresa} onChange={e => updateArrayItem(setMaoDeObraTerceirizada, i, "empresa", e.target.value)} className="pr-8" />
                    <div className="flex gap-2">
                      <Input placeholder="Função" value={m.funcao} onChange={e => updateArrayItem(setMaoDeObraTerceirizada, i, "funcao", e.target.value)} className="flex-1" />
                      <Input type="number" min={1} value={m.quantidade} onChange={e => updateArrayItem(setMaoDeObraTerceirizada, i, "quantidade", e.target.value)} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipamentos */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-muted-foreground" /> Equipamentos Utilizados</h2>
                <button onClick={() => addArrayItem(setEquipamentos, { descricao: "", quantidade: 1, status: "Operando" })} className="text-sm text-primary font-medium hover:underline">+ Adicionar</button>
              </div>
              {equipamentos.map((eq, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center gap-2">
                  <Input placeholder="Descrição do Equipamento (Ex: Betoneira, Retroescavadeira)" value={eq.descricao} onChange={e => updateArrayItem(setEquipamentos, i, "descricao", e.target.value)} className="flex-1" />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Input type="number" min={1} value={eq.quantidade} onChange={e => updateArrayItem(setEquipamentos, i, "quantidade", e.target.value)} className="w-20" />
                    <select className="rounded-md border p-2 text-sm w-full sm:w-32" value={eq.status} onChange={e => updateArrayItem(setEquipamentos, i, "status", e.target.value)}>
                      <option value="Operando">Operando</option>
                      <option value="Parado">Parado</option>
                      <option value="Manutenção">Manutenção</option>
                    </select>
                    <button onClick={() => removeArrayItem(setEquipamentos, i)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setActiveTab("geral")} className="rounded-lg px-6 py-2 text-sm font-medium hover:bg-muted border">Voltar</button>
              <button onClick={() => setActiveTab("atividades")} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Avançar</button>
            </div>
          </div>
        )}

        {/* TAB 3: Atividades e Ocorrências */}
        {activeTab === "atividades" && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">Atividades Executadas</h2>
                <button onClick={() => addArrayItem(setAtividades, { descricao: "", local: "", status: "Em andamento" })} className="text-sm text-primary font-medium hover:underline">+ Adicionar Atividade</button>
              </div>
              <div className="space-y-4">
                {atividades.map((at, i) => (
                  <div key={i} className="p-4 border rounded-lg bg-muted/10 relative space-y-3">
                    <button onClick={() => removeArrayItem(setAtividades, i)} className="absolute top-2 right-2 p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                    <div className="pr-8">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição do Serviço</label>
                      <Textarea placeholder="Descreva o que foi feito..." value={at.descricao} onChange={e => updateArrayItem(setAtividades, i, "descricao", e.target.value)} rows={2} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Local / Eixo</label>
                        <Input placeholder="Ex: Bloco A, Estaca 10" value={at.local} onChange={e => updateArrayItem(setAtividades, i, "local", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                        <select className="w-full rounded-md border p-2 text-sm bg-background" value={at.status} onChange={e => updateArrayItem(setAtividades, i, "status", e.target.value)}>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Concluído">Concluído</option>
                          <option value="Pausado">Pausado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Ocorrências e Observações
              </h2>
              <p className="text-sm text-muted-foreground">Registre atrasos, falta de materiais, acidentes ou visitas técnicas.</p>
              <Textarea 
                placeholder="Detalhe aqui as ocorrências do dia..." 
                value={ocorrencias} 
                onChange={e => setOcorrencias(e.target.value)} 
                rows={4} 
              />
            </div>

            <div className="flex justify-between">
              <button onClick={() => setActiveTab("equipe")} className="rounded-lg px-6 py-2 text-sm font-medium hover:bg-muted border">Voltar</button>
              <button onClick={() => setActiveTab("fotos")} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Avançar</button>
            </div>
          </div>
        )}

        {/* TAB 4: Fotos e Aprovação */}
        {activeTab === "fotos" && (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Registro Fotográfico */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Registro Fotográfico</h2>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoSelect} />
                <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20">
                  <Upload className="h-4 w-4" /> Anexar Fotos
                </button>
              </div>
              
              {fotos.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma foto anexada. Fotos enriquecem o RDO.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fotos.map((foto, i) => (
                    <div key={i} className="group relative rounded-lg border overflow-hidden bg-muted/20">
                      <div className="aspect-video w-full bg-black/5 flex items-center justify-center overflow-hidden relative">
                        <img src={foto.previewUrl} alt={`Preview ${i}`} className="object-cover w-full h-full" />
                        <button onClick={() => removePhoto(i)} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-destructive transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-2 border-t">
                        <Input placeholder="Legenda da foto..." className="h-8 text-xs border-transparent focus-visible:ring-0 px-1" value={foto.descricao} onChange={e => {
                          const newFotos = [...fotos];
                          newFotos[i].descricao = e.target.value;
                          setFotos(newFotos);
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo com IA */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" /> Resumo Executivo (IA)
                </h2>
                <button onClick={gerarResumoIA} disabled={gerandoResumo} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {gerandoResumo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar Automático"}
                </button>
              </div>
              <Textarea 
                placeholder="Clique no botão para gerar um resumo executivo inteligente baseado em todas as informações preenchidas..." 
                value={resumoIA} 
                onChange={e => setResumoIA(e.target.value)} 
                rows={5} 
                className="bg-background"
              />
            </div>

            {/* Aprovação e Salvar */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <input type="checkbox" className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" checked={aprovado} onChange={e => setAprovado(e.target.checked)} />
                <div>
                  <p className="font-semibold text-sm">Aprovação do Diário de Obra</p>
                  <p className="text-sm text-muted-foreground">Declaro que as informações registradas neste relatório são verdadeiras e refletem fielmente as atividades executadas na obra no dia corrente.</p>
                </div>
              </label>

              <div className="flex justify-between items-center">
                <button onClick={() => setActiveTab("atividades")} className="rounded-lg px-6 py-2 text-sm font-medium hover:bg-muted border">Voltar</button>
                <button 
                  onClick={handleSave} 
                  disabled={saving || !aprovado} 
                  className="inline-flex items-center gap-2 rounded-lg bg-success px-8 py-3 text-sm font-bold text-success-foreground shadow-sm hover:bg-success/90 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {saving ? "Salvando Diário..." : "Finalizar e Salvar Diário"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
