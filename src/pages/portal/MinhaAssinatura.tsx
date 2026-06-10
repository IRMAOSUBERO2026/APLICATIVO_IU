import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  PenLine, Camera, ShieldCheck, CheckCircle2, Loader2, FileSignature,
  Eraser, RotateCcw, FileText, Clock, Lock,
} from "lucide-react";
import { format } from "date-fns";

interface Func {
  id: string;
  empresa_id: string | null;
  nome: string;
  cpf: string | null;
  cargo: string | null;
}

interface Perfil {
  id: string;
  assinatura_url: string | null;
  selfie_url: string | null;
  cpf_confirmado: boolean;
}

interface Pendente {
  id: string;
  documento_tipo: string;
  documento_titulo: string;
  documento_descricao: string | null;
  status: string;
  created_at: string;
  documento_dados: any;
}

const tipoLabel: Record<string, string> = {
  ficha_epi: "Ficha de EPI",
  holerite: "Holerite",
  advertencia: "Advertência",
  ferias: "Férias",
  contrato: "Contrato",
  treinamento: "Treinamento",
  rescisao: "Rescisão",
  outros: "Documento",
};

export default function MinhaAssinatura() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [func, setFunc] = useState<Func | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  // Setup states
  const [cpfInput, setCpfInput] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("funcionario_id")
      .eq("id", user.id)
      .single();

    let funcId = profile?.funcionario_id as string | undefined;
    let funcRow: any = null;

    if (funcId) {
      const { data } = await supabase
        .from("funcionarios")
        .select("id, empresa_id, nome, cpf, cargo")
        .eq("id", funcId)
        .single();
      funcRow = data;
    }
    if (!funcRow) {
      const { data } = await supabase
        .from("funcionarios")
        .select("id, empresa_id, nome, cpf, cargo")
        .eq("user_id", user.id)
        .maybeSingle();
      funcRow = data;
      funcId = data?.id;
    }

    if (funcRow) {
      setFunc(funcRow);
      const { data: perfilRow } = await supabase
        .from("assinaturas_perfil")
        .select("id, assinatura_url, selfie_url, cpf_confirmado")
        .eq("funcionario_id", funcRow.id)
        .maybeSingle();
      setPerfil(perfilRow ?? null);

      const { data: pend } = await supabase
        .from("assinaturas_digitais")
        .select("id, documento_tipo, documento_titulo, documento_descricao, status, created_at, documento_dados")
        .eq("funcionario_id", funcRow.id)
        .in("status", ["pendente", "visualizado"])
        .order("created_at", { ascending: false });
      setPendentes(pend ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Canvas drawing ----
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  };

  useEffect(() => {
    if (showSetup) setTimeout(setupCanvas, 50);
  }, [showSetup]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
  };
  const endDraw = () => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  };

  const formatCPF = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 11);
    return nums.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, d) =>
      [a, b, c].filter(Boolean).join(".") + (d ? `-${d}` : "")
    );
  };

  const handleSelfie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSelfiePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)![1];
    const bin = atob(base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const salvarAssinatura = async () => {
    if (!func) return;
    if (!hasDrawn.current) {
      toast({ title: "Assine no quadro", description: "Desenhe sua assinatura no espaço indicado.", variant: "destructive" });
      return;
    }
    const cleanInput = cpfInput.replace(/\D/g, "");
    const cleanStored = func.cpf?.replace(/\D/g, "") || "";
    if (cleanStored && cleanInput !== cleanStored) {
      toast({ title: "CPF não confere", description: "O CPF informado não corresponde ao seu cadastro.", variant: "destructive" });
      return;
    }
    if (cleanInput.length !== 11) {
      toast({ title: "CPF inválido", description: "Informe seu CPF completo.", variant: "destructive" });
      return;
    }
    if (!selfieFile && !perfil?.selfie_url) {
      toast({ title: "Selfie obrigatória", description: "Tire uma selfie de comprovação.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // upload signature
      const sigBlob = dataUrlToBlob(canvasRef.current!.toDataURL("image/png"));
      const sigPath = `assinaturas_perfil/${func.id}/assinatura_${Date.now()}.png`;
      const { error: sigErr } = await supabase.storage.from("documentos").upload(sigPath, sigBlob, { upsert: true });
      if (sigErr) throw sigErr;
      const sigUrl = supabase.storage.from("documentos").getPublicUrl(sigPath).data.publicUrl;

      let selfieUrl = perfil?.selfie_url ?? null;
      if (selfieFile) {
        const selfiePath = `assinaturas_perfil/${func.id}/selfie_${Date.now()}.jpg`;
        const { error: selErr } = await supabase.storage.from("documentos").upload(selfiePath, selfieFile, { upsert: true });
        if (selErr) throw selErr;
        selfieUrl = supabase.storage.from("documentos").getPublicUrl(selfiePath).data.publicUrl;
      }

      const { error } = await supabase.from("assinaturas_perfil").upsert({
        funcionario_id: func.id,
        empresa_id: func.empresa_id,
        assinatura_url: sigUrl,
        selfie_url: selfieUrl,
        cpf_confirmado: true,
      }, { onConflict: "funcionario_id" });
      if (error) throw error;

      toast({ title: "Assinatura salva!", description: "Sua assinatura digital está pronta para uso." });
      setShowSetup(false);
      setSelfieFile(null);
      setSelfiePreview(null);
      setCpfInput("");
      await loadData();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const assinarDocumento = async (doc: Pendente) => {
    if (!func || !perfil) return;
    setSigningId(doc.id);
    try {
      const agora = new Date();
      const auditoria = {
        assinatura_url: perfil.assinatura_url,
        selfie_url: perfil.selfie_url,
        assinado_por: func.nome,
        cpf: func.cpf,
        data_assinatura: agora.toISOString(),
        ip: "portal",
        user_agent: navigator.userAgent,
        plataforma: "Portal do Colaborador",
      };
      const novoDados = { ...(doc.documento_dados || {}), auditoria_assinatura: auditoria };

      const { error } = await supabase.from("assinaturas_digitais").update({
        status: "assinado",
        data_assinatura: agora.toISOString(),
        data_visualizacao: agora.toISOString(),
        cpf_confirmado: true,
        selfie_url: perfil.selfie_url,
        ip_assinatura: "portal",
        user_agent: navigator.userAgent,
        documento_dados: novoDados,
      }).eq("id", doc.id);
      if (error) throw error;

      toast({ title: "Documento assinado!", description: "Sua assinatura digital foi registrada com validade jurídica." });
      await loadData();
    } catch (e: any) {
      toast({ title: "Erro ao assinar", description: e.message, variant: "destructive" });
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!func) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-10 text-center text-muted-foreground">
          Seu usuário ainda não está vinculado a um funcionário. Procure o RH.
        </CardContent>
      </Card>
    );
  }

  const temAssinatura = !!perfil?.assinatura_url;

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileSignature className="h-6 w-6 text-primary" /> Minha Assinatura Digital
        </h2>
        <p className="text-muted-foreground text-sm">
          Crie e salve sua assinatura para assinar documentos com validade jurídica (Lei 14.063/2020).
        </p>
      </div>

      {/* Status / Setup card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Minha Assinatura Salva
          </CardTitle>
          <CardDescription>
            {temAssinatura
              ? "Sua assinatura está configurada e pronta para uso."
              : "Configure sua assinatura uma única vez para agilizar futuras assinaturas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {temAssinatura && !showSetup && (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="border rounded-xl bg-white p-2 w-full sm:w-56 h-24 flex items-center justify-center">
                <img src={perfil!.assinatura_url!} alt="Assinatura" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex-1 space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Assinatura registrada</p>
                <p className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-4 w-4" /> CPF confirmado</p>
                <p className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-4 w-4" /> Selfie de comprovação</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setShowSetup(true)}>
                <RotateCcw className="h-4 w-4" /> Refazer
              </Button>
            </div>
          )}

          {(!temAssinatura && !showSetup) && (
            <Button className="gap-2" onClick={() => setShowSetup(true)}>
              <PenLine className="h-4 w-4" /> Criar minha assinatura
            </Button>
          )}

          {showSetup && (
            <div className="space-y-5">
              {/* Signature pad */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><PenLine className="h-4 w-4" /> Desenhe sua assinatura</Label>
                <div className="border-2 border-dashed rounded-xl bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full touch-none"
                    style={{ height: 180 }}
                    onPointerDown={startDraw}
                    onPointerMove={draw}
                    onPointerUp={endDraw}
                    onPointerLeave={endDraw}
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={clearCanvas}>
                  <Eraser className="h-4 w-4" /> Limpar
                </Button>
              </div>

              {/* CPF */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="cpf">Confirme seu CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(formatCPF(e.target.value))}
                  maxLength={14}
                />
              </div>

              {/* Selfie */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Selfie de comprovação</Label>
                {selfiePreview ? (
                  <div className="relative w-40">
                    <img src={selfiePreview} alt="Selfie" className="w-40 rounded-lg border" />
                    <button
                      onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-40 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:bg-muted/50"
                  >
                    <Camera className="h-7 w-7 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Abrir câmera</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfie} />
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowSetup(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={salvarAssinatura} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Salvar assinatura
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending documents */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider flex items-center gap-2">
          <FileText className="h-4 w-4" /> Documentos aguardando assinatura ({pendentes.length})
        </h3>
        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-dashed">
            Nenhum documento pendente no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {pendentes.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] uppercase">{tipoLabel[doc.documento_tipo] || "Documento"}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {format(new Date(doc.created_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate">{doc.documento_titulo}</p>
                    {doc.documento_descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{doc.documento_descricao}</p>
                    )}
                  </div>
                  {temAssinatura ? (
                    <Button
                      onClick={() => assinarDocumento(doc)}
                      disabled={signingId === doc.id}
                      className="gap-2 shrink-0"
                    >
                      {signingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                      Assinar agora
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-2 shrink-0" onClick={() => setShowSetup(true)}>
                      <Lock className="h-4 w-4" /> Criar assinatura
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-2">
        <ShieldCheck className="h-3.5 w-3.5" />
        Ao assinar, a data, horário, CPF, selfie e dispositivo são registrados no rodapé do documento para validade jurídica (Lei 14.063/2020 e MP 2.200-2/2001).
      </p>
    </div>
  );
}
