import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Camera, Cloud, Sun, CloudRain, CloudSnow, Users, Save, ArrowLeft, Plus, X, Thermometer } from "lucide-react";
import { Link } from "react-router-dom";

interface ObraOption { id: string; nome: string; codigo: string; }

const CLIMAS = [
  { icon: Sun, label: "Ensolarado" },
  { icon: Cloud, label: "Nublado" },
  { icon: CloudRain, label: "Chuvoso" },
  { icon: CloudSnow, label: "Frio" },
];

export default function DiarioObraMobile() {
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [obraId, setObraId] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [clima, setClima] = useState("Ensolarado");
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [maoDeObra, setMaoDeObra] = useState("");
  const [atividades, setAtividades] = useState("");
  const [ocorrencias, setOcorrencias] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("obras").select("id, nome, codigo").eq("status", "em_andamento")
      .then(({ data }) => { if (data) setObras(data); });
  }, []);

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
    if (!atividades.trim()) { toast({ title: "Descreva as atividades", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("diarios_obra").insert({
      obra_id: obraId,
      data,
      clima,
      temperatura_min: tempMin ? Number(tempMin) : null,
      temperatura_max: tempMax ? Number(tempMax) : null,
      mao_de_obra_presente: maoDeObra ? Number(maoDeObra) : null,
      atividades_executadas: atividades,
      ocorrencias: ocorrencias || null,
      condicoes_trabalho: condicoes || null,
      observacoes: observacoes || null,
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

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
            <Save className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold">Registro salvo!</h2>
          <p className="text-sm text-muted-foreground">O diário de obra foi registrado com sucesso.</p>
          <button onClick={() => { setSaved(false); setAtividades(""); setOcorrencias(""); setFotos([]); setObservacoes(""); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
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

      <div className="p-4 space-y-5 pb-28">
        {/* Obra + Data */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Obra</label>
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm focus:ring-2 focus:ring-primary">
            <option value="">Selecione a obra...</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full rounded-xl border bg-card px-3 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Responsável</label>
              <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)}
                placeholder="Seu nome" className="w-full rounded-xl border bg-card px-3 py-3 text-sm" />
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
              <Thermometer className="h-4 w-4 text-blue-500" />
              <input type="number" value={tempMin} onChange={e => setTempMin(e.target.value)}
                placeholder="Min °C" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <Thermometer className="h-4 w-4 text-destructive" />
              <input type="number" value={tempMax} onChange={e => setTempMax(e.target.value)}
                placeholder="Max °C" className="w-full bg-transparent text-sm outline-none" />
            </div>
          </div>
        </div>

        {/* Equipe */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipe Presente</label>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3">
            <Users className="h-5 w-5 text-primary" />
            <input type="number" value={maoDeObra} onChange={e => setMaoDeObra(e.target.value)}
              placeholder="Nº de trabalhadores" className="w-full bg-transparent text-sm outline-none" />
          </div>
        </div>

        {/* Atividades */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atividades Executadas *</label>
          <textarea value={atividades} onChange={e => setAtividades(e.target.value)}
            rows={4} placeholder="Descreva as atividades realizadas..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary" />
        </div>

        {/* Ocorrências */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ocorrências</label>
          <textarea value={ocorrencias} onChange={e => setOcorrencias(e.target.value)}
            rows={2} placeholder="Acidentes, chuva, atrasos..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none" />
        </div>

        {/* Condições de trabalho */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Condições de Trabalho</label>
          <textarea value={condicoes} onChange={e => setCondicoes(e.target.value)}
            rows={2} placeholder="Condições gerais do canteiro..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm resize-none" />
        </div>

        {/* Observações */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</label>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
            rows={2} placeholder="Observações adicionais..."
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
