import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Save, Sparkles, Loader2, Upload, Trash2, Camera, CloudRain, Sun, Cloud, AlertTriangle, HardHat, Wrench, Users, CheckCircle2, UserPlus, Plus } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { normalizeStorageUrl } from "@/lib/storageUrl";

interface FotoUpload {
  file: File;
  previewUrl: string;
  descricao: string;
}

interface FuncionarioRow {
  id: string;
  nome: string;
  cargo: string;
  obra_id: string | null;
  empresa_id: string;
}

interface EquipamentoRow {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  obra_id: string | null;
  empresa_id: string;
  status: string;
}

interface EquipePresenca {
  funcionario_id: string;
  nome: string;
  cargo: string;
  presente: boolean;
  apoio: boolean; // true = funcionário de outra obra/almoxarifado prestando suporte
  origem?: string; // nome da obra de origem (apenas para apoio)
  observacao?: string;
}

interface EquipamentoPresenca {
  equipamento_id: string;
  codigo: string;
  descricao: string;
  status: string; // Operando / Parado / Manutenção
  apoio: boolean;
  origem?: string;
  observacao?: string;
}

const compressAndToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedBase64);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};


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

  // Equipe e equipamentos da empresa
  const [funcionariosEmpresa, setFuncionariosEmpresa] = useState<FuncionarioRow[]>([]);
  const [equipamentosEmpresa, setEquipamentosEmpresa] = useState<EquipamentoRow[]>([]);
  const [obrasMap, setObrasMap] = useState<Record<string, string>>({});

  const [equipe, setEquipe] = useState<EquipePresenca[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoPresenca[]>([]);

  const [showApoioFuncDialog, setShowApoioFuncDialog] = useState(false);
  const [showApoioEqpDialog, setShowApoioEqpDialog] = useState(false);
  const [searchApoioFunc, setSearchApoioFunc] = useState("");
  const [searchApoioEqp, setSearchApoioEqp] = useState("");

  const [atividades, setAtividades] = useState<Array<{ descricao: string; local: string; status: string; foraContrato: boolean; observacao: string }>>([{ descricao: "", local: "", status: "Em andamento", foraContrato: false, observacao: "" }]);
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
      supabase.from("obras").select("nome, codigo, empresa_id").eq("id", obraId).single()
        .then(({ data }) => setObra(data));
    }
  }, [obraId]);

  // Carrega funcionários e equipamentos da empresa (para opção de apoio) e os da obra (presença automática)
  useEffect(() => {
    if (!obra?.empresa_id || !obraId) return;
    (async () => {
      // Carrega TODOS os funcionários ativos de TODAS as empresas (todos os CNPJs),
      // incluindo os alocados em obras locadas/de outras empresas, para que a lista
      // completa fique disponível como apoio. A presença automática continua restrita
      // aos funcionários da própria obra.
      const [funcRes, eqpRes, obrasRes] = await Promise.all([
        supabase.from("funcionarios").select("id, nome, cargo, obra_id, empresa_id, status")
          .eq("status", "ativo").order("nome"),
        supabase.from("equipamentos_proprios").select("id, codigo, descricao, tipo, obra_id, empresa_id, status")
          .order("descricao"),
        supabase.from("obras").select("id, nome, codigo"),
      ]);
      const funcs = (funcRes.data || []) as FuncionarioRow[];
      const eqps = (eqpRes.data || []) as EquipamentoRow[];
      const oMap: Record<string, string> = {};
      (obrasRes.data || []).forEach((o: any) => { oMap[o.id] = `${o.codigo} - ${o.nome}`; });
      setObrasMap(oMap);
      setFuncionariosEmpresa(funcs);
      setEquipamentosEmpresa(eqps);

      // Em modo NOVO: pré-carrega equipe e equipamentos da obra
      if (!isEdit) {
        setEquipe(
          funcs.filter(f => f.obra_id === obraId).map(f => ({
            funcionario_id: f.id, nome: f.nome, cargo: f.cargo,
            presente: true, apoio: false,
          }))
        );
        setEquipamentos(
          eqps.filter(e => e.obra_id === obraId).map(e => ({
            equipamento_id: e.id, codigo: e.codigo, descricao: e.descricao,
            status: "Operando", apoio: false,
          }))
        );
      }
    })();
  }, [obra?.empresa_id, obraId, isEdit]);

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
      if (Array.isArray(extra.equipe)) setEquipe(extra.equipe);
      if (Array.isArray(extra.equipamentos)) setEquipamentos(extra.equipamentos);
      if (Array.isArray(extra.atividades) && extra.atividades.length) {
        setAtividades(extra.atividades.map((a: any) => ({
          descricao: a.descricao || "", local: a.local || "", status: a.status || "Em andamento",
          foraContrato: !!a.foraContrato, observacao: a.observacao || "",
        })));
      } else if (d.atividades_executadas) {
        const linhas = String(d.atividades_executadas).split("\n").filter((l: string) => l.trim());
        if (linhas.length) setAtividades(linhas.map((linha: string) => ({ descricao: linha, local: "", status: "Concluído", foraContrato: false, observacao: "" })));
      }
      setOcorrencias(d.ocorrencias || "");
      setResumoIA(extra.resumoIA || "");
      if (Array.isArray(extra.fotos) && extra.fotos.length) {
        setFotosExistentes(extra.fotos.map((f: any) => {
          const raw = typeof f === "string" ? { url: f, descricao: "" } : f;
          return { ...raw, url: normalizeStorageUrl(raw.url) };
        }));
      } else if (Array.isArray(d.fotos) && d.fotos.length) {
        setFotosExistentes(d.fotos.map((url: string) => ({ url: normalizeStorageUrl(url), descricao: "" })));
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
      equipe: `Próprios: ${equipe.filter(e => e.presente && !e.apoio).length} pessoas. Apoio (outras obras): ${equipe.filter(e => e.presente && e.apoio).length} pessoas.`,
      equipamentos: equipamentos.map(e => `- ${e.codigo} ${e.descricao} [${e.status}]${e.apoio ? ` (apoio de ${e.origem || "outro local"})` : ""}`).join("\n"),
      atividades: atividades.map(a => `- ${a.descricao} (${a.local}) [${a.status}]${a.foraContrato ? ` [FORA DE CONTRATO${a.observacao ? ": " + a.observacao : ""}]` : ""}`).join("\n"),
      ocorrencias: ocorrencias || "Nenhuma ocorrência registrada."
    };

    try {
      // IMPORTANTE: usar o host do projeto Supabase oficial (wtrefsziscauokudnxgz)
      // Não usar import.meta.env.VITE_SUPABASE_URL — aponta para outro projeto.
      const SUPABASE_URL = "https://wtrefsziscauokudnxgz.supabase.co";
      const SUPABASE_KEY = "sb_publishable_DLAlIkksoQ-2qO40Y0hfzA_0pazWsNk";
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/resumo-diario`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
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

      // Processamento e compressão de novas fotos para Base64 (ignora RLS e restrições de Storage)
      const novasFotosUrls: Array<{ url: string; descricao: string }> = [];
      if (fotos.length > 0) {
        toast({ title: "Processando fotos..." });
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          try {
            const base64Data = await compressAndToBase64(foto.file);
            novasFotosUrls.push({ url: base64Data, descricao: foto.descricao });
          } catch (e: any) {
            console.error("Erro no processamento da foto:", e);
            throw new Error(`Erro ao processar a foto "${foto.file.name}": ${e.message || e}`);
          }
        }
      }

      const todasFotos = [...fotosExistentes, ...novasFotosUrls];

      const rawData = {
        climaManha, climaTarde, condicaoObra,
        equipe, equipamentos, atividades, resumoIA, ocorrencias,
        fotos: todasFotos,
      };

      const totalPresentes = equipe.filter(e => e.presente).length;

      const payload = {
        obra_id: obraId,
        data,
        responsavel,
        clima: `${climaManha} / ${climaTarde}`,
        mao_de_obra_presente: totalPresentes,
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
            {/* Equipe da Obra (auto) + Apoio */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Equipe da Obra
                  <span className="text-xs font-normal text-muted-foreground">
                    ({equipe.filter(e => e.presente).length} presente(s) de {equipe.length})
                  </span>
                </h2>
                <button
                  onClick={() => { setSearchApoioFunc(""); setShowApoioFuncDialog(true); }}
                  className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                >
                  <UserPlus className="h-4 w-4" /> Adicionar funcionário de apoio
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Funcionários cadastrados nesta obra são carregados automaticamente como presentes. Desmarque ausentes ou inclua funcionários de apoio (de outras obras) que prestaram suporte ou tarefa específica.
              </p>

              {equipe.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhum funcionário alocado a esta obra. Use "Adicionar funcionário de apoio" para incluir.
                </div>
              ) : (
                <div className="divide-y border rounded-lg">
                  {equipe.map((p, i) => (
                    <div key={`${p.funcionario_id}-${i}`} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 ${p.apoio ? "bg-warning/5" : ""}`}>
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.presente}
                          onChange={e => setEquipe(prev => prev.map((x, idx) => idx === i ? { ...x, presente: e.target.checked } : x))}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {p.nome}
                            {p.apoio && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-warning/20 text-warning-foreground">APOIO</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.cargo}{p.apoio && p.origem ? ` • Origem: ${p.origem}` : ""}
                          </p>
                        </div>
                      </label>
                      <Input
                        placeholder="Tarefa/observação"
                        value={p.observacao || ""}
                        onChange={e => setEquipe(prev => prev.map((x, idx) => idx === i ? { ...x, observacao: e.target.value } : x))}
                        className="sm:w-64 h-8 text-xs"
                      />
                      {p.apoio && (
                        <button onClick={() => setEquipe(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-destructive hover:bg-destructive/10 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipamentos da Obra (auto) + Apoio */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-muted-foreground" /> Equipamentos Utilizados
                  <span className="text-xs font-normal text-muted-foreground">({equipamentos.length})</span>
                </h2>
                <button
                  onClick={() => { setSearchApoioEqp(""); setShowApoioEqpDialog(true); }}
                  className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                >
                  <Plus className="h-4 w-4" /> Adicionar equipamento de apoio
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Equipamentos alocados nesta obra são carregados automaticamente. Inclua equipamentos do almoxarifado ou de outras obras quando necessário.
              </p>

              {equipamentos.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhum equipamento alocado a esta obra.
                </div>
              ) : (
                <div className="divide-y border rounded-lg">
                  {equipamentos.map((eq, i) => (
                    <div key={`${eq.equipamento_id}-${i}`} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 ${eq.apoio ? "bg-warning/5" : ""}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {eq.codigo} • {eq.descricao}
                          {eq.apoio && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-warning/20 text-warning-foreground">APOIO</span>}
                        </p>
                        {eq.apoio && eq.origem && (
                          <p className="text-xs text-muted-foreground">Origem: {eq.origem}</p>
                        )}
                      </div>
                      <Input
                        placeholder="Observação"
                        value={eq.observacao || ""}
                        onChange={e => setEquipamentos(prev => prev.map((x, idx) => idx === i ? { ...x, observacao: e.target.value } : x))}
                        className="sm:w-48 h-8 text-xs"
                      />
                      <select
                        className="rounded-md border p-2 text-sm w-full sm:w-36 bg-background"
                        value={eq.status}
                        onChange={e => setEquipamentos(prev => prev.map((x, idx) => idx === i ? { ...x, status: e.target.value } : x))}
                      >
                        <option value="Operando">Operando</option>
                        <option value="Parado">Parado</option>
                        <option value="Manutenção">Manutenção</option>
                      </select>
                      {eq.apoio && (
                        <button onClick={() => setEquipamentos(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-destructive hover:bg-destructive/10 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                <button onClick={() => addArrayItem(setAtividades, { descricao: "", local: "", status: "Em andamento", foraContrato: false, observacao: "" })} className="text-sm text-primary font-medium hover:underline">+ Adicionar Atividade</button>
              </div>
              <div className="space-y-4">
                {atividades.map((at, i) => (
                  <div key={i} className={`p-4 border rounded-lg relative space-y-3 ${at.foraContrato ? "bg-warning/5 border-warning/40" : "bg-muted/10"}`}>
                    <button onClick={() => removeArrayItem(setAtividades, i)} className="absolute top-2 right-2 p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                    <div className="pr-8">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição do Serviço</label>
                      <Textarea placeholder="Descreva o que foi feito..." value={at.descricao} onChange={e => updateArrayItem(setAtividades, i, "descricao", e.target.value)} rows={2} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Local / Eixo / Item de Contrato</label>
                        <Input placeholder="Ex: Bloco A, Estaca 10 ou item 1.3" value={at.local} onChange={e => updateArrayItem(setAtividades, i, "local", e.target.value)} />
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
                    <div className="border-t pt-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!at.foraContrato}
                          onChange={e => updateArrayItem(setAtividades, i, "foraContrato", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-warning focus:ring-warning"
                        />
                        <span className="font-medium">Serviço fora do contrato</span>
                        <span className="text-xs text-muted-foreground">(ex: serviço por administração, extra, contingência)</span>
                      </label>
                      {at.foraContrato && (
                        <div>
                          <label className="text-xs font-medium text-warning mb-1 block">Observação / Justificativa</label>
                          <Textarea
                            placeholder="Descreva o motivo do serviço extra (ex: solicitado pela fiscalização, serviço por administração, contingência por chuva...)"
                            value={at.observacao || ""}
                            onChange={e => updateArrayItem(setAtividades, i, "observacao", e.target.value)}
                            rows={2}
                            className="bg-background"
                          />
                        </div>
                      )}
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
              
              {/* Fotos já existentes (modo edição) */}
              {fotosExistentes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fotos já anexadas ({fotosExistentes.length})</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {fotosExistentes.map((foto, i) => (
                      <div key={`ex-${i}`} className="group relative rounded-lg border overflow-hidden bg-muted/20">
                        <div className="aspect-video w-full bg-black/5 flex items-center justify-center overflow-hidden relative">
                          <img src={foto.url} alt={`Foto ${i}`} className="object-cover w-full h-full" />
                          <button onClick={() => removeFotoExistente(i)} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-2 border-t">
                          <Input placeholder="Legenda" className="h-8 text-xs border-transparent focus-visible:ring-0 px-1" value={foto.descricao} onChange={e => {
                            const arr = [...fotosExistentes];
                            arr[i] = { ...arr[i], descricao: e.target.value };
                            setFotosExistentes(arr);
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fotos.length === 0 && fotosExistentes.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma foto anexada. Fotos enriquecem o RDO.</p>
                </div>
              ) : fotos.length > 0 && (
                <div className="space-y-2">
                  {fotosExistentes.length > 0 && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Novas fotos ({fotos.length})</p>}
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
                  {saving ? (isEdit ? "Atualizando..." : "Salvando Diário...") : (isEdit ? "Atualizar Diário" : "Finalizar e Salvar Diário")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo: Adicionar Funcionário de Apoio */}
      {showApoioFuncDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowApoioFuncDialog(false)}>
          <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Adicionar Funcionário de Apoio</h3>
              <p className="text-xs text-muted-foreground mt-1">Selecione funcionários de outras obras/almoxarifado que prestaram suporte ou tarefa específica nesta obra.</p>
              <Input
                placeholder="Buscar por nome ou cargo..."
                className="mt-3"
                value={searchApoioFunc}
                onChange={e => setSearchApoioFunc(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {funcionariosEmpresa
                .filter(f => f.obra_id !== obraId)
                .filter(f => !equipe.some(e => e.funcionario_id === f.id))
                .filter(f => {
                  if (!searchApoioFunc) return true;
                  const s = searchApoioFunc.toLowerCase();
                  return f.nome.toLowerCase().includes(s) || (f.cargo || "").toLowerCase().includes(s);
                })
                .map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setEquipe(prev => [...prev, {
                        funcionario_id: f.id, nome: f.nome, cargo: f.cargo,
                        presente: true, apoio: true,
                        origem: f.obra_id ? (obrasMap[f.obra_id] || "Outra obra") : "Almoxarifado/Sem alocação",
                      }]);
                      setShowApoioFuncDialog(false);
                    }}
                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{f.nome}</p>
                      <p className="text-xs text-muted-foreground">{f.cargo} • {f.obra_id ? (obrasMap[f.obra_id] || "Outra obra") : "Almoxarifado"}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                ))}
              {funcionariosEmpresa.filter(f => f.obra_id !== obraId && !equipe.some(e => e.funcionario_id === f.id)).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Nenhum funcionário disponível para apoio.</p>
              )}
            </div>
            <div className="p-3 border-t flex justify-end">
              <button onClick={() => setShowApoioFuncDialog(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: Adicionar Equipamento de Apoio */}
      {showApoioEqpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowApoioEqpDialog(false)}>
          <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> Adicionar Equipamento de Apoio</h3>
              <p className="text-xs text-muted-foreground mt-1">Selecione equipamentos do almoxarifado ou de outras obras.</p>
              <Input
                placeholder="Buscar por código, descrição ou tipo..."
                className="mt-3"
                value={searchApoioEqp}
                onChange={e => setSearchApoioEqp(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {equipamentosEmpresa
                .filter(e => e.obra_id !== obraId)
                .filter(e => !equipamentos.some(x => x.equipamento_id === e.id))
                .filter(e => {
                  if (!searchApoioEqp) return true;
                  const s = searchApoioEqp.toLowerCase();
                  return (e.codigo || "").toLowerCase().includes(s) || e.descricao.toLowerCase().includes(s) || (e.tipo || "").toLowerCase().includes(s);
                })
                .map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setEquipamentos(prev => [...prev, {
                        equipamento_id: e.id, codigo: e.codigo, descricao: e.descricao,
                        status: "Operando", apoio: true,
                        origem: e.obra_id ? (obrasMap[e.obra_id] || "Outra obra") : "Almoxarifado",
                      }]);
                      setShowApoioEqpDialog(false);
                    }}
                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{e.codigo} • {e.descricao}</p>
                      <p className="text-xs text-muted-foreground">{e.tipo} • {e.obra_id ? (obrasMap[e.obra_id] || "Outra obra") : "Almoxarifado"}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                ))}
              {equipamentosEmpresa.filter(e => e.obra_id !== obraId && !equipamentos.some(x => x.equipamento_id === e.id)).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Nenhum equipamento disponível para apoio.</p>
              )}
            </div>
            <div className="p-3 border-t flex justify-end">
              <button onClick={() => setShowApoioEqpDialog(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
