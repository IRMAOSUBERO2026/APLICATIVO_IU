import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, XCircle, Camera, FileText, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

type AssinaturaStatus = "pendente" | "visualizado" | "assinado" | "recusado" | "expirado";

interface AssinaturaData {
  id: string;
  documento_tipo: string;
  documento_titulo: string;
  documento_descricao: string | null;
  documento_url: string | null;
  documento_dados: any;
  status: AssinaturaStatus;
  token_expiracao: string;
  funcionario_id: string;
  empresa_id: string;
  cpf_confirmado: boolean;
  selfie_url: string | null;
  solicitado_por: string | null;
  created_at: string;
  funcionario?: { nome: string; cpf: string; foto_url: string | null };
  empresa?: { razao_social: string; nome_fantasia: string | null; logo_url: string | null };
}

type Step = "loading" | "expired" | "not_found" | "already" | "cpf" | "selfie" | "review" | "success" | "refused";

export default function AssinaturaPublica() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState<AssinaturaData | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [cpfInput, setCpfInput] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { setStep("not_found"); return; }
    loadAssinatura();
  }, [token]);

  const loadAssinatura = async () => {
    const { data: assinatura, error } = await supabase
      .from("assinaturas_digitais")
      .select("*")
      .eq("token_acesso", token!)
      .single();

    if (error || !assinatura) { setStep("not_found"); return; }

    // Load funcionario and empresa
    const [funcRes, empRes] = await Promise.all([
      supabase.from("funcionarios").select("nome, cpf, foto_url").eq("id", assinatura.funcionario_id).single(),
      supabase.from("empresas").select("razao_social, nome_fantasia, logo_url").eq("id", assinatura.empresa_id).single(),
    ]);

    const fullData: AssinaturaData = {
      ...assinatura,
      status: assinatura.status as AssinaturaStatus,
      funcionario: funcRes.data || undefined,
      empresa: empRes.data || undefined,
    };
    setData(fullData);

    // Check expiration
    if (new Date(assinatura.token_expiracao) < new Date()) {
      await supabase.from("assinaturas_digitais").update({ status: "expirado" }).eq("id", assinatura.id);
      setStep("expired");
      return;
    }

    if (assinatura.status === "assinado" || assinatura.status === "recusado") {
      setStep("already");
      return;
    }

    // Mark as visualizado
    if (assinatura.status === "pendente") {
      await supabase.from("assinaturas_digitais").update({
        status: "visualizado",
        data_visualizacao: new Date().toISOString(),
      }).eq("id", assinatura.id);
    }

    setStep("cpf");
  };

  const formatCPF = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 11);
    return nums.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, d) =>
      [a, b, c].filter(Boolean).join(".") + (d ? `-${d}` : "")
    );
  };

  const verifyCPF = () => {
    const cleanInput = cpfInput.replace(/\D/g, "");
    const cleanStored = data?.funcionario?.cpf?.replace(/\D/g, "") || "";
    if (cleanInput === cleanStored && cleanInput.length === 11) {
      setStep("selfie");
    } else {
      toast({ title: "CPF não confere", description: "O CPF informado não corresponde ao cadastro.", variant: "destructive" });
    }
  };

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSelfiePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submitSelfie = async () => {
    if (!selfieFile || !data) return;
    setProcessing(true);
    const path = `assinaturas/${data.id}/selfie_${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from("documentos").upload(path, selfieFile, { upsert: true });
    if (uploadErr) {
      toast({ title: "Erro no upload", description: uploadErr.message, variant: "destructive" });
      setProcessing(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
    await supabase.from("assinaturas_digitais").update({
      selfie_url: urlData.publicUrl,
      cpf_confirmado: true,
    }).eq("id", data.id);
    setProcessing(false);
    setStep("review");
  };

  const assinar = async () => {
    if (!data) return;
    setProcessing(true);
    await supabase.from("assinaturas_digitais").update({
      status: "assinado",
      data_assinatura: new Date().toISOString(),
      ip_assinatura: "browser",
      user_agent: navigator.userAgent,
    }).eq("id", data.id);
    setProcessing(false);
    setStep("success");
  };

  const recusar = async () => {
    if (!data) return;
    setProcessing(true);
    await supabase.from("assinaturas_digitais").update({
      status: "recusado",
      motivo_recusa: motivoRecusa || "Recusado pelo funcionário",
      data_assinatura: new Date().toISOString(),
    }).eq("id", data.id);
    setProcessing(false);
    setStep("refused");
  };

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

  // RENDER
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "not_found") {
    return (
      <PageWrapper>
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-center">Link inválido</h2>
        <p className="text-muted-foreground text-center mt-2">Este link de assinatura não foi encontrado ou é inválido.</p>
      </PageWrapper>
    );
  }

  if (step === "expired") {
    return (
      <PageWrapper logo={data?.empresa?.logo_url}>
        <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-bold text-center">Link expirado</h2>
        <p className="text-muted-foreground text-center mt-2">Este link de assinatura expirou. Solicite um novo ao gestor.</p>
      </PageWrapper>
    );
  }

  if (step === "already") {
    return (
      <PageWrapper logo={data?.empresa?.logo_url}>
        {data?.status === "assinado" ? (
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
        ) : (
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        )}
        <h2 className="text-xl font-bold text-center">
          Documento já {data?.status === "assinado" ? "assinado" : "recusado"}
        </h2>
        <p className="text-muted-foreground text-center mt-2">
          Este documento já foi processado anteriormente.
        </p>
      </PageWrapper>
    );
  }

  if (step === "success") {
    return (
      <PageWrapper logo={data?.empresa?.logo_url}>
        <CheckCircle2 className="h-20 w-20 text-success mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-center text-success">Documento Assinado!</h2>
        <p className="text-muted-foreground text-center mt-2">
          Sua assinatura digital foi registrada com sucesso em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}.
        </p>
        <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p>📋 {data?.documento_titulo}</p>
          <p>✅ CPF verificado</p>
          <p>📸 Selfie registrada</p>
          <p>🔐 Assinatura digital válida</p>
        </div>
      </PageWrapper>
    );
  }

  if (step === "refused") {
    return (
      <PageWrapper logo={data?.empresa?.logo_url}>
        <XCircle className="h-20 w-20 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-center">Documento Recusado</h2>
        <p className="text-muted-foreground text-center mt-2">
          Sua recusa foi registrada. O gestor será notificado.
        </p>
      </PageWrapper>
    );
  }

  // Steps: cpf, selfie, review
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center gap-3">
        {data?.empresa?.logo_url && (
          <img src={data.empresa.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded" />
        )}
        <div>
          <p className="font-semibold text-sm">{data?.empresa?.nome_fantasia || data?.empresa?.razao_social}</p>
          <p className="text-xs text-muted-foreground">Assinatura Digital de Documentos</p>
        </div>
        <Shield className="h-5 w-5 text-primary ml-auto" />
      </div>

      {/* Progress */}
      <div className="px-4 py-3 bg-card border-b">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          {["CPF", "Selfie", "Assinatura"].map((label, i) => {
            const stepIndex = step === "cpf" ? 0 : step === "selfie" ? 1 : 2;
            return (
              <div key={label} className="flex-1 flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</div>
                <span className={`text-xs ${i <= stepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Document Info Card */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {tipoLabel[data?.documento_tipo || "outros"]}
              </span>
            </div>
            <h3 className="font-semibold">{data?.documento_titulo}</h3>
            {data?.documento_descricao && (
              <p className="text-sm text-muted-foreground mt-1">{data.documento_descricao}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Solicitado por: {data?.solicitado_por || "Gestão"} • {format(new Date(data?.created_at || ""), "dd/MM/yyyy")}
            </p>
          </div>

          {/* Step: CPF */}
          {step === "cpf" && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="font-semibold text-center">Verificação de Identidade</h3>
              <p className="text-sm text-muted-foreground text-center">
                Olá, <strong>{data?.funcionario?.nome}</strong>. Para sua segurança, confirme seu CPF.
              </p>
              <Input
                placeholder="000.000.000-00"
                value={cpfInput}
                onChange={(e) => setCpfInput(formatCPF(e.target.value))}
                className="text-center text-lg tracking-wider"
                maxLength={14}
              />
              <Button onClick={verifyCPF} className="w-full" disabled={cpfInput.replace(/\D/g, "").length !== 11}>
                Confirmar CPF
              </Button>
            </div>
          )}

          {/* Step: Selfie */}
          {step === "selfie" && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="font-semibold text-center">Selfie com Documento</h3>
              <p className="text-sm text-muted-foreground text-center">
                Tire uma foto segurando seu documento de identidade (RG ou CNH) ao lado do rosto.
              </p>
              
              {selfiePreview ? (
                <div className="relative">
                  <img src={selfiePreview} alt="Selfie" className="w-full rounded-lg border" />
                  <button
                    onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 text-xs"
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                >
                  <Camera className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Toque para abrir a câmera</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieCapture} />
              
              <Button onClick={submitSelfie} className="w-full" disabled={!selfieFile || processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar Selfie
              </Button>
            </div>
          )}

          {/* Step: Review & Sign */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <h3 className="font-semibold text-center">Revisão e Assinatura</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Funcionário</span>
                    <span className="font-medium">{data?.funcionario?.nome}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">CPF</span>
                    <span className="font-medium">✅ Verificado</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Selfie</span>
                    <span className="font-medium">✅ Registrada</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Documento</span>
                    <span className="font-medium">{data?.documento_titulo}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Data</span>
                    <span className="font-medium">{format(new Date(), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </div>

                {/* Ficha de EPI completa (NR-6) */}
                {data?.documento_tipo === "ficha_epi" && data?.documento_dados && (
                  <FichaEPICompleta dados={data.documento_dados} />
                )}

                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                  <p>Ao assinar, declaro que li e concordo com o conteúdo deste documento. 
                  Esta assinatura tem validade jurídica conforme Lei 14.063/2020 e MP 2.200-2/2001.</p>
                </div>

                <Button onClick={assinar} className="w-full bg-success hover:bg-success/90 text-success-foreground" disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Assinar Documento
                </Button>
              </div>

              {/* Refuse section */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-sm font-medium text-destructive">Não concorda? Recuse o documento:</p>
                <Input
                  placeholder="Motivo da recusa (opcional)"
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                />
                <Button variant="destructive" onClick={recusar} className="w-full" disabled={processing}>
                  <XCircle className="h-4 w-4 mr-2" /> Recusar Documento
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-card border-t px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          🔐 Ambiente seguro • Assinatura digital conforme legislação vigente
        </p>
      </div>
    </div>
  );
}

function PageWrapper({ children, logo }: { children: React.ReactNode; logo?: string | null }) {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border p-8 shadow-sm">
        {logo && <img src={logo} alt="Logo" className="h-12 mx-auto mb-6 object-contain" />}
        {children}
      </div>
    </div>
  );
}

function FichaEPICompleta({ dados }: { dados: any }) {
  const empresa = dados?.empresa || {};
  const func = dados?.funcionario || {};
  const itens: any[] = dados?.itens || [];
  const termo: string[] = dados?.termo || [];

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-background">
      <div className="bg-primary text-primary-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          {empresa.logo_url && <img src={empresa.logo_url} alt="Logo" className="h-10 w-10 rounded bg-white object-contain p-1" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{empresa.nome_fantasia || empresa.razao_social}</p>
            <p className="text-[10px] opacity-90 truncate">CNPJ: {empresa.cnpj}</p>
          </div>
        </div>
        <p className="text-center text-xs font-bold mt-2 uppercase tracking-wide">Ficha de Controle de EPI — NR-6</p>
      </div>

      <div className="px-4 py-3 border-b text-[11px] space-y-0.5">
        <p><strong>Razão Social:</strong> {empresa.razao_social}</p>
        {empresa.endereco && <p><strong>Endereço:</strong> {empresa.endereco}{empresa.cidade ? `, ${empresa.cidade}` : ""}{empresa.uf ? `/${empresa.uf}` : ""}</p>}
        {empresa.telefone && <p><strong>Telefone:</strong> {empresa.telefone}</p>}
      </div>

      <div className="px-4 py-3 border-b bg-muted/30 text-[11px] space-y-0.5">
        <p className="text-xs font-bold uppercase mb-1">Funcionário</p>
        <p><strong>Nome:</strong> {func.nome}</p>
        <p><strong>CPF:</strong> {func.cpf} {func.rg && <span className="ml-2"><strong>RG:</strong> {func.rg}</span>}</p>
        <p><strong>Cargo:</strong> {func.cargo}</p>
        {func.data_admissao && <p><strong>Admissão:</strong> {format(new Date(func.data_admissao), "dd/MM/yyyy")}</p>}
      </div>

      <div className="px-4 py-3 border-b">
        <p className="text-xs font-bold uppercase mb-2">Histórico de Entregas ({itens.length})</p>
        <div className="space-y-2">
          {itens.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma entrega registrada.</p>}
          {itens.map((item, i) => (
            <div key={i} className="border rounded-lg p-2 text-[11px] bg-card">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-muted-foreground">CA: {item.ca_numero || "—"} • Qtd: {item.qtd}</p>
                </div>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded whitespace-nowrap">
                  {item.data && format(new Date(item.data), "dd/MM/yyyy")}
                </span>
              </div>
              <p className="text-[10px] mt-1"><strong>Motivo:</strong> {item.motivo}</p>
              {item.obra && <p className="text-[10px] text-muted-foreground"><strong>Obra:</strong> {item.obra}</p>}
              <div className="mt-2 pt-2 border-t border-dashed">
                <div className="h-8 border-b border-foreground/40 flex items-end justify-center pb-0.5">
                  <span className="text-[9px] text-muted-foreground italic">Assinatura digital — item {i + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {termo.length > 0 && (
        <div className="px-4 py-3 text-[10px] leading-relaxed space-y-1 bg-muted/20">
          <p className="text-xs font-bold uppercase mb-1">Termo de Responsabilidade</p>
          {termo.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </div>
  );
}
