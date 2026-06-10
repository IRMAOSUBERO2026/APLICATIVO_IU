import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      // Remove any formatting from CPF
      const cleanCpf = cpf.replace(/[^\d]/g, "");
      
      if (cleanCpf.length !== 11) {
        throw new Error("CPF inválido. Deve conter 11 dígitos.");
      }

      if (pin.length < 4) {
        throw new Error("O PIN deve ter no mínimo 4 dígitos.");
      }

      // Busca o funcionário pelo CPF. O banco pode armazenar com ou sem máscara,
      // então buscamos por ambos os formatos.
      const maskedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      const { data: funcData, error: funcError } = await supabase
        .from("funcionarios")
        .select("id, nome, cargo")
        .or(`cpf.eq.${cleanCpf},cpf.eq.${maskedCpf}`)
        .maybeSingle();

      if (funcError || !funcData) {
        throw new Error("Funcionário não encontrado com este CPF.");
      }

      // Verifica o PIN na tabela de credenciais
      const { data: credData, error: credError } = await supabase
        .from("portal_credentials")
        .select("pin, perfil_acesso")
        .eq("funcionario_id", funcData.id)
        .maybeSingle();

      if (credError || !credData || credData.pin !== pin) {
        throw new Error("PIN incorreto ou não configurado.");
      }

      // Define o perfil de acesso.
      // 1) Cargos de direção/administração têm acesso Master a todo o sistema.
      // 2) Caso contrário, usa o perfil liberado pelo RH (ex.: "diario").
      // 3) Padrão: colaborador (apenas portal).
      const cargo = (funcData.cargo || "").toLowerCase();
      const isMaster = /(diretor|administrador|admin|master|gestor|s[oó]cio|propriet)/.test(cargo);
      const perfilSalvo = (credData.perfil_acesso || "colaborador").toLowerCase();
      const perfil = isMaster ? "admin" : perfilSalvo === "diario" ? "diario" : "colaborador";

      // Login bem sucedido - simulamos a sessão salvando o ID do funcionário
      localStorage.setItem("portal_user_id", funcData.id);
      localStorage.setItem("portal_user_nome", funcData.nome);
      localStorage.setItem("portal_perfil_acesso", perfil);

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${funcData.nome}.`,
      });

      // Direciona conforme o perfil.
      const destino = perfil === "admin" ? "/" : perfil === "diario" ? "/diario-obra-mobile" : "/portal";
      navigate(destino);
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
    
    // Formata CPF: 000.000.000-00
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
