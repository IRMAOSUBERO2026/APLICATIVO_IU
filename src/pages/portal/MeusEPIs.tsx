/**
 * Meus EPIs — Portal do Colaborador
 * Rota: /portal/epis
 * Lista todos os EPIs ativos do funcionário logado.
 * Banner vermelho se houver token pendente de assinatura.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { HardHat, AlertTriangle, CheckCircle2, Clock, Pen, ArrowLeft } from "lucide-react";

interface EntregaEPI {
  id: string;
  data_entrega: string;
  quantidade: number;
  ca_numero: string | null;
  confirmacao_tipo: string | null;
  produtos: { descricao: string; ca_numero: string | null } | null;
}

interface TokenPendente {
  token: string;
  expira_em: string;
}

export default function MeusEPIs() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [entregas, setEntregas] = useState<EntregaEPI[]>([]);
  const [tokenPendente, setTokenPendente] = useState<TokenPendente | null>(null);
  const [loading, setLoading] = useState(true);
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);
    try {
      // Buscar funcionário pelo user_id
      const { data: func } = await supabase
        .from("funcionarios")
        .select("id")
        .eq("user_id", session!.user.id)
        .single();

      if (!func) {
        setLoading(false);
        return;
      }
      setFuncionarioId(func.id);

      // Buscar entregas ativas
      const { data: ents } = await supabase
        .from("entregas_epi")
        .select("id, data_entrega, quantidade, ca_numero, confirmacao_tipo, produtos(descricao, ca_numero)")
        .eq("funcionario_id", func.id)
        .eq("status", "ativo")
        .order("data_entrega", { ascending: false });

      setEntregas((ents || []) as any);

      // Buscar token pendente
      const { data: tokens } = await supabase
        .from("epi_tokens_assinatura")
        .select("token, expira_em")
        .eq("funcionario_id", func.id)
        .eq("status", "pendente")
        .gt("expira_em", new Date().toISOString())
        .order("criado_em", { ascending: false })
        .limit(1);

      if (tokens && tokens.length > 0) setTokenPendente(tokens[0]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function ConfirmacaoBadge({ tipo }: { tipo: string | null }) {
    if (tipo === "assinatura_digital")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">✅ Assinado digitalmente</span>;
    if (tipo === "foto_responsavel")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">✅ Foto confirmada</span>;
    if (tipo === "pdf_fisico")
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">📄 PDF gerado</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">⏳ Pendente</span>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/portal")} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2D6A1A]/10 rounded-xl">
            <HardHat size={22} className="text-[#2D6A1A]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Meus EPIs</h1>
            <p className="text-xs text-slate-400 font-medium">Equipamentos de Proteção Individual ativos</p>
          </div>
        </div>
      </div>

      {/* Banner de token pendente */}
      {tokenPendente && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-black text-red-800 text-sm">⚠️ Você tem EPIs aguardando assinatura</p>
            <p className="text-xs text-red-600 mt-1">
              Válido até {format(new Date(tokenPendente.expira_em), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
          <button
            onClick={() => navigate(`/portal/epi/assinar/${tokenPendente.token}`)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <Pen size={12} /> Assinar agora
          </button>
        </div>
      )}

      {/* Lista de EPIs */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="w-8 h-8 border-2 border-[#2D6A1A]/30 border-t-[#2D6A1A] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Carregando seus EPIs...</p>
        </div>
      ) : entregas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <HardHat size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Nenhum EPI ativo registrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Thead */}
          <div className="bg-[#2D6A1A] grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3">
            <p className="text-white text-[10px] font-black uppercase tracking-widest">EPI / Equipamento</p>
            <p className="text-white text-[10px] font-black uppercase tracking-widest text-center">Data</p>
            <p className="text-white text-[10px] font-black uppercase tracking-widest text-center">Nº CA</p>
            <p className="text-white text-[10px] font-black uppercase tracking-widest text-right">Confirmação</p>
          </div>

          <div className="divide-y divide-slate-50">
            {entregas.map((e) => (
              <div key={e.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2D6A1A]/5 rounded-xl">
                    <HardHat size={14} className="text-[#2D6A1A]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{e.produtos?.descricao || "EPI"}</p>
                </div>
                <p className="text-xs text-slate-400 font-semibold text-center whitespace-nowrap">
                  {format(new Date(e.data_entrega), "dd/MM/yyyy")}
                </p>
                <p className="text-xs font-bold text-center text-[#2D6A1A]">
                  {e.produtos?.ca_numero || e.ca_numero || "—"}
                </p>
                <div className="text-right">
                  <ConfirmacaoBadge tipo={e.confirmacao_tipo} />
                </div>
              </div>
            ))}
          </div>

          {/* Resumo */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <CheckCircle2 size={14} className="text-[#2D6A1A]" />
              {entregas.length} EPI(s) ativo(s)
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-600 font-bold">
              <Clock size={14} />
              {entregas.filter(e => !e.confirmacao_tipo || e.confirmacao_tipo === "pendente").length} pendente(s) de confirmação
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center pb-4">
        Irmãos Ubero Engenharia Ltda — CNPJ 31.370.964/0001-55 — NR-6
      </p>
    </div>
  );
}
