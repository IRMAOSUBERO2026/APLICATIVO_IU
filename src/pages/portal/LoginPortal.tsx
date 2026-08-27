import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cloudClient } from "@/integrations/supabase/cloudClient";
import { Link } from "react-router-dom";
import { parsePermissoes, rotaInicial } from "@/lib/permissoes";

export default function LoginPortal() {
  const [cpf, setCpf] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanCpf = cpf.replace(/[^\d]/g, "");
      if (cleanCpf.length !== 11) throw new Error("CPF inválido. Deve conter 11 dígitos.");
      if (pin.length < 4) throw new Error("O PIN deve ter no mínimo 4 dígitos.");

      const { data: loginData, error: loginError } = await cloudClient.functions.invoke("portal-login", {
        body: { cpf: cleanCpf, pin: pin.trim() },
      });
      if (loginError) throw new Error("Não foi possível validar o acesso. Tente novamente.");
      if (!loginData || loginData.error) throw new Error(loginData?.error || "Acesso não autorizado.");

      const { error: sessionError } = await cloudClient.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (sessionError) throw new Error("Não foi possível iniciar a sessão administrativa.");

      const perfil = loginData.perfil === "admin" || loginData.perfil === "diario"
        ? loginData.perfil
        : "colaborador";
      const nome = String(loginData.nome || "");
      const permissoes = parsePermissoes(loginData.permissoes);
      if (perfil === "diario" && permissoes.length === 0) permissoes.push("diario_obra");

      localStorage.setItem("portal_user_id", loginData.funcionario_id);
      localStorage.setItem("portal_user_nome", nome);
      localStorage.setItem("portal_perfil_acesso", perfil);
      localStorage.setItem("portal_permissoes", JSON.stringify(permissoes));

      // registra último acesso (não bloqueia o login se falhar)
      supabase
        .from("portal_credentials")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("funcionario_id", loginData.funcionario_id)
        .then(() => {}, () => {});

      toast({ title: "Login realizado com sucesso!", description: `Bem-vindo, ${nome}.` });

      navigate(rotaInicial(perfil, permissoes));


    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique seu CPF e PIN e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }
    setCpf(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Portal do Colaborador</CardTitle>
          <CardDescription className="text-gray-500">
            Digite seu CPF e o PIN fornecido pelo RH para acessar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cpf" className="font-semibold text-gray-700">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                required
                className="text-lg py-6 transition-all focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin" className="font-semibold text-gray-700">PIN (Senha)</Label>
              <Input
                id="pin"
                type="password"
                placeholder="****"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                className="text-lg py-6 transition-all focus:ring-2 tracking-widest"
                maxLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full py-6 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Primeiro acesso ou esqueceu o PIN?</p>
            <p className="font-medium mt-1">Procure o setor de RH/DP da sua obra.</p>
            <p className="mt-4">
              <Link to="/auth" className="text-primary font-medium hover:underline">
                Acesso administrativo (e-mail e senha)
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
