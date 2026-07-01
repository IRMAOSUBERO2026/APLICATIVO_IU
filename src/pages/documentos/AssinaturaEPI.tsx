/**
 * Portal de Assinatura Digital EPI
 * Rota pública: /portal/epi/assinar/:token
 * Acessado pelo colaborador via QR Code ou link WhatsApp.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import SignaturePad from "signature_pad";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { HardHat, CheckCircle2, XCircle, Clock, Pen, RotateCcw } from "lucide-react";
import logoBranco from "@/assets/logo-oficial.png";

type TokenStatus = "loading" | "invalido" | "expirado" | "ja_assinado" | "valido" | "sucesso";

interface EntregaItem {
  id: string;
  data_entrega: string;
  quantidade: number;
  produtos: { descricao: string; ca_numero: string | null } | null;
}

interface TokenData {
  id: string;
  token: string;
  funcionario_id: string;
  obra_id: string;
  entregas_ids: string[];
  status: string;
  expira_em: string;
  assinado_em: string | null;
  funcionarios: { nome: string; cargo: string | null } | null;
  obras: { nome: string; codigo: string } | null;
}

export default function AssinaturaEPI() {
  const { token } = useParams<{ token: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);
  const [status, setStatus] = useState<TokenStatus>("loading");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [entregas, setEntregas] = useState<EntregaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Inicializa o canvas de assinatura
  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    // Ajustar resolução para telas de alta densidade
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    if (sigPadRef.current) sigPadRef.current.off();
    sigPadRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor: "#1A3D0A",
      minWidth: 1.5,
      maxWidth: 3,
    });
    sigPadRef.current.addEventListener("endStroke", () => {
      setHasSignature(!sigPadRef.current?.isEmpty());
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("invalido");
      return;
    }
    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (status === "valido") {
      // Inicializa o canvas após o render
      const timer = setTimeout(initCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [status, initCanvas]);

  useEffect(() => {
    const handleResize = () => {
      if (status === "valido" && canvasRef.current && sigPadRef.current) {
        // Preservar assinatura existente
        const data = sigPadRef.current.toData();
        initCanvas();
        if (data.length > 0) {
          sigPadRef.current?.fromData(data);
          setHasSignature(true);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [status, initCanvas]);

  async function validateToken() {
    setStatus("loading");
    try {
      const { data: tk, error } = await supabase
        .from("epi_tokens_assinatura")
        .select(`
          *,
          funcionarios(nome, cargo),
          obras(nome, codigo)
        `)
        .eq("token", token)
        .single();

      if (error || !tk) { setStatus("invalido"); return; }

      if (tk.status === "assinado") { setTokenData(tk as any); setStatus("ja_assinado"); return; }

      if (new Date(tk.expira_em) < new Date()) {
        // Marcar como expirado
        await supabase.from("epi_tokens_assinatura").update({ status: "expirado" }).eq("id", tk.id);
        setTokenData(tk as any);
        setStatus("expirado");
        return;
      }

      setTokenData(tk as any);

      // Buscar detalhes das entregas
      const { data: ents } = await supabase
        .from("entregas_epi")
        .select("id, data_entrega, quantidade, produtos(descricao, ca_numero)")
        .in("id", tk.entregas_ids);

      setEntregas((ents || []) as any);
      setStatus("valido");
    } catch {
      setStatus("invalido");
    }
  }

  function handleLimpar() {
    sigPadRef.current?.clear();
    setHasSignature(false);
  }

  async function handleConfirmar() {
    if (!sigPadRef.current || sigPadRef.current.isEmpty() || !tokenData) return;
    setSaving(true);
    try {
      // Converter canvas para PNG Blob
      const dataUrl = sigPadRef.current.toDataURL("image/png");
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const timestamp = Date.now();
      const path = `${tokenData.obra_id || "central"}/${tokenData.funcionario_id}/${timestamp}_assinatura.png`;

      // Upload para Storage
      const { error: upErr } = await supabase.storage
        .from("documentos-epi")
        .upload(path, blob, { contentType: "image/png", upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("documentos-epi")
        .getPublicUrl(path);

      const assinaturaUrl = urlData.publicUrl;
      const agora = new Date().toISOString();

      // Atualizar todas as entregas
      const { error: entErr } = await supabase
        .from("entregas_epi")
        .update({
          confirmacao_tipo: "assinatura_digital",
          confirmacao_url: assinaturaUrl,
          confirmacao_em: agora,
        })
        .in("id", tokenData.entregas_ids);

      if (entErr) throw entErr;

      // Atualizar token
      const { error: tkErr } = await supabase
        .from("epi_tokens_assinatura")
        .update({
          status: "assinado",
          assinatura_url: assinaturaUrl,
          assinado_em: agora,
        })
        .eq("id", tokenData.id);

      if (tkErr) throw tkErr;

      setStatus("sucesso");
    } catch (err: any) {
      alert("Erro ao registrar assinatura: " + (err?.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  // ─── Telas de estado ─────────────────────────────────────────────────────────

  if (status === "loading") return (
    <div className="min-h-screen bg-[#2D6A1A] flex items-center justify-center">
      <div className="text-white text-center space-y-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        <p className="font-semibold">Verificando link...</p>
      </div>
    </div>
  );

  if (status === "invalido") return (
    <StatusScreen
      icon={<XCircle size={56} className="text-rose-400" />}
      title="Link inválido"
      desc="Este link não existe ou já foi removido. Solicite um novo ao encarregado."
      bg="bg-rose-50"
    />
  );

  if (status === "expirado") return (
    <StatusScreen
      icon={<Clock size={56} className="text-amber-400" />}
      title="Link expirado"
      desc={`Este link expirou em ${tokenData ? format(new Date(tokenData.expira_em), "dd/MM/yyyy 'às' HH:mm") : ""}. Solicite um novo ao encarregado.`}
      bg="bg-amber-50"
    />
  );

  if (status === "ja_assinado") return (
    <StatusScreen
      icon={<CheckCircle2 size={56} className="text-emerald-500" />}
      title="✅ Você já assinou esta ficha"
      desc={`Assinatura registrada em ${tokenData?.assinado_em ? format(new Date(tokenData.assinado_em), "dd/MM/yyyy 'às' HH:mm") : "—"}.`}
      bg="bg-emerald-50"
    />
  );

  if (status === "sucesso") return (
    <StatusScreen
      icon={<CheckCircle2 size={56} className="text-emerald-500" />}
      title="✅ Assinatura registrada com sucesso!"
      desc="Sua assinatura foi armazenada com segurança. Você pode fechar esta janela."
      bg="bg-emerald-50"
    />
  );

  // ─── Tela principal de assinatura ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#2D6A1A] text-white px-4 py-5 shadow-xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={logoBranco} alt="Logo" className="h-10 w-10 object-contain bg-white rounded-lg p-1" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">IU Engenharia</p>
            <h1 className="text-lg font-black leading-tight">Assinatura Digital de EPI</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Dados do colaborador */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-[#2D6A1A]/10 rounded-xl">
              <HardHat size={22} className="text-[#2D6A1A]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Colaborador</p>
              <p className="font-black text-slate-800">{tokenData?.funcionarios?.nome}</p>
              <p className="text-xs text-slate-500">{tokenData?.funcionarios?.cargo}</p>
            </div>
          </div>
          {tokenData?.obras && (
            <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium">
              📍 Obra: <span className="font-bold text-slate-700">{tokenData.obras.codigo} — {tokenData.obras.nome}</span>
            </div>
          )}
        </div>

        {/* Lista de EPIs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-[#2D6A1A] px-5 py-3">
            <p className="text-white font-black text-sm uppercase tracking-widest">EPIs para assinar</p>
          </div>
          <div className="divide-y divide-slate-50">
            {entregas.map((e, i) => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-4">
                <span className="text-[10px] font-black text-[#2D6A1A] bg-[#2D6A1A]/10 rounded-lg w-7 h-7 flex items-center justify-center">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{e.produtos?.descricao || "EPI"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Data: {format(new Date(e.data_entrega), "dd/MM/yyyy")} · Qtd: {e.quantidade} · CA: {e.produtos?.ca_numero || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas de assinatura */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pen size={16} className="text-[#2D6A1A]" />
              <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Assine abaixo</p>
            </div>
            <button
              onClick={handleLimpar}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw size={12} /> Limpar
            </button>
          </div>
          <div className="p-3 bg-[#F8FBF7]">
            <canvas
              ref={canvasRef}
              className="w-full rounded-xl border-2 border-dashed border-[#2D6A1A]/20 touch-none bg-white"
              style={{ height: "180px", cursor: "crosshair" }}
            />
          </div>
          {!hasSignature && (
            <div className="px-5 pb-3 text-center text-xs text-slate-400 font-medium animate-pulse">
              Use o dedo ou a caneta para assinar
            </div>
          )}
        </div>

        {/* Botão confirmar */}
        <button
          onClick={handleConfirmar}
          disabled={!hasSignature || saving}
          className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
            hasSignature && !saving
              ? "bg-[#2D6A1A] text-white shadow-[#2D6A1A]/30 active:scale-[0.98]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 size={24} />
              Confirmar e Assinar
            </>
          )}
        </button>

        {/* Aviso legal */}
        <p className="text-[10px] text-slate-400 text-center leading-relaxed px-4">
          Ao assinar, você declara ter recebido os EPIs listados e se compromete a utilizá-los corretamente conforme NR-6.
        </p>
      </div>
    </div>
  );
}

// ─── Componente auxiliar de tela de status ────────────────────────────────────
function StatusScreen({ icon, title, desc, bg }: { icon: React.ReactNode; title: string; desc: string; bg: string }) {
  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center p-6`}>
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="flex justify-center">{icon}</div>
        <h2 className="text-xl font-black text-slate-800">{title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
        <div className="flex items-center justify-center gap-2 pt-4">
          <img src={logoBranco} alt="Logo" className="h-6 w-6 object-contain" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">IU Engenharia</p>
        </div>
      </div>
    </div>
  );
}
