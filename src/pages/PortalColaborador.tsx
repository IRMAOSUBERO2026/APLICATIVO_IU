import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HardHat, AlertTriangle, FileSignature } from "lucide-react";

export default function PortalColaborador() {
  const { session, role, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const [tokenEpiPendente, setTokenEpiPendente] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/login-portal");
    }
  }, [session, isLoading, navigate]);

  useEffect(() => {
    if (!session?.user?.id) return;
    checkEpiToken();
  }, [session]);

  async function checkEpiToken() {
    try {
      const { data: func } = await supabase
        .from("funcionarios")
        .select("id")
        .eq("user_id", session!.user.id)
        .single();
      if (!func) return;
      const { data: tokens } = await supabase
        .from("epi_tokens_assinatura")
        .select("token")
        .eq("funcionario_id", func.id)
        .eq("status", "pendente")
        .gt("expira_em", new Date().toISOString())
        .limit(1);
      if (tokens && tokens.length > 0) setTokenEpiPendente(tokens[0].token);
    } catch {}
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/login-portal");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Você está logado no Portal do Colaborador.
            Sua role atual: <span className="font-bold">{role}</span>
          </p>
        </CardContent>
      </Card>

      {/* Banner EPI pendente */}
      {tokenEpiPendente && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <p className="font-bold text-red-800 text-sm flex-1">⚠️ Você tem EPIs aguardando assinatura digital!</p>
          <button
            onClick={() => navigate(`/portal/epi/assinar/${tokenEpiPendente}`)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            Assinar agora
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/ponto")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Meu Ponto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Visualize seus registros de ponto, espelho mensal e justifique ausências.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/holerites")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Meus Holerites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Acesse seus comprovantes de pagamento e informes de rendimento.</p>
          </CardContent>
        </Card>

        {/* Card Meus EPIs */}
        <Card
          className={`hover:shadow-lg transition-shadow cursor-pointer ${tokenEpiPendente ? "border-red-200 bg-red-50/30" : ""}`}
          onClick={() => navigate("/portal/epis")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardHat size={24} className="text-[#2D6A1A]" />
              Meus EPIs
              {tokenEpiPendente && (
                <span className="ml-auto text-[10px] bg-red-500 text-white font-black px-2 py-0.5 rounded-full animate-pulse">ASSINAR</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Visualize seus equipamentos de proteção individual e confirme o recebimento.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/assinatura")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature size={24} className="text-indigo-500" />
              Minha Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Crie sua assinatura digital e assine documentos com validade jurídica em poucos toques.</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/recados")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Mural de Recados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Avisos importantes da empresa, RH e da sua obra atual.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/dados")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Meus Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Mantenha seu cadastro, endereço e contatos de emergência atualizados.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/atendimento")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>
              Atendimento RH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Canal direto de chat com o Departamento Pessoal e RH.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/portal/sugestoes")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v1"/><path d="M12 7V2"/><path d="M12 12V7"/><path d="M15 13a3 3 0 1 0-6 0"/><path d="M12 16v2"/></svg>
              Sugestões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Envie suas ideias para melhorarmos o dia a dia na obra.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

